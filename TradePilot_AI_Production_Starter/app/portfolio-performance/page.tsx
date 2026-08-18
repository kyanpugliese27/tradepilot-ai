"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type TransactionRow = {
  id: string;
  symbol: string;
  transaction_type: "buy" | "sell";
  shares: number | string;
  price: number | string;
  total_amount: number | string;
  realized_gain_loss:
    | number
    | string
    | null;
  created_at: string;
};

type SideFilter =
  | "all"
  | "buy"
  | "sell";

type ResultFilter =
  | "all"
  | "profit"
  | "loss"
  | "breakeven";

type DateFilter =
  | "all"
  | "7d"
  | "30d"
  | "90d"
  | "1y";

type SortOption =
  | "newest"
  | "oldest"
  | "largest"
  | "smallest"
  | "best"
  | "worst";

export default function ActivityPage() {
  const router = useRouter();

  const [transactions, setTransactions] =
    useState<TransactionRow[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [sideFilter, setSideFilter] =
    useState<SideFilter>("all");

  const [resultFilter, setResultFilter] =
    useState<ResultFilter>("all");

  const [dateFilter, setDateFilter] =
    useState<DateFilter>("all");

  const [sort, setSort] =
    useState<SortOption>("newest");

  const loadTransactions =
    useCallback(
      async (
        manual = false
      ) => {
        const supabase =
          createClient();

        try {
          manual
            ? setRefreshing(true)
            : setLoading(true);

          setError("");

          const {
            data: { user },
            error: userError,
          } =
            await supabase.auth.getUser();

          if (
            userError ||
            !user
          ) {
            router.replace(
              "/login"
            );
            return;
          }

          const {
            data,
            error:
              transactionError,
          } = await supabase
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
            .eq(
              "user_id",
              user.id
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            );

          if (
            transactionError
          ) {
            throw new Error(
              transactionError.message
            );
          }

          setTransactions(
            (data as TransactionRow[]) ??
              []
          );
        } catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load your transaction history."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [router]
    );

  useEffect(() => {
    loadTransactions();

    const interval =
      window.setInterval(() => {
        loadTransactions(true);
      }, 60_000);

    return () =>
      window.clearInterval(
        interval
      );
  }, [loadTransactions]);

  const visibleTransactions =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toUpperCase();

      const cutoff =
        getCutoffDate(
          dateFilter
        );

      const filtered =
        transactions.filter(
          (transaction) => {
            const sideMatches =
              sideFilter ===
                "all" ||
              transaction.transaction_type ===
                sideFilter;

            const symbolMatches =
              !normalizedSearch ||
              transaction.symbol
                .toUpperCase()
                .includes(
                  normalizedSearch
                );

            const date =
              new Date(
                transaction.created_at
              );

            const dateMatches =
              !cutoff ||
              (!Number.isNaN(
                date.getTime()
              ) &&
                date >= cutoff);

            const realized =
              toNumber(
                transaction.realized_gain_loss
              );

            const resultMatches =
              resultFilter ===
                "all" ||
              (transaction.transaction_type ===
                "sell" &&
                ((resultFilter ===
                  "profit" &&
                  realized > 0) ||
                  (resultFilter ===
                    "loss" &&
                    realized < 0) ||
                  (resultFilter ===
                    "breakeven" &&
                    realized ===
                      0)));

            return (
              sideMatches &&
              symbolMatches &&
              dateMatches &&
              resultMatches
            );
          }
        );

      return [...filtered].sort(
        (a, b) => {
          if (
            sort === "oldest"
          ) {
            return (
              new Date(
                a.created_at
              ).getTime() -
              new Date(
                b.created_at
              ).getTime()
            );
          }

          if (
            sort === "largest"
          ) {
            return (
              toNumber(
                b.total_amount
              ) -
              toNumber(
                a.total_amount
              )
            );
          }

          if (
            sort === "smallest"
          ) {
            return (
              toNumber(
                a.total_amount
              ) -
              toNumber(
                b.total_amount
              )
            );
          }

          if (
            sort === "best"
          ) {
            return (
              toNumber(
                b.realized_gain_loss
              ) -
              toNumber(
                a.realized_gain_loss
              )
            );
          }

          if (
            sort === "worst"
          ) {
            return (
              toNumber(
                a.realized_gain_loss
              ) -
              toNumber(
                b.realized_gain_loss
              )
            );
          }

          return (
            new Date(
              b.created_at
            ).getTime() -
            new Date(
              a.created_at
            ).getTime()
          );
        }
      );
    }, [
      transactions,
      search,
      sideFilter,
      resultFilter,
      dateFilter,
      sort,
    ]);

  const stats = useMemo(() => {
    let totalBought = 0;
    let totalSold = 0;
    let realizedGainLoss = 0;
    let buyCount = 0;
    let sellCount = 0;
    let winningSells = 0;
    let losingSells = 0;

    const symbols =
      new Set<string>();

    for (
      const transaction of transactions
    ) {
      const total =
        toNumber(
          transaction.total_amount
        );

      const realized =
        toNumber(
          transaction.realized_gain_loss
        );

      symbols.add(
        transaction.symbol.toUpperCase()
      );

      if (
        transaction.transaction_type ===
        "buy"
      ) {
        buyCount += 1;
        totalBought += total;
      } else {
        sellCount += 1;
        totalSold += total;
        realizedGainLoss +=
          realized;

        if (realized > 0) {
          winningSells += 1;
        } else if (
          realized < 0
        ) {
          losingSells += 1;
        }
      }
    }

    const winRate =
      sellCount > 0
        ? (winningSells /
            sellCount) *
          100
        : 0;

    const averageTrade =
      transactions.length > 0
        ? transactions.reduce(
            (sum, transaction) =>
              sum +
              toNumber(
                transaction.total_amount
              ),
            0
          ) /
          transactions.length
        : 0;

    return {
      totalBought,
      totalSold,
      realizedGainLoss,
      buyCount,
      sellCount,
      winningSells,
      losingSells,
      winRate,
      averageTrade,
      symbols: symbols.size,
    };
  }, [transactions]);

  function exportCsv() {
    if (
      visibleTransactions.length ===
      0
    ) {
      setError(
        "There are no visible transactions to export."
      );
      return;
    }

    const rows = [
      [
        "Date",
        "Type",
        "Symbol",
        "Shares",
        "Price",
        "Total",
        "Realized P/L",
      ],
      ...visibleTransactions.map(
        (transaction) => [
          transaction.created_at,
          transaction.transaction_type.toUpperCase(),
          transaction.symbol,
          String(
            transaction.shares
          ),
          String(
            transaction.price
          ),
          String(
            transaction.total_amount
          ),
          String(
            transaction.realized_gain_loss ??
              0
          ),
        ]
      ),
    ];

    const csv = rows
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(
                value
              ).replace(
                /"/g,
                '""'
              )}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;
    link.download =
      "Norvexa-activity.csv";

    document.body.appendChild(
      link
    );

    link.click();
    link.remove();

    URL.revokeObjectURL(
      url
    );
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <section style={containerStyle}>
          <div style={cardStyle}>
            <h1>
              Loading Activity...
            </h1>

            <p style={mutedStyle}>
              Loading your complete
              paper-trading history.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <section style={containerStyle}>
        <div style={topBarStyle}>
          <Link
            href="/dashboard"
            style={backLinkStyle}
          >
            ← Back to Dashboard
          </Link>

          <div
            style={{
              display: "flex",
              gap: 9,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={exportCsv}
              style={secondaryButtonStyle}
            >
              Export CSV
            </button>

            <button
              type="button"
              onClick={() =>
                loadTransactions(
                  true
                )
              }
              disabled={refreshing}
              style={secondaryButtonStyle}
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh Activity"}
            </button>
          </div>
        </div>

        <p style={eyebrowStyle}>
          Paper-trading journal
        </p>

        <h1 style={titleStyle}>
          Activity Center
        </h1>

        <p style={mutedStyle}>
          Review every trade, filter
          your history, and measure
          realized trading results.
        </p>

        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}

        <div
          className="summary-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(5, minmax(0, 1fr))",
            gap: 12,
            marginTop: 22,
          }}
        >
          <SummaryCard
            label="Transactions"
            value={String(
              transactions.length
            )}
          />

          <SummaryCard
            label="Total bought"
            value={formatCurrency(
              stats.totalBought
            )}
            color="#ff8a8a"
          />

          <SummaryCard
            label="Total sold"
            value={formatCurrency(
              stats.totalSold
            )}
            color="#4ade80"
          />

          <SummaryCard
            label="Realized P/L"
            value={formatSignedCurrency(
              stats.realizedGainLoss
            )}
            color={
              stats.realizedGainLoss >=
              0
                ? "#4ade80"
                : "#ff8a8a"
            }
          />

          <SummaryCard
            label="Sell win rate"
            value={`${stats.winRate.toFixed(
              2
            )}%`}
          />
        </div>

        <div
          className="secondary-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(5, minmax(0, 1fr))",
            gap: 10,
            marginTop: 12,
          }}
        >
          <SmallCard
            label="Buy orders"
            value={String(
              stats.buyCount
            )}
          />

          <SmallCard
            label="Sell orders"
            value={String(
              stats.sellCount
            )}
          />

          <SmallCard
            label="Profitable sells"
            value={String(
              stats.winningSells
            )}
            color="#4ade80"
          />

          <SmallCard
            label="Losing sells"
            value={String(
              stats.losingSells
            )}
            color="#ff8a8a"
          />

          <SmallCard
            label="Average trade"
            value={formatCurrency(
              stats.averageTrade
            )}
          />
        </div>

        <section
          style={{
            ...cardStyle,
            marginTop: 16,
          }}
        >
          <div style={sectionHeaderStyle}>
            <div>
              <p style={eyebrowStyle}>
                Search and filters
              </p>

              <h2 style={{ margin: 0 }}>
                Transaction History
              </h2>
            </div>

            <span style={mutedStyle}>
              {
                visibleTransactions.length
              }{" "}
              shown · {stats.symbols}{" "}
              symbols traded
            </span>
          </div>

          <div
            className="controls-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "1.3fr repeat(4, minmax(130px, auto))",
              gap: 9,
              marginTop: 15,
            }}
          >
            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search ticker..."
              style={inputStyle}
            />

            <select
              value={sideFilter}
              onChange={(event) =>
                setSideFilter(
                  event.target
                    .value as SideFilter
                )
              }
              style={selectStyle}
            >
              <option value="all">
                All sides
              </option>

              <option value="buy">
                Buys
              </option>

              <option value="sell">
                Sells
              </option>
            </select>

            <select
              value={resultFilter}
              onChange={(event) =>
                setResultFilter(
                  event.target
                    .value as ResultFilter
                )
              }
              style={selectStyle}
            >
              <option value="all">
                All results
              </option>

              <option value="profit">
                Profit
              </option>

              <option value="loss">
                Loss
              </option>

              <option value="breakeven">
                Breakeven
              </option>
            </select>

            <select
              value={dateFilter}
              onChange={(event) =>
                setDateFilter(
                  event.target
                    .value as DateFilter
                )
              }
              style={selectStyle}
            >
              <option value="all">
                All dates
              </option>

              <option value="7d">
                Last 7 days
              </option>

              <option value="30d">
                Last 30 days
              </option>

              <option value="90d">
                Last 90 days
              </option>

              <option value="1y">
                Last year
              </option>
            </select>

            <select
              value={sort}
              onChange={(event) =>
                setSort(
                  event.target
                    .value as SortOption
                )
              }
              style={selectStyle}
            >
              <option value="newest">
                Newest
              </option>

              <option value="oldest">
                Oldest
              </option>

              <option value="largest">
                Largest trades
              </option>

              <option value="smallest">
                Smallest trades
              </option>

              <option value="best">
                Best realized P/L
              </option>

              <option value="worst">
                Worst realized P/L
              </option>
            </select>
          </div>

          {transactions.length ===
          0 ? (
            <EmptyState
              title="No activity yet"
              text="Your paper-trading purchases and sales will appear here."
            />
          ) : visibleTransactions.length ===
            0 ? (
            <EmptyState
              title="No matching transactions"
              text="Try changing your ticker search, date range, or filters."
            />
          ) : (
            <>
              <div
                className="activity-desktop"
                style={{
                  overflowX: "auto",
                  marginTop: 16,
                }}
              >
                <div
                  style={{
                    minWidth: 940,
                  }}
                >
                  <TableHeader />

                  {visibleTransactions.map(
                    (transaction) => (
                      <TransactionRowView
                        key={
                          transaction.id
                        }
                        transaction={
                          transaction
                        }
                      />
                    )
                  )}
                </div>
              </div>

              <div
                className="activity-mobile"
                style={{
                  display: "none",
                  marginTop: 16,
                }}
              >
                {visibleTransactions.map(
                  (transaction) => (
                    <TransactionCard
                      key={
                        transaction.id
                      }
                      transaction={
                        transaction
                      }
                    />
                  )
                )}
              </div>
            </>
          )}
        </section>

        <div style={noticeStyle}>
          <strong>
            Realized results
          </strong>

          <p
            style={{
              margin: "6px 0 0",
              ...mutedStyle,
              fontSize: 11,
              lineHeight: 1.55,
            }}
          >
            Realized gain or loss is
            recorded when shares are
            sold. Buy transactions do
            not have realized P/L.
          </p>
        </div>

        <style jsx>{`
          @media (max-width: 1050px) {
            .summary-grid,
            .secondary-grid {
              grid-template-columns:
                repeat(
                  2,
                  minmax(0, 1fr)
                ) !important;
            }

            .controls-grid {
              grid-template-columns:
                repeat(
                  2,
                  minmax(0, 1fr)
                ) !important;
            }
          }

          @media (max-width: 700px) {
            .activity-desktop {
              display: none !important;
            }

            .activity-mobile {
              display: flex !important;
              flex-direction: column;
              gap: 10px;
            }
          }

          @media (max-width: 560px) {
            .summary-grid,
            .secondary-grid,
            .controls-grid {
              grid-template-columns:
                1fr !important;
            }
          }
        `}</style>
      </section>
    </main>
  );
}

function TableHeader() {
  const columns = [
    "Date",
    "Side",
    "Symbol",
    "Shares",
    "Price",
    "Total",
    "Realized P/L",
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "1.35fr 0.7fr 0.8fr 0.8fr 0.9fr 1fr 1fr",
        gap: 10,
        padding: "0 10px 10px",
        color: "#9ca3af",
        fontSize: 9,
        fontWeight: 800,
        textTransform: "uppercase",
      }}
    >
      {columns.map((column) => (
        <span key={column}>
          {column}
        </span>
      ))}
    </div>
  );
}

function TransactionRowView({
  transaction,
}: {
  transaction: TransactionRow;
}) {
  const isBuy =
    transaction.transaction_type ===
    "buy";

  const realized =
    toNumber(
      transaction.realized_gain_loss
    );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "1.35fr 0.7fr 0.8fr 0.8fr 0.9fr 1fr 1fr",
        gap: 10,
        padding: 10,
        borderTop:
          "1px solid rgba(255,255,255,0.07)",
        alignItems: "center",
      }}
    >
      <span
        style={{
          ...mutedStyle,
          fontSize: 11,
        }}
      >
        {formatDateTime(
          transaction.created_at
        )}
      </span>

      <TradeBadge
        side={
          transaction.transaction_type
        }
      />

      <Link
        href={`/stock/${transaction.symbol}`}
        style={{
          color: "#93c5fd",
          fontWeight: 850,
          textDecoration: "none",
        }}
      >
        {transaction.symbol}
      </Link>

      <span>
        {formatShares(
          toNumber(
            transaction.shares
          )
        )}
      </span>

      <span>
        {formatCurrency(
          toNumber(
            transaction.price
          )
        )}
      </span>

      <strong
        style={{
          color: isBuy
            ? "#ff8a8a"
            : "#4ade80",
        }}
      >
        {isBuy ? "-" : "+"}
        {formatCurrency(
          toNumber(
            transaction.total_amount
          )
        )}
      </strong>

      <span
        style={{
          color: isBuy
            ? "#6b7280"
            : realized >= 0
              ? "#4ade80"
              : "#ff8a8a",
          fontWeight: 800,
        }}
      >
        {isBuy
          ? "—"
          : formatSignedCurrency(
              realized
            )}
      </span>
    </div>
  );
}

function TransactionCard({
  transaction,
}: {
  transaction: TransactionRow;
}) {
  const isBuy =
    transaction.transaction_type ===
    "buy";

  const realized =
    toNumber(
      transaction.realized_gain_loss
    );

  return (
    <article style={innerCardStyle}>
      <div style={sectionHeaderStyle}>
        <div>
          <TradeBadge
            side={
              transaction.transaction_type
            }
          />

          <Link
            href={`/stock/${transaction.symbol}`}
            style={{
              display: "block",
              marginTop: 9,
              color: "#93c5fd",
              fontSize: 19,
              fontWeight: 850,
              textDecoration: "none",
            }}
          >
            {transaction.symbol}
          </Link>

          <p
            style={{
              margin: "4px 0 0",
              ...mutedStyle,
              fontSize: 10,
            }}
          >
            {formatDateTime(
              transaction.created_at
            )}
          </p>
        </div>

        <div
          style={{
            textAlign: "right",
          }}
        >
          <strong
            style={{
              color: isBuy
                ? "#ff8a8a"
                : "#4ade80",
              fontSize: 18,
            }}
          >
            {isBuy ? "-" : "+"}
            {formatCurrency(
              toNumber(
                transaction.total_amount
              )
            )}
          </strong>

          <p
            style={{
              margin: "5px 0 0",
              ...mutedStyle,
              fontSize: 10,
            }}
          >
            {formatShares(
              toNumber(
                transaction.shares
              )
            )}{" "}
            shares at{" "}
            {formatCurrency(
              toNumber(
                transaction.price
              )
            )}
          </p>
        </div>
      </div>

      {!isBuy && (
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: 12,
            marginTop: 13,
            paddingTop: 12,
            borderTop:
              "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <span style={mutedStyle}>
            Realized P/L
          </span>

          <strong
            style={{
              color:
                realized >= 0
                  ? "#4ade80"
                  : "#ff8a8a",
            }}
          >
            {formatSignedCurrency(
              realized
            )}
          </strong>
        </div>
      )}
    </article>
  );
}

function TradeBadge({
  side,
}: {
  side: "buy" | "sell";
}) {
  const buy = side === "buy";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 8px",
        borderRadius: 999,
        border: buy
          ? "1px solid rgba(239,68,68,0.24)"
          : "1px solid rgba(34,197,94,0.24)",
        background: buy
          ? "rgba(239,68,68,0.08)"
          : "rgba(34,197,94,0.08)",
        color: buy
          ? "#ff8a8a"
          : "#4ade80",
        fontSize: 9,
        fontWeight: 850,
        textTransform: "uppercase",
      }}
    >
      {side}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  color = "#f9fafb",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div style={cardStyle}>
      <span
        style={{
          ...mutedStyle,
          fontSize: 10,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          display: "block",
          marginTop: 8,
          color,
          fontSize: 21,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function SmallCard({
  label,
  value,
  color = "#f9fafb",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div style={innerCardStyle}>
      <span
        style={{
          ...mutedStyle,
          fontSize: 9,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          display: "block",
          marginTop: 6,
          color,
          fontSize: 16,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function EmptyState({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div style={emptyStyle}>
      <strong>{title}</strong>

      <p
        style={{
          margin: "7px 0 0",
          ...mutedStyle,
          lineHeight: 1.5,
        }}
      >
        {text}
      </p>
    </div>
  );
}

function getCutoffDate(
  filter: DateFilter
) {
  if (filter === "all") {
    return null;
  }

  const date = new Date();

  if (filter === "7d") {
    date.setDate(
      date.getDate() - 7
    );
  } else if (
    filter === "30d"
  ) {
    date.setDate(
      date.getDate() - 30
    );
  } else if (
    filter === "90d"
  ) {
    date.setDate(
      date.getDate() - 90
    );
  } else {
    date.setFullYear(
      date.getFullYear() - 1
    );
  }

  return date;
}

function toNumber(
  value: unknown
) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
}

function formatCurrency(
  value: number
) {
  return value.toLocaleString(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

function formatSignedCurrency(
  value: number
) {
  return `${value >= 0 ? "+" : "-"}${formatCurrency(
    Math.abs(value)
  )}`;
}

function formatShares(
  value: number
) {
  return value.toLocaleString(
    "en-US",
    {
      maximumFractionDigits: 4,
    }
  );
}

function formatDateTime(
  value: string
) {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

const pageStyle = {
  minHeight: "100vh",
  padding: "32px 24px",
  background: "#07111f",
  color: "white",
};

const containerStyle = {
  maxWidth: 1250,
  margin: "0 auto",
};

const topBarStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap" as const,
  marginBottom: 28,
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap" as const,
};

const titleStyle = {
  margin: 0,
  fontSize: 42,
};

const eyebrowStyle = {
  margin: "0 0 7px",
  color: "#60a5fa",
  fontSize: 10,
  fontWeight: 850,
  letterSpacing: "0.1em",
  textTransform:
    "uppercase" as const,
};

const mutedStyle = {
  color: "#9ca3af",
};

const cardStyle = {
  padding: 19,
  border:
    "1px solid rgba(255,255,255,0.09)",
  borderRadius: 15,
  background:
    "rgba(255,255,255,0.035)",
};

const innerCardStyle = {
  padding: 14,
  border:
    "1px solid rgba(255,255,255,0.07)",
  borderRadius: 11,
  background:
    "rgba(255,255,255,0.025)",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "10px 12px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  borderRadius: 9,
  background:
    "rgba(255,255,255,0.025)",
  color: "white",
  outline: "none",
};

const selectStyle = {
  minWidth: 130,
  padding: "10px 11px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  borderRadius: 9,
  background: "#111827",
  color: "white",
  outline: "none",
};

const secondaryButtonStyle = {
  padding: "9px 12px",
  border:
    "1px solid rgba(255,255,255,0.11)",
  borderRadius: 9,
  background:
    "rgba(255,255,255,0.035)",
  color: "#d1d5db",
  fontWeight: 750,
  cursor: "pointer",
};

const backLinkStyle = {
  display: "inline-block",
  padding: "9px 13px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  borderRadius: 9,
  color: "#d1d5db",
  textDecoration: "none",
};

const emptyStyle = {
  marginTop: 16,
  padding: 18,
  border:
    "1px solid rgba(255,255,255,0.07)",
  borderRadius: 11,
  background:
    "rgba(255,255,255,0.025)",
};

const errorStyle = {
  marginTop: 15,
  padding: 13,
  border:
    "1px solid rgba(239,68,68,0.25)",
  borderRadius: 10,
  background:
    "rgba(239,68,68,0.08)",
  color: "#ff8a8a",
};

const noticeStyle = {
  marginTop: 16,
  padding: 15,
  border:
    "1px solid rgba(96,165,250,0.16)",
  borderRadius: 11,
  background:
    "rgba(37,99,235,0.04)",
  color: "#93c5fd",
};