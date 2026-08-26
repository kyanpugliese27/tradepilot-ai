import {
  NextRequest,
  NextResponse,
} from "next/server";
import OpenAI from "openai";

type BQQuote = {
  ticker?: string;
  name?: string;
  name_short?: string;
  price?: number;
  pricechange?: number;
  pricechange_pct?: number;
};

type BQReportedValue = {
  raw?: number | string | null;
};

type BQStatementValue = {
  date?: string;
  normalizedDate?: string;
  reportedValue?: BQReportedValue;
};

type BQStatementSection = {
  metadata?: {
    name?: string;
    name_short?: string;
    slug?: string;
  };
  values?: BQStatementValue[];
};

type BQStatementCategory = {
  sections?: Record<
    string,
    BQStatementSection
  >;
};

type BQStatementResponse = {
  data?: Record<
    string,
    BQStatementCategory
  >;
};

type BQDividendResponse = {
  metadata?: {
    divyield?: number;
  };
};

type BQHistoryResponse = {
  data?: Array<{
    high?: number;
    low?: number;
  }>;
};

type Recommendation = {
  buy?: number;
  hold?: number;
  period?: string;
  sell?: number;
  strongBuy?: number;
  strongSell?: number;
};

type InsiderTransaction = {
  change?: number;
};

type BQHolder = {
  shares_change_qoq?: number;
};

type NewsArticle = {
  headline?: string;
  summary?: string;
  source?: string;
  url?: string;
  image?: string;
  datetime?: number;
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

type FetchResult = {
  ok: boolean;
  status: number | null;
  data: unknown;
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

export async function GET(
  request: NextRequest
) {
  try {
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
          headers:
            noStoreHeaders(),
        }
      );
    }

    const businessQuantApiKey =
      process.env
        .BUSINESSQUANT_API_KEY;

    if (!businessQuantApiKey) {
      return NextResponse.json(
        {
          error:
            "BUSINESSQUANT_API_KEY is missing.",
        },
        {
          status: 500,
          headers:
            noStoreHeaders(),
        }
      );
    }

    const finnhubApiKey =
      process.env.FINNHUB_API_KEY;

    /*
     * IMPORTANT
     *
     * This route intentionally does NOT
     * server-fetch Norvexa's own API routes.
     *
     * The previous version called:
     * /api/stock-details
     * /api/stock-fundamentals
     * /api/stock-analyst-center
     * /api/stock-valuation
     * /api/stock-ownership
     * /api/stock-news
     *
     * That makes the whole AI rating fail
     * if one internal server-to-self request
     * is blocked or returns HTML on Vercel.
     *
     * Everything below is loaded directly
     * from the external providers instead.
     */

    const quoteUrl =
      new URL(
        "https://data.businessquant.com/quotes"
      );

    quoteUrl.searchParams.set(
      "ticker",
      symbol
    );
    quoteUrl.searchParams.set(
      "mode",
      "snapshot"
    );
    quoteUrl.searchParams.set(
      "api_key",
      businessQuantApiKey
    );

    const ratiosUrl =
      new URL(
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
      businessQuantApiKey
    );

    const dividendUrl =
      new URL(
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
      businessQuantApiKey
    );

    const historyUrl =
      new URL(
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
      businessQuantApiKey
    );

    const ownershipUrl =
      new URL(
        "https://data.businessquant.com/13f"
      );

    ownershipUrl.searchParams.set(
      "mode",
      "topholders"
    );
    ownershipUrl.searchParams.set(
      "ticker_issuer",
      symbol
    );
    ownershipUrl.searchParams.set(
      "api_key",
      businessQuantApiKey
    );

    const [
      quoteResult,
      ratiosResult,
      dividendResult,
      historyResult,
      ownershipResult,
      recommendationResult,
      insiderResult,
      newsResult,
    ] = await Promise.all([
      fetchOptionalJson(
        quoteUrl
      ),
      fetchOptionalJson(
        ratiosUrl
      ),
      fetchOptionalJson(
        dividendUrl
      ),
      fetchOptionalJson(
        historyUrl
      ),
      fetchOptionalJson(
        ownershipUrl
      ),
      finnhubApiKey
        ? fetchFinnhub(
            "https://finnhub.io/api/v1/stock/recommendation",
            {
              symbol,
              token:
                finnhubApiKey,
            }
          )
        : Promise.resolve(
            emptyResult()
          ),
      finnhubApiKey
        ? fetchFinnhub(
            "https://finnhub.io/api/v1/stock/insider-transactions",
            {
              symbol,
              from:
                dateYearsAgo(1),
              to:
                dateToday(),
              token:
                finnhubApiKey,
            }
          )
        : Promise.resolve(
            emptyResult()
          ),
      finnhubApiKey
        ? fetchFinnhub(
            "https://finnhub.io/api/v1/company-news",
            {
              symbol,
              from:
                dateDaysAgo(7),
              to:
                dateToday(),
              token:
                finnhubApiKey,
            }
          )
        : Promise.resolve(
            emptyResult()
          ),
    ]);

    const quoteRows =
      Array.isArray(
        quoteResult.data
      )
        ? (
            quoteResult.data as BQQuote[]
          )
        : [];

    const quote =
      quoteRows.find(
        (item) =>
          item.ticker
            ?.toUpperCase() ===
          symbol
      ) ||
      quoteRows[0] ||
      null;

    if (
      !quoteResult.ok ||
      !quote ||
      !Number.isFinite(
        Number(
          quote.price
        )
      )
    ) {
      return NextResponse.json(
        {
          error:
            `Unable to load ${symbol}.`,
        },
        {
          status: 404,
          headers:
            noStoreHeaders(),
        }
      );
    }

    const ratios =
      isPlainObject(
        ratiosResult.data
      )
        ? (
            ratiosResult.data as BQStatementResponse
          )
        : null;

    const dividends =
      isPlainObject(
        dividendResult.data
      )
        ? (
            dividendResult.data as BQDividendResponse
          )
        : null;

    const history =
      isPlainObject(
        historyResult.data
      )
        ? (
            historyResult.data as BQHistoryResponse
          )
        : null;

    const currentPrice =
      finiteNumber(
        quote.price
      );

    const changePercent =
      finiteNumber(
        quote.pricechange_pct
      );

    const highs =
      Array.isArray(
        history?.data
      )
        ? history!.data!
            .map(
              (row) =>
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
            .map(
              (row) =>
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

    const peRatio =
      latestMetric(
        ratios,
        [
          "P/E Ratio",
          "PE Ratio",
          "Price to Earnings",
          "Price Earnings Ratio",
        ]
      );

    const priceToBook =
      latestMetric(
        ratios,
        [
          "P/B Ratio",
          "PB Ratio",
          "Price to Book",
          "Price Book Ratio",
        ]
      );

    const currentRatio =
      latestMetric(
        ratios,
        [
          "Current Ratio",
        ]
      );

    const debtToEquity =
      normalizeRatioMetric(
        latestMetric(
          ratios,
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
          ratios,
          [
            "Return on Equity",
            "ROE",
          ]
        )
      );

    const netProfitMargin =
      normalizePercentMetric(
        latestMetric(
          ratios,
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
          ratios,
          [
            "Gross Margin",
            "Gross Profit Margin",
          ]
        )
      );

    const operatingMargin =
      normalizePercentMetric(
        latestMetric(
          ratios,
          [
            "Operating Margin",
            "Operating Profit Margin",
          ]
        )
      );

    const rawYield =
      finiteOrNull(
        dividends
          ?.metadata
          ?.divyield
      );

    const dividendYield =
      rawYield !== null
        ? rawYield * 100
        : null;

    /*
     * ANALYST CONSENSUS
     */
    const recommendationHistory =
      Array.isArray(
        recommendationResult.data
      )
        ? (
            recommendationResult.data as Recommendation[]
          )
        : [];

    const latestRecommendation =
      recommendationHistory[0] ||
      null;

    const recommendationCounts = {
      strongBuy:
        finiteNumber(
          latestRecommendation
            ?.strongBuy
        ),
      buy:
        finiteNumber(
          latestRecommendation
            ?.buy
        ),
      hold:
        finiteNumber(
          latestRecommendation
            ?.hold
        ),
      sell:
        finiteNumber(
          latestRecommendation
            ?.sell
        ),
      strongSell:
        finiteNumber(
          latestRecommendation
            ?.strongSell
        ),
    };

    const totalRecommendations =
      recommendationCounts.strongBuy +
      recommendationCounts.buy +
      recommendationCounts.hold +
      recommendationCounts.sell +
      recommendationCounts.strongSell;

    const weightedAnalystScore =
      totalRecommendations > 0
        ? (
            recommendationCounts
              .strongBuy *
              5 +
            recommendationCounts.buy *
              4 +
            recommendationCounts.hold *
              3 +
            recommendationCounts.sell *
              2 +
            recommendationCounts
              .strongSell
          ) /
          totalRecommendations
        : null;

    const analystConsensus =
      scoreToConsensus(
        weightedAnalystScore
      );

    /*
     * OWNERSHIP SIGNALS
     */
    const insiderRows =
      isPlainObject(
        insiderResult.data
      ) &&
      Array.isArray(
        (
          insiderResult.data as {
            data?: unknown[];
          }
        ).data
      )
        ? (
            (
              insiderResult.data as {
                data?: InsiderTransaction[];
              }
            ).data || []
          )
        : [];

    const insiderBuyTransactions =
      insiderRows.filter(
        (item) =>
          finiteNumber(
            item.change
          ) > 0
      ).length;

    const insiderSellTransactions =
      insiderRows.filter(
        (item) =>
          finiteNumber(
            item.change
          ) < 0
      ).length;

    const insiderNetShares =
      insiderRows.reduce(
        (sum, item) =>
          sum +
          finiteNumber(
            item.change
          ),
        0
      );

    const holderRows =
      isPlainObject(
        ownershipResult.data
      ) &&
      Array.isArray(
        (
          ownershipResult.data as {
            data?: unknown[];
          }
        ).data
      )
        ? (
            (
              ownershipResult.data as {
                data?: BQHolder[];
              }
            ).data || []
          )
        : [];

    const institutionalNetChange =
      holderRows.reduce(
        (sum, item) =>
          sum +
          finiteNumber(
            item.shares_change_qoq
          ),
        0
      );

    /*
     * NEWS
     */
    const news =
      Array.isArray(
        newsResult.data
      )
        ? (
            newsResult.data as NewsArticle[]
          )
            .filter(
              (article) =>
                Boolean(
                  article.headline
                )
            )
            .slice(
              0,
              10
            )
        : [];

    /*
     * COMPONENT SCORES
     */
    const momentumScore =
      calculateMomentumScore(
        {
          changePercent,
          currentPrice,
          week52High,
          week52Low,
        }
      );

    const financialHealthScore =
      calculateFinancialHealthScore(
        {
          currentRatio,
          debtToEquity,
          returnOnEquity,
          netMargin:
            netProfitMargin,
          operatingMargin,
        }
      );

    const analystScore =
      calculateAnalystScore(
        {
          weightedScore:
            weightedAnalystScore,
        }
      );

    const ownershipScore =
      calculateOwnershipScore(
        {
          buyTransactions:
            insiderBuyTransactions,
          sellTransactions:
            insiderSellTransactions,
          netShares:
            insiderNetShares,
          netInstitutionalChange:
            institutionalNetChange,
        }
      );

    const newsCoverageScore =
      calculateNewsCoverageScore(
        news
      );

    const valuationScore =
      calculateValuationScore(
        {
          peRatio,
          priceToBook,
          dividendYield,
        }
      );

    /*
     * Business Quant data used here does not
     * provide beta, so risk is based on debt
     * and valuation rather than inventing beta.
     */
    const riskScore =
      calculateRiskScore(
        {
          debtToEquity,
          valuationRisk:
            100 -
            valuationScore,
        }
      );

    const overallScore =
      clampScore(
        valuationScore *
          0.24 +
        financialHealthScore *
          0.24 +
        momentumScore *
          0.16 +
        analystScore *
          0.16 +
        ownershipScore *
          0.10 +
        newsCoverageScore *
          0.10
      );

    const confidenceScore =
      calculateConfidenceScore(
        [
          peRatio,
          netProfitMargin,
          currentRatio,
          debtToEquity,
          returnOnEquity,
          week52High,
          week52Low,
          weightedAnalystScore,
          insiderNetShares,
          news.length > 0
            ? news.length
            : null,
        ]
      );

    const rating =
      scoreToResearchRating(
        overallScore
      );

    const payload = {
      symbol,

      companyName:
        quote.name ||
        quote.name_short ||
        symbol,

      currentPrice,

      rating,

      overallScore,

      confidenceScore,

      componentScores: {
        valuation:
          valuationScore,

        financialHealth:
          financialHealthScore,

        momentum:
          momentumScore,

        analystConsensus:
          analystScore,

        ownership:
          ownershipScore,

        newsCoverage:
          newsCoverageScore,

        risk:
          riskScore,
      },

      referenceData: {
        analystConsensus,

        analystMeanTarget:
          null,

        analystImpliedUpsidePercent:
          null,

        analystCount:
          totalRecommendations >
          0
            ? totalRecommendations
            : null,

        valuationClassification:
          scoreToValuationClassification(
            valuationScore
          ),

        dailyChangePercent:
          changePercent,

        recentNewsCount:
          news.length,

        insiderNetShares,

        institutionalNetChange,

        dividendYield,

        peRatio,

        currentRatio,

        debtToEquity,

        returnOnEquity,
      },

      availableNews:
        news.slice(
          0,
          6
        ),

      methodology: {
        label:
          "Educational AI research score",

        note:
          "The score summarizes visible valuation, profitability, balance-sheet, momentum, analyst, ownership, and news data. It is not a personalized recommendation or prediction.",
      },

      source: {
        quoteAndFundamentals:
          "Business Quant",

        analystRecommendations:
          recommendationHistory.length >
          0
            ? "Finnhub"
            : "Unavailable",

        ownership:
          "Business Quant 13F + Finnhub insider transactions",

        news:
          news.length > 0
            ? "Finnhub"
            : "Unavailable",
      },
    };

    let aiExplanation:
      | AIResearchExplanation
      | null = null;

    if (
      process.env
        .OPENAI_API_KEY
    ) {
      try {
        const response =
          await openai.responses.create(
            {
              model:
                "gpt-5-mini",

              store:
                false,

              instructions: `
You are Norvexa, an educational stock-research assistant.

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
                    "ai_research_rating",

                  description:
                    "A structured educational stock research explanation.",

                  strict:
                    true,

                  schema:
                    aiSchema,
                },
              },
            }
          );

        if (
          response.output_text
        ) {
          aiExplanation =
            JSON.parse(
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
        route: "stock-ai-rating",
        version: "2026-08-26-v2",

        ...payload,

        aiExplanation,

        availability: {
          quote:
            quoteResult.ok,

          fundamentals:
            ratiosResult.ok,

          priceHistory:
            historyResult.ok,

          dividends:
            dividendResult.ok,

          recommendations:
            recommendationHistory.length >
            0,

          ownership:
            ownershipResult.ok,

          insiders:
            insiderRows.length >
            0,

          news:
            news.length > 0,
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
      "AI Research Rating API error:",
      error
    );

    return NextResponse.json(
      {
        route: "stock-ai-rating",
        version: "2026-08-26-v2",
        error:
          error instanceof Error
            ? error.message
            : "Unable to load the AI research rating.",
      },
      {
        status: 500,
        headers:
          noStoreHeaders(),
      }
    );
  }
}

async function fetchFinnhub(
  baseUrl: string,
  params: Record<
    string,
    string
  >
) {
  const url =
    new URL(
      baseUrl
    );

  for (
    const [
      key,
      value,
    ]
    of Object.entries(
      params
    )
  ) {
    url.searchParams.set(
      key,
      value
    );
  }

  return fetchOptionalJson(
    url
  );
}

async function fetchOptionalJson(
  url: URL
): Promise<FetchResult> {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      REQUEST_TIMEOUT_MS
    );

  try {
    const response =
      await fetch(
        url,
        {
          cache:
            "no-store",

          signal:
            controller.signal,

          headers: {
            Accept:
              "application/json",
          },
        }
      );

    const contentType =
      response.headers.get(
        "content-type"
      ) || "";

    if (
      !contentType.includes(
        "application/json"
      )
    ) {
      return {
        ok: false,
        status:
          response.status,
        data: null,
      };
    }

    let data:
      unknown = null;

    try {
      data =
        await response.json();
    } catch {
      data = null;
    }

    return {
      ok:
        response.ok,

      status:
        response.status,

      data,
    };
  } catch {
    return {
      ok: false,
      status: null,
      data: null,
    };
  } finally {
    clearTimeout(
      timeout
    );
  }
}

function emptyResult():
  FetchResult {
  return {
    ok: false,
    status: null,
    data: null,
  };
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

  for (
    const value
    of values
  ) {
    const raw =
      finiteOrNull(
        value.reportedValue
          ?.raw
      );

    if (
      raw !== null
    ) {
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
  if (
    !response?.data
  ) {
    return null;
  }

  const normalizedAliases =
    aliases.map(
      normalizeKey
    );

  let fuzzyMatch:
    | BQStatementSection
    | null = null;

  for (
    const category
    of Object.values(
      response.data
    )
  ) {
    for (
      const [
        sectionName,
        section,
      ]
      of Object.entries(
        category.sections ||
          {}
      )
    ) {
      const candidates =
        [
          section.metadata
            ?.slug,
          section.metadata
            ?.name,
          section.metadata
            ?.name_short,
          sectionName,
        ]
          .filter(Boolean)
          .map(
            (value) =>
              normalizeKey(
                String(
                  value
                )
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
  value:
    BQStatementValue
) {
  return (
    value.normalizedDate ||
    value.date ||
    ""
  ).slice(
    0,
    10
  );
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
    clampScore(
      50 +
      changePercent * 6
    ),
  ];

  if (
    week52High !== null &&
    week52Low !== null &&
    week52High > week52Low &&
    currentPrice > 0
  ) {
    parts.push(
      clampScore(
        ((currentPrice -
          week52Low) /
          (week52High -
            week52Low)) *
        100
      )
    );
  }

  return average(
    parts
  );
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
  const parts:
    number[] = [];

  if (
    currentRatio !== null
  ) {
    if (
      currentRatio >= 2
    ) {
      parts.push(90);
    } else if (
      currentRatio >= 1.5
    ) {
      parts.push(78);
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

  if (
    returnOnEquity !== null
  ) {
    parts.push(
      clampScore(
        50 +
        returnOnEquity
      )
    );
  }

  if (
    netMargin !== null
  ) {
    parts.push(
      clampScore(
        50 +
        netMargin *
          1.5
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

  return parts.length >
    0
    ? average(parts)
    : 50;
}

function calculateAnalystScore({
  weightedScore,
}: {
  weightedScore:
    | number
    | null;
}) {
  if (
    weightedScore ===
    null
  ) {
    return 50;
  }

  return clampScore(
    ((weightedScore -
      1) /
      4) *
    100
  );
}

function calculateOwnershipScore(
  summary: {
    buyTransactions?: number;
    sellTransactions?: number;
    netShares?: number;
    netInstitutionalChange?: number;
  }
) {
  const netShares =
    finiteNumber(
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

  const institutionalChange =
    finiteNumber(
      summary.netInstitutionalChange
    );

  let score = 50;

  if (
    netShares > 0
  ) {
    score += 15;
  }

  if (
    netShares < 0
  ) {
    score -= 15;
  }

  if (
    buyTransactions >
    sellTransactions
  ) {
    score += 10;
  } else if (
    sellTransactions >
    buyTransactions
  ) {
    score -= 10;
  }

  if (
    institutionalChange > 0
  ) {
    score += 8;
  } else if (
    institutionalChange < 0
  ) {
    score -= 8;
  }

  return clampScore(
    score
  );
}

function calculateNewsCoverageScore(
  articles:
    NewsArticle[]
) {
  if (
    articles.length === 0
  ) {
    return 50;
  }

  return clampScore(
    50 +
    Math.min(
      articles.length,
      10
    ) *
      3
  );
}

function calculateValuationScore({
  peRatio,
  priceToBook,
  dividendYield,
}: {
  peRatio: number | null;
  priceToBook: number | null;
  dividendYield: number | null;
}) {
  const parts:
    number[] = [];

  if (
    peRatio !== null &&
    peRatio > 0
  ) {
    if (
      peRatio <= 12
    ) {
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

  return parts.length >
    0
    ? average(parts)
    : 50;
}

function calculateRiskScore({
  debtToEquity,
  valuationRisk,
}: {
  debtToEquity:
    | number
    | null;
  valuationRisk:
    | number
    | null;
}) {
  const parts:
    number[] = [];

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
    valuationRisk !== null
  ) {
    parts.push(
      clampScore(
        valuationRisk
      )
    );
  }

  return parts.length >
    0
    ? average(parts)
    : 50;
}

function calculateConfidenceScore(
  checks:
    Array<
      number | null
    >
) {
  const available =
    checks.filter(
      (value) =>
        value !== null &&
        value !==
          undefined &&
        Number.isFinite(
          Number(
            value
          )
        )
    ).length;

  return clampScore(
    35 +
    (available /
      checks.length) *
      65
  );
}

function scoreToResearchRating(
  score: number
) {
  if (
    score >= 75
  ) {
    return "Strong Positive";
  }

  if (
    score >= 62
  ) {
    return "Positive";
  }

  if (
    score >= 45
  ) {
    return "Neutral";
  }

  if (
    score >= 32
  ) {
    return "Cautious";
  }

  return "Strong Caution";
}

function scoreToConsensus(
  score:
    | number
    | null
) {
  if (
    score === null
  ) {
    return "Unavailable";
  }

  if (
    score >= 4.5
  ) {
    return "Strong Buy";
  }

  if (
    score >= 3.6
  ) {
    return "Buy";
  }

  if (
    score >= 2.6
  ) {
    return "Hold";
  }

  if (
    score >= 1.6
  ) {
    return "Sell";
  }

  return "Strong Sell";
}

function scoreToValuationClassification(
  score: number
) {
  if (
    score >= 75
  ) {
    return "Attractive Signals";
  }

  if (
    score >= 60
  ) {
    return "Moderately Attractive";
  }

  if (
    score >= 45
  ) {
    return "Mixed / Fair";
  }

  if (
    score >= 30
  ) {
    return "Expensive Signals";
  }

  return "Very Expensive Signals";
}

function normalizePercentMetric(
  value:
    | number
    | null
) {
  if (
    value === null
  ) {
    return null;
  }

  return Math.abs(
    value
  ) <= 1
    ? value * 100
    : value;
}

function normalizeRatioMetric(
  value:
    | number
    | null
) {
  if (
    value === null
  ) {
    return null;
  }

  return Math.abs(
    value
  ) > 20
    ? value / 100
    : value;
}

function average(
  values: number[]
) {
  if (
    values.length === 0
  ) {
    return 50;
  }

  return clampScore(
    values.reduce(
      (
        sum,
        value
      ) =>
        sum +
        value,
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
      Math.round(
        value
      )
    )
  );
}

function dateToday() {
  return new Date()
    .toISOString()
    .slice(
      0,
      10
    );
}

function dateDaysAgo(
  days: number
) {
  const date =
    new Date();

  date.setDate(
    date.getDate() -
      days
  );

  return date
    .toISOString()
    .slice(
      0,
      10
    );
}

function dateYearsAgo(
  years: number
) {
  const date =
    new Date();

  date.setFullYear(
    date.getFullYear() -
      years
  );

  return date
    .toISOString()
    .slice(
      0,
      10
    );
}

function isPlainObject(
  value: unknown
): value is Record<
  string,
  unknown
> {
  return Boolean(
    value &&
      typeof value ===
        "object" &&
      !Array.isArray(
        value
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