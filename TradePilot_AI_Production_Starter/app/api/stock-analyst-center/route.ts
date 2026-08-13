import { NextRequest, NextResponse } from "next/server";

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

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "FINNHUB_API_KEY is missing from .env.local." },
        { status: 500 }
      );
    }

    const symbol = request.nextUrl.searchParams
      .get("symbol")
      ?.trim()
      .toUpperCase();

    if (!symbol || !/^[A-Z0-9.-]{1,15}$/.test(symbol)) {
      return NextResponse.json(
        { error: "A valid stock symbol is required." },
        { status: 400 }
      );
    }

    const origin = request.nextUrl.origin;

    const stockResponse = await fetch(
      `${origin}/api/stock-details?symbol=${encodeURIComponent(symbol)}`,
      { cache: "no-store" }
    );

    const stockData = await stockResponse.json();

    if (!stockResponse.ok || !stockData.stock) {
      return NextResponse.json(
        { error: stockData.error || `Unable to load ${symbol}.` },
        { status: 404 }
      );
    }

    const recommendationUrl = new URL(
      "https://finnhub.io/api/v1/stock/recommendation"
    );
    recommendationUrl.searchParams.set("symbol", symbol);
    recommendationUrl.searchParams.set("token", apiKey);

    const targetUrl = new URL(
      "https://finnhub.io/api/v1/stock/price-target"
    );
    targetUrl.searchParams.set("symbol", symbol);
    targetUrl.searchParams.set("token", apiKey);

    const [recommendationResponse, targetResponse] =
      await Promise.all([
        fetch(recommendationUrl, { cache: "no-store" }),
        fetch(targetUrl, { cache: "no-store" }),
      ]);

    const recommendationJson = recommendationResponse.ok
      ? await recommendationResponse.json()
      : [];

    const targetJson = targetResponse.ok
      ? await targetResponse.json()
      : null;

    const history: Recommendation[] = Array.isArray(recommendationJson)
      ? recommendationJson.slice(0, 12)
      : [];

    const latest = history[0] ?? null;

    const counts = {
      strongBuy: numberOrZero(latest?.strongBuy),
      buy: numberOrZero(latest?.buy),
      hold: numberOrZero(latest?.hold),
      sell: numberOrZero(latest?.sell),
      strongSell: numberOrZero(latest?.strongSell),
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
            counts.strongBuy * 5 +
            counts.buy * 4 +
            counts.hold * 3 +
            counts.sell * 2 +
            counts.strongSell
          ) / total
        : null;

    const currentPrice = Number(stockData.stock.price) || 0;

    const priceTarget =
      targetJson &&
      typeof targetJson === "object" &&
      [targetJson.targetHigh, targetJson.targetLow, targetJson.targetMean]
        .some((value) => Number(value) > 0)
        ? {
            lastUpdated:
              typeof targetJson.lastUpdated === "string"
                ? targetJson.lastUpdated
                : "",
            numberAnalysts: numberOrNull(targetJson.numberAnalysts),
            targetHigh: numberOrNull(targetJson.targetHigh),
            targetLow: numberOrNull(targetJson.targetLow),
            targetMean: numberOrNull(targetJson.targetMean),
            targetMedian: numberOrNull(targetJson.targetMedian),
            impliedUpsidePercent:
              Number(targetJson.targetMean) > 0 && currentPrice > 0
                ? ((Number(targetJson.targetMean) - currentPrice) /
                    currentPrice) *
                  100
                : null,
          }
        : null;

    return NextResponse.json(
      {
        symbol,
        companyName: stockData.stock.name || symbol,
        currentPrice,
        consensus: scoreToConsensus(weightedScore),
        weightedScore,
        latestPeriod: latest?.period || "",
        counts,
        totalRecommendations: total,
        priceTarget,
        availability: {
          recommendations: history.length > 0,
          priceTargets: Boolean(priceTarget),
          recommendationStatus: recommendationResponse.status,
          priceTargetStatus: targetResponse.status,
        },
      },
      {
        headers: {
          "Cache-Control":
            "private, no-cache, no-store, max-age=0, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Analyst Center API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load analyst data.",
      },
      { status: 500 }
    );
  }
}

function scoreToConsensus(score: number | null) {
  if (score === null) return "Unavailable";
  if (score >= 4.5) return "Strong Buy";
  if (score >= 3.6) return "Buy";
  if (score >= 2.6) return "Hold";
  if (score >= 1.6) return "Sell";
  return "Strong Sell";
}

function numberOrZero(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function numberOrNull(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}