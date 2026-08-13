"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BuyStockButton from "@/components/stock/BuyStockButton";
import SellStockButton from "@/components/stock/SellStockButton";

type PortfolioHolding = {
  symbol: string;
  name?: string;
  shares: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  investedValue: number;
  gainLoss: number;
  gainLossPercent: number;
  todayGainLoss: number;
  todayGainLossPercent: number;
  change?: number;
  changePercent?: number;
};

type PortfolioSummary = {
  cashBalance: number;
  portfolioValue: number;
  totalAccountValue: number;
  totalInvested: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  todayGainLoss: number;
  todayGainLossPercent: number;
};

type PortfolioAnalytics = {
  holdingsCount: number;
  winningHoldingsCount: number;
  losingHoldingsCount: number;
  flatHoldingsCount: number;
  winRate: number;
  unrealizedGainLoss: number;
  realizedGainLoss: number;
  combinedGainLoss: number;
  cashPercentage: number;
  stockPercentage: number;
  diversificationCount: number;
};

type PortfolioResponse = {
  holdings?: PortfolioHolding[];
  summary?: PortfolioSummary;
  analytics?: PortfolioAnalytics;
  error?: string;
};

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

type StockQuote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  logo: string;
};

export default function PaperTradingPage() {
  const router = useRouter();

  const [holdings, setHoldings] =
    useState<PortfolioHolding[]>([]);

  const [summary, setSummary] =
    useState<PortfolioSummary | null>(
      null
    );

  const [analytics, setAnalytics] =
    useState<PortfolioAnalytics | null>(
      null
    );

  const [transactions, setTransactions] =
    useState<TransactionRow[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [searchSymbol, setSearchSymbol] =
    useState("");

  const [quote, setQuote] =
    useState<StockQuote | null>(null);

  const [quoteLoading, setQuoteLoading] =
    useState(false);

  const [quoteError, setQuoteError] =
    useState("");

  const loadTradingAccount =
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

          const [
            portfolioResponse,
            transactionResult,
          ] = await Promise.all([
            fetch(
              `/api/portfolio?refresh=${Date.now()}`,
              {
                cache:
                  "no-store",
                headers: {
                  "Cache-Control":
                    "no-cache, no-store, must-revalidate",
                },
              }
            ),
            supabase
              .from(
                "transactions"
              )
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
              )
              .limit(100),
          ]);

          const portfolioData =
            (await portfolioResponse.json()) as PortfolioResponse;

          if (
            !portfolioResponse.ok ||
            !portfolioData.summary ||
            !portfolioData.analytics
          ) {
            throw new Error(
              portfolioData.error ||
                "Unable to load your paper-trading portfolio."
            );
          }

          if (
            transactionResult.error
          ) {
            throw new Error(
              transactionResult.error.message
            );
          }

          setHoldings(
            Array.isArray(
              portfolioData.holdings
            )
              ? portfolioData.holdings
              : []
          );

          setSummary(
            portfolioData.summary
          );

          setAnalytics(
            portfolioData.analytics
          );

          setTransactions(
            (transactionResult.data as TransactionRow[]) ??
              []
          );
        } catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load your paper-trading account."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [router]
    );

  useEffect(() => {
    loadTradingAccount();

    const interval =
      window.setInterval(
        () => {
          loadTradingAccount(
            true
          );
        },
        30_000
      );

    const refreshOnFocus =
      () => {
        loadTradingAccount(
          true
        );
      };

    window.addEventListener(
      "focus",
      refreshOnFocus
    );

    return () => {
      window.clearInterval(
        interval
      );

      window.removeEventListener(
        "focus",
        refreshOnFocus
      );
    };
  }, [loadTradingAccount]);

  async function searchStock(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const symbol =
      searchSymbol
        .trim()
        .toUpperCase();

    if (
      !symbol ||
      !/^[A-Z0-9.-]{1,15}$/.test(
        symbol
      )
    ) {
      setQuoteError(
        "Enter a valid stock symbol."
      );
      return;
    }

    try {
      setQuoteLoading(true);
      setQuoteError("");
      setQuote(null);

      const response =
        await fetch(
          `/api/stock-details?symbol=${encodeURIComponent(
            symbol
          )}&refresh=${Date.now()}`,
          {
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.stock
      ) {
        throw new Error(
          data.error ||
            `Unable to load ${symbol}.`
        );
      }

      setSearchSymbol(
        symbol
      );

      setQuote({
        symbol,
        name:
          data.stock.name ||
          symbol,
        price: Number(
          data.stock.price
        ),
        change:
          Number(
            data.stock.change
          ) || 0,
        changePercent:
          Number(
            data.stock
              .changePercent
          ) || 0,
        logo:
          data.stock.logo ||
          "",
      });
    } catch (searchError) {
      setQuoteError(
        searchError instanceof Error
          ? searchError.message
          : "Unable to load the stock."
      );
    } finally {
      setQuoteLoading(false);
    }
  }

  const realizedGainLoss =
    useMemo(() => {
      return transactions.reduce(
        (total, transaction) => {
          const value = Number(
            transaction.realized_gain_loss ??
              0
          );

          return (
            total +
            (Number.isFinite(
              value
            )
              ? value
              : 0)
          );
        },
        0
      );
    }, [transactions]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <section style={containerStyle}>
          <div style={cardStyle}>
            <h1>
              Loading Paper Trading...
            </h1>

            <p style={mutedStyle}>
              Loading your secure
              Supabase paper account.
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

          <button
            type="button"
            onClick={() =>
              loadTradingAccount(
                true
              )
            }
            disabled={
              refreshing
            }
            style={
              secondaryButtonStyle
            }
          >
            {refreshing
              ? "Refreshing..."
              : "Refresh Account"}
          </button>
        </div>

        <p style={eyebrowStyle}>
          Virtual brokerage
        </p>

        <h1 style={titleStyle}>
          Paper Trading
        </h1>

        <p style={mutedStyle}>
          Practice with your
          user-specific virtual account.
          Trades, positions, and cash are
          saved securely in Supabase.
        </p>

        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}

        {summary &&
          analytics && (
            <>
              <div
                className="summary-grid"
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(5, minmax(0, 1fr))",
                  gap: 12,
                  marginTop: 22,
                }}
              >
                <SummaryCard
                  label="Account value"
                  value={formatCurrency(
                    summary.totalAccountValue
                  )}
                />

                <SummaryCard
                  label="Available cash"
                  value={formatCurrency(
                    summary.cashBalance
                  )}
                />

                <SummaryCard
                  label="Positions value"
                  value={formatCurrency(
                    summary.portfolioValue
                  )}
                />

                <SummaryCard
                  label="Unrealized P/L"
                  value={formatSignedCurrency(
                    summary.totalGainLoss
                  )}
                  detail={formatSignedPercent(
                    summary.totalGainLossPercent
                  )}
                  color={
                    summary.totalGainLoss >=
                    0
                      ? "#4ade80"
                      : "#ff8a8a"
                  }
                />

                <SummaryCard
                  label="Today's P/L"
                  value={formatSignedCurrency(
                    summary.todayGainLoss
                  )}
                  detail={formatSignedPercent(
                    summary.todayGainLossPercent
                  )}
                  color={
                    summary.todayGainLoss >=
                    0
                      ? "#4ade80"
                      : "#ff8a8a"
                  }
                />
              </div>

              <div
                className="analytics-grid"
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(5, minmax(0, 1fr))",
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <SmallCard
                  label="Holdings"
                  value={String(
                    analytics.holdingsCount
                  )}
                />

                <SmallCard
                  label="Win rate"
                  value={`${analytics.winRate.toFixed(
                    2
                  )}%`}
                />

                <SmallCard
                  label="Realized P/L"
                  value={formatSignedCurrency(
                    realizedGainLoss
                  )}
                  color={
                    realizedGainLoss >=
                    0
                      ? "#4ade80"
                      : "#ff8a8a"
                  }
                />

                <SmallCard
                  label="Cash allocation"
                  value={`${analytics.cashPercentage.toFixed(
                    2
                  )}%`}
                />

                <SmallCard
                  label="Stock allocation"
                  value={`${analytics.stockPercentage.toFixed(
                    2
                  )}%`}
                />
              </div>
            </>
          )}

        <div
          className="main-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "0.75fr 1.25fr",
            gap: 16,
            marginTop: 16,
          }}
        >
          <section style={cardStyle}>
            <p style={eyebrowStyle}>
              Trade finder
            </p>

            <h2 style={{ margin: 0 }}>
              Find a Stock
            </h2>

            <form
              onSubmit={
                searchStock
              }
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "1fr auto",
                gap: 8,
                marginTop: 15,
              }}
            >
              <input
                value={
                  searchSymbol
                }
                onChange={(
                  event
                ) =>
                  setSearchSymbol(
                    event.target.value.toUpperCase()
                  )
                }
                placeholder="AAPL"
                style={inputStyle}
              />

              <button
                type="submit"
                disabled={
                  quoteLoading
                }
                style={primaryButtonStyle}
              >
                {quoteLoading
                  ? "Loading..."
                  : "Search"}
              </button>
            </form>

            {quoteError && (
              <div style={errorStyle}>
                {quoteError}
              </div>
            )}

            {quote && (
              <div
                style={{
                  ...quoteCardStyle,
                  marginTop: 15,
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    gap: 12,
                    alignItems:
                      "center",
                  }}
                >
                  {quote.logo ? (
                    <img
                      src={
                        quote.logo
                      }
                      alt={`${quote.name} logo`}
                      style={{
                        width: 48,
                        height: 48,
                        objectFit:
                          "contain",
                        borderRadius: 10,
                        padding: 6,
                        background:
                          "white",
                      }}
                    />
                  ) : (
                    <div
                      style={
                        logoFallbackStyle
                      }
                    >
                      {quote.symbol.slice(
                        0,
                        2
                      )}
                    </div>
                  )}

                  <div>
                    <Link
                      href={`/stock/${quote.symbol}`}
                      style={{
                        color:
                          "#93c5fd",
                        fontSize: 20,
                        fontWeight:
                          850,
                        textDecoration:
                          "none",
                      }}
                    >
                      {
                        quote.symbol
                      }
                    </Link>

                    <p
                      style={{
                        margin:
                          "4px 0 0",
                        ...mutedStyle,
                        fontSize: 11,
                      }}
                    >
                      {quote.name}
                    </p>
                  </div>
                </div>

                <strong
                  style={{
                    display:
                      "block",
                    marginTop: 16,
                    fontSize: 27,
                  }}
                >
                  {formatCurrency(
                    quote.price
                  )}
                </strong>

                <span
                  style={{
                    display:
                      "block",
                    marginTop: 5,
                    color:
                      quote.changePercent >=
                      0
                        ? "#4ade80"
                        : "#ff8a8a",
                    fontWeight:
                      800,
                  }}
                >
                  {formatSignedCurrency(
                    quote.change
                  )}{" "}
                  (
                  {formatSignedPercent(
                    quote.changePercent
                  )}
                  )
                </span>

                <div
                  style={{
                    display:
                      "flex",
                    gap: 9,
                    flexWrap:
                      "wrap",
                    marginTop: 16,
                  }}
                >
                  <BuyStockButton
                    symbol={
                      quote.symbol
                    }
                    companyName={
                      quote.name
                    }
                    currentPrice={
                      quote.price
                    }
                  />

                  <SellStockButton
                    symbol={
                      quote.symbol
                    }
                    companyName={
                      quote.name
                    }
                    currentPrice={
                      quote.price
                    }
                  />
                </div>

                <p
                  style={{
                    margin:
                      "13px 0 0",
                    ...mutedStyle,
                    fontSize: 10,
                    lineHeight: 1.5,
                  }}
                >
                  After completing a
                  trade, press Refresh
                  Account to update this
                  page immediately.
                </p>
              </div>
            )}
          </section>

          <section style={cardStyle}>
            <div
              style={
                sectionHeaderStyle
              }
            >
              <div>
                <p style={eyebrowStyle}>
                  Open holdings
                </p>

                <h2 style={{ margin: 0 }}>
                  Positions
                </h2>
              </div>

              <span style={mutedStyle}>
                {holdings.length}{" "}
                positions
              </span>
            </div>

            {holdings.length ===
            0 ? (
              <EmptyState
                title="No open positions"
                text="Search for a stock and use the Buy button to open your first paper position."
              />
            ) : (
              <div
                style={{
                  overflowX:
                    "auto",
                  marginTop: 16,
                }}
              >
                <div
                  style={{
                    minWidth: 980,
                  }}
                >
                  <TableHeader
                    columns={[
                      "Symbol",
                      "Shares",
                      "Average cost",
                      "Current price",
                      "Market value",
                      "Total P/L",
                      "Today's P/L",
                      "Actions",
                    ]}
                    template="1.2fr 0.8fr 1fr 1fr 1fr 1fr 1fr 1.2fr"
                  />

                  {holdings.map(
                    (
                      holding
                    ) => (
                      <HoldingRow
                        key={
                          holding.symbol
                        }
                        holding={
                          holding
                        }
                      />
                    )
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        <section
          style={{
            ...cardStyle,
            marginTop: 16,
          }}
        >
          <div
            style={
              sectionHeaderStyle
            }
          >
            <div>
              <p style={eyebrowStyle}>
                Account activity
              </p>

              <h2 style={{ margin: 0 }}>
                Trade History
              </h2>
            </div>

            <Link
              href="/activity"
              style={smallLinkStyle}
            >
              Open Activity Page →
            </Link>
          </div>

          {transactions.length ===
          0 ? (
            <EmptyState
              title="No trades yet"
              text="Your completed Supabase paper trades will appear here."
            />
          ) : (
            <div
              style={{
                overflowX:
                  "auto",
                marginTop: 16,
              }}
            >
              <div
                style={{
                  minWidth: 900,
                }}
              >
                <TableHeader
                  columns={[
                    "Date",
                    "Side",
                    "Symbol",
                    "Shares",
                    "Price",
                    "Total",
                    "Realized P/L",
                  ]}
                  template="1.3fr 0.7fr 0.8fr 0.8fr 0.9fr 1fr 1fr"
                />

                {transactions.map(
                  (
                    transaction
                  ) => (
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
          )}
        </section>

        <div style={noticeStyle}>
          <strong>
            Supabase account connected
          </strong>

          <p
            style={{
              margin: "6px 0 0",
              ...mutedStyle,
              fontSize: 11,
              lineHeight: 1.55,
            }}
          >
            This page uses the same
            account, holdings, and
            transaction records as your
            dashboard and stock-page Buy
            and Sell buttons. Each signed-in
            user sees only their own paper
            account.
          </p>
        </div>

        <style jsx>{`
          @media (max-width: 1000px) {
            .summary-grid,
            .analytics-grid {
              grid-template-columns:
                repeat(
                  2,
                  minmax(0, 1fr)
                ) !important;
            }

            .main-grid {
              grid-template-columns:
                1fr !important;
            }
          }

          @media (max-width: 560px) {
            .summary-grid,
            .analytics-grid {
              grid-template-columns:
                1fr !important;
            }

            form {
              grid-template-columns:
                1fr !important;
            }
          }
        `}</style>
      </section>
    </main>
  );
}

function HoldingRow({
  holding,
}: {
  holding: PortfolioHolding;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "1.2fr 0.8fr 1fr 1fr 1fr 1fr 1fr 1.2fr",
        gap: 10,
        padding: 10,
        borderTop:
          "1px solid rgba(255,255,255,0.07)",
        alignItems: "center",
      }}
    >
      <div>
        <Link
          href={`/stock/${holding.symbol}`}
          style={{
            color: "#93c5fd",
            fontWeight: 850,
            textDecoration: "none",
          }}
        >
          {holding.symbol}
        </Link>

        <p
          style={{
            margin: "3px 0 0",
            ...mutedStyle,
            fontSize: 9,
          }}
        >
          {holding.name ||
            holding.symbol}
        </p>
      </div>

      <span>
        {formatShares(
          holding.shares
        )}
      </span>

      <span>
        {formatCurrency(
          holding.averageCost
        )}
      </span>

      <span>
        {formatCurrency(
          holding.currentPrice
        )}
      </span>

      <span>
        {formatCurrency(
          holding.marketValue
        )}
      </span>

      <GainValue
        value={
          holding.gainLoss
        }
        percent={
          holding.gainLossPercent
        }
      />

      <GainValue
        value={
          holding.todayGainLoss
        }
        percent={
          holding.todayGainLossPercent
        }
      />

      <div
        style={{
          display: "flex",
          gap: 7,
          flexWrap: "wrap",
        }}
      >
        <BuyStockButton
          symbol={holding.symbol}
          companyName={
            holding.name ||
            holding.symbol
          }
          currentPrice={
            holding.currentPrice
          }
        />

        <SellStockButton
          symbol={holding.symbol}
          companyName={
            holding.name ||
            holding.symbol
          }
          currentPrice={
            holding.currentPrice
          }
        />
      </div>
    </div>
  );
}

function TransactionRowView({
  transaction,
}: {
  transaction: TransactionRow;
}) {
  const buy =
    transaction.transaction_type ===
    "buy";

  const realized = Number(
    transaction.realized_gain_loss ??
      0
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "1.3fr 0.7fr 0.8fr 0.8fr 0.9fr 1fr 1fr",
        gap: 10,
        padding: 10,
        borderTop:
          "1px solid rgba(255,255,255,0.07)",
        alignItems: "center",
      }}
    >
      <span style={mutedStyle}>
        {formatDateTime(
          transaction.created_at
        )}
      </span>

      <strong
        style={{
          color: buy
            ? "#4ade80"
            : "#ff8a8a",
          textTransform:
            "uppercase",
        }}
      >
        {
          transaction.transaction_type
        }
      </strong>

      <Link
        href={`/stock/${transaction.symbol}`}
        style={{
          color: "#93c5fd",
          fontWeight: 800,
          textDecoration: "none",
        }}
      >
        {transaction.symbol}
      </Link>

      <span>
        {formatShares(
          Number(
            transaction.shares
          )
        )}
      </span>

      <span>
        {formatCurrency(
          Number(
            transaction.price
          )
        )}
      </span>

      <span>
        {formatCurrency(
          Number(
            transaction.total_amount
          )
        )}
      </span>

      <span
        style={{
          color:
            realized >= 0
              ? "#4ade80"
              : "#ff8a8a",
          fontWeight: 800,
        }}
      >
        {buy
          ? "—"
          : formatSignedCurrency(
              realized
            )}
      </span>
    </div>
  );
}

function GainValue({
  value,
  percent,
}: {
  value: number;
  percent: number;
}) {
  const positive =
    value >= 0;

  return (
    <span
      style={{
        color: positive
          ? "#4ade80"
          : "#ff8a8a",
        fontWeight: 800,
      }}
    >
      {formatSignedCurrency(
        value
      )}
      <br />
      <small>
        {formatSignedPercent(
          percent
        )}
      </small>
    </span>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  color = "#f9fafb",
}: {
  label: string;
  value: string;
  detail?: string;
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

      {detail && (
        <span
          style={{
            display: "block",
            marginTop: 5,
            color,
            fontSize: 10,
            fontWeight: 800,
          }}
        >
          {detail}
        </span>
      )}
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
    <div style={smallCardStyle}>
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

function TableHeader({
  columns,
  template,
}: {
  columns: string[];
  template: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          template,
        gap: 10,
        padding: "0 10px 10px",
        color: "#9ca3af",
        fontSize: 9,
        fontWeight: 800,
        textTransform:
          "uppercase",
      }}
    >
      {columns.map(
        (column) => (
          <span key={column}>
            {column}
          </span>
        )
      )}
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

function formatCurrency(
  value: number
) {
  const safe =
    Number.isFinite(value)
      ? value
      : 0;

  return safe.toLocaleString(
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

function formatSignedPercent(
  value: number
) {
  const safe =
    Number.isFinite(value)
      ? value
      : 0;

  return `${safe >= 0 ? "+" : "-"}${Math.abs(
    safe
  ).toFixed(2)}%`;
}

function formatShares(
  value: number
) {
  return Number(value).toLocaleString(
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
  maxWidth: 1280,
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

const smallCardStyle = {
  padding: 13,
  border:
    "1px solid rgba(255,255,255,0.075)",
  borderRadius: 11,
  background:
    "rgba(255,255,255,0.025)",
};

const quoteCardStyle = {
  padding: 16,
  border:
    "1px solid rgba(96,165,250,0.2)",
  borderRadius: 12,
  background:
    "rgba(37,99,235,0.06)",
};

const logoFallbackStyle = {
  width: 48,
  height: 48,
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  borderRadius: 10,
  background:
    "rgba(96,165,250,0.12)",
  color: "#93c5fd",
  fontWeight: 850,
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap" as const,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "11px 12px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  borderRadius: 9,
  background:
    "rgba(255,255,255,0.025)",
  color: "white",
  outline: "none",
};

const primaryButtonStyle = {
  padding: "10px 14px",
  border: "none",
  borderRadius: 9,
  background: "#2563eb",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
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

const smallLinkStyle = {
  color: "#93c5fd",
  fontSize: 12,
  fontWeight: 750,
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
    "1px solid rgba(34,197,94,0.16)",
  borderRadius: 11,
  background:
    "rgba(34,197,94,0.04)",
  color: "#4ade80",
};
