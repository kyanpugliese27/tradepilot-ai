import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

type FinnhubCalendarItem = {
  date?: string;
  epsActual?: number | null;
  epsEstimate?: number | null;
  hour?: string;
  quarter?: number;
  revenueActual?: number | null;
  revenueEstimate?: number | null;
  symbol?: string;
  year?: number;
};

type FinnhubCalendarResponse = {
  earningsCalendar?: FinnhubCalendarItem[];
};

type FinnhubSurprise = {
  actual?: number | null;
  estimate?: number | null;
  period?: string;
  quarter?: number;
  surprise?: number | null;
  surprisePercent?: number | null;
  symbol?: string;
  year?: number;
};

type EarningsEvent = {
  symbol: string;
  date: string;
  hour: "bmo" | "amc" | "dmh" | "unknown";
  quarter: number | null;
  year: number | null;
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
  epsSurprise: number | null;
  epsSurprisePercent: number | null;
  revenueSurprise: number | null;
  revenueSurprisePercent: number | null;
  status: "upcoming" | "reported";
};

type EarningsPreview = {
  headline: string;
  overview: string;
  metricsToWatch: string[];
  positiveScenario: string;
  riskScenario: string;
  questionsToAsk: string[];
  disclaimer: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

const REQUEST_TIMEOUT_MS = 8_000;
const MAX_RANGE_DAYS = 45;

const previewSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string" },
    overview: { type: "string" },
    metricsToWatch: {
      type: "array",
      items: { type: "string" },
      maxItems: 5,
    },
    positiveScenario: { type: "string" },
    riskScenario: { type: "string" },
    questionsToAsk: {
      type: "array",
      items: { type: "string" },
      maxItems: 5,
    },
    disclaimer: { type: "string" },
  },
  required: [
    "headline",
    "overview",
    "metricsToWatch",
    "positiveScenario",
    "riskScenario",
    "questionsToAsk",
    "disclaimer",
  ],
} as const;

export async function GET(request: NextRequest) {
  try {
    const userResult = await requireUser();

    if (!userResult.ok) {
      return userResult.response;
    }

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

    const from =
      request.nextUrl.searchParams.get("from") ||
      formatDate(addDays(new Date(), -7));

    const to =
      request.nextUrl.searchParams.get("to") ||
      formatDate(addDays(new Date(), 21));

    const symbol = normalizeSymbol(
      request.nextUrl.searchParams.get("symbol") || ""
    );

    if (!isValidDate(from) || !isValidDate(to)) {
      return NextResponse.json(
        {
          error:
            "Dates must use YYYY-MM-DD format.",
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        }
      );
    }

    const fromDate = new Date(`${from}T00:00:00Z`);
    const toDate = new Date(`${to}T00:00:00Z`);

    if (toDate < fromDate) {
      return NextResponse.json(
        {
          error:
            "The end date must be on or after the start date.",
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        }
      );
    }

    const rangeDays = Math.ceil(
      (toDate.getTime() - fromDate.getTime()) /
        86_400_000
    );

    if (rangeDays > MAX_RANGE_DAYS) {
      return NextResponse.json(
        {
          error: `Choose a range of ${MAX_RANGE_DAYS} days or less.`,
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        }
      );
    }

    if (symbol && !isValidSymbol(symbol)) {
      return NextResponse.json(
        {
          error: "The stock symbol is invalid.",
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        }
      );
    }

    const calendarUrl = new URL(
      "https://finnhub.io/api/v1/calendar/earnings"
    );

    calendarUrl.searchParams.set("from", from);
    calendarUrl.searchParams.set("to", to);
    calendarUrl.searchParams.set("token", apiKey);

    if (symbol) {
      calendarUrl.searchParams.set("symbol", symbol);
    }

    const calendarResponse =
      await fetchWithTimeout(calendarUrl);

    if (!calendarResponse.ok) {
      throw new Error(
        providerError(
          "earnings calendar",
          calendarResponse.status
        )
      );
    }

    const calendarData =
      (await calendarResponse.json()) as FinnhubCalendarResponse;

    const today = formatDate(new Date());

    const events = (
      calendarData.earningsCalendar || []
    )
      .map((item) => normalizeEvent(item, today))
      .filter(
        (event): event is EarningsEvent =>
          event !== null
      )
      .sort((a, b) => {
        const dateDifference =
          a.date.localeCompare(b.date);

        if (dateDifference !== 0) {
          return dateDifference;
        }

        return a.symbol.localeCompare(b.symbol);
      });

    let surprises: FinnhubSurprise[] = [];

    if (symbol) {
      const surprisesUrl = new URL(
        "https://finnhub.io/api/v1/stock/earnings"
      );

      surprisesUrl.searchParams.set("symbol", symbol);
      surprisesUrl.searchParams.set("limit", "8");
      surprisesUrl.searchParams.set("token", apiKey);

      try {
        const surprisesResponse =
          await fetchWithTimeout(surprisesUrl);

        if (surprisesResponse.ok) {
          const data =
            (await surprisesResponse.json()) as unknown;

          if (Array.isArray(data)) {
            surprises = data
              .filter(
                (
                  item
                ): item is FinnhubSurprise =>
                  Boolean(item) &&
                  typeof item === "object"
              )
              .map(normalizeSurprise)
              .slice(0, 8);
          }
        }
      } catch {
        surprises = [];
      }
    }

    return NextResponse.json(
      {
        events,
        surprises,
        range: {
          from,
          to,
        },
        symbol: symbol || null,
        summary: {
          total: events.length,
          upcoming: events.filter(
            (event) =>
              event.status === "upcoming"
          ).length,
          reported: events.filter(
            (event) =>
              event.status === "reported"
          ).length,
          beforeOpen: events.filter(
            (event) => event.hour === "bmo"
          ).length,
          afterClose: events.filter(
            (event) => event.hour === "amc"
          ).length,
        },
        updatedAt: new Date().toISOString(),
      },
      {
        headers: noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error("Earnings API GET error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load earnings data.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userResult = await requireUser();

    if (!userResult.ok) {
      return userResult.response;
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is missing from .env.local.",
        },
        {
          status: 500,
          headers: noStoreHeaders(),
        }
      );
    }

    const body = await request.json();

    const event =
      body.event &&
      typeof body.event === "object"
        ? (body.event as EarningsEvent)
        : null;

    const surprises = Array.isArray(body.surprises)
      ? body.surprises.slice(0, 8)
      : [];

    if (
      !event ||
      !isValidSymbol(
        normalizeSymbol(event.symbol)
      )
    ) {
      return NextResponse.json(
        {
          error:
            "A valid earnings event is required.",
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        }
      );
    }

    const response = await openai.responses.create({
      model: "gpt-5-mini",
      store: false,
      instructions: `
You are TradePilot AI, an educational earnings assistant.

Use only the supplied earnings-calendar event and historical surprise data.

Rules:
- Never invent company guidance, business facts, analyst opinions, revenue drivers, news, or future results.
- Do not predict whether the stock will rise or fall.
- Do not tell the user to buy, sell, or hold.
- Clearly identify missing estimates.
- For an upcoming event, explain what the supplied estimates and historical surprises allow the user to monitor.
- For a reported event, explain the visible actual-versus-estimate differences.
- Keep the result concise and suitable for an earnings dashboard.
`,
      input: `
Selected earnings event:
${JSON.stringify(event, null, 2)}

Historical earnings surprises:
${JSON.stringify(surprises, null, 2)}
`,
      text: {
        format: {
          type: "json_schema",
          name: "earnings_preview",
          description:
            "A structured educational earnings preview or recap.",
          strict: true,
          schema: previewSchema,
        },
      },
    });

    const outputText =
      response.output_text?.trim();

    if (!outputText) {
      throw new Error(
        "OpenAI returned an empty earnings analysis."
      );
    }

    const analysis = JSON.parse(
      outputText
    ) as EarningsPreview;

    return NextResponse.json(
      {
        analysis,
        generatedAt: new Date().toISOString(),
      },
      {
        headers: noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error("Earnings API POST error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate earnings analysis.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}

async function requireUser(): Promise<
  | { ok: true }
  | {
      ok: false;
      response: NextResponse;
    }
> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "You must be signed in.",
        },
        {
          status: 401,
          headers: noStoreHeaders(),
        }
      ),
    };
  }

  return { ok: true };
}

function normalizeEvent(
  item: FinnhubCalendarItem,
  today: string
): EarningsEvent | null {
  const symbol = normalizeSymbol(
    item.symbol || ""
  );

  const date =
    typeof item.date === "string"
      ? item.date.slice(0, 10)
      : "";

  if (!isValidSymbol(symbol) || !isValidDate(date)) {
    return null;
  }

  const epsActual = finiteOrNull(
    item.epsActual
  );

  const epsEstimate = finiteOrNull(
    item.epsEstimate
  );

  const revenueActual = finiteOrNull(
    item.revenueActual
  );

  const revenueEstimate = finiteOrNull(
    item.revenueEstimate
  );

  return {
    symbol,
    date,
    hour: normalizeHour(item.hour),
    quarter: integerOrNull(item.quarter),
    year: integerOrNull(item.year),
    epsEstimate,
    epsActual,
    revenueEstimate,
    revenueActual,
    epsSurprise: differenceOrNull(
      epsActual,
      epsEstimate
    ),
    epsSurprisePercent:
      surprisePercentOrNull(
        epsActual,
        epsEstimate
      ),
    revenueSurprise: differenceOrNull(
      revenueActual,
      revenueEstimate
    ),
    revenueSurprisePercent:
      surprisePercentOrNull(
        revenueActual,
        revenueEstimate
      ),
    status:
      date >= today &&
      epsActual === null &&
      revenueActual === null
        ? "upcoming"
        : "reported",
  };
}

function normalizeSurprise(
  item: FinnhubSurprise
) {
  return {
    symbol: normalizeSymbol(
      item.symbol || ""
    ),
    period:
      typeof item.period === "string"
        ? item.period
        : "",
    quarter: integerOrNull(item.quarter),
    year: integerOrNull(item.year),
    actual: finiteOrNull(item.actual),
    estimate: finiteOrNull(item.estimate),
    surprise: finiteOrNull(item.surprise),
    surprisePercent: finiteOrNull(
      item.surprisePercent
    ),
  };
}

function normalizeHour(
  value: unknown
): EarningsEvent["hour"] {
  if (
    value === "bmo" ||
    value === "amc" ||
    value === "dmh"
  ) {
    return value;
  }

  return "unknown";
}

function differenceOrNull(
  actual: number | null,
  estimate: number | null
) {
  if (
    actual === null ||
    estimate === null
  ) {
    return null;
  }

  return actual - estimate;
}

function surprisePercentOrNull(
  actual: number | null,
  estimate: number | null
) {
  if (
    actual === null ||
    estimate === null ||
    estimate === 0
  ) {
    return null;
  }

  return (
    ((actual - estimate) /
      Math.abs(estimate)) *
    100
  );
}

function finiteOrNull(
  value: unknown
): number | null {
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : null;
}

function integerOrNull(
  value: unknown
): number | null {
  const numberValue = Number(value);

  return Number.isInteger(numberValue)
    ? numberValue
    : null;
}

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase();
}

function isValidSymbol(value: string) {
  return /^[A-Z0-9.-]{1,15}$/.test(value);
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(
      new Date(`${value}T00:00:00Z`).getTime()
    );
}

function addDays(
  date: Date,
  days: number
) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function fetchWithTimeout(url: URL) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function providerError(
  resource: string,
  status: number
) {
  if (status === 401 || status === 403) {
    return "Finnhub rejected the API key. Check FINNHUB_API_KEY in .env.local.";
  }

  if (status === 429) {
    return `Finnhub's request limit was reached while loading the ${resource}. Please wait briefly and try again.`;
  }

  return `Unable to load the ${resource}. Finnhub returned status ${status}.`;
}

function noStoreHeaders() {
  return {
    "Cache-Control":
      "private, no-cache, no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}