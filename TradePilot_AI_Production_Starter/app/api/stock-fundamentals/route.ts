import { NextRequest, NextResponse } from "next/server";

type FinnhubMetricResponse = {
  metric?: Record<string, unknown>;
  metricType?: string;
  series?: Record<string, unknown>;
  symbol?: string;
};

type CachedFundamentals = {
  data: StockFundamentalsResponse;
  savedAt: number;
};

type StockFundamentalsResponse = {
  symbol: string;
  metrics: {
    peRatio: number | null;
    eps: number | null;
    revenuePerShare: number | null;
    netProfitMargin: number | null;
    grossMargin: number | null;
    operatingMargin: number | null;
    week52High: number | null;
    week52Low: number | null;
    beta: number | null;
    dividendYield: number | null;
    averageVolume10Day: number | null;
    averageVolume3Month: number | null;
    marketCapitalization: number | null;
    priceToBook: number | null;
    currentRatio: number | null;
    debtToEquity: number | null;
    returnOnEquity: number | null;
  };
  peers: string[];
  updatedAt: string;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CACHE_MS = 15 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 7_000;

const globalCache = globalThis as typeof globalThis & {
  tradePilotFundamentalsCache?: Map<
    string,
    CachedFundamentals
  >;
};

const fundamentalsCache =
  globalCache.tradePilotFundamentalsCache ??
  (globalCache.tradePilotFundamentalsCache =
    new Map());

export async function GET(request: NextRequest) {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "FINNHUB_API_KEY is missing from .env.local.",
      },
      { status: 500 }
    );
  }

  const symbol = request.nextUrl.searchParams
    .get("symbol")
    ?.trim()
    .toUpperCase();

  if (!symbol) {
    return NextResponse.json(
      { error: "A stock symbol is required." },
      { status: 400 }
    );
  }

  if (!/^[A-Z0-9.-]{1,15}$/.test(symbol)) {
    return NextResponse.json(
      { error: "The stock symbol is invalid." },
      { status: 400 }
    );
  }

  const cached = fundamentalsCache.get(symbol);

  if (
    cached &&
    Date.now() - cached.savedAt < CACHE_MS
  ) {
    return fundamentalsJson(cached.data, "HIT");
  }

  try {
    const metricUrl = new URL(
      "https://finnhub.io/api/v1/stock/metric"
    );

    metricUrl.searchParams.set("symbol", symbol);
    metricUrl.searchParams.set("metric", "all");
    metricUrl.searchParams.set("token", apiKey);

    const peersUrl = new URL(
      "https://finnhub.io/api/v1/stock/peers"
    );

    peersUrl.searchParams.set("symbol", symbol);
    peersUrl.searchParams.set("token", apiKey);

    const [metricResult, peersResult] =
      await Promise.allSettled([
        fetchWithTimeout(metricUrl),
        fetchWithTimeout(peersUrl),
      ]);

    let metricData: FinnhubMetricResponse = {};

    if (
      metricResult.status === "fulfilled" &&
      metricResult.value.ok
    ) {
      metricData =
        (await metricResult.value.json()) as FinnhubMetricResponse;
    }

    let peers: string[] = [];

    if (
      peersResult.status === "fulfilled" &&
      peersResult.value.ok
    ) {
      const peerData =
        (await peersResult.value.json()) as unknown;

      if (Array.isArray(peerData)) {
        peers = peerData
          .filter(
            (peer): peer is string =>
              typeof peer === "string"
          )
          .map((peer) => peer.toUpperCase())
          .filter(
            (peer) =>
              peer !== symbol &&
              /^[A-Z0-9.-]{1,15}$/.test(peer)
          )
          .slice(0, 8);
      }
    }

    const metric = metricData.metric ?? {};

    const data: StockFundamentalsResponse = {
      symbol,
      metrics: {
        peRatio: firstFinite(metric, [
          "peTTM",
          "peBasicExclExtraTTM",
          "peNormalizedAnnual",
        ]),
        eps: firstFinite(metric, [
          "epsTTM",
          "epsBasicExclExtraItemsTTM",
          "epsNormalizedAnnual",
        ]),
        revenuePerShare: firstFinite(metric, [
          "revenuePerShareTTM",
          "revenuePerShareAnnual",
        ]),
        netProfitMargin: firstFinite(metric, [
          "netProfitMarginTTM",
          "netProfitMarginAnnual",
        ]),
        grossMargin: firstFinite(metric, [
          "grossMarginTTM",
          "grossMarginAnnual",
        ]),
        operatingMargin: firstFinite(metric, [
          "operatingMarginTTM",
          "operatingMarginAnnual",
        ]),
        week52High: firstFinite(metric, [
          "52WeekHigh",
        ]),
        week52Low: firstFinite(metric, [
          "52WeekLow",
        ]),
        beta: firstFinite(metric, ["beta"]),
        dividendYield: firstFinite(metric, [
          "dividendYieldIndicatedAnnual",
          "dividendYieldTTM",
        ]),
        averageVolume10Day: firstFinite(metric, [
          "10DayAverageTradingVolume",
        ]),
        averageVolume3Month: firstFinite(metric, [
          "3MonthAverageTradingVolume",
        ]),
        marketCapitalization: firstFinite(
          metric,
          ["marketCapitalization"]
        ),
        priceToBook: firstFinite(metric, [
          "pbAnnual",
          "pbQuarterly",
        ]),
        currentRatio: firstFinite(metric, [
          "currentRatioAnnual",
          "currentRatioQuarterly",
        ]),
        debtToEquity: firstFinite(metric, [
          "totalDebt/totalEquityAnnual",
          "totalDebt/totalEquityQuarterly",
        ]),
        returnOnEquity: firstFinite(metric, [
          "roeTTM",
          "roeAnnual",
        ]),
      },
      peers,
      updatedAt: new Date().toISOString(),
    };

    fundamentalsCache.set(symbol, {
      data,
      savedAt: Date.now(),
    });

    return fundamentalsJson(data, "MISS");
  } catch (error) {
    if (cached) {
      return fundamentalsJson(
        cached.data,
        "STALE"
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load stock fundamentals.",
      },
      {
        status: 503,
        headers: {
          "Retry-After": "30",
          ...noStoreHeaders(),
        },
      }
    );
  }
}

function firstFinite(
  metric: Record<string, unknown>,
  keys: string[]
) {
  for (const key of keys) {
    const value = Number(metric[key]);

    if (Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

async function fetchWithTimeout(url: URL) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function fundamentalsJson(
  data: StockFundamentalsResponse,
  cacheStatus: "HIT" | "MISS" | "STALE"
) {
  return NextResponse.json(data, {
    status: 200,
    headers: {
      ...noStoreHeaders(),
      "X-TradePilot-Fundamentals-Cache":
        cacheStatus,
    },
  });
}

function noStoreHeaders() {
  return {
    "Cache-Control":
      "private, no-cache, no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}