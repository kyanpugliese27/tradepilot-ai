import {
  NextRequest,
  NextResponse,
} from "next/server";
import OpenAI from "openai";

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

type QuoteSnapshotRow = {
  ticker?: string;
  name?: string;
  name_short?: string;
  exchange?: string;
  price?: number;
  pricechange?: number;
  pricechange_pct?: number;
  pricedate?: string;
};

type QuoteHistoryResponse = {
  metadata?: Record<string, unknown>;
  data?: Array<{
    date?: string;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number;
  }>;
};

type BQReportedValue = {
  raw?: number | string | null;
  fmt?: string | null;
};

type BQStatementValue = {
  date?: string;
  normalizedDate?: string;
  periodType?: string;
  reportedValue?: BQReportedValue;
};

type BQStatementSection = {
  metadata?: {
    name?: string;
    name_short?: string;
    slug?: string;
    itemtype?: string;
    datatype?: string;
  };
  values?: BQStatementValue[];
};

type BQStatementCategory = {
  metadata?: Record<string, unknown>;
  sections?: Record<
    string,
    BQStatementSection
  >;
};

type BQStatementResponse = {
  metadata?: {
    ticker?: string;
    companyname?: string;
    companyname_short?: string;
    currency?: string;
    template?: string;
    statement?: string;
    frequency?: string;
  };
  data?: Record<
    string,
    BQStatementCategory
  >;
  error?: string;
  message?: string;
};

type DividendResponse = {
  metadata?: {
    ticker?: string;
    divyield?: number;
    ttmdividend?: number;
  };
  divyield?: number;
  ttmdividend?: number;
  error?: string;
  message?: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic =
  "force-dynamic";
export const revalidate = 0;

const REQUEST_TIMEOUT_MS = 9_000;

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

export async function GET(
  request: NextRequest
) {
  try {
    const apiKey =
      process.env.BUSINESSQUANT_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "BUSINESSQUANT_API_KEY is missing.",
        },
        {
          status: 500,
          headers: noStoreHeaders(),
        }
      );
    }

    const symbol =
      request.nextUrl.searchParams
        .get("symbol")
        ?.trim()
        .toUpperCase();

    if (
      !symbol ||
      !/^[A-Z0-9.-]{1,15}$/.test(
        symbol
      )
    ) {
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

    /*
     * Business Quant gives us everything
     * this valuation route needs directly:
     *
     * - current price -> Quotes snapshot
     * - valuation/fundamental ratios -> Ratios TTM
     * - 52-week range -> Quotes 1y
     * - dividend yield -> Dividends
     *
     * This removes the old dependency on
     * other Norvexa API routes that may be
     * unavailable or returning errors.
     */

    const snapshotUrl = new URL(
      "https://data.businessquant.com/quotes"
    );

    snapshotUrl.searchParams.set(
      "ticker",
      symbol
    );
    snapshotUrl.searchParams.set(
      "mode",
      "snapshot"
    );
    snapshotUrl.searchParams.set(
      "api_key",
      apiKey
    );

    const historyUrl = new URL(
      "https://data.businessquant.com/quotes"
    );

    historyUrl.searchParams.set(
      "ticker",
      symbol
    );
    historyUrl.searchParams.set(
      "mode",
      "eod"
    );
    historyUrl.searchParams.set(
      "period",
      "1y"
    );
    historyUrl.searchParams.set(
      "limit",
      "500"
    );
    historyUrl.searchParams.set(
      "api_key",
      apiKey
    );

    const ratiosUrl = new URL(
      "https://data.businessquant.com/statements"
    );

    ratiosUrl.searchParams.set(
      "ticker",
      symbol
    );
    ratiosUrl.searchParams.set(
      "statement",
      "Ratios"
    );
    ratiosUrl.searchParams.set(
      "frequency",
      "TTM"
    );
    ratiosUrl.searchParams.set(
      "period",
      "5y"
    );
    ratiosUrl.searchParams.set(
      "api_key",
      apiKey
    );

    const dividendUrl = new URL(
      "https://data.businessquant.com/dividends"
    );

    dividendUrl.searchParams.set(
      "ticker",
      symbol
    );
    dividendUrl.searchParams.set(
      "mode",
      "dps"
    );
    dividendUrl.searchParams.set(
      "api_key",
      apiKey
    );

    const [
      snapshotResult,
      historyResult,
      ratiosResult,
      dividendResult,
    ] = await Promise.all([
      fetchOptionalJson(snapshotUrl),
      fetchOptionalJson(historyUrl),
      fetchOptionalJson(ratiosUrl),
      fetchOptionalJson(dividendUrl),
    ]);

    const snapshotRows =
      Array.isArray(
        snapshotResult.data
      )
        ? (
            snapshotResult.data as unknown as QuoteSnapshotRow[]
          )
        : [];

    const stock =
      snapshotRows.find(
        (row) =>
          row.ticker?.toUpperCase() ===
          symbol
      ) ||
      snapshotRows[0] ||
      null;

    if (
      !snapshotResult.ok ||
      !stock ||
      !Number.isFinite(
        Number(stock.price)
      )
    ) {
      return NextResponse.json(
        {
          error:
            `Unable to load ${symbol}.`,
        },
        {
          status: 404,
          headers: noStoreHeaders(),
        }
      );
    }

    const currentPrice =
      finiteNumber(
        stock.price
      );

    const ratiosData =
      ratiosResult.data as
        | BQStatementResponse
        | null;

    const peRatio =
      latestMetric(
        ratiosData,
        [
          "P/E Ratio",
          "PE Ratio",
          "Price to Earnings",
          "Price/Earnings",
          "Price Earnings Ratio",
        ]
      );

    const priceToBook =
      latestMetric(
        ratiosData,
        [
          "P/B Ratio",
          "PB Ratio",
          "Price to Book",
          "Price/Book",
          "Price to Book Ratio",
        ]
      );

    const netMargin =
      normalizePercentMetric(
        latestMetric(
          ratiosData,
          [
            "Net Profit Margin",
            "Net Margin",
            "Profit Margin",
          ]
        )
      );

    const grossMargin =
      normalizePercentMetric(
        latestMetric(
          ratiosData,
          [
            "Gross Margin",
            "Gross Profit Margin",
          ]
        )
      );

    const operatingMargin =
      normalizePercentMetric(
        latestMetric(
          ratiosData,
          [
            "Operating Margin",
            "Operating Profit Margin",
          ]
        )
      );

    const currentRatio =
      latestMetric(
        ratiosData,
        [
          "Current Ratio",
        ]
      );

    const debtToEquity =
      normalizeRatioMetric(
        latestMetric(
          ratiosData,
          [
            "Debt to Equity",
            "Debt/Equity",
            "Debt To Equity Ratio",
            "Total Debt to Equity",
          ]
        )
      );

    const returnOnEquity =
      normalizePercentMetric(
        latestMetric(
          ratiosData,
          [
            "Return on Equity",
            "ROE",
            "Return On Equity",
          ]
        )
      );

    const dividendData =
      dividendResult.data as
        | DividendResponse
        | null;

    const rawDividendYield =
      finiteOrNull(
        dividendData?.metadata
          ?.divyield ??
          dividendData?.divyield
      );

    /*
     * Business Quant documents divyield
     * as a decimal, e.g. 0.0035 = 0.35%.
     * Norvexa's valuation scoring expects
     * percentage points, so convert here.
     */
    const dividendYield =
      rawDividendYield !== null
        ? rawDividendYield * 100
        : null;

    const history =
      historyResult.data as
        | QuoteHistoryResponse
        | null;

    const highs =
      Array.isArray(
        history?.data
      )
        ? history!.data!
            .map((row) =>
              finiteOrNull(
                row.high
              )
            )
            .filter(
              (
                value
              ): value is number =>
                value !== null
            )
        : [];

    const lows =
      Array.isArray(
        history?.data
      )
        ? history!.data!
            .map((row) =>
              finiteOrNull(
                row.low
              )
            )
            .filter(
              (
                value
              ): value is number =>
                value !== null
            )
        : [];

    const week52High =
      highs.length > 0
        ? Math.max(...highs)
        : null;

    const week52Low =
      lows.length > 0
        ? Math.min(...lows)
        : null;

    /*
     * Beta is not a SEC filing metric and
     * is not part of the Business Quant
     * statements data used here.
     */
    const beta: number | null =
      null;

    /*
     * The old route depended on your
     * Analyst Center for price targets.
     * That center is currently one of the
     * broken features we're fixing, so
     * Valuation Center must not fail just
     * because analyst targets are missing.
     */
    const analystUpside:
      | number
      | null = null;

    const valuationScore =
      calculateValuationScore({
        peRatio,
        priceToBook,
        dividendYield,
        analystUpside,
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

    const riskScore =
      calculateRiskScore({
        beta,
        debtToEquity,
        currentRatio,
      });

    const overallScore =
      clampScore(
        valuationScore * 0.4 +
          profitabilityScore *
            0.3 +
          balanceSheetScore *
            0.2 +
          (100 - riskScore) *
            0.1
      );

    const classification =
      scoreToClassification(
        overallScore
      );

    const payload = {
      symbol,

      companyName:
        stock.name ||
        stock.name_short ||
        symbol,

      currentPrice,

      classification,

      scores: {
        overall:
          overallScore,

        valuation:
          valuationScore,

        profitability:
          profitabilityScore,

        balanceSheet:
          balanceSheetScore,

        risk:
          riskScore,
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
        consensus:
          "Unavailable",

        weightedScore:
          null,

        meanTarget:
          null,

        impliedUpsidePercent:
          null,

        range:
          null,
      },

      methodology: {
        label:
          "Educational multi-factor valuation score",

        note:
          "This score combines available valuation, profitability, balance-sheet, risk, and market-reference data. It is not a DCF or intrinsic-value calculation.",
      },

      source: {
        price:
          "Business Quant Quotes",

        ratios:
          "Business Quant / SEC filings",

        dividends:
          "Business Quant",

        analystReference:
          "Unavailable while Analyst Center is being repaired",
      },
    };

    let aiExplanation:
      | AIExplanation
      | null = null;

    if (
      process.env.OPENAI_API_KEY
    ) {
      try {
        const response =
          await openai.responses.create({
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
- Explain that analyst targets are unavailable if none are supplied.
- Keep the answer concise and suitable for a stock-page card.
`,

            input:
              JSON.stringify(
                payload,
                null,
                2
              ),

            text: {
              format: {
                type:
                  "json_schema",

                name:
                  "valuation_center_explanation",

                description:
                  "A structured educational explanation of visible valuation signals.",

                strict: true,

                schema:
                  aiSchema,
              },
            },
          });

        if (
          response.output_text
        ) {
          aiExplanation =
            JSON.parse(
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

        availability: {
          price:
            snapshotResult.ok,

          ratios:
            ratiosResult.ok,

          priceHistory:
            historyResult.ok,

          dividends:
            dividendResult.ok,
        },

        generatedAt:
          new Date().toISOString(),
      },
      {
        headers:
          noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "Valuation Center API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load valuation data.",
      },
      {
        status: 500,
        headers:
          noStoreHeaders(),
      }
    );
  }
}

async function fetchOptionalJson(
  url: URL
): Promise<{
  ok: boolean;
  status: number | null;
  data: Record<
    string,
    any
  > | any[] | null;
}> {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

  try {
    const response =
      await fetch(url, {
        cache:
          "no-store",

        signal:
          controller.signal,

        headers: {
          Accept:
            "application/json",
        },
      });

    let data:
      | Record<
          string,
          any
        >
      | any[]
      | null = null;

    try {
      data =
        (await response.json()) as
          | Record<
              string,
              any
            >
          | any[];
    } catch {
      data = null;
    }

    if (!response.ok) {
      console.error(
        "Valuation upstream request failed:",
        {
          host:
            url.hostname,

          status:
            response.status,

          data,
        }
      );

      return {
        ok: false,

        status:
          response.status,

        data,
      };
    }

    return {
      ok: true,

      status:
        response.status,

      data,
    };
  } catch (error) {
    console.error(
      "Valuation upstream fetch error:",
      {
        host:
          url.hostname,

        error,
      }
    );

    return {
      ok: false,

      status: null,

      data: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function latestMetric(
  response:
    | BQStatementResponse
    | null,
  aliases: string[]
): number | null {
  const section =
    findSectionByAliases(
      response,
      aliases
    );

  if (
    !section ||
    !Array.isArray(
      section.values
    )
  ) {
    return null;
  }

  const values =
    [...section.values].sort(
      (a, b) =>
        metricDate(
          b
        ).localeCompare(
          metricDate(a)
        )
    );

  for (const value of values) {
    const raw =
      finiteOrNull(
        value.reportedValue
          ?.raw
      );

    if (raw !== null) {
      return raw;
    }
  }

  return null;
}

function findSectionByAliases(
  response:
    | BQStatementResponse
    | null,
  aliases: string[]
):
  | BQStatementSection
  | null {
  if (!response?.data) {
    return null;
  }

  const normalizedAliases =
    aliases.map(
      normalizeKey
    );

  let fuzzyMatch:
    | BQStatementSection
    | null = null;

  for (const category of Object.values(
    response.data
  )) {
    for (const [
      sectionName,
      section,
    ] of Object.entries(
      category.sections || {}
    )) {
      const candidates = [
        section.metadata?.slug,
        section.metadata?.name,
        section.metadata
          ?.name_short,
        sectionName,
      ]
        .filter(Boolean)
        .map((value) =>
          normalizeKey(
            String(value)
          )
        );

      if (
        candidates.some(
          (candidate) =>
            normalizedAliases.includes(
              candidate
            )
        )
      ) {
        return section;
      }

      if (
        !fuzzyMatch &&
        candidates.some(
          (candidate) =>
            normalizedAliases.some(
              (alias) =>
                candidate.includes(
                  alias
                ) ||
                alias.includes(
                  candidate
                )
            )
        )
      ) {
        fuzzyMatch =
          section;
      }
    }
  }

  return fuzzyMatch;
}

function metricDate(
  value: BQStatementValue
) {
  return (
    value.normalizedDate ||
    value.date ||
    ""
  ).slice(0, 10);
}

function normalizeKey(
  value: string
) {
  return value
    .toLowerCase()
    .replace(
      /\([^)]*\)/g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}

/*
 * Business Quant ratio tables can expose
 * percentages either as percentage points
 * or decimals depending on the metric.
 * Convert obvious decimals to percentage
 * points, while leaving values like 25.4
 * unchanged.
 */
function normalizePercentMetric(
  value: number | null
) {
  if (value === null) {
    return null;
  }

  if (
    Math.abs(value) <= 1
  ) {
    return value * 100;
  }

  return value;
}

/*
 * Debt/equity should be used as a ratio
 * (e.g. 1.5), not percentage points.
 * If the upstream value looks like a
 * percentage representation such as 150,
 * normalize it down.
 */
function normalizeRatioMetric(
  value: number | null
) {
  if (value === null) {
    return null;
  }

  if (
    Math.abs(value) > 20
  ) {
    return value / 100;
  }

  return value;
}

function calculateValuationScore({
  peRatio,
  priceToBook,
  dividendYield,
  analystUpside,
}: {
  peRatio:
    | number
    | null;
  priceToBook:
    | number
    | null;
  dividendYield:
    | number
    | null;
  analystUpside:
    | number
    | null;
}) {
  const parts:
    number[] = [];

  if (
    peRatio !== null &&
    peRatio > 0
  ) {
    if (peRatio <= 12) {
      parts.push(90);
    } else if (
      peRatio <= 20
    ) {
      parts.push(75);
    } else if (
      peRatio <= 30
    ) {
      parts.push(60);
    } else if (
      peRatio <= 45
    ) {
      parts.push(45);
    } else {
      parts.push(30);
    }
  }

  if (
    priceToBook !==
      null &&
    priceToBook > 0
  ) {
    if (
      priceToBook <= 2
    ) {
      parts.push(85);
    } else if (
      priceToBook <= 4
    ) {
      parts.push(70);
    } else if (
      priceToBook <= 8
    ) {
      parts.push(55);
    } else {
      parts.push(35);
    }
  }

  if (
    dividendYield !==
      null &&
    dividendYield >= 0
  ) {
    if (
      dividendYield >= 4
    ) {
      parts.push(80);
    } else if (
      dividendYield >= 2
    ) {
      parts.push(65);
    } else {
      parts.push(50);
    }
  }

  if (
    analystUpside !==
    null
  ) {
    parts.push(
      clampScore(
        50 +
          analystUpside *
            1.5
      )
    );
  }

  return averageOrNeutral(
    parts
  );
}

function calculateProfitabilityScore({
  netMargin,
  grossMargin,
  operatingMargin,
  returnOnEquity,
}: {
  netMargin:
    | number
    | null;
  grossMargin:
    | number
    | null;
  operatingMargin:
    | number
    | null;
  returnOnEquity:
    | number
    | null;
}) {
  const parts:
    number[] = [];

  if (
    netMargin !== null
  ) {
    parts.push(
      clampScore(
        50 +
          netMargin * 1.5
      )
    );
  }

  if (
    grossMargin !== null
  ) {
    parts.push(
      clampScore(
        35 +
          grossMargin
      )
    );
  }

  if (
    operatingMargin !==
    null
  ) {
    parts.push(
      clampScore(
        50 +
          operatingMargin *
            1.5
      )
    );
  }

  if (
    returnOnEquity !==
    null
  ) {
    parts.push(
      clampScore(
        50 +
          returnOnEquity
      )
    );
  }

  return averageOrNeutral(
    parts
  );
}

function calculateBalanceSheetScore({
  currentRatio,
  debtToEquity,
}: {
  currentRatio:
    | number
    | null;
  debtToEquity:
    | number
    | null;
}) {
  const parts:
    number[] = [];

  if (
    currentRatio !== null
  ) {
    if (
      currentRatio >= 2
    ) {
      parts.push(85);
    } else if (
      currentRatio >= 1.5
    ) {
      parts.push(75);
    } else if (
      currentRatio >= 1
    ) {
      parts.push(60);
    } else {
      parts.push(35);
    }
  }

  if (
    debtToEquity !== null
  ) {
    if (
      debtToEquity <= 0.5
    ) {
      parts.push(90);
    } else if (
      debtToEquity <= 1
    ) {
      parts.push(75);
    } else if (
      debtToEquity <= 2
    ) {
      parts.push(55);
    } else {
      parts.push(30);
    }
  }

  return averageOrNeutral(
    parts
  );
}

function calculateRiskScore({
  beta,
  debtToEquity,
  currentRatio,
}: {
  beta:
    | number
    | null;
  debtToEquity:
    | number
    | null;
  currentRatio:
    | number
    | null;
}) {
  const parts:
    number[] = [];

  if (beta !== null) {
    parts.push(
      clampScore(
        50 +
          Math.max(
            0,
            beta - 1
          ) *
            35
      )
    );
  }

  if (
    debtToEquity !== null
  ) {
    parts.push(
      clampScore(
        debtToEquity *
          30
      )
    );
  }

  if (
    currentRatio !== null
  ) {
    parts.push(
      clampScore(
        currentRatio >= 1
          ? 30
          : 70
      )
    );
  }

  return averageOrNeutral(
    parts
  );
}

function scoreToClassification(
  score: number
) {
  if (score >= 75) {
    return "Attractive Signals";
  }

  if (score >= 60) {
    return "Moderately Attractive";
  }

  if (score >= 45) {
    return "Mixed / Fair";
  }

  if (score >= 30) {
    return "Expensive Signals";
  }

  return "Very Expensive Signals";
}

function averageOrNeutral(
  values: number[]
) {
  if (
    values.length === 0
  ) {
    return 50;
  }

  return clampScore(
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    ) /
      values.length
  );
}

function finiteNumber(
  value: unknown
) {
  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue
  )
    ? numberValue
    : 0;
}

function finiteOrNull(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue
  )
    ? numberValue
    : null;
}

function clampScore(
  value: number
) {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(value)
    )
  );
}

function noStoreHeaders() {
  return {
    "Cache-Control":
      "private, no-cache, no-store, max-age=0, must-revalidate",

    Pragma:
      "no-cache",

    Expires:
      "0",
  };
}