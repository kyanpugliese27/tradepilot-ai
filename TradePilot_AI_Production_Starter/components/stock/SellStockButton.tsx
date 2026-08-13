"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type SellStockButtonProps = {
  symbol: string;
  companyName: string;
  currentPrice: number;
};

type HoldingRow = {
  shares: number | string;
  average_cost: number | string;
};

type AccountRow = {
  cash_balance: number | string;
};

export default function SellStockButton({
  symbol,
  companyName,
  currentPrice,
}: SellStockButtonProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [sharesInput, setSharesInput] = useState("1");
  const [ownedShares, setOwnedShares] = useState(0);
  const [averageCost, setAverageCost] = useState(0);
  const [loadingHolding, setLoadingHolding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const shares = Number(sharesInput);

  const estimatedProceeds = useMemo(() => {
    if (!Number.isFinite(shares) || shares <= 0) {
      return 0;
    }

    return shares * currentPrice;
  }, [shares, currentPrice]);

  const estimatedGainLoss = useMemo(() => {
    if (!Number.isFinite(shares) || shares <= 0) {
      return 0;
    }

    return shares * (currentPrice - averageCost);
  }, [shares, currentPrice, averageCost]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    async function loadHolding() {
      const supabase = createClient();

      try {
        setLoadingHolding(true);
        setError("");
        setMessage("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.push("/login");
          return;
        }

        const normalizedSymbol = symbol.trim().toUpperCase();

        const { data: holding, error: holdingError } = await supabase
          .from("portfolio_holdings")
          .select("shares, average_cost")
          .eq("user_id", user.id)
          .eq("symbol", normalizedSymbol)
          .maybeSingle<HoldingRow>();

        if (holdingError) {
          throw holdingError;
        }

        const currentShares = holding ? Number(holding.shares) : 0;
        const currentAverageCost = holding
          ? Number(holding.average_cost)
          : 0;

        setOwnedShares(
          Number.isFinite(currentShares) ? currentShares : 0
        );

        setAverageCost(
          Number.isFinite(currentAverageCost) ? currentAverageCost : 0
        );

        if (currentShares > 0) {
          setSharesInput("1");
        }
      } catch (holdingLoadError) {
        console.error(
          "Portfolio holding load error:",
          holdingLoadError
        );

        setError(
          holdingLoadError instanceof Error
            ? holdingLoadError.message
            : "Unable to load your current holding."
        );
      } finally {
        setLoadingHolding(false);
      }
    }

    loadHolding();
  }, [isOpen, router, symbol]);

  function closeModal() {
    if (isSubmitting) {
      return;
    }

    setIsOpen(false);
    setError("");
    setMessage("");
    setSharesInput("1");
  }

  function sellAll() {
    if (ownedShares > 0) {
      setSharesInput(String(ownedShares));
    }
  }

  async function handleSell(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!Number.isFinite(shares) || shares <= 0) {
      setError("Enter a number of shares greater than 0.");
      return;
    }

    if (ownedShares <= 0) {
      setError(
        `You do not currently own any shares of ${symbol.toUpperCase()}.`
      );
      return;
    }

    if (shares > ownedShares) {
      setError(
        `You only own ${ownedShares.toLocaleString()} share${
          ownedShares === 1 ? "" : "s"
        } of ${symbol.toUpperCase()}.`
      );
      return;
    }

    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
      setError("A valid market price is required.");
      return;
    }

    const supabase = createClient();

    try {
      setIsSubmitting(true);
      setError("");
      setMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const normalizedSymbol = symbol.trim().toUpperCase();
      const saleProceeds = Number(
        (shares * currentPrice).toFixed(2)
      );
      const now = new Date().toISOString();

      // 1. Load the latest holding before changing anything.
      const { data: existingHolding, error: holdingError } =
        await supabase
          .from("portfolio_holdings")
          .select("shares, average_cost")
          .eq("user_id", user.id)
          .eq("symbol", normalizedSymbol)
          .maybeSingle<HoldingRow>();

      if (holdingError) {
        throw new Error(
          `Could not load your holding: ${holdingError.message}`
        );
      }

      if (!existingHolding) {
        throw new Error(
          `You do not own any shares of ${normalizedSymbol}.`
        );
      }

      const latestOwnedShares = Number(existingHolding.shares);
      const latestAverageCost = Number(
        existingHolding.average_cost
      );

      if (
        !Number.isFinite(latestOwnedShares) ||
        latestOwnedShares <= 0
      ) {
        throw new Error(
          `You do not own any shares of ${normalizedSymbol}.`
        );
      }

      if (
        !Number.isFinite(latestAverageCost) ||
        latestAverageCost < 0
      ) {
        throw new Error(
          "The average cost for this holding is invalid."
        );
      }

      if (shares > latestOwnedShares) {
        throw new Error(
          `You only own ${latestOwnedShares.toLocaleString()} share${
            latestOwnedShares === 1 ? "" : "s"
          } of ${normalizedSymbol}.`
        );
      }

      // 2. Load the current cash balance.
      const { data: account, error: accountError } = await supabase
        .from("accounts")
        .select("cash_balance")
        .eq("user_id", user.id)
        .single<AccountRow>();

      if (accountError) {
        throw new Error(
          `Could not load your cash account: ${accountError.message}`
        );
      }

      const currentCash = Number(account.cash_balance);

      if (!Number.isFinite(currentCash)) {
        throw new Error("Your cash balance is invalid.");
      }

      const remainingShares = latestOwnedShares - shares;

      const realizedGainLoss = Number(
        (shares * (currentPrice - latestAverageCost)).toFixed(2)
      );

      // Restores the original holding if a later step fails.
      async function restoreOriginalHolding() {
        if (remainingShares <= 0.00000001) {
          await supabase.from("portfolio_holdings").insert({
            user_id: user!.id,
            symbol: normalizedSymbol,
            shares: latestOwnedShares,
            average_cost: latestAverageCost,
          });
        } else {
          await supabase
            .from("portfolio_holdings")
            .update({
              shares: latestOwnedShares,
              average_cost: latestAverageCost,
              updated_at: now,
            })
            .eq("user_id", user!.id)
            .eq("symbol", normalizedSymbol);
        }
      }

      // 3. Remove or reduce the holding.
      if (remainingShares <= 0.00000001) {
        const { error: deleteError } = await supabase
          .from("portfolio_holdings")
          .delete()
          .eq("user_id", user.id)
          .eq("symbol", normalizedSymbol);

        if (deleteError) {
          throw new Error(
            `Holding could not be removed: ${deleteError.message}`
          );
        }
      } else {
        const { error: updateError } = await supabase
          .from("portfolio_holdings")
          .update({
            shares: remainingShares,
            updated_at: now,
          })
          .eq("user_id", user.id)
          .eq("symbol", normalizedSymbol);

        if (updateError) {
          throw new Error(
            `Holding could not be updated: ${updateError.message}`
          );
        }
      }

      // 4. Add the sale proceeds to the cash balance.
      const newCashBalance = Number(
        (currentCash + saleProceeds).toFixed(2)
      );

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

      if (cashUpdateError) {
        await restoreOriginalHolding();

        throw new Error(
          `Cash balance could not be updated: ${cashUpdateError.message}`
        );
      }

      if (!updatedAccount) {
        await supabase
          .from("accounts")
          .update({
            cash_balance: currentCash,
            updated_at: now,
          })
          .eq("user_id", user.id);

        await restoreOriginalHolding();

        throw new Error(
          "Supabase did not return the updated cash account."
        );
      }

      // 5. Save the sale in transaction history.
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          symbol: normalizedSymbol,
          transaction_type: "sell",
          shares,
          price: currentPrice,
          total_amount: saleProceeds,
          realized_gain_loss: realizedGainLoss,
        });

      if (transactionError) {
        // Restore the original cash balance.
        await supabase
          .from("accounts")
          .update({
            cash_balance: currentCash,
            updated_at: now,
          })
          .eq("user_id", user.id);

        // Restore the original holding.
        await restoreOriginalHolding();

        throw new Error(
          `Transaction history could not be saved: ${transactionError.message}`
        );
      }

      setOwnedShares(Math.max(remainingShares, 0));

      const gainLossText = `${realizedGainLoss >= 0 ? "+" : "-"}${Math.abs(
        realizedGainLoss
      ).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })}`;

      setMessage(
        `Sold ${shares.toLocaleString()} share${
          shares === 1 ? "" : "s"
        } of ${normalizedSymbol} for ${saleProceeds.toLocaleString(
          "en-US",
          {
            style: "currency",
            currency: "USD",
          }
        )}. Realized gain/loss: ${gainLossText}. New cash balance: ${Number(
          updatedAccount.cash_balance
        ).toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        })}.`
      );

      setSharesInput("1");
      window.setTimeout(() => {
        window.location.assign("/dashboard");
      }, 700);
    } catch (sellError) {
      console.error("Portfolio sale error:", sellError);

      setError(
        sellError instanceof Error
          ? sellError.message
          : "Unable to complete this sale."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const gainIsPositive = estimatedGainLoss >= 0;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setError("");
          setMessage("");
        }}
        style={{
          padding: "11px 18px",
          border: "1px solid rgba(255,107,107,0.45)",
          borderRadius: "11px",
          background: "rgba(255,107,107,0.1)",
          color: "#ff8a8a",
          fontSize: "15px",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        Sell
      </button>

      {isOpen && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            background: "rgba(0,0,0,0.72)",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sell-stock-title"
            style={{
              width: "100%",
              maxWidth: "460px",
              padding: "26px",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "20px",
              background: "#0d1828",
              boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "16px",
              }}
            >
              <div>
                <p
                  style={{
                    margin: "0 0 6px",
                    color: "#ff8a8a",
                    fontSize: "13px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Paper portfolio
                </p>

                <h2
                  id="sell-stock-title"
                  style={{
                    margin: 0,
                    fontSize: "25px",
                  }}
                >
                  Sell {companyName}
                </h2>

                <p
                  style={{
                    margin: "7px 0 0",
                    color: "#9ca3af",
                  }}
                >
                  {symbol.toUpperCase()} at ${currentPrice.toFixed(2)}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                aria-label="Close sell stock form"
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#9ca3af",
                  fontSize: "24px",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                }}
              >
                ×
              </button>
            </div>

            {loadingHolding ? (
              <p style={{ marginTop: "24px", color: "#9ca3af" }}>
                Loading your holding...
              </p>
            ) : (
              <form onSubmit={handleSell} style={{ marginTop: "24px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "8px",
                  }}
                >
                  <label
                    htmlFor="sell-shares"
                    style={{
                      color: "#d1d5db",
                      fontWeight: 650,
                    }}
                  >
                    Shares
                  </label>

                  <button
                    type="button"
                    onClick={sellAll}
                    disabled={isSubmitting || ownedShares <= 0}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#60a5fa",
                      padding: 0,
                      fontWeight: 700,
                      cursor:
                        isSubmitting || ownedShares <= 0
                          ? "not-allowed"
                          : "pointer",
                      opacity: ownedShares <= 0 ? 0.55 : 1,
                    }}
                  >
                    Sell all
                  </button>
                </div>

                <input
                  id="sell-shares"
                  type="number"
                  min="0.0001"
                  max={ownedShares > 0 ? ownedShares : undefined}
                  step="0.0001"
                  inputMode="decimal"
                  value={sharesInput}
                  onChange={(event) =>
                    setSharesInput(event.target.value)
                  }
                  disabled={isSubmitting || ownedShares <= 0}
                  required
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "13px 14px",
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: "11px",
                    outline: "none",
                    background: "#07111f",
                    color: "white",
                    fontSize: "16px",
                  }}
                />

                <p
                  style={{
                    margin: "8px 0 0",
                    color: "#9ca3af",
                    fontSize: "13px",
                  }}
                >
                  You own {ownedShares.toLocaleString()} share
                  {ownedShares === 1 ? "" : "s"}.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",
                    gap: "12px",
                    marginTop: "16px",
                  }}
                >
                  <SummaryItem
                    label="Estimated proceeds"
                    value={estimatedProceeds.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}
                  />

                  <SummaryItem
                    label="Estimated gain/loss"
                    value={`${gainIsPositive ? "+" : "-"}${Math.abs(
                      estimatedGainLoss
                    ).toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}`}
                    valueColor={
                      gainIsPositive ? "#4ade80" : "#ff8a8a"
                    }
                  />
                </div>

                {ownedShares <= 0 && !error && (
                  <p
                    style={{
                      margin: "16px 0 0",
                      padding: "12px",
                      borderRadius: "10px",
                      background: "rgba(255,255,255,0.04)",
                      color: "#9ca3af",
                    }}
                  >
                    You do not currently own this stock.
                  </p>
                )}

                {error && (
                  <p
                    style={{
                      margin: "16px 0 0",
                      padding: "12px",
                      borderRadius: "10px",
                      background: "rgba(255,107,107,0.08)",
                      color: "#ff8a8a",
                    }}
                  >
                    {error}
                  </p>
                )}

                {message && (
                  <p
                    style={{
                      margin: "16px 0 0",
                      padding: "12px",
                      borderRadius: "10px",
                      background: "rgba(34,197,94,0.1)",
                      color: "#4ade80",
                    }}
                  >
                    {message}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                    marginTop: "22px",
                  }}
                >
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isSubmitting}
                    style={{
                      padding: "11px 16px",
                      border:
                        "1px solid rgba(255,255,255,0.14)",
                      borderRadius: "10px",
                      background: "transparent",
                      color: "#d1d5db",
                      fontWeight: 700,
                      cursor: isSubmitting
                        ? "not-allowed"
                        : "pointer",
                    }}
                  >
                    Close
                  </button>

                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      ownedShares <= 0 ||
                      !Number.isFinite(shares) ||
                      shares <= 0 ||
                      shares > ownedShares
                    }
                    style={{
                      padding: "11px 17px",
                      border: "none",
                      borderRadius: "10px",
                      background:
                        isSubmitting ||
                        ownedShares <= 0 ||
                        !Number.isFinite(shares) ||
                        shares <= 0 ||
                        shares > ownedShares
                          ? "#4b5563"
                          : "#ef4444",
                      color: "white",
                      fontWeight: 800,
                      cursor:
                        isSubmitting ||
                        ownedShares <= 0 ||
                        !Number.isFinite(shares) ||
                        shares <= 0 ||
                        shares > ownedShares
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {isSubmitting
                      ? "Selling..."
                      : "Confirm Sell"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function SummaryItem({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        padding: "13px",
        borderRadius: "11px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#9ca3af",
          fontSize: "12px",
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: "6px 0 0",
          color: valueColor || "#f3f4f6",
          fontSize: "15px",
          fontWeight: 750,
        }}
      >
        {value}
      </p>
    </div>
  );
}