"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type TransactionRow = {
  id: string;
  symbol: string;
  transaction_type: "buy" | "sell";
  shares: number | string;
  price: number | string;
  total_amount: number | string;
  realized_gain_loss: number | string | null;
  created_at: string;
};

export default function ActivityPage() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "buy" | "sell">("all");

  const loadTransactions = useCallback(async (showLoading = true) => {
    const supabase = createClient();

    try {
      if (showLoading) {
        setIsLoading(true);
      }

      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const { data, error: transactionError } = await supabase
        .from("transactions")
        .select(
          `
            id,
            symbol,
            transaction_type,
            shares,
            price,
            total_amount,
            realized_gain_loss,
            created_at
          `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (transactionError) {
        throw new Error(transactionError.message);
      }

      setTransactions((data as TransactionRow[]) ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load your transaction history."
      );
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadTransactions(true);

    const refreshInterval = window.setInterval(() => {
      loadTransactions(false);
    }, 15000);

    const refreshOnFocus = () => {
      loadTransactions(false);
    };

    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") {
        loadTransactions(false);
      }
    };

    window.addEventListener("focus", refreshOnFocus);
    window.addEventListener("pageshow", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisibility);

    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", refreshOnFocus);
      window.removeEventListener("pageshow", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
    };
  }, [loadTransactions]);

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toUpperCase();

    return transactions.filter((transaction) => {
      const matchesType =
        typeFilter === "all" ||
        transaction.transaction_type === typeFilter;

      const matchesSearch =
        normalizedSearch.length === 0 ||
        transaction.symbol.toUpperCase().includes(normalizedSearch);

      return matchesType && matchesSearch;
    });
  }, [transactions, searchQuery, typeFilter]);

  const totals = useMemo(() => {
    return transactions.reduce(
      (summary, transaction) => {
        const totalAmount = Number(transaction.total_amount);
        const realizedGainLoss = Number(
          transaction.realized_gain_loss ?? 0
        );

        if (transaction.transaction_type === "buy") {
          summary.totalBought += Number.isFinite(totalAmount)
            ? totalAmount
            : 0;
        }

        if (transaction.transaction_type === "sell") {
          summary.totalSold += Number.isFinite(totalAmount)
            ? totalAmount
            : 0;

          summary.realizedGainLoss += Number.isFinite(realizedGainLoss)
            ? realizedGainLoss
            : 0;
        }

        return summary;
      },
      {
        totalBought: 0,
        totalSold: 0,
        realizedGainLoss: 0,
      }
    );
  }, [transactions]);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px 22px 60px",
        background:
          "radial-gradient(circle at top, #11233d 0%, #07111f 42%, #030712 100%)",
        color: "#f9fafb",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1180px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "18px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 7px",
                color: "#60a5fa",
                fontSize: "13px",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              TradePilot AI
            </p>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(30px, 5vw, 44px)",
                letterSpacing: "-0.03em",
              }}
            >
              Activity
            </h1>

            <p
              style={{
                margin: "10px 0 0",
                color: "#9ca3af",
                fontSize: "16px",
              }}
            >
              Review your complete paper-trading history.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            style={{
              padding: "11px 17px",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: "11px",
              background: "rgba(255,255,255,0.05)",
              color: "#e5e7eb",
              fontWeight: 750,
              cursor: "pointer",
            }}
          >
            Back to dashboard
          </button>
        </div>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "14px",
            marginTop: "30px",
          }}
        >
          <SummaryCard
            label="Total transactions"
            value={transactions.length.toLocaleString()}
          />

          <SummaryCard
            label="Total bought"
            value={formatCurrency(totals.totalBought)}
          />

          <SummaryCard
            label="Total sold"
            value={formatCurrency(totals.totalSold)}
          />

          <SummaryCard
            label="Realized gain/loss"
            value={`${totals.realizedGainLoss >= 0 ? "+" : "-"}${formatCurrency(
              Math.abs(totals.realizedGainLoss)
            )}`}
            valueColor={
              totals.realizedGainLoss >= 0 ? "#4ade80" : "#ff8a8a"
            }
          />
        </section>

        <section
          style={{
            marginTop: "24px",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "18px",
            background: "rgba(13,24,40,0.88)",
            boxShadow: "0 24px 70px rgba(0,0,0,0.22)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "20px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "14px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "20px",
                  }}
                >
                  Transaction history
                </h2>

                <p
                  style={{
                    margin: "6px 0 0",
                    color: "#9ca3af",
                    fontSize: "13px",
                  }}
                >
                  {filteredTransactions.length.toLocaleString()} matching trade
                  {filteredTransactions.length === 1 ? "" : "s"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => loadTransactions(true)}
                disabled={isLoading}
                style={{
                  padding: "9px 13px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "9px",
                  background: "rgba(255,255,255,0.04)",
                  color: "#d1d5db",
                  fontWeight: 700,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {isLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: "12px",
                marginTop: "16px",
              }}
            >
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search ticker, for example NVDA"
                aria-label="Search transactions by ticker"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "11px 13px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "10px",
                  outline: "none",
                  background: "#07111f",
                  color: "#f9fafb",
                  fontSize: "14px",
                }}
              />

              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(
                    event.target.value as "all" | "buy" | "sell"
                  )
                }
                aria-label="Filter transaction type"
                style={{
                  minWidth: "135px",
                  padding: "11px 13px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "10px",
                  outline: "none",
                  background: "#07111f",
                  color: "#f9fafb",
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              >
                <option value="all">All trades</option>
                <option value="buy">Buys only</option>
                <option value="sell">Sells only</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div
              style={{
                padding: "40px 20px",
                color: "#9ca3af",
                textAlign: "center",
              }}
            >
              Loading your transactions...
            </div>
          ) : error ? (
            <div
              style={{
                margin: "20px",
                padding: "14px",
                borderRadius: "11px",
                background: "rgba(255,107,107,0.08)",
                color: "#ff8a8a",
              }}
            >
              {error}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div
              style={{
                padding: "46px 20px",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: 750,
                }}
              >
                No activity yet
              </p>

              <p
                style={{
                  margin: "8px 0 0",
                  color: "#9ca3af",
                }}
              >
                No transactions match your current search or filter.
              </p>
            </div>
          ) : (
            <>
              <div
                className="activity-desktop-table"
                style={{
                  overflowX: "auto",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    minWidth: "880px",
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr>
                      <TableHeader>Type</TableHeader>
                      <TableHeader>Symbol</TableHeader>
                      <TableHeader>Shares</TableHeader>
                      <TableHeader>Price</TableHeader>
                      <TableHeader>Total</TableHeader>
                      <TableHeader>Realized P/L</TableHeader>
                      <TableHeader>Date</TableHeader>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredTransactions.map((transaction) => {
                      const isBuy =
                        transaction.transaction_type === "buy";

                      const realizedGainLoss = Number(
                        transaction.realized_gain_loss ?? 0
                      );

                      return (
                        <tr
                          key={transaction.id}
                          style={{
                            borderTop:
                              "1px solid rgba(255,255,255,0.07)",
                          }}
                        >
                          <TableCell>
                            <TransactionBadge
                              transactionType={
                                transaction.transaction_type
                              }
                            />
                          </TableCell>

                          <TableCell>
                            <span
                              style={{
                                fontWeight: 850,
                                letterSpacing: "0.03em",
                              }}
                            >
                              {transaction.symbol}
                            </span>
                          </TableCell>

                          <TableCell>
                            {formatShares(transaction.shares)}
                          </TableCell>

                          <TableCell>
                            {formatCurrency(Number(transaction.price))}
                          </TableCell>

                          <TableCell>
                            <span
                              style={{
                                color: isBuy ? "#ff8a8a" : "#4ade80",
                                fontWeight: 750,
                              }}
                            >
                              {isBuy ? "-" : "+"}
                              {formatCurrency(
                                Number(transaction.total_amount)
                              )}
                            </span>
                          </TableCell>

                          <TableCell>
                            {isBuy ? (
                              <span style={{ color: "#6b7280" }}>—</span>
                            ) : (
                              <span
                                style={{
                                  color:
                                    realizedGainLoss >= 0
                                      ? "#4ade80"
                                      : "#ff8a8a",
                                  fontWeight: 750,
                                }}
                              >
                                {realizedGainLoss >= 0 ? "+" : "-"}
                                {formatCurrency(
                                  Math.abs(realizedGainLoss)
                                )}
                              </span>
                            )}
                          </TableCell>

                          <TableCell>
                            <span style={{ color: "#9ca3af" }}>
                              {formatDate(transaction.created_at)}
                            </span>
                          </TableCell>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="activity-mobile-list">
                {filteredTransactions.map((transaction) => {
                  const isBuy =
                    transaction.transaction_type === "buy";

                  const realizedGainLoss = Number(
                    transaction.realized_gain_loss ?? 0
                  );

                  return (
                    <article
                      key={transaction.id}
                      style={{
                        padding: "18px",
                        borderTop:
                          "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "14px",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "9px",
                            }}
                          >
                            <TransactionBadge
                              transactionType={
                                transaction.transaction_type
                              }
                            />

                            <span
                              style={{
                                fontWeight: 850,
                                fontSize: "17px",
                              }}
                            >
                              {transaction.symbol}
                            </span>
                          </div>

                          <p
                            style={{
                              margin: "7px 0 0",
                              color: "#9ca3af",
                              fontSize: "13px",
                            }}
                          >
                            {formatDate(transaction.created_at)}
                          </p>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <p
                            style={{
                              margin: 0,
                              color: isBuy ? "#ff8a8a" : "#4ade80",
                              fontWeight: 800,
                            }}
                          >
                            {isBuy ? "-" : "+"}
                            {formatCurrency(
                              Number(transaction.total_amount)
                            )}
                          </p>

                          <p
                            style={{
                              margin: "6px 0 0",
                              color: "#9ca3af",
                              fontSize: "13px",
                            }}
                          >
                            {formatShares(transaction.shares)} shares at{" "}
                            {formatCurrency(
                              Number(transaction.price)
                            )}
                          </p>
                        </div>
                      </div>

                      {!isBuy && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "12px",
                            marginTop: "14px",
                            paddingTop: "13px",
                            borderTop:
                              "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <span
                            style={{
                              color: "#9ca3af",
                              fontSize: "13px",
                            }}
                          >
                            Realized gain/loss
                          </span>

                          <span
                            style={{
                              color:
                                realizedGainLoss >= 0
                                  ? "#4ade80"
                                  : "#ff8a8a",
                              fontSize: "13px",
                              fontWeight: 750,
                            }}
                          >
                            {realizedGainLoss >= 0 ? "+" : "-"}
                            {formatCurrency(
                              Math.abs(realizedGainLoss)
                            )}
                          </span>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      <style jsx>{`
        .activity-mobile-list {
          display: none;
        }

        @media (max-width: 760px) {
          .activity-desktop-table {
            display: none;
          }

          .activity-mobile-list {
            display: block;
          }

          select,
          input[type="search"] {
            min-width: 0 !important;
          }
        }
      `}</style>
    </main>
  );
}

function SummaryCard({
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
        padding: "18px",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "15px",
        background: "rgba(13,24,40,0.82)",
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
          margin: "9px 0 0",
          color: valueColor ?? "#f9fafb",
          fontSize: "22px",
          fontWeight: 850,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function TransactionBadge({
  transactionType,
}: {
  transactionType: "buy" | "sell";
}) {
  const isBuy = transactionType === "buy";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "5px 9px",
        borderRadius: "999px",
        background: isBuy
          ? "rgba(34,197,94,0.12)"
          : "rgba(239,68,68,0.12)",
        color: isBuy ? "#4ade80" : "#ff8a8a",
        fontSize: "11px",
        fontWeight: 850,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {transactionType}
    </span>
  );
}

function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        padding: "14px 18px",
        color: "#9ca3af",
        fontSize: "12px",
        fontWeight: 750,
        textAlign: "left",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}
    >
      {children}
    </th>
  );
}

function TableCell({ children }: { children: React.ReactNode }) {
  return (
    <td
      style={{
        padding: "17px 18px",
        fontSize: "14px",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}

function formatCurrency(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;

  return safeValue.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatShares(value: number | string) {
  const shares = Number(value);

  if (!Number.isFinite(shares)) {
    return "0";
  }

  return shares.toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}