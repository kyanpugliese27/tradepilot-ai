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

    /*
     * BUSINESS QUANT
     * Use the quote endpoint directly instead
     * of calling another Norvexa API route.
     * This removes the old <!DOCTYPE / invalid
     * JSON failure caused by an internal route
     * returning an HTML error page.
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

    /*
     * FINNHUB analyst endpoints remain
     * optional. If the user's current
     * Finnhub plan does not include one,
     * Norvexa will return an unavailable
     * state instead of crashing.
     */
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

        priceTarget,

        availability: {
          recommendations:
            history.length > 0,

          priceTargets:
            Boolean(
              priceTarget
            ),

          recommendationStatus:
            recommendationResult.status,

          priceTargetStatus:
            targetResult.status,

          quoteStatus:
            quoteResult.status,
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

    /*
     * Never blindly call .json().
     * If an upstream service returns HTML,
     * the old route could throw
     * "Unexpected token '<'".
     */
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