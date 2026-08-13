import { NextRequest, NextResponse } from "next/server";

type FinnhubNewsArticle = {
  category?: string;
  datetime?: number;
  headline?: string;
  id?: number;
  image?: string;
  related?: string;
  source?: string;
  summary?: string;
  url?: string;
};

type CachedNews = {
  articles: FinnhubNewsArticle[];
  savedAt: number;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REQUEST_TIMEOUT_MS = 8_000;
const NEWS_CACHE_MS = 5 * 60 * 1000;
const STALE_NEWS_MAX_AGE_MS = 60 * 60 * 1000;

const globalCache = globalThis as typeof globalThis & {
  tradePilotNewsCache?: Map<string, CachedNews>;
};

const newsCache =
  globalCache.tradePilotNewsCache ??
  (globalCache.tradePilotNewsCache = new Map());

export async function GET(request: NextRequest) {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        articles: [],
        warning:
          "FINNHUB_API_KEY is missing from .env.local.",
        temporary: false,
      },
      {
        status: 200,
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
        articles: [],
        warning: "A valid stock symbol is required.",
        temporary: false,
      },
      {
        status: 200,
        headers: noStoreHeaders(),
      }
    );
  }

  const cached = newsCache.get(symbol);

  if (
    cached &&
    Date.now() - cached.savedAt < NEWS_CACHE_MS
  ) {
    return NextResponse.json(
      {
        articles: cached.articles,
        cached: true,
        stale: false,
      },
      {
        status: 200,
        headers: noStoreHeaders(),
      }
    );
  }

  try {
    const toDate = new Date();
    const fromDate = new Date();

    fromDate.setDate(fromDate.getDate() - 7);

    const url = new URL(
      "https://finnhub.io/api/v1/company-news"
    );

    url.searchParams.set("symbol", symbol);
    url.searchParams.set(
      "from",
      formatDate(fromDate)
    );
    url.searchParams.set(
      "to",
      formatDate(toDate)
    );
    url.searchParams.set("token", apiKey);

    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      return temporaryFallback({
        symbol,
        status: response.status,
        cached,
      });
    }

    let rawData: unknown;

    try {
      rawData = await response.json();
    } catch {
      return temporaryFallback({
        symbol,
        status: null,
        cached,
        message:
          "Finnhub returned invalid news data.",
      });
    }

    if (!Array.isArray(rawData)) {
      return temporaryFallback({
        symbol,
        status: null,
        cached,
        message:
          "Finnhub returned an invalid news response.",
      });
    }

    const articles = rawData
      .map(normalizeArticle)
      .filter(
        (
          article
        ): article is FinnhubNewsArticle =>
          article !== null
      )
      .sort(
        (a, b) =>
          Number(b.datetime || 0) -
          Number(a.datetime || 0)
      )
      .slice(0, 20);

    newsCache.set(symbol, {
      articles,
      savedAt: Date.now(),
    });

    return NextResponse.json(
      {
        articles,
        cached: false,
        stale: false,
      },
      {
        status: 200,
        headers: noStoreHeaders(),
      }
    );
  } catch (error) {
    console.warn(
      `Stock news temporarily unavailable for ${symbol}:`,
      error
    );

    return temporaryFallback({
      symbol,
      status: null,
      cached,
    });
  }
}

function temporaryFallback({
  symbol,
  status,
  cached,
  message,
}: {
  symbol: string;
  status: number | null;
  cached?: CachedNews;
  message?: string;
}) {
  if (
    cached &&
    Date.now() - cached.savedAt <
      STALE_NEWS_MAX_AGE_MS
  ) {
    return NextResponse.json(
      {
        articles: cached.articles,
        warning:
          message ||
          providerMessage(symbol, status),
        temporary: true,
        cached: true,
        stale: true,
      },
      {
        status: 200,
        headers: noStoreHeaders(),
      }
    );
  }

  return NextResponse.json(
    {
      articles: [],
      warning:
        message ||
        providerMessage(symbol, status),
      temporary: true,
      cached: false,
      stale: false,
    },
    {
      status: 200,
      headers: noStoreHeaders(),
    }
  );
}

function normalizeArticle(
  value: unknown
): FinnhubNewsArticle | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const article =
    value as FinnhubNewsArticle;

  const headline =
    typeof article.headline === "string"
      ? article.headline.trim()
      : "";

  const url =
    typeof article.url === "string"
      ? article.url.trim()
      : "";

  if (!headline || !url) {
    return null;
  }

  return {
    category:
      typeof article.category === "string"
        ? article.category
        : "",
    datetime:
      Number.isFinite(
        Number(article.datetime)
      )
        ? Number(article.datetime)
        : 0,
    headline,
    id: Number.isFinite(
      Number(article.id)
    )
      ? Number(article.id)
      : Math.abs(
          hashString(
            `${headline}-${url}`
          )
        ),
    image:
      typeof article.image === "string"
        ? article.image
        : "",
    related:
      typeof article.related === "string"
        ? article.related
        : "",
    source:
      typeof article.source === "string"
        ? article.source
        : "News",
    summary:
      typeof article.summary === "string"
        ? article.summary
        : "",
    url,
  };
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

function providerMessage(
  symbol: string,
  status: number | null
) {
  if (status === 429) {
    return `Finnhub's request limit was reached while loading news for ${symbol}.`;
  }

  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    return `News for ${symbol} is temporarily unavailable from Finnhub.`;
  }

  if (status === 401 || status === 403) {
    return "Finnhub rejected the API key or plan access for company news.";
  }

  return `News for ${symbol} is temporarily unavailable.`;
}

function formatDate(date: Date) {
  return date
    .toISOString()
    .slice(0, 10);
}

function hashString(value: string) {
  let hash = 0;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash =
      (hash << 5) -
      hash +
      value.charCodeAt(index);

    hash |= 0;
  }

  return hash;
}

function noStoreHeaders() {
  return {
    "Cache-Control":
      "private, no-cache, no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}