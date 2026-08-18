import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

type CopilotMessage = {
  role: "user" | "assistant";
  content: string;
};

type HoldingRow = {
  symbol: string;
  shares: number | string;
  average_cost: number | string;
};

type WatchlistRow = {
  symbol: string;
};

type AccountRow = {
  cash_balance: number | string;
};


type SubscriptionRow = {
  plan: "free" | "premium";
  status: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_MESSAGES = 12;
const MAX_SYMBOLS = 3;

const companyAliases: Record<string, string> = {
  APPLE: "AAPL",
  MICROSOFT: "MSFT",
  NVIDIA: "NVDA",
  AMAZON: "AMZN",
  ALPHABET: "GOOGL",
  GOOGLE: "GOOGL",
  META: "META",
  TESLA: "TSLA",
  AMD: "AMD",
  NETFLIX: "NFLX",
};

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is missing from .env.local.",
        },
        {
          status: 500,
          headers: noStoreHeaders(),
        }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "You must be signed in.",
        },
        {
          status: 401,
          headers: noStoreHeaders(),
        }
      );
    }

    // Premium protection is enforced on the server, not only in the UI.
    // This prevents free accounts from bypassing the Copilot gate by
    // calling /api/copilot directly.
    const {
      data: subscriptionData,
      error: subscriptionError,
    } = await supabase
      .from("premium_subscriptions")
      .select("plan, status")
      .eq("user_id", user.id)
      .maybeSingle<SubscriptionRow>();

    if (subscriptionError) {
      console.error(
        "Copilot subscription verification error:",
        subscriptionError
      );

      return NextResponse.json(
        {
          error: "Unable to verify Premium access.",
        },
        {
          status: 503,
          headers: noStoreHeaders(),
        }
      );
    }

    const premiumActive =
      subscriptionData?.plan === "premium" &&
      subscriptionData.status === "active";

    if (!premiumActive) {
      return NextResponse.json(
        {
          error: "Norvexa Copilot requires Premium.",
          code: "PREMIUM_REQUIRED",
          upgradeUrl: "/premium",
        },
        {
          status: 403,
          headers: noStoreHeaders(),
        }
      );
    }

    let body: {
      messages?: CopilotMessage[];
      pathname?: string;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "The Copilot request is invalid.",
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        }
      );
    }

    const messages = sanitizeMessages(
      body.messages
    );

    if (messages.length === 0) {
      return NextResponse.json(
        {
          error: "Enter a question for Copilot.",
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        }
      );
    }

    const pathname =
      typeof body.pathname === "string"
        ? body.pathname.slice(0, 200)
        : "";

    const [
      accountResult,
      holdingsResult,
      watchlistResult,
    ] = await Promise.all([
      supabase
        .from("accounts")
        .select("cash_balance")
        .eq("user_id", user.id)
        .maybeSingle<AccountRow>(),

      supabase
        .from("portfolio_holdings")
        .select(
          "symbol, shares, average_cost"
        )
        .eq("user_id", user.id),

      supabase
        .from("watchlist")
        .select("symbol")
        .eq("user_id", user.id),
    ]);

    const holdings = (
      (holdingsResult.data || []) as HoldingRow[]
    ).map((holding) => ({
      symbol: holding.symbol.toUpperCase(),
      shares: finiteNumber(holding.shares),
      averageCost: finiteNumber(
        holding.average_cost
      ),
    }));

    const watchlist = (
      (watchlistResult.data || []) as WatchlistRow[]
    ).map((item) =>
      item.symbol.toUpperCase()
    );

    const cashBalance = finiteNumber(
      accountResult.data?.cash_balance
    );

    const conversationText = messages
      .map((message) => message.content)
      .join("\n");

    const symbols = extractSymbols(
      conversationText
    );

    const origin = request.nextUrl.origin;
    const cookie = request.headers.get("cookie") ?? "";

    const [
      portfolioContext,
      marketContext,
      symbolContext,
    ] = await Promise.all([
      fetchJson(
        `${origin}/api/portfolio?refresh=${Date.now()}`,
        cookie
      ),
      fetchJson(
        `${origin}/api/markets?refresh=${Date.now()}`,
        cookie
      ),
      Promise.all(
        symbols.map(async (symbol) => {
          const [quote, fundamentals, news] =
            await Promise.all([
              fetchJson(
                `${origin}/api/stock-details?symbol=${encodeURIComponent(
                  symbol
                )}`,
                cookie
              ),
              fetchJson(
                `${origin}/api/stock-fundamentals?symbol=${encodeURIComponent(
                  symbol
                )}`,
                cookie
              ),
              fetchJson(
                `${origin}/api/stock-news?symbol=${encodeURIComponent(
                  symbol
                )}`,
                cookie
              ),
            ]);

          return {
            symbol,
            quote: quote?.stock ?? null,
            fundamentals:
              fundamentals?.metrics ?? null,
            news: Array.isArray(
              news?.articles
            )
              ? news.articles.slice(0, 4)
              : [],
          };
        })
      ),
    ]);

    const response = await openai.responses.create({
      model: "gpt-5-mini",
      store: false,
      instructions: `
You are Norvexa Copilot, an educational investing assistant embedded throughout a paper-trading application.

Use the supplied application context when it is relevant.

Rules:
- Never invent quotes, portfolio values, company metrics, market events, news, or account information.
- Never claim certainty about future stock prices or returns.
- Do not tell the user to buy, sell, or hold a security.
- Do not provide personalized financial, tax, or legal advice.
- You may explain portfolio concentration, visible performance, market concepts, supplied news, valuation metrics, stock comparisons, and paper-trading activity.
- Call the user's portfolio a paper-trading portfolio.
- If current data is unavailable, say so clearly.
- Use short headings and concise bullet points when helpful.
- Answer the user's actual question directly.
- When discussing securities or portfolio decisions, end with a brief educational disclaimer.
`,
      input: [
        {
          role: "developer",
          content: `
Current application page:
${pathname || "Unknown"}

Signed-in user context:
${JSON.stringify(
  {
    cashBalance,
    holdings,
    watchlist,
  },
  null,
  2
)}

Current portfolio API context:
${JSON.stringify(
  portfolioContext,
  null,
  2
)}

Current markets API context:
${JSON.stringify(
  marketContext,
  null,
  2
)}

Detected stock context:
${JSON.stringify(
  symbolContext,
  null,
  2
)}
`,
        },
        ...messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
    });

    const answer =
      response.output_text?.trim();

    if (!answer) {
      throw new Error(
        "OpenAI returned an empty Copilot response."
      );
    }

    return NextResponse.json(
      {
        answer,
        detectedSymbols: symbols,
        context: {
          holdingsIncluded:
            holdings.length,
          watchlistIncluded:
            watchlist.length,
          page: pathname,
        },
      },
      {
        headers: noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error("Copilot API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to complete the Copilot request.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}

function sanitizeMessages(
  value: unknown
): CopilotMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (
        message
      ): message is CopilotMessage =>
        Boolean(message) &&
        typeof message === "object" &&
        (message.role === "user" ||
          message.role === "assistant") &&
        typeof message.content === "string"
    )
    .map((message) => ({
      role: message.role,
      content: message.content
        .trim()
        .slice(0, 8000),
    }))
    .filter(
      (message) =>
        message.content.length > 0
    )
    .slice(-MAX_MESSAGES);
}

function extractSymbols(text: string) {
  const upper = text.toUpperCase();
  const symbols = new Set<string>();

  for (const [company, symbol] of Object.entries(
    companyAliases
  )) {
    if (
      new RegExp(
        `\\b${escapeRegExp(company)}\\b`
      ).test(upper)
    ) {
      symbols.add(symbol);
    }
  }

  const candidates =
    upper.match(
      /(?:\$|\b)([A-Z]{2,5})(?:\b)/g
    ) ?? [];

  const stopWords = new Set([
    "THE",
    "AND",
    "FOR",
    "WITH",
    "WHAT",
    "WHY",
    "HOW",
    "THIS",
    "THAT",
    "FROM",
    "TODAY",
    "MARKET",
    "STOCK",
    "STOCKS",
    "MY",
    "YOUR",
    "PORTFOLIO",
    "NEWS",
    "RISK",
    "RISKS",
    "COMPARE",
    "EXPLAIN",
    "SHOW",
  ]);

  for (const candidate of candidates) {
    const symbol = candidate
      .replace("$", "")
      .trim();

    if (
      /^[A-Z]{2,5}$/.test(symbol) &&
      !stopWords.has(symbol)
    ) {
      symbols.add(symbol);
    }
  }

  return Array.from(symbols).slice(
    0,
    MAX_SYMBOLS
  );
}

async function fetchJson(
  url: string,
  cookie: string
): Promise<Record<string, any> | null> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Cookie: cookie,
        "Cache-Control":
          "no-cache, no-store",
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

function escapeRegExp(value: string) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function noStoreHeaders() {
  return {
    "Cache-Control":
      "private, no-cache, no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}