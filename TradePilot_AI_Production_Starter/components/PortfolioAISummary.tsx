"use client";

import { useCallback, useEffect, useState } from "react";

type PortfolioAISummaryData = {
  outlook:
    | "Bullish"
    | "Moderately Bullish"
    | "Neutral"
    | "Moderately Bearish"
    | "Bearish";
  score: number;
  headline: string;
  summary: string;
  strengths: string[];
  risks: string[];
  insight: string;
  disclaimer: string;
};

type PortfolioAISummaryProps = {
  refreshKey?: string | number;
};

const cacheKey = "Norvexa-dashboard-ai-summary";
const cacheDurationMs = 5 * 60 * 1000;

export default function PortfolioAISummary({
  refreshKey,
}: PortfolioAISummaryProps) {
  const [analysis, setAnalysis] =
    useState<PortfolioAISummaryData | null>(null);
  const [generatedAt, setGeneratedAt] =
    useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState("");

  const loadSummary = useCallback(
    async (force = false) => {
      try {
        force
          ? setRefreshing(true)
          : setLoading(true);

        setError("");

        if (!force) {
          const cachedText =
            window.sessionStorage.getItem(cacheKey);

          if (cachedText) {
            const cached = JSON.parse(cachedText);

            if (
              cached.analysis &&
              Date.now() - cached.savedAt <
                cacheDurationMs
            ) {
              setAnalysis(cached.analysis);
              setGeneratedAt(cached.generatedAt);
              setLoading(false);
              return;
            }
          }
        }

        const response = await fetch(
          `/api/portfolio-ai-summary?refresh=${Date.now()}`,
          {
            cache: "no-store",
            headers: {
              "Cache-Control":
                "no-cache, no-store, must-revalidate",
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.analysis) {
          throw new Error(
            data.error ||
              "Unable to generate the portfolio summary."
          );
        }

        setAnalysis(data.analysis);
        setGeneratedAt(data.generatedAt ?? null);

        window.sessionStorage.setItem(
          cacheKey,
          JSON.stringify({
            analysis: data.analysis,
            generatedAt:
              data.generatedAt ??
              new Date().toISOString(),
            savedAt: Date.now(),
          })
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to generate the portfolio summary."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    if (refreshKey !== undefined) {
      window.sessionStorage.removeItem(cacheKey);
    }

    loadSummary(refreshKey !== undefined);
  }, [loadSummary, refreshKey]);

  if (loading && !analysis) {
    return <SummarySkeleton />;
  }

  if (error && !analysis) {
    return (
      <section className="card" style={errorCardStyle}>
        <h3 style={{ margin: 0, color: "#ff8a8a" }}>
          AI portfolio summary unavailable
        </h3>

        <p className="muted" style={{ lineHeight: 1.55 }}>
          {error}
        </p>

        <button
          type="button"
          onClick={() => loadSummary(true)}
          style={secondaryButtonStyle}
        >
          Try again
        </button>
      </section>
    );
  }

  if (!analysis) return null;

  const color = analysis.outlook.includes("Bullish")
    ? "#4ade80"
    : analysis.outlook.includes("Bearish")
      ? "#ff8a8a"
      : "#fbbf24";

  const score = Math.max(
    0,
    Math.min(100, Number(analysis.score) || 0)
  );

  return (
    <section
      className="card"
      style={{
        marginTop: 14,
        padding: 24,
        border:
          "1px solid rgba(96,165,250,0.24)",
        background:
          "linear-gradient(135deg, rgba(37,99,235,0.12), rgba(255,255,255,0.035))",
      }}
    >
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>
            Norvexa intelligence
          </p>
          <h2 style={{ margin: 0 }}>
            AI Portfolio Summary
          </h2>
          <p className="muted" style={{ fontSize: 12 }}>
            {generatedAt
              ? `Generated ${new Date(
                  generatedAt
                ).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : "Generated from your current paper portfolio"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadSummary(true)}
          disabled={refreshing}
          style={secondaryButtonStyle}
        >
          {refreshing
            ? "Refreshing..."
            : "Refresh summary"}
        </button>
      </div>

      {error && (
        <div style={warningStyle}>
          The previous summary is still shown.
          Refresh failed: {error}
        </div>
      )}

      <div className="summary-top" style={topGridStyle}>
        <div style={panelStyle}>
          <p className="muted" style={{ margin: 0 }}>
            Overall outlook
          </p>

          <p
            style={{
              margin: "9px 0 0",
              color,
              fontSize: 21,
              fontWeight: 850,
            }}
          >
            {analysis.outlook}
          </p>

          <div style={{ marginTop: 16 }}>
            <strong style={{ fontSize: 34 }}>
              {score.toFixed(0)}
            </strong>
            <span className="muted"> /100</span>
          </div>

          <div style={trackStyle}>
            <div
              style={{
                width: `${score}%`,
                height: "100%",
                borderRadius: 999,
                background: color,
              }}
            />
          </div>
        </div>

        <div style={panelStyle}>
          <h3 style={{ margin: 0 }}>
            {analysis.headline}
          </h3>

          <p
            style={{
              margin: "11px 0 0",
              color: "#d1d5db",
              lineHeight: 1.7,
            }}
          >
            {analysis.summary}
          </p>
        </div>
      </div>

      <div className="summary-lists" style={listGridStyle}>
        <SummaryList
          title="Strengths"
          items={analysis.strengths}
          accent="#4ade80"
          icon="✓"
        />

        <SummaryList
          title="Risks to review"
          items={analysis.risks}
          accent="#ff8a8a"
          icon="⚠"
        />
      </div>

      <div style={insightStyle}>
        <p style={eyebrowStyle}>
          Norvexa insight
        </p>

        <p
          style={{
            margin: "10px 0 0",
            color: "#dbeafe",
            lineHeight: 1.7,
          }}
        >
          {analysis.insight}
        </p>
      </div>

      <p
        className="muted"
        style={{
          margin: "15px 0 0",
          fontSize: 11,
          lineHeight: 1.55,
        }}
      >
        {analysis.disclaimer}
      </p>

      <style jsx>{`
        @media (max-width: 760px) {
          .summary-top,
          .summary-lists {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

function SummaryList({
  title,
  items,
  accent,
  icon,
}: {
  title: string;
  items: string[];
  accent: string;
  icon: string;
}) {
  return (
    <div style={panelStyle}>
      <h3 style={{ margin: 0 }}>{title}</h3>

      <ul
        style={{
          margin: "13px 0 0",
          padding: 0,
          listStyle: "none",
        }}
      >
        {(items || []).map((item, index) => (
          <li
            key={`${title}-${index}`}
            style={{
              display: "flex",
              gap: 9,
              marginTop: index ? 9 : 0,
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
              {icon}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <section
      className="card"
      style={{
        marginTop: 14,
        minHeight: 320,
        padding: 24,
      }}
    >
      <div style={skeletonLineStyle} />
      <div
        style={{
          ...skeletonLineStyle,
          width: 280,
          height: 28,
          marginTop: 14,
        }}
      />
      <div
        style={{
          ...topGridStyle,
          marginTop: 24,
        }}
      >
        <div style={skeletonPanelStyle} />
        <div style={skeletonPanelStyle} />
      </div>
    </section>
  );
}

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 18,
  flexWrap: "wrap" as const,
};

const eyebrowStyle = {
  margin: "0 0 6px",
  color: "#60a5fa",
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
};

const panelStyle = {
  padding: 20,
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 15,
  background: "rgba(255,255,255,0.04)",
};

const topGridStyle = {
  display: "grid",
  gridTemplateColumns: "210px minmax(0, 1fr)",
  gap: 18,
  marginTop: 22,
};

const listGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
  marginTop: 14,
};

const trackStyle = {
  height: 9,
  marginTop: 13,
  overflow: "hidden",
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
};

const insightStyle = {
  marginTop: 14,
  padding: 20,
  border: "1px solid rgba(96,165,250,0.18)",
  borderRadius: 15,
  background: "rgba(37,99,235,0.06)",
};

const secondaryButtonStyle = {
  padding: "9px 13px",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 9,
  background: "rgba(255,255,255,0.04)",
  color: "#d1d5db",
  fontWeight: 750,
  cursor: "pointer",
};

const warningStyle = {
  marginTop: 16,
  padding: 11,
  borderRadius: 9,
  background: "rgba(255,107,107,0.08)",
  color: "#ff8a8a",
  fontSize: 12,
};

const errorCardStyle = {
  marginTop: 14,
  padding: 22,
  border: "1px solid rgba(255,107,107,0.25)",
  background: "rgba(255,107,107,0.06)",
};

const skeletonLineStyle = {
  width: 180,
  height: 12,
  borderRadius: 999,
  background: "rgba(255,255,255,0.07)",
};

const skeletonPanelStyle = {
  height: 180,
  borderRadius: 15,
  background: "rgba(255,255,255,0.045)",
};