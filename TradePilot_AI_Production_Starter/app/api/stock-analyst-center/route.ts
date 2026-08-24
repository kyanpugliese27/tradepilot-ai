import {
  NextRequest,
  NextResponse,
} from "next/server";

type Recommendation = {
  buy?: number;
  hold?: number;
  period?: string;
  sell?: number;
  strongBuy?: number;
  strongSell?: number;
};

type PriceTarget = {
  lastUpdated?: string;
  numberAnalysts?: number;
  targetHigh?: number;
  targetLow?: number;
  targetMean?: number;
  targetMedian?: number;
};

type BQQuote = {
  ticker?: string;
  name?: string;
  name_short?: string;
  price?: number;
  pricedate?: string;
};

type BQEstimateRow = {
  period?: string;
  sno?: number;
  data_type?: string;
  value_estimate?: number;
  value_reported?: number | null;
  high_estimate?: number;
  low_estimate?: number;
};

type ForwardEstimateSummary = {
  period: string;
  epsConsensus: number | null;
  epsHigh: number | null;
  epsLow: number | null;
  revenueConsensus: number | null;
  revenueHigh: number | null;
  revenueLow: number | null;
};

type FetchResult = {
  ok: boolean;
  status: number | null;
  data: unknown;
};

export const dynamic =
  "force-dynamic";
export const revalidate = 0;

const REQUEST_TIMEOUT_MS =
  8_000;

export async function GET(
  request: NextRequest
) {
  try {
    const finnhubApiKey =
      process.env.FINNHUB_API_KEY;

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

    const epsEstimateUrl =
      new URL(
        "https://data.businessquant.com/estimates"
      );

    epsEstimateUrl.searchParams.set(
      "ticker",
      symbol
    );
    epsEstimateUrl.searchParams.set(
      "mode",
      "eps"
    );
    epsEstimateUrl.searchParams.set(
      "api_key",
      businessQuantApiKey
    );

    const revenueEstimateUrl =
      new URL(
        "https://data.businessquant.com/estimates"
      );

    revenueEstimateUrl.searchParams.set(
      "ticker",
      symbol
    );
    revenueEstimateUrl.searchParams.set(
      "mode",
      "revenue"
    );
    revenueEstimateUrl.searchParams.set(
      "api_key",
      businessQuantApiKey
    );

    const recommendationUrl =
      new URL(
        "https://finnhub.io/api/v1/stock/recommendation"
      );

    recommendationUrl.searchParams.set(
      "symbol",
      symbol
    );

    if (finnhubApiKey) {
      recommendationUrl.searchParams.set(
        "token",
        finnhubApiKey
      );
    }

    const targetUrl =
      new URL(
        "https://finnhub.io/api/v1/stock/price-target"
      );

    targetUrl.searchParams.set(
      "symbol",
      symbol
    );

    if (finnhubApiKey) {
      targetUrl.searchParams.set(
        "token",
        finnhubApiKey
      );
    }

    const [
      quoteResult,
      recommendationResult,
      targetResult,
      epsEstimateResult,
      revenueEstimateResult,
    ] = await Promise.all([
      fetchOptionalJson(
        quoteUrl
      ),

      finnhubApiKey
        ? fetchOptionalJson(
            recommendationUrl
          )
        : Promise.resolve({
            ok: false,
            status: null,
            data: null,
          } as FetchResult),

      finnhubApiKey
        ? fetchOptionalJson(
            targetUrl
          )
        : Promise.resolve({
            ok: false,
            status: null,
            data: null,
          } as FetchResult),

      fetchOptionalJson(
        epsEstimateUrl
      ),

      fetchOptionalJson(
        revenueEstimateUrl
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
        Number(quote.price)
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

    const recommendationJson =
      recommendationResult.data;

    const history:
      Recommendation[] =
      Array.isArray(
        recommendationJson
      )
        ? (
            recommendationJson as Recommendation[]
          ).slice(0, 12)
        : [];

    const latest =
      history[0] ?? null;

    const counts = {
      strongBuy:
        numberOrZero(
          latest?.strongBuy
        ),

      buy:
        numberOrZero(
          latest?.buy
        ),

      hold:
        numberOrZero(
          latest?.hold
        ),

      sell:
        numberOrZero(
          latest?.sell
        ),

      strongSell:
        numberOrZero(
          latest?.strongSell
        ),
    };

    const total =
      counts.strongBuy +
      counts.buy +
      counts.hold +
      counts.sell +
      counts.strongSell;

    const weightedScore =
      total > 0
        ? (
            counts.strongBuy *
              5 +
            counts.buy * 4 +
            counts.hold * 3 +
            counts.sell * 2 +
            counts.strongSell
          ) /
          total
        : null;

    const currentPrice =
      numberOrZero(
        quote.price
      );

    /*
     * Keep the old Finnhub price-target
     * object when it happens to be
     * available so other parts of Norvexa
     * remain backward-compatible.
     */
    const rawTarget =
      isPlainObject(
        targetResult.data
      )
        ? (
            targetResult.data as PriceTarget
          )
        : null;

    const priceTarget =
      rawTarget &&
      [
        rawTarget.targetHigh,
        rawTarget.targetLow,
        rawTarget.targetMean,
      ].some(
        (value) =>
          Number(value) > 0
      )
        ? {
            lastUpdated:
              typeof rawTarget.lastUpdated ===
              "string"
                ? rawTarget.lastUpdated
                : "",

            numberAnalysts:
              numberOrNull(
                rawTarget.numberAnalysts
              ),

            targetHigh:
              numberOrNull(
                rawTarget.targetHigh
              ),

            targetLow:
              numberOrNull(
                rawTarget.targetLow
              ),

            targetMean:
              numberOrNull(
                rawTarget.targetMean
              ),

            targetMedian:
              numberOrNull(
                rawTarget.targetMedian
              ),

            impliedUpsidePercent:
              Number(
                rawTarget.targetMean
              ) >
                0 &&
              currentPrice > 0
                ? ((Number(
                    rawTarget.targetMean
                  ) -
                    currentPrice) /
                    currentPrice) *
                  100
                : null,
          }
        : null;

    /*
     * Business Quant's estimates endpoint
     * returns both historical/reporting rows
     * and forward estimate rows. We walk the
     * response recursively so this remains
     * resilient to whether BQ wraps annual and
     * quarterly arrays under data/annual/etc.
     */
    const epsRows =
      collectEstimateRows(
        epsEstimateResult.data
      );

    const revenueRows =
      collectEstimateRows(
        revenueEstimateResult.data
      );

    const nextAnnualEps =
      pickNextAnnualEstimate(
        epsRows
      );

    const nextAnnualRevenue =
      pickNextAnnualEstimate(
        revenueRows
      );

    const forwardEstimates:
      ForwardEstimateSummary | null =
      nextAnnualEps ||
      nextAnnualRevenue
        ? {
            period:
              nextAnnualEps?.period ||
              nextAnnualRevenue?.period ||
              "Next fiscal year",

            epsConsensus:
              numberOrNull(
                nextAnnualEps
                  ?.value_estimate
              ),

            epsHigh:
              numberOrNull(
                nextAnnualEps
                  ?.high_estimate
              ),

            epsLow:
              numberOrNull(
                nextAnnualEps
                  ?.low_estimate
              ),

            revenueConsensus:
              numberOrNull(
                nextAnnualRevenue
                  ?.value_estimate
              ),

            revenueHigh:
              numberOrNull(
                nextAnnualRevenue
                  ?.high_estimate
              ),

            revenueLow:
              numberOrNull(
                nextAnnualRevenue
                  ?.low_estimate
              ),
          }
        : null;

    return NextResponse.json(
      {
        symbol,

        companyName:
          quote.name ||
          quote.name_short ||
          symbol,

        currentPrice,

        consensus:
          scoreToConsensus(
            weightedScore
          ),

        weightedScore,

        latestPeriod:
          latest?.period ||
          "",

        counts,

        totalRecommendations:
          total,

        // Backward compatibility.
        priceTarget,

        // New Business Quant analyst data.
        forwardEstimates,

        availability: {
          recommendations:
            history.length > 0,

          priceTargets:
            Boolean(
              priceTarget
            ),

          forwardEstimates:
            Boolean(
              forwardEstimates
            ),

          epsEstimates:
            epsEstimateResult.ok &&
            Boolean(
              nextAnnualEps
            ),

          revenueEstimates:
            revenueEstimateResult.ok &&
            Boolean(
              nextAnnualRevenue
            ),

          recommendationStatus:
            recommendationResult.status,

          priceTargetStatus:
            targetResult.status,

          quoteStatus:
            quoteResult.status,

          epsEstimateStatus:
            epsEstimateResult.status,

          revenueEstimateStatus:
            revenueEstimateResult.status,
        },

        source: {
          companyAndPrice:
            "Business Quant Quotes",

          recommendations:
            history.length > 0
              ? "Finnhub"
              : "Unavailable",

          priceTargets:
            priceTarget
              ? "Finnhub"
              : "Unavailable",

          forwardEstimates:
            forwardEstimates
              ? "Business Quant"
              : "Unavailable",
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
      "Analyst Center API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load analyst data.",
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
): Promise<FetchResult> {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

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
    clearTimeout(timeout);
  }
}

function collectEstimateRows(
  value: unknown
): BQEstimateRow[] {
  const rows:
    BQEstimateRow[] = [];

  walkEstimateResponse(
    value,
    rows
  );

  return rows;
}

function walkEstimateResponse(
  value: unknown,
  rows: BQEstimateRow[]
) {
  if (Array.isArray(value)) {
    for (const item of value) {
      walkEstimateResponse(
        item,
        rows
      );
    }

    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  const looksLikeEstimate =
    typeof value.period ===
      "string" &&
    typeof value.data_type ===
      "string" &&
    (
      value.value_estimate !==
        undefined ||
      value.high_estimate !==
        undefined ||
      value.low_estimate !==
        undefined
    );

  if (looksLikeEstimate) {
    rows.push({
      period:
        String(
          value.period
        ),

      sno:
        numberOrNull(
          value.sno
        ) ??
        undefined,

      data_type:
        String(
          value.data_type
        ),

      value_estimate:
        numberOrNull(
          value.value_estimate
        ) ??
        undefined,

      value_reported:
        numberOrNull(
          value.value_reported
        ),

      high_estimate:
        numberOrNull(
          value.high_estimate
        ) ??
        undefined,

      low_estimate:
        numberOrNull(
          value.low_estimate
        ) ??
        undefined,
    });
  }

  for (const child of Object.values(
    value
  )) {
    walkEstimateResponse(
      child,
      rows
    );
  }
}

function pickNextAnnualEstimate(
  rows: BQEstimateRow[]
) {
  const annualEstimates =
    rows.filter(
      (row) =>
        row.data_type
          ?.toLowerCase() ===
          "estimate" &&
        isAnnualPeriod(
          row.period
        )
    );

  if (
    annualEstimates.length ===
    0
  ) {
    return null;
  }

  return annualEstimates.sort(
    (a, b) => {
      const aPeriod =
        Number(
          a.period
        );

      const bPeriod =
        Number(
          b.period
        );

      if (
        Number.isFinite(
          aPeriod
        ) &&
        Number.isFinite(
          bPeriod
        )
      ) {
        return (
          aPeriod -
          bPeriod
        );
      }

      return (
        (a.sno ?? 9999) -
        (b.sno ?? 9999)
      );
    }
  )[0];
}

function isAnnualPeriod(
  period?: string
) {
  if (!period) {
    return false;
  }

  return /^\d{4}$/.test(
    period.trim()
  );
}

function isPlainObject(
  value: unknown
): value is Record<
  string,
  any
> {
  return Boolean(
    value &&
      typeof value ===
        "object" &&
      !Array.isArray(value)
  );
}

function scoreToConsensus(
  score:
    | number
    | null
) {
  if (score === null) {
    return "Unavailable";
  }

  if (score >= 4.5) {
    return "Strong Buy";
  }

  if (score >= 3.6) {
    return "Buy";
  }

  if (score >= 2.6) {
    return "Hold";
  }

  if (score >= 1.6) {
    return "Sell";
  }

  return "Strong Sell";
}

function numberOrZero(
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

function numberOrNull(
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