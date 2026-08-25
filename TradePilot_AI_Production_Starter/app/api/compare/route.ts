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

type CompetitorCompany = {
  symbol?: string;
  name?: string;
  logo?: string;
  price?: number;
  changePercent?: number;
  marketCapitalization?: number | null;
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

type CompetitorResponse = {
  companies?: CompetitorCompany[];
  peerSymbols?: string[];
  generatedAt?: string;
  error?: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    if (
      userError ||
      !user
    ) {
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
      !isValidSymbol(
        leftSymbol
      ) ||
      !isValidSymbol(
        rightSymbol
      )
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

    const origin =
      request.nextUrl.origin;

    const [left, right] =
      await Promise.all([
        loadCompanyBundle(
          origin,
          leftSymbol
        ),
        loadCompanyBundle(
          origin,
          rightSymbol
        ),
      ]);

    if (
      !left ||
      !right
    ) {
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
  origin: string,
  symbol: string
): Promise<
  CompanyBundle | null
> {
  const [
    comparisonData,
    newsData,
  ] =
    await Promise.all([
      fetchJson(
        `${origin}/api/stock-competitors?symbol=${encodeURIComponent(
          symbol
        )}`
      ),

      fetchJson(
        `${origin}/api/stock-news?symbol=${encodeURIComponent(
          symbol
        )}`
      ),
    ]);

  const companies =
    Array.isArray(
      (
        comparisonData as
          | CompetitorResponse
          | null
      )?.companies
    )
      ? (
          comparisonData as CompetitorResponse
        ).companies || []
      : [];

  const company =
    companies.find(
      (item) =>
        normalizeSymbol(
          item.symbol || ""
        ) === symbol
    ) ||
    companies[0] ||
    null;

  if (!company) {
    return null;
  }

  const price =
    finiteNumber(
      company.price
    );

  if (
    price <= 0
  ) {
    return null;
  }

  const changePercent =
    finiteNumber(
      company.changePercent
    );

  const denominator =
    1 +
    changePercent /
      100;

  const previousClose =
    denominator > 0
      ? price /
        denominator
      : price;

  const change =
    price -
    previousClose;

  const quote:
    StockQuote = {
    symbol,

    name:
      company.name ||
      symbol,

    logo:
      company.logo ||
      "",

    price,

    change,

    changePercent,

    /*
     * The competitor endpoint gives us
     * current price and 52-week range, but
     * not today's OHLC values. Keeping the
     * current price here preserves the
     * comparison-page contract without
     * inventing intraday values.
     */
    high:
      price,

    low:
      price,

    open:
      previousClose,

    previousClose,

    timestamp:
      Math.floor(
        Date.now() /
          1000
      ),

    marketCapitalization:
      finiteOrNull(
        company.marketCapitalization
      ),

    currency:
      "USD",

    stale:
      false,
  };

  const fundamentals:
    FundamentalsResponse = {
    symbol,

    metrics: {
      peRatio:
        finiteOrNull(
          company.peRatio
        ),

      eps:
        finiteOrNull(
          company.eps
        ),

      netProfitMargin:
        finiteOrNull(
          company.netProfitMargin
        ),

      grossMargin:
        finiteOrNull(
          company.grossMargin
        ),

      operatingMargin:
        finiteOrNull(
          company.operatingMargin
        ),

      week52High:
        finiteOrNull(
          company.week52High
        ),

      week52Low:
        finiteOrNull(
          company.week52Low
        ),

      beta:
        finiteOrNull(
          company.beta
        ),

      dividendYield:
        finiteOrNull(
          company.dividendYield
        ),

      marketCapitalization:
        finiteOrNull(
          company.marketCapitalization
        ),

      priceToBook:
        finiteOrNull(
          company.priceToBook
        ),

      currentRatio:
        finiteOrNull(
          company.currentRatio
        ),

      debtToEquity:
        finiteOrNull(
          company.debtToEquity
        ),

      returnOnEquity:
        finiteOrNull(
          company.returnOnEquity
        ),
    },

    peers:
      Array.isArray(
        (
          comparisonData as
            | CompetitorResponse
            | null
        )?.peerSymbols
      )
        ? (
            comparisonData as CompetitorResponse
          ).peerSymbols
        : [],

    updatedAt:
      typeof (
        comparisonData as
          | CompetitorResponse
          | null
      )?.generatedAt ===
      "string"
        ? (
            comparisonData as CompetitorResponse
          ).generatedAt
        : new Date().toISOString(),
  };

  const news =
    Array.isArray(
      newsData?.articles
    )
      ? (
          newsData.articles as NewsArticle[]
        ).slice(
          0,
          5
        )
      : [];

  return {
    symbol,
    quote,
    fundamentals,
    news,
  };
}

async function fetchJson(
  url: string
): Promise<
  Record<
    string,
    any
  > | null
> {
  try {
    const response =
      await fetch(
        url,
        {
          cache:
            "no-store",

          headers: {
            "Cache-Control":
              "no-cache, no-store",
          },
        }
      );

    if (!response.ok) {
      return null;
    }

    const contentType =
      response.headers.get(
        "content-type"
      ) || "";

    if (
      !contentType.includes(
        "application/json"
      )
    ) {
      return null;
    }

    return (
      await response.json()
    ) as Record<
      string,
      any
    >;
  } catch {
    return null;
  }
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