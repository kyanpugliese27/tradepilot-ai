import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type HoldingRow = {
  symbol: string;
  shares: number | string;
  average_cost: number | string;
};

type AccountRow = {
  cash_balance: number | string;
};

type StockDetails = {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
};

type LatestSnapshotRow = {
  recorded_at: string;
  total_account_value: number | string;
};

type RealizedTransactionRow = {
  realized_gain_loss: number | string | null;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    const [
      accountResult,
      holdingsResult,
      realizedTransactionsResult,
    ] = await Promise.all([
      supabase
        .from("accounts")
        .select("cash_balance")
        .eq("user_id", user.id)
        .single<AccountRow>(),

      supabase
        .from("portfolio_holdings")
        .select("symbol, shares, average_cost")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),

      supabase
        .from("transactions")
        .select("realized_gain_loss")
        .eq("user_id", user.id)
        .eq("transaction_type", "sell"),
    ]);

    if (accountResult.error) {
      throw new Error(
        `Unable to load your cash account: ${accountResult.error.message}`
      );
    }

    if (holdingsResult.error) {
      throw new Error(
        `Unable to load your holdings: ${holdingsResult.error.message}`
      );
    }

    if (realizedTransactionsResult.error) {
      throw new Error(
        `Unable to load realized gain/loss: ${realizedTransactionsResult.error.message}`
      );
    }

    const cashBalance = Number(accountResult.data.cash_balance);

    if (!Number.isFinite(cashBalance)) {
      throw new Error("Your cash balance is invalid.");
    }

    const holdings =
      (holdingsResult.data || []) as HoldingRow[];

    const realizedTransactions =
      (realizedTransactionsResult.data ||
        []) as RealizedTransactionRow[];

    const realizedGainLoss = realizedTransactions.reduce(
      (total, transaction) => {
        const value = Number(
          transaction.realized_gain_loss ?? 0
        );

        return total + (Number.isFinite(value) ? value : 0);
      },
      0
    );

    if (holdings.length === 0) {
      await savePortfolioSnapshot({
        supabase,
        userId: user.id,
        cashBalance,
        portfolioValue: 0,
        totalAccountValue: cashBalance,
      });

      return NextResponse.json(
        {
          holdings: [],
          summary: {
            cashBalance,
            portfolioValue: 0,
            totalAccountValue: cashBalance,
            totalInvested: 0,
            totalGainLoss: 0,
            totalGainLossPercent: 0,
            todayGainLoss: 0,
            todayGainLossPercent: 0,
          },
          analytics: createEmptyAnalytics({
            cashBalance,
            realizedGainLoss,
          }),
        },
        {
          headers: noStoreHeaders(),
        }
      );
    }

    const origin = new URL(request.url).origin;

    const holdingRequests = holdings.map(
      async (holding) => {
        const symbol = holding.symbol.trim().toUpperCase();
        const shares = Number(holding.shares);
        const averageCost = Number(holding.average_cost);

        if (!Number.isFinite(shares) || shares <= 0) {
          return null;
        }

        if (
          !Number.isFinite(averageCost) ||
          averageCost < 0
        ) {
          return null;
        }

        try {
          const response = await fetch(
            `${origin}/api/stock-details?symbol=${encodeURIComponent(
              symbol
            )}`,
            {
              cache: "no-store",
              headers: {
                "Cache-Control": "no-cache, no-store",
              },
            }
          );

          const data = await response.json();

          if (!response.ok || !data.stock) {
            return null;
          }

          const stock = data.stock as StockDetails;

          if (
            !Number.isFinite(stock.price) ||
            stock.price <= 0
          ) {
            return null;
          }

          const marketValue = shares * stock.price;
          const investedValue = shares * averageCost;
          const gainLoss = marketValue - investedValue;

          const gainLossPercent =
            investedValue > 0
              ? (gainLoss / investedValue) * 100
              : 0;

          const stockChange = Number.isFinite(
            stock.change
          )
            ? stock.change
            : 0;

          const previousClose = Number.isFinite(
            stock.previousClose
          )
            ? stock.previousClose
            : stock.price - stockChange;

          const todayGainLoss = shares * stockChange;
          const previousMarketValue =
            shares * previousClose;

          const todayGainLossPercent =
            previousMarketValue > 0
              ? (todayGainLoss /
                  previousMarketValue) *
                100
              : 0;

          return {
            symbol,
            name: stock.name || symbol,
            shares,
            averageCost,
            currentPrice: stock.price,
            marketValue,
            investedValue,
            gainLoss,
            gainLossPercent,
            todayGainLoss,
            todayGainLossPercent,
            change: stockChange,
            changePercent: Number.isFinite(
              stock.changePercent
            )
              ? stock.changePercent
              : 0,
          };
        } catch {
          return null;
        }
      }
    );

    const holdingResults = await Promise.all(
      holdingRequests
    );

    const liveHoldings = holdingResults.filter(
      (
        holding
      ): holding is NonNullable<typeof holding> =>
        holding !== null
    );

    const portfolioValue = liveHoldings.reduce(
      (total, holding) =>
        total + holding.marketValue,
      0
    );

    const totalInvested = liveHoldings.reduce(
      (total, holding) =>
        total + holding.investedValue,
      0
    );

    const totalGainLoss =
      portfolioValue - totalInvested;

    const totalGainLossPercent =
      totalInvested > 0
        ? (totalGainLoss / totalInvested) * 100
        : 0;

    const todayGainLoss = liveHoldings.reduce(
      (total, holding) =>
        total + holding.todayGainLoss,
      0
    );

    const previousPortfolioValue =
      portfolioValue - todayGainLoss;

    const todayGainLossPercent =
      previousPortfolioValue > 0
        ? (todayGainLoss /
            previousPortfolioValue) *
          100
        : 0;

    const totalAccountValue =
      cashBalance + portfolioValue;

    const allocations = liveHoldings
      .map((holding) => ({
        symbol: holding.symbol,
        name: holding.name,
        marketValue: roundCurrency(
          holding.marketValue
        ),
        allocationPercent:
          totalAccountValue > 0
            ? roundNumber(
                (holding.marketValue /
                  totalAccountValue) *
                  100,
                2
              )
            : 0,
        stockOnlyAllocationPercent:
          portfolioValue > 0
            ? roundNumber(
                (holding.marketValue /
                  portfolioValue) *
                  100,
                2
              )
            : 0,
      }))
      .sort(
        (first, second) =>
          second.marketValue -
          first.marketValue
      );

    const winners = liveHoldings.filter(
      (holding) => holding.gainLoss > 0
    );

    const losers = liveHoldings.filter(
      (holding) => holding.gainLoss < 0
    );

    const winningHoldingsCount = winners.length;
    const losingHoldingsCount = losers.length;

    const winRate =
      liveHoldings.length > 0
        ? (winningHoldingsCount /
            liveHoldings.length) *
          100
        : 0;

    const bestPerformer =
      liveHoldings.length > 0
        ? [...liveHoldings].sort(
            (first, second) =>
              second.gainLossPercent -
              first.gainLossPercent
          )[0]
        : null;

    const worstPerformer =
      liveHoldings.length > 0
        ? [...liveHoldings].sort(
            (first, second) =>
              first.gainLossPercent -
              second.gainLossPercent
          )[0]
        : null;

    const largestPosition =
      allocations.length > 0
        ? allocations[0]
        : null;

    const cashPercentage =
      totalAccountValue > 0
        ? (cashBalance / totalAccountValue) * 100
        : 0;

    const stockPercentage =
      totalAccountValue > 0
        ? (portfolioValue /
            totalAccountValue) *
          100
        : 0;

    await savePortfolioSnapshot({
      supabase,
      userId: user.id,
      cashBalance,
      portfolioValue,
      totalAccountValue,
    });

    return NextResponse.json(
      {
        holdings: liveHoldings,
        summary: {
          cashBalance,
          portfolioValue,
          totalAccountValue,
          totalInvested,
          totalGainLoss,
          totalGainLossPercent,
          todayGainLoss,
          todayGainLossPercent,
        },
        analytics: {
          holdingsCount: liveHoldings.length,
          winningHoldingsCount,
          losingHoldingsCount,
          flatHoldingsCount:
            liveHoldings.length -
            winningHoldingsCount -
            losingHoldingsCount,
          winRate: roundNumber(winRate, 2),
          unrealizedGainLoss:
            roundCurrency(totalGainLoss),
          realizedGainLoss:
            roundCurrency(realizedGainLoss),
          combinedGainLoss: roundCurrency(
            totalGainLoss + realizedGainLoss
          ),
          cashPercentage: roundNumber(
            cashPercentage,
            2
          ),
          stockPercentage: roundNumber(
            stockPercentage,
            2
          ),
          diversificationCount:
            liveHoldings.length,
          bestPerformer: bestPerformer
            ? {
                symbol: bestPerformer.symbol,
                name: bestPerformer.name,
                gainLoss: roundCurrency(
                  bestPerformer.gainLoss
                ),
                gainLossPercent: roundNumber(
                  bestPerformer.gainLossPercent,
                  2
                ),
                marketValue: roundCurrency(
                  bestPerformer.marketValue
                ),
              }
            : null,
          worstPerformer: worstPerformer
            ? {
                symbol: worstPerformer.symbol,
                name: worstPerformer.name,
                gainLoss: roundCurrency(
                  worstPerformer.gainLoss
                ),
                gainLossPercent: roundNumber(
                  worstPerformer.gainLossPercent,
                  2
                ),
                marketValue: roundCurrency(
                  worstPerformer.marketValue
                ),
              }
            : null,
          largestPosition,
          allocations: [
            ...allocations,
            {
              symbol: "CASH",
              name: "Cash",
              marketValue:
                roundCurrency(cashBalance),
              allocationPercent:
                roundNumber(
                  cashPercentage,
                  2
                ),
              stockOnlyAllocationPercent: 0,
            },
          ].sort(
            (first, second) =>
              second.marketValue -
              first.marketValue
          ),
        },
      },
      {
        headers: noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error("Portfolio API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load portfolio.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}

function createEmptyAnalytics({
  cashBalance,
  realizedGainLoss,
}: {
  cashBalance: number;
  realizedGainLoss: number;
}) {
  return {
    holdingsCount: 0,
    winningHoldingsCount: 0,
    losingHoldingsCount: 0,
    flatHoldingsCount: 0,
    winRate: 0,
    unrealizedGainLoss: 0,
    realizedGainLoss:
      roundCurrency(realizedGainLoss),
    combinedGainLoss:
      roundCurrency(realizedGainLoss),
    cashPercentage:
      cashBalance > 0 ? 100 : 0,
    stockPercentage: 0,
    diversificationCount: 0,
    bestPerformer: null,
    worstPerformer: null,
    largestPosition: null,
    allocations:
      cashBalance > 0
        ? [
            {
              symbol: "CASH",
              name: "Cash",
              marketValue:
                roundCurrency(cashBalance),
              allocationPercent: 100,
              stockOnlyAllocationPercent: 0,
            },
          ]
        : [],
  };
}

async function savePortfolioSnapshot({
  supabase,
  userId,
  cashBalance,
  portfolioValue,
  totalAccountValue,
}: {
  supabase: Awaited<
    ReturnType<typeof createClient>
  >;
  userId: string;
  cashBalance: number;
  portfolioValue: number;
  totalAccountValue: number;
}) {
  try {
    const {
      data: latestSnapshot,
      error: latestSnapshotError,
    } = await supabase
      .from("portfolio_snapshots")
      .select(
        "recorded_at, total_account_value"
      )
      .eq("user_id", userId)
      .order("recorded_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle<LatestSnapshotRow>();

    if (latestSnapshotError) {
      console.warn(
        "Unable to check latest portfolio snapshot:",
        latestSnapshotError
      );
      return;
    }

    const fifteenMinutes =
      15 * 60 * 1000;

    const latestSnapshotTime =
      latestSnapshot
        ? new Date(
            latestSnapshot.recorded_at
          ).getTime()
        : null;

    const snapshotIsRecent =
      latestSnapshotTime !== null &&
      Number.isFinite(latestSnapshotTime) &&
      Date.now() - latestSnapshotTime <
        fifteenMinutes;

    const previousValue =
      latestSnapshot
        ? Number(
            latestSnapshot.total_account_value
          )
        : null;

    const valueChanged =
      previousValue === null ||
      !Number.isFinite(previousValue) ||
      Math.abs(
        previousValue - totalAccountValue
      ) >= 0.01;

    if (
      snapshotIsRecent &&
      !valueChanged
    ) {
      return;
    }

    const { error: insertError } =
      await supabase
        .from("portfolio_snapshots")
        .insert({
          user_id: userId,
          cash_balance:
            roundCurrency(cashBalance),
          portfolio_value:
            roundCurrency(portfolioValue),
          total_account_value:
            roundCurrency(totalAccountValue),
        });

    if (insertError) {
      console.warn(
        "Unable to save portfolio snapshot:",
        insertError
      );
    }
  } catch (error) {
    console.warn(
      "Portfolio snapshot error:",
      error
    );
  }
}

function roundCurrency(value: number) {
  return (
    Math.round(
      (value + Number.EPSILON) * 100
    ) / 100
  );
}

function roundNumber(
  value: number,
  decimalPlaces: number
) {
  const multiplier =
    10 ** decimalPlaces;

  return (
    Math.round(
      (value + Number.EPSILON) *
        multiplier
    ) / multiplier
  );
}

function noStoreHeaders() {
  return {
    "Cache-Control":
      "private, no-cache, no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}