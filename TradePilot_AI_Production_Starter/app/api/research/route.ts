import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

type ResearchMessage = {
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

type TransactionRow = {
  symbol: string;
  transaction_type: "buy" | "sell";
  shares: number | string;
  price: number | string;
  total_amount: number | string;
  realized_gain_loss: number | string | null;
  created_at: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_MESSAGES = 14;
const MAX_TICKERS = 3;

const knownCompanyAliases: Record<string, string> = {
  APPLE: "AAPL",
  MICROSOFT: "MSFT",
  NVIDIA: "NVDA",
  TESLA: "TSLA",
  AMAZON: "AMZN",
  GOOGLE: "GOOGL",
  ALPHABET: "GOOGL",
  META: "META",
  FACEBOOK: "META",
  COSTCO: "COST",
  AMD: "AMD",
  NETFLIX: "NFLX",
};

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is missing." },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 }
      );
    }

    let body: {
      messages?: ResearchMessage[];
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "The research request is invalid." },
        { status: 400 }
      );
    }

    const messages = sanitizeMessages(body.messages);

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "At least one research question is required." },
        { status: 400 }
      );
    }

    const latestUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");

    if (!latestUserMessage) {
      return NextResponse.json(
        { error: "A user question is required." },
        { status: 400 }
      );
    }

    const [
      accountResult,
      holdingsResult,
      watchlistResult,
      transactionsResult,
    ] = await Promise.all([
      supabase
        .from("accounts")
        .select("cash_balance")
        .eq("user_id", user.id)
        .maybeSingle<AccountRow>(),

      supabase
        .from("portfolio_holdings")
        .select("symbol, shares, average_cost")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),

      supabase
        .from("watchlist")
        .select("symbol")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),

      supabase
        .from("transactions")
        .select(
          `
            symbol,
            transaction_type,
            shares,
            price,
            total_amount,
            realized_gain_loss,
            created_at
          `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const cashBalance = Number(
      accountResult.data?.cash_balance ?? 0
    );

    const holdings = (
      (holdingsResult.data || []) as HoldingRow[]
    ).map((holding) => ({
      symbol: holding.symbol.toUpperCase(),
      shares: finiteNumber(holding.shares),
      averageCost: finiteNumber(holding.average_cost),
    }));

    const watchlist = (
      (watchlistResult.data || []) as WatchlistRow[]
    ).map((item) => item.symbol.toUpperCase());

    const recentTransactions = (
      (transactionsResult.data || []) as TransactionRow[]
    ).map((transaction) => ({
      symbol: transaction.symbol.toUpperCase(),
      type: transaction.transaction_type,
      shares: finiteNumber(transaction.shares),
      price: finiteNumber(transaction.price),
      totalAmount: finiteNumber(transaction.total_amount),
      realizedGainLoss: finiteNumber(
        transaction.realized_gain_loss ?? 0
      ),
      createdAt: transaction.created_at,
    }));

    const tickers = extractTickers(
      messages.map((message) => message.content).join("\n")
    );

    const origin = new URL(request.url).origin;

    const marketContext = await Promise.all(
      tickers.map(async (symbol) => {
        const [quote, fundamentals, news] =
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
            fetchJson(
              `${origin}/api/stock-news?symbol=${encodeURIComponent(
                symbol
              )}`
            ),
          ]);

        return {
          symbol,
          quote: quote?.stock ?? null,
          fundamentals: fundamentals
            ? {
                metrics: fundamentals.metrics ?? null,
                peers: Array.isArray(fundamentals.peers)
                  ? fundamentals.peers.slice(0, 6)
                  : [],
              }
            : null,
          news: Array.isArray(news?.articles)
            ? news.articles.slice(0, 5).map(
                (article: {
                  headline?: string;
                  summary?: string;
                  source?: string;
                  datetime?: number;
                }) => ({
                  headline: article.headline || "",
                  summary: article.summary || "",
                  source: article.source || "",
                  publishedAt: article.datetime
                    ? new Date(
                        article.datetime * 1000
                      ).toISOString()
                    : null,
                })
              )
            : [],
        };
      })
    );

    const response = await openai.responses.create({
      model: "gpt-5-mini",
      store: false,
      instructions: `
You are Norvexa Research, an educational investing research assistant inside a paper-trading application.

Use the supplied account, portfolio, watchlist, transaction, quote, fundamentals, and news context when relevant.

Rules:
- Never claim certainty about future prices or returns.
- Never invent facts, metrics, news, analyst targets, earnings results, or portfolio data.
- Clearly distinguish supplied current data from general educational explanation.
- Do not tell the user to buy, sell, or hold a security.
- Do not provide personalized financial, legal, or tax advice.
- You may explain strengths, weaknesses, risks, trade-offs, valuation concepts, company comparisons, portfolio concentration, diversification, and research checklists.
- If current data for a requested stock is not supplied, say that current live context was unavailable and answer only at a general educational level.
- When discussing the user's portfolio, call it a paper-trading portfolio.
- Use clear headings and short paragraphs.
- Use concise bullet points when they improve readability.
- End with a brief educational disclaimer only when the answer materially discusses a security or portfolio decision.
`,
      input: [
        {
          role: "developer",
          content: `
Current application context:

User account:
${JSON.stringify(
  {
    cashBalance: Number.isFinite(cashBalance)
      ? cashBalance
      : 0,
    holdings,
    watchlist,
    recentTransactions,
  },
  null,
  2
)}

Live context for detected symbols:
${JSON.stringify(marketContext, null, 2)}
`,
        },
        ...messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
    });

    const answer = response.output_text?.trim();

    if (!answer) {
      throw new Error(
        "OpenAI returned an empty research response."
      );
    }

    return NextResponse.json(
      {
        answer,
        detectedSymbols: tickers,
        context: {
          holdingsIncluded: holdings.length,
          watchlistIncluded: watchlist.length,
          liveSymbolsIncluded: marketContext
            .filter((item) => item.quote)
            .map((item) => item.symbol),
        },
      },
      {
        headers: noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error("Research API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to complete this research request.",
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
): ResearchMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (
        message
      ): message is ResearchMessage =>
        Boolean(message) &&
        typeof message === "object" &&
        (message.role === "user" ||
          message.role === "assistant") &&
        typeof message.content === "string"
    )
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 8_000),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-MAX_MESSAGES);
}

function extractTickers(text: string) {
  const uppercaseText = text.toUpperCase();
  const symbols = new Set<string>();

  for (const [name, symbol] of Object.entries(
    knownCompanyAliases
  )) {
    if (
      new RegExp(`\\b${escapeRegExp(name)}\\b`).test(
        uppercaseText
      )
    ) {
      symbols.add(symbol);
    }
  }

  const explicitTickerMatches =
    uppercaseText.match(
      /(?:\$|\bTICKER[:\s]+)([A-Z]{1,5}(?:\.[A-Z])?)/g
    ) ?? [];

  for (const match of explicitTickerMatches) {
    const symbol = match
      .replace(/^\$/, "")
      .replace(/^TICKER[:\s]+/, "")
      .trim();

    if (isLikelyTicker(symbol)) {
      symbols.add(symbol);
    }
  }

  const standaloneCandidates =
    uppercaseText.match(
      /\b[A-Z]{2,5}(?:\.[A-Z])?\b/g
    ) ?? [];

  for (const candidate of standaloneCandidates) {
    if (isLikelyTicker(candidate)) {
      symbols.add(candidate);
    }
  }

  return Array.from(symbols).slice(
    0,
    MAX_TICKERS
  );
}

function isLikelyTicker(value: string) {
  const stopWords = new Set([
    "THE",
    "AND",
    "FOR",
    "WITH",
    "THIS",
    "THAT",
    "WHAT",
    "WHY",
    "HOW",
    "ARE",
    "YOU",
    "MY",
    "YOUR",
    "COMPARE",
    "EXPLAIN",
    "STOCK",
    "STOCKS",
    "MARKET",
    "PORTFOLIO",
    "RATIO",
    "TODAY",
    "RISK",
    "RISKS",
    "NEWS",
    "ETF",
    "ETFS",
    "CEO",
    "EPS",
    "IPO",
  ]);

  return (
    /^[A-Z]{1,5}(?:\.[A-Z])?$/.test(value) &&
    !stopWords.has(value)
  );
}

async function fetchJson(url: string) {
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

    return await response.json();
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