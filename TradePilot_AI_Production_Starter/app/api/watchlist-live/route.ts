import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

type WatchlistRow = {
  symbol: string;
  created_at: string;
};

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

type SentimentItem = {
  symbol: string;
  sentiment: "Bullish" | "Neutral" | "Bearish";
  reason: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

const sentimentSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string" },
          sentiment: {
            type: "string",
            enum: ["Bullish", "Neutral", "Bearish"],
          },
          reason: { type: "string" },
        },
        required: ["symbol", "sentiment", "reason"],
      },
    },
  },
  required: ["items"],
} as const;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401, headers: noStoreHeaders() }
      );
    }

    const { data, error } = await supabase
      .from("watchlist")
      .select("symbol, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data || []) as WatchlistRow[];

    const symbols = Array.from(
      new Set(
        rows
          .map((row) => normalizeSymbol(row.symbol))
          .filter(Boolean)
      )
    );

    if (symbols.length === 0) {
      return NextResponse.json(
        {
          stocks: [],
          updatedAt: new Date().toISOString(),
        },
        { headers: noStoreHeaders() }
      );
    }

    const origin = new URL(request.url).origin;

    const stocks = (
      await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const response = await fetch(
              `${origin}/api/stock-details?symbol=${encodeURIComponent(
                symbol
              )}`,
              {
                cache: "no-store",
                headers: {
                  "Cache-Control": "no-cache, no-store",
                },
              }
            );

            const result = await response.json();

            if (!response.ok || !result.stock) {
              return null;
            }

            return result.stock as StockQuote;
          } catch {
            return null;
          }
        })
      )
    ).filter(
      (stock): stock is StockQuote => stock !== null
    );

    const fallbackSentiments = stocks.map(
      createFallbackSentiment
    );

    let sentiments = fallbackSentiments;

    if (
      process.env.OPENAI_API_KEY &&
      stocks.length > 0
    ) {
      try {
        const response = await openai.responses.create({
          model: "gpt-5-mini",
          store: false,
          instructions: `
You are Norvexa. Classify the short-term tone of each supplied stock quote using only its current daily price movement.

Rules:
- Do not use outside information.
- Do not predict future prices.
- Bullish means clearly positive daily movement.
- Bearish means clearly negative daily movement.
- Neutral means small or mixed daily movement.
- Keep each reason under 12 words.
`,
          input: JSON.stringify(
            stocks.map((stock) => ({
              symbol: stock.symbol,
              price: stock.price,
              change: stock.change,
              changePercent: stock.changePercent,
              open: stock.open,
              high: stock.high,
              low: stock.low,
              previousClose: stock.previousClose,
            })),
            null,
            2
          ),
          text: {
            format: {
              type: "json_schema",
              name: "watchlist_sentiment",
              description:
                "Short-term educational sentiment labels for watchlist stocks.",
              strict: true,
              schema: sentimentSchema,
            },
          },
        });

        if (response.output_text) {
          const parsed = JSON.parse(response.output_text) as {
            items: SentimentItem[];
          };

          if (Array.isArray(parsed.items)) {
            sentiments = parsed.items;
          }
        }
      } catch (error) {
        console.warn(
          "Watchlist AI sentiment fallback used:",
          error
        );
      }
    }

    const sentimentMap = new Map(
      sentiments.map((item) => [
        item.symbol.toUpperCase(),
        item,
      ])
    );

    return NextResponse.json(
      {
        stocks: stocks.map((stock) => ({
          ...stock,
          sentiment:
            sentimentMap.get(stock.symbol)?.sentiment ??
            createFallbackSentiment(stock).sentiment,
          sentimentReason:
            sentimentMap.get(stock.symbol)?.reason ??
            createFallbackSentiment(stock).reason,
        })),
        updatedAt: new Date().toISOString(),
      },
      { headers: noStoreHeaders() }
    );
  } catch (error) {
    console.error("Watchlist live API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load your watchlist.",
      },
      { status: 500, headers: noStoreHeaders() }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401, headers: noStoreHeaders() }
      );
    }

    const body = await request.json();

    const symbol = normalizeSymbol(
      typeof body.symbol === "string"
        ? body.symbol
        : ""
    );

    if (!/^[A-Z0-9.-]{1,15}$/.test(symbol)) {
      return NextResponse.json(
        { error: "Enter a valid stock symbol." },
        { status: 400, headers: noStoreHeaders() }
      );
    }

    const { error } = await supabase
      .from("watchlist")
      .upsert(
        {
          user_id: user.id,
          symbol,
        },
        {
          onConflict: "user_id,symbol",
          ignoreDuplicates: true,
        }
      );

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(
      { success: true, symbol },
      { status: 201, headers: noStoreHeaders() }
    );
  } catch (error) {
    console.error("Watchlist add error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to add this stock.",
      },
      { status: 500, headers: noStoreHeaders() }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401, headers: noStoreHeaders() }
      );
    }

    const symbol = normalizeSymbol(
      request.nextUrl.searchParams.get("symbol") ?? ""
    );

    if (!symbol) {
      return NextResponse.json(
        { error: "A stock symbol is required." },
        { status: 400, headers: noStoreHeaders() }
      );
    }

    const { error } = await supabase
      .from("watchlist")
      .delete()
      .eq("user_id", user.id)
      .eq("symbol", symbol);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(
      { success: true },
      { headers: noStoreHeaders() }
    );
  } catch (error) {
    console.error("Watchlist delete error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to remove this stock.",
      },
      { status: 500, headers: noStoreHeaders() }
    );
  }
}

function createFallbackSentiment(
  stock: StockQuote
): SentimentItem {
  const percent = Number(stock.changePercent);

  if (percent >= 0.5) {
    return {
      symbol: stock.symbol,
      sentiment: "Bullish",
      reason: "Positive daily price momentum",
    };
  }

  if (percent <= -0.5) {
    return {
      symbol: stock.symbol,
      sentiment: "Bearish",
      reason: "Negative daily price momentum",
    };
  }

  return {
    symbol: stock.symbol,
    sentiment: "Neutral",
    reason: "Daily movement remains limited",
  };
}

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase();
}

function noStoreHeaders() {
  return {
    "Cache-Control":
      "private, no-cache, no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}