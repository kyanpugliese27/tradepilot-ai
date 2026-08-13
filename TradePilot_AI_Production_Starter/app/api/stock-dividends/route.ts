import { NextRequest, NextResponse } from "next/server";

type FinnhubDividend = {
  symbol?: string;
  date?: string;
  exDate?: string;
  amount?: number;
  adjustedAmount?: number;
  payDate?: string;
  recordDate?: string;
  declarationDate?: string;
  currency?: string;
  freq?: number;
};

type FundamentalsResponse = {
  metrics?: {
    dividendYield?: number | null;
  };
};

type StockResponse = {
  stock?: {
    symbol: string;
    name?: string;
    price: number;
    currency?: string;
  };
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

    if (!symbol || !/^[A-Z0-9.-]{1,15}$/.test(symbol)) {
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

    const origin = request.nextUrl.origin;

    const [stockData, fundamentalsData] =
      await Promise.all([
        fetchJson(
          `${origin}/api/stock-details?symbol=${encodeURIComponent(
            symbol
          )}`
        ),
        fetchJson(
          `${origin}/api/stock-fundamentals?symbol=${encodeURIComponent(
            symbol
          )}`
        ),
      ]);

    const stock =
      (stockData as StockResponse | null)?.stock ??
      null;

    if (!stock) {
      return NextResponse.json(
        {
          error: `Unable to load ${symbol}.`,
        },
        {
          status: 404,
          headers: noStoreHeaders(),
        }
      );
    }

    const dividendYield = finiteOrNull(
      (fundamentalsData as FundamentalsResponse | null)
        ?.metrics?.dividendYield
    );

    const today = new Date();
    const from = new Date(today);
    from.setFullYear(from.getFullYear() - 5);

    const dividendUrl = new URL(
      "https://finnhub.io/api/v1/stock/dividend"
    );

    dividendUrl.searchParams.set("symbol", symbol);
    dividendUrl.searchParams.set("from", formatDate(from));
    dividendUrl.searchParams.set("to", formatDate(today));
    dividendUrl.searchParams.set("token", apiKey);

    const result = await fetchProvider(dividendUrl);

    const rawDividends = Array.isArray(result.data)
      ? (result.data as FinnhubDividend[])
      : [];

    const dividends = rawDividends
      .map(normalizeDividend)
      .filter(
        (
          item
        ): item is NonNullable<
          ReturnType<typeof normalizeDividend>
        > => item !== null
      )
      .sort((a, b) =>
        b.exDate.localeCompare(a.exDate)
      );

    const latestDividend = dividends[0] ?? null;

    const paymentsLast12Months = dividends.filter(
      (item) => {
        const date = new Date(
          `${item.exDate}T12:00:00`
        );

        const cutoff = new Date(today);
        cutoff.setFullYear(
          cutoff.getFullYear() - 1
        );

        return (
          !Number.isNaN(date.getTime()) &&
          date >= cutoff
        );
      }
    );

    const annualDividendPerShare =
      paymentsLast12Months.reduce(
        (sum, item) =>
          sum +
          (item.adjustedAmount ??
            item.amount),
        0
      );

    const calculatedYield =
      stock.price > 0 &&
      annualDividendPerShare > 0
        ? (annualDividendPerShare /
            stock.price) *
          100
        : null;

    const fiveYearAnnualTotals =
      buildAnnualTotals(dividends);

    const dividendGrowthPercent =
      calculateAnnualGrowth(
        fiveYearAnnualTotals
      );

    return NextResponse.json(
      {
        symbol,
        companyName: stock.name || symbol,
        currentPrice: stock.price,
        currency:
          stock.currency ||
          latestDividend?.currency ||
          "USD",
        dividendYield:
          dividendYield ?? calculatedYield,
        calculatedYield,
        annualDividendPerShare:
          annualDividendPerShare > 0
            ? annualDividendPerShare
            : null,
        latestDividend,
        dividends: dividends.slice(0, 24),
        annualTotals: fiveYearAnnualTotals,
        dividendGrowthPercent,
        paymentsLast12Months:
          paymentsLast12Months.length,
        availability: {
          history: dividends.length > 0,
          providerStatus: result.status,
          premiumBlocked:
            result.status === 401 ||
            result.status === 403,
          rateLimited:
            result.status === 429,
          temporaryFailure:
            result.status === 500 ||
            result.status === 502 ||
            result.status === 503 ||
            result.status === 504 ||
            result.status === null,
        },
        generatedAt:
          new Date().toISOString(),
      },
      {
        status: 200,
        headers: noStoreHeaders(),
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
        headers: noStoreHeaders(),
      }
    );
  }
}

async function fetchProvider(url: URL) {
  const controller = new AbortController();

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
        status: response.status,
        data: null as unknown,
      };
    }

    try {
      return {
        status: response.status,
        data: await response.json(),
      };
    } catch {
      return {
        status: response.status,
        data: null as unknown,
      };
    }
  } catch {
    return {
      status: null,
      data: null as unknown,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(
  url: string
): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

function normalizeDividend(
  item: FinnhubDividend
) {
  const exDate =
    typeof item.date === "string"
      ? item.date.slice(0, 10)
      : typeof item.exDate === "string"
        ? item.exDate.slice(0, 10)
        : "";

  const amount = finiteOrNull(item.amount);

  if (!exDate || amount === null) {
    return null;
  }

  return {
    symbol:
      typeof item.symbol === "string"
        ? item.symbol
        : "",
    exDate,
    amount,
    adjustedAmount:
      finiteOrNull(item.adjustedAmount),
    payDate:
      typeof item.payDate === "string"
        ? item.payDate.slice(0, 10)
        : "",
    recordDate:
      typeof item.recordDate === "string"
        ? item.recordDate.slice(0, 10)
        : "",
    declarationDate:
      typeof item.declarationDate === "string"
        ? item.declarationDate.slice(0, 10)
        : "",
    currency:
      typeof item.currency === "string"
        ? item.currency
        : "USD",
    frequency:
      frequencyLabel(item.freq),
  };
}

function buildAnnualTotals(
  dividends: Array<{
    exDate: string;
    amount: number;
    adjustedAmount: number | null;
  }>
) {
  const totals = new Map<number, number>();

  for (const dividend of dividends) {
    const year = Number(
      dividend.exDate.slice(0, 4)
    );

    if (!Number.isInteger(year)) {
      continue;
    }

    totals.set(
      year,
      (totals.get(year) || 0) +
        (dividend.adjustedAmount ??
          dividend.amount)
    );
  }

  return Array.from(totals.entries())
    .map(([year, total]) => ({
      year,
      total,
    }))
    .sort((a, b) => b.year - a.year)
    .slice(0, 5);
}

function calculateAnnualGrowth(
  totals: Array<{
    year: number;
    total: number;
  }>
) {
  if (totals.length < 2) {
    return null;
  }

  const latest = totals[0]?.total;
  const previous = totals[1]?.total;

  if (
    !latest ||
    !previous ||
    previous === 0
  ) {
    return null;
  }

  return (
    ((latest - previous) /
      Math.abs(previous)) *
    100
  );
}

function frequencyLabel(
  value: unknown
) {
  const frequency = Number(value);

  const labels: Record<number, string> = {
    0: "Annual",
    1: "Monthly",
    2: "Quarterly",
    3: "Semiannual",
    4: "Other",
    5: "Bimonthly",
    6: "Trimesterly",
    7: "Weekly",
  };

  return labels[frequency] || "Unknown";
}

function finiteOrNull(
  value: unknown
): number | null {
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : null;
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