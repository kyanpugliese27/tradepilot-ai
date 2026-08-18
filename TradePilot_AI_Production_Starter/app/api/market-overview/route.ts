import { NextResponse } from "next/server";

type StockQuote = {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
  stale?: boolean;
};

type FinnhubMarketStatus = {
  exchange?: string;
  holiday?: string | null;
  isOpen?: boolean;
  session?: string;
  timezone?: string;
  t?: number;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MARKET_CACHE_MS = 20_000;

const globalMarketCache = globalThis as typeof globalThis & {
  NorvexaMarketOverviewCache?: {
    data: unknown;
    savedAt: number;
  };
};

export async function GET(request: Request) {
  const cached =
    globalMarketCache.NorvexaMarketOverviewCache;

  if (
    cached &&
    Date.now() - cached.savedAt < MARKET_CACHE_MS
  ) {
    return jsonResponse(cached.data, "HIT");
  }

  try {
    const origin = new URL(request.url).origin;

    const marketItems = [
      {
        symbol: "SPY",
        label: "S&P 500 ETF",
        description: "Large-cap U.S. market proxy",
      },
      {
        symbol: "QQQ",
        label: "Nasdaq-100 ETF",
        description: "Large-cap growth and technology proxy",
      },
      {
        symbol: "DIA",
        label: "Dow ETF",
        description: "Dow Jones Industrial Average proxy",
      },
      {
        symbol: "VXX",
        label: "Volatility ETF",
        description: "Short-term volatility proxy",
      },
    ];

    const quotes = await Promise.all(
      marketItems.map(async (item) => {
        try {
          const response = await fetch(
            `${origin}/api/stock-details?symbol=${encodeURIComponent(
              item.symbol
            )}`,
            {
              cache: "no-store",
              headers: {
                "Cache-Control": "no-cache, no-store",
              },
            }
          );

          const data = await response.json();

          if (!response.ok || !data.stock) {
            return null;
          }

          const quote = data.stock as StockQuote;

          return {
            ...item,
            price: finiteNumber(quote.price),
            change: finiteNumber(quote.change),
            changePercent: finiteNumber(
              quote.changePercent
            ),
            timestamp: finiteNumber(quote.timestamp),
            stale: Boolean(quote.stale),
          };
        } catch {
          return null;
        }
      })
    );

    const marketStatus =
      await loadMarketStatus();

    const data = {
      status: marketStatus,
      markets: quotes.filter(
        (
          quote
        ): quote is NonNullable<typeof quote> =>
          quote !== null
      ),
      updatedAt: new Date().toISOString(),
      note:
        "Market cards use liquid ETFs as practical proxies for major U.S. indexes and volatility.",
    };

    globalMarketCache.NorvexaMarketOverviewCache = {
      data,
      savedAt: Date.now(),
    };

    return jsonResponse(data, "MISS");
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load the market overview.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}

async function loadMarketStatus() {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (apiKey) {
    const url = new URL(
      "https://finnhub.io/api/v1/stock/market-status"
    );

    url.searchParams.set("exchange", "US");
    url.searchParams.set("token", apiKey);

    try {
      const response = await fetchWithTimeout(url);

      if (response.ok) {
        const data =
          (await response.json()) as FinnhubMarketStatus;

        return {
          state: resolveProviderState(data),
          label: resolveProviderLabel(data),
          isOpen: Boolean(data.isOpen),
          holiday: data.holiday || null,
          session: data.session || null,
          timezone:
            data.timezone || "America/New_York",
          source: "provider",
        };
      }
    } catch {
      // Fall through to the schedule-based status.
    }
  }

  return getScheduleBasedMarketStatus();
}

function resolveProviderState(
  status: FinnhubMarketStatus
) {
  if (status.holiday) {
    return "closed";
  }

  if (status.isOpen) {
    return "open";
  }

  const session = String(
    status.session || ""
  ).toLowerCase();

  if (session.includes("pre")) {
    return "pre-market";
  }

  if (
    session.includes("post") ||
    session.includes("after")
  ) {
    return "after-hours";
  }

  return "closed";
}

function resolveProviderLabel(
  status: FinnhubMarketStatus
) {
  if (status.holiday) {
    return `Closed · ${status.holiday}`;
  }

  if (status.isOpen) {
    return "Market Open";
  }

  const state = resolveProviderState(status);

  if (state === "pre-market") {
    return "Pre-Market";
  }

  if (state === "after-hours") {
    return "After Hours";
  }

  return "Market Closed";
}

function getScheduleBasedMarketStatus() {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "America/New_York",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  );

  const parts = formatter.formatToParts(now);

  const weekday =
    parts.find((part) => part.type === "weekday")
      ?.value || "";

  const hour = Number(
    parts.find((part) => part.type === "hour")
      ?.value || 0
  );

  const minute = Number(
    parts.find((part) => part.type === "minute")
      ?.value || 0
  );

  const minutes = hour * 60 + minute;
  const isWeekday = !["Sat", "Sun"].includes(
    weekday
  );

  let state:
    | "open"
    | "closed"
    | "pre-market"
    | "after-hours" = "closed";

  if (isWeekday) {
    if (minutes >= 240 && minutes < 570) {
      state = "pre-market";
    } else if (
      minutes >= 570 &&
      minutes < 960
    ) {
      state = "open";
    } else if (
      minutes >= 960 &&
      minutes < 1200
    ) {
      state = "after-hours";
    }
  }

  const label =
    state === "open"
      ? "Market Open"
      : state === "pre-market"
        ? "Pre-Market"
        : state === "after-hours"
          ? "After Hours"
          : "Market Closed";

  return {
    state,
    label,
    isOpen: state === "open",
    holiday: null,
    session: state,
    timezone: "America/New_York",
    source: "schedule",
  };
}

async function fetchWithTimeout(url: URL) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 5_000);

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

function jsonResponse(
  data: unknown,
  cacheStatus: "HIT" | "MISS"
) {
  return NextResponse.json(data, {
    status: 200,
    headers: {
      ...noStoreHeaders(),
      "X-Norvexa-Market-Cache": cacheStatus,
    },
  });
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