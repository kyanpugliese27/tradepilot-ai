import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type BuyRequestBody = {
  symbol?: unknown;
  shares?: unknown;
  currentPrice?: unknown;
};

type AccountRow = {
  cash_balance: number | string;
};

type HoldingRow = {
  symbol: string;
  shares: number | string;
  average_cost: number | string;
};

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "You must be signed in to buy stocks.",
        },
        { status: 401 }
      );
    }

    let body: BuyRequestBody;

    try {
      body = (await request.json()) as BuyRequestBody;
    } catch {
      return NextResponse.json(
        {
          error: "The trade request is invalid.",
        },
        { status: 400 }
      );
    }

    const symbol =
      typeof body.symbol === "string"
        ? body.symbol.trim().toUpperCase()
        : "";

    const shares = Number(body.shares);
    const currentPrice = Number(body.currentPrice);

    if (!symbol) {
      return NextResponse.json(
        {
          error: "A stock symbol is required.",
        },
        { status: 400 }
      );
    }

    if (symbol.length > 10 || !/^[A-Z0-9.-]+$/.test(symbol)) {
      return NextResponse.json(
        {
          error: "The stock symbol is invalid.",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(shares) || shares <= 0) {
      return NextResponse.json(
        {
          error: "Enter a number of shares greater than 0.",
        },
        { status: 400 }
      );
    }

    if (shares > 100_000_000) {
      return NextResponse.json(
        {
          error: "The requested number of shares is too large.",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
      return NextResponse.json(
        {
          error: "A valid stock price is required.",
        },
        { status: 400 }
      );
    }

    const purchaseTotal = roundCurrency(shares * currentPrice);
    const now = new Date().toISOString();

    /*
     * Load the user's cash account.
     */
    const { data: accountData, error: accountError } = await supabase
      .from("accounts")
      .select("cash_balance")
      .eq("user_id", user.id)
      .single<AccountRow>();

    if (accountError) {
      throw new Error(
        `Unable to load your cash account: ${accountError.message}`
      );
    }

    const previousCashBalance = Number(accountData.cash_balance);

    if (
      !Number.isFinite(previousCashBalance) ||
      previousCashBalance < 0
    ) {
      throw new Error("Your cash balance is invalid.");
    }

    if (purchaseTotal > previousCashBalance) {
      return NextResponse.json(
        {
          error: `Insufficient buying power. This purchase costs ${formatCurrency(
            purchaseTotal
          )}, but you only have ${formatCurrency(
            previousCashBalance
          )}.`,
        },
        { status: 400 }
      );
    }

    /*
     * Load the existing holding, if the user already owns this stock.
     */
    const { data: existingHolding, error: holdingError } =
      await supabase
        .from("portfolio_holdings")
        .select("symbol, shares, average_cost")
        .eq("user_id", user.id)
        .eq("symbol", symbol)
        .maybeSingle<HoldingRow>();

    if (holdingError) {
      throw new Error(
        `Unable to load your holding: ${holdingError.message}`
      );
    }

    const previousShares = existingHolding
      ? Number(existingHolding.shares)
      : 0;

    const previousAverageCost = existingHolding
      ? Number(existingHolding.average_cost)
      : 0;

    if (
      !Number.isFinite(previousShares) ||
      previousShares < 0 ||
      !Number.isFinite(previousAverageCost) ||
      previousAverageCost < 0
    ) {
      throw new Error("Your existing holding contains invalid data.");
    }

    const updatedShares = previousShares + shares;

    const updatedAverageCost =
      previousShares > 0
        ? (previousShares * previousAverageCost +
            shares * currentPrice) /
          updatedShares
        : currentPrice;

    const newCashBalance = roundCurrency(
      previousCashBalance - purchaseTotal
    );

    /*
     * Step 1: Deduct the cash.
     */
    const { data: updatedAccount, error: cashUpdateError } =
      await supabase
        .from("accounts")
        .update({
          cash_balance: newCashBalance,
          updated_at: now,
        })
        .eq("user_id", user.id)
        .select("cash_balance")
        .single<AccountRow>();

    if (cashUpdateError || !updatedAccount) {
      throw new Error(
        cashUpdateError
          ? `Unable to update your cash balance: ${cashUpdateError.message}`
          : "The updated cash account was not returned."
      );
    }

    let holdingWasChanged = false;

    try {
      /*
       * Step 2: Create or update the holding.
       */
      if (existingHolding) {
        const { error: holdingUpdateError } = await supabase
          .from("portfolio_holdings")
          .update({
            shares: updatedShares,
            average_cost: roundNumber(updatedAverageCost, 8),
            updated_at: now,
          })
          .eq("user_id", user.id)
          .eq("symbol", symbol);

        if (holdingUpdateError) {
          throw new Error(
            `Unable to update your holding: ${holdingUpdateError.message}`
          );
        }
      } else {
        const { error: holdingInsertError } = await supabase
          .from("portfolio_holdings")
          .insert({
            user_id: user.id,
            symbol,
            shares,
            average_cost: roundNumber(currentPrice, 8),
            created_at: now,
            updated_at: now,
          });

        if (holdingInsertError) {
          throw new Error(
            `Unable to create your holding: ${holdingInsertError.message}`
          );
        }
      }

      holdingWasChanged = true;

      /*
       * Step 3: Save the buy in transaction history.
       *
       * Your existing transactions table uses:
       * transaction_type = "buy"
       * price = the price per share
       */
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          symbol,
          transaction_type: "buy",
          shares,
          price: roundNumber(currentPrice, 8),
          total_amount: purchaseTotal,
          realized_gain_loss: 0,
          created_at: now,
        });

      if (transactionError) {
        throw new Error(
          `Unable to save the transaction: ${transactionError.message}`
        );
      }

      /*
       * Step 4: Save a portfolio snapshot.
       * A failure here will not cancel the completed trade.
       */
      await savePortfolioSnapshot({
        supabase,
        userId: user.id,
        cashBalance: newCashBalance,
        tradedSymbol: symbol,
        tradedPrice: currentPrice,
      });

      return NextResponse.json({
        success: true,
        message: `Bought ${formatShares(shares)} share${
          shares === 1 ? "" : "s"
        } of ${symbol}.`,
        trade: {
          symbol,
          transactionType: "buy",
          shares,
          price: currentPrice,
          totalAmount: purchaseTotal,
        },
        account: {
          cashBalance: Number(updatedAccount.cash_balance),
        },
        holding: {
          symbol,
          shares: updatedShares,
          averageCost: roundNumber(updatedAverageCost, 8),
        },
      });
    } catch (tradeError) {
      /*
       * Attempt to restore the account and holding if a later step fails.
       */
      await supabase
        .from("accounts")
        .update({
          cash_balance: previousCashBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (holdingWasChanged) {
        if (existingHolding) {
          await supabase
            .from("portfolio_holdings")
            .update({
              shares: previousShares,
              average_cost: previousAverageCost,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id)
            .eq("symbol", symbol);
        } else {
          await supabase
            .from("portfolio_holdings")
            .delete()
            .eq("user_id", user.id)
            .eq("symbol", symbol);
        }
      }

      throw tradeError;
    }
  } catch (error) {
    console.error("Buy trade API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to complete this purchase.",
      },
      { status: 500 }
    );
  }
}

async function savePortfolioSnapshot({
  supabase,
  userId,
  cashBalance,
  tradedSymbol,
  tradedPrice,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  cashBalance: number;
  tradedSymbol: string;
  tradedPrice: number;
}) {
  try {
    const { data: holdingsData, error: holdingsError } =
      await supabase
        .from("portfolio_holdings")
        .select("symbol, shares, average_cost")
        .eq("user_id", userId);

    if (holdingsError) {
      console.error(
        "Unable to load holdings for buy snapshot:",
        holdingsError
      );
      return;
    }

    const holdings = (holdingsData || []) as HoldingRow[];

    const portfolioValue = holdings.reduce((total, holding) => {
      const shares = Number(holding.shares);
      const averageCost = Number(holding.average_cost);

      if (
        !Number.isFinite(shares) ||
        shares <= 0 ||
        !Number.isFinite(averageCost)
      ) {
        return total;
      }

      const estimatedPrice =
        holding.symbol.trim().toUpperCase() === tradedSymbol
          ? tradedPrice
          : averageCost;

      return total + shares * estimatedPrice;
    }, 0);

    const totalAccountValue = cashBalance + portfolioValue;

    const { error: snapshotError } = await supabase
      .from("portfolio_snapshots")
      .insert({
        user_id: userId,
        cash_balance: roundCurrency(cashBalance),
        portfolio_value: roundCurrency(portfolioValue),
        total_account_value: roundCurrency(totalAccountValue),
        recorded_at: new Date().toISOString(),
      });

    if (snapshotError) {
      console.error(
        "Unable to save buy portfolio snapshot:",
        snapshotError
      );
    }
  } catch (error) {
    console.error("Buy portfolio snapshot error:", error);
  }
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundNumber(value: number, decimalPlaces: number) {
  const multiplier = 10 ** decimalPlaces;

  return (
    Math.round((value + Number.EPSILON) * multiplier) /
    multiplier
  );
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatShares(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });
}