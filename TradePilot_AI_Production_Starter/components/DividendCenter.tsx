"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type DividendCenterProps = {
  symbol: string;
};

type DividendPayment = {
  symbol: string;
  exDate: string;
  amount: number;
  adjustedAmount: number | null;
  payDate: string;
  recordDate: string;
  declarationDate: string;
  currency: string;
  frequency: string;
};

type DividendResponse = {
  symbol: string;
  companyName: string;
  currentPrice: number;
  currency: string;
  dividendYield: number | null;
  calculatedYield: number | null;
  annualDividendPerShare:
    | number
    | null;
  latestDividend:
    | DividendPayment
    | null;
  dividends: DividendPayment[];
  annualTotals: Array<{
    year: number;
    total: number;
  }>;
  dividendGrowthPercent:
    | number
    | null;
  paymentsLast12Months: number;
  availability: {
    history: boolean;
    providerStatus:
      | number
      | null;
    premiumBlocked: boolean;
    rateLimited: boolean;
    temporaryFailure: boolean;
  };
  generatedAt: string;
  error?: string;
};

type HistoryFilter =
  | "all"
  | "1y"
  | "3y"
  | "5y";

export default function DividendCenter({
  symbol,
}: DividendCenterProps) {
  const [data, setData] =
    useState<DividendResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [historyFilter, setHistoryFilter] =
    useState<HistoryFilter>("3y");

  useEffect(() => {
    loadDividends();
  }, [symbol]);

  async function loadDividends(
    manual = false
  ) {
    try {
      manual
        ? setRefreshing(true)
        : setLoading(true);

      setError("");

      const response = await fetch(
        `/api/stock-dividends?symbol=${encodeURIComponent(
          symbol
        )}&refresh=${Date.now()}`,
        {
          cache: "no-store",
        }
      );

      const result =
        (await response.json()) as DividendResponse;

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to load dividend data."
        );
      }

      setData(result);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load dividend data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const visibleDividends = useMemo(() => {
    if (!data) {
      return [];
    }

    if (historyFilter === "all") {
      return data.dividends;
    }

    const years =
      historyFilter === "1y"
        ? 1
        : historyFilter === "3y"
          ? 3
          : 5;

    const cutoff = new Date();
    cutoff.setFullYear(
      cutoff.getFullYear() - years
    );

    return data.dividends.filter(
      (dividend) => {
        const date = new Date(
          `${dividend.exDate}T12:00:00`
        );

        return (
          !Number.isNaN(
            date.getTime()
          ) && date >= cutoff
        );
      }
    );
  }, [data, historyFilter]);

  if (loading) {
    return (
      <section
        className="card"
        style={sectionStyle}
      >
        <h2>
          Loading Dividend Center...
        </h2>

        <p className="muted">
          Gathering yield and payment
          history for {symbol}.
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
          Dividend Center unavailable
        </h2>

        <p className="muted">
          {error ||
            "No dividend data is available."}
        </p>
      </section>
    );
  }

  const latest =
    data.latestDividend;

  return (
    <section
      className="card"
      style={{
        ...sectionStyle,
        border:
          "1px solid rgba(34,197,94,0.22)",
      }}
    >
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>
            Income intelligence
          </p>

          <h2 style={{ margin: 0 }}>
            Dividend Center
          </h2>

          <p
            className="muted"
            style={{
              margin: "7px 0 0",
              fontSize: 12,
            }}
          >
            Dividend yield, payment
            history, and annual totals for{" "}
            {data.symbol}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            loadDividends(true)
          }
          disabled={refreshing}
          style={{
            ...secondaryButtonStyle,
            opacity: refreshing
              ? 0.65
              : 1,
            cursor: refreshing
              ? "not-allowed"
              : "pointer",
          }}
        >
          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>

      <div
        className="dividend-summary-grid"
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(5, minmax(0, 1fr))",
          gap: 10,
          marginTop: 18,
        }}
      >
        <SummaryCard
          label="Dividend yield"
          value={formatPercent(
            data.dividendYield
          )}
          color="#4ade80"
        />

        <SummaryCard
          label="Annual dividend"
          value={formatCurrency(
            data.annualDividendPerShare,
            data.currency
          )}
          color="#86efac"
        />

        <SummaryCard
          label="Latest payment"
          value={formatCurrency(
            latest?.adjustedAmount ??
              latest?.amount ??
              null,
            latest?.currency ||
              data.currency
          )}
          color="#bbf7d0"
        />

        <SummaryCard
          label="Payments in 12 months"
          value={String(
            data.paymentsLast12Months
          )}
          color="#6ee7b7"
        />

        <SummaryCard
          label="Annual growth"
          value={formatSignedPercent(
            data.dividendGrowthPercent
          )}
          color={
            (
              data.dividendGrowthPercent ??
              0
            ) >= 0
              ? "#4ade80"
              : "#ff8a8a"
          }
        />
      </div>

      {data.availability.history ? (
        <>
          {latest && (
            <div
              className="latest-dividend-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, minmax(0, 1fr))",
                gap: 10,
                marginTop: 14,
              }}
            >
              <DetailCard
                label="Ex-dividend date"
                value={formatDate(
                  latest.exDate
                )}
              />

              <DetailCard
                label="Payment date"
                value={formatDate(
                  latest.payDate
                )}
              />

              <DetailCard
                label="Record date"
                value={formatDate(
                  latest.recordDate
                )}
              />

              <DetailCard
                label="Frequency"
                value={
                  latest.frequency
                }
              />
            </div>
          )}

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
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                  }}
                >
                  Annual Dividend History
                </h3>

                <p
                  className="muted"
                  style={{
                    margin:
                      "5px 0 0",
                    fontSize: 10,
                  }}
                >
                  Total adjusted dividends
                  per share by year
                </p>
              </div>
            </div>

            <AnnualBars
              totals={
                data.annualTotals
              }
              currency={
                data.currency
              }
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
            {(
              [
                "1y",
                "3y",
                "5y",
                "all",
              ] as HistoryFilter[]
            ).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() =>
                  setHistoryFilter(
                    option
                  )
                }
                style={{
                  ...filterButtonStyle,
                  border:
                    historyFilter ===
                    option
                      ? "1px solid rgba(74,222,128,0.5)"
                      : filterButtonStyle.border,
                  background:
                    historyFilter ===
                    option
                      ? "rgba(34,197,94,0.1)"
                      : filterButtonStyle.background,
                  color:
                    historyFilter ===
                    option
                      ? "#4ade80"
                      : "#d1d5db",
                }}
              >
                {option === "all"
                  ? "All"
                  : option.toUpperCase()}
              </button>
            ))}
          </div>

          <div
            style={{
              overflowX: "auto",
              marginTop: 14,
            }}
          >
            <div
              style={{
                minWidth: 760,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr 1fr 1fr 0.8fr",
                  gap: 10,
                  padding:
                    "0 10px 10px",
                  color: "#9ca3af",
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform:
                    "uppercase",
                }}
              >
                <span>Ex-date</span>
                <span>Amount</span>
                <span>Pay date</span>
                <span>Record date</span>
                <span>Frequency</span>
              </div>

              {visibleDividends.map(
                (dividend, index) => (
                  <DividendRow
                    key={`${dividend.exDate}-${index}`}
                    dividend={
                      dividend
                    }
                  />
                )
              )}
            </div>
          </div>
        </>
      ) : (
        <UnavailablePanel
          data={data}
        />
      )}

      <div style={educationPanelStyle}>
        <strong
          style={{
            color: "#4ade80",
          }}
        >
          Dividend reminder
        </strong>

        <p
          className="muted"
          style={{
            margin: "7px 0 0",
            fontSize: 11,
            lineHeight: 1.6,
          }}
        >
          Dividends can be reduced or
          suspended. A high yield can
          reflect a falling share price,
          so yield should be reviewed
          alongside cash flow, payout
          sustainability, debt, and
          earnings.
        </p>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .dividend-summary-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              ) !important;
          }

          .latest-dividend-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              ) !important;
          }
        }

        @media (max-width: 520px) {
          .dividend-summary-grid,
          .latest-dividend-grid {
            grid-template-columns:
              1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

function AnnualBars({
  totals,
  currency,
}: {
  totals: Array<{
    year: number;
    total: number;
  }>;
  currency: string;
}) {
  const maximum = Math.max(
    ...totals.map(
      (item) => item.total
    ),
    0
  );

  if (totals.length === 0) {
    return (
      <p
        className="muted"
        style={{
          margin: "14px 0 0",
        }}
      >
        Annual totals are unavailable.
      </p>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        marginTop: 15,
      }}
    >
      {totals.map((item) => (
        <div
          key={item.year}
          style={{
            display: "grid",
            gridTemplateColumns:
              "55px 1fr 80px",
            gap: 9,
            alignItems: "center",
          }}
        >
          <strong>
            {item.year}
          </strong>

          <div
            style={{
              height: 9,
              overflow: "hidden",
              borderRadius: 999,
              background:
                "rgba(255,255,255,0.07)",
            }}
          >
            <div
              style={{
                width:
                  maximum > 0
                    ? `${(item.total /
                        maximum) *
                      100}%`
                    : "0%",
                height: "100%",
                borderRadius: 999,
                background:
                  "#22c55e",
              }}
            />
          </div>

          <span
            style={{
              textAlign: "right",
              color: "#bbf7d0",
              fontWeight: 750,
            }}
          >
            {formatCurrency(
              item.total,
              currency
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

function DividendRow({
  dividend,
}: {
  dividend: DividendPayment;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "1fr 1fr 1fr 1fr 0.8fr",
        gap: 10,
        padding: 10,
        borderTop:
          "1px solid rgba(255,255,255,0.07)",
        alignItems: "center",
      }}
    >
      <span>
        {formatDate(
          dividend.exDate
        )}
      </span>

      <strong
        style={{
          color: "#4ade80",
        }}
      >
        {formatCurrency(
          dividend.adjustedAmount ??
            dividend.amount,
          dividend.currency
        )}
      </strong>

      <span className="muted">
        {formatDate(
          dividend.payDate
        )}
      </span>

      <span className="muted">
        {formatDate(
          dividend.recordDate
        )}
      </span>

      <span>
        {dividend.frequency}
      </span>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
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
          marginTop: 7,
          fontSize: 20,
          color,
        }}
      >
        {value}
      </strong>
    </div>
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
          marginTop: 7,
          fontSize: 15,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function UnavailablePanel({
  data,
}: {
  data: DividendResponse;
}) {
  let message =
    "No dividend history was returned for this company.";

  if (
    data.availability
      .premiumBlocked
  ) {
    message =
      "Finnhub’s detailed dividend-history endpoint requires premium access. The available dividend yield above is still shown from the fundamentals data.";
  } else if (
    data.availability.rateLimited
  ) {
    message =
      "Finnhub’s request limit was reached. Wait briefly and refresh this section.";
  } else if (
    data.availability
      .temporaryFailure
  ) {
    message =
      "Dividend history is temporarily unavailable from Finnhub. The rest of Norvexa will continue working normally.";
  }

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
        Dividend history unavailable
      </h3>

      <p
        className="muted"
        style={{
          margin: "8px 0 0",
          lineHeight: 1.6,
        }}
      >
        {message}
      </p>
    </div>
  );
}

function formatCurrency(
  value: number | null,
  currency = "USD"
) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "N/A";
  }

  try {
    return value.toLocaleString(
      "en-US",
      {
        style: "currency",
        currency:
          currency || "USD",
        maximumFractionDigits: 4,
      }
    );
  } catch {
    return `$${value.toFixed(4)}`;
  }
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

function formatDate(
  value?: string
) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(
    `${value.slice(
      0,
      10
    )}T12:00:00`
  );

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
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
  color: "#4ade80",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform:
    "uppercase" as const,
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
};

const filterButtonStyle = {
  padding: "8px 11px",
  border:
    "1px solid rgba(255,255,255,0.09)",
  borderRadius: 9,
  background:
    "rgba(255,255,255,0.025)",
  color: "#d1d5db",
  fontWeight: 750,
  cursor: "pointer",
};

const educationPanelStyle = {
  marginTop: 16,
  padding: 15,
  border:
    "1px solid rgba(34,197,94,0.16)",
  borderRadius: 11,
  background:
    "rgba(34,197,94,0.04)",
};