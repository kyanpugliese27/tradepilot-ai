import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

type StockResponse = {
  stock?: {
    symbol: string;
    name?: string;
    price: number;
    marketCapitalization?: number | null;
  };
  error?: string;
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
    targetHigh?: number | null;
    targetLow?: number | null;
    targetMean?: number | null;
    targetMedian?: number | null;
    impliedUpsidePercent?: number | null;
    numberAnalysts?: number | null;
  } | null;
};

type AIExplanation = {
  headline: string;
  overview: string;
  valuationSignals: string[];
  profitabilitySignals: string[];
  balanceSheetSignals: string[];
  cautions: string[];
  educationalConclusion: string;
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
    valuationSignals: {
      type: "array",
      items: { type: "string" },
      maxItems: 5,
    },
    profitabilitySignals: {
      type: "array",
      items: { type: "string" },
      maxItems: 5,
    },
    balanceSheetSignals: {
      type: "array",
      items: { type: "string" },
      maxItems: 5,
    },
    cautions: {
      type: "array",
      items: { type: "string" },
      maxItems: 5,
    },
    educationalConclusion: {
      type: "string",
    },
    disclaimer: {
      type: "string",
    },
  },
  required: [
    "headline",
    "overview",
    "valuationSignals",
    "profitabilitySignals",
    "balanceSheetSignals",
    "cautions",
    "educationalConclusion",
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
        { error: "A valid stock symbol is required." },
        { status: 400, headers: noStoreHeaders() }
      );
    }

    const origin = request.nextUrl.origin;

    const [stockData, fundamentalsData, analystData] =
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
          `${origin}/api/stock-analyst-center?symbol=${encodeURIComponent(
            symbol
          )}`
        ),
      ]);

    const stock =
      (stockData as StockResponse | null)?.stock ?? null;

    if (!stock) {
      return NextResponse.json(
        {
          error:
            (stockData as StockResponse | null)?.error ||
            `Unable to load ${symbol}.`,
        },
        { status: 404, headers: noStoreHeaders() }
      );
    }

    const metrics =
      ((fundamentalsData as FundamentalsResponse | null)
        ?.metrics ?? {}) as NonNullable<
        FundamentalsResponse["metrics"]
      >;

    const analyst =
      (analystData as AnalystResponse | null) ?? null;

    const currentPrice = finiteNumber(stock.price);

    const peRatio = finiteOrNull(metrics.peRatio);
    const priceToBook = finiteOrNull(
      metrics.priceToBook
    );
    const netMargin = finiteOrNull(
      metrics.netProfitMargin
    );
    const grossMargin = finiteOrNull(
      metrics.grossMargin
    );
    const operatingMargin = finiteOrNull(
      metrics.operatingMargin
    );
    const currentRatio = finiteOrNull(
      metrics.currentRatio
    );
    const debtToEquity = finiteOrNull(
      metrics.debtToEquity
    );
    const returnOnEquity = finiteOrNull(
      metrics.returnOnEquity
    );
    const dividendYield = finiteOrNull(
      metrics.dividendYield
    );
    const beta = finiteOrNull(metrics.beta);
    const week52High = finiteOrNull(
      metrics.week52High
    );
    const week52Low = finiteOrNull(
      metrics.week52Low
    );

    const valuationScore = calculateValuationScore({
      peRatio,
      priceToBook,
      dividendYield,
      analystUpside:
        analyst?.priceTarget?.impliedUpsidePercent ??
        null,
    });

    const profitabilityScore =
      calculateProfitabilityScore({
        netMargin,
        grossMargin,
        operatingMargin,
        returnOnEquity,
      });

    const balanceSheetScore =
      calculateBalanceSheetScore({
        currentRatio,
        debtToEquity,
      });

    const riskScore = calculateRiskScore({
      beta,
      debtToEquity,
      currentRatio,
    });

    const overallScore = clampScore(
      valuationScore * 0.4 +
        profitabilityScore * 0.3 +
        balanceSheetScore * 0.2 +
        (100 - riskScore) * 0.1
    );

    const classification =
      scoreToClassification(overallScore);

    const analystTarget =
      analyst?.priceTarget?.targetMean ?? null;

    const analystUpside =
      analyst?.priceTarget?.impliedUpsidePercent ??
      null;

    const referenceRange =
      analyst?.priceTarget
        ? {
            low:
              analyst.priceTarget.targetLow ?? null,
            mean:
              analyst.priceTarget.targetMean ?? null,
            median:
              analyst.priceTarget.targetMedian ?? null,
            high:
              analyst.priceTarget.targetHigh ?? null,
            analystCount:
              analyst.priceTarget.numberAnalysts ?? null,
            impliedUpsidePercent: analystUpside,
          }
        : null;

    const payload = {
      symbol,
      companyName: stock.name || symbol,
      currentPrice,
      classification,
      scores: {
        overall: overallScore,
        valuation: valuationScore,
        profitability: profitabilityScore,
        balanceSheet: balanceSheetScore,
        risk: riskScore,
      },
      metrics: {
        peRatio,
        priceToBook,
        netMargin,
        grossMargin,
        operatingMargin,
        currentRatio,
        debtToEquity,
        returnOnEquity,
        dividendYield,
        beta,
        week52High,
        week52Low,
      },
      analystReference: {
        consensus: analyst?.consensus ?? "Unavailable",
        weightedScore:
          analyst?.weightedScore ?? null,
        meanTarget: analystTarget,
        impliedUpsidePercent: analystUpside,
        range: referenceRange,
      },
      methodology: {
        label:
          "Educational multi-factor valuation score",
        note:
          "This score combines visible valuation, profitability, balance-sheet, risk, and analyst-reference data. It is not a DCF or intrinsic-value calculation.",
      },
    };

    let aiExplanation: AIExplanation | null = null;

    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await openai.responses.create({
          model: "gpt-5-mini",
          store: false,
          instructions: `
You are Norvexa, an educational valuation explainer.

Use only the supplied data.

Rules:
- Never invent revenue growth, earnings growth, cash flow, guidance, analyst opinions, or company facts.
- Do not call the score intrinsic value or a DCF.
- Do not predict future returns.
- Do not tell the user to buy, sell, or hold.
- Explain unavailable metrics clearly.
- Explain that analyst targets are opinions, not fair value.
- Keep the answer concise and suitable for a stock-page card.
`,
          input: JSON.stringify(payload, null, 2),
          text: {
            format: {
              type: "json_schema",
              name: "valuation_center_explanation",
              description:
                "A structured educational explanation of visible valuation signals.",
              strict: true,
              schema: aiSchema,
            },
          },
        });

        if (response.output_text) {
          aiExplanation = JSON.parse(
            response.output_text
          ) as AIExplanation;
        }
      } catch (error) {
        console.warn(
          "Valuation AI explanation unavailable:",
          error
        );
      }
    }

    return NextResponse.json(
      {
        ...payload,
        aiExplanation,
        generatedAt: new Date().toISOString(),
      },
      { headers: noStoreHeaders() }
    );
  } catch (error) {
    console.error("Valuation Center API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load valuation data.",
      },
      { status: 500, headers: noStoreHeaders() }
    );
  }
}

async function fetchJson(
  url: string
): Promise<Record<string, any> | null> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
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

function calculateValuationScore({
  peRatio,
  priceToBook,
  dividendYield,
  analystUpside,
}: {
  peRatio: number | null;
  priceToBook: number | null;
  dividendYield: number | null;
  analystUpside: number | null;
}) {
  const parts: number[] = [];

  if (peRatio !== null && peRatio > 0) {
    if (peRatio <= 12) parts.push(90);
    else if (peRatio <= 20) parts.push(75);
    else if (peRatio <= 30) parts.push(60);
    else if (peRatio <= 45) parts.push(45);
    else parts.push(30);
  }

  if (
    priceToBook !== null &&
    priceToBook > 0
  ) {
    if (priceToBook <= 2) parts.push(85);
    else if (priceToBook <= 4) parts.push(70);
    else if (priceToBook <= 8) parts.push(55);
    else parts.push(35);
  }

  if (
    dividendYield !== null &&
    dividendYield >= 0
  ) {
    if (dividendYield >= 4) parts.push(80);
    else if (dividendYield >= 2) parts.push(65);
    else parts.push(50);
  }

  if (analystUpside !== null) {
    parts.push(
      clampScore(50 + analystUpside * 1.5)
    );
  }

  return averageOrNeutral(parts);
}

function calculateProfitabilityScore({
  netMargin,
  grossMargin,
  operatingMargin,
  returnOnEquity,
}: {
  netMargin: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  returnOnEquity: number | null;
}) {
  const parts: number[] = [];

  if (netMargin !== null) {
    parts.push(
      clampScore(50 + netMargin * 1.5)
    );
  }

  if (grossMargin !== null) {
    parts.push(
      clampScore(35 + grossMargin)
    );
  }

  if (operatingMargin !== null) {
    parts.push(
      clampScore(50 + operatingMargin * 1.5)
    );
  }

  if (returnOnEquity !== null) {
    parts.push(
      clampScore(50 + returnOnEquity)
    );
  }

  return averageOrNeutral(parts);
}

function calculateBalanceSheetScore({
  currentRatio,
  debtToEquity,
}: {
  currentRatio: number | null;
  debtToEquity: number | null;
}) {
  const parts: number[] = [];

  if (currentRatio !== null) {
    if (currentRatio >= 2) parts.push(85);
    else if (currentRatio >= 1.5) parts.push(75);
    else if (currentRatio >= 1) parts.push(60);
    else parts.push(35);
  }

  if (debtToEquity !== null) {
    if (debtToEquity <= 0.5) parts.push(90);
    else if (debtToEquity <= 1) parts.push(75);
    else if (debtToEquity <= 2) parts.push(55);
    else parts.push(30);
  }

  return averageOrNeutral(parts);
}

function calculateRiskScore({
  beta,
  debtToEquity,
  currentRatio,
}: {
  beta: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
}) {
  const parts: number[] = [];

  if (beta !== null) {
    parts.push(
      clampScore(50 + Math.max(0, beta - 1) * 35)
    );
  }

  if (debtToEquity !== null) {
    parts.push(
      clampScore(debtToEquity * 30)
    );
  }

  if (currentRatio !== null) {
    parts.push(
      clampScore(
        currentRatio >= 1
          ? 30
          : 70
      )
    );
  }

  return averageOrNeutral(parts);
}

function scoreToClassification(score: number) {
  if (score >= 75) return "Attractive Signals";
  if (score >= 60) return "Moderately Attractive";
  if (score >= 45) return "Mixed / Fair";
  if (score >= 30) return "Expensive Signals";
  return "Very Expensive Signals";
}

function averageOrNeutral(values: number[]) {
  if (values.length === 0) {
    return 50;
  }

  return clampScore(
    values.reduce((sum, value) => sum + value, 0) /
      values.length
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