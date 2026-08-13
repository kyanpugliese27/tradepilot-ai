import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

type StockResponse = {
  stock?: {
    symbol: string;
    name?: string;
    price: number;
    changePercent: number;
    high?: number;
    low?: number;
    previousClose?: number;
  };
};

type FundamentalsResponse = {
  metrics?: {
    peRatio?: number | null;
    eps?: number | null;
    netProfitMargin?: number | null;
    grossMargin?: number | null;
    operatingMargin?: number | null;
    beta?: number | null;
    dividendYield?: number | null;
    priceToBook?: number | null;
    currentRatio?: number | null;
    debtToEquity?: number | null;
    returnOnEquity?: number | null;
    week52High?: number | null;
    week52Low?: number | null;
  };
};

type AnalystResponse = {
  consensus?: string;
  weightedScore?: number | null;
  priceTarget?: {
    targetMean?: number | null;
    impliedUpsidePercent?: number | null;
    numberAnalysts?: number | null;
  } | null;
};

type ValuationResponse = {
  classification?: string;
  scores?: {
    overall?: number;
    valuation?: number;
    profitability?: number;
    balanceSheet?: number;
    risk?: number;
  };
};

type OwnershipResponse = {
  summary?: {
    buyTransactions?: number;
    sellTransactions?: number;
    netShares?: number;
    netInstitutionalChange?: number;
    netFundChange?: number;
  };
};

type NewsResponse = {
  articles?: Array<{
    headline?: string;
    summary?: string;
    source?: string;
    datetime?: number;
  }>;
};

type AIResearchExplanation = {
  headline: string;
  overview: string;
  bullCase: string[];
  bearCase: string[];
  catalysts: string[];
  risks: string[];
  confidenceExplanation: string;
  conclusion: string;
  disclaimer: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

const aiSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: {
      type: "string",
    },
    overview: {
      type: "string",
    },
    bullCase: {
      type: "array",
      maxItems: 5,
      items: {
        type: "string",
      },
    },
    bearCase: {
      type: "array",
      maxItems: 5,
      items: {
        type: "string",
      },
    },
    catalysts: {
      type: "array",
      maxItems: 5,
      items: {
        type: "string",
      },
    },
    risks: {
      type: "array",
      maxItems: 5,
      items: {
        type: "string",
      },
    },
    confidenceExplanation: {
      type: "string",
    },
    conclusion: {
      type: "string",
    },
    disclaimer: {
      type: "string",
    },
  },
  required: [
    "headline",
    "overview",
    "bullCase",
    "bearCase",
    "catalysts",
    "risks",
    "confidenceExplanation",
    "conclusion",
    "disclaimer",
  ],
} as const;

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams
      .get("symbol")
      ?.trim()
      .toUpperCase();

    if (!symbol || !/^[A-Z0-9.-]{1,15}$/.test(symbol)) {
      return NextResponse.json(
        {
          error:
            "A valid stock symbol is required.",
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        }
      );
    }

    const origin = request.nextUrl.origin;

    const [
      stockData,
      fundamentalsData,
      analystData,
      valuationData,
      ownershipData,
      newsData,
    ] = await Promise.all([
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
        `${origin}/api/stock-analyst-center?symbol=${encodeURIComponent(
          symbol
        )}`
      ),
      fetchJson(
        `${origin}/api/stock-valuation?symbol=${encodeURIComponent(
          symbol
        )}`
      ),
      fetchJson(
        `${origin}/api/stock-ownership?symbol=${encodeURIComponent(
          symbol
        )}`
      ),
      fetchJson(
        `${origin}/api/stock-news?symbol=${encodeURIComponent(
          symbol
        )}`
      ),
    ]);

    const stock =
      (stockData as StockResponse | null)?.stock ??
      null;

    if (!stock) {
      return NextResponse.json(
        {
          error: `Unable to load ${symbol}.`,
        },
        {
          status: 404,
          headers: noStoreHeaders(),
        }
      );
    }

    const metrics =
      ((fundamentalsData as FundamentalsResponse | null)
        ?.metrics ?? {}) as NonNullable<
        FundamentalsResponse["metrics"]
      >;

    const analyst =
      (analystData as AnalystResponse | null) ??
      null;

    const valuation =
      (valuationData as ValuationResponse | null) ??
      null;

    const ownership =
      (ownershipData as OwnershipResponse | null) ??
      null;

    const news =
      (newsData as NewsResponse | null)
        ?.articles ?? [];

    const momentumScore =
      calculateMomentumScore({
        changePercent: finiteNumber(
          stock.changePercent
        ),
        currentPrice: finiteNumber(
          stock.price
        ),
        week52High: finiteOrNull(
          metrics.week52High
        ),
        week52Low: finiteOrNull(
          metrics.week52Low
        ),
      });

    const financialHealthScore =
      calculateFinancialHealthScore({
        currentRatio: finiteOrNull(
          metrics.currentRatio
        ),
        debtToEquity: finiteOrNull(
          metrics.debtToEquity
        ),
        returnOnEquity: finiteOrNull(
          metrics.returnOnEquity
        ),
        netMargin: finiteOrNull(
          metrics.netProfitMargin
        ),
        operatingMargin: finiteOrNull(
          metrics.operatingMargin
        ),
      });

    const analystScore =
      calculateAnalystScore({
        weightedScore:
          analyst?.weightedScore ?? null,
        impliedUpside:
          analyst?.priceTarget
            ?.impliedUpsidePercent ?? null,
      });

    const ownershipScore =
      calculateOwnershipScore(
        ownership?.summary
      );

    const newsCoverageScore =
      calculateNewsCoverageScore(news);

    const valuationScore = clampScore(
      valuation?.scores?.overall ?? 50
    );

    const riskScore = calculateRiskScore({
      beta: finiteOrNull(metrics.beta),
      debtToEquity: finiteOrNull(
        metrics.debtToEquity
      ),
      valuationRisk:
        valuation?.scores?.risk ?? null,
    });

    const overallScore = clampScore(
      valuationScore * 0.24 +
        financialHealthScore * 0.24 +
        momentumScore * 0.16 +
        analystScore * 0.16 +
        ownershipScore * 0.1 +
        newsCoverageScore * 0.1
    );

    const confidenceScore =
      calculateConfidenceScore({
        metrics,
        analyst,
        valuation,
        ownership,
        newsCount: news.length,
      });

    const rating =
      scoreToResearchRating(overallScore);

    const payload = {
      symbol,
      companyName: stock.name || symbol,
      currentPrice: finiteNumber(stock.price),
      rating,
      overallScore,
      confidenceScore,
      componentScores: {
        valuation: valuationScore,
        financialHealth:
          financialHealthScore,
        momentum: momentumScore,
        analystConsensus: analystScore,
        ownership: ownershipScore,
        newsCoverage: newsCoverageScore,
        risk: riskScore,
      },
      referenceData: {
        analystConsensus:
          analyst?.consensus ?? "Unavailable",
        analystMeanTarget:
          analyst?.priceTarget?.targetMean ??
          null,
        analystImpliedUpsidePercent:
          analyst?.priceTarget
            ?.impliedUpsidePercent ?? null,
        analystCount:
          analyst?.priceTarget
            ?.numberAnalysts ?? null,
        valuationClassification:
          valuation?.classification ??
          "Unavailable",
        dailyChangePercent:
          finiteNumber(stock.changePercent),
        recentNewsCount: news.length,
        insiderNetShares:
          ownership?.summary?.netShares ??
          null,
      },
      availableNews: news.slice(0, 6),
      methodology: {
        label:
          "Educational AI research score",
        note:
          "The score summarizes visible valuation, profitability, balance-sheet, momentum, analyst, ownership, and news data. It is not a personalized recommendation or prediction.",
      },
    };

    let aiExplanation:
      | AIResearchExplanation
      | null = null;

    if (process.env.OPENAI_API_KEY) {
      try {
        const response =
          await openai.responses.create({
            model: "gpt-5-mini",
            store: false,
            instructions: `
You are TradePilot AI, an educational stock-research assistant.

Use only the supplied application data.

Rules:
- Never invent financial metrics, company facts, catalysts, risks, news, guidance, forecasts, or analyst opinions.
- Do not tell the user to buy, sell, or hold.
- Do not predict future prices or returns.
- Describe the rating as a research signal, not an investment recommendation.
- Clearly distinguish data-backed positives from missing information.
- If news is missing, do not infer news sentiment.
- Keep the response concise enough for a stock-page dashboard.
`,
            input: JSON.stringify(
              payload,
              null,
              2
            ),
            text: {
              format: {
                type: "json_schema",
                name: "ai_research_rating",
                description:
                  "A structured educational stock research explanation.",
                strict: true,
                schema: aiSchema,
              },
            },
          });

        if (response.output_text) {
          aiExplanation = JSON.parse(
            response.output_text
          ) as AIResearchExplanation;
        }
      } catch (error) {
        console.warn(
          "AI Research Rating explanation unavailable:",
          error
        );
      }
    }

    return NextResponse.json(
      {
        ...payload,
        aiExplanation,
        generatedAt:
          new Date().toISOString(),
      },
      {
        headers: noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "AI Research Rating API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load the AI research rating.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}

async function fetchJson(
  url: string
): Promise<Record<string, any> | null> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
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

function calculateMomentumScore({
  changePercent,
  currentPrice,
  week52High,
  week52Low,
}: {
  changePercent: number;
  currentPrice: number;
  week52High: number | null;
  week52Low: number | null;
}) {
  const parts = [
    clampScore(50 + changePercent * 6),
  ];

  if (
    week52High !== null &&
    week52Low !== null &&
    week52High > week52Low &&
    currentPrice > 0
  ) {
    parts.push(
      clampScore(
        ((currentPrice - week52Low) /
          (week52High - week52Low)) *
          100
      )
    );
  }

  return average(parts);
}

function calculateFinancialHealthScore({
  currentRatio,
  debtToEquity,
  returnOnEquity,
  netMargin,
  operatingMargin,
}: {
  currentRatio: number | null;
  debtToEquity: number | null;
  returnOnEquity: number | null;
  netMargin: number | null;
  operatingMargin: number | null;
}) {
  const parts: number[] = [];

  if (currentRatio !== null) {
    if (currentRatio >= 2) parts.push(90);
    else if (currentRatio >= 1.5)
      parts.push(78);
    else if (currentRatio >= 1)
      parts.push(60);
    else parts.push(35);
  }

  if (debtToEquity !== null) {
    if (debtToEquity <= 0.5)
      parts.push(90);
    else if (debtToEquity <= 1)
      parts.push(75);
    else if (debtToEquity <= 2)
      parts.push(55);
    else parts.push(30);
  }

  if (returnOnEquity !== null) {
    parts.push(
      clampScore(50 + returnOnEquity)
    );
  }

  if (netMargin !== null) {
    parts.push(
      clampScore(50 + netMargin * 1.5)
    );
  }

  if (operatingMargin !== null) {
    parts.push(
      clampScore(
        50 + operatingMargin * 1.5
      )
    );
  }

  return parts.length > 0
    ? average(parts)
    : 50;
}

function calculateAnalystScore({
  weightedScore,
  impliedUpside,
}: {
  weightedScore: number | null;
  impliedUpside: number | null;
}) {
  const parts: number[] = [];

  if (weightedScore !== null) {
    parts.push(
      clampScore(
        ((weightedScore - 1) / 4) *
          100
      )
    );
  }

  if (impliedUpside !== null) {
    parts.push(
      clampScore(
        50 + impliedUpside * 1.5
      )
    );
  }

  return parts.length > 0
    ? average(parts)
    : 50;
}

function calculateOwnershipScore(
  summary:
    | OwnershipResponse["summary"]
    | undefined
) {
  if (!summary) {
    return 50;
  }

  const netShares = finiteNumber(
    summary.netShares
  );

  const buyTransactions =
    finiteNumber(
      summary.buyTransactions
    );

  const sellTransactions =
    finiteNumber(
      summary.sellTransactions
    );

  let score = 50;

  if (netShares > 0) score += 15;
  if (netShares < 0) score -= 15;

  if (buyTransactions > sellTransactions) {
    score += 10;
  } else if (
    sellTransactions > buyTransactions
  ) {
    score -= 10;
  }

  return clampScore(score);
}

function calculateNewsCoverageScore(
  articles: NewsResponse["articles"]
) {
  if (!articles || articles.length === 0) {
    return 50;
  }

  return clampScore(
    50 + Math.min(articles.length, 10) * 3
  );
}

function calculateRiskScore({
  beta,
  debtToEquity,
  valuationRisk,
}: {
  beta: number | null;
  debtToEquity: number | null;
  valuationRisk: number | null;
}) {
  const parts: number[] = [];

  if (beta !== null) {
    parts.push(
      clampScore(
        50 + Math.max(0, beta - 1) * 35
      )
    );
  }

  if (debtToEquity !== null) {
    parts.push(
      clampScore(debtToEquity * 30)
    );
  }

  if (valuationRisk !== null) {
    parts.push(
      clampScore(valuationRisk)
    );
  }

  return parts.length > 0
    ? average(parts)
    : 50;
}

function calculateConfidenceScore({
  metrics,
  analyst,
  valuation,
  ownership,
  newsCount,
}: {
  metrics: NonNullable<
    FundamentalsResponse["metrics"]
  >;
  analyst: AnalystResponse | null;
  valuation: ValuationResponse | null;
  ownership: OwnershipResponse | null;
  newsCount: number;
}) {
  const checks = [
    metrics.peRatio,
    metrics.netProfitMargin,
    metrics.currentRatio,
    metrics.debtToEquity,
    metrics.returnOnEquity,
    metrics.week52High,
    metrics.week52Low,
    analyst?.weightedScore,
    analyst?.priceTarget
      ?.impliedUpsidePercent,
    valuation?.scores?.overall,
    ownership?.summary?.netShares,
    newsCount > 0 ? newsCount : null,
  ];

  const available = checks.filter(
    (value) =>
      value !== null &&
      value !== undefined &&
      Number.isFinite(Number(value))
  ).length;

  return clampScore(
    35 + (available / checks.length) * 65
  );
}

function scoreToResearchRating(score: number) {
  if (score >= 75) {
    return "Strong Positive";
  }

  if (score >= 62) {
    return "Positive";
  }

  if (score >= 45) {
    return "Neutral";
  }

  if (score >= 32) {
    return "Cautious";
  }

  return "Strong Caution";
}

function average(values: number[]) {
  if (values.length === 0) {
    return 50;
  }

  return clampScore(
    values.reduce(
      (sum, value) => sum + value,
      0
    ) / values.length
  );
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

function clampScore(value: number) {
  return Math.max(
    0,
    Math.min(100, Math.round(value))
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