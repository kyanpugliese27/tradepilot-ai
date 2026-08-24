"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import ResponsiveSidebar from "@/components/ResponsiveSidebar";

type EarningsEvent = {
  symbol: string;
  date: string;
  hour: "bmo" | "amc" | "dmh" | "unknown";
  quarter: number | null;
  year: number | null;
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
  epsSurprise: number | null;
  epsSurprisePercent: number | null;
  revenueSurprise: number | null;
  revenueSurprisePercent: number | null;
  status: "upcoming" | "reported";
};

type HistoricalSurprise = {
  symbol: string;
  period: string;
  quarter: number | null;
  year: number | null;
  actual: number | null;
  estimate: number | null;
  surprise: number | null;
  surprisePercent: number | null;
};

type EarningsResponse = {
  events: EarningsEvent[];
  surprises: HistoricalSurprise[];
  range: {
    from: string;
    to: string;
  };
  symbol: string | null;
  summary: {
    total: number;
    upcoming: number;
    reported: number;
    beforeOpen: number;
    afterClose: number;
  };
  updatedAt: string;
};

type EarningsAnalysis = {
  headline: string;
  overview: string;
  metricsToWatch: string[];
  positiveScenario: string;
  riskScenario: string;
  questionsToAsk: string[];
  disclaimer: string;
};

type ViewMode =
  | "all"
  | "upcoming"
  | "reported";

export default function EarningsPage() {
  const router = useRouter();

  const defaultFrom = formatDate(
    addDays(new Date(), -7)
  );

  const defaultTo = formatDate(
    addDays(new Date(), 21)
  );

  const [from, setFrom] =
    useState(defaultFrom);

  const [to, setTo] =
    useState(defaultTo);

  const [symbol, setSymbol] =
    useState("");

  const [query, setQuery] =
    useState("");

  const [view, setView] =
    useState<ViewMode>("all");

  const [data, setData] =
    useState<EarningsResponse | null>(null);

  const [selected, setSelected] =
    useState<EarningsEvent | null>(null);

  const [analysis, setAnalysis] =
    useState<EarningsAnalysis | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [analyzing, setAnalyzing] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadEarnings(
      defaultFrom,
      defaultTo,
      ""
    );
  }, []);

  async function loadEarnings(
    nextFrom = from,
    nextTo = to,
    nextSymbol = symbol
  ) {
    try {
      setLoading(true);
      setError("");
      setAnalysis(null);
      setSelected(null);

      const params = new URLSearchParams({
        from: nextFrom,
        to: nextTo,
      });

      const normalizedSymbol =
        nextSymbol.trim().toUpperCase();

      if (normalizedSymbol) {
        params.set(
          "symbol",
          normalizedSymbol
        );
      }

      const response = await fetch(
        `/api/earnings?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to load earnings."
        );
      }

      setData(
        result as EarningsResponse
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load earnings."
      );
    } finally {
      setLoading(false);
    }
  }

  function submitFilters(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const normalized =
      symbol.trim().toUpperCase();

    setSymbol(normalized);
    loadEarnings(from, to, normalized);
  }

  async function analyzeEvent(
    event: EarningsEvent
  ) {
    try {
      setSelected(event);
      setAnalyzing(true);
      setAnalysis(null);
      setError("");

      let surprises =
        data?.surprises || [];

      if (
        data?.symbol !== event.symbol
      ) {
        const params =
          new URLSearchParams({
            from: formatDate(
              addDays(
                new Date(event.date),
                -45
              )
            ),
            to: formatDate(
              addDays(
                new Date(event.date),
                45
              )
            ),
            symbol: event.symbol,
          });

        const response = await fetch(
          `/api/earnings?${params.toString()}`,
          {
            cache: "no-store",
          }
        );

        const result =
          await response.json();

        if (response.ok) {
          surprises =
            result.surprises || [];
        }
      }

      const response = await fetch(
        "/api/earnings",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            event,
            surprises,
          }),
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.analysis
      ) {
        throw new Error(
          result.error ||
            "Unable to generate earnings analysis."
        );
      }

      setAnalysis(
        result.analysis as EarningsAnalysis
      );
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "Unable to generate earnings analysis."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  const visibleEvents = useMemo(() => {
    const search =
      query.trim().toLowerCase();

    return (
      data?.events || []
    ).filter((event) => {
      const matchesView =
        view === "all" ||
        event.status === view;

      const matchesSearch =
        !search ||
        event.symbol
          .toLowerCase()
          .includes(search);

      return (
        matchesView &&
        matchesSearch
      );
    });
  }, [data?.events, query, view]);

  const groupedEvents = useMemo(() => {
    const map = new Map<
      string,
      EarningsEvent[]
    >();

    for (const event of visibleEvents) {
      const current =
        map.get(event.date) || [];

      current.push(event);
      map.set(event.date, current);
    }

    return Array.from(map.entries());
  }, [visibleEvents]);

  return (
    <div className="dashboard-layout">
      <ResponsiveSidebar />

      <main className="main">
        <section
          style={{
            maxWidth: 1180,
            margin: "0 auto",
          }}
        >
          <div style={{ marginBottom: 18 }}>
            <p style={eyebrowStyle}>
              Company events
            </p>

            <h1
              style={{
                margin: 0,
                fontSize: 38,
              }}
            >
              Earnings Hub
            </h1>

            <p
              className="muted"
              style={{
                margin: "9px 0 0",
                maxWidth: 780,
                lineHeight: 1.6,
              }}
            >
              Track upcoming reports, review
              actual-versus-estimate surprises,
              inspect historical EPS results,
              and generate an educational AI
              preview or recap.
            </p>
          </div>

          <form
            onSubmit={submitFilters}
            className="card"
            style={{
              padding: 18,
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr 1fr auto",
              gap: 12,
              alignItems: "end",
            }}
          >
            <Field
              label="From"
              value={from}
              type="date"
              onChange={setFrom}
            />

            <Field
              label="To"
              value={to}
              type="date"
              onChange={setTo}
            />

            <Field
              label="Ticker (optional)"
              value={symbol}
              type="text"
              placeholder="AAPL"
              onChange={(value) =>
                setSymbol(
                  value.toUpperCase()
                )
              }
            />

            <button
              type="submit"
              style={primaryButtonStyle}
            >
              Load Earnings
            </button>
          </form>

          {error && (
            <div style={errorStyle}>
              {error}
            </div>
          )}

          {loading ? (
            <section
              className="card"
              style={sectionStyle}
            >
              <h2>Loading earnings...</h2>

              <p className="muted">
                Gathering the calendar and
                available surprise data.
              </p>
            </section>
          ) : data ? (
            <>
              <section
                className="card"
                style={sectionStyle}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(5, minmax(0, 1fr))",
                    gap: 10,
                  }}
                  className="summary-grid"
                >
                  <SummaryCard
                    label="Total events"
                    value={data.summary.total}
                  />

                  <SummaryCard
                    label="Upcoming"
                    value={
                      data.summary.upcoming
                    }
                  />

                  <SummaryCard
                    label="Reported"
                    value={
                      data.summary.reported
                    }
                  />

                  <SummaryCard
                    label="Before open"
                    value={
                      data.summary.beforeOpen
                    }
                  />

                  <SummaryCard
                    label="After close"
                    value={
                      data.summary.afterClose
                    }
                  />
                </div>
              </section>

              <section
                className="card"
                style={sectionStyle}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "end",
                  }}
                >
                  <div>
                    <p style={eyebrowStyle}>
                      Earnings calendar
                    </p>

                    <h2 style={{ margin: 0 }}>
                      Scheduled and Reported
                    </h2>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {(
                      [
                        "all",
                        "upcoming",
                        "reported",
                      ] as ViewMode[]
                    ).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          setView(option)
                        }
                        style={{
                          ...tabButtonStyle,
                          border:
                            view === option
                              ? "1px solid rgba(96,165,250,0.5)"
                              : tabButtonStyle.border,
                          color:
                            view === option
                              ? "#93c5fd"
                              : "#d1d5db",
                        }}
                      >
                        {capitalize(option)}
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  value={query}
                  onChange={(event) =>
                    setQuery(
                      event.target.value
                    )
                  }
                  placeholder="Filter loaded tickers..."
                  style={{
                    ...inputStyle,
                    marginTop: 15,
                  }}
                />

                {groupedEvents.length ===
                0 ? (
                  <div style={emptyStyle}>
                    <h3
                      style={{ margin: 0 }}
                    >
                      No earnings found
                    </h3>

                    <p
                      className="muted"
                      style={{
                        margin:
                          "7px 0 0",
                      }}
                    >
                      Try another date range,
                      ticker, or filter.
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection:
                        "column",
                      gap: 18,
                      marginTop: 18,
                    }}
                  >
                    {groupedEvents.map(
                      ([date, events]) => (
                        <div key={date}>
                          <h3
                            style={{
                              margin:
                                "0 0 10px",
                            }}
                          >
                            {formatDisplayDate(
                              date
                            )}
                          </h3>

                          <div
                            style={{
                              display:
                                "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(270px, 1fr))",
                              gap: 10,
                            }}
                          >
                            {events.map(
                              (event, eventIndex) => (
                                <EarningsCard
                                  key={[
                                    event.symbol,
                                    event.date,
                                    event.hour,
                                    event.quarter ?? "Q",
                                    event.year ?? "Y",
                                    eventIndex,
                                  ].join("-")}
                                  event={
                                    event
                                  }
                                  selected={
                                    selected?.symbol ===
                                      event.symbol &&
                                    selected?.date ===
                                      event.date
                                  }
                                  analyzing={
                                    analyzing &&
                                    selected?.symbol ===
                                      event.symbol &&
                                    selected?.date ===
                                      event.date
                                  }
                                  onAnalyze={() =>
                                    analyzeEvent(
                                      event
                                    )
                                  }
                                  onOpen={() =>
                                    router.push(
                                      `/stock/${event.symbol}`
                                    )
                                  }
                                />
                              )
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </section>

              {analysis && selected && (
                <AnalysisSection
                  analysis={analysis}
                  event={selected}
                />
              )}

              {data.surprises.length >
                0 && (
                <HistoricalSection
                  surprises={
                    data.surprises
                  }
                  symbol={
                    data.symbol || symbol
                  }
                />
              )}
            </>
          ) : null}
        </section>

        <style jsx>{`
          @media (max-width: 880px) {
            form {
              grid-template-columns:
                1fr 1fr !important;
            }

            .summary-grid {
              grid-template-columns:
                repeat(
                  2,
                  minmax(0, 1fr)
                ) !important;
            }
          }

          @media (max-width: 580px) {
            form,
            .summary-grid {
              grid-template-columns:
                1fr !important;
            }
          }
        `}</style>
      </main>
    </div>
  );
}

function EarningsCard({
  event,
  selected,
  analyzing,
  onAnalyze,
  onOpen,
}: {
  event: EarningsEvent;
  selected: boolean;
  analyzing: boolean;
  onAnalyze: () => void;
  onOpen: () => void;
}) {
  const epsPositive =
    event.epsSurprisePercent !==
      null &&
    event.epsSurprisePercent >= 0;

  return (
    <article
      style={{
        padding: 16,
        border: selected
          ? "1px solid rgba(96,165,250,0.5)"
          : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        background: selected
          ? "rgba(37,99,235,0.08)"
          : "rgba(255,255,255,0.025)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          gap: 10,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 19,
            }}
          >
            {event.symbol}
          </h3>

          <p
            className="muted"
            style={{
              margin: "4px 0 0",
              fontSize: 11,
            }}
          >
            {formatSession(event.hour)}
            {event.quarter &&
            event.year
              ? ` · Q${event.quarter} ${event.year}`
              : ""}
          </p>
        </div>

        <StatusBadge
          status={event.status}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: 8,
          marginTop: 14,
        }}
      >
        <SmallMetric
          label="EPS estimate"
          value={formatNumber(
            event.epsEstimate
          )}
        />

        <SmallMetric
          label="EPS actual"
          value={formatNumber(
            event.epsActual
          )}
        />

        <SmallMetric
          label="Revenue estimate"
          value={formatRevenue(
            event.revenueEstimate
          )}
        />

        <SmallMetric
          label="Revenue actual"
          value={formatRevenue(
            event.revenueActual
          )}
        />
      </div>

      {event.status ===
        "reported" &&
        event.epsSurprisePercent !==
          null && (
          <div
            style={{
              marginTop: 12,
              color: epsPositive
                ? "#4ade80"
                : "#ff8a8a",
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            EPS surprise:{" "}
            {formatSignedPercent(
              event.epsSurprisePercent
            )}
          </div>
        )}

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 14,
        }}
      >
        <button
          type="button"
          onClick={onAnalyze}
          disabled={analyzing}
          style={{
            ...primaryButtonStyle,
            flex: 1,
            padding: "9px 10px",
          }}
        >
          {analyzing
            ? "Analyzing..."
            : event.status ===
                "upcoming"
              ? "AI Preview"
              : "AI Recap"}
        </button>

        <button
          type="button"
          onClick={onOpen}
          style={{
            ...secondaryButtonStyle,
            flex: 1,
          }}
        >
          Open Stock
        </button>
      </div>
    </article>
  );
}

function AnalysisSection({
  analysis,
  event,
}: {
  analysis: EarningsAnalysis;
  event: EarningsEvent;
}) {
  return (
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
        {analysis.headline}
      </h2>

      <p
        className="muted"
        style={{
          margin: "6px 0 0",
          fontSize: 12,
        }}
      >
        {event.symbol} ·{" "}
        {formatDisplayDate(
          event.date
        )}
      </p>

      <p
        style={{
          margin: "12px 0 0",
          color: "#d1d5db",
          lineHeight: 1.7,
        }}
      >
        {analysis.overview}
      </p>

      <div
        className="analysis-grid"
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: 12,
          marginTop: 16,
        }}
      >
        <BulletPanel
          title="Metrics to watch"
          items={
            analysis.metricsToWatch
          }
          accent="#60a5fa"
        />

        <BulletPanel
          title="Questions to ask"
          items={
            analysis.questionsToAsk
          }
          accent="#fbbf24"
        />
      </div>

      <Insight
        title="Positive scenario"
        text={
          analysis.positiveScenario
        }
        color="#4ade80"
      />

      <Insight
        title="Risk scenario"
        text={analysis.riskScenario}
        color="#ff8a8a"
      />

      <p
        className="muted"
        style={{
          margin: "14px 0 0",
          fontSize: 11,
          lineHeight: 1.55,
        }}
      >
        {analysis.disclaimer}
      </p>

      <style jsx>{`
        @media (max-width: 650px) {
          .analysis-grid {
            grid-template-columns:
              1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

function HistoricalSection({
  surprises,
  symbol,
}: {
  surprises: HistoricalSurprise[];
  symbol: string;
}) {
  return (
    <section
      className="card"
      style={sectionStyle}
    >
      <p style={eyebrowStyle}>
        Historical results
      </p>

      <h2 style={{ margin: 0 }}>
        {symbol} EPS Surprises
      </h2>

      <div
        style={{
          overflowX: "auto",
          marginTop: 16,
        }}
      >
        <div style={{ minWidth: 650 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1.2fr 1fr 1fr 1fr 1fr",
              gap: 10,
              padding:
                "0 11px 10px",
              color: "#9ca3af",
              fontSize: 11,
              fontWeight: 800,
              textTransform:
                "uppercase",
            }}
          >
            <span>Period</span>
            <span>Estimate</span>
            <span>Actual</span>
            <span>Surprise</span>
            <span>Surprise %</span>
          </div>

          {surprises.map(
            (item, index) => {
              const positive =
                (item.surprisePercent ??
                  0) >= 0;

              return (
                <div
                  key={`${item.period}-${index}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1.2fr 1fr 1fr 1fr 1fr",
                    gap: 10,
                    padding: 11,
                    borderTop:
                      "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <strong>
                    {item.period ||
                      `Q${item.quarter ?? "?"} ${item.year ?? ""}`}
                  </strong>

                  <span>
                    {formatNumber(
                      item.estimate
                    )}
                  </span>

                  <span>
                    {formatNumber(
                      item.actual
                    )}
                  </span>

                  <span>
                    {formatNumber(
                      item.surprise
                    )}
                  </span>

                  <span
                    style={{
                      color: positive
                        ? "#4ade80"
                        : "#ff8a8a",
                      fontWeight: 800,
                    }}
                  >
                    {formatSignedPercent(
                      item.surprisePercent
                    )}
                  </span>
                </div>
              );
            }
          )}
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  type,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  type: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
      </label>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        style={inputStyle}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div style={panelStyle}>
      <span
        className="muted"
        style={{ fontSize: 11 }}
      >
        {label}
      </span>

      <strong
        style={{
          display: "block",
          marginTop: 7,
          fontSize: 24,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function SmallMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: 9,
        borderRadius: 9,
        background:
          "rgba(255,255,255,0.035)",
      }}
    >
      <span
        className="muted"
        style={{
          display: "block",
          fontSize: 9,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          display: "block",
          marginTop: 4,
          fontSize: 12,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: EarningsEvent["status"];
}) {
  const upcoming =
    status === "upcoming";

  return (
    <span
      style={{
        padding: "6px 8px",
        borderRadius: 999,
        background: upcoming
          ? "rgba(96,165,250,0.12)"
          : "rgba(74,222,128,0.1)",
        color: upcoming
          ? "#93c5fd"
          : "#4ade80",
        fontSize: 10,
        fontWeight: 850,
        textTransform:
          "uppercase",
      }}
    >
      {status}
    </span>
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
          margin: "11px 0 0",
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

function Insight({
  title,
  text,
  color,
}: {
  title: string;
  text: string;
  color: string;
}) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: 15,
        border:
          "1px solid rgba(255,255,255,0.08)",
        borderRadius: 11,
        background:
          "rgba(255,255,255,0.025)",
      }}
    >
      <strong style={{ color }}>
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

function formatSession(
  hour: EarningsEvent["hour"]
) {
  if (hour === "bmo") {
    return "Before market open";
  }

  if (hour === "amc") {
    return "After market close";
  }

  if (hour === "dmh") {
    return "During market hours";
  }

  return "Time not specified";
}

function formatDisplayDate(
  value: string
) {
  const date = new Date(
    `${value}T12:00:00`
  );

  return date.toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
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

function formatRevenue(
  value: number | null
) {
  if (
    value === null ||
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

function capitalize(value: string) {
  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

function addDays(
  date: Date,
  days: number
) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
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

const labelStyle = {
  display: "block",
  marginBottom: 7,
  color: "#d1d5db",
  fontSize: 12,
  fontWeight: 750,
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

const primaryButtonStyle = {
  padding: "10px 14px",
  border: "none",
  borderRadius: 9,
  background: "#2563eb",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  padding: "9px 10px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  borderRadius: 9,
  background:
    "rgba(255,255,255,0.035)",
  color: "#d1d5db",
  fontWeight: 750,
  cursor: "pointer",
};

const tabButtonStyle = {
  padding: "8px 10px",
  border:
    "1px solid rgba(255,255,255,0.09)",
  borderRadius: 9,
  background:
    "rgba(255,255,255,0.025)",
  color: "#d1d5db",
  fontWeight: 750,
  cursor: "pointer",
};

const panelStyle = {
  padding: 14,
  border:
    "1px solid rgba(255,255,255,0.08)",
  borderRadius: 11,
  background:
    "rgba(255,255,255,0.03)",
};

const emptyStyle = {
  marginTop: 18,
  padding: 22,
  border:
    "1px solid rgba(255,255,255,0.08)",
  borderRadius: 11,
  background:
    "rgba(255,255,255,0.025)",
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