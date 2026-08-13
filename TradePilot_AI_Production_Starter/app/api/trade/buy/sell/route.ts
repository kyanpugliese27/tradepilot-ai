import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SellRequestBody = {
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
          error: "You must be signed in to sell stocks.",
        },
        { status: 401 }
      );
    }

    let body: SellRequestBody;

    try {
      body = (await request.json()) as SellRequestBody;
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

    const now = new Date().toISOString();

    /*
     * Load the user's current holding.
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

    if (!existingHolding) {
      return NextResponse.json(
        {
          error: `You do not currently own any shares of ${symbol}.`,
        },
        { status: 400 }
      );
    }

    const previousShares = Number(existingHolding.shares);
    const averageCost = Number(existingHolding.average_cost);

    if (!Number.isFinite(previousShares) || previousShares <= 0) {
      throw new Error("Your existing share amount is invalid.");
    }

    if (!Number.isFinite(averageCost) || averageCost < 0) {
      throw new Error("Your average cost is invalid.");
    }

    if (shares > previousShares) {
      return NextResponse.json(
        {
          error: `You only own ${formatShares(previousShares)} share${
            previousShares === 1 ? "" : "s"
          } of ${symbol}.`,
        },
        { status: 400 }
      );
    }

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

    const saleProceeds = roundCurrency(shares * currentPrice);

    const realizedGainLoss = roundCurrency(
      shares * (currentPrice - averageCost)
    );

    const remainingShares = roundNumber(
      previousShares - shares,
      8
    );

    const newCashBalance = roundCurrency(
      previousCashBalance + saleProceeds
    );

    let holdingWasChanged = false;
    let holdingWasDeleted = false;

    try {
      /*
       * Step 1: Reduce or remove the holding.
       */
      if (remainingShares <= 0.00000001) {
        const { error: deleteError } = await supabase
          .from("portfolio_holdings")
          .delete()
          .eq("user_id", user.id)
          .eq("symbol", symbol);

        if (deleteError) {
          throw new Error(
            `Unable to remove your holding: ${deleteError.message}`
          );
        }

        holdingWasDeleted = true;
      } else {
        const { error: holdingUpdateError } = await supabase
          .from("portfolio_holdings")
          .update({
            shares: remainingShares,
            updated_at: now,
          })
          .eq("user_id", user.id)
          .eq("symbol", symbol);

        if (holdingUpdateError) {
          throw new Error(
            `Unable to update your holding: ${holdingUpdateError.message}`
          );
        }
      }

      holdingWasChanged = true;

      /*
       * Step 2: Add the proceeds to the cash balance.
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

      /*
       * Step 3: Save the sale in transaction history.
       *
       * Your transactions table uses:
       * transaction_type = "sell"
       * price = price per share
       */
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          symbol,
          transaction_type: "sell",
          shares,
          price: roundNumber(currentPrice, 8),
          total_amount: saleProceeds,
          realized_gain_loss: realizedGainLoss,
          created_at: now,
        });

      if (transactionError) {
        throw new Error(
          `Unable to save the transaction: ${transactionError.message}`
        );
      }

      /*
       * Step 4: Save a portfolio snapshot.
       * A snapshot failure will not cancel the completed sale.
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
        message: `Sold ${formatShares(shares)} share${
          shares === 1 ? "" : "s"
        } of ${symbol}.`,
        trade: {
          symbol,
          transactionType: "sell",
          shares,
          price: currentPrice,
          totalAmount: saleProceeds,
          realizedGainLoss,
        },
        account: {
          cashBalance: Number(updatedAccount.cash_balance),
        },
        holding: {
          symbol,
          shares: Math.max(remainingShares, 0),
          averageCost,
        },
      });
    } catch (tradeError) {
      /*
       * Attempt to restore the previous cash balance.
       */
      await supabase
        .from("accounts")
        .update({
          cash_balance: previousCashBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      /*
       * Attempt to restore the original holding.
       */
      if (holdingWasChanged) {
        if (holdingWasDeleted) {
          await supabase.from("portfolio_holdings").insert({
            user_id: user.id,
            symbol,
            shares: previousShares,
            average_cost: averageCost,
            created_at: now,
            updated_at: new Date().toISOString(),
          });
        } else {
          await supabase
            .from("portfolio_holdings")
            .update({
              shares: previousShares,
              average_cost: averageCost,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id)
            .eq("symbol", symbol);
        }
      }

      throw tradeError;
    }
  } catch (error) {
    console.error("Sell trade API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to complete this sale.",
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
        "Unable to load holdings for sell snapshot:",
        holdingsError
      );
      return;
    }

    const holdings = (holdingsData || []) as HoldingRow[];

    const portfolioValue = holdings.reduce((total, holding) => {
      const holdingShares = Number(holding.shares);
      const holdingAverageCost = Number(holding.average_cost);

      if (
        !Number.isFinite(holdingShares) ||
        holdingShares <= 0 ||
        !Number.isFinite(holdingAverageCost)
      ) {
        return total;
      }

      const estimatedPrice =
        holding.symbol.trim().toUpperCase() === tradedSymbol
          ? tradedPrice
          : holdingAverageCost;

      return total + holdingShares * estimatedPrice;
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
        "Unable to save sell portfolio snapshot:",
        snapshotError
      );
    }
  } catch (error) {
    console.error("Sell portfolio snapshot error:", error);
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

function formatShares(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });
}