import { NextRequest, NextResponse } from "next/server";

type FinnhubQuote = {
  c?: number;
  d?: number;
  dp?: number;
  h?: number;
  l?: number;
  o?: number;
  pc?: number;
  t?: number;
};

type FinnhubProfile = {
  name?: string;
  ticker?: string;
  logo?: string;
  exchange?: string;
  finnhubIndustry?: string;
  country?: string;
  currency?: string;
  weburl?: string;
  marketCapitalization?: number;
};

type StockResponse = {
  symbol: string;
  name: string;
  logo: string;
  exchange: string;
  industry: string;
  country: string;
  currency: string;
  website: string;
  marketCapitalization: number | null;
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

type CachedQuote = {
  stock: StockResponse;
  savedAt: number;
};

type CachedProfile = {
  profile: FinnhubProfile;
  savedAt: number;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const QUOTE_CACHE_MS = 15_000;
const STALE_QUOTE_MAX_AGE_MS = 30 * 60 * 1000;
const PROFILE_CACHE_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 7_000;

const globalCache = globalThis as typeof globalThis & {
  NorvexaQuoteCache?: Map<string, CachedQuote>;
  NorvexaProfileCache?: Map<string, CachedProfile>;
  NorvexaPendingQuotes?: Map<string, Promise<StockResponse>>;
};

const quoteCache =
  globalCache.NorvexaQuoteCache ??
  (globalCache.NorvexaQuoteCache = new Map());

const profileCache =
  globalCache.NorvexaProfileCache ??
  (globalCache.NorvexaProfileCache = new Map());

const pendingQuotes =
  globalCache.NorvexaPendingQuotes ??
  (globalCache.NorvexaPendingQuotes = new Map());

export async function GET(request: NextRequest) {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "FINNHUB_API_KEY is missing from .env.local.",
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

  const cached = quoteCache.get(symbol);

  if (cached && Date.now() - cached.savedAt < QUOTE_CACHE_MS) {
    return stockJson(cached.stock, "HIT");
  }

  try {
    /*
     * If several dashboard requests ask for the same symbol at once,
     * all of them share one Finnhub request instead of multiplying calls.
     */
    let pending = pendingQuotes.get(symbol);

    if (!pending) {
      pending = loadStockFromFinnhub(symbol, apiKey);
      pendingQuotes.set(symbol, pending);
    }

    const stock = await pending;

    quoteCache.set(symbol, {
      stock,
      savedAt: Date.now(),
    });

    return stockJson(stock, "MISS");
  } catch (error) {
    /*
     * Finnhub can briefly fail or rate-limit requests. When we already
     * have a recent quote, return it instead of breaking the whole page.
     */
    if (
      cached &&
      Date.now() - cached.savedAt < STALE_QUOTE_MAX_AGE_MS
    ) {
      return stockJson(
        {
          ...cached.stock,
          stale: true,
        },
        "STALE"
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Live market data is temporarily unavailable.";

    return NextResponse.json(
      {
        error: message,
        temporary: true,
      },
      {
        status: 503,
        headers: {
          "Retry-After": "20",
          "Cache-Control": "no-store",
        },
      }
    );
  } finally {
    pendingQuotes.delete(symbol);
  }
}

async function loadStockFromFinnhub(
  symbol: string,
  apiKey: string
): Promise<StockResponse> {
  const quoteUrl = new URL("https://finnhub.io/api/v1/quote");
  quoteUrl.searchParams.set("symbol", symbol);
  quoteUrl.searchParams.set("token", apiKey);

  /*
   * The quote is the only required request.
   * We do not retry it three times because that can quickly exhaust
   * Finnhub's free request allowance when the dashboard loads many stocks.
   */
  const quoteResponse = await fetchWithTimeout(quoteUrl);

  if (!quoteResponse.ok) {
    throw new Error(
      friendlyProviderError(symbol, quoteResponse.status)
    );
  }

  let quote: FinnhubQuote;

  try {
    quote = (await quoteResponse.json()) as FinnhubQuote;
  } catch {
    throw new Error(`Finnhub returned invalid quote data for ${symbol}.`);
  }

  const price = toFiniteNumber(quote.c, 0);
  const previousClose = toFiniteNumber(quote.pc, 0);

  if (price <= 0) {
    throw new Error(`No live stock data was found for ${symbol}.`);
  }

  /*
   * Company profile data changes rarely, so cache it for 24 hours.
   * A profile failure never prevents the live price from loading.
   */
  const profile = await loadProfile(symbol, apiKey);

  const calculatedChange =
    previousClose > 0 ? price - previousClose : 0;

  const change = toFiniteNumber(quote.d, calculatedChange);

  const calculatedChangePercent =
    previousClose > 0
      ? ((price - previousClose) / previousClose) * 100
      : 0;

  const changePercent = toFiniteNumber(
    quote.dp,
    calculatedChangePercent
  );

  return {
    symbol,
    name: profile.name || profile.ticker || symbol,
    logo: profile.logo || "",
    exchange: profile.exchange || "",
    industry: profile.finnhubIndustry || "",
    country: profile.country || "",
    currency: profile.currency || "USD",
    website: profile.weburl || "",
    marketCapitalization:
      typeof profile.marketCapitalization === "number" &&
      Number.isFinite(profile.marketCapitalization)
        ? profile.marketCapitalization
        : null,
    price,
    change,
    changePercent,
    high: toFiniteNumber(quote.h, price),
    low: toFiniteNumber(quote.l, price),
    open: toFiniteNumber(quote.o, price),
    previousClose:
      previousClose > 0 ? previousClose : price - change,
    timestamp: toFiniteNumber(
      quote.t,
      Math.floor(Date.now() / 1000)
    ),
  };
}

async function loadProfile(
  symbol: string,
  apiKey: string
): Promise<FinnhubProfile> {
  const cached = profileCache.get(symbol);

  if (cached && Date.now() - cached.savedAt < PROFILE_CACHE_MS) {
    return cached.profile;
  }

  const profileUrl = new URL(
    "https://finnhub.io/api/v1/stock/profile2"
  );

  profileUrl.searchParams.set("symbol", symbol);
  profileUrl.searchParams.set("token", apiKey);

  try {
    const response = await fetchWithTimeout(profileUrl);

    if (!response.ok) {
      return cached?.profile ?? {};
    }

    const profile =
      (await response.json()) as FinnhubProfile;

    profileCache.set(symbol, {
      profile,
      savedAt: Date.now(),
    });

    return profile;
  } catch {
    return cached?.profile ?? {};
  }
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

function stockJson(
  stock: StockResponse,
  cacheStatus: "HIT" | "MISS" | "STALE"
) {
  return NextResponse.json(
    { stock },
    {
      status: 200,
      headers: {
        "Cache-Control":
          "private, no-cache, no-store, max-age=0, must-revalidate",
        "X-Norvexa-Cache": cacheStatus,
      },
    }
  );
}

function friendlyProviderError(
  symbol: string,
  status: number
) {
  if (status === 401 || status === 403) {
    return "Finnhub rejected the API key. Check FINNHUB_API_KEY in .env.local.";
  }

  if (status === 429) {
    return `Finnhub's request limit was reached while loading ${symbol}. Please wait briefly and try again.`;
  }

  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    return `Live quote data for ${symbol} is temporarily unavailable. Please try again shortly.`;
  }

  return `Unable to load live quote data for ${symbol}. Finnhub returned status ${status}.`;
}

function toFiniteNumber(
  value: unknown,
  fallback: number
) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : fallback;
}