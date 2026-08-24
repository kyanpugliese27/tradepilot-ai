import {
  NextRequest,
  NextResponse,
} from "next/server";
import OpenAI from "openai";

type FinancialRow = {
  period?: string;
  year?: number;
  quarter?: number;
  revenue?: number;
  grossProfit?: number;
  operatingIncome?: number;
  netIncome?: number;
  eps?: number;
  ebitda?: number;
  cash?: number;
  currentAssets?: number;
  totalAssets?: number;
  currentLiabilities?: number;
  totalLiabilities?: number;
  longTermDebt?: number;
  totalDebt?: number;
  totalEquity?: number;
  operatingCashFlow?: number;
  capitalExpenditure?: number;
  freeCashFlow?: number;
  investingCashFlow?: number;
  financingCashFlow?: number;
  dividendsPaid?: number;
  shareRepurchase?: number;
};

type FinancialSummary = {
  headline: string;
  overview: string;
  revenueTrend: string;
  profitabilityTrend: string;
  cashFlowTrend: string;
  balanceSheetTrend: string;
  risks: string[];
  positives: string[];
  disclaimer: string;
};

type BQReportedValue = {
  raw?: number | string | null;
  fmt?: string | null;
};

type BQValue = {
  date?: string;
  normalizedDate?: string;
  periodType?: string;
  reportedValue?: BQReportedValue;
};

type BQSection = {
  metadata?: {
    name?: string;
    name_short?: string;
    slug?: string;
    itemtype?: string;
    datatype?: string;
  };
  values?: BQValue[];
};

type BQCategory = {
  metadata?: Record<string, unknown>;
  sections?: Record<string, BQSection>;
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
  data?: Record<string, BQCategory>;
  error?: string;
  message?: string;
};

type LoadedStatement = {
  status: number | null;
  data: BQStatementResponse | null;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REQUEST_TIMEOUT_MS = 9_000;

const summarySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string" },
    overview: { type: "string" },
    revenueTrend: { type: "string" },
    profitabilityTrend: {
      type: "string",
    },
    cashFlowTrend: { type: "string" },
    balanceSheetTrend: {
      type: "string",
    },
    risks: {
      type: "array",
      maxItems: 5,
      items: { type: "string" },
    },
    positives: {
      type: "array",
      maxItems: 5,
      items: { type: "string" },
    },
    disclaimer: { type: "string" },
  },
  required: [
    "headline",
    "overview",
    "revenueTrend",
    "profitabilityTrend",
    "cashFlowTrend",
    "balanceSheetTrend",
    "risks",
    "positives",
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

    const frequency =
      request.nextUrl.searchParams.get(
        "frequency"
      ) === "quarterly"
        ? "quarterly"
        : "annual";

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

    const businessQuantFrequency =
      frequency === "quarterly"
        ? "Quarter"
        : "Annual";

    const [
      incomeResult,
      balanceResult,
      cashFlowResult,
    ] = await Promise.all([
      loadBusinessQuantStatement({
        symbol,
        statement: "IS",
        frequency:
          businessQuantFrequency,
        apiKey,
      }),
      loadBusinessQuantStatement({
        symbol,
        statement: "BS",
        frequency:
          businessQuantFrequency,
        apiKey,
      }),
      loadBusinessQuantStatement({
        symbol,
        statement: "CF",
        frequency:
          businessQuantFrequency,
        apiKey,
      }),
    ]);

    const rows = mergeBusinessQuantStatements({
      income: incomeResult.data,
      balance: balanceResult.data,
      cashFlow: cashFlowResult.data,
    }).slice(
      0,
      frequency === "annual" ? 6 : 8
    );

    const anyAvailable =
      rows.length > 0;

    const trends =
      calculateTrends(rows);

    let aiSummary:
      | FinancialSummary
      | null = null;

    if (
      process.env.OPENAI_API_KEY &&
      rows.length > 0
    ) {
      try {
        const response =
          await openai.responses.create({
            model: "gpt-5-mini",
            store: false,
            instructions: `
You are Norvexa, an educational financial-statement analyst.

Use only the supplied normalized statement data.

Rules:
- Never invent metrics, business drivers, guidance, forecasts, or company facts.
- Do not tell the user to buy, sell, or hold.
- Do not predict future returns.
- Clearly mention missing data.
- Explain direction and consistency of revenue, profitability, cash flow, debt, and equity.
- Keep the response concise enough for a stock-page dashboard.
`,
            input: JSON.stringify(
              {
                symbol,
                frequency,
                rows,
                trends,
              },
              null,
              2
            ),
            text: {
              format: {
                type: "json_schema",
                name: "financial_statement_summary",
                description:
                  "A structured educational analysis of supplied financial statements.",
                strict: true,
                schema: summarySchema,
              },
            },
          });

        if (response.output_text) {
          aiSummary = JSON.parse(
            response.output_text
          ) as FinancialSummary;
        }
      } catch (error) {
        console.warn(
          "Financial statement AI summary unavailable:",
          error
        );
      }
    }

    return NextResponse.json(
      {
        symbol,
        frequency,
        rows,
        trends,
        aiSummary,

        availability: {
          incomeStatement:
            hasStatementData(
              incomeResult.data
            ),

          balanceSheet:
            hasStatementData(
              balanceResult.data
            ),

          cashFlow:
            hasStatementData(
              cashFlowResult.data
            ),

          // Kept for compatibility with your
          // existing frontend. Business Quant
          // is not the old Finnhub premium gate.
          premiumBlocked: false,

          anyAvailable,

          statuses: {
            incomeStatement:
              incomeResult.status,

            balanceSheet:
              balanceResult.status,

            cashFlow:
              cashFlowResult.status,
          },
        },

        source:
          "Business Quant / SEC filings",

        generatedAt:
          new Date().toISOString(),
      },
      {
        headers: noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "Financial Statements API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load financial statements.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}

async function loadBusinessQuantStatement({
  symbol,
  statement,
  frequency,
  apiKey,
}: {
  symbol: string;
  statement: "IS" | "BS" | "CF";
  frequency: "Annual" | "Quarter";
  apiKey: string;
}): Promise<LoadedStatement> {
  const url = new URL(
    "https://data.businessquant.com/statements"
  );

  url.searchParams.set(
    "ticker",
    symbol
  );

  url.searchParams.set(
    "statement",
    statement
  );

  url.searchParams.set(
    "frequency",
    frequency
  );

  url.searchParams.set(
    "period",
    "10y"
  );

  url.searchParams.set(
    "api_key",
    apiKey
  );

  const controller =
    new AbortController();

  const timeout =
    setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

  try {
    const response =
      await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

    let data:
      | BQStatementResponse
      | null = null;

    try {
      data =
        (await response.json()) as BQStatementResponse;
    } catch {
      data = null;
    }

    if (!response.ok) {
      console.error(
        "Business Quant financial statement request failed:",
        {
          statement,
          status:
            response.status,
          error:
            data?.error ||
            data?.message ||
            null,
        }
      );

      return {
        status:
          response.status,
        data,
      };
    }

    return {
      status:
        response.status,
      data,
    };
  } catch (error) {
    console.error(
      "Business Quant financial statement fetch error:",
      {
        statement,
        error,
      }
    );

    return {
      status: null,
      data: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function hasStatementData(
  response:
    | BQStatementResponse
    | null
) {
  if (!response?.data) {
    return false;
  }

  for (const category of Object.values(
    response.data
  )) {
    for (const section of Object.values(
      category.sections || {}
    )) {
      if (
        Array.isArray(
          section.values
        ) &&
        section.values.length > 0
      ) {
        return true;
      }
    }
  }

  return false;
}

function mergeBusinessQuantStatements({
  income,
  balance,
  cashFlow,
}: {
  income:
    | BQStatementResponse
    | null;
  balance:
    | BQStatementResponse
    | null;
  cashFlow:
    | BQStatementResponse
    | null;
}) {
  const map =
    new Map<
      string,
      FinancialRow
    >();

  applyMetric(
    map,
    income,
    "revenue",
    [
      "revenue",
      "total-revenue",
      "revenues",
      "sales",
      "net-sales",
    ]
  );

  applyMetric(
    map,
    income,
    "grossProfit",
    [
      "gross-profit",
      "grossprofit",
    ]
  );

  applyMetric(
    map,
    income,
    "operatingIncome",
    [
      "operating-income",
      "income-from-operations",
      "operating-profit",
    ]
  );

  applyMetric(
    map,
    income,
    "netIncome",
    [
      "net-income",
      "net-income-towards-common-stockholders",
      "net-income-attributable-to-common-stockholders",
      "net-income-loss",
    ]
  );

  applyMetric(
    map,
    income,
    "eps",
    [
      "diluted-eps",
      "eps-diluted",
      "earnings-per-share-diluted",
      "basic-eps",
      "eps",
    ]
  );

  applyMetric(
    map,
    income,
    "ebitda",
    [
      "ebitda",
      "adjusted-ebitda",
    ]
  );

  applyMetric(
    map,
    balance,
    "cash",
    [
      "cash-and-cash-equivalents",
      "cash-cash-equivalents",
      "cash",
      "cash-and-short-term-investments",
    ]
  );

  applyMetric(
    map,
    balance,
    "currentAssets",
    [
      "total-current-assets",
      "current-assets",
    ]
  );

  applyMetric(
    map,
    balance,
    "totalAssets",
    [
      "total-assets",
      "assets",
    ]
  );

  applyMetric(
    map,
    balance,
    "currentLiabilities",
    [
      "total-current-liabilities",
      "current-liabilities",
    ]
  );

  applyMetric(
    map,
    balance,
    "totalLiabilities",
    [
      "total-liabilities",
      "liabilities",
    ]
  );

  applyMetric(
    map,
    balance,
    "longTermDebt",
    [
      "long-term-debt",
      "long-term-borrowings",
      "non-current-debt",
    ]
  );

  applyMetric(
    map,
    balance,
    "totalDebt",
    [
      "total-debt",
      "debt",
      "total-borrowings",
    ]
  );

  applyMetric(
    map,
    balance,
    "totalEquity",
    [
      "total-stockholders-equity",
      "stockholders-equity",
      "shareholders-equity",
      "total-equity",
      "equity",
    ]
  );

  applyMetric(
    map,
    cashFlow,
    "operatingCashFlow",
    [
      "cash-flow-from-operating-activities",
      "net-cash-provided-by-operating-activities",
      "operating-cash-flow",
      "cash-from-operating-activities",
    ]
  );

  applyMetric(
    map,
    cashFlow,
    "capitalExpenditure",
    [
      "capital-expenditures",
      "capital-expenditure",
      "capex",
      "purchase-of-property-plant-and-equipment",
      "purchases-of-property-plant-and-equipment",
    ]
  );

  applyMetric(
    map,
    cashFlow,
    "freeCashFlow",
    [
      "free-cash-flow",
      "fcf",
    ]
  );

  applyMetric(
    map,
    cashFlow,
    "investingCashFlow",
    [
      "cash-flow-from-investing-activities",
      "net-cash-used-in-investing-activities",
      "investing-cash-flow",
      "cash-from-investing-activities",
    ]
  );

  applyMetric(
    map,
    cashFlow,
    "financingCashFlow",
    [
      "cash-flow-from-financing-activities",
      "net-cash-provided-by-financing-activities",
      "financing-cash-flow",
      "cash-from-financing-activities",
    ]
  );

  applyMetric(
    map,
    cashFlow,
    "dividendsPaid",
    [
      "dividends-paid",
      "cash-dividends-paid",
      "payments-of-dividends",
    ]
  );

  applyMetric(
    map,
    cashFlow,
    "shareRepurchase",
    [
      "repurchase-of-stock",
      "share-repurchase",
      "repurchases-of-common-stock",
      "payments-for-repurchase-of-common-stock",
    ]
  );

  const rows =
    Array.from(
      map.values()
    );

  for (const row of rows) {
    if (
      row.freeCashFlow ===
        undefined &&
      row.operatingCashFlow !==
        undefined &&
      row.capitalExpenditure !==
        undefined
    ) {
      // Capex is commonly reported as a
      // negative cash outflow. If positive,
      // subtract it; if negative, add it.
      row.freeCashFlow =
        row.capitalExpenditure <=
        0
          ? row.operatingCashFlow +
            row.capitalExpenditure
          : row.operatingCashFlow -
            row.capitalExpenditure;
    }
  }

  return rows.sort(
    (a, b) =>
      normalizePeriod(
        b
      ).localeCompare(
        normalizePeriod(a)
      )
  );
}

function applyMetric(
  map: Map<
    string,
    FinancialRow
  >,
  response:
    | BQStatementResponse
    | null,
  field:
    keyof FinancialRow,
  aliases: string[]
) {
  const section =
    findSectionByAliases(
      response,
      aliases
    );

  if (!section?.values) {
    return;
  }

  for (const value of section.values) {
    const date =
      (
        value.normalizedDate ||
        value.date ||
        ""
      ).slice(0, 10);

    if (!date) {
      continue;
    }

    const raw =
      finiteOrUndefined(
        value.reportedValue?.raw
      );

    if (raw === undefined) {
      continue;
    }

    const existing =
      map.get(date) || {
        period: date,
        year:
          Number(
            date.slice(0, 4)
          ) || undefined,
        quarter:
          quarterFromDate(
            date
          ),
      };

    (existing as Record<
      string,
      unknown
    >)[field] = raw;

    map.set(
      date,
      existing
    );
  }
}

function findSectionByAliases(
  response:
    | BQStatementResponse
    | null,
  aliases: string[]
) {
  if (!response?.data) {
    return null;
  }

  const normalizedAliases =
    aliases.map(normalizeKey);

  let fuzzyMatch:
    | BQSection
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

function quarterFromDate(
  date: string
) {
  const month =
    Number(
      date.slice(5, 7)
    );

  if (
    !Number.isFinite(
      month
    ) ||
    month < 1 ||
    month > 12
  ) {
    return undefined;
  }

  return Math.ceil(
    month / 3
  );
}

function calculateTrends(
  rows: FinancialRow[]
) {
  return {
    revenueGrowthPercent:
      growth(
        rows[0]?.revenue,
        rows[1]?.revenue
      ),

    netIncomeGrowthPercent:
      growth(
        rows[0]?.netIncome,
        rows[1]?.netIncome
      ),

    freeCashFlowGrowthPercent:
      growth(
        rows[0]?.freeCashFlow,
        rows[1]?.freeCashFlow
      ),

    debtGrowthPercent:
      growth(
        rows[0]?.totalDebt,
        rows[1]?.totalDebt
      ),

    latestNetMarginPercent:
      ratio(
        rows[0]?.netIncome,
        rows[0]?.revenue
      ),

    latestOperatingMarginPercent:
      ratio(
        rows[0]?.operatingIncome,
        rows[0]?.revenue
      ),
  };
}

function growth(
  latest?: number,
  previous?: number
) {
  if (
    latest === undefined ||
    previous === undefined ||
    previous === 0
  ) {
    return null;
  }

  return (
    ((latest -
      previous) /
      Math.abs(
        previous
      )) *
    100
  );
}

function ratio(
  numerator?: number,
  denominator?: number
) {
  if (
    numerator === undefined ||
    denominator === undefined ||
    denominator === 0
  ) {
    return null;
  }

  return (
    (numerator /
      denominator) *
    100
  );
}

function normalizePeriod(
  row: FinancialRow
) {
  if (row.period) {
    return row.period;
  }

  return `${row.year ?? 0}-${String(
    row.quarter ?? 0
  ).padStart(2, "0")}`;
}

function finiteOrUndefined(
  value: unknown
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return undefined;
  }

  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue
  )
    ? numberValue
    : undefined;
}

function noStoreHeaders() {
  return {
    "Cache-Control":
      "private, no-cache, no-store, max-age=0, must-revalidate",

    Pragma: "no-cache",

    Expires: "0",
  };
}