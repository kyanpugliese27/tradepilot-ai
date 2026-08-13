import { NextRequest, NextResponse } from "next/server";

type StockDetailsResponse = {
  stock?: {
    symbol: string;
    name?: string;
    logo?: string;
    price: number;
    changePercent: number;
    marketCapitalization?: number | null;
  };
};

type FundamentalsResponse = {
  metrics?: {
    peRatio?: number | null;
    eps?: number | null;
    netProfitMargin?: number | null;
    grossMargin?: number | null;
    operatingMargin?: number | null;
    beta?: number | null;
    dividendYield?: number | null;
    priceToBook?: number | null;
    currentRatio?: number | null;
    debtToEquity?: number | null;
    returnOnEquity?: number | null;
    week52High?: number | null;
    week52Low?: number | null;
    marketCapitalization?: number | null;
  };
  peers?: string[];
};

type CompanyComparison = {
  symbol: string;
  name: string;
  logo: string;
  price: number;
  changePercent: number;
  marketCapitalization: number | null;
  peRatio: number | null;
  eps: number | null;
  netProfitMargin: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  beta: number | null;
  dividendYield: number | null;
  priceToBook: number | null;
  currentRatio: number | null;
  debtToEquity: number | null;
  returnOnEquity: number | null;
  week52High: number | null;
  week52Low: number | null;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_COMPANIES = 4;

export async function GET(request: NextRequest) {
  try {
    const symbol = normalizeSymbol(
      request.nextUrl.searchParams.get("symbol") || ""
    );

    if (!isValidSymbol(symbol)) {
      return NextResponse.json(
        {
          error: "A valid stock symbol is required.",
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        }
      );
    }

    const origin = request.nextUrl.origin;

    const requestedPeers = (
      request.nextUrl.searchParams.get("peers") || ""
    )
      .split(",")
      .map(normalizeSymbol)
      .filter(
        (item) =>
          isValidSymbol(item) &&
          item !== symbol
      );

    const baseFundamentals = await fetchJson(
      `${origin}/api/stock-fundamentals?symbol=${encodeURIComponent(
        symbol
      )}`
    );

    const automaticPeers = Array.isArray(
      (baseFundamentals as FundamentalsResponse | null)?.peers
    )
      ? (
          (baseFundamentals as FundamentalsResponse)
            .peers || []
        )
          .map(normalizeSymbol)
          .filter(
            (item) =>
              isValidSymbol(item) &&
              item !== symbol
          )
      : [];

    const peerSymbols = Array.from(
      new Set([
        ...requestedPeers,
        ...automaticPeers,
      ])
    ).slice(0, MAX_COMPANIES - 1);

    const symbols = [symbol, ...peerSymbols];

    const companies = (
      await Promise.all(
        symbols.map((item) =>
          loadCompany(origin, item)
        )
      )
    ).filter(
      (
        item
      ): item is CompanyComparison =>
        item !== null
    );

    if (companies.length === 0) {
      return NextResponse.json(
        {
          error:
            "No comparison data was available.",
        },
        {
          status: 404,
          headers: noStoreHeaders(),
        }
      );
    }

    return NextResponse.json(
      {
        symbol,
        companies,
        peerSymbols: companies
          .slice(1)
          .map((company) => company.symbol),
        winners: calculateWinners(companies),
        generatedAt:
          new Date().toISOString(),
      },
      {
        headers: noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "Competitor comparison API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load competitor data.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}

async function loadCompany(
  origin: string,
  symbol: string
): Promise<CompanyComparison | null> {
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
    (stockData as StockDetailsResponse | null)
      ?.stock ?? null;

  if (!stock) {
    return null;
  }

  const metrics =
    ((fundamentalsData as FundamentalsResponse | null)
      ?.metrics ?? {}) as NonNullable<
      FundamentalsResponse["metrics"]
    >;

  return {
    symbol,
    name: stock.name || symbol,
    logo: stock.logo || "",
    price: finiteNumber(stock.price),
    changePercent: finiteNumber(
      stock.changePercent
    ),
    marketCapitalization:
      finiteOrNull(
        stock.marketCapitalization
      ) ??
      finiteOrNull(
        metrics.marketCapitalization
      ),
    peRatio: finiteOrNull(
      metrics.peRatio
    ),
    eps: finiteOrNull(metrics.eps),
    netProfitMargin: finiteOrNull(
      metrics.netProfitMargin
    ),
    grossMargin: finiteOrNull(
      metrics.grossMargin
    ),
    operatingMargin: finiteOrNull(
      metrics.operatingMargin
    ),
    beta: finiteOrNull(metrics.beta),
    dividendYield: finiteOrNull(
      metrics.dividendYield
    ),
    priceToBook: finiteOrNull(
      metrics.priceToBook
    ),
    currentRatio: finiteOrNull(
      metrics.currentRatio
    ),
    debtToEquity: finiteOrNull(
      metrics.debtToEquity
    ),
    returnOnEquity: finiteOrNull(
      metrics.returnOnEquity
    ),
    week52High: finiteOrNull(
      metrics.week52High
    ),
    week52Low: finiteOrNull(
      metrics.week52Low
    ),
  };
}

function calculateWinners(
  companies: CompanyComparison[]
) {
  return {
    marketCapitalization: winner(
      companies,
      "marketCapitalization",
      "higher"
    ),
    peRatio: winner(
      companies,
      "peRatio",
      "lower"
    ),
    eps: winner(
      companies,
      "eps",
      "higher"
    ),
    netProfitMargin: winner(
      companies,
      "netProfitMargin",
      "higher"
    ),
    operatingMargin: winner(
      companies,
      "operatingMargin",
      "higher"
    ),
    returnOnEquity: winner(
      companies,
      "returnOnEquity",
      "higher"
    ),
    currentRatio: winner(
      companies,
      "currentRatio",
      "higher"
    ),
    debtToEquity: winner(
      companies,
      "debtToEquity",
      "lower"
    ),
    dailyPerformance: winner(
      companies,
      "changePercent",
      "higher"
    ),
  };
}

function winner(
  companies: CompanyComparison[],
  key: keyof CompanyComparison,
  direction: "higher" | "lower"
) {
  const valid = companies.filter(
    (company) => {
      const value = company[key];

      return (
        typeof value === "number" &&
        Number.isFinite(value)
      );
    }
  );

  if (valid.length === 0) {
    return null;
  }

  return valid.reduce((best, current) => {
    const bestValue = best[key] as number;
    const currentValue =
      current[key] as number;

    if (direction === "higher") {
      return currentValue > bestValue
        ? current
        : best;
    }

    return currentValue < bestValue
      ? current
      : best;
  }).symbol;
}

async function fetchJson(
  url: string
): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "Cache-Control":
          "no-cache, no-store",
      },
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

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase();
}

function isValidSymbol(value: string) {
  return /^[A-Z0-9.-]{1,15}$/.test(value);
}

function finiteNumber(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
}

function finiteOrNull(
  value: unknown
): number | null {
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : null;
}

function noStoreHeaders() {
  return {
    "Cache-Control":
      "private, no-cache, no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}