import {
  NextRequest,
  NextResponse,
} from "next/server";

type InsiderTransaction = {
  symbol?: string;
  name?: string;
  share?: number;
  change?: number;
  filingDate?: string;
  transactionDate?: string;
  transactionCode?: string;
  transactionPrice?: number;
};

type BusinessQuantHolder = {
  cik_filer?: number | string;
  name_filer?: string;
  name_filer_short?: string;
  reportperiod?: string;
  quarter?: string;
  filingdate?: string;
  shprn_amount?: number;
  shares_last_qtr?: number;
  shares_change_qoq?: number;
  shares_change_qoq_pct?: number;
  shares_change_yoy?: number;
  value?: number;
  institution_pct?: number;
  shareholder_rank?: number;
  tag?: string;
};

type OwnershipHolder = {
  name: string;
  share: number;
  change: number;
  filingDate: string;
  ownershipPercent: number | null;
  positionValue: number | null;
  changePercent: number | null;
  rank: number | null;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REQUEST_TIMEOUT_MS = 8_000;

export async function GET(
  request: NextRequest
) {
  try {
    const finnhubApiKey =
      process.env.FINNHUB_API_KEY;

    const businessQuantApiKey =
      process.env.BUSINESSQUANT_API_KEY;

    if (!finnhubApiKey) {
      return NextResponse.json(
        {
          error:
            "FINNHUB_API_KEY is missing.",
        },
        {
          status: 500,
          headers: noStoreHeaders(),
        }
      );
    }

    if (!businessQuantApiKey) {
      return NextResponse.json(
        {
          error:
            "BUSINESSQUANT_API_KEY is missing.",
        },
        {
          status: 500,
          headers: noStoreHeaders(),
        }
      );
    }

    const symbol =
      request.nextUrl.searchParams
        .get("symbol")
        ?.trim()
        .toUpperCase();

    if (
      !symbol ||
      !/^[A-Z0-9.-]{1,15}$/.test(
        symbol
      )
    ) {
      return NextResponse.json(
        {
          error:
            "A valid stock symbol is required.",
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        }
      );
    }

    const from = formatDate(
      addDays(new Date(), -365)
    );
    const to = formatDate(
      new Date()
    );

    const insiderUrl =
      new URL(
        "https://finnhub.io/api/v1/stock/insider-transactions"
      );

    insiderUrl.searchParams.set(
      "symbol",
      symbol
    );
    insiderUrl.searchParams.set(
      "from",
      from
    );
    insiderUrl.searchParams.set(
      "to",
      to
    );
    insiderUrl.searchParams.set(
      "token",
      finnhubApiKey
    );

    const topHoldersUrl =
      new URL(
        "https://data.businessquant.com/13f"
      );

    topHoldersUrl.searchParams.set(
      "mode",
      "topholders"
    );
    topHoldersUrl.searchParams.set(
      "ticker_issuer",
      symbol
    );
    topHoldersUrl.searchParams.set(
      "api_key",
      businessQuantApiKey
    );

    const statsUrl =
      new URL(
        "https://data.businessquant.com/13f"
      );

    statsUrl.searchParams.set(
      "mode",
      "stats"
    );
    statsUrl.searchParams.set(
      "ticker_issuer",
      symbol
    );
    statsUrl.searchParams.set(
      "api_key",
      businessQuantApiKey
    );

    const [
      insiderResult,
      topHoldersResult,
      statsResult,
    ] = await Promise.all([
      fetchOptionalJson(insiderUrl),
      fetchOptionalJson(topHoldersUrl),
      fetchOptionalJson(statsUrl),
    ]);

    const insiders =
      Array.isArray(
        insiderResult.data?.data
      )
        ? (
            insiderResult.data
              .data as InsiderTransaction[]
          )
            .map(normalizeInsider)
            .filter(
              (
                item
              ): item is NonNullable<
                ReturnType<
                  typeof normalizeInsider
                >
              > => item !== null
            )
            .sort(
              (a, b) =>
                b.transactionDate.localeCompare(
                  a.transactionDate
                )
            )
            .slice(0, 50)
        : [];

    const allHolders =
      Array.isArray(
        topHoldersResult.data?.data
      )
        ? (
            topHoldersResult.data
              .data as BusinessQuantHolder[]
          )
            .map(
              normalizeBusinessQuantHolder
            )
            .filter(
              (
                item
              ): item is NonNullable<
                ReturnType<
                  typeof normalizeBusinessQuantHolder
                >
              > => item !== null
            )
            .sort(
              (a, b) =>
                (a.rank ?? 9999) -
                (b.rank ?? 9999)
            )
        : [];

    /*
      Business Quant's 13F endpoint returns
      institutional filing managers. SEC 13F
      does not provide a perfect "fund vs
      institution" taxonomy, so we conservatively
      classify obvious fund/asset-manager names
      into the Funds tab and leave the rest in
      Institutions.
    */
    const funds =
      allHolders
        .filter((holder) =>
          looksLikeFundManager(
            holder.name
          )
        )
        .slice(0, 20);

    const institutions =
      allHolders
        .filter(
          (holder) =>
            !looksLikeFundManager(
              holder.name
            )
        )
        .slice(0, 20);

    const buys =
      insiders.filter(
        (item) => item.change > 0
      );

    const sells =
      insiders.filter(
        (item) => item.change < 0
      );

    const buyShares =
      buys.reduce(
        (sum, item) =>
          sum +
          Math.abs(
            item.change
          ),
        0
      );

    const sellShares =
      sells.reduce(
        (sum, item) =>
          sum +
          Math.abs(
            item.change
          ),
        0
      );

    const netShares =
      buyShares -
      sellShares;

    const netInstitutionalChange =
      institutions.reduce(
        (sum, item) =>
          sum + item.change,
        0
      );

    const netFundChange =
      funds.reduce(
        (sum, item) =>
          sum + item.change,
        0
      );

    const statsRecord =
      Array.isArray(
        statsResult.data?.data
      )
        ? statsResult.data?.data?.[0]
        : null;

    return NextResponse.json(
      {
        symbol,
        insiders,
        institutions,
        funds,
        summary: {
          insiderTransactions:
            insiders.length,
          buyTransactions:
            buys.length,
          sellTransactions:
            sells.length,
          buyShares,
          sellShares,
          netShares,
          institutionalHolders:
            finiteNumber(
              statsRecord
                ?.institutions_total_count
            ) ||
            allHolders.length,
          fundHolders:
            funds.length,
          netInstitutionalChange,
          netFundChange,
          institutionalOwnershipPercent:
            finiteOrNull(
              statsRecord
                ?.institutions_shares_pct_outstanding
            ),
          institutionalValue:
            finiteOrNull(
              statsRecord
                ?.institutions_held_value
            ),
          institutionsBought:
            finiteNumber(
              statsRecord
                ?.institutions_bought_count
            ),
          institutionsSold:
            finiteNumber(
              statsRecord
                ?.institutions_sold_count
            ),
          institutionsHeld:
            finiteNumber(
              statsRecord
                ?.institutions_held_count
            ),
        },
        availability: {
          insiders:
            insiderResult.ok &&
            insiders.length > 0,
          institutions:
            topHoldersResult.ok &&
            institutions.length > 0,
          funds:
            topHoldersResult.ok &&
            funds.length > 0,
          insiderStatus:
            insiderResult.status,
          ownershipStatus:
            topHoldersResult.status,
          fundOwnershipStatus:
            topHoldersResult.status,
        },
        source: {
          insiders: "Finnhub",
          institutions:
            "Business Quant / SEC 13F",
          funds:
            "Business Quant / SEC 13F",
        },
        generatedAt:
          new Date().toISOString(),
      },
      {
        headers: noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "Ownership Center API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load ownership data.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}

async function fetchOptionalJson(
  url: URL
): Promise<{
  ok: boolean;
  status: number | null;
  data: Record<string, any> | null;
}> {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

  try {
    const response =
      await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

    let data:
      Record<string, any> | null =
      null;

    try {
      data =
        (await response.json()) as Record<
          string,
          any
        >;
    } catch {
      data = null;
    }

    if (!response.ok) {
      console.error(
        "Ownership upstream request failed:",
        {
          host:
            url.hostname,
          status:
            response.status,
          data,
        }
      );

      return {
        ok: false,
        status: response.status,
        data,
      };
    }

    return {
      ok: true,
      status: response.status,
      data,
    };
  } catch (error) {
    console.error(
      "Ownership upstream fetch error:",
      {
        host:
          url.hostname,
        error,
      }
    );

    return {
      ok: false,
      status: null,
      data: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeInsider(
  item: InsiderTransaction
) {
  const name =
    typeof item.name === "string"
      ? item.name.trim()
      : "";

  const transactionDate =
    typeof item.transactionDate ===
    "string"
      ? item.transactionDate.slice(
          0,
          10
        )
      : "";

  if (!name || !transactionDate) {
    return null;
  }

  return {
    name,
    symbol:
      typeof item.symbol === "string"
        ? item.symbol
        : "",
    share:
      finiteNumber(item.share),
    change:
      finiteNumber(item.change),
    filingDate:
      typeof item.filingDate ===
      "string"
        ? item.filingDate.slice(
            0,
            10
          )
        : "",
    transactionDate,
    transactionCode:
      typeof item.transactionCode ===
      "string"
        ? item.transactionCode
        : "",
    transactionPrice:
      finiteOrNull(
        item.transactionPrice
      ),
  };
}

function normalizeBusinessQuantHolder(
  item: BusinessQuantHolder
): OwnershipHolder | null {
  const name =
    (
      item.name_filer_short ||
      item.name_filer ||
      ""
    ).trim();

  if (!name) {
    return null;
  }

  return {
    name,
    share:
      finiteNumber(
        item.shprn_amount
      ),
    change:
      finiteNumber(
        item.shares_change_qoq
      ),
    filingDate:
      getDateOnly(
        item.filingdate ||
          item.reportperiod ||
          item.quarter ||
          ""
      ),
    ownershipPercent:
      finiteOrNull(
        item.institution_pct
      ),
    positionValue:
      finiteOrNull(
        item.value
      ),
    changePercent:
      finiteOrNull(
        item.shares_change_qoq_pct
      ),
    rank:
      finiteOrNull(
        item.shareholder_rank
      ),
  };
}

function looksLikeFundManager(
  name: string
) {
  const normalized =
    name.toLowerCase();

  const fundSignals = [
    "fund",
    "funds",
    "etf",
    "trust",
    "asset management",
    "asset managers",
    "investment management",
    "capital management",
    "portfolio management",
    "advisors",
    "advisers",
  ];

  return fundSignals.some(
    (signal) =>
      normalized.includes(
        signal
      )
  );
}

function getDateOnly(
  value: string
) {
  if (!value) {
    return "";
  }

  return value.slice(
    0,
    10
  );
}

function finiteNumber(
  value: unknown
) {
  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue
  )
    ? numberValue
    : 0;
}

function finiteOrNull(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue
  )
    ? numberValue
    : null;
}

function addDays(
  date: Date,
  days: number
) {
  const result =
    new Date(date);

  result.setDate(
    result.getDate() +
      days
  );

  return result;
}

function formatDate(
  date: Date
) {
  return date
    .toISOString()
    .slice(0, 10);
}

function noStoreHeaders() {
  return {
    "Cache-Control":
      "private, no-cache, no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}