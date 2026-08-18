import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

type PortfolioHolding = {
  symbol: string;
  name?: string;
  shares: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  investedValue: number;
  gainLoss: number;
  gainLossPercent: number;
  todayGainLoss: number;
  todayGainLossPercent: number;
};

type PortfolioSummary = {
  cashBalance: number;
  portfolioValue: number;
  totalAccountValue: number;
  totalInvested: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  todayGainLoss: number;
  todayGainLossPercent: number;
};

type PortfolioAnalytics = {
  holdingsCount: number;
  winningHoldingsCount: number;
  losingHoldingsCount: number;
  flatHoldingsCount: number;
  winRate: number;
  unrealizedGainLoss: number;
  realizedGainLoss: number;
  combinedGainLoss: number;
  cashPercentage: number;
  stockPercentage: number;
  diversificationCount: number;
  bestPerformer?: unknown;
  worstPerformer?: unknown;
  largestPosition?: unknown;
  allocations: unknown[];
};

type PortfolioApiResponse = {
  holdings?: PortfolioHolding[];
  summary?: PortfolioSummary;
  analytics?: PortfolioAnalytics;
  error?: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    outlook: {
      type: "string",
      enum: [
        "Bullish",
        "Moderately Bullish",
        "Neutral",
        "Moderately Bearish",
        "Bearish",
      ],
    },
    score: { type: "number", minimum: 0, maximum: 100 },
    headline: { type: "string" },
    summary: { type: "string" },
    strengths: {
      type: "array",
      items: { type: "string" },
      maxItems: 4,
    },
    risks: {
      type: "array",
      items: { type: "string" },
      maxItems: 4,
    },
    insight: { type: "string" },
    disclaimer: { type: "string" },
  },
  required: [
    "outlook",
    "score",
    "headline",
    "summary",
    "strengths",
    "risks",
    "insight",
    "disclaimer",
  ],
} as const;

export async function GET(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing from .env.local." },
        { status: 500, headers: noStoreHeaders() }
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
        { status: 401, headers: noStoreHeaders() }
      );
    }

    const origin = new URL(request.url).origin;
    const cookie = request.headers.get("cookie") ?? "";

    const portfolioResponse = await fetch(
      `${origin}/api/portfolio?refresh=${Date.now()}`,
      {
        cache: "no-store",
        headers: {
          Cookie: cookie,
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );

    const portfolio =
      (await portfolioResponse.json()) as PortfolioApiResponse;

    if (
      !portfolioResponse.ok ||
      !portfolio.summary ||
      !portfolio.analytics
    ) {
      throw new Error(
        portfolio.error || "Unable to load your portfolio."
      );
    }

    const holdings = Array.isArray(portfolio.holdings)
      ? portfolio.holdings
      : [];

    if (holdings.length === 0) {
      return NextResponse.json(
        {
          analysis: {
            outlook: "Neutral",
            score: 50,
            headline: "Your portfolio is currently all cash",
            summary:
              "There are no open paper-trading positions to evaluate yet.",
            strengths: [
              "Cash provides maximum flexibility for future paper trades.",
              "There is no current exposure to individual-stock price movements.",
            ],
            risks: [
              "There are no live positions to evaluate.",
              "Portfolio performance cannot be assessed until a position is opened.",
            ],
            insight:
              "Use the research tools to compare companies before opening a paper position.",
            disclaimer:
              "This summary is educational and relates only to your paper-trading account.",
          },
          generatedAt: new Date().toISOString(),
        },
        { headers: noStoreHeaders() }
      );
    }

    const response = await openai.responses.create({
      model: "gpt-5-mini",
      store: false,
      instructions: `
You are Norvexa, an educational portfolio-summary assistant for a paper-trading app.

Use only the supplied portfolio data.

Rules:
- Do not invent sectors, correlations, news, fundamentals, or future returns.
- Do not tell the user to buy, sell, or hold.
- Do not provide personalized financial, tax, or legal advice.
- Discuss only visible concentration, allocation, cash level, winners, losers, current gain/loss, daily movement, and number of holdings.
- Keep the answer concise enough for a dashboard card.
- The score reflects visible portfolio balance and current condition, not expected performance.
`,
      input: `
Portfolio summary:
${JSON.stringify(portfolio.summary, null, 2)}

Portfolio analytics:
${JSON.stringify(portfolio.analytics, null, 2)}

Open holdings:
${JSON.stringify(holdings.slice(0, 50), null, 2)}
`,
      text: {
        format: {
          type: "json_schema",
          name: "portfolio_ai_summary",
          description:
            "A concise structured educational portfolio summary.",
          strict: true,
          schema,
        },
      },
    });

    if (!response.output_text) {
      throw new Error("OpenAI returned an empty portfolio summary.");
    }

    const analysis = JSON.parse(response.output_text);

    return NextResponse.json(
      {
        analysis,
        generatedAt: new Date().toISOString(),
      },
      { headers: noStoreHeaders() }
    );
  } catch (error) {
    console.error("Portfolio AI summary error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate the portfolio summary.",
      },
      { status: 500, headers: noStoreHeaders() }
    );
  }
}

function noStoreHeaders() {
  return {
    "Cache-Control":
      "private, no-cache, no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}