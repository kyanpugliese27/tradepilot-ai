import { NextRequest, NextResponse } from "next/server";

type StockQuote = {
  symbol: string;
  name?: string;
  logo?: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
  stale?: boolean;
};

type MarketItem = {
  symbol: string;
  label: string;
  description: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
  stale: boolean;
  logo: string;
};

type MarketStatus = {
  state:
    | "open"
    | "closed"
    | "pre-market"
    | "after-hours";
  label: string;
  isOpen: boolean;
  holiday: string | null;
  session: string | null;
  timezone: string;
  source: "provider" | "schedule";
};

type MarketsResponse = {
  status: MarketStatus | null;
  majorMarkets: MarketItem[];
  movers: MarketItem[];
  sectors: MarketItem[];
  updatedAt: string;
};

type Definition = {
  symbol: string;
  label: string;
  description: string;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const majorMarketDefinitions: Definition[] = [
  {
    symbol: "SPY",
    label: "S&P 500 ETF",
    description: "Large-cap U.S. market proxy",
  },
  {
    symbol: "QQQ",
    label: "Nasdaq-100 ETF",
    description: "Growth and technology proxy",
  },
  {
    symbol: "DIA",
    label: "Dow ETF",
    description: "Dow Jones proxy",
  },
  {
    symbol: "IWM",
    label: "Russell 2000 ETF",
    description: "Small-cap market proxy",
  },
  {
    symbol: "VXX",
    label: "Volatility ETF",
    description: "Short-term volatility proxy",
  },
];

const moverDefinitions: Definition[] = [
  { symbol: "AAPL", label: "Apple", description: "Technology" },
  { symbol: "MSFT", label: "Microsoft", description: "Technology" },
  { symbol: "NVDA", label: "NVIDIA", description: "Semiconductors" },
  { symbol: "AMZN", label: "Amazon", description: "Consumer and cloud" },
  { symbol: "GOOGL", label: "Alphabet", description: "Internet services" },
  { symbol: "META", label: "Meta", description: "Internet services" },
  { symbol: "TSLA", label: "Tesla", description: "Automotive" },
  { symbol: "AMD", label: "AMD", description: "Semiconductors" },
  { symbol: "NFLX", label: "Netflix", description: "Media" },
  { symbol: "JPM", label: "JPMorgan", description: "Financials" },
  { symbol: "XOM", label: "Exxon Mobil", description: "Energy" },
  { symbol: "WMT", label: "Walmart", description: "Consumer staples" },
];

const sectorDefinitions: Definition[] = [
  { symbol: "XLK", label: "Technology", description: "Technology sector ETF" },
  { symbol: "XLF", label: "Financials", description: "Financial sector ETF" },
  { symbol: "XLE", label: "Energy", description: "Energy sector ETF" },
  { symbol: "XLV", label: "Health Care", description: "Health care sector ETF" },
  { symbol: "XLY", label: "Consumer Discretionary", description: "Consumer discretionary ETF" },
  { symbol: "XLP", label: "Consumer Staples", description: "Consumer staples ETF" },
  { symbol: "XLI", label: "Industrials", description: "Industrial sector ETF" },
  { symbol: "XLU", label: "Utilities", description: "Utilities sector ETF" },
  { symbol: "XLB", label: "Materials", description: "Materials sector ETF" },
  { symbol: "XLRE", label: "Real Estate", description: "Real estate sector ETF" },
  { symbol: "XLC", label: "Communication Services", description: "Communication services ETF" },
];

export async function GET(request: NextRequest) {
  try {
    const origin = request.nextUrl.origin;

    const [overview, majorMarkets, movers, sectors] =
      await Promise.all([
        fetchJson(`${origin}/api/market-overview?refresh=${Date.now()}`),
        loadItems(origin, majorMarketDefinitions),
        loadItems(origin, moverDefinitions),
        loadItems(origin, sectorDefinitions),
      ]);

    const status =
      overview &&
      typeof overview.status === "object"
        ? (overview.status as MarketStatus)
        : null;

    const response: MarketsResponse = {
      status,
      majorMarkets,
      movers,
      sectors,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: noStoreHeaders(),
    });
  } catch (error) {
    console.error("Markets API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load markets.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}

async function loadItems(
  origin: string,
  definitions: Definition[]
): Promise<MarketItem[]> {
  const results = await Promise.all(
    definitions.map(async (definition): Promise<MarketItem | null> => {
      const data = await fetchJson(
        `${origin}/api/stock-details?symbol=${encodeURIComponent(
          definition.symbol
        )}`
      );

      if (!data?.stock) {
        return null;
      }

      const stock = data.stock as StockQuote;

      return {
        symbol: definition.symbol,
        label: definition.label,
        description: definition.description,
        price: finiteNumber(stock.price),
        change: finiteNumber(stock.change),
        changePercent: finiteNumber(stock.changePercent),
        high: finiteNumber(stock.high),
        low: finiteNumber(stock.low),
        open: finiteNumber(stock.open),
        previousClose: finiteNumber(stock.previousClose),
        timestamp: finiteNumber(stock.timestamp),
        stale: Boolean(stock.stale),
        logo:
          typeof stock.logo === "string"
            ? stock.logo
            : "",
      };
    })
  );

  return results.filter(
    (item): item is MarketItem => item !== null
  );
}

async function fetchJson(
  url: string
): Promise<Record<string, any> | null> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store",
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as Record<
      string,
      any
    >;
  } catch {
    return null;
  }
}

function finiteNumber(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
}

function noStoreHeaders() {
  return {
    "Cache-Control":
      "private, no-cache, no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}