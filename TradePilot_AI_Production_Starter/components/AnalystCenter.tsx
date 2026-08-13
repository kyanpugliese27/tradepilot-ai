"use client";

import { useEffect, useState } from "react";

type AnalystCenterProps = {
  symbol: string;
};

type AnalystData = {
  symbol: string;
  companyName: string;
  currentPrice: number;
  consensus: string;
  weightedScore: number | null;
  latestPeriod: string;
  counts: {
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
  };
  totalRecommendations: number;
  priceTarget: {
    lastUpdated: string;
    numberAnalysts: number | null;
    targetHigh: number | null;
    targetLow: number | null;
    targetMean: number | null;
    targetMedian: number | null;
    impliedUpsidePercent: number | null;
  } | null;
  availability: {
    recommendations: boolean;
    priceTargets: boolean;
    recommendationStatus: number;
    priceTargetStatus: number;
  };
  error?: string;
};

export default function AnalystCenter({
  symbol,
}: AnalystCenterProps) {
  const [data, setData] =
    useState<AnalystData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadData();
  }, [symbol]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/stock-analyst-center?symbol=${encodeURIComponent(
          symbol
        )}&refresh=${Date.now()}`,
        {
          cache: "no-store",
        }
      );

      const result =
        (await response.json()) as AnalystData;

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to load analyst data."
        );
      }

      setData(result);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load analyst data."
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <section className="card" style={sectionStyle}>
        <h2>Loading Analyst Center...</h2>
        <p className="muted">
          Gathering analyst recommendations and price targets.
        </p>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="card" style={sectionStyle}>
        <h2 style={{ color: "#ff8a8a" }}>
          Analyst Center unavailable
        </h2>
        <p className="muted">
          {error || "No analyst data is available."}
        </p>
      </section>
    );
  }

  const color = getConsensusColor(
    data.consensus
  );

  return (
    <section
      className="card"
      style={{
        ...sectionStyle,
        border:
          "1px solid rgba(96,165,250,0.22)",
      }}
    >
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>
            Stock intelligence
          </p>

          <h2 style={{ margin: 0 }}>
            Analyst Center
          </h2>

          <p className="muted" style={{ fontSize: 12 }}>
            Analyst consensus and target data for {data.symbol}
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          style={buttonStyle}
        >
          Refresh
        </button>
      </div>

      <div className="analyst-grid" style={topGridStyle}>
        <div style={panelStyle}>
          <span className="muted">
            Consensus
          </span>

          <strong
            style={{
              display: "block",
              marginTop: 8,
              color,
              fontSize: 28,
            }}
          >
            {data.consensus}
          </strong>

          <p className="muted" style={{ fontSize: 11 }}>
            Based on {data.totalRecommendations} recommendations
          </p>

          <Gauge score={data.weightedScore} />
        </div>

        <div style={panelStyle}>
          <h3 style={{ margin: 0 }}>
            Rating Breakdown
          </h3>

          {data.availability.recommendations ? (
            <div style={{ marginTop: 14 }}>
              <RatingRow
                label="Strong Buy"
                value={data.counts.strongBuy}
                total={data.totalRecommendations}
                color="#22c55e"
              />
              <RatingRow
                label="Buy"
                value={data.counts.buy}
                total={data.totalRecommendations}
                color="#4ade80"
              />
              <RatingRow
                label="Hold"
                value={data.counts.hold}
                total={data.totalRecommendations}
                color="#fbbf24"
              />
              <RatingRow
                label="Sell"
                value={data.counts.sell}
                total={data.totalRecommendations}
                color="#fb7185"
              />
              <RatingRow
                label="Strong Sell"
                value={data.counts.strongSell}
                total={data.totalRecommendations}
                color="#ef4444"
              />
            </div>
          ) : (
            <Unavailable text="Recommendation trends are unavailable for this symbol or your Finnhub plan." />
          )}
        </div>
      </div>

      <div className="target-grid" style={targetGridStyle}>
        <TargetCard
          label="Current Price"
          value={formatCurrency(data.currentPrice)}
        />

        <TargetCard
          label="Mean Target"
          value={formatCurrency(
            data.priceTarget?.targetMean ?? null
          )}
        />

        <TargetCard
          label="Median Target"
          value={formatCurrency(
            data.priceTarget?.targetMedian ?? null
          )}
        />

        <TargetCard
          label="High Target"
          value={formatCurrency(
            data.priceTarget?.targetHigh ?? null
          )}
        />

        <TargetCard
          label="Low Target"
          value={formatCurrency(
            data.priceTarget?.targetLow ?? null
          )}
        />
      </div>

      {data.priceTarget ? (
        <div
          style={{
            ...panelStyle,
            marginTop: 14,
          }}
        >
          <span className="muted">
            Implied upside/downside
          </span>

          <strong
            style={{
              display: "block",
              marginTop: 8,
              color:
                (
                  data.priceTarget
                    .impliedUpsidePercent ?? 0
                ) >= 0
                  ? "#4ade80"
                  : "#ff8a8a",
              fontSize: 25,
            }}
          >
            {formatPercent(
              data.priceTarget
                .impliedUpsidePercent
            )}
          </strong>

          <p className="muted" style={{ fontSize: 11 }}>
            Based on{" "}
            {data.priceTarget.numberAnalysts ??
              "an unavailable number of"}{" "}
            analysts
          </p>

          {data.priceTarget.lastUpdated && (
            <p className="muted" style={{ fontSize: 10 }}>
              Updated {data.priceTarget.lastUpdated}
            </p>
          )}
        </div>
      ) : (
        <Unavailable text="Price-target consensus is unavailable for this symbol or your Finnhub plan." />
      )}

      <p
        className="muted"
        style={{
          margin: "14px 0 0",
          fontSize: 11,
          lineHeight: 1.5,
        }}
      >
        Analyst opinions and price targets are estimates, can change, and are not guarantees of future performance.
      </p>

      <style jsx>{`
        @media (max-width: 780px) {
          .analyst-grid {
            grid-template-columns: 1fr !important;
          }

          .target-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 500px) {
          .target-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

function Gauge({
  score,
}: {
  score: number | null;
}) {
  const position =
    score === null
      ? 50
      : Math.max(
          0,
          Math.min(100, ((score - 1) / 4) * 100)
        );

  return (
    <div style={{ marginTop: 15 }}>
      <div
        style={{
          position: "relative",
          height: 10,
          borderRadius: 999,
          background:
            "linear-gradient(90deg, #ef4444, #fbbf24, #22c55e)",
        }}
      >
        <span
          style={{
            position: "absolute",
            left: `${position}%`,
            top: -4,
            width: 4,
            height: 18,
            borderRadius: 999,
            background: "white",
            transform: "translateX(-50%)",
          }}
        />
      </div>

      <div style={gaugeLabelsStyle}>
        <span>Strong Sell</span>
        <span>Hold</span>
        <span>Strong Buy</span>
      </div>
    </div>
  );
}

function RatingRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage =
    total > 0 ? (value / total) * 100 : 0;

  return (
    <div style={ratingRowStyle}>
      <span className="muted" style={{ fontSize: 11 }}>
        {label}
      </span>

      <div style={barTrackStyle}>
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            borderRadius: 999,
            background: color,
          }}
        />
      </div>

      <strong>{value}</strong>
    </div>
  );
}

function TargetCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={panelStyle}>
      <span className="muted" style={{ fontSize: 10 }}>
        {label}
      </span>

      <strong
        style={{
          display: "block",
          marginTop: 6,
          fontSize: 18,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function Unavailable({
  text,
}: {
  text: string;
}) {
  return (
    <div style={unavailableStyle}>
      {text}
    </div>
  );
}

function formatCurrency(
  value: number | null
) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "N/A";
  }

  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function formatPercent(
  value: number | null
) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "N/A";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(
    2
  )}%`;
}

function getConsensusColor(
  consensus: string
) {
  if (consensus.includes("Buy")) {
    return "#4ade80";
  }

  if (consensus.includes("Sell")) {
    return "#ff8a8a";
  }

  if (consensus === "Hold") {
    return "#fbbf24";
  }

  return "#9ca3af";
}

const sectionStyle = {
  marginTop: 14,
  padding: 22,
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap" as const,
};

const eyebrowStyle = {
  margin: "0 0 6px",
  color: "#60a5fa",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};

const topGridStyle = {
  display: "grid",
  gridTemplateColumns: "0.8fr 1.2fr",
  gap: 14,
  marginTop: 18,
};

const targetGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(5, minmax(0, 1fr))",
  gap: 10,
  marginTop: 14,
};

const panelStyle = {
  padding: 16,
  border:
    "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  background:
    "rgba(255,255,255,0.03)",
};

const buttonStyle = {
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

const gaugeLabelsStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 6,
  color: "#6b7280",
  fontSize: 9,
};

const ratingRowStyle = {
  display: "grid",
  gridTemplateColumns: "90px 1fr 28px",
  gap: 8,
  alignItems: "center",
  marginTop: 9,
};

const barTrackStyle = {
  height: 8,
  borderRadius: 999,
  overflow: "hidden",
  background:
    "rgba(255,255,255,0.07)",
};

const unavailableStyle = {
  marginTop: 14,
  padding: 13,
  border:
    "1px solid rgba(251,191,36,0.18)",
  borderRadius: 10,
  background:
    "rgba(251,191,36,0.05)",
  color: "#fbbf24",
  fontSize: 11,
  lineHeight: 1.5,
};