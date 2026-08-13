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

type WatchlistRow = {
  symbol: string;
  created_at?: string;
};

type Stock = {
  symbol: string;
  name?: string;
  logo?: string;
  price: number;
  change: number;
  changePercent: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
  marketCapitalization?: number | null;
};

type SortOption =
  | "saved"
  | "symbol"
  | "price-high"
  | "price-low"
  | "gainers"
  | "losers";

type FilterOption =
  | "all"
  | "gainers"
  | "losers"
  | "unchanged";

export default function WatchlistPage() {
  const router = useRouter();

  const [savedSymbols, setSavedSymbols] =
    useState<string[]>([]);

  const [stocks, setStocks] =
    useState<Stock[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [removingSymbol, setRemovingSymbol] =
    useState<string | null>(null);

  const [adding, setAdding] =
    useState(false);

  const [addSymbol, setAddSymbol] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [sort, setSort] =
    useState<SortOption>("saved");

  const [filter, setFilter] =
    useState<FilterOption>("all");

  const loadWatchlist = useCallback(
    async (manual = false) => {
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
          data: watchlistData,
          error: watchlistError,
        } = await supabase
          .from("watchlist")
          .select(
            "symbol, created_at"
          )
          .eq(
            "user_id",
            user.id
          )
          .order(
            "created_at",
            {
              ascending: true,
            }
          );

        if (watchlistError) {
          throw new Error(
            watchlistError.message
          );
        }

        const symbols =
          Array.from(
            new Set(
              (
                (watchlistData ||
                  []) as WatchlistRow[]
              )
                .map((item) =>
                  normalizeSymbol(
                    item.symbol
                  )
                )
                .filter(Boolean)
            )
          );

        setSavedSymbols(symbols);

        if (
          symbols.length === 0
        ) {
          setStocks([]);
          return;
        }

        const results =
          await Promise.all(
            symbols.map(
              async (
                symbol
              ): Promise<Stock | null> => {
                try {
                  const response =
                    await fetch(
                      `/api/stock-details?symbol=${encodeURIComponent(
                        symbol
                      )}&refresh=${Date.now()}`,
                      {
                        cache:
                          "no-store",
                      }
                    );

                  const data =
                    await response.json();

                  if (
                    !response.ok ||
                    !data.stock
                  ) {
                    return null;
                  }

                  return normalizeStock(
                    data.stock
                  );
                } catch {
                  return null;
                }
              }
            )
          );

        const loadedStocks =
          results.filter(
            (
              stock
            ): stock is Stock =>
              stock !== null
          );

        setStocks(
          loadedStocks
        );

        if (
          loadedStocks.length ===
            0 &&
          symbols.length > 0
        ) {
          setError(
            "Your saved symbols were found, but their live quotes could not be loaded."
          );
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your watchlist."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    loadWatchlist();

    const interval =
      window.setInterval(
        () => {
          loadWatchlist(
            true
          );
        },
        60_000
      );

    const refreshOnFocus =
      () => {
        loadWatchlist(
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
  }, [loadWatchlist]);

  async function addToWatchlist(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const symbol =
      normalizeSymbol(
        addSymbol
      );

    if (
      !symbol ||
      !/^[A-Z0-9.-]{1,15}$/.test(
        symbol
      )
    ) {
      setError(
        "Enter a valid stock symbol."
      );
      return;
    }

    if (
      savedSymbols.includes(
        symbol
      )
    ) {
      setError(
        `${symbol} is already in your watchlist.`
      );
      return;
    }

    const supabase =
      createClient();

    try {
      setAdding(true);
      setError("");
      setSuccess("");

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

      const quoteResponse =
        await fetch(
          `/api/stock-details?symbol=${encodeURIComponent(
            symbol
          )}&refresh=${Date.now()}`,
          {
            cache: "no-store",
          }
        );

      const quoteData =
        await quoteResponse.json();

      if (
        !quoteResponse.ok ||
        !quoteData.stock
      ) {
        throw new Error(
          quoteData.error ||
            `Unable to verify ${symbol}.`
        );
      }

      const {
        error: insertError,
      } = await supabase
        .from("watchlist")
        .insert({
          user_id: user.id,
          symbol,
        });

      if (insertError) {
        throw new Error(
          insertError.message
        );
      }

      setAddSymbol("");
      setSuccess(
        `${symbol} was added to your watchlist.`
      );

      await loadWatchlist(
        true
      );
    } catch (addError) {
      setError(
        addError instanceof Error
          ? addError.message
          : `Unable to add ${symbol}.`
      );
    } finally {
      setAdding(false);
    }
  }

  async function removeFromWatchlist(
    symbol: string
  ) {
    const normalizedSymbol =
      normalizeSymbol(
        symbol
      );

    const supabase =
      createClient();

    try {
      setRemovingSymbol(
        normalizedSymbol
      );

      setError("");
      setSuccess("");

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
        error: deleteError,
      } = await supabase
        .from("watchlist")
        .delete()
        .eq(
          "user_id",
          user.id
        )
        .in(
          "symbol",
          getStoredSymbolVariants(
            normalizedSymbol
          )
        );

      if (deleteError) {
        throw new Error(
          deleteError.message
        );
      }

      setSavedSymbols(
        (
          currentSymbols
        ) =>
          currentSymbols.filter(
            (
              currentSymbol
            ) =>
              normalizeSymbol(
                currentSymbol
              ) !==
              normalizedSymbol
          )
      );

      setStocks(
        (
          currentStocks
        ) =>
          currentStocks.filter(
            (
              stock
            ) =>
              normalizeSymbol(
                stock.symbol
              ) !==
              normalizedSymbol
          )
      );

      setSuccess(
        `${normalizedSymbol} was removed from your watchlist.`
      );
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : `Unable to remove ${normalizedSymbol}.`
      );
    } finally {
      setRemovingSymbol(
        null
      );
    }
  }

  const visibleStocks =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toUpperCase();

      const filtered =
        stocks.filter(
          (stock) => {
            const matchesSearch =
              !normalizedSearch ||
              stock.symbol
                .toUpperCase()
                .includes(
                  normalizedSearch
                ) ||
              (
                stock.name ||
                ""
              )
                .toUpperCase()
                .includes(
                  normalizedSearch
                );

            const matchesFilter =
              filter === "all" ||
              (filter ===
                "gainers" &&
                stock.changePercent >
                  0) ||
              (filter ===
                "losers" &&
                stock.changePercent <
                  0) ||
              (filter ===
                "unchanged" &&
                stock.changePercent ===
                  0);

            return (
              matchesSearch &&
              matchesFilter
            );
          }
        );

      return [...filtered].sort(
        (a, b) => {
          if (
            sort === "symbol"
          ) {
            return a.symbol.localeCompare(
              b.symbol
            );
          }

          if (
            sort ===
            "price-high"
          ) {
            return (
              b.price -
              a.price
            );
          }

          if (
            sort ===
            "price-low"
          ) {
            return (
              a.price -
              b.price
            );
          }

          if (
            sort ===
            "gainers"
          ) {
            return (
              b.changePercent -
              a.changePercent
            );
          }

          if (
            sort ===
            "losers"
          ) {
            return (
              a.changePercent -
              b.changePercent
            );
          }

          return (
            savedSymbols.indexOf(
              a.symbol
            ) -
            savedSymbols.indexOf(
              b.symbol
            )
          );
        }
      );
    }, [
      stocks,
      search,
      filter,
      sort,
      savedSymbols,
    ]);

  const stats =
    useMemo(() => {
      const gainers =
        stocks.filter(
          (stock) =>
            stock.changePercent >
            0
        );

      const losers =
        stocks.filter(
          (stock) =>
            stock.changePercent <
            0
        );

      const averageMove =
        stocks.length > 0
          ? stocks.reduce(
              (
                total,
                stock
              ) =>
                total +
                stock.changePercent,
              0
            ) /
            stocks.length
          : 0;

      const strongest =
        stocks.length > 0
          ? [...stocks].sort(
              (a, b) =>
                b.changePercent -
                a.changePercent
            )[0]
          : null;

      return {
        gainers:
          gainers.length,
        losers:
          losers.length,
        averageMove,
        strongest,
      };
    }, [stocks]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <section style={containerStyle}>
          <div style={cardStyle}>
            <h1>
              Loading Watchlist...
            </h1>

            <p style={mutedStyle}>
              Gathering your saved
              stocks and live prices.
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
              loadWatchlist(
                true
              )
            }
            disabled={refreshing}
            style={
              secondaryButtonStyle
            }
          >
            {refreshing
              ? "Refreshing..."
              : "Refresh Quotes"}
          </button>
        </div>

        <p style={eyebrowStyle}>
          Saved market ideas
        </p>

        <h1 style={titleStyle}>
          Watchlist
        </h1>

        <p style={mutedStyle}>
          Track live prices, daily
          moves, and the stocks you want
          to research next.
        </p>

        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}

        {success && (
          <div style={successStyle}>
            {success}
          </div>
        )}

        <div
          className="stat-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap: 12,
            marginTop: 22,
          }}
        >
          <StatCard
            label="Saved stocks"
            value={String(
              savedSymbols.length
            )}
          />

          <StatCard
            label="Gainers"
            value={String(
              stats.gainers
            )}
            color="#4ade80"
          />

          <StatCard
            label="Losers"
            value={String(
              stats.losers
            )}
            color="#ff8a8a"
          />

          <StatCard
            label="Average move"
            value={formatSignedPercent(
              stats.averageMove
            )}
            color={
              stats.averageMove >=
              0
                ? "#4ade80"
                : "#ff8a8a"
            }
          />
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
                Add company
              </p>

              <h2 style={{ margin: 0 }}>
                Add to Watchlist
              </h2>
            </div>

            {stats.strongest && (
              <span
                style={{
                  color:
                    "#4ade80",
                  fontSize: 11,
                  fontWeight:
                    800,
                }}
              >
                Top today:{" "}
                {
                  stats
                    .strongest
                    .symbol
                }{" "}
                {formatSignedPercent(
                  stats
                    .strongest
                    .changePercent
                )}
              </span>
            )}
          </div>

          <form
            onSubmit={
              addToWatchlist
            }
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr auto",
              gap: 9,
              marginTop: 15,
            }}
          >
            <input
              value={addSymbol}
              onChange={(
                event
              ) =>
                setAddSymbol(
                  event.target.value.toUpperCase()
                )
              }
              placeholder="Enter ticker, e.g. NVDA"
              style={inputStyle}
            />

            <button
              type="submit"
              disabled={adding}
              style={primaryButtonStyle}
            >
              {adding
                ? "Adding..."
                : "Add Stock"}
            </button>
          </form>
        </section>

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
                Live tracking
              </p>

              <h2 style={{ margin: 0 }}>
                Your Stocks
              </h2>
            </div>

            <span style={mutedStyle}>
              {
                visibleStocks.length
              }{" "}
              shown
            </span>
          </div>

          <div
            className="controls-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr auto auto",
              gap: 9,
              marginTop: 15,
            }}
          >
            <input
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search symbol or company..."
              style={inputStyle}
            />

            <select
              value={filter}
              onChange={(
                event
              ) =>
                setFilter(
                  event.target
                    .value as FilterOption
                )
              }
              style={
                selectStyle
              }
            >
              <option value="all">
                All stocks
              </option>

              <option value="gainers">
                Gainers
              </option>

              <option value="losers">
                Losers
              </option>

              <option value="unchanged">
                Unchanged
              </option>
            </select>

            <select
              value={sort}
              onChange={(
                event
              ) =>
                setSort(
                  event.target
                    .value as SortOption
                )
              }
              style={
                selectStyle
              }
            >
              <option value="saved">
                Saved order
              </option>

              <option value="symbol">
                Symbol A–Z
              </option>

              <option value="price-high">
                Highest price
              </option>

              <option value="price-low">
                Lowest price
              </option>

              <option value="gainers">
                Biggest gainers
              </option>

              <option value="losers">
                Biggest losers
              </option>
            </select>
          </div>

          {savedSymbols.length ===
          0 ? (
            <EmptyState
              title="Your watchlist is empty"
              text="Add a ticker above or open a stock page and save it to your watchlist."
            />
          ) : visibleStocks.length ===
            0 ? (
            <EmptyState
              title="No matching stocks"
              text="Try another search, filter, or sort option."
            />
          ) : (
            <div
              className="stock-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 12,
                marginTop: 16,
              }}
            >
              {visibleStocks.map(
                (stock) => (
                  <StockCard
                    key={
                      stock.symbol
                    }
                    stock={stock}
                    removing={
                      removingSymbol ===
                      stock.symbol
                    }
                    onRemove={() =>
                      removeFromWatchlist(
                        stock.symbol
                      )
                    }
                  />
                )
              )}
            </div>
          )}
        </section>

        <div style={noticeStyle}>
          <strong>
            Live watchlist
          </strong>

          <p
            style={{
              margin: "6px 0 0",
              ...mutedStyle,
              fontSize: 11,
              lineHeight: 1.55,
            }}
          >
            Quotes refresh automatically
            every 60 seconds and whenever
            this browser window becomes
            active again.
          </p>
        </div>

        <style jsx>{`
          @media (max-width: 850px) {
            .stat-grid {
              grid-template-columns:
                repeat(
                  2,
                  minmax(0, 1fr)
                ) !important;
            }

            .controls-grid {
              grid-template-columns:
                1fr !important;
            }
          }

          @media (max-width: 560px) {
            .stat-grid {
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

function StockCard({
  stock,
  removing,
  onRemove,
}: {
  stock: Stock;
  removing: boolean;
  onRemove: () => void;
}) {
  const positive =
    stock.changePercent >= 0;

  return (
    <article style={stockCardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          gap: 12,
          alignItems:
            "flex-start",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 11,
            alignItems:
              "center",
          }}
        >
          {stock.logo ? (
            <img
              src={stock.logo}
              alt={`${stock.name || stock.symbol} logo`}
              style={{
                width: 43,
                height: 43,
                objectFit:
                  "contain",
                borderRadius: 9,
                padding: 5,
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
              {stock.symbol.slice(
                0,
                2
              )}
            </div>
          )}

          <div>
            <Link
              href={`/stock/${stock.symbol}`}
              style={{
                color:
                  "#93c5fd",
                fontSize: 18,
                fontWeight:
                  850,
                textDecoration:
                  "none",
              }}
            >
              {stock.symbol}
            </Link>

            <p
              style={{
                margin: "3px 0 0",
                ...mutedStyle,
                fontSize: 9,
              }}
            >
              {stock.name ||
                stock.symbol}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          style={
            removeButtonStyle
          }
        >
          {removing
            ? "Removing..."
            : "Remove"}
        </button>
      </div>

      <strong
        style={{
          display: "block",
          marginTop: 16,
          fontSize: 25,
        }}
      >
        {formatCurrency(
          stock.price
        )}
      </strong>

      <span
        style={{
          display: "block",
          marginTop: 5,
          color: positive
            ? "#4ade80"
            : "#ff8a8a",
          fontWeight: 800,
        }}
      >
        {formatSignedCurrency(
          stock.change
        )}{" "}
        (
        {formatSignedPercent(
          stock.changePercent
        )}
        )
      </span>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
          gap: 8,
          marginTop: 15,
        }}
      >
        <DetailCard
          label="Day high"
          value={formatCurrency(
            stock.high
          )}
        />

        <DetailCard
          label="Day low"
          value={formatCurrency(
            stock.low
          )}
        />

        <DetailCard
          label="Open"
          value={formatCurrency(
            stock.open
          )}
        />

        <DetailCard
          label="Previous close"
          value={formatCurrency(
            stock.previousClose
          )}
        />
      </div>

      <Link
        href={`/stock/${stock.symbol}`}
        style={researchLinkStyle}
      >
        Open Research Page →
      </Link>
    </article>
  );
}

function DetailCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={detailStyle}>
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
          marginTop: 5,
          fontSize: 12,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function StatCard({
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
          fontSize: 23,
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

function normalizeStock(
  value: Record<string, unknown>
): Stock {
  return {
    symbol:
      normalizeSymbol(
        String(
          value.symbol || ""
        )
      ),
    name:
      typeof value.name ===
      "string"
        ? value.name
        : "",
    logo:
      typeof value.logo ===
      "string"
        ? value.logo
        : "",
    price: finiteNumber(
      value.price
    ),
    change: finiteNumber(
      value.change
    ),
    changePercent:
      finiteNumber(
        value.changePercent
      ),
    high:
      finiteOrUndefined(
        value.high
      ),
    low:
      finiteOrUndefined(
        value.low
      ),
    open:
      finiteOrUndefined(
        value.open
      ),
    previousClose:
      finiteOrUndefined(
        value.previousClose
      ),
    marketCapitalization:
      finiteOrNull(
        value.marketCapitalization
      ),
  };
}

function normalizeSymbol(
  value: string
) {
  return value
    .trim()
    .toUpperCase();
}

function getStoredSymbolVariants(
  symbol: string
) {
  return Array.from(
    new Set([
      symbol,
      symbol.toLowerCase(),
      symbol.toUpperCase(),
    ])
  );
}

function finiteNumber(
  value: unknown
) {
  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue
  )
    ? numberValue
    : 0;
}

function finiteOrUndefined(
  value: unknown
) {
  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue
  )
    ? numberValue
    : undefined;
}

function finiteOrNull(
  value: unknown
) {
  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue
  )
    ? numberValue
    : null;
}

function formatCurrency(
  value:
    | number
    | undefined
) {
  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "N/A";
  }

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

const stockCardStyle = {
  padding: 17,
  border:
    "1px solid rgba(255,255,255,0.085)",
  borderRadius: 13,
  background:
    "rgba(255,255,255,0.027)",
};

const logoFallbackStyle = {
  width: 43,
  height: 43,
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  borderRadius: 9,
  background:
    "rgba(96,165,250,0.12)",
  color: "#93c5fd",
  fontWeight: 850,
};

const detailStyle = {
  padding: 10,
  border:
    "1px solid rgba(255,255,255,0.065)",
  borderRadius: 9,
  background:
    "rgba(255,255,255,0.025)",
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

const selectStyle = {
  minWidth: 155,
  padding: "10px 12px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  borderRadius: 9,
  background: "#111827",
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

const removeButtonStyle = {
  padding: "7px 9px",
  border:
    "1px solid rgba(239,68,68,0.22)",
  borderRadius: 8,
  background:
    "rgba(239,68,68,0.07)",
  color: "#ff8a8a",
  fontSize: 10,
  fontWeight: 800,
  cursor: "pointer",
};

const researchLinkStyle = {
  display: "block",
  marginTop: 14,
  padding: "10px 12px",
  border:
    "1px solid rgba(96,165,250,0.18)",
  borderRadius: 9,
  background:
    "rgba(37,99,235,0.06)",
  color: "#93c5fd",
  textAlign: "center" as const,
  fontSize: 11,
  fontWeight: 800,
  textDecoration: "none",
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

const successStyle = {
  marginTop: 15,
  padding: 13,
  border:
    "1px solid rgba(34,197,94,0.25)",
  borderRadius: 10,
  background:
    "rgba(34,197,94,0.08)",
  color: "#4ade80",
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