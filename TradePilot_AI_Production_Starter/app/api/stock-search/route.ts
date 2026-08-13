import { NextRequest, NextResponse } from "next/server";

type FinnhubSearchResult = {
  description?: string;
  displaySymbol?: string;
  symbol?: string;
  type?: string;
};

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "FINNHUB_API_KEY is missing." },
        { status: 500 }
      );
    }

    const query = request.nextUrl.searchParams.get("q")?.trim();

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    const response = await fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(
        query
      )}&token=${apiKey}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error("Finnhub search request failed.");
    }

    const data = await response.json();

    const results = Array.isArray(data.result)
      ? data.result
          .filter((item: FinnhubSearchResult) => {
            const symbol =
              item.displaySymbol || item.symbol || "";

            return (
              symbol &&
              item.description &&
              item.type === "Common Stock" &&
              !symbol.includes(".")
            );
          })
          .slice(0, 8)
          .map((item: FinnhubSearchResult) => ({
            symbol: (
              item.displaySymbol ||
              item.symbol ||
              ""
            ).toUpperCase(),
            name: item.description || "",
            type: item.type || "",
          }))
      : [];

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Stock search API error:", error);

    return NextResponse.json(
      { error: "Unable to search stocks." },
      { status: 500 }
    );
  }
}
