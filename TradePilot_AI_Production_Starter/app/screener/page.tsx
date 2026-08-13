"use client";

import {
  FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

type Candidate = {
  symbol: string;
  name: string;
  logo: string;
  industry: string;
  price: number;
  changePercent: number;
  marketCapitalization: number | null;
  peRatio: number | null;
  eps: number | null;
  netProfitMargin: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  beta: number | null;
  dividendYield: number | null;
  priceToBook: number | null;
  currentRatio: number | null;
  debtToEquity: number | null;
  returnOnEquity: number | null;
  week52High: number | null;
  week52Low: number | null;
  stale: boolean;
};

type ScreenerMatch = {
  symbol: string;
  rank: number;
  score: number;
  reason: string;
  strengths: string[];
  cautions: string[];
  candidate: Candidate;
};

type ScreenerResponse = {
  title: string;
  summary: string;
  matches: ScreenerMatch[];
  disclaimer: string;
  universeSize: number;
  generatedAt: string;
};

const suggestedScreens = [
  "Find profitable semiconductor stocks with positive daily momentum.",
  "Show lower-beta dividend stocks with positive margins.",
  "Find large-cap technology companies with positive EPS and reasonable valuation.",
  "Show companies with strong return on equity and lower debt.",
  "Find consumer companies with positive margins and dividend yield.",
  "Show stocks similar to NVIDIA based only on the supplied metrics.",
];

export default function ScreenerPage() {
  const router = useRouter();

  const [query, setQuery] = useState(
    suggestedScreens[0]
  );

  const [limit, setLimit] =
    useState("8");

  const [data, setData] =
    useState<ScreenerResponse | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function runScreener(
    event?: FormEvent<HTMLFormElement>
  ) {
    event?.preventDefault();

    if (!query.trim()) {
      setError(
        "Enter a screening request."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/screener",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            query,
            limit: Number(limit),
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to run the screener."
        );
      }

      setData(
        result as ScreenerResponse
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to run the screener."
      );
    } finally {
      setLoading(false);
    }
  }

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
              AI-powered discovery
            </p>

            <h1
              style={{
                margin: 0,
                fontSize: 38,
              }}
            >
              AI Stock Screener
            </h1>

            <p
              className="muted"
              style={{
                margin: "9px 0 0",
                maxWidth: 760,
                lineHeight: 1.6,
              }}
            >
              Describe the type of stock you want
              to study. TradePilot ranks matches
              from a curated company universe using
              the financial metrics currently
              available in your app.
            </p>
          </div>

          <form
            onSubmit={runScreener}
            className="card"
            style={{
              padding: 22,
            }}
          >
            <label style={labelStyle}>
              Describe your screen
            </label>

            <textarea
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value
                )
              }
              rows={4}
              placeholder="Example: Find profitable semiconductor companies with positive margins and lower debt."
              style={textareaStyle}
            />

            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent:
                  "space-between",
                gap: 14,
                flexWrap: "wrap",
                marginTop: 14,
              }}
            >
              <div>
                <label style={labelStyle}>
                  Number of results
                </label>

                <select
                  value={limit}
                  onChange={(event) =>
                    setLimit(
                      event.target.value
                    )
                  }
                  style={selectStyle}
                >
                  <option value="5">
                    5 matches
                  </option>
                  <option value="8">
                    8 matches
                  </option>
                  <option value="10">
                    10 matches
                  </option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...primaryButtonStyle,
                  opacity: loading
                    ? 0.65
                    : 1,
                }}
              >
                {loading
                  ? "Screening..."
                  : "Run AI Screener"}
              </button>
            </div>

            <div
              style={{
                marginTop: 18,
              }}
            >
              <p
                className="muted"
                style={{
                  margin: "0 0 10px",
                  fontSize: 12,
                  fontWeight: 750,
                }}
              >
                Suggested screens
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {suggestedScreens.map(
                  (suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() =>
                        setQuery(
                          suggestion
                        )
                      }
                      style={suggestionStyle}
                    >
                      {suggestion}
                    </button>
                  )
                )}
              </div>
            </div>
          </form>

          {error && (
            <div style={errorStyle}>
              {error}
            </div>
          )}

          {loading && (
            <section
              className="card"
              style={sectionStyle}
            >
              <h2 style={{ margin: 0 }}>
                Screening the universe...
              </h2>

              <p className="muted">
                Loading quotes, financial
                metrics, and ranking matches.
              </p>
            </section>
          )}

          {!loading && data && (
            <>
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
                  TradePilot results
                </p>

                <h2 style={{ margin: 0 }}>
                  {data.title}
                </h2>

                <p
                  style={{
                    margin: "10px 0 0",
                    color: "#d1d5db",
                    lineHeight: 1.7,
                  }}
                >
                  {data.summary}
                </p>

                <p
                  className="muted"
                  style={{
                    margin: "10px 0 0",
                    fontSize: 11,
                  }}
                >
                  Screened{" "}
                  {data.universeSize} companies ·
                  Generated{" "}
                  {new Date(
                    data.generatedAt
                  ).toLocaleTimeString(
                    "en-US",
                    {
                      hour: "numeric",
                      minute: "2-digit",
                    }
                  )}
                </p>
              </section>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(310px, 1fr))",
                  gap: 14,
                  marginTop: 14,
                }}
              >
                {data.matches.map(
                  (match) => (
                    <ResultCard
                      key={
                        match.symbol
                      }
                      match={match}
                      onOpen={() =>
                        router.push(
                          `/stock/${match.symbol}`
                        )
                      }
                    />
                  )
                )}
              </div>

              <p
                className="muted"
                style={{
                  margin: "15px 0 0",
                  fontSize: 11,
                  lineHeight: 1.55,
                }}
              >
                {data.disclaimer}
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function ResultCard({
  match,
  onOpen,
}: {
  match: ScreenerMatch;
  onOpen: () => void;
}) {
  const candidate =
    match.candidate;

  const positive =
    candidate.changePercent >= 0;

  return (
    <article
      className="card"
      style={{
        padding: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent:
            "space-between",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            minWidth: 0,
          }}
        >
          {candidate.logo ? (
            <img
              src={candidate.logo}
              alt={`${candidate.symbol} logo`}
              style={{
                width: 44,
                height: 44,
                padding: 6,
                objectFit: "contain",
                borderRadius: 10,
                background: "white",
              }}
            />
          ) : (
            <div
              style={{
                width: 44,
                height: 44,
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                borderRadius: 10,
                background:
                  "rgba(96,165,250,0.12)",
                color: "#93c5fd",
                fontWeight: 850,
              }}
            >
              {candidate.symbol.slice(
                0,
                2
              )}
            </div>
          )}

          <div style={{ minWidth: 0 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 18,
              }}
            >
              #{match.rank}{" "}
              {candidate.symbol}
            </h3>

            <p
              className="muted"
              style={{
                margin: "4px 0 0",
                overflow: "hidden",
                textOverflow:
                  "ellipsis",
                whiteSpace: "nowrap",
                fontSize: 12,
              }}
            >
              {candidate.name}
            </p>
          </div>
        </div>

        <span
          style={{
            padding: "7px 9px",
            borderRadius: 999,
            background:
              "rgba(37,99,235,0.12)",
            color: "#93c5fd",
            fontSize: 12,
            fontWeight: 850,
          }}
        >
          {match.score.toFixed(0)}
          /100
        </span>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          gap: 12,
          marginTop: 16,
        }}
      >
        <strong
          style={{
            fontSize: 22,
          }}
        >
          ${candidate.price.toFixed(2)}
        </strong>

        <span
          style={{
            color: positive
              ? "#4ade80"
              : "#ff8a8a",
            fontWeight: 800,
          }}
        >
          {positive ? "+" : ""}
          {candidate.changePercent.toFixed(
            2
          )}
          %
        </span>
      </div>

      <p
        style={{
          margin: "13px 0 0",
          color: "#d1d5db",
          lineHeight: 1.6,
        }}
      >
        {match.reason}
      </p>

      <MetricGrid
        candidate={candidate}
      />

      <BulletBlock
        title="Why it matched"
        items={match.strengths}
        accent="#4ade80"
      />

      <BulletBlock
        title="Cautions"
        items={match.cautions}
        accent="#ff8a8a"
      />

      <button
        type="button"
        onClick={onOpen}
        style={{
          ...primaryButtonStyle,
          width: "100%",
          marginTop: 16,
        }}
      >
        Open {candidate.symbol}
      </button>
    </article>
  );
}

function MetricGrid({
  candidate,
}: {
  candidate: Candidate;
}) {
  const items = [
    [
      "Market cap",
      formatMarketCap(
        candidate.marketCapitalization
      ),
    ],
    [
      "P/E",
      formatMetric(candidate.peRatio),
    ],
    [
      "EPS",
      formatCurrencyMetric(
        candidate.eps
      ),
    ],
    [
      "Net margin",
      formatPercentMetric(
        candidate.netProfitMargin
      ),
    ],
    [
      "ROE",
      formatPercentMetric(
        candidate.returnOnEquity
      ),
    ],
    [
      "Debt/equity",
      formatMetric(
        candidate.debtToEquity
      ),
    ],
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(2, minmax(0, 1fr))",
        gap: 8,
        marginTop: 14,
      }}
    >
      {items.map(([label, value]) => (
        <div
          key={label}
          style={{
            padding: 10,
            border:
              "1px solid rgba(255,255,255,0.07)",
            borderRadius: 9,
            background:
              "rgba(255,255,255,0.025)",
          }}
        >
          <span
            className="muted"
            style={{
              display: "block",
              fontSize: 10,
            }}
          >
            {label}
          </span>

          <strong
            style={{
              display: "block",
              marginTop: 4,
              fontSize: 13,
            }}
          >
            {value}
          </strong>
        </div>
      ))}
    </div>
  );
}

function BulletBlock({
  title,
  items,
  accent,
}: {
  title: string;
  items: string[];
  accent: string;
}) {
  return (
    <div style={{ marginTop: 15 }}>
      <strong
        style={{
          fontSize: 13,
        }}
      >
        {title}
      </strong>

      <ul
        style={{
          margin: "8px 0 0",
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

function formatMetric(
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

function formatCurrencyMetric(
  value: number | null
) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "N/A";
  }

  return `$${value.toFixed(2)}`;
}

function formatPercentMetric(
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

function formatMarketCap(
  value: number | null
) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "N/A";
  }

  if (Math.abs(value) >= 1_000_000) {
    return `$${(
      value / 1_000_000
    ).toFixed(2)}T`;
  }

  if (Math.abs(value) >= 1_000) {
    return `$${(
      value / 1_000
    ).toFixed(2)}B`;
  }

  return `$${value.toFixed(2)}M`;
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

const labelStyle = {
  display: "block",
  marginBottom: 7,
  color: "#d1d5db",
  fontSize: 13,
  fontWeight: 750,
};

const textareaStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: 13,
  border:
    "1px solid rgba(255,255,255,0.12)",
  borderRadius: 11,
  background:
    "rgba(255,255,255,0.035)",
  color: "white",
  outline: "none",
  resize: "vertical" as const,
  font: "inherit",
  lineHeight: 1.55,
};

const selectStyle = {
  padding: "10px 12px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  borderRadius: 9,
  background: "#0d1828",
  color: "white",
};

const primaryButtonStyle = {
  padding: "11px 16px",
  border: "none",
  borderRadius: 10,
  background: "#2563eb",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const suggestionStyle = {
  padding: "8px 10px",
  border:
    "1px solid rgba(96,165,250,0.18)",
  borderRadius: 999,
  background:
    "rgba(37,99,235,0.06)",
  color: "#93c5fd",
  fontSize: 11,
  fontWeight: 700,
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