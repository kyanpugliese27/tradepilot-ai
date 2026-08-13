import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

type StockData = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
};

type NewsArticle = {
  headline: string;
  summary: string;
  source: string;
  datetime: number;
};

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
  allocations?: unknown[];
};

type RequestBody = {
  mode?: "stock" | "portfolio";
  stock?: StockData;
  articles?: NewsArticle[];
  holdings?: PortfolioHolding[];
  summary?: PortfolioSummary;
  analytics?: PortfolioAnalytics;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

const stockAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    sentiment: {
      type: "string",
      enum: ["Bullish", "Neutral", "Bearish"],
    },
    score: {
      type: "number",
      minimum: 0,
      maximum: 100,
    },
    summary: {
      type: "string",
    },
    positiveFactors: {
      type: "array",
      items: {
        type: "string",
      },
    },
    riskFactors: {
      type: "array",
      items: {
        type: "string",
      },
    },
    strategy: {
      type: "string",
    },
    disclaimer: {
      type: "string",
    },
  },
  required: [
    "sentiment",
    "score",
    "summary",
    "positiveFactors",
    "riskFactors",
    "strategy",
    "disclaimer",
  ],
} as const;

const portfolioAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    riskLevel: {
      type: "string",
      enum: ["Low", "Moderate", "High"],
    },
    score: {
      type: "number",
      minimum: 0,
      maximum: 100,
    },
    headline: {
      type: "string",
    },
    summary: {
      type: "string",
    },
    strengths: {
      type: "array",
      items: {
        type: "string",
      },
    },
    risks: {
      type: "array",
      items: {
        type: "string",
      },
    },
    diversificationReview: {
      type: "string",
    },
    cashReview: {
      type: "string",
    },
    concentrationReview: {
      type: "string",
    },
    educationalNextSteps: {
      type: "array",
      items: {
        type: "string",
      },
    },
    disclaimer: {
      type: "string",
    },
  },
  required: [
    "riskLevel",
    "score",
    "headline",
    "summary",
    "strengths",
    "risks",
    "diversificationReview",
    "cashReview",
    "concentrationReview",
    "educationalNextSteps",
    "disclaimer",
  ],
} as const;

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is missing." },
        { status: 500 }
      );
    }

    let body: RequestBody;

    try {
      body = (await request.json()) as RequestBody;
    } catch {
      return NextResponse.json(
        { error: "The analysis request is invalid." },
        { status: 400 }
      );
    }

    const mode =
      body.mode === "portfolio" ? "portfolio" : "stock";

    if (mode === "portfolio") {
      return await createPortfolioAnalysis(body);
    }

    return await createStockAnalysis(body);
  } catch (error) {
    console.error("AI analysis API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate AI analysis.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}

async function createStockAnalysis(body: RequestBody) {
  const stock = body.stock;

  if (!stock?.symbol) {
    return NextResponse.json(
      { error: "Stock data is required." },
      { status: 400 }
    );
  }

  const articles = Array.isArray(body.articles)
    ? body.articles
    : [];

  const newsForAnalysis = articles
    .slice(0, 6)
    .map((article) => ({
      headline: article.headline,
      summary: article.summary,
      source: article.source,
      publishedAt: article.datetime
        ? new Date(
            article.datetime * 1000
          ).toISOString()
        : "Unknown",
    }));

  const response = await openai.responses.create({
    model: "gpt-5-mini",
    store: false,
    instructions: `
You are TradePilot AI, an educational stock-market analysis assistant.

Analyze only the quote and news supplied by the application.

Rules:
- Do not claim certainty.
- Do not invent facts, financial statements, analyst targets, technical indicators, or news.
- Do not give personalized financial advice.
- Do not direct the user to buy, sell, or hold.
- Consider both positive and negative factors.
- Keep the response useful and concise.
- The analysis is educational and relates to a paper-trading application.
`,
    input: `
Analyze this stock using only the supplied information.

Stock quote:
${JSON.stringify(stock, null, 2)}

Recent company news:
${JSON.stringify(newsForAnalysis, null, 2)}
`,
    text: {
      format: {
        type: "json_schema",
        name: "stock_analysis",
        description:
          "A structured educational analysis of one stock.",
        strict: true,
        schema: stockAnalysisSchema,
      },
    },
  });

  const analysis = parseOutput(response.output_text);

  return NextResponse.json(
    {
      mode: "stock",
      symbol: stock.symbol,
      analysis,
    },
    {
      headers: noStoreHeaders(),
    }
  );
}

async function createPortfolioAnalysis(
  body: RequestBody
) {
  const holdings = Array.isArray(body.holdings)
    ? body.holdings
    : [];

  const summary = body.summary;
  const analytics = body.analytics;

  if (!summary || !analytics) {
    return NextResponse.json(
      {
        error:
          "Portfolio summary and analytics are required.",
      },
      { status: 400 }
    );
  }

  if (holdings.length === 0) {
    return NextResponse.json(
      {
        error:
          "Buy at least one stock before analyzing your portfolio.",
      },
      { status: 400 }
    );
  }

  const sanitizedHoldings = holdings
    .slice(0, 50)
    .map((holding) => ({
      symbol: holding.symbol,
      name: holding.name || holding.symbol,
      shares: finiteNumber(holding.shares),
      averageCost: finiteNumber(
        holding.averageCost
      ),
      currentPrice: finiteNumber(
        holding.currentPrice
      ),
      marketValue: finiteNumber(
        holding.marketValue
      ),
      investedValue: finiteNumber(
        holding.investedValue
      ),
      gainLoss: finiteNumber(
        holding.gainLoss
      ),
      gainLossPercent: finiteNumber(
        holding.gainLossPercent
      ),
      todayGainLoss: finiteNumber(
        holding.todayGainLoss
      ),
      todayGainLossPercent: finiteNumber(
        holding.todayGainLossPercent
      ),
    }));

  const response = await openai.responses.create({
    model: "gpt-5-mini",
    store: false,
    instructions: `
You are TradePilot AI, an educational portfolio-analysis assistant for a paper-trading application.

Analyze only the portfolio data supplied by the application.

Rules:
- Do not use outside market information.
- Do not invent sectors, company fundamentals, expected returns, correlations, analyst targets, or personal circumstances.
- Do not give personalized financial advice.
- Do not tell the user to buy, sell, or hold a particular security.
- You may discuss visible concentration, cash allocation, diversification by number of holdings, winners, losers, and current gain/loss.
- A small number of stocks can indicate concentration, but do not assume sector diversification unless sector data is supplied.
- Give practical educational next steps framed as things to review, compare, or learn.
- Keep the language clear for a beginner.
`,
    input: `
Analyze this paper-trading portfolio using only the supplied data.

Portfolio summary:
${JSON.stringify(summary, null, 2)}

Portfolio analytics:
${JSON.stringify(analytics, null, 2)}

Open holdings:
${JSON.stringify(sanitizedHoldings, null, 2)}
`,
    text: {
      format: {
        type: "json_schema",
        name: "portfolio_analysis",
        description:
          "A structured educational analysis of a paper-trading portfolio.",
        strict: true,
        schema: portfolioAnalysisSchema,
      },
    },
  });

  const analysis = parseOutput(response.output_text);

  return NextResponse.json(
    {
      mode: "portfolio",
      analysis,
    },
    {
      headers: noStoreHeaders(),
    }
  );
}

function parseOutput(outputText: string) {
  if (!outputText) {
    throw new Error(
      "OpenAI returned an empty response."
    );
  }

  try {
    return JSON.parse(outputText);
  } catch {
    console.error(
      "Invalid structured AI response:",
      outputText
    );

    throw new Error(
      "OpenAI returned invalid structured data."
    );
  }
}

function finiteNumber(value: unknown) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
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