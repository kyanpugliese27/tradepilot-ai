"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import WatchlistRow, {
  WatchlistStock,
} from "@/components/WatchlistRow";
import WatchlistSearch from "@/components/WatchlistSearch";

type SortOption =
  | "symbol"
  | "gainers"
  | "losers"
  | "price-high"
  | "price-low";

export default function WatchlistTable() {
  const router = useRouter();

  const [stocks, setStocks] = useState<
    WatchlistStock[]
  >([]);
  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] =
    useState("");
  const [removingSymbol, setRemovingSymbol] =
    useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [sort, setSort] =
    useState<SortOption>("symbol");
  const [updatedAt, setUpdatedAt] =
    useState<string | null>(null);

  const loadWatchlist = useCallback(
    async (manual = false) => {
      try {
        manual
          ? setRefreshing(true)
          : setLoading(true);

        setError("");

        const response = await fetch(
          `/api/watchlist-live?refresh=${Date.now()}`,
          {
            cache: "no-store",
            headers: {
              "Cache-Control":
                "no-cache, no-store, must-revalidate",
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to load your watchlist."
          );
        }

        setStocks(
          Array.isArray(data.stocks)
            ? data.stocks
            : []
        );

        setUpdatedAt(
          data.updatedAt ?? null
        );
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
    []
  );

  useEffect(() => {
    loadWatchlist();

    const interval = window.setInterval(
      () => loadWatchlist(),
      60_000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [loadWatchlist]);

  async function removeStock(
    symbol: string
  ) {
    try {
      setRemovingSymbol(symbol);
      setError("");

      const response = await fetch(
        `/api/watchlist-live?symbol=${encodeURIComponent(
          symbol
        )}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to remove this stock."
        );
      }

      setStocks((current) =>
        current.filter(
          (stock) =>
            stock.symbol !== symbol
        )
      );
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove this stock."
      );
    } finally {
      setRemovingSymbol(null);
    }
  }

  const visibleStocks = useMemo(() => {
    const query = filter
      .trim()
      .toLowerCase();

    const filtered = stocks.filter(
      (stock) =>
        stock.symbol
          .toLowerCase()
          .includes(query) ||
        (stock.name || "")
          .toLowerCase()
          .includes(query)
    );

    return [...filtered].sort(
      (first, second) => {
        switch (sort) {
          case "gainers":
            return (
              second.changePercent -
              first.changePercent
            );

          case "losers":
            return (
              first.changePercent -
              second.changePercent
            );

          case "price-high":
            return second.price - first.price;

          case "price-low":
            return first.price - second.price;

          default:
            return first.symbol.localeCompare(
              second.symbol
            );
        }
      }
    );
  }, [filter, sort, stocks]);

  return (
    <section
      className="card"
      style={{
        padding: "22px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            style={{
              margin: "0 0 5px",
              color: "#60a5fa",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Live market tracking
          </p>

          <h2 style={{ margin: 0 }}>
            My Watchlist
          </h2>

          <p
            className="muted"
            style={{
              margin: "7px 0 0",
              fontSize: "12px",
            }}
          >
            {updatedAt
              ? `Updated ${new Date(
                  updatedAt
                ).toLocaleTimeString(
                  "en-US",
                  {
                    hour: "numeric",
                    minute: "2-digit",
                  }
                )}`
              : "Waiting for live prices"}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            loadWatchlist(true)
          }
          disabled={refreshing}
          style={{
            padding: "9px 13px",
            border:
              "1px solid rgba(255,255,255,0.12)",
            borderRadius: "9px",
            background:
              "rgba(255,255,255,0.04)",
            color: "#d1d5db",
            fontWeight: 750,
            cursor: refreshing
              ? "not-allowed"
              : "pointer",
          }}
        >
          {refreshing
            ? "Refreshing..."
            : "Refresh prices"}
        </button>
      </div>

      <div style={{ marginTop: "18px" }}>
        <WatchlistSearch
          onAdded={() =>
            loadWatchlist(true)
          }
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginTop: "16px",
        }}
      >
        <input
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value)
          }
          placeholder="Filter watchlist..."
          style={{
            flex: "1 1 220px",
            padding: "10px 12px",
            border:
              "1px solid rgba(255,255,255,0.1)",
            borderRadius: "9px",
            background:
              "rgba(255,255,255,0.025)",
            color: "white",
            outline: "none",
          }}
        />

        <select
          value={sort}
          onChange={(event) =>
            setSort(
              event.target
                .value as SortOption
            )
          }
          style={{
            padding: "10px 12px",
            border:
              "1px solid rgba(255,255,255,0.1)",
            borderRadius: "9px",
            background: "#0d1828",
            color: "white",
          }}
        >
          <option value="symbol">
            Alphabetical
          </option>
          <option value="gainers">
            Biggest gain
          </option>
          <option value="losers">
            Biggest loss
          </option>
          <option value="price-high">
            Price: high to low
          </option>
          <option value="price-low">
            Price: low to high
          </option>
        </select>
      </div>

      {error && (
        <div
          style={{
            marginTop: "16px",
            padding: "13px",
            border:
              "1px solid rgba(255,107,107,0.3)",
            borderRadius: "10px",
            background:
              "rgba(255,107,107,0.08)",
            color: "#ff8a8a",
          }}
        >
          {error}
        </div>
      )}

      {loading && stocks.length === 0 ? (
        <div style={{ marginTop: "18px" }}>
          {Array.from({ length: 4 }).map(
            (_, index) => (
              <div
                key={index}
                style={{
                  height: "72px",
                  marginTop:
                    index === 0
                      ? 0
                      : "10px",
                  borderRadius: "12px",
                  background:
                    "rgba(255,255,255,0.045)",
                }}
              />
            )
          )}
        </div>
      ) : visibleStocks.length === 0 ? (
        <div
          style={{
            marginTop: "18px",
            padding: "24px",
            border:
              "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
            background:
              "rgba(255,255,255,0.025)",
          }}
        >
          <h3 style={{ margin: 0 }}>
            No stocks found
          </h3>

          <p
            className="muted"
            style={{ margin: "8px 0 0" }}
          >
            Add a ticker above or clear your
            filter.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginTop: "18px",
            overflowX: "auto",
          }}
        >
          <div
            style={{
              minWidth: "760px",
              display: "grid",
              gridTemplateColumns:
                "minmax(210px, 1.4fr) 120px 120px 150px 90px",
              gap: "14px",
              padding: "0 16px",
              color: "#9ca3af",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            <span>Company</span>
            <span>Price</span>
            <span>Today</span>
            <span>AI tone</span>
            <span>Action</span>
          </div>

          <div
            style={{
              minWidth: "760px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {visibleStocks.map((stock) => (
              <WatchlistRow
                key={stock.symbol}
                stock={stock}
                removing={
                  removingSymbol ===
                  stock.symbol
                }
                onOpen={() =>
                  router.push(
                    `/stock/${stock.symbol}`
                  )
                }
                onRemove={() =>
                  removeStock(stock.symbol)
                }
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}