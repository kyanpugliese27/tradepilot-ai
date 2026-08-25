import {
  NextRequest,
  NextResponse,
} from "next/server";

type CompanyComparison = {
  symbol: string;
  name: string;
  logo: string;
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
    filter_used?: string;
    sector?: string;
    industry?: string;
    total_peers?: number;
  };
  data?: BQPeerRow[];
};

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

type FetchResult = {
  ok: boolean;
  status: number | null;
  data: unknown;
};

export const dynamic =
  "force-dynamic";
export const revalidate = 0;

const MAX_COMPANIES = 4;
const REQUEST_TIMEOUT_MS = 9_000;

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

    const symbol = normalizeSymbol(
      request.nextUrl.searchParams.get("symbol") || ""
    );

    if (!isValidSymbol(symbol)) {
      return NextResponse.json(
        { error: "A valid stock symbol is required." },
        { status: 400, headers: noStoreHeaders() }
      );
    }

    const requestedPeers = (
      request.nextUrl.searchParams.get("peers") || ""
    )
      .split(",")
      .map(normalizeSymbol)
      .filter(
        (item) =>
          isValidSymbol(item) &&
          item !== symbol
      );

    const peersUrl = new URL(
      "https://data.businessquant.com/peers"
    );
    peersUrl.searchParams.set("ticker", symbol);
    peersUrl.searchParams.set("api_key", apiKey);

    const peersResult =
      await fetchOptionalJson(peersUrl);

    const peersPayload = isPlainObject(peersResult.data)
      ? (peersResult.data as BQPeersResponse)
      : null;

    const peerRows = Array.isArray(peersPayload?.data)
      ? peersPayload!.data!
      : [];

    const basePeerRow =
      peerRows.find(
        (item) =>
          normalizeSymbol(item.ticker || "") === symbol
      ) || null;

    const baseMarketCap = finiteOrNull(
      basePeerRow?.["Market Cap"]
    );

    const automaticPeers = peerRows
      .filter((item) => {
        const ticker = normalizeSymbol(item.ticker || "");
        return isValidSymbol(ticker) && ticker !== symbol;
      })
      .sort(
        (a, b) =>
          peerDistance(
            finiteOrNull(a["Market Cap"]),
            baseMarketCap
          ) -
          peerDistance(
            finiteOrNull(b["Market Cap"]),
            baseMarketCap
          )
      )
      .map((item) => normalizeSymbol(item.ticker || ""));

    const peerSymbols = Array.from(
      new Set([
        ...requestedPeers,
        ...automaticPeers,
      ])
    ).slice(0, MAX_COMPANIES - 1);

    const symbols = [symbol, ...peerSymbols];

    const companies = (
      await Promise.all(
        symbols.map((item) =>
          loadCompany(item, apiKey, peerRows)
        )
      )
    ).filter(
      (item): item is CompanyComparison =>
        item !== null
    );

    if (companies.length === 0) {
      return NextResponse.json(
        { error: "No comparison data was available." },
        { status: 404, headers: noStoreHeaders() }
      );
    }

    return NextResponse.json(
      {
        symbol,
        companies,
        peerSymbols: companies
          .slice(1)
          .map((company) => company.symbol),
        peerGroup: {
          sector:
            peersPayload?.metadata?.sector || null,
          industry:
            peersPayload?.metadata?.industry || null,
          totalPeers: finiteOrNull(
            peersPayload?.metadata?.total_peers
          ),
        },
        winners: calculateWinners(companies),
        availability: {
          peers:
            peersResult.ok && peerRows.length > 0,
          peerStatus: peersResult.status,
        },
        source: "Business Quant",
        generatedAt: new Date().toISOString(),
      },
      { headers: noStoreHeaders() }
    );
  } catch (error) {
    console.error(
      "Competitor comparison API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load competitor data.",
      },
      { status: 500, headers: noStoreHeaders() }
    );
  }
}

async function loadCompany(
  symbol: string,
  apiKey: string,
  peerRows: BQPeerRow[]
): Promise<CompanyComparison | null> {
  const quoteUrl = new URL(
    "https://data.businessquant.com/quotes"
  );
  quoteUrl.searchParams.set("ticker", symbol);
  quoteUrl.searchParams.set("mode", "snapshot");
  quoteUrl.searchParams.set("api_key", apiKey);

  const ratiosUrl = new URL(
    "https://data.businessquant.com/statements"
  );
  ratiosUrl.searchParams.set("ticker", symbol);
  ratiosUrl.searchParams.set("statement", "Ratios");
  ratiosUrl.searchParams.set("frequency", "TTM");
  ratiosUrl.searchParams.set("period", "5y");
  ratiosUrl.searchParams.set("api_key", apiKey);

  const dividendsUrl = new URL(
    "https://data.businessquant.com/dividends"
  );
  dividendsUrl.searchParams.set("ticker", symbol);
  dividendsUrl.searchParams.set("mode", "dps");
  dividendsUrl.searchParams.set("api_key", apiKey);

  const historyUrl = new URL(
    "https://data.businessquant.com/quotes"
  );
  historyUrl.searchParams.set("ticker", symbol);
  historyUrl.searchParams.set("mode", "eod");
  historyUrl.searchParams.set("period", "1y");
  historyUrl.searchParams.set("limit", "500");
  historyUrl.searchParams.set("api_key", apiKey);

  const [
    quoteResult,
    ratiosResult,
    dividendResult,
    historyResult,
  ] = await Promise.all([
    fetchOptionalJson(quoteUrl),
    fetchOptionalJson(ratiosUrl),
    fetchOptionalJson(dividendsUrl),
    fetchOptionalJson(historyUrl),
  ]);

  const quotes = Array.isArray(quoteResult.data)
    ? (quoteResult.data as BQQuote[])
    : [];

  const quote =
    quotes.find(
      (item) =>
        normalizeSymbol(item.ticker || "") === symbol
    ) ||
    quotes[0] ||
    null;

  if (
    !quoteResult.ok ||
    !quote ||
    !Number.isFinite(Number(quote.price))
  ) {
    return null;
  }

  const ratios = isPlainObject(ratiosResult.data)
    ? (ratiosResult.data as BQStatementResponse)
    : null;

  const dividends = isPlainObject(dividendResult.data)
    ? (dividendResult.data as BQDividendResponse)
    : null;

  const history = isPlainObject(historyResult.data)
    ? (historyResult.data as BQHistoryResponse)
    : null;

  const peerRow =
    peerRows.find(
      (item) =>
        normalizeSymbol(item.ticker || "") === symbol
    ) || null;

  const highs = Array.isArray(history?.data)
    ? history!.data!
        .map((row) => finiteOrNull(row.high))
        .filter((value): value is number => value !== null)
    : [];

  const lows = Array.isArray(history?.data)
    ? history!.data!
        .map((row) => finiteOrNull(row.low))
        .filter((value): value is number => value !== null)
    : [];

  const rawYield = finiteOrNull(
    dividends?.metadata?.divyield
  );

  return {
    symbol,
    name:
      quote.name ||
      quote.name_short ||
      peerRow?.companyname ||
      peerRow?.companyname_short ||
      symbol,
    logo: "",
    price: finiteNumber(quote.price),
    changePercent: finiteNumber(quote.pricechange_pct),
    marketCapitalization: finiteOrNull(
      peerRow?.["Market Cap"]
    ),
    peRatio: latestMetric(ratios, [
      "P/E Ratio",
      "PE Ratio",
      "Price to Earnings",
      "Price Earnings Ratio",
    ]),
    eps: latestMetric(ratios, [
      "Diluted EPS",
      "EPS Diluted",
      "Earnings Per Share Diluted",
      "Basic EPS",
      "EPS",
    ]),
    netProfitMargin: normalizePercentMetric(
      latestMetric(ratios, [
        "Net Profit Margin",
        "Net Margin",
        "Profit Margin",
      ])
    ),
    grossMargin: normalizePercentMetric(
      latestMetric(ratios, [
        "Gross Margin",
        "Gross Profit Margin",
      ])
    ),
    operatingMargin: normalizePercentMetric(
      latestMetric(ratios, [
        "Operating Margin",
        "Operating Profit Margin",
      ])
    ),
    beta: null,
    dividendYield:
      rawYield !== null ? rawYield * 100 : null,
    priceToBook: latestMetric(ratios, [
      "P/B Ratio",
      "PB Ratio",
      "Price to Book",
      "Price Book Ratio",
    ]),
    currentRatio: latestMetric(ratios, [
      "Current Ratio",
    ]),
    debtToEquity: normalizeRatioMetric(
      latestMetric(ratios, [
        "Debt to Equity",
        "Debt/Equity",
        "Debt To Equity Ratio",
        "Total Debt to Equity",
      ])
    ),
    returnOnEquity: normalizePercentMetric(
      latestMetric(ratios, [
        "Return on Equity",
        "ROE",
      ])
    ),
    week52High:
      highs.length > 0 ? Math.max(...highs) : null,
    week52Low:
      lows.length > 0 ? Math.min(...lows) : null,
  };
}

function calculateWinners(
  companies: CompanyComparison[]
) {
  return {
    marketCapitalization: winner(
      companies,
      "marketCapitalization",
      "higher"
    ),
    peRatio: winner(companies, "peRatio", "lower"),
    eps: winner(companies, "eps", "higher"),
    netProfitMargin: winner(
      companies,
      "netProfitMargin",
      "higher"
    ),
    operatingMargin: winner(
      companies,
      "operatingMargin",
      "higher"
    ),
    returnOnEquity: winner(
      companies,
      "returnOnEquity",
      "higher"
    ),
    currentRatio: winner(
      companies,
      "currentRatio",
      "higher"
    ),
    debtToEquity: winner(
      companies,
      "debtToEquity",
      "lower"
    ),
    dailyPerformance: winner(
      companies,
      "changePercent",
      "higher"
    ),
  };
}

function winner(
  companies: CompanyComparison[],
  key: keyof CompanyComparison,
  direction: "higher" | "lower"
) {
  const valid = companies.filter((company) => {
    const value = company[key];
    return (
      typeof value === "number" &&
      Number.isFinite(value)
    );
  });

  if (valid.length === 0) {
    return null;
  }

  return valid.reduce((best, current) => {
    const bestValue = best[key] as number;
    const currentValue = current[key] as number;

    if (direction === "higher") {
      return currentValue > bestValue
        ? current
        : best;
    }

    return currentValue < bestValue
      ? current
      : best;
  }).symbol;
}

async function fetchOptionalJson(
  url: URL
): Promise<FetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    const contentType =
      response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      return {
        ok: false,
        status: response.status,
        data: null,
      };
    }

    let data: unknown = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch {
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
  response: BQStatementResponse | null,
  aliases: string[]
): number | null {
  const section = findSectionByAliases(
    response,
    aliases
  );

  if (!section || !Array.isArray(section.values)) {
    return null;
  }

  const values = [...section.values].sort(
    (a, b) =>
      metricDate(b).localeCompare(metricDate(a))
  );

  for (const value of values) {
    const raw = finiteOrNull(
      value.reportedValue?.raw
    );

    if (raw !== null) {
      return raw;
    }
  }

  return null;
}

function findSectionByAliases(
  response: BQStatementResponse | null,
  aliases: string[]
): BQStatementSection | null {
  if (!response?.data) {
    return null;
  }

  const normalizedAliases = aliases.map(normalizeKey);
  let fuzzyMatch: BQStatementSection | null = null;

  for (const category of Object.values(response.data)) {
    for (const [sectionName, section] of Object.entries(
      category.sections || {}
    )) {
      const candidates = [
        section.metadata?.slug,
        section.metadata?.name,
        section.metadata?.name_short,
        sectionName,
      ]
        .filter(Boolean)
        .map((value) => normalizeKey(String(value)));

      if (
        candidates.some((candidate) =>
          normalizedAliases.includes(candidate)
        )
      ) {
        return section;
      }

      if (
        !fuzzyMatch &&
        candidates.some((candidate) =>
          normalizedAliases.some(
            (alias) =>
              candidate.includes(alias) ||
              alias.includes(candidate)
          )
        )
      ) {
        fuzzyMatch = section;
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

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePercentMetric(
  value: number | null
) {
  if (value === null) {
    return null;
  }

  return Math.abs(value) <= 1
    ? value * 100
    : value;
}

function normalizeRatioMetric(
  value: number | null
) {
  if (value === null) {
    return null;
  }

  return Math.abs(value) > 20
    ? value / 100
    : value;
}

function peerDistance(
  candidate: number | null,
  base: number | null
) {
  if (
    candidate === null ||
    base === null ||
    candidate <= 0 ||
    base <= 0
  ) {
    return Number.MAX_SAFE_INTEGER;
  }

  return Math.abs(
    Math.log(candidate / base)
  );
}

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase();
}

function isValidSymbol(value: string) {
  return /^[A-Z0-9.-]{1,15}$/.test(value);
}

function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
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
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
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