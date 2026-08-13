import { NextRequest, NextResponse } from "next/server";

const FINNHUB_KEY = process.env.FINNHUB_API_KEY!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json(
      { error: "Missing symbol" },
      { status: 400 }
    );
  }

  try {
    const today = new Date();

    const to = today.toISOString().slice(0, 10);

    const from = new Date(
      today.getFullYear() - 2,
      today.getMonth(),
      today.getDate()
    )
      .toISOString()
      .slice(0, 10);

    const response = await fetch(
      `https://finnhub.io/api/v1/stock/filings?symbol=${symbol}&from=${from}&to=${to}&token=${FINNHUB_KEY}`,
      {
        next: {
          revalidate: 3600,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to load filings");
    }

    const filings = await response.json();

    return NextResponse.json({
      filings,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      filings: [],
    });
  }
}