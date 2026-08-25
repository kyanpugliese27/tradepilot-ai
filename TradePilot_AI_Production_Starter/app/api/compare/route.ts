import {
  NextRequest,
  NextResponse,
} from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

type StockQuote = {
  symbol: string;
  name?: string;
  logo?: string;
  exchange?: string;
  industry?: string;
  country?: string;
  currency?: string;
  website?: string;
  marketCapitalization?: number | null;
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

type FundamentalsResponse = {
  symbol?: string;
  metrics?: {
    peRatio?: number | null;
    eps?: number | null;
    revenuePerShare?: number | null;
    netProfitMargin?: number | null;
    grossMargin?: number | null;
    operatingMargin?: number | null;
    week52High?: number | null;
    week52Low?: number | null;
    beta?: number | null;
    dividendYield?: number | null;
    averageVolume10Day?: number | null;
    averageVolume3Month?: number | null;
    marketCapitalization?: number | null;
    priceToBook?: number | null;
    currentRatio?: number | null;
    debtToEquity?: number | null;
    returnOnEquity?: number | null;
  };
  peers?: string[];
  updatedAt?: string;
};

type NewsArticle = {
  headline?: string;
  summary?: string;
  source?: string;
  url?: string;
  image?: string;
  datetime?: number;
};

type CompanyBundle = {
  symbol: string;
  quote: StockQuote;
  fundamentals: FundamentalsResponse;
  news: NewsArticle[];
};

type AIComparison = {
  headline: string;
  overview: string;
  leftStrengths: string[];
  rightStrengths: string[];
  sharedRisks: string[];
  keyDifferences: string[];
  educationalVerdict: string;
  disclaimer: string;
};

type BQQuote = {
  ticker?: string;
  name?: string;
  name_short?: string;
  exchange?: string;
  price?: number;
  pricechange?: number;
  pricechange_pct?: number;
  pricedate?: string;
  currency?: string;
};

type BQPeerRow = {
  ticker?: string;
  companyname?: string;
  companyname_short?: string;
  sector?: string;
  industry?: string;
  "Market Cap"?: number;
};

type BQPeersResponse = {
  metadata?: {
    sector?: string;
    industry?: string;
  };
  data?: BQPeerRow[];
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
  sections?: Record<string, BQStatementSection>;
};

type BQStatementResponse = {
  data?: Record<string, BQStatementCategory>;
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

type FetchResult = {
  ok: boolean;
  status: number | null;
  data: unknown;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REQUEST_TIMEOUT_MS = 9_000;

const comparisonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string" },
    overview: { type: "string" },
    leftStrengths: {
      type: "array",
      items: { type: "string" },
      maxItems: 4,
    },
    rightStrengths: {
      type: "array",
      items: { type: "string" },
      maxItems: 4,
    },
    sharedRisks: {
      type: "array",
      items: { type: "string" },
      maxItems: 4,
    },
    keyDifferences: {
      type: "array",
      items: { type: "string" },
      maxItems: 5,
    },
    educationalVerdict: {
      type: "string",
    },
    disclaimer: {
      type: "string",
    },
  },
  required: [
    "headline",
    "overview",
    "leftStrengths",
    "rightStrengths",
    "sharedRisks",
    "keyDifferences",
    "educationalVerdict",
    "disclaimer",
  ],
} as const;

export async function GET(
  request: NextRequest
) {
  try {
    const supabase =
      await createClient();

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error:
            "You must be signed in.",
        },
        {
          status: 401,
          headers:
            noStoreHeaders(),
        }
      );
    }

    const apiKey =
      process.env
        .BUSINESSQUANT_API_KEY;

    if (!apiKey) {
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

    const leftSymbol =
      normalizeSymbol(
        request.nextUrl.searchParams.get(
          "left"
        ) ?? ""
      );

    const rightSymbol =
      normalizeSymbol(
        request.nextUrl.searchParams.get(
          "right"
        ) ?? ""
      );

    if (
      !isValidSymbol(leftSymbol) ||
      !isValidSymbol(rightSymbol)
    ) {
      return NextResponse.json(
        {
          error:
            "Enter two valid stock symbols.",
        },
        {
          status: 400,
          headers:
            noStoreHeaders(),
        }
      );
    }

    if (
      leftSymbol ===
      rightSymbol
    ) {
      return NextResponse.json(
        {
          error:
            "Choose two different stocks to compare.",
        },
        {
          status: 400,
          headers:
            noStoreHeaders(),
        }
      );
    }

    /*
     * IMPORTANT:
     * Do not server-fetch Norvexa's own
     * /api/stock-competitors route here.
     *
     * On Vercel preview deployments, a
     * server-to-self request can be blocked
     * by deployment protection even though
     * the same URL works in the browser.
     *
     * Instead, load both stocks directly
     * from Business Quant.
     */
    const [left, right] =
      await Promise.all([
        loadCompanyBundle(
          leftSymbol,
          apiKey
        ),
        loadCompanyBundle(
          rightSymbol,
          apiKey
        ),
      ]);

    if (!left || !right) {
      return NextResponse.json(
        {
          error:
            "One or both stocks could not be loaded. Check the ticker symbols and try again.",
        },
        {
          status: 404,
          headers:
            noStoreHeaders(),
        }
      );
    }

    let aiComparison:
      | AIComparison
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
You are Norvexa, an educational stock-comparison assistant.

Compare only the two supplied companies using only the supplied quote, fundamentals, and news data.

Rules:
- Never invent revenue, earnings, debt, valuation, analyst targets, business facts, or news.
- Never predict future returns.
- Do not tell the user to buy, sell, or hold.
- Clearly identify when a metric is unavailable.
- Keep the response concise and suitable for a comparison page.
- Strengths and risks must be supported by supplied data.
- The educational verdict should explain which company appears stronger on which visible dimensions, not declare an investment winner.
`,

              input: `
Left company:
${JSON.stringify(
  left,
  null,
  2
)}

Right company:
${JSON.stringify(
  right,
  null,
  2
)}
`,

              text: {
                format: {
                  type:
                    "json_schema",

                  name:
                    "stock_comparison",

                  description:
                    "A structured educational comparison of two stocks.",

                  strict:
                    true,

                  schema:
                    comparisonSchema,
                },
              },
            }
          );

        if (
          response.output_text
        ) {
          aiComparison =
            JSON.parse(
              response.output_text
            ) as AIComparison;
        }
      } catch (error) {
        console.warn(
          "AI comparison unavailable:",
          error
        );
      }
    }

    return NextResponse.json(
      {
        left,
        right,
        aiComparison,

        source:
          "Business Quant",

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
      "Compare API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to compare these stocks.",
      },
      {
        status: 500,
        headers:
          noStoreHeaders(),
      }
    );
  }
}

async function loadCompanyBundle(
  symbol: string,
  apiKey: string
): Promise<
  CompanyBundle | null
> {
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
    apiKey
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
    apiKey
  );

  const dividendsUrl =
    new URL(
      "https://data.businessquant.com/dividends"
    );

  dividendsUrl.searchParams.set(
    "ticker",
    symbol
  );

  dividendsUrl.searchParams.set(
    "mode",
    "dps"
  );

  dividendsUrl.searchParams.set(
    "api_key",
    apiKey
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
    apiKey
  );

  const peersUrl =
    new URL(
      "https://data.businessquant.com/peers"
    );

  peersUrl.searchParams.set(
    "ticker",
    symbol
  );

  peersUrl.searchParams.set(
    "api_key",
    apiKey
  );

  const [
    quoteResult,
    ratiosResult,
    dividendResult,
    historyResult,
    peersResult,
  ] =
    await Promise.all([
      fetchOptionalJson(
        quoteUrl
      ),

      fetchOptionalJson(
        ratiosUrl
      ),

      fetchOptionalJson(
        dividendsUrl
      ),

      fetchOptionalJson(
        historyUrl
      ),

      fetchOptionalJson(
        peersUrl
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
        normalizeSymbol(
          item.ticker || ""
        ) === symbol
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
    return null;
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

  const peers =
    isPlainObject(
      peersResult.data
    )
      ? (
          peersResult.data as BQPeersResponse
        )
      : null;

  const peerRows =
    Array.isArray(
      peers?.data
    )
      ? peers!.data!
      : [];

  const selfPeer =
    peerRows.find(
      (item) =>
        normalizeSymbol(
          item.ticker || ""
        ) === symbol
    ) || null;

  const peerSymbols =
    peerRows
      .map(
        (item) =>
          normalizeSymbol(
            item.ticker || ""
          )
      )
      .filter(
        (item) =>
          isValidSymbol(
            item
          ) &&
          item !== symbol
      )
      .slice(
        0,
        10
      );

  const currentPrice =
    finiteNumber(
      quote.price
    );

  if (
    currentPrice <= 0
  ) {
    return null;
  }

  const changePercent =
    finiteNumber(
      quote.pricechange_pct
    );

  const change =
    finiteNumber(
      quote.pricechange
    );

  const previousClose =
    currentPrice -
    change;

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

  const rawYield =
    finiteOrNull(
      dividends
        ?.metadata
        ?.divyield
    );

  const marketCap =
    finiteOrNull(
      selfPeer?.[
        "Market Cap"
      ]
    );

  const quoteBundle:
    StockQuote = {
    symbol,

    name:
      quote.name ||
      quote.name_short ||
      selfPeer?.companyname ||
      selfPeer
        ?.companyname_short ||
      symbol,

    logo:
      "",

    exchange:
      quote.exchange ||
      "",

    industry:
      selfPeer?.industry ||
      peers?.metadata
        ?.industry ||
      "",

    country:
      "",

    currency:
      quote.currency ||
      "USD",

    website:
      "",

    marketCapitalization:
      marketCap,

    price:
      currentPrice,

    change,

    changePercent,

    /*
     * We do not invent today's OHLC.
     * The comparison page contract
     * requires these fields, so use
     * current/previous values only as
     * neutral placeholders.
     */
    high:
      currentPrice,

    low:
      currentPrice,

    open:
      previousClose > 0
        ? previousClose
        : currentPrice,

    previousClose:
      previousClose > 0
        ? previousClose
        : currentPrice,

    timestamp:
      Math.floor(
        Date.now() /
          1000
      ),

    stale:
      false,
  };

  const fundamentals:
    FundamentalsResponse = {
    symbol,

    metrics: {
      peRatio:
        latestMetric(
          ratios,
          [
            "P/E Ratio",
            "PE Ratio",
            "Price to Earnings",
            "Price Earnings Ratio",
          ]
        ),

      eps:
        latestMetric(
          ratios,
          [
            "Diluted EPS",
            "EPS Diluted",
            "Earnings Per Share Diluted",
            "Basic EPS",
            "EPS",
          ]
        ),

      netProfitMargin:
        normalizePercentMetric(
          latestMetric(
            ratios,
            [
              "Net Profit Margin",
              "Net Margin",
              "Profit Margin",
            ]
          )
        ),

      grossMargin:
        normalizePercentMetric(
          latestMetric(
            ratios,
            [
              "Gross Margin",
              "Gross Profit Margin",
            ]
          )
        ),

      operatingMargin:
        normalizePercentMetric(
          latestMetric(
            ratios,
            [
              "Operating Margin",
              "Operating Profit Margin",
            ]
          )
        ),

      week52High:
        highs.length > 0
          ? Math.max(
              ...highs
            )
          : null,

      week52Low:
        lows.length > 0
          ? Math.min(
              ...lows
            )
          : null,

      beta:
        null,

      dividendYield:
        rawYield !== null
          ? rawYield *
            100
          : null,

      marketCapitalization:
        marketCap,

      priceToBook:
        latestMetric(
          ratios,
          [
            "P/B Ratio",
            "PB Ratio",
            "Price to Book",
            "Price Book Ratio",
          ]
        ),

      currentRatio:
        latestMetric(
          ratios,
          [
            "Current Ratio",
          ]
        ),

      debtToEquity:
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
        ),

      returnOnEquity:
        normalizePercentMetric(
          latestMetric(
            ratios,
            [
              "Return on Equity",
              "ROE",
            ]
          )
        ),
    },

    peers:
      peerSymbols,

    updatedAt:
      new Date().toISOString(),
  };

  /*
   * News is optional for Compare.
   * Leaving this empty prevents another
   * internal server-to-self API request
   * from breaking the entire comparison.
   */
  const news:
    NewsArticle[] = [];

  return {
    symbol,
    quote:
      quoteBundle,
    fundamentals,
    news,
  };
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
          .filter(
            Boolean
          )
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

function normalizeSymbol(
  value: string
) {
  return value
    .trim()
    .toUpperCase();
}

function isValidSymbol(
  value: string
) {
  return /^[A-Z0-9.-]{1,15}$/.test(
    value
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