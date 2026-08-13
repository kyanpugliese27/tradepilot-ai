import { NextRequest, NextResponse } from "next/server";
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

type FinnhubFinancialResponse = {
  symbol?: string;
  financials?: Record<string, unknown>[];
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
    profitabilityTrend: { type: "string" },
    cashFlowTrend: { type: "string" },
    balanceSheetTrend: { type: "string" },
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

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "FINNHUB_API_KEY is missing from .env.local.",
        },
        {
          status: 500,
          headers: noStoreHeaders(),
        }
      );
    }

    const symbol = request.nextUrl.searchParams
      .get("symbol")
      ?.trim()
      .toUpperCase();

    const frequency =
      request.nextUrl.searchParams.get("frequency") ===
      "quarterly"
        ? "quarterly"
        : "annual";

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

    const statementTypes = [
      "ic",
      "bs",
      "cf",
    ] as const;

    const results = await Promise.all(
      statementTypes.map((statement) =>
        loadStatement({
          symbol,
          statement,
          frequency,
          apiKey,
        })
      )
    );

    const [incomeResult, balanceResult, cashFlowResult] =
      results;

    const premiumBlocked = results.every(
      (result) =>
        result.status === 401 ||
        result.status === 403
    );

    const anyAvailable = results.some(
      (result) =>
        Array.isArray(result.financials) &&
        result.financials.length > 0
    );

    const rows = mergeStatements({
      income:
        incomeResult.financials ?? [],
      balance:
        balanceResult.financials ?? [],
      cashFlow:
        cashFlowResult.financials ?? [],
    }).slice(0, frequency === "annual" ? 6 : 8);

    const trends = calculateTrends(rows);

    let aiSummary: FinancialSummary | null = null;

    if (
      process.env.OPENAI_API_KEY &&
      rows.length > 0
    ) {
      try {
        const response = await openai.responses.create({
          model: "gpt-5-mini",
          store: false,
          instructions: `
You are TradePilot AI, an educational financial-statement analyst.

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
            incomeResult.financials.length > 0,
          balanceSheet:
            balanceResult.financials.length > 0,
          cashFlow:
            cashFlowResult.financials.length > 0,
          premiumBlocked,
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

async function loadStatement({
  symbol,
  statement,
  frequency,
  apiKey,
}: {
  symbol: string;
  statement: "ic" | "bs" | "cf";
  frequency: "annual" | "quarterly";
  apiKey: string;
}) {
  const url = new URL(
    "https://finnhub.io/api/v1/stock/financials"
  );

  url.searchParams.set("symbol", symbol);
  url.searchParams.set("statement", statement);
  url.searchParams.set("freq", frequency);
  url.searchParams.set("token", apiKey);

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return {
        status: response.status,
        financials: [] as Record<string, unknown>[],
      };
    }

    const data =
      (await response.json()) as FinnhubFinancialResponse;

    return {
      status: response.status,
      financials: Array.isArray(data.financials)
        ? data.financials
        : [],
    };
  } catch {
    return {
      status: null,
      financials: [] as Record<string, unknown>[],
    };
  } finally {
    clearTimeout(timeout);
  }
}

function mergeStatements({
  income,
  balance,
  cashFlow,
}: {
  income: Record<string, unknown>[];
  balance: Record<string, unknown>[];
  cashFlow: Record<string, unknown>[];
}) {
  const map = new Map<string, FinancialRow>();

  for (const row of income) {
    const key = periodKey(row);

    map.set(key, {
      ...(map.get(key) ?? {}),
      period: stringValue(
        row.period || row.endDate || row.date
      ),
      year: integerOrNull(row.year) ?? undefined,
      quarter:
        integerOrNull(row.quarter) ?? undefined,
      revenue: firstNumber(row, [
        "revenue",
        "totalRevenue",
        "Revenue",
      ]),
      grossProfit: firstNumber(row, [
        "grossProfit",
        "Gross Profit",
      ]),
      operatingIncome: firstNumber(row, [
        "operatingIncome",
        "Operating Income",
      ]),
      netIncome: firstNumber(row, [
        "netIncome",
        "Net Income",
      ]),
      eps: firstNumber(row, [
        "eps",
        "epsDiluted",
        "dilutedEPS",
      ]),
      ebitda: firstNumber(row, [
        "ebitda",
        "EBITDA",
      ]),
    });
  }

  for (const row of balance) {
    const key = periodKey(row);

    map.set(key, {
      ...(map.get(key) ?? {}),
      period:
        map.get(key)?.period ||
        stringValue(
          row.period || row.endDate || row.date
        ),
      year:
        map.get(key)?.year ||
        integerOrNull(row.year) ||
        undefined,
      quarter:
        map.get(key)?.quarter ||
        integerOrNull(row.quarter) ||
        undefined,
      cash: firstNumber(row, [
        "cash",
        "cashAndCashEquivalents",
        "cashEquivalents",
      ]),
      currentAssets: firstNumber(row, [
        "totalCurrentAssets",
        "currentAssets",
      ]),
      totalAssets: firstNumber(row, [
        "totalAssets",
      ]),
      currentLiabilities: firstNumber(row, [
        "totalCurrentLiabilities",
        "currentLiabilities",
      ]),
      totalLiabilities: firstNumber(row, [
        "totalLiabilities",
      ]),
      longTermDebt: firstNumber(row, [
        "longTermDebt",
        "longTermDebtTotal",
      ]),
      totalDebt: firstNumber(row, [
        "totalDebt",
        "debt",
      ]),
      totalEquity: firstNumber(row, [
        "totalStockholdersEquity",
        "totalEquity",
        "shareholderEquity",
      ]),
    });
  }

  for (const row of cashFlow) {
    const key = periodKey(row);

    const operatingCashFlow = firstNumber(row, [
      "cashFromOperatingActivities",
      "operatingCashFlow",
      "netCashProvidedByOperatingActivities",
    ]);

    const capitalExpenditure = firstNumber(row, [
      "capitalExpenditures",
      "capitalExpenditure",
      "capex",
    ]);

    map.set(key, {
      ...(map.get(key) ?? {}),
      period:
        map.get(key)?.period ||
        stringValue(
          row.period || row.endDate || row.date
        ),
      year:
        map.get(key)?.year ||
        integerOrNull(row.year) ||
        undefined,
      quarter:
        map.get(key)?.quarter ||
        integerOrNull(row.quarter) ||
        undefined,
      operatingCashFlow,
      capitalExpenditure,
      freeCashFlow:
        operatingCashFlow !== undefined &&
        capitalExpenditure !== undefined
          ? operatingCashFlow +
            capitalExpenditure
          : firstNumber(row, [
              "freeCashFlow",
            ]),
      investingCashFlow: firstNumber(row, [
        "cashFromInvestingActivities",
        "investingCashFlow",
      ]),
      financingCashFlow: firstNumber(row, [
        "cashFromFinancingActivities",
        "financingCashFlow",
      ]),
      dividendsPaid: firstNumber(row, [
        "dividendsPaid",
        "cashDividendsPaid",
      ]),
      shareRepurchase: firstNumber(row, [
        "repurchaseOfStock",
        "stockRepurchased",
      ]),
    });
  }

  return Array.from(map.values()).sort((a, b) =>
    normalizePeriod(b).localeCompare(
      normalizePeriod(a)
    )
  );
}

function calculateTrends(rows: FinancialRow[]) {
  return {
    revenueGrowthPercent: growth(
      rows[0]?.revenue,
      rows[1]?.revenue
    ),
    netIncomeGrowthPercent: growth(
      rows[0]?.netIncome,
      rows[1]?.netIncome
    ),
    freeCashFlowGrowthPercent: growth(
      rows[0]?.freeCashFlow,
      rows[1]?.freeCashFlow
    ),
    debtGrowthPercent: growth(
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
    ((latest - previous) /
      Math.abs(previous)) *
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
    (numerator / denominator) *
    100
  );
}

function periodKey(
  row: Record<string, unknown>
) {
  return (
    stringValue(
      row.period || row.endDate || row.date
    ) ||
    `${integerOrNull(row.year) ?? "Y"}-${
      integerOrNull(row.quarter) ?? "Q"
    }`
  );
}

function normalizePeriod(row: FinancialRow) {
  if (row.period) {
    return row.period;
  }

  return `${row.year ?? 0}-${String(
    row.quarter ?? 0
  ).padStart(2, "0")}`;
}

function firstNumber(
  row: Record<string, unknown>,
  keys: string[]
) {
  for (const key of keys) {
    const numberValue = Number(row[key]);

    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  return undefined;
}

function integerOrNull(
  value: unknown
): number | null {
  const numberValue = Number(value);

  return Number.isInteger(numberValue)
    ? numberValue
    : null;
}

function stringValue(value: unknown) {
  return typeof value === "string"
    ? value.slice(0, 20)
    : "";
}

function noStoreHeaders() {
  return {
    "Cache-Control":
      "private, no-cache, no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}