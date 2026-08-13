import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

type QuoteData = {
  symbol: string;
  name?: string;
  logo?: string;
  price: number;
  change: number;
  changePercent: number;
  industry?: string;
  marketCapitalization?: number | null;
  stale?: boolean;
};

type FundamentalMetrics = {
  peRatio?: number | null;
  eps?: number | null;
  netProfitMargin?: number | null;
  grossMargin?: number | null;
  operatingMargin?: number | null;
  beta?: number | null;
  dividendYield?: number | null;
  marketCapitalization?: number | null;
  priceToBook?: number | null;
  currentRatio?: number | null;
  debtToEquity?: number | null;
  returnOnEquity?: number | null;
  week52High?: number | null;
  week52Low?: number | null;
};

type ScreenerCandidate = {
  symbol: string;
  name: string;
  logo: string;
  industry: string;
  price: number;
  changePercent: number;
  marketCapitalization: number | null;
  peRatio: number | null;
  eps: number | null;
  netProfitMargin: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  beta: number | null;
  dividendYield: number | null;
  priceToBook: number | null;
  currentRatio: number | null;
  debtToEquity: number | null;
  returnOnEquity: number | null;
  week52High: number | null;
  week52Low: number | null;
  stale: boolean;
};

type RankedMatch = {
  symbol: string;
  rank: number;
  score: number;
  reason: string;
  strengths: string[];
  cautions: string[];
};

type AIResult = {
  title: string;
  summary: string;
  matches: RankedMatch[];
  disclaimer: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

const UNIVERSE = [
  "AAPL",
  "MSFT",
  "NVDA",
  "AMZN",
  "GOOGL",
  "META",
  "TSLA",
  "AMD",
  "NFLX",
  "JPM",
  "BAC",
  "V",
  "MA",
  "WMT",
  "COST",
  "HD",
  "NKE",
  "DIS",
  "KO",
  "PEP",
  "MCD",
  "XOM",
  "CVX",
  "UNH",
  "JNJ",
  "PFE",
  "MRK",
  "ABBV",
  "LLY",
  "CRM",
  "ORCL",
  "ADBE",
  "INTC",
  "QCOM",
  "AVGO",
  "IBM",
  "GE",
  "CAT",
  "BA",
  "UBER",
];

const resultSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: {
      type: "string",
    },
    summary: {
      type: "string",
    },
    matches: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: {
            type: "string",
          },
          rank: {
            type: "number",
          },
          score: {
            type: "number",
            minimum: 0,
            maximum: 100,
          },
          reason: {
            type: "string",
          },
          strengths: {
            type: "array",
            maxItems: 4,
            items: {
              type: "string",
            },
          },
          cautions: {
            type: "array",
            maxItems: 4,
            items: {
              type: "string",
            },
          },
        },
        required: [
          "symbol",
          "rank",
          "score",
          "reason",
          "strengths",
          "cautions",
        ],
      },
    },
    disclaimer: {
      type: "string",
    },
  },
  required: [
    "title",
    "summary",
    "matches",
    "disclaimer",
  ],
} as const;

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

    const body = await request.json();

    const query =
      typeof body.query === "string"
        ? body.query.trim().slice(0, 1000)
        : "";

    if (!query) {
      return NextResponse.json(
        {
          error: "Enter a screening request.",
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        }
      );
    }

    const limit = Math.max(
      3,
      Math.min(10, Number(body.limit) || 8)
    );

    const origin = request.nextUrl.origin;

    const candidates = (
      await Promise.all(
        UNIVERSE.map((symbol) =>
          loadCandidate(origin, symbol)
        )
      )
    ).filter(
      (
        candidate
      ): candidate is ScreenerCandidate =>
        candidate !== null
    );

    if (candidates.length === 0) {
      throw new Error(
        "No stock data could be loaded for the screener."
      );
    }

    const response = await openai.responses.create({
      model: "gpt-5-mini",
      store: false,
      instructions: `
You are TradePilot AI, an educational stock screener inside a paper-trading application.

Rank stocks only from the supplied candidate universe and only using supplied metrics.

Rules:
- Never invent financial data, company facts, analyst ratings, sectors, growth rates, or news.
- Do not recommend buying, selling, or holding.
- Do not predict future returns.
- Interpret the user's natural-language screening request.
- If a requested metric is unavailable, do not pretend it exists.
- Select only candidates that reasonably match the request.
- Scores represent match quality to the user's stated criteria, not investment quality.
- Keep reasons concise and metric-based.
- Return no more than ${limit} matches.
`,
      input: `
User screening request:
${query}

Candidate universe:
${JSON.stringify(candidates, null, 2)}
`,
      text: {
        format: {
          type: "json_schema",
          name: "ai_stock_screener",
          description:
            "Ranked educational stock screener results.",
          strict: true,
          schema: resultSchema,
        },
      },
    });

    const outputText = response.output_text?.trim();

    if (!outputText) {
      throw new Error(
        "OpenAI returned an empty screener response."
      );
    }

    const aiResult = JSON.parse(
      outputText
    ) as AIResult;

    const candidateMap = new Map(
      candidates.map((candidate) => [
        candidate.symbol,
        candidate,
      ])
    );

    const matches = aiResult.matches
      .map((match) => {
        const candidate = candidateMap.get(
          match.symbol.toUpperCase()
        );

        if (!candidate) {
          return null;
        }

        return {
          ...match,
          symbol: candidate.symbol,
          score: Math.max(
            0,
            Math.min(100, Number(match.score) || 0)
          ),
          candidate,
        };
      })
      .filter(
        (
          match
        ): match is RankedMatch & {
          candidate: ScreenerCandidate;
        } => match !== null
      )
      .sort((a, b) => a.rank - b.rank)
      .slice(0, limit);

    return NextResponse.json(
      {
        title: aiResult.title,
        summary: aiResult.summary,
        matches,
        disclaimer: aiResult.disclaimer,
        universeSize: candidates.length,
        generatedAt: new Date().toISOString(),
      },
      {
        headers: noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error("AI screener error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to run the stock screener.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}

async function loadCandidate(
  origin: string,
  symbol: string
): Promise<ScreenerCandidate | null> {
  const [quoteResponse, fundamentalsResponse] =
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
    ]);

  if (!quoteResponse?.stock) {
    return null;
  }

  const quote = quoteResponse.stock as QuoteData;

  const metrics =
    (fundamentalsResponse?.metrics ??
      {}) as FundamentalMetrics;

  return {
    symbol,
    name:
      typeof quote.name === "string" &&
      quote.name.trim()
        ? quote.name
        : symbol,
    logo:
      typeof quote.logo === "string"
        ? quote.logo
        : "",
    industry:
      typeof quote.industry === "string"
        ? quote.industry
        : "",
    price: finiteNumber(quote.price),
    changePercent: finiteNumber(
      quote.changePercent
    ),
    marketCapitalization: firstFiniteOrNull(
      quote.marketCapitalization,
      metrics.marketCapitalization
    ),
    peRatio: finiteOrNull(metrics.peRatio),
    eps: finiteOrNull(metrics.eps),
    netProfitMargin: finiteOrNull(
      metrics.netProfitMargin
    ),
    grossMargin: finiteOrNull(
      metrics.grossMargin
    ),
    operatingMargin: finiteOrNull(
      metrics.operatingMargin
    ),
    beta: finiteOrNull(metrics.beta),
    dividendYield: finiteOrNull(
      metrics.dividendYield
    ),
    priceToBook: finiteOrNull(
      metrics.priceToBook
    ),
    currentRatio: finiteOrNull(
      metrics.currentRatio
    ),
    debtToEquity: finiteOrNull(
      metrics.debtToEquity
    ),
    returnOnEquity: finiteOrNull(
      metrics.returnOnEquity
    ),
    week52High: finiteOrNull(
      metrics.week52High
    ),
    week52Low: finiteOrNull(
      metrics.week52Low
    ),
    stale: Boolean(quote.stale),
  };
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

function finiteOrNull(
  value: unknown
): number | null {
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : null;
}

function firstFiniteOrNull(
  first: unknown,
  second: unknown
): number | null {
  const firstNumber = Number(first);

  if (Number.isFinite(firstNumber)) {
    return firstNumber;
  }

  const secondNumber = Number(second);

  return Number.isFinite(secondNumber)
    ? secondNumber
    : null;
}

function noStoreHeaders() {
  return {
    "Cache-Control":
      "private, no-cache, no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}