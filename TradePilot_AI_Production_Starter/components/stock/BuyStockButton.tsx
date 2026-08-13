"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type BuyStockButtonProps = {
  symbol: string;
  companyName: string;
  currentPrice: number;
};

type BuyTradeResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  trade?: {
    symbol: string;
    transactionType: "buy";
    shares: number;
    price: number;
    totalAmount: number;
  };
  account?: {
    cashBalance: number;
  };
  holding?: {
    symbol: string;
    shares: number;
    averageCost: number;
  };
};

export default function BuyStockButton({
  symbol,
  companyName,
  currentPrice,
}: BuyStockButtonProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [sharesInput, setSharesInput] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const shares = Number(sharesInput);

  const estimatedTotal = useMemo(() => {
    if (
      !Number.isFinite(shares) ||
      shares <= 0 ||
      !Number.isFinite(currentPrice) ||
      currentPrice <= 0
    ) {
      return 0;
    }

    return shares * currentPrice;
  }, [shares, currentPrice]);

  function openModal() {
    setIsOpen(true);
    setError("");
    setMessage("");
    setSharesInput("1");
  }

  function closeModal() {
    if (isSubmitting) {
      return;
    }

    setIsOpen(false);
    setError("");
    setMessage("");
    setSharesInput("1");
  }

  async function handleBuy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!Number.isFinite(shares) || shares <= 0) {
      setError("Enter a number of shares greater than 0.");
      return;
    }

    if (shares > 100_000_000) {
      setError("The requested number of shares is too large.");
      return;
    }

    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
      setError("A valid market price is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      setMessage("");

      const response = await fetch("/api/trade/buy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          symbol: symbol.trim().toUpperCase(),
          shares,
          currentPrice,
        }),
      });

      let data: BuyTradeResponse;

      try {
        data = (await response.json()) as BuyTradeResponse;
      } catch {
        throw new Error(
          "The server returned an invalid response. Please try again."
        );
      }

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to complete this purchase."
        );
      }

      const purchasedSymbol =
        data.trade?.symbol || symbol.trim().toUpperCase();

      const purchasedShares =
        data.trade?.shares ?? shares;

      const purchaseAmount =
        data.trade?.totalAmount ?? estimatedTotal;

      const remainingCash =
        data.account?.cashBalance;

      setMessage(
        `Bought ${formatShares(purchasedShares)} share${
          purchasedShares === 1 ? "" : "s"
        } of ${purchasedSymbol} for ${formatCurrency(
          purchaseAmount
        )}.${
          Number.isFinite(remainingCash)
            ? ` Remaining cash: ${formatCurrency(
                remainingCash as number
              )}.`
            : ""
        }`
      );

      setSharesInput("1");

      window.setTimeout(() => {
        window.location.assign("/dashboard");
      }, 700);
    } catch (buyError) {
      console.error("Buy stock request error:", buyError);

      setError(
        buyError instanceof Error
          ? buyError.message
          : "Unable to complete this purchase."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const formIsInvalid =
    !Number.isFinite(shares) ||
    shares <= 0 ||
    shares > 100_000_000 ||
    !Number.isFinite(currentPrice) ||
    currentPrice <= 0;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        style={{
          padding: "11px 18px",
          border: "none",
          borderRadius: "11px",
          background: "#22c55e",
          color: "#04120a",
          fontSize: "15px",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        Buy
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
            aria-labelledby="buy-stock-title"
            style={{
              width: "100%",
              maxWidth: "440px",
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
                    color: "#60a5fa",
                    fontSize: "13px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Paper portfolio
                </p>

                <h2
                  id="buy-stock-title"
                  style={{
                    margin: 0,
                    fontSize: "25px",
                  }}
                >
                  Buy {companyName}
                </h2>

                <p
                  style={{
                    margin: "7px 0 0",
                    color: "#9ca3af",
                  }}
                >
                  {symbol.toUpperCase()} at{" "}
                  {formatCurrency(currentPrice)}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                aria-label="Close buy stock form"
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#9ca3af",
                  fontSize: "24px",
                  cursor: isSubmitting
                    ? "not-allowed"
                    : "pointer",
                  opacity: isSubmitting ? 0.6 : 1,
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleBuy}
              style={{
                marginTop: "24px",
              }}
            >
              <label
                htmlFor="buy-shares"
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "#d1d5db",
                  fontWeight: 650,
                }}
              >
                Shares
              </label>

              <input
                id="buy-shares"
                type="number"
                min="0.0001"
                max="100000000"
                step="0.0001"
                inputMode="decimal"
                value={sharesInput}
                onChange={(event) => {
                  setSharesInput(event.target.value);
                  setError("");
                  setMessage("");
                }}
                disabled={isSubmitting}
                required
                autoFocus
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
                  label="Market price"
                  value={formatCurrency(currentPrice)}
                />

                <SummaryItem
                  label="Estimated total"
                  value={formatCurrency(estimatedTotal)}
                />
              </div>

              <p
                style={{
                  margin: "14px 0 0",
                  color: "#6b7280",
                  fontSize: "12px",
                  lineHeight: 1.5,
                }}
              >
                This is a simulated paper trade. No real money
                or securities are involved.
              </p>

              {error && (
                <p
                  role="alert"
                  style={{
                    margin: "16px 0 0",
                    padding: "12px",
                    borderRadius: "10px",
                    border:
                      "1px solid rgba(255,107,107,0.25)",
                    background: "rgba(255,107,107,0.08)",
                    color: "#ff8a8a",
                    lineHeight: 1.5,
                  }}
                >
                  {error}
                </p>
              )}

              {message && (
                <p
                  role="status"
                  style={{
                    margin: "16px 0 0",
                    padding: "12px",
                    borderRadius: "10px",
                    border:
                      "1px solid rgba(34,197,94,0.25)",
                    background: "rgba(34,197,94,0.1)",
                    color: "#4ade80",
                    lineHeight: 1.5,
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
                    opacity: isSubmitting ? 0.6 : 1,
                  }}
                >
                  Close
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || formIsInvalid}
                  style={{
                    padding: "11px 18px",
                    border: "none",
                    borderRadius: "10px",
                    background:
                      isSubmitting || formIsInvalid
                        ? "#374151"
                        : "#22c55e",
                    color:
                      isSubmitting || formIsInvalid
                        ? "#d1d5db"
                        : "#04120a",
                    fontWeight: 800,
                    cursor:
                      isSubmitting || formIsInvalid
                        ? "not-allowed"
                        : "pointer",
                    opacity: formIsInvalid ? 0.65 : 1,
                  }}
                >
                  {isSubmitting
                    ? "Processing..."
                    : "Confirm Buy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: "14px",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "12px",
        background: "rgba(255,255,255,0.035)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#9ca3af",
          fontSize: "13px",
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: "7px 0 0",
          fontWeight: 750,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function formatCurrency(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;

  return safeValue.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatShares(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;

  return safeValue.toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });
}