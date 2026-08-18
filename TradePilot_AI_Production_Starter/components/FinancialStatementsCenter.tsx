"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type FinancialStatementsCenterProps = {
  symbol: string;
};

type Frequency =
  | "annual"
  | "quarterly";

type FinancialRow = {
  period?: string;
  year?: number;
  quarter?: number;
  revenue?: number;
  grossProfit?: number;
  operatingIncome?: number;
  netIncome?: number;
  eps?: number;
  ebitda?: number;
  cash?: number;
  currentAssets?: number;
  totalAssets?: number;
  currentLiabilities?: number;
  totalLiabilities?: number;
  longTermDebt?: number;
  totalDebt?: number;
  totalEquity?: number;
  operatingCashFlow?: number;
  capitalExpenditure?: number;
  freeCashFlow?: number;
  investingCashFlow?: number;
  financingCashFlow?: number;
  dividendsPaid?: number;
  shareRepurchase?: number;
};

type FinancialResponse = {
  symbol: string;
  frequency: Frequency;
  rows: FinancialRow[];
  trends: {
    revenueGrowthPercent: number | null;
    netIncomeGrowthPercent: number | null;
    freeCashFlowGrowthPercent: number | null;
    debtGrowthPercent: number | null;
    latestNetMarginPercent: number | null;
    latestOperatingMarginPercent: number | null;
  };
  aiSummary: {
    headline: string;
    overview: string;
    revenueTrend: string;
    profitabilityTrend: string;
    cashFlowTrend: string;
    balanceSheetTrend: string;
    risks: string[];
    positives: string[];
    disclaimer: string;
  } | null;
  availability: {
    incomeStatement: boolean;
    balanceSheet: boolean;
    cashFlow: boolean;
    premiumBlocked: boolean;
    anyAvailable: boolean;
  };
  generatedAt: string;
  error?: string;
};

type StatementTab =
  | "income"
  | "balance"
  | "cashflow";

export default function FinancialStatementsCenter({
  symbol,
}: FinancialStatementsCenterProps) {
  const [frequency, setFrequency] =
    useState<Frequency>("annual");

  const [tab, setTab] =
    useState<StatementTab>("income");

  const [data, setData] =
    useState<FinancialResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadFinancials();
  }, [symbol, frequency]);

  async function loadFinancials() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/stock-financials?symbol=${encodeURIComponent(
          symbol
        )}&frequency=${frequency}&refresh=${Date.now()}`,
        {
          cache: "no-store",
        }
      );

      const result =
        (await response.json()) as FinancialResponse;

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to load financial statements."
        );
      }

      setData(result);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load financial statements."
      );
    } finally {
      setLoading(false);
    }
  }

  const latest = data?.rows[0];

  const visibleMetrics = useMemo(() => {
    if (tab === "income") {
      return [
        ["Revenue", "revenue"],
        ["Gross profit", "grossProfit"],
        ["Operating income", "operatingIncome"],
        ["Net income", "netIncome"],
        ["EPS", "eps"],
        ["EBITDA", "ebitda"],
      ] as const;
    }

    if (tab === "balance") {
      return [
        ["Cash", "cash"],
        ["Current assets", "currentAssets"],
        ["Total assets", "totalAssets"],
        [
          "Current liabilities",
          "currentLiabilities",
        ],
        [
          "Total liabilities",
          "totalLiabilities",
        ],
        ["Long-term debt", "longTermDebt"],
        ["Total debt", "totalDebt"],
        ["Shareholder equity", "totalEquity"],
      ] as const;
    }

    return [
      [
        "Operating cash flow",
        "operatingCashFlow",
      ],
      [
        "Capital expenditures",
        "capitalExpenditure",
      ],
      ["Free cash flow", "freeCashFlow"],
      [
        "Investing cash flow",
        "investingCashFlow",
      ],
      [
        "Financing cash flow",
        "financingCashFlow",
      ],
      ["Dividends paid", "dividendsPaid"],
      [
        "Share repurchases",
        "shareRepurchase",
      ],
    ] as const;
  }, [tab]);

  if (loading) {
    return (
      <section
        className="card"
        style={sectionStyle}
      >
        <h2>
          Loading Financial Statements...
        </h2>

        <p className="muted">
          Gathering {frequency} income,
          balance-sheet, and cash-flow data.
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
        <h2 style={{ color: "#ff8a8a" }}>
          Financial Statements unavailable
        </h2>

        <p className="muted">
          {error ||
            "No financial-statement data is available."}
        </p>
      </section>
    );
  }

  return (
    <section
      className="card"
      style={{
        ...sectionStyle,
        border:
          "1px solid rgba(16,185,129,0.22)",
      }}
    >
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>
            Financial intelligence
          </p>

          <h2 style={{ margin: 0 }}>
            Financial Statements Center
          </h2>

          <p
            className="muted"
            style={{
              margin: "7px 0 0",
              fontSize: 12,
            }}
          >
            Income statement, balance sheet,
            cash flow, and trend analysis for{" "}
            {data.symbol}
          </p>
        </div>

        <button
          type="button"
          onClick={loadFinancials}
          style={secondaryButtonStyle}
        >
          Refresh
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginTop: 16,
        }}
      >
        <ToggleButton
          label="Annual"
          active={frequency === "annual"}
          onClick={() =>
            setFrequency("annual")
          }
        />

        <ToggleButton
          label="Quarterly"
          active={
            frequency === "quarterly"
          }
          onClick={() =>
            setFrequency("quarterly")
          }
        />
      </div>

      {!data.availability.anyAvailable ? (
        <UnavailablePanel
          premium={
            data.availability.premiumBlocked
          }
        />
      ) : (
        <>
          <div
            className="financial-trend-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",
              gap: 10,
              marginTop: 16,
            }}
          >
            <TrendCard
              label="Revenue growth"
              value={
                data.trends
                  .revenueGrowthPercent
              }
            />

            <TrendCard
              label="Net income growth"
              value={
                data.trends
                  .netIncomeGrowthPercent
              }
            />

            <TrendCard
              label="Free cash flow growth"
              value={
                data.trends
                  .freeCashFlowGrowthPercent
              }
            />

            <TrendCard
              label="Debt growth"
              value={
                data.trends
                  .debtGrowthPercent
              }
              inverse
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 16,
            }}
          >
            <ToggleButton
              label="Income Statement"
              active={tab === "income"}
              onClick={() =>
                setTab("income")
              }
            />

            <ToggleButton
              label="Balance Sheet"
              active={tab === "balance"}
              onClick={() =>
                setTab("balance")
              }
            />

            <ToggleButton
              label="Cash Flow"
              active={tab === "cashflow"}
              onClick={() =>
                setTab("cashflow")
              }
            />
          </div>

          <div
            style={{
              overflowX: "auto",
              marginTop: 14,
            }}
          >
            <div style={{ minWidth: 780 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    `1.4fr repeat(${data.rows.length}, minmax(110px, 1fr))`,
                  gap: 8,
                  padding: "0 10px 10px",
                  color: "#9ca3af",
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform:
                    "uppercase",
                }}
              >
                <span>Metric</span>

                {data.rows.map(
                  (row, index) => (
                    <span
                      key={`${row.period}-${index}`}
                    >
                      {formatPeriod(row)}
                    </span>
                  )
                )}
              </div>

              {visibleMetrics.map(
                ([label, key]) => (
                  <div
                    key={key}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        `1.4fr repeat(${data.rows.length}, minmax(110px, 1fr))`,
                      gap: 8,
                      padding: 10,
                      borderTop:
                        "1px solid rgba(255,255,255,0.07)",
                      alignItems: "center",
                    }}
                  >
                    <strong>{label}</strong>

                    {data.rows.map(
                      (row, index) => (
                        <span
                          key={`${key}-${index}`}
                        >
                          {key === "eps"
                            ? formatNumber(
                                row[key]
                              )
                            : formatMoney(
                                row[key]
                              )}
                        </span>
                      )
                    )}
                  </div>
                )
              )}
            </div>
          </div>

          {latest && (
            <div
              className="latest-metric-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, minmax(0, 1fr))",
                gap: 10,
                marginTop: 14,
              }}
            >
              <MetricCard
                label="Latest net margin"
                value={formatPercent(
                  data.trends
                    .latestNetMarginPercent
                )}
              />

              <MetricCard
                label="Latest operating margin"
                value={formatPercent(
                  data.trends
                    .latestOperatingMarginPercent
                )}
              />

              <MetricCard
                label="Latest free cash flow"
                value={formatMoney(
                  latest.freeCashFlow
                )}
              />
            </div>
          )}

          {data.aiSummary && (
            <div style={aiPanelStyle}>
              <p style={eyebrowStyle}>
                Norvexa
              </p>

              <h3 style={{ margin: 0 }}>
                {data.aiSummary.headline}
              </h3>

              <p
                style={{
                  margin: "9px 0 0",
                  color: "#d1d5db",
                  lineHeight: 1.65,
                }}
              >
                {data.aiSummary.overview}
              </p>

              <Insight
                title="Revenue"
                text={
                  data.aiSummary.revenueTrend
                }
              />

              <Insight
                title="Profitability"
                text={
                  data.aiSummary
                    .profitabilityTrend
                }
              />

              <Insight
                title="Cash generation"
                text={
                  data.aiSummary.cashFlowTrend
                }
              />

              <Insight
                title="Balance sheet"
                text={
                  data.aiSummary
                    .balanceSheetTrend
                }
              />

              <div
                className="financial-ai-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: 12,
                  marginTop: 12,
                }}
              >
                <BulletPanel
                  title="Positive signals"
                  items={
                    data.aiSummary.positives
                  }
                  color="#4ade80"
                />

                <BulletPanel
                  title="Risks"
                  items={
                    data.aiSummary.risks
                  }
                  color="#ff8a8a"
                />
              </div>

              <p
                className="muted"
                style={{
                  margin: "12px 0 0",
                  fontSize: 10,
                  lineHeight: 1.5,
                }}
              >
                {data.aiSummary.disclaimer}
              </p>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        @media (max-width: 850px) {
          .financial-trend-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              ) !important;
          }

          .latest-metric-grid {
            grid-template-columns:
              1fr !important;
          }
        }

        @media (max-width: 560px) {
          .financial-trend-grid,
          .financial-ai-grid {
            grid-template-columns:
              1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

function ToggleButton({
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
          ? "1px solid rgba(52,211,153,0.5)"
          : "1px solid rgba(255,255,255,0.09)",
        borderRadius: 9,
        background: active
          ? "rgba(16,185,129,0.11)"
          : "rgba(255,255,255,0.025)",
        color: active
          ? "#6ee7b7"
          : "#d1d5db",
        fontWeight: 750,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function TrendCard({
  label,
  value,
  inverse = false,
}: {
  label: string;
  value: number | null;
  inverse?: boolean;
}) {
  const positive =
    value !== null &&
    (inverse ? value <= 0 : value >= 0);

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
          marginTop: 7,
          fontSize: 19,
          color:
            value === null
              ? "#9ca3af"
              : positive
                ? "#4ade80"
                : "#ff8a8a",
        }}
      >
        {formatSignedPercent(value)}
      </strong>
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
          marginTop: 7,
          fontSize: 18,
        }}
      >
        {value}
      </strong>
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
        padding: 13,
        border:
          "1px solid rgba(255,255,255,0.07)",
        borderRadius: 10,
        background:
          "rgba(255,255,255,0.025)",
      }}
    >
      <strong
        style={{
          color: "#6ee7b7",
        }}
      >
        {title}
      </strong>

      <p
        style={{
          margin: "6px 0 0",
          color: "#d1d5db",
          lineHeight: 1.55,
          fontSize: 12,
        }}
      >
        {text}
      </p>
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

function UnavailablePanel({
  premium,
}: {
  premium: boolean;
}) {
  return (
    <div
      style={{
        marginTop: 16,
        padding: 18,
        border:
          "1px solid rgba(251,191,36,0.18)",
        borderRadius: 12,
        background:
          "rgba(251,191,36,0.05)",
      }}
    >
      <h3
        style={{
          margin: 0,
          color: "#fbbf24",
        }}
      >
        Financial statements unavailable
      </h3>

      <p
        style={{
          margin: "8px 0 0",
          color: "#d1d5db",
          lineHeight: 1.6,
        }}
      >
        {premium
          ? "Finnhub’s standardized financial statements require premium fundamental-data access. The rest of Norvexa will continue working normally."
          : "No standardized financial statements were returned for this company or selected frequency."}
      </p>
    </div>
  );
}

function formatPeriod(
  row: FinancialRow
) {
  if (row.period) {
    return row.period;
  }

  if (row.year && row.quarter) {
    return `Q${row.quarter} ${row.year}`;
  }

  if (row.year) {
    return String(row.year);
  }

  return "Period";
}

function formatMoney(
  value?: number
) {
  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "N/A";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 2,
    }
  ).format(value);
}

function formatNumber(
  value?: number
) {
  if (
    value === undefined ||
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
  color: "#34d399",
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

const aiPanelStyle = {
  marginTop: 14,
  padding: 18,
  border:
    "1px solid rgba(52,211,153,0.18)",
  borderRadius: 13,
  background:
    "rgba(16,185,129,0.06)",
};