"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type Holding = {
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
};

type SectorExposure = {
  sector: string;
  marketValue: number;
  percentage: number;
  symbols: string[];
};

type AnalyticsResponse = {
  summary: {
    cashBalance: number;
    portfolioValue: number;
    totalAccountValue: number;
    totalInvested: number;
    totalGainLoss: number;
    totalGainLossPercent: number;
    todayGainLoss: number;
    todayGainLossPercent: number;
  };
  analytics: {
    holdingsCount: number;
    winningHoldingsCount: number;
    losingHoldingsCount: number;
    flatHoldingsCount: number;
    winRate: number;
    realizedGainLoss: number;
    unrealizedGainLoss: number;
    combinedGainLoss: number;
    cashPercentage: number;
    stockPercentage: number;
  };
  holdings: Holding[];
  sectorExposure: SectorExposure[];
  scores: {
    healthScore: number;
    diversificationScore: number;
    concentrationScore: number;
    riskScore: number;
  };
  highlights: {
    largestHolding: Holding | null;
    bestHolding: Holding | null;
    worstHolding: Holding | null;
  };
  benchmark: {
    symbol: string;
    price: number;
    changePercent: number;
    portfolioTodayPercent: number;
    differencePercent: number;
  } | null;
  aiAnalysis: {
    headline: string;
    overview: string;
    strengths: string[];
    risks: string[];
    concentrationComment: string;
    diversificationComment: string;
    benchmarkComment: string;
    educationalInsight: string;
    disclaimer: string;
  } | null;
  generatedAt: string;
};

export default function PortfolioAnalyticsDashboard() {
  const router = useRouter();

  const [data, setData] =
    useState<AnalyticsResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadAnalytics = useCallback(
    async (manual = false) => {
      try {
        manual
          ? setRefreshing(true)
          : setLoading(true);

        setError("");

        const response = await fetch(
          `/api/portfolio-analytics?refresh=${Date.now()}`,
          {
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Unable to load portfolio analytics."
          );
        }

        setData(
          result as AnalyticsResponse
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load portfolio analytics."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading && !data) {
    return (
      <section className="card" style={sectionStyle}>
        <h2>Loading analytics...</h2>
        <p className="muted">
          Calculating portfolio scores and exposure.
        </p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="card" style={sectionStyle}>
        <h2>Analytics unavailable</h2>

        <p className="muted">
          {error || "No analytics data is available."}
        </p>
      </section>
    );
  }

  return (
    <div>
      <div style={topActionStyle}>
        <div>
          <p className="muted" style={{ margin: 0 }}>
            Generated{" "}
            {new Date(
              data.generatedAt
            ).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            loadAnalytics(true)
          }
          disabled={refreshing}
          style={secondaryButtonStyle}
        >
          {refreshing
            ? "Refreshing..."
            : "Refresh analytics"}
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
          Portfolio scoring
        </p>

        <h2 style={{ margin: 0 }}>
          Portfolio Health
        </h2>

        <div
          className="score-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap: 12,
            marginTop: 18,
          }}
        >
          <ScoreCard
            label="Health score"
            value={data.scores.healthScore}
            inverse={false}
          />

          <ScoreCard
            label="Diversification"
            value={
              data.scores
                .diversificationScore
            }
            inverse={false}
          />

          <ScoreCard
            label="Concentration balance"
            value={
              data.scores
                .concentrationScore
            }
            inverse={false}
          />

          <ScoreCard
            label="Risk score"
            value={data.scores.riskScore}
            inverse
          />
        </div>
      </section>

      <section
        className="card"
        style={sectionStyle}
      >
        <p style={eyebrowStyle}>
          Key portfolio facts
        </p>

        <h2 style={{ margin: 0 }}>
          Performance and Allocation
        </h2>

        <div
          className="metric-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap: 12,
            marginTop: 18,
          }}
        >
          <MetricCard
            label="Win rate"
            value={`${data.analytics.winRate.toFixed(
              1
            )}%`}
          />

          <MetricCard
            label="Cash allocation"
            value={`${data.analytics.cashPercentage.toFixed(
              1
            )}%`}
          />

          <MetricCard
            label="Unrealized P/L"
            value={formatCurrency(
              data.analytics
                .unrealizedGainLoss
            )}
            positive={
              data.analytics
                .unrealizedGainLoss >= 0
            }
          />

          <MetricCard
            label="Realized P/L"
            value={formatCurrency(
              data.analytics.realizedGainLoss
            )}
            positive={
              data.analytics
                .realizedGainLoss >= 0
            }
          />
        </div>

        <div
          className="highlight-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",
            gap: 12,
            marginTop: 12,
          }}
        >
          <HoldingHighlight
            title="Largest position"
            holding={
              data.highlights
                .largestHolding
            }
            onOpen={() =>
              data.highlights
                .largestHolding &&
              router.push(
                `/stock/${data.highlights.largestHolding.symbol}`
              )
            }
          />

          <HoldingHighlight
            title="Best performer"
            holding={
              data.highlights.bestHolding
            }
            onOpen={() =>
              data.highlights
                .bestHolding &&
              router.push(
                `/stock/${data.highlights.bestHolding.symbol}`
              )
            }
          />

          <HoldingHighlight
            title="Worst performer"
            holding={
              data.highlights.worstHolding
            }
            onOpen={() =>
              data.highlights
                .worstHolding &&
              router.push(
                `/stock/${data.highlights.worstHolding.symbol}`
              )
            }
          />
        </div>
      </section>

      <section
        className="card"
        style={sectionStyle}
      >
        <p style={eyebrowStyle}>
          Exposure analysis
        </p>

        <h2 style={{ margin: 0 }}>
          Sector Exposure
        </h2>

        {data.sectorExposure.length === 0 ? (
          <p className="muted">
            No sector exposure is available.
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginTop: 18,
            }}
          >
            {data.sectorExposure.map(
              (sector) => (
                <SectorExposureRow
                  key={sector.sector}
                  sector={sector}
                />
              )
            )}
          </div>
        )}
      </section>

      <section
        className="card"
        style={sectionStyle}
      >
        <p style={eyebrowStyle}>
          Benchmark
        </p>

        <h2 style={{ margin: 0 }}>
          Portfolio vs SPY Today
        </h2>

        {data.benchmark ? (
          <div
            className="benchmark-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, minmax(0, 1fr))",
              gap: 12,
              marginTop: 18,
            }}
          >
            <MetricCard
              label="Portfolio today"
              value={formatPercent(
                data.benchmark
                  .portfolioTodayPercent
              )}
              positive={
                data.benchmark
                  .portfolioTodayPercent >= 0
              }
            />

            <MetricCard
              label="SPY today"
              value={formatPercent(
                data.benchmark.changePercent
              )}
              positive={
                data.benchmark
                  .changePercent >= 0
              }
            />

            <MetricCard
              label="Difference"
              value={formatPercent(
                data.benchmark
                  .differencePercent
              )}
              positive={
                data.benchmark
                  .differencePercent >= 0
              }
            />
          </div>
        ) : (
          <p className="muted">
            SPY benchmark data is temporarily unavailable.
          </p>
        )}
      </section>

      {data.aiAnalysis && (
        <section
          className="card"
          style={{
            ...sectionStyle,
            border:
              "1px solid rgba(96,165,250,0.22)",
            background:
              "linear-gradient(135deg, rgba(37,99,235,0.1), rgba(255,255,255,0.03))",
          }}
        >
          <p style={eyebrowStyle}>
            Norvexa intelligence
          </p>

          <h2 style={{ margin: 0 }}>
            {data.aiAnalysis.headline}
          </h2>

          <p
            style={{
              margin: "10px 0 0",
              color: "#d1d5db",
              lineHeight: 1.7,
            }}
          >
            {data.aiAnalysis.overview}
          </p>

          <div
            className="ai-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 14,
              marginTop: 18,
            }}
          >
            <BulletPanel
              title="Strengths"
              items={
                data.aiAnalysis.strengths
              }
              accent="#4ade80"
            />

            <BulletPanel
              title="Risks"
              items={
                data.aiAnalysis.risks
              }
              accent="#ff8a8a"
            />
          </div>

          <InsightBlock
            title="Concentration"
            text={
              data.aiAnalysis
                .concentrationComment
            }
          />

          <InsightBlock
            title="Diversification"
            text={
              data.aiAnalysis
                .diversificationComment
            }
          />

          <InsightBlock
            title="Benchmark"
            text={
              data.aiAnalysis
                .benchmarkComment
            }
          />

          <InsightBlock
            title="Educational insight"
            text={
              data.aiAnalysis
                .educationalInsight
            }
          />

          <p
            className="muted"
            style={{
              margin: "14px 0 0",
              fontSize: 11,
              lineHeight: 1.55,
            }}
          >
            {data.aiAnalysis.disclaimer}
          </p>
        </section>
      )}

      <style jsx>{`
        @media (max-width: 900px) {
          .score-grid,
          .metric-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              ) !important;
          }

          .highlight-grid,
          .benchmark-grid {
            grid-template-columns:
              1fr !important;
          }
        }

        @media (max-width: 620px) {
          .score-grid,
          .metric-grid,
          .ai-grid {
            grid-template-columns:
              1fr !important;
          }
        }
      `}</style>
    </div>
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
  const safeValue = Math.max(
    0,
    Math.min(100, value)
  );

  const displayColor = inverse
    ? safeValue <= 35
      ? "#4ade80"
      : safeValue <= 65
        ? "#fbbf24"
        : "#ff8a8a"
    : safeValue >= 70
      ? "#4ade80"
      : safeValue >= 40
        ? "#fbbf24"
        : "#ff8a8a";

  return (
    <div style={panelStyle}>
      <span className="muted">
        {label}
      </span>

      <strong
        style={{
          display: "block",
          marginTop: 8,
          fontSize: 30,
          color: displayColor,
        }}
      >
        {safeValue}/100
      </strong>

      <div style={scoreTrackStyle}>
        <div
          style={{
            width: `${safeValue}%`,
            height: "100%",
            borderRadius: 999,
            background: displayColor,
          }}
        />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div style={panelStyle}>
      <span className="muted">
        {label}
      </span>

      <strong
        style={{
          display: "block",
          marginTop: 8,
          fontSize: 21,
          color:
            positive === undefined
              ? "#f3f4f6"
              : positive
                ? "#4ade80"
                : "#ff8a8a",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function HoldingHighlight({
  title,
  holding,
  onOpen,
}: {
  title: string;
  holding: Holding | null;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!holding}
      style={{
        ...panelStyle,
        color: "inherit",
        textAlign: "left",
        cursor: holding
          ? "pointer"
          : "default",
      }}
    >
      <span className="muted">
        {title}
      </span>

      <strong
        style={{
          display: "block",
          marginTop: 8,
          fontSize: 19,
        }}
      >
        {holding?.symbol ?? "N/A"}
      </strong>

      {holding && (
        <span
          style={{
            display: "block",
            marginTop: 5,
            color:
              holding.gainLossPercent >= 0
                ? "#4ade80"
                : "#ff8a8a",
            fontWeight: 750,
          }}
        >
          {formatPercent(
            holding.gainLossPercent
          )}
        </span>
      )}
    </button>
  );
}

function SectorExposureRow({
  sector,
}: {
  sector: SectorExposure;
}) {
  return (
    <div style={panelStyle}>
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          gap: 12,
        }}
      >
        <div>
          <strong>{sector.sector}</strong>

          <p
            className="muted"
            style={{
              margin: "4px 0 0",
              fontSize: 11,
            }}
          >
            {sector.symbols.join(", ")}
          </p>
        </div>

        <strong>
          {sector.percentage.toFixed(1)}%
        </strong>
      </div>

      <div style={scoreTrackStyle}>
        <div
          style={{
            width: `${Math.min(
              100,
              sector.percentage
            )}%`,
            height: "100%",
            borderRadius: 999,
            background: "#60a5fa",
          }}
        />
      </div>
    </div>
  );
}

function BulletPanel({
  title,
  items,
  accent,
}: {
  title: string;
  items: string[];
  accent: string;
}) {
  return (
    <div style={panelStyle}>
      <h3 style={{ margin: 0 }}>
        {title}
      </h3>

      <ul
        style={{
          margin: "12px 0 0",
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
                  index === 0 ? 0 : 8,
                color: "#d1d5db",
                lineHeight: 1.55,
              }}
            >
              <span
                style={{
                  color: accent,
                  fontWeight: 900,
                }}
              >
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

function InsightBlock({
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
        padding: 15,
        borderRadius: 11,
        border:
          "1px solid rgba(255,255,255,0.08)",
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
          lineHeight: 1.6,
        }}
      >
        {text}
      </p>
    </div>
  );
}

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

function formatPercent(value: number) {
  const safe = Number(value || 0);

  return `${safe >= 0 ? "+" : ""}${safe.toFixed(
    2
  )}%`;
}

const sectionStyle = {
  marginTop: 14,
  padding: 22,
};

const eyebrowStyle = {
  margin: "0 0 6px",
  color: "#60a5fa",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};

const panelStyle = {
  padding: 16,
  border:
    "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  background:
    "rgba(255,255,255,0.03)",
};

const scoreTrackStyle = {
  height: 8,
  marginTop: 12,
  overflow: "hidden",
  borderRadius: 999,
  background:
    "rgba(255,255,255,0.08)",
};

const topActionStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap" as const,
};

const secondaryButtonStyle = {
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