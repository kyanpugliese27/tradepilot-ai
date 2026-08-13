import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

type Holding = {
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
  allocations?: Array<{
    symbol: string;
    name?: string;
    marketValue: number;
    allocationPercent: number;
    stockOnlyAllocationPercent?: number;
  }>;
};

type PortfolioResponse = {
  holdings?: Holding[];
  summary?: PortfolioSummary;
  analytics?: PortfolioAnalytics;
  error?: string;
};

type SectorExposure = {
  sector: string;
  marketValue: number;
  percentage: number;
  symbols: string[];
};

type BenchmarkComparison = {
  symbol: string;
  price: number;
  changePercent: number;
  portfolioTodayPercent: number;
  differencePercent: number;
};

type AIAnalytics = {
  headline: string;
  overview: string;
  strengths: string[];
  risks: string[];
  concentrationComment: string;
  diversificationComment: string;
  benchmarkComment: string;
  educationalInsight: string;
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
    headline: { type: "string" },
    overview: { type: "string" },
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
    concentrationComment: { type: "string" },
    diversificationComment: { type: "string" },
    benchmarkComment: { type: "string" },
    educationalInsight: { type: "string" },
    disclaimer: { type: "string" },
  },
  required: [
    "headline",
    "overview",
    "strengths",
    "risks",
    "concentrationComment",
    "diversificationComment",
    "benchmarkComment",
    "educationalInsight",
    "disclaimer",
  ],
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

    const origin = request.nextUrl.origin;
    const cookie = request.headers.get("cookie") ?? "";

    const portfolioResponse = await fetch(
      `${origin}/api/portfolio?refresh=${Date.now()}`,
      {
        cache: "no-store",
        headers: {
          Cookie: cookie,
          "Cache-Control": "no-cache, no-store",
        },
      }
    );

    const portfolio =
      (await portfolioResponse.json()) as PortfolioResponse;

    if (
      !portfolioResponse.ok ||
      !portfolio.summary ||
      !portfolio.analytics
    ) {
      throw new Error(
        portfolio.error || "Unable to load portfolio analytics."
      );
    }

    const holdings = Array.isArray(portfolio.holdings)
      ? portfolio.holdings
      : [];

    const sectorExposure = await buildSectorExposure(
      origin,
      holdings
    );

    const benchmark = await loadBenchmark(
      origin,
      portfolio.summary.todayGainLossPercent
    );

    const concentrationScore = calculateConcentrationScore(
      holdings
    );

    const diversificationScore =
      calculateDiversificationScore(
        holdings,
        sectorExposure
      );

    const riskScore = calculateRiskScore({
      holdings,
      summary: portfolio.summary,
      sectorExposure,
      concentrationScore,
    });

    const healthScore = Math.round(
      diversificationScore * 0.35 +
        concentrationScore * 0.25 +
        (100 - riskScore) * 0.25 +
        calculatePerformanceScore(
          portfolio.summary.totalGainLossPercent
        ) *
          0.15
    );

    const largestHolding = [...holdings].sort(
      (a, b) => b.marketValue - a.marketValue
    )[0] ?? null;

    const sortedByPerformance = [...holdings].sort(
      (a, b) => b.gainLossPercent - a.gainLossPercent
    );

    const bestHolding =
      sortedByPerformance[0] ?? null;

    const worstHolding =
      sortedByPerformance.length > 0
        ? sortedByPerformance[sortedByPerformance.length - 1]
        : null;

    const analyticsPayload = {
      summary: portfolio.summary,
      analytics: portfolio.analytics,
      holdings,
      sectorExposure,
      scores: {
        healthScore: clampScore(healthScore),
        diversificationScore:
          clampScore(diversificationScore),
        concentrationScore:
          clampScore(concentrationScore),
        riskScore: clampScore(riskScore),
      },
      highlights: {
        largestHolding,
        bestHolding,
        worstHolding,
      },
      benchmark,
    };

    let aiAnalysis: AIAnalytics | null = null;

    if (
      process.env.OPENAI_API_KEY &&
      holdings.length > 0
    ) {
      try {
        const response = await openai.responses.create({
          model: "gpt-5-mini",
          store: false,
          instructions: `
You are TradePilot AI, an educational portfolio analytics assistant for a paper-trading application.

Use only the supplied analytics.

Rules:
- Do not invent sectors, correlations, news, returns, or company facts.
- Do not recommend buying, selling, or holding.
- Do not provide personalized financial, tax, or legal advice.
- Clearly identify concentration, cash allocation, winner/loser count, visible sector exposure, and benchmark differences.
- Keep the response concise and suitable for an analytics dashboard.
- Scores describe the visible paper portfolio only.
`,
          input: JSON.stringify(
            analyticsPayload,
            null,
            2
          ),
          text: {
            format: {
              type: "json_schema",
              name: "portfolio_analytics_summary",
              description:
                "A structured educational portfolio analytics summary.",
              strict: true,
              schema: aiSchema,
            },
          },
        });

        if (response.output_text) {
          aiAnalysis = JSON.parse(
            response.output_text
          ) as AIAnalytics;
        }
      } catch (error) {
        console.warn(
          "Portfolio analytics AI unavailable:",
          error
        );
      }
    }

    return NextResponse.json(
      {
        ...analyticsPayload,
        aiAnalysis,
        generatedAt: new Date().toISOString(),
      },
      { headers: noStoreHeaders() }
    );
  } catch (error) {
    console.error(
      "Portfolio analytics API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load portfolio analytics.",
      },
      { status: 500, headers: noStoreHeaders() }
    );
  }
}

async function buildSectorExposure(
  origin: string,
  holdings: Holding[]
): Promise<SectorExposure[]> {
  const enriched = await Promise.all(
    holdings.map(async (holding) => {
      const data = await fetchJson(
        `${origin}/api/stock-fundamentals?symbol=${encodeURIComponent(
          holding.symbol
        )}`
      );

      const sector =
        typeof data?.profile?.finnhubIndustry === "string"
          ? data.profile.finnhubIndustry
          : typeof data?.industry === "string"
            ? data.industry
            : "Unclassified";

      return {
        symbol: holding.symbol,
        sector,
        marketValue: finiteNumber(
          holding.marketValue
        ),
      };
    })
  );

  const total = enriched.reduce(
    (sum, item) => sum + item.marketValue,
    0
  );

  const map = new Map<
    string,
    {
      marketValue: number;
      symbols: string[];
    }
  >();

  for (const item of enriched) {
    const current = map.get(item.sector) ?? {
      marketValue: 0,
      symbols: [],
    };

    current.marketValue += item.marketValue;
    current.symbols.push(item.symbol);

    map.set(item.sector, current);
  }

  return Array.from(map.entries())
    .map(([sector, value]) => ({
      sector,
      marketValue: value.marketValue,
      percentage:
        total > 0
          ? (value.marketValue / total) * 100
          : 0,
      symbols: value.symbols,
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

async function loadBenchmark(
  origin: string,
  portfolioTodayPercent: number
): Promise<BenchmarkComparison | null> {
  const data = await fetchJson(
    `${origin}/api/stock-details?symbol=SPY`
  );

  if (!data?.stock) {
    return null;
  }

  const price = finiteNumber(data.stock.price);
  const changePercent = finiteNumber(
    data.stock.changePercent
  );

  return {
    symbol: "SPY",
    price,
    changePercent,
    portfolioTodayPercent:
      finiteNumber(portfolioTodayPercent),
    differencePercent:
      finiteNumber(portfolioTodayPercent) -
      changePercent,
  };
}

function calculateConcentrationScore(
  holdings: Holding[]
) {
  if (holdings.length === 0) {
    return 100;
  }

  const total = holdings.reduce(
    (sum, holding) => sum + holding.marketValue,
    0
  );

  if (total <= 0) {
    return 100;
  }

  const largestWeight = Math.max(
    ...holdings.map(
      (holding) =>
        (holding.marketValue / total) * 100
    )
  );

  return 100 - Math.min(100, largestWeight);
}

function calculateDiversificationScore(
  holdings: Holding[],
  sectors: SectorExposure[]
) {
  if (holdings.length === 0) {
    return 0;
  }

  const holdingScore = Math.min(
    60,
    holdings.length * 10
  );

  const sectorScore = Math.min(
    40,
    sectors.filter(
      (sector) =>
        sector.sector !== "Unclassified"
    ).length * 10
  );

  return holdingScore + sectorScore;
}

function calculateRiskScore({
  holdings,
  summary,
  sectorExposure,
  concentrationScore,
}: {
  holdings: Holding[];
  summary: PortfolioSummary;
  sectorExposure: SectorExposure[];
  concentrationScore: number;
}) {
  if (holdings.length === 0) {
    return 0;
  }

  const concentrationRisk =
    100 - concentrationScore;

  const negativePositions =
    holdings.filter(
      (holding) => holding.gainLoss < 0
    ).length;

  const lossRisk =
    holdings.length > 0
      ? (negativePositions / holdings.length) *
        40
      : 0;

  const topSector =
    sectorExposure[0]?.percentage ?? 0;

  const sectorRisk = Math.min(
    30,
    Math.max(0, topSector - 40)
  );

  const lowCashRisk =
    summary.cashBalance <= 0 ? 10 : 0;

  return Math.min(
    100,
    concentrationRisk * 0.45 +
      lossRisk +
      sectorRisk +
      lowCashRisk
  );
}

function calculatePerformanceScore(
  gainLossPercent: number
) {
  const normalized =
    50 + finiteNumber(gainLossPercent) * 4;

  return clampScore(normalized);
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