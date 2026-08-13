import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SnapshotRow = {
  id: string;
  total_account_value: number | string;
  portfolio_value: number | string;
  cash_balance: number | string;
  recorded_at: string;
};

type ChartRange =
  | "1D"
  | "1W"
  | "1M"
  | "3M"
  | "YTD"
  | "1Y"
  | "ALL";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 }
      );
    }

    const url = new URL(request.url);

    const requestedRange = (
      url.searchParams.get("range") || "1M"
    ).toUpperCase();

    const allowedRanges: ChartRange[] = [
      "1D",
      "1W",
      "1M",
      "3M",
      "YTD",
      "1Y",
      "ALL",
    ];

    const range: ChartRange = allowedRanges.includes(
      requestedRange as ChartRange
    )
      ? (requestedRange as ChartRange)
      : "1M";

    const startDate = getStartDate(range);

    let query = supabase
      .from("portfolio_snapshots")
      .select(
        `
          id,
          total_account_value,
          portfolio_value,
          cash_balance,
          recorded_at
        `
      )
      .eq("user_id", user.id)
      .order("recorded_at", { ascending: true });

    if (startDate) {
      query = query.gte(
        "recorded_at",
        startDate.toISOString()
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(
        `Unable to load portfolio history: ${error.message}`
      );
    }

    const snapshots = ((data || []) as SnapshotRow[])
      .map((snapshot) => ({
        id: snapshot.id,
        totalAccountValue: Number(
          snapshot.total_account_value
        ),
        portfolioValue: Number(snapshot.portfolio_value),
        cashBalance: Number(snapshot.cash_balance),
        recordedAt: snapshot.recorded_at,
      }))
      .filter(
        (snapshot) =>
          Number.isFinite(snapshot.totalAccountValue) &&
          Number.isFinite(snapshot.portfolioValue) &&
          Number.isFinite(snapshot.cashBalance) &&
          !Number.isNaN(
            new Date(snapshot.recordedAt).getTime()
          )
      );

    return NextResponse.json({
      range,
      snapshots,
    });
  } catch (error) {
    console.error(
      "Portfolio history API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load portfolio history.",
      },
      { status: 500 }
    );
  }
}

function getStartDate(range: ChartRange): Date | null {
  const now = new Date();
  const startDate = new Date(now);

  switch (range) {
    case "1D":
      startDate.setDate(now.getDate() - 1);
      return startDate;

    case "1W":
      startDate.setDate(now.getDate() - 7);
      return startDate;

    case "1M":
      startDate.setMonth(now.getMonth() - 1);
      return startDate;

    case "3M":
      startDate.setMonth(now.getMonth() - 3);
      return startDate;

    case "YTD":
      return new Date(now.getFullYear(), 0, 1);

    case "1Y":
      startDate.setFullYear(now.getFullYear() - 1);
      return startDate;

    case "ALL":
      return null;

    default:
      startDate.setMonth(now.getMonth() - 1);
      return startDate;
  }
}