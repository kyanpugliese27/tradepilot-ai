"use client";

import {
  useEffect,
  useState,
} from "react";

type AIResearchRatingCenterProps = {
  symbol: string;
};

type RatingResponse = {
  symbol: string;
  companyName: string;
  currentPrice: number;
  rating: string;
  overallScore: number;
  confidenceScore: number;
  componentScores: {
    valuation: number;
    financialHealth: number;
    momentum: number;
    analystConsensus: number;
    ownership: number;
    newsCoverage: number;
    risk: number;
  };
  referenceData: {
    analystConsensus: string;
    analystMeanTarget: number | null;
    analystImpliedUpsidePercent:
      | number
      | null;
    analystCount: number | null;
    valuationClassification: string;
    dailyChangePercent: number;
    recentNewsCount: number;
    insiderNetShares: number | null;
  };
  methodology: {
    label: string;
    note: string;
  };
  aiExplanation: {
    headline: string;
    overview: string;
    bullCase: string[];
    bearCase: string[];
    catalysts: string[];
    risks: string[];
    confidenceExplanation: string;
    conclusion: string;
    disclaimer: string;
  } | null;
  generatedAt: string;
  error?: string;
};

export default function AIResearchRatingCenter({
  symbol,
}: AIResearchRatingCenterProps) {
  const [data, setData] =
    useState<RatingResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadRating();
  }, [symbol]);

  async function loadRating() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/stock-ai-rating?symbol=${encodeURIComponent(
          symbol
        )}&refresh=${Date.now()}`,
        {
          cache: "no-store",
        }
      );

      const result =
        (await response.json()) as RatingResponse;

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to load the AI research rating."
        );
      }

      setData(result);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load the AI research rating."
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <section
        className="card"
        style={sectionStyle}
      >
        <h2>
          Loading AI Research Rating...
        </h2>

        <p className="muted">
          Combining valuation,
          fundamentals, momentum, analyst,
          ownership, and news data.
        </p>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section
        className="card"
        style={sectionStyle}
      >
        <h2
          style={{
            color: "#ff8a8a",
          }}
        >
          AI Research Rating unavailable
        </h2>

        <p className="muted">
          {error ||
            "No rating data is available."}
        </p>
      </section>
    );
  }

  const ratingColor =
    getRatingColor(data.rating);

  return (
    <section
      className="card"
      style={{
        ...sectionStyle,
        border:
          "1px solid rgba(59,130,246,0.24)",
        background:
          "linear-gradient(135deg, rgba(37,99,235,0.08), rgba(255,255,255,0.025))",
      }}
    >
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>
            TradePilot intelligence
          </p>

          <h2 style={{ margin: 0 }}>
            AI Research Rating
          </h2>

          <p
            className="muted"
            style={{
              margin: "7px 0 0",
              fontSize: 12,
            }}
          >
            A transparent educational
            research signal for {data.symbol}
          </p>
        </div>

        <button
          type="button"
          onClick={loadRating}
          style={buttonStyle}
        >
          Refresh
        </button>
      </div>

      <div
        className="rating-hero-grid"
        style={{
          display: "grid",
          gridTemplateColumns:
            "0.8fr 1.2fr",
          gap: 14,
          marginTop: 18,
        }}
      >
        <div style={heroPanelStyle}>
          <span className="muted">
            Research rating
          </span>

          <strong
            style={{
              display: "block",
              marginTop: 8,
              color: ratingColor,
              fontSize: 31,
            }}
          >
            {data.rating}
          </strong>

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              marginTop: 12,
            }}
          >
            <strong
              style={{
                fontSize: 34,
              }}
            >
              {data.overallScore}
            </strong>

            <span className="muted">
              /100
            </span>
          </div>

          <ScoreBar
            value={data.overallScore}
            color={ratingColor}
          />
        </div>

        <div
          className="rating-score-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          <ScoreCard
            label="Confidence"
            value={data.confidenceScore}
          />

          <ScoreCard
            label="Valuation"
            value={
              data.componentScores.valuation
            }
          />

          <ScoreCard
            label="Financial health"
            value={
              data.componentScores
                .financialHealth
            }
          />

          <ScoreCard
            label="Momentum"
            value={
              data.componentScores.momentum
            }
          />

          <ScoreCard
            label="Analyst consensus"
            value={
              data.componentScores
                .analystConsensus
            }
          />

          <ScoreCard
            label="Ownership"
            value={
              data.componentScores.ownership
            }
          />
        </div>
      </div>

      <div
        className="rating-reference-grid"
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4, minmax(0, 1fr))",
          gap: 10,
          marginTop: 14,
        }}
      >
        <MetricCard
          label="Current price"
          value={formatCurrency(
            data.currentPrice
          )}
        />

        <MetricCard
          label="Analyst target"
          value={formatCurrency(
            data.referenceData
              .analystMeanTarget
          )}
        />

        <MetricCard
          label="Target difference"
          value={formatSignedPercent(
            data.referenceData
              .analystImpliedUpsidePercent
          )}
        />

        <MetricCard
          label="Daily move"
          value={formatSignedPercent(
            data.referenceData
              .dailyChangePercent
          )}
        />

        <MetricCard
          label="Analyst consensus"
          value={
            data.referenceData
              .analystConsensus
          }
        />

        <MetricCard
          label="Valuation signal"
          value={
            data.referenceData
              .valuationClassification
          }
        />

        <MetricCard
          label="Recent news items"
          value={String(
            data.referenceData
              .recentNewsCount
          )}
        />

        <MetricCard
          label="Net insider shares"
          value={formatSignedShares(
            data.referenceData
              .insiderNetShares
          )}
        />
      </div>

      <div
        style={{
          ...panelStyle,
          marginTop: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <span className="muted">
              Risk score
            </span>

            <strong
              style={{
                display: "block",
                marginTop: 7,
                color:
                  data.componentScores.risk <=
                  35
                    ? "#4ade80"
                    : data.componentScores
                          .risk <= 65
                      ? "#fbbf24"
                      : "#ff8a8a",
                fontSize: 23,
              }}
            >
              {data.componentScores.risk}
              /100
            </strong>
          </div>

          <div
            style={{
              textAlign: "right",
            }}
          >
            <span className="muted">
              News coverage score
            </span>

            <strong
              style={{
                display: "block",
                marginTop: 7,
                fontSize: 23,
              }}
            >
              {
                data.componentScores
                  .newsCoverage
              }
              /100
            </strong>
          </div>
        </div>
      </div>

      {data.aiExplanation && (
        <div style={aiPanelStyle}>
          <p style={eyebrowStyle}>
            AI explanation
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
            className="research-ai-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: 12,
              marginTop: 14,
            }}
          >
            <BulletPanel
              title="Positive case"
              items={
                data.aiExplanation.bullCase
              }
              color="#4ade80"
            />

            <BulletPanel
              title="Cautious case"
              items={
                data.aiExplanation.bearCase
              }
              color="#ff8a8a"
            />

            <BulletPanel
              title="Visible catalysts"
              items={
                data.aiExplanation.catalysts
              }
              color="#60a5fa"
            />

            <BulletPanel
              title="Key risks"
              items={
                data.aiExplanation.risks
              }
              color="#fbbf24"
            />
          </div>

          <Insight
            title="Confidence"
            text={
              data.aiExplanation
                .confidenceExplanation
            }
          />

          <Insight
            title="Educational conclusion"
            text={
              data.aiExplanation.conclusion
            }
          />

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
        <strong>
          {data.methodology.label}
        </strong>

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
        @media (max-width: 860px) {
          .rating-hero-grid {
            grid-template-columns:
              1fr !important;
          }

          .rating-reference-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              ) !important;
          }
        }

        @media (max-width: 560px) {
          .rating-score-grid,
          .rating-reference-grid,
          .research-ai-grid {
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
}: {
  label: string;
  value: number;
}) {
  const color =
    value >= 70
      ? "#4ade80"
      : value >= 45
        ? "#fbbf24"
        : "#ff8a8a";

  return (
    <div style={panelStyle}>
      <span
        className="muted"
        style={{
          fontSize: 10,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          display: "block",
          marginTop: 6,
          fontSize: 19,
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
        style={{
          fontSize: 10,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          display: "block",
          marginTop: 6,
          fontSize: 16,
          overflowWrap:
            "anywhere",
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
              <span style={{ color }}>
                •
              </span>

              <span>{item}</span>
            </li>
          )
        )}
      </ul>
    </div>
  );
}

function Insight({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: 14,
        border:
          "1px solid rgba(255,255,255,0.07)",
        borderRadius: 11,
        background:
          "rgba(255,255,255,0.025)",
      }}
    >
      <strong
        style={{
          color: "#93c5fd",
        }}
      >
        {title}
      </strong>

      <p
        style={{
          margin: "7px 0 0",
          color: "#d1d5db",
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        {text}
      </p>
    </div>
  );
}

function getRatingColor(
  rating: string
) {
  if (
    rating.includes("Positive")
  ) {
    return "#4ade80";
  }

  if (
    rating.includes("Caution")
  ) {
    return "#ff8a8a";
  }

  return "#fbbf24";
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

  return value.toLocaleString(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }
  );
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

function formatSignedShares(
  value: number | null
) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "N/A";
  }

  return `${value >= 0 ? "+" : "-"}${Math.abs(
    value
  ).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

const sectionStyle = {
  marginTop: 14,
  padding: 22,
};

const headerStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  gap: 12,
  flexWrap: "wrap" as const,
};

const eyebrowStyle = {
  margin: "0 0 6px",
  color: "#60a5fa",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform:
    "uppercase" as const,
};

const heroPanelStyle = {
  padding: 18,
  border:
    "1px solid rgba(96,165,250,0.16)",
  borderRadius: 13,
  background:
    "rgba(37,99,235,0.07)",
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

const aiPanelStyle = {
  marginTop: 14,
  padding: 18,
  border:
    "1px solid rgba(96,165,250,0.18)",
  borderRadius: 13,
  background:
    "rgba(37,99,235,0.06)",
};

const methodologyStyle = {
  marginTop: 14,
  padding: 14,
  border:
    "1px solid rgba(251,191,36,0.16)",
  borderRadius: 11,
  background:
    "rgba(251,191,36,0.04)",
  color: "#fbbf24",
};