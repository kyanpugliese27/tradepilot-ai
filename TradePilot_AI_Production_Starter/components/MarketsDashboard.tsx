"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

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
  logo?: string;
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
  notes: {
    majorMarkets: string;
    movers: string;
    sectors: string;
  };
};

type MoversView =
  | "gainers"
  | "losers"
  | "largest-moves";

type SectorSort =
  | "best"
  | "worst"
  | "alphabetical";

export default function MarketsDashboard() {
  const router = useRouter();

  const [data, setData] =
    useState<MarketsResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [moversView, setMoversView] =
    useState<MoversView>("gainers");

  const [sectorSort, setSectorSort] =
    useState<SectorSort>("best");

  const [moverFilter, setMoverFilter] =
    useState("");

  const loadMarkets = useCallback(
    async (manual = false) => {
      try {
        manual
          ? setRefreshing(true)
          : setLoading(true);

        setError("");

        const response = await fetch(
          `/api/markets?refresh=${Date.now()}`,
          {
            cache: "no-store",
            headers: {
              "Cache-Control":
                "no-cache, no-store, must-revalidate",
            },
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Unable to load market data."
          );
        }

        setData(result as MarketsResponse);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load market data."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadMarkets();

    const interval = window.setInterval(
      () => loadMarkets(),
      60_000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [loadMarkets]);

  const visibleMovers = useMemo(() => {
    const query = moverFilter
      .trim()
      .toLowerCase();

    const filtered = (
      data?.movers ?? []
    ).filter(
      (item) =>
        item.symbol
          .toLowerCase()
          .includes(query) ||
        item.label
          .toLowerCase()
          .includes(query)
    );

    if (moversView === "losers") {
      return [...filtered].sort(
        (first, second) =>
          first.changePercent -
          second.changePercent
      );
    }

    if (
      moversView === "largest-moves"
    ) {
      return [...filtered].sort(
        (first, second) =>
          Math.abs(
            second.changePercent
          ) -
          Math.abs(
            first.changePercent
          )
      );
    }

    return [...filtered].sort(
      (first, second) =>
        second.changePercent -
        first.changePercent
    );
  }, [
    data?.movers,
    moverFilter,
    moversView,
  ]);

  const visibleSectors = useMemo(() => {
    const sectors = [
      ...(data?.sectors ?? []),
    ];

    if (sectorSort === "worst") {
      return sectors.sort(
        (first, second) =>
          first.changePercent -
          second.changePercent
      );
    }

    if (
      sectorSort === "alphabetical"
    ) {
      return sectors.sort(
        (first, second) =>
          first.label.localeCompare(
            second.label
          )
      );
    }

    return sectors.sort(
      (first, second) =>
        second.changePercent -
        first.changePercent
    );
  }, [data?.sectors, sectorSort]);

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

  if (loading && !data) {
    return <MarketsSkeleton />;
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          gap: "14px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 11px",
              borderRadius: "999px",
              border: `1px solid ${statusColor}55`,
              background: `${statusColor}14`,
              color: statusColor,
              fontSize: "12px",
              fontWeight: 800,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: statusColor,
                boxShadow: `0 0 10px ${statusColor}`,
              }}
            />

            {data?.status?.label ??
              "Market status unavailable"}
          </span>

          <span
            className="muted"
            style={{ fontSize: "12px" }}
          >
            {data?.updatedAt
              ? `Updated ${new Date(
                  data.updatedAt
                ).toLocaleTimeString(
                  "en-US",
                  {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  }
                )}`
              : "Waiting for update"}
          </span>
        </div>

        <button
          type="button"
          onClick={() =>
            loadMarkets(true)
          }
          disabled={refreshing}
          style={secondaryButtonStyle}
        >
          {refreshing
            ? "Refreshing..."
            : "Refresh markets"}
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
        <SectionHeader
          eyebrow="Major benchmarks"
          title="Market Overview"
          description={
            data?.notes.majorMarkets ??
            "Liquid ETFs are used as market proxies."
          }
        />

        <div
          className="market-card-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(5, minmax(0, 1fr))",
            gap: "12px",
            marginTop: "18px",
          }}
        >
          {(data?.majorMarkets ?? []).map(
            (market) => (
              <MarketCard
                key={market.symbol}
                item={market}
                onClick={() =>
                  router.push(
                    `/stock/${market.symbol}`
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
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent:
              "space-between",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          <SectionHeader
            eyebrow="Large-cap watch universe"
            title="Today's Movers"
            description={
              data?.notes.movers ??
              "Ranked from a curated large-cap universe."
            }
          />

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <TabButton
              label="Gainers"
              active={
                moversView === "gainers"
              }
              onClick={() =>
                setMoversView("gainers")
              }
            />

            <TabButton
              label="Losers"
              active={
                moversView === "losers"
              }
              onClick={() =>
                setMoversView("losers")
              }
            />

            <TabButton
              label="Largest Moves"
              active={
                moversView ===
                "largest-moves"
              }
              onClick={() =>
                setMoversView(
                  "largest-moves"
                )
              }
            />
          </div>
        </div>

        <input
          value={moverFilter}
          onChange={(event) =>
            setMoverFilter(
              event.target.value
            )
          }
          placeholder="Filter companies or tickers..."
          style={{
            ...inputStyle,
            marginTop: "16px",
          }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(245px, 1fr))",
            gap: "10px",
            marginTop: "14px",
          }}
        >
          {visibleMovers.map(
            (item, index) => (
              <MoverCard
                key={item.symbol}
                item={item}
                rank={index + 1}
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
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent:
              "space-between",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          <SectionHeader
            eyebrow="Sector proxies"
            title="Sector Performance"
            description={
              data?.notes.sectors ??
              "Select Sector SPDR ETFs are used as sector proxies."
            }
          />

          <select
            value={sectorSort}
            onChange={(event) =>
              setSectorSort(
                event.target
                  .value as SectorSort
              )
            }
            style={selectStyle}
          >
            <option value="best">
              Best first
            </option>
            <option value="worst">
              Worst first
            </option>
            <option value="alphabetical">
              Alphabetical
            </option>
          </select>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginTop: "18px",
          }}
        >
          {visibleSectors.map(
            (sector) => (
              <SectorRow
                key={sector.symbol}
                item={sector}
                onClick={() =>
                  router.push(
                    `/stock/${sector.symbol}`
                  )
                }
              />
            )
          )}
        </div>
      </section>

      <style jsx>{`
        @media (max-width: 1100px) {
          .market-card-grid {
            grid-template-columns:
              repeat(
                3,
                minmax(0, 1fr)
              ) !important;
          }
        }

        @media (max-width: 720px) {
          .market-card-grid {
            grid-template-columns:
              1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p style={eyebrowStyle}>
        {eyebrow}
      </p>

      <h2 style={{ margin: 0 }}>
        {title}
      </h2>

      <p
        className="muted"
        style={{
          margin: "7px 0 0",
          maxWidth: "720px",
          fontSize: "12px",
          lineHeight: 1.55,
        }}
      >
        {description}
      </p>
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
        padding: "16px",
        border:
          "1px solid rgba(255,255,255,0.08)",
        borderRadius: "13px",
        background:
          "rgba(255,255,255,0.03)",
        color: "inherit",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          gap: "8px",
        }}
      >
        <div>
          <strong>{item.label}</strong>

          <div
            className="muted"
            style={{
              marginTop: "4px",
              fontSize: "11px",
            }}
          >
            {item.symbol}
          </div>
        </div>

        {item.stale && (
          <span
            style={{
              color: "#fbbf24",
              fontSize: "10px",
            }}
          >
            Cached
          </span>
        )}
      </div>

      <div
        style={{
          marginTop: "15px",
          fontSize: "22px",
          fontWeight: 850,
        }}
      >
        ${item.price.toFixed(2)}
      </div>

      <div
        style={{
          marginTop: "5px",
          color: positive
            ? "#4ade80"
            : "#ff8a8a",
          fontWeight: 750,
          fontSize: "13px",
        }}
      >
        {positive ? "+" : ""}
        {item.change.toFixed(2)} (
        {positive ? "+" : ""}
        {item.changePercent.toFixed(
          2
        )}
        %)
      </div>
    </button>
  );
}

function MoverCard({
  item,
  rank,
  onClick,
}: {
  item: MarketItem;
  rank: number;
  onClick: () => void;
}) {
  const positive =
    item.changePercent >= 0;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent:
          "space-between",
        gap: "14px",
        padding: "14px",
        border:
          "1px solid rgba(255,255,255,0.08)",
        borderRadius: "12px",
        background:
          "rgba(255,255,255,0.025)",
        color: "inherit",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          minWidth: 0,
        }}
      >
        <span
          style={{
            minWidth: "24px",
            color: "#6b7280",
            fontSize: "12px",
            fontWeight: 800,
          }}
        >
          {rank}
        </span>

        {item.logo ? (
          <img
            src={item.logo}
            alt={`${item.label} logo`}
            style={{
              width: "36px",
              height: "36px",
              padding: "5px",
              objectFit: "contain",
              borderRadius: "9px",
              background: "white",
            }}
          />
        ) : (
          <div
            style={{
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",
              borderRadius: "9px",
              background:
                "rgba(96,165,250,0.12)",
              color: "#93c5fd",
              fontWeight: 850,
            }}
          >
            {item.symbol.slice(0, 2)}
          </div>
        )}

        <div style={{ minWidth: 0 }}>
          <strong>{item.symbol}</strong>

          <div
            className="muted"
            style={{
              marginTop: "3px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: "11px",
            }}
          >
            {item.label}
          </div>
        </div>
      </div>

      <div
        style={{
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        <strong>
          ${item.price.toFixed(2)}
        </strong>

        <div
          style={{
            marginTop: "4px",
            color: positive
              ? "#4ade80"
              : "#ff8a8a",
            fontSize: "12px",
            fontWeight: 750,
          }}
        >
          {positive ? "+" : ""}
          {item.changePercent.toFixed(
            2
          )}
          %
        </div>
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

  const barWidth = Math.min(
    100,
    Math.abs(
      item.changePercent
    ) * 18
  );

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        padding: "14px",
        border:
          "1px solid rgba(255,255,255,0.08)",
        borderRadius: "12px",
        background:
          "rgba(255,255,255,0.025)",
        color: "inherit",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          gap: "14px",
        }}
      >
        <div>
          <strong>{item.label}</strong>

          <div
            className="muted"
            style={{
              marginTop: "4px",
              fontSize: "11px",
            }}
          >
            {item.symbol} ·{" "}
            {item.description}
          </div>
        </div>

        <div
          style={{
            textAlign: "right",
            flexShrink: 0,
          }}
        >
          <strong>
            ${item.price.toFixed(2)}
          </strong>

          <div
            style={{
              marginTop: "4px",
              color: positive
                ? "#4ade80"
                : "#ff8a8a",
              fontSize: "12px",
              fontWeight: 750,
            }}
          >
            {positive ? "+" : ""}
            {item.changePercent.toFixed(
              2
            )}
            %
          </div>
        </div>
      </div>

      <div
        style={{
          height: "7px",
          marginTop: "11px",
          overflow: "hidden",
          borderRadius: "999px",
          background:
            "rgba(255,255,255,0.07)",
        }}
      >
        <div
          style={{
            width: `${barWidth}%`,
            height: "100%",
            borderRadius: "999px",
            background: positive
              ? "#4ade80"
              : "#ff8a8a",
          }}
        />
      </div>
    </button>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 11px",
        border: active
          ? "1px solid rgba(96,165,250,0.45)"
          : "1px solid rgba(255,255,255,0.09)",
        borderRadius: "9px",
        background: active
          ? "rgba(37,99,235,0.12)"
          : "rgba(255,255,255,0.025)",
        color: active
          ? "#93c5fd"
          : "#d1d5db",
        fontWeight: 750,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function MarketsSkeleton() {
  return (
    <div>
      {Array.from({
        length: 3,
      }).map((_, sectionIndex) => (
        <section
          key={sectionIndex}
          className="card"
          style={{
            ...sectionStyle,
            minHeight:
              sectionIndex === 0
                ? 260
                : 360,
          }}
        >
          <div
            style={{
              width: 180,
              height: 12,
              borderRadius: 999,
              background:
                "rgba(255,255,255,0.07)",
            }}
          />

          <div
            style={{
              width: 280,
              maxWidth: "80%",
              height: 26,
              marginTop: 13,
              borderRadius: 9,
              background:
                "rgba(255,255,255,0.1)",
            }}
          />
        </section>
      ))}
    </div>
  );
}

const sectionStyle = {
  marginTop: "14px",
  padding: "22px",
};

const eyebrowStyle = {
  margin: "0 0 6px",
  color: "#60a5fa",
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "10px 12px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  borderRadius: "9px",
  background:
    "rgba(255,255,255,0.025)",
  color: "white",
  outline: "none",
};

const selectStyle = {
  padding: "9px 11px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  borderRadius: "9px",
  background: "#0d1828",
  color: "white",
};

const secondaryButtonStyle = {
  padding: "9px 13px",
  border:
    "1px solid rgba(255,255,255,0.12)",
  borderRadius: "9px",
  background:
    "rgba(255,255,255,0.04)",
  color: "#d1d5db",
  fontWeight: 750,
  cursor: "pointer",
};

const errorStyle = {
  marginTop: "14px",
  padding: "13px",
  border:
    "1px solid rgba(255,107,107,0.3)",
  borderRadius: "10px",
  background:
    "rgba(255,107,107,0.08)",
  color: "#ff8a8a",
};