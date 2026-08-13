"use client";

import {
  useEffect,
  useState,
} from "react";

type ValuationCenterProps = {
  symbol: string;
};

type ValuationResponse = {
  symbol: string;
  companyName: string;
  currentPrice: number;
  classification: string;
  scores: {
    overall: number;
    valuation: number;
    profitability: number;
    balanceSheet: number;
    risk: number;
  };
  metrics: {
    peRatio: number | null;
    priceToBook: number | null;
    netMargin: number | null;
    grossMargin: number | null;
    operatingMargin: number | null;
    currentRatio: number | null;
    debtToEquity: number | null;
    returnOnEquity: number | null;
    dividendYield: number | null;
    beta: number | null;
    week52High: number | null;
    week52Low: number | null;
  };
  analystReference: {
    consensus: string;
    weightedScore: number | null;
    meanTarget: number | null;
    impliedUpsidePercent: number | null;
    range: {
      low: number | null;
      mean: number | null;
      median: number | null;
      high: number | null;
      analystCount: number | null;
      impliedUpsidePercent: number | null;
    } | null;
  };
  methodology: {
    label: string;
    note: string;
  };
  aiExplanation: {
    headline: string;
    overview: string;
    valuationSignals: string[];
    profitabilitySignals: string[];
    balanceSheetSignals: string[];
    cautions: string[];
    educationalConclusion: string;
    disclaimer: string;
  } | null;
  generatedAt: string;
  error?: string;
};

export default function ValuationCenter({
  symbol,
}: ValuationCenterProps) {
  const [data, setData] =
    useState<ValuationResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadValuation();
  }, [symbol]);

  async function loadValuation() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/stock-valuation?symbol=${encodeURIComponent(
          symbol
        )}&refresh=${Date.now()}`,
        {
          cache: "no-store",
        }
      );

      const result =
        (await response.json()) as ValuationResponse;

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to load valuation data."
        );
      }

      setData(result);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load valuation data."
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <section className="card" style={sectionStyle}>
        <h2>Loading Valuation Center...</h2>

        <p className="muted">
          Reviewing visible valuation,
          profitability, balance-sheet, and
          analyst-reference data.
        </p>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="card" style={sectionStyle}>
        <h2 style={{ color: "#ff8a8a" }}>
          Valuation Center unavailable
        </h2>

        <p className="muted">
          {error || "No valuation data is available."}
        </p>
      </section>
    );
  }

  const classificationColor =
    getClassificationColor(
      data.classification
    );

  return (
    <section
      className="card"
      style={{
        ...sectionStyle,
        border:
          "1px solid rgba(14,165,233,0.22)",
      }}
    >
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>
            Valuation intelligence
          </p>

          <h2 style={{ margin: 0 }}>
            Valuation Center
          </h2>

          <p
            className="muted"
            style={{
              margin: "7px 0 0",
              fontSize: 12,
            }}
          >
            A transparent, educational
            multi-factor score for {data.symbol}
          </p>
        </div>

        <button
          type="button"
          onClick={loadValuation}
          style={buttonStyle}
        >
          Refresh
        </button>
      </div>

      <div
        className="valuation-hero-grid"
        style={{
          display: "grid",
          gridTemplateColumns:
            "0.8fr 1.2fr",
          gap: 14,
          marginTop: 18,
        }}
      >
        <div style={panelStyle}>
          <span className="muted">
            Overall valuation score
          </span>

          <strong
            style={{
              display: "block",
              marginTop: 8,
              fontSize: 34,
              color: classificationColor,
            }}
          >
            {data.scores.overall}/100
          </strong>

          <p
            style={{
              margin: "8px 0 0",
              color: classificationColor,
              fontWeight: 850,
            }}
          >
            {data.classification}
          </p>

          <ScoreBar
            value={data.scores.overall}
            color={classificationColor}
          />
        </div>

        <div
          className="valuation-score-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          <ScoreCard
            label="Valuation"
            value={data.scores.valuation}
            inverse={false}
          />

          <ScoreCard
            label="Profitability"
            value={data.scores.profitability}
            inverse={false}
          />

          <ScoreCard
            label="Balance sheet"
            value={data.scores.balanceSheet}
            inverse={false}
          />

          <ScoreCard
            label="Risk"
            value={data.scores.risk}
            inverse
          />
        </div>
      </div>

      <div
        className="valuation-metric-grid"
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4, minmax(0, 1fr))",
          gap: 10,
          marginTop: 14,
        }}
      >
        <MetricCard
          label="P/E ratio"
          value={formatNumber(
            data.metrics.peRatio
          )}
        />

        <MetricCard
          label="Price / book"
          value={formatNumber(
            data.metrics.priceToBook
          )}
        />

        <MetricCard
          label="Net margin"
          value={formatPercent(
            data.metrics.netMargin
          )}
        />

        <MetricCard
          label="ROE"
          value={formatPercent(
            data.metrics.returnOnEquity
          )}
        />

        <MetricCard
          label="Current ratio"
          value={formatNumber(
            data.metrics.currentRatio
          )}
        />

        <MetricCard
          label="Debt / equity"
          value={formatNumber(
            data.metrics.debtToEquity
          )}
        />

        <MetricCard
          label="Dividend yield"
          value={formatPercent(
            data.metrics.dividendYield
          )}
        />

        <MetricCard
          label="Beta"
          value={formatNumber(
            data.metrics.beta
          )}
        />
      </div>

      <div
        style={{
          ...panelStyle,
          marginTop: 14,
        }}
      >
        <h3 style={{ margin: 0 }}>
          Analyst Reference
        </h3>

        <p
          className="muted"
          style={{
            margin: "6px 0 0",
            fontSize: 11,
          }}
        >
          Analyst targets are opinions and are
          shown only as a reference—not as
          intrinsic value.
        </p>

        <div
          className="analyst-reference-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap: 10,
            marginTop: 13,
          }}
        >
          <MetricCard
            label="Current price"
            value={formatCurrency(
              data.currentPrice
            )}
          />

          <MetricCard
            label="Mean target"
            value={formatCurrency(
              data.analystReference.meanTarget
            )}
          />

          <MetricCard
            label="Implied upside"
            value={formatSignedPercent(
              data.analystReference
                .impliedUpsidePercent
            )}
          />

          <MetricCard
            label="Consensus"
            value={
              data.analystReference.consensus
            }
          />
        </div>
      </div>

      {data.aiExplanation && (
        <div
          style={{
            marginTop: 14,
            padding: 18,
            border:
              "1px solid rgba(14,165,233,0.18)",
            borderRadius: 13,
            background:
              "rgba(14,165,233,0.06)",
          }}
        >
          <p style={eyebrowStyle}>
            TradePilot AI
          </p>

          <h3 style={{ margin: 0 }}>
            {data.aiExplanation.headline}
          </h3>

          <p
            style={{
              margin: "9px 0 0",
              color: "#d1d5db",
              lineHeight: 1.65,
            }}
          >
            {data.aiExplanation.overview}
          </p>

          <div
            className="ai-valuation-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: 12,
              marginTop: 14,
            }}
          >
            <BulletPanel
              title="Valuation signals"
              items={
                data.aiExplanation.valuationSignals
              }
              color="#38bdf8"
            />

            <BulletPanel
              title="Profitability signals"
              items={
                data.aiExplanation
                  .profitabilitySignals
              }
              color="#4ade80"
            />

            <BulletPanel
              title="Balance-sheet signals"
              items={
                data.aiExplanation
                  .balanceSheetSignals
              }
              color="#a78bfa"
            />

            <BulletPanel
              title="Cautions"
              items={
                data.aiExplanation.cautions
              }
              color="#ff8a8a"
            />
          </div>

          <div
            style={{
              marginTop: 12,
              padding: 14,
              borderRadius: 11,
              background:
                "rgba(255,255,255,0.025)",
              border:
                "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <strong
              style={{
                color: "#7dd3fc",
              }}
            >
              Educational conclusion
            </strong>

            <p
              style={{
                margin: "7px 0 0",
                color: "#d1d5db",
                lineHeight: 1.6,
              }}
            >
              {
                data.aiExplanation
                  .educationalConclusion
              }
            </p>
          </div>

          <p
            className="muted"
            style={{
              margin: "12px 0 0",
              fontSize: 10,
              lineHeight: 1.5,
            }}
          >
            {data.aiExplanation.disclaimer}
          </p>
        </div>
      )}

      <div style={methodologyStyle}>
        <strong>{data.methodology.label}</strong>

        <p
          style={{
            margin: "6px 0 0",
            color: "#9ca3af",
            fontSize: 11,
            lineHeight: 1.55,
          }}
        >
          {data.methodology.note}
        </p>
      </div>

      <style jsx>{`
        @media (max-width: 850px) {
          .valuation-hero-grid {
            grid-template-columns:
              1fr !important;
          }

          .valuation-metric-grid,
          .analyst-reference-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              ) !important;
          }
        }

        @media (max-width: 560px) {
          .valuation-score-grid,
          .valuation-metric-grid,
          .analyst-reference-grid,
          .ai-valuation-grid {
            grid-template-columns:
              1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

function ScoreCard({
  label,
  value,
  inverse,
}: {
  label: string;
  value: number;
  inverse: boolean;
}) {
  const color = inverse
    ? value <= 35
      ? "#4ade80"
      : value <= 65
        ? "#fbbf24"
        : "#ff8a8a"
    : value >= 70
      ? "#4ade80"
      : value >= 45
        ? "#fbbf24"
        : "#ff8a8a";

  return (
    <div style={panelStyle}>
      <span
        className="muted"
        style={{ fontSize: 10 }}
      >
        {label}
      </span>

      <strong
        style={{
          display: "block",
          marginTop: 6,
          fontSize: 20,
          color,
        }}
      >
        {value}/100
      </strong>

      <ScoreBar
        value={value}
        color={color}
      />
    </div>
  );
}

function ScoreBar({
  value,
  color,
}: {
  value: number;
  color: string;
}) {
  return (
    <div style={scoreTrackStyle}>
      <div
        style={{
          width: `${Math.max(
            0,
            Math.min(100, value)
          )}%`,
          height: "100%",
          borderRadius: 999,
          background: color,
        }}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={panelStyle}>
      <span
        className="muted"
        style={{ fontSize: 10 }}
      >
        {label}
      </span>

      <strong
        style={{
          display: "block",
          marginTop: 6,
          fontSize: 17,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function BulletPanel({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color: string;
}) {
  return (
    <div style={panelStyle}>
      <strong style={{ color }}>
        {title}
      </strong>

      <ul
        style={{
          margin: "9px 0 0",
          padding: 0,
          listStyle: "none",
        }}
      >
        {(items || []).map(
          (item, index) => (
            <li
              key={index}
              style={{
                display: "flex",
                gap: 8,
                marginTop:
                  index === 0 ? 0 : 7,
                color: "#d1d5db",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              <span style={{ color }}>•</span>
              <span>{item}</span>
            </li>
          )
        )}
      </ul>
    </div>
  );
}

function getClassificationColor(
  classification: string
) {
  if (
    classification.includes(
      "Attractive"
    )
  ) {
    return "#4ade80";
  }

  if (
    classification.includes(
      "Expensive"
    )
  ) {
    return "#ff8a8a";
  }

  return "#fbbf24";
}

function formatNumber(
  value: number | null
) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "N/A";
  }

  return value.toFixed(2);
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

  return `${value.toFixed(2)}%`;
}

function formatSignedPercent(
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
  color: "#38bdf8",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};

const panelStyle = {
  padding: 15,
  border:
    "1px solid rgba(255,255,255,0.08)",
  borderRadius: 11,
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

const scoreTrackStyle = {
  height: 8,
  marginTop: 11,
  overflow: "hidden",
  borderRadius: 999,
  background:
    "rgba(255,255,255,0.08)",
};

const methodologyStyle = {
  marginTop: 14,
  padding: 14,
  borderRadius: 11,
  border:
    "1px solid rgba(251,191,36,0.16)",
  background:
    "rgba(251,191,36,0.04)",
  color: "#fbbf24",
};