"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

type MarketItem = {
  symbol: string;
  label: string;
  description: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
  stale: boolean;
  logo: string;
};

type MarketsResponse = {
  status: {
    state:
      | "open"
      | "closed"
      | "pre-market"
      | "after-hours";
    label: string;
    isOpen: boolean;
    holiday: string | null;
    session: string | null;
    timezone: string;
    source: "provider" | "schedule";
  } | null;
  majorMarkets: MarketItem[];
  movers: MarketItem[];
  sectors: MarketItem[];
  updatedAt: string;
};

type MoversMode =
  | "gainers"
  | "losers"
  | "largest";

export default function MarketsPage() {
  const router = useRouter();

  const [data, setData] =
    useState<MarketsResponse | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");
  const [mode, setMode] =
    useState<MoversMode>("gainers");
  const [query, setQuery] =
    useState("");

  useEffect(() => {
    loadMarkets();

    const interval = window.setInterval(
      loadMarkets,
      60000
    );

    return () =>
      window.clearInterval(interval);
  }, []);

  async function loadMarkets() {
    try {
      setError("");

      const response = await fetch(
        `/api/markets?refresh=${Date.now()}`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to load markets."
        );
      }

      setData(result as MarketsResponse);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load markets."
      );
    } finally {
      setLoading(false);
    }
  }

  const sortedMovers = useMemo(() => {
    const filtered = (
      data?.movers ?? []
    ).filter((item) => {
      const search = query
        .trim()
        .toLowerCase();

      return (
        item.symbol
          .toLowerCase()
          .includes(search) ||
        item.label
          .toLowerCase()
          .includes(search)
      );
    });

    if (mode === "losers") {
      return [...filtered].sort(
        (a, b) =>
          a.changePercent -
          b.changePercent
      );
    }

    if (mode === "largest") {
      return [...filtered].sort(
        (a, b) =>
          Math.abs(b.changePercent) -
          Math.abs(a.changePercent)
      );
    }

    return [...filtered].sort(
      (a, b) =>
        b.changePercent -
        a.changePercent
    );
  }, [data?.movers, mode, query]);

  const sortedSectors = useMemo(
    () =>
      [...(data?.sectors ?? [])].sort(
        (a, b) =>
          b.changePercent -
          a.changePercent
      ),
    [data?.sectors]
  );

  const statusColor =
    data?.status?.state === "open"
      ? "#4ade80"
      : data?.status?.state ===
            "pre-market"
        ? "#fbbf24"
        : data?.status?.state ===
              "after-hours"
          ? "#60a5fa"
          : "#ff8a8a";

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="main">
        <section
          style={{
            maxWidth: 1180,
            margin: "0 auto",
          }}
        >
          <div style={{ marginBottom: 18 }}>
            <p style={eyebrowStyle}>
              Norvexa market intelligence
            </p>

            <h1
              style={{
                margin: 0,
                fontSize: 38,
              }}
            >
              Markets
            </h1>

            <p
              className="muted"
              style={{
                margin: "9px 0 0",
                lineHeight: 1.6,
              }}
            >
              Review broad-market proxies,
              large-cap movers, and sector ETF
              performance.
            </p>
          </div>

          {loading && !data ? (
            <div className="card" style={sectionStyle}>
              <h2>Loading markets...</h2>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    padding: "8px 11px",
                    borderRadius: 999,
                    color: statusColor,
                    border: `1px solid ${statusColor}55`,
                    background: `${statusColor}14`,
                    fontWeight: 800,
                    fontSize: 12,
                  }}
                >
                  {data?.status?.label ??
                    "Market status unavailable"}
                </span>

                <button
                  type="button"
                  onClick={loadMarkets}
                  style={buttonStyle}
                >
                  Refresh
                </button>
              </div>

              {error && (
                <div style={errorStyle}>
                  {error}
                </div>
              )}

              <section
                className="card"
                style={sectionStyle}
              >
                <p style={eyebrowStyle}>
                  Major benchmarks
                </p>

                <h2 style={{ margin: 0 }}>
                  Market Overview
                </h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(190px, 1fr))",
                    gap: 12,
                    marginTop: 18,
                  }}
                >
                  {(data?.majorMarkets ?? []).map(
                    (item) => (
                      <MarketCard
                        key={item.symbol}
                        item={item}
                        onClick={() =>
                          router.push(
                            `/stock/${item.symbol}`
                          )
                        }
                      />
                    )
                  )}
                </div>
              </section>

              <section
                className="card"
                style={sectionStyle}
              >
                <p style={eyebrowStyle}>
                  Curated large-cap universe
                </p>

                <h2 style={{ margin: 0 }}>
                  Today's Movers
                </h2>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginTop: 14,
                  }}
                >
                  <button
                    onClick={() =>
                      setMode("gainers")
                    }
                    style={buttonStyle}
                  >
                    Gainers
                  </button>

                  <button
                    onClick={() =>
                      setMode("losers")
                    }
                    style={buttonStyle}
                  >
                    Losers
                  </button>

                  <button
                    onClick={() =>
                      setMode("largest")
                    }
                    style={buttonStyle}
                  >
                    Largest Moves
                  </button>
                </div>

                <input
                  value={query}
                  onChange={(event) =>
                    setQuery(
                      event.target.value
                    )
                  }
                  placeholder="Filter ticker or company..."
                  style={{
                    ...inputStyle,
                    marginTop: 14,
                  }}
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(230px, 1fr))",
                    gap: 10,
                    marginTop: 14,
                  }}
                >
                  {sortedMovers.map(
                    (item) => (
                      <MarketCard
                        key={item.symbol}
                        item={item}
                        onClick={() =>
                          router.push(
                            `/stock/${item.symbol}`
                          )
                        }
                      />
                    )
                  )}
                </div>
              </section>

              <section
                className="card"
                style={sectionStyle}
              >
                <p style={eyebrowStyle}>
                  Sector proxies
                </p>

                <h2 style={{ margin: 0 }}>
                  Sector Performance
                </h2>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    marginTop: 18,
                  }}
                >
                  {sortedSectors.map(
                    (item) => (
                      <SectorRow
                        key={item.symbol}
                        item={item}
                        onClick={() =>
                          router.push(
                            `/stock/${item.symbol}`
                          )
                        }
                      />
                    )
                  )}
                </div>
              </section>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function MarketCard({
  item,
  onClick,
}: {
  item: MarketItem;
  onClick: () => void;
}) {
  const positive =
    item.changePercent >= 0;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: 15,
        border:
          "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        background:
          "rgba(255,255,255,0.03)",
        color: "inherit",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <strong>{item.label}</strong>

      <div
        className="muted"
        style={{
          marginTop: 4,
          fontSize: 11,
        }}
      >
        {item.symbol}
      </div>

      <div
        style={{
          marginTop: 14,
          fontSize: 21,
          fontWeight: 850,
        }}
      >
        ${item.price.toFixed(2)}
      </div>

      <div
        style={{
          marginTop: 5,
          color: positive
            ? "#4ade80"
            : "#ff8a8a",
          fontWeight: 750,
          fontSize: 13,
        }}
      >
        {positive ? "+" : ""}
        {item.changePercent.toFixed(2)}%
      </div>
    </button>
  );
}

function SectorRow({
  item,
  onClick,
}: {
  item: MarketItem;
  onClick: () => void;
}) {
  const positive =
    item.changePercent >= 0;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        padding: 14,
        border:
          "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        background:
          "rgba(255,255,255,0.025)",
        color: "inherit",
        display: "flex",
        justifyContent:
          "space-between",
        gap: 12,
        cursor: "pointer",
      }}
    >
      <div style={{ textAlign: "left" }}>
        <strong>{item.label}</strong>

        <div
          className="muted"
          style={{
            marginTop: 4,
            fontSize: 11,
          }}
        >
          {item.symbol}
        </div>
      </div>

      <div
        style={{
          color: positive
            ? "#4ade80"
            : "#ff8a8a",
          fontWeight: 800,
        }}
      >
        {positive ? "+" : ""}
        {item.changePercent.toFixed(2)}%
      </div>
    </button>
  );
}

const eyebrowStyle = {
  margin: "0 0 6px",
  color: "#60a5fa",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};

const sectionStyle = {
  marginTop: 14,
  padding: 22,
};

const buttonStyle = {
  padding: "9px 13px",
  border:
    "1px solid rgba(255,255,255,0.12)",
  borderRadius: 9,
  background:
    "rgba(255,255,255,0.04)",
  color: "#d1d5db",
  fontWeight: 750,
  cursor: "pointer",
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

const errorStyle = {
  marginTop: 14,
  padding: 13,
  border:
    "1px solid rgba(255,107,107,0.3)",
  borderRadius: 10,
  background:
    "rgba(255,107,107,0.08)",
  color: "#ff8a8a",
};