import { NextRequest, NextResponse } from "next/server";

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

type OwnershipItem = {
  name?: string;
  share?: number;
  change?: number;
  filingDate?: string;
  portfolioPercent?: number;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REQUEST_TIMEOUT_MS = 8_000;

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "FINNHUB_API_KEY is missing from .env.local.",
        },
        {
          status: 500,
          headers: noStoreHeaders(),
        }
      );
    }

    const symbol = request.nextUrl.searchParams
      .get("symbol")
      ?.trim()
      .toUpperCase();

    if (
      !symbol ||
      !/^[A-Z0-9.-]{1,15}$/.test(symbol)
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

    const to = formatDate(new Date());

    const insiderUrl = new URL(
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
      apiKey
    );

    const ownershipUrl = new URL(
      "https://finnhub.io/api/v1/stock/ownership"
    );

    ownershipUrl.searchParams.set(
      "symbol",
      symbol
    );
    ownershipUrl.searchParams.set(
      "limit",
      "20"
    );
    ownershipUrl.searchParams.set(
      "token",
      apiKey
    );

    const fundOwnershipUrl = new URL(
      "https://finnhub.io/api/v1/stock/fund-ownership"
    );

    fundOwnershipUrl.searchParams.set(
      "symbol",
      symbol
    );
    fundOwnershipUrl.searchParams.set(
      "limit",
      "20"
    );
    fundOwnershipUrl.searchParams.set(
      "token",
      apiKey
    );

    const [
      insiderResult,
      ownershipResult,
      fundOwnershipResult,
    ] = await Promise.all([
      fetchOptionalJson(insiderUrl),
      fetchOptionalJson(ownershipUrl),
      fetchOptionalJson(
        fundOwnershipUrl
      ),
    ]);

    const insiders = Array.isArray(
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

    const institutions =
      Array.isArray(
        ownershipResult.data?.ownership
      )
        ? (
            ownershipResult.data
              .ownership as OwnershipItem[]
          )
            .map(normalizeOwnership)
            .filter(
              (
                item
              ): item is NonNullable<
                ReturnType<
                  typeof normalizeOwnership
                >
              > => item !== null
            )
            .slice(0, 20)
        : [];

    const funds = Array.isArray(
      fundOwnershipResult.data
        ?.ownership
    )
      ? (
          fundOwnershipResult.data
            .ownership as OwnershipItem[]
        )
          .map(normalizeOwnership)
          .filter(
            (
              item
            ): item is NonNullable<
              ReturnType<
                typeof normalizeOwnership
              >
            > => item !== null
          )
          .slice(0, 20)
      : [];

    const buys = insiders.filter(
      (item) => item.change > 0
    );

    const sells = insiders.filter(
      (item) => item.change < 0
    );

    const buyShares = buys.reduce(
      (sum, item) =>
        sum + Math.abs(item.change),
      0
    );

    const sellShares = sells.reduce(
      (sum, item) =>
        sum + Math.abs(item.change),
      0
    );

    const netShares =
      buyShares - sellShares;

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
            institutions.length,
          fundHolders: funds.length,
          netInstitutionalChange,
          netFundChange,
        },
        availability: {
          insiders:
            insiderResult.ok &&
            insiders.length > 0,
          institutions:
            ownershipResult.ok &&
            institutions.length > 0,
          funds:
            fundOwnershipResult.ok &&
            funds.length > 0,
          insiderStatus:
            insiderResult.status,
          ownershipStatus:
            ownershipResult.status,
          fundOwnershipStatus:
            fundOwnershipResult.status,
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

  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: null,
      };
    }

    try {
      return {
        ok: true,
        status: response.status,
        data:
          (await response.json()) as Record<
            string,
            any
          >,
      };
    } catch {
      return {
        ok: false,
        status: response.status,
        data: null,
      };
    }
  } catch {
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
    share: finiteNumber(item.share),
    change: finiteNumber(
      item.change
    ),
    filingDate:
      typeof item.filingDate ===
      "string"
        ? item.filingDate.slice(0, 10)
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

function normalizeOwnership(
  item: OwnershipItem
) {
  const name =
    typeof item.name === "string"
      ? item.name.trim()
      : "";

  if (!name) {
    return null;
  }

  return {
    name,
    share: finiteNumber(item.share),
    change: finiteNumber(
      item.change
    ),
    filingDate:
      typeof item.filingDate ===
      "string"
        ? item.filingDate.slice(0, 10)
        : "",
    portfolioPercent:
      finiteOrNull(
        item.portfolioPercent
      ),
  };
}

function finiteNumber(
  value: unknown
) {
  const numberValue = Number(value);

  return Number.isFinite(
    numberValue
  )
    ? numberValue
    : 0;
}

function finiteOrNull(
  value: unknown
): number | null {
  const numberValue = Number(value);

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
  const result = new Date(date);
  result.setDate(
    result.getDate() + days
  );
  return result;
}

function formatDate(date: Date) {
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