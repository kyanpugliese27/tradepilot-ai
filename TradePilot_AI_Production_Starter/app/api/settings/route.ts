import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type AccountRow = {
  cash_balance: number | string;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401, headers: noStoreHeaders() }
      );
    }

    const { data: account, error: accountError } =
      await supabase
        .from("accounts")
        .select("cash_balance")
        .eq("user_id", user.id)
        .maybeSingle<AccountRow>();

    if (accountError) {
      throw new Error(accountError.message);
    }

    return NextResponse.json(
      {
        profile: {
          fullName:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "",
          email: user.email || "",
          createdAt: user.created_at,
        },
        account: {
          cashBalance: Number(
            account?.cash_balance ?? 0
          ),
        },
      },
      { headers: noStoreHeaders() }
    );
  } catch (error) {
    console.error("Settings GET error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load settings.",
      },
      { status: 500, headers: noStoreHeaders() }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401, headers: noStoreHeaders() }
      );
    }

    const body = await request.json();

    const fullName =
      typeof body.fullName === "string"
        ? body.fullName.trim().slice(0, 100)
        : "";

    if (!fullName) {
      return NextResponse.json(
        { error: "Your name cannot be empty." },
        { status: 400, headers: noStoreHeaders() }
      );
    }

    const { data, error } =
      await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          name: fullName,
        },
      });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(
      {
        success: true,
        profile: {
          fullName:
            data.user.user_metadata?.full_name ||
            fullName,
          email: data.user.email || "",
        },
      },
      { headers: noStoreHeaders() }
    );
  } catch (error) {
    console.error("Settings PATCH error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update your profile.",
      },
      { status: 500, headers: noStoreHeaders() }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401, headers: noStoreHeaders() }
      );
    }

    const body = await request.json();

    if (body.action !== "reset-paper-account") {
      return NextResponse.json(
        { error: "Unknown settings action." },
        { status: 400, headers: noStoreHeaders() }
      );
    }

    if (body.confirmation !== "RESET") {
      return NextResponse.json(
        {
          error:
            'Type RESET exactly to confirm the account reset.',
        },
        { status: 400, headers: noStoreHeaders() }
      );
    }

    const startingCash = Number(body.startingCash);

    if (
      !Number.isFinite(startingCash) ||
      startingCash < 100 ||
      startingCash > 10_000_000
    ) {
      return NextResponse.json(
        {
          error:
            "Starting cash must be between $100 and $10,000,000.",
        },
        { status: 400, headers: noStoreHeaders() }
      );
    }

    /*
     * Delete child data first, then reset the account balance.
     * Every query is scoped to the authenticated user.
     */
    const deletionResults = await Promise.all([
      supabase
        .from("portfolio_snapshots")
        .delete()
        .eq("user_id", user.id),

      supabase
        .from("transactions")
        .delete()
        .eq("user_id", user.id),

      supabase
        .from("portfolio_holdings")
        .delete()
        .eq("user_id", user.id),
    ]);

    const deletionError = deletionResults.find(
      (result) => result.error
    )?.error;

    if (deletionError) {
      throw new Error(deletionError.message);
    }

    const { error: accountError } = await supabase
      .from("accounts")
      .upsert(
        {
          user_id: user.id,
          cash_balance: Number(
            startingCash.toFixed(2)
          ),
        },
        {
          onConflict: "user_id",
        }
      );

    if (accountError) {
      throw new Error(accountError.message);
    }

    return NextResponse.json(
      {
        success: true,
        cashBalance: Number(
          startingCash.toFixed(2)
        ),
      },
      { headers: noStoreHeaders() }
    );
  } catch (error) {
    console.error("Settings reset error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to reset your paper account.",
      },
      { status: 500, headers: noStoreHeaders() }
    );
  }
}

function noStoreHeaders() {
  return {
    "Cache-Control":
      "private, no-cache, no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}