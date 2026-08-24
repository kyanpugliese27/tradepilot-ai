import {
  NextRequest,
  NextResponse,
} from "next/server";

type BQDividendMetadata = {
  ticker?: string;
  cik?: number | string;
  companyname?: string;
  companyname_short?: string;
  range?: string;
  divyield?: number;
  lastdividend?: string | null;
  nextdividend?: string | null;
  ttmdividend?: number;
  mode?: string;
};

type BQDividendItem = {
  dividend?: number;
  ex_date?: string;
  payment_date?: string;
};

type BQDividendResponse = {
  metadata?: BQDividendMetadata;
  data?: BQDividendItem[];
  error?: string;
  message?: string;
};

type BQQuote = {
  ticker?: string;
  name?: string;
  name_short?: string;
  price?: number;
  pricedate?: string;
  currency?: string;
};

type FetchResult = {
  ok: boolean;
  status: number | null;
  data: unknown;
};

export const dynamic =
  "force-dynamic";
export const revalidate = 0;

const REQUEST_TIMEOUT_MS =
  8_000;

export async function GET(
  request: NextRequest
) {
  try {
    const apiKey =
      process.env
        .BUSINESSQUANT_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "BUSINESSQUANT_API_KEY is missing.",
        },
        {
          status: 500,
          headers:
            noStoreHeaders(),
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
          headers:
            noStoreHeaders(),
        }
      );
    }

    /*
     * BUSINESS QUANT DIVIDENDS
     *
     * mode=dps returns:
     * - historical dividend/share payments
     * - ex-dividend dates
     * - payment dates
     * - TTM dividend
     * - current dividend yield
     */
    const dividendUrl =
      new URL(
        "https://data.businessquant.com/dividends"
      );

    dividendUrl.searchParams.set(
      "ticker",
      symbol
    );

    dividendUrl.searchParams.set(
      "mode",
      "dps"
    );

    dividendUrl.searchParams.set(
      "api_key",
      apiKey
    );

    /*
     * BUSINESS QUANT QUOTES
     *
     * We fetch the current price directly
     * instead of depending on another
     * Norvexa API route.
     */
    const quoteUrl =
      new URL(
        "https://data.businessquant.com/quotes"
      );

    quoteUrl.searchParams.set(
      "ticker",
      symbol
    );

    quoteUrl.searchParams.set(
      "mode",
      "snapshot"
    );

    quoteUrl.searchParams.set(
      "api_key",
      apiKey
    );

    const [
      dividendResult,
      quoteResult,
    ] = await Promise.all([
      fetchProvider(
        dividendUrl
      ),
      fetchProvider(
        quoteUrl
      ),
    ]);

    const dividendData =
      isPlainObject(
        dividendResult.data
      )
        ? (
            dividendResult.data as BQDividendResponse
          )
        : null;

    const quoteRows =
      Array.isArray(
        quoteResult.data
      )
        ? (
            quoteResult.data as BQQuote[]
          )
        : [];

    const quote =
      quoteRows.find(
        (item) =>
          item.ticker
            ?.toUpperCase() ===
          symbol
      ) ||
      quoteRows[0] ||
      null;

    if (
      !quoteResult.ok ||
      !quote ||
      !Number.isFinite(
        Number(quote.price)
      )
    ) {
      return NextResponse.json(
        {
          error:
            `Unable to load ${symbol}.`,
        },
        {
          status: 404,
          headers:
            noStoreHeaders(),
        }
      );
    }

    const metadata =
      dividendData?.metadata ||
      {};

    const rawDividends =
      Array.isArray(
        dividendData?.data
      )
        ? dividendData!.data!
        : [];

    const normalizedBase =
      rawDividends
        .map(
          normalizeBusinessQuantDividend
        )
        .filter(
          (
            item
          ): item is NonNullable<
            ReturnType<
              typeof normalizeBusinessQuantDividend
            >
          > =>
            item !== null
        )
        .sort(
          (a, b) =>
            b.exDate.localeCompare(
              a.exDate
            )
        );

    const today =
      new Date();

    const cutoff =
      new Date(today);

    cutoff.setFullYear(
      cutoff.getFullYear() -
        1
    );

    const paymentsLast12Months =
      normalizedBase.filter(
        (item) => {
          const date =
            new Date(
              `${item.exDate}T12:00:00`
            );

          return (
            !Number.isNaN(
              date.getTime()
            ) &&
            date >= cutoff
          );
        }
      );

    const inferredFrequency =
      inferFrequency(
        paymentsLast12Months.length
      );

    const dividends =
      normalizedBase.map(
        (item) => ({
          ...item,
          frequency:
            inferredFrequency,
        })
      );

    const latestDividend =
      dividends[0] ??
      null;

    const currentPrice =
      finiteNumber(
        quote.price
      );

    const metadataTtm =
      finiteOrNull(
        metadata.ttmdividend
      );

    const calculatedTtm =
      paymentsLast12Months.reduce(
        (sum, item) =>
          sum +
          item.amount,
        0
      );

    const annualDividendPerShare =
      metadataTtm ??
      (
        calculatedTtm > 0
          ? calculatedTtm
          : null
      );

    /*
     * Business Quant returns divyield
     * as a decimal:
     * 0.0035 = 0.35%.
     *
     * Norvexa's existing frontend expects
     * percentage points, so multiply by 100.
     */
    const metadataYieldDecimal =
      finiteOrNull(
        metadata.divyield
      );

    const providerYield =
      metadataYieldDecimal !==
      null
        ? metadataYieldDecimal *
          100
        : null;

    const calculatedYield =
      currentPrice > 0 &&
      annualDividendPerShare !==
        null &&
      annualDividendPerShare > 0
        ? (annualDividendPerShare /
            currentPrice) *
          100
        : null;

    const fiveYearAnnualTotals =
      buildAnnualTotals(
        dividends
      );

    const dividendGrowthPercent =
      calculateAnnualGrowth(
        fiveYearAnnualTotals
      );

    const nextDividend =
      typeof metadata.nextdividend ===
        "string" &&
      metadata.nextdividend
        ? metadata.nextdividend.slice(
            0,
            10
          )
        : null;

    return NextResponse.json(
      {
        symbol,

        companyName:
          metadata.companyname ||
          metadata.companyname_short ||
          quote.name ||
          quote.name_short ||
          symbol,

        currentPrice,

        currency:
          quote.currency ||
          latestDividend?.currency ||
          "USD",

        dividendYield:
          providerYield ??
          calculatedYield,

        calculatedYield,

        annualDividendPerShare,

        latestDividend,

        nextDividend,

        dividends:
          dividends.slice(
            0,
            24
          ),

        annualTotals:
          fiveYearAnnualTotals,

        dividendGrowthPercent,

        paymentsLast12Months:
          paymentsLast12Months.length,

        availability: {
          history:
            dividends.length > 0,

          providerStatus:
            dividendResult.status,

          quoteStatus:
            quoteResult.status,

          premiumBlocked:
            false,

          rateLimited:
            dividendResult.status ===
              429 ||
            quoteResult.status ===
              429,

          temporaryFailure:
            [
              500,
              502,
              503,
              504,
              null,
            ].includes(
              dividendResult.status
            ),
        },

        source: {
          dividends:
            "Business Quant",

          price:
            "Business Quant Quotes",
        },

        generatedAt:
          new Date().toISOString(),
      },
      {
        status: 200,
        headers:
          noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "Dividend Center API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load dividend data.",
      },
      {
        status: 500,
        headers:
          noStoreHeaders(),
      }
    );
  }
}

async function fetchProvider(
  url: URL
): Promise<FetchResult> {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

  try {
    const response =
      await fetch(
        url,
        {
          cache:
            "no-store",

          signal:
            controller.signal,

          headers: {
            Accept:
              "application/json",
          },
        }
      );

    const contentType =
      response.headers.get(
        "content-type"
      ) || "";

    if (
      !contentType.includes(
        "application/json"
      )
    ) {
      return {
        ok: false,
        status:
          response.status,
        data: null,
      };
    }

    let data:
      unknown = null;

    try {
      data =
        await response.json();
    } catch {
      data = null;
    }

    return {
      ok:
        response.ok,

      status:
        response.status,

      data,
    };
  } catch {
    return {
      ok: false,
      status: null,
      data: null,
    };
  } finally {
    clearTimeout(
      timeout
    );
  }
}

function normalizeBusinessQuantDividend(
  item: BQDividendItem
) {
  const exDate =
    typeof item.ex_date ===
      "string"
      ? item.ex_date.slice(
          0,
          10
        )
      : "";

  const amount =
    finiteOrNull(
      item.dividend
    );

  if (
    !exDate ||
    amount === null
  ) {
    return null;
  }

  return {
    symbol: "",

    exDate,

    amount,

    /*
     * Business Quant's DPS history is
     * already per-share dividend data.
     */
    adjustedAmount:
      amount,

    payDate:
      typeof item.payment_date ===
        "string"
        ? item.payment_date.slice(
            0,
            10
          )
        : "",

    /*
     * These fields are not supplied by
     * Business Quant's DPS endpoint.
     * Keep them for compatibility with
     * the existing Norvexa frontend.
     */
    recordDate:
      "",

    declarationDate:
      "",

    currency:
      "USD",

    frequency:
      "Unknown",
  };
}

function inferFrequency(
  paymentsLast12Months: number
) {
  if (
    paymentsLast12Months >=
    10
  ) {
    return "Monthly";
  }

  if (
    paymentsLast12Months >=
    4
  ) {
    return "Quarterly";
  }

  if (
    paymentsLast12Months >=
    2
  ) {
    return "Semiannual";
  }

  if (
    paymentsLast12Months ===
    1
  ) {
    return "Annual";
  }

  return "Unknown";
}

function buildAnnualTotals(
  dividends: Array<{
    exDate: string;
    amount: number;
    adjustedAmount:
      | number
      | null;
  }>
) {
  const totals =
    new Map<
      number,
      number
    >();

  for (
    const dividend
    of dividends
  ) {
    const year =
      Number(
        dividend.exDate.slice(
          0,
          4
        )
      );

    if (
      !Number.isInteger(
        year
      )
    ) {
      continue;
    }

    totals.set(
      year,
      (
        totals.get(
          year
        ) ||
        0
      ) +
        (
          dividend.adjustedAmount ??
          dividend.amount
        )
    );
  }

  return Array.from(
    totals.entries()
  )
    .map(
      ([
        year,
        total,
      ]) => ({
        year,
        total,
      })
    )
    .sort(
      (a, b) =>
        b.year -
        a.year
    )
    .slice(0, 5);
}

function calculateAnnualGrowth(
  totals: Array<{
    year: number;
    total: number;
  }>
) {
  if (
    totals.length < 2
  ) {
    return null;
  }

  const latest =
    totals[0]?.total;

  const previous =
    totals[1]?.total;

  if (
    latest ===
      undefined ||
    previous ===
      undefined ||
    previous === 0
  ) {
    return null;
  }

  return (
    ((latest -
      previous) /
      Math.abs(
        previous
      )) *
    100
  );
}

function isPlainObject(
  value: unknown
): value is Record<
  string,
  unknown
> {
  return Boolean(
    value &&
      typeof value ===
        "object" &&
      !Array.isArray(
        value
      )
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

function noStoreHeaders() {
  return {
    "Cache-Control":
      "private, no-cache, no-store, max-age=0, must-revalidate",

    Pragma:
      "no-cache",

    Expires:
      "0",
  };
}