"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import Sidebar from "@/components/Sidebar";

type StockQuote = {
  symbol: string;
  name?: string;
  logo?: string;
  exchange?: string;
  industry?: string;
  country?: string;
  currency?: string;
  website?: string;
  marketCapitalization?: number | null;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
  stale?: boolean;
};

type Fundamentals = {
  metrics?: {
    peRatio?: number | null;
    eps?: number | null;
    revenuePerShare?: number | null;
    netProfitMargin?: number | null;
    grossMargin?: number | null;
    operatingMargin?: number | null;
    week52High?: number | null;
    week52Low?: number | null;
    beta?: number | null;
    dividendYield?: number | null;
    averageVolume10Day?: number | null;
    averageVolume3Month?: number | null;
    marketCapitalization?: number | null;
    priceToBook?: number | null;
    currentRatio?: number | null;
    debtToEquity?: number | null;
    returnOnEquity?: number | null;
  };
};

type NewsArticle = {
  headline?: string;
  summary?: string;
  source?: string;
  url?: string;
  image?: string;
  datetime?: number;
};

type CompanyBundle = {
  symbol: string;
  quote: StockQuote;
  fundamentals: Fundamentals;
  news: NewsArticle[];
};

type AIComparison = {
  headline: string;
  overview: string;
  leftStrengths: string[];
  rightStrengths: string[];
  sharedRisks: string[];
  keyDifferences: string[];
  educationalVerdict: string;
  disclaimer: string;
};

type CompareResponse = {
  left: CompanyBundle;
  right: CompanyBundle;
  aiComparison: AIComparison | null;
  generatedAt: string;
};

type MetricRow = {
  label: string;
  left: number | null;
  right: number | null;
  formatter: (
    value: number | null
  ) => string;
  preference:
    | "higher"
    | "lower"
    | "none";
};

export default function ComparePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialLeft =
    searchParams.get("left")?.toUpperCase() ??
    "AAPL";

  const initialRight =
    searchParams.get("right")?.toUpperCase() ??
    "MSFT";

  const [leftInput, setLeftInput] =
    useState(initialLeft);

  const [rightInput, setRightInput] =
    useState(initialRight);

  const [data, setData] =
    useState<CompareResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadComparison(
      initialLeft,
      initialRight
    );
  }, [initialLeft, initialRight]);

  async function loadComparison(
    left: string,
    right: string
  ) {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/compare?left=${encodeURIComponent(
          left
        )}&right=${encodeURIComponent(
          right
        )}&refresh=${Date.now()}`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to compare these stocks."
        );
      }

      setData(result as CompareResponse);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to compare these stocks."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const left = leftInput
      .trim()
      .toUpperCase();

    const right = rightInput
      .trim()
      .toUpperCase();

    if (!left || !right) {
      setError("Enter two stock symbols.");
      return;
    }

    if (left === right) {
      setError(
        "Choose two different stocks."
      );
      return;
    }

    router.push(
      `/compare?left=${encodeURIComponent(
        left
      )}&right=${encodeURIComponent(
        right
      )}`
    );
  }

  const rows = useMemo<MetricRow[]>(() => {
    if (!data) {
      return [];
    }

    const leftMetrics =
      data.left.fundamentals.metrics ?? {};

    const rightMetrics =
      data.right.fundamentals.metrics ?? {};

    return [
      {
        label: "Price",
        left: data.left.quote.price,
        right: data.right.quote.price,
        formatter: formatCurrency,
        preference: "none",
      },
      {
        label: "Daily change",
        left:
          data.left.quote.changePercent,
        right:
          data.right.quote.changePercent,
        formatter: formatPercent,
        preference: "higher",
      },
      {
        label: "Market cap",
        left:
          data.left.quote
            .marketCapitalization ??
          leftMetrics.marketCapitalization ??
          null,
        right:
          data.right.quote
            .marketCapitalization ??
          rightMetrics.marketCapitalization ??
          null,
        formatter: formatMarketCap,
        preference: "higher",
      },
      {
        label: "P/E ratio",
        left:
          leftMetrics.peRatio ?? null,
        right:
          rightMetrics.peRatio ?? null,
        formatter: formatNumber,
        preference: "lower",
      },
      {
        label: "EPS",
        left: leftMetrics.eps ?? null,
        right: rightMetrics.eps ?? null,
        formatter: formatCurrency,
        preference: "higher",
      },
      {
        label: "Net margin",
        left:
          leftMetrics.netProfitMargin ??
          null,
        right:
          rightMetrics.netProfitMargin ??
          null,
        formatter: formatPercent,
        preference: "higher",
      },
      {
        label: "Gross margin",
        left:
          leftMetrics.grossMargin ??
          null,
        right:
          rightMetrics.grossMargin ??
          null,
        formatter: formatPercent,
        preference: "higher",
      },
      {
        label: "Operating margin",
        left:
          leftMetrics.operatingMargin ??
          null,
        right:
          rightMetrics.operatingMargin ??
          null,
        formatter: formatPercent,
        preference: "higher",
      },
      {
        label: "Return on equity",
        left:
          leftMetrics.returnOnEquity ??
          null,
        right:
          rightMetrics.returnOnEquity ??
          null,
        formatter: formatPercent,
        preference: "higher",
      },
      {
        label: "Price / book",
        left:
          leftMetrics.priceToBook ??
          null,
        right:
          rightMetrics.priceToBook ??
          null,
        formatter: formatNumber,
        preference: "lower",
      },
      {
        label: "Current ratio",
        left:
          leftMetrics.currentRatio ??
          null,
        right:
          rightMetrics.currentRatio ??
          null,
        formatter: formatNumber,
        preference: "higher",
      },
      {
        label: "Debt / equity",
        left:
          leftMetrics.debtToEquity ??
          null,
        right:
          rightMetrics.debtToEquity ??
          null,
        formatter: formatNumber,
        preference: "lower",
      },
      {
        label: "Beta",
        left: leftMetrics.beta ?? null,
        right:
          rightMetrics.beta ?? null,
        formatter: formatNumber,
        preference: "lower",
      },
      {
        label: "Dividend yield",
        left:
          leftMetrics.dividendYield ??
          null,
        right:
          rightMetrics.dividendYield ??
          null,
        formatter: formatPercent,
        preference: "higher",
      },
      {
        label: "52-week high",
        left:
          leftMetrics.week52High ??
          null,
        right:
          rightMetrics.week52High ??
          null,
        formatter: formatCurrency,
        preference: "none",
      },
      {
        label: "52-week low",
        left:
          leftMetrics.week52Low ??
          null,
        right:
          rightMetrics.week52Low ??
          null,
        formatter: formatCurrency,
        preference: "none",
      },
    ];
  }, [data]);

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
              Side-by-side research
            </p>

            <h1
              style={{
                margin: 0,
                fontSize: 38,
              }}
            >
              Stock Comparison
            </h1>

            <p
              className="muted"
              style={{
                margin: "9px 0 0",
                lineHeight: 1.6,
              }}
            >
              Compare live prices, valuation,
              profitability, financial ratios,
              recent news, and an educational AI
              summary.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="card"
            style={{
              padding: 18,
              display: "grid",
              gridTemplateColumns:
                "1fr auto 1fr auto",
              gap: 12,
              alignItems: "center",
            }}
          >
            <input
              value={leftInput}
              onChange={(event) =>
                setLeftInput(
                  event.target.value.toUpperCase()
                )
              }
              placeholder="AAPL"
              style={inputStyle}
            />

            <strong
              style={{
                color: "#60a5fa",
              }}
            >
              VS
            </strong>

            <input
              value={rightInput}
              onChange={(event) =>
                setRightInput(
                  event.target.value.toUpperCase()
                )
              }
              placeholder="MSFT"
              style={inputStyle}
            />

            <button
              type="submit"
              style={primaryButtonStyle}
            >
              Compare
            </button>
          </form>

          {error && (
            <div style={errorStyle}>
              {error}
            </div>
          )}

          {loading ? (
            <ComparisonSkeleton />
          ) : data ? (
            <>
              <section
                className="card"
                style={sectionStyle}
              >
                <div
                  className="company-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1fr 1fr",
                    gap: 14,
                  }}
                >
                  <CompanyHeader
                    company={data.left}
                    onOpen={() =>
                      router.push(
                        `/stock/${data.left.symbol}`
                      )
                    }
                  />

                  <CompanyHeader
                    company={data.right}
                    onOpen={() =>
                      router.push(
                        `/stock/${data.right.symbol}`
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
                  Financial snapshot
                </p>

                <h2 style={{ margin: 0 }}>
                  Side-by-Side Metrics
                </h2>

                <div
                  style={{
                    overflowX: "auto",
                    marginTop: 18,
                  }}
                >
                  <div
                    style={{
                      minWidth: 680,
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "1.2fr 1fr 1fr",
                        gap: 12,
                        padding:
                          "0 12px 10px",
                        color: "#9ca3af",
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform:
                          "uppercase",
                      }}
                    >
                      <span>Metric</span>
                      <span>
                        {data.left.symbol}
                      </span>
                      <span>
                        {data.right.symbol}
                      </span>
                    </div>

                    {rows.map((row) => (
                      <MetricComparisonRow
                        key={row.label}
                        row={row}
                      />
                    ))}
                  </div>
                </div>
              </section>

              {data.aiComparison && (
                <AIComparisonSection
                  comparison={
                    data.aiComparison
                  }
                  leftSymbol={
                    data.left.symbol
                  }
                  rightSymbol={
                    data.right.symbol
                  }
                />
              )}

              <section
                className="card"
                style={sectionStyle}
              >
                <p style={eyebrowStyle}>
                  Recent coverage
                </p>

                <h2 style={{ margin: 0 }}>
                  Company News
                </h2>

                <div
                  className="news-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1fr 1fr",
                    gap: 14,
                    marginTop: 18,
                  }}
                >
                  <NewsColumn
                    title={`${data.left.symbol} News`}
                    articles={
                      data.left.news
                    }
                  />

                  <NewsColumn
                    title={`${data.right.symbol} News`}
                    articles={
                      data.right.news
                    }
                  />
                </div>
              </section>
            </>
          ) : null}
        </section>

        <style jsx>{`
          @media (max-width: 760px) {
            form {
              grid-template-columns:
                1fr !important;
            }

            .company-grid,
            .news-grid {
              grid-template-columns:
                1fr !important;
            }
          }
        `}</style>
      </main>
    </div>
  );
}

function CompanyHeader({
  company,
  onOpen,
}: {
  company: CompanyBundle;
  onOpen: () => void;
}) {
  const positive =
    company.quote.changePercent >= 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        padding: 20,
        border:
          "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
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
          alignItems: "center",
          gap: 12,
        }}
      >
        {company.quote.logo ? (
          <img
            src={company.quote.logo}
            alt={`${company.symbol} logo`}
            style={{
              width: 46,
              height: 46,
              padding: 6,
              objectFit: "contain",
              borderRadius: 10,
              background: "white",
            }}
          />
        ) : (
          <div
            style={{
              width: 46,
              height: 46,
              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",
              borderRadius: 10,
              background:
                "rgba(96,165,250,0.12)",
              color: "#93c5fd",
              fontWeight: 850,
            }}
          >
            {company.symbol.slice(0, 2)}
          </div>
        )}

        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 21,
            }}
          >
            {company.quote.name ||
              company.symbol}
          </h2>

          <p
            className="muted"
            style={{
              margin: "4px 0 0",
              fontSize: 12,
            }}
          >
            {company.symbol}
            {company.quote.exchange
              ? ` · ${company.quote.exchange}`
              : ""}
          </p>
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          fontSize: 30,
          fontWeight: 900,
        }}
      >
        ${company.quote.price.toFixed(2)}
      </div>

      <div
        style={{
          marginTop: 5,
          color: positive
            ? "#4ade80"
            : "#ff8a8a",
          fontWeight: 800,
        }}
      >
        {positive ? "+" : ""}
        {company.quote.change.toFixed(2)} (
        {positive ? "+" : ""}
        {company.quote.changePercent.toFixed(
          2
        )}
        %)
      </div>
    </button>
  );
}

function MetricComparisonRow({
  row,
}: {
  row: MetricRow;
}) {
  const winner = getWinner(row);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "1.2fr 1fr 1fr",
        gap: 12,
        padding: "13px 12px",
        borderTop:
          "1px solid rgba(255,255,255,0.07)",
        alignItems: "center",
      }}
    >
      <strong>{row.label}</strong>

      <MetricValue
        value={row.formatter(row.left)}
        winner={winner === "left"}
      />

      <MetricValue
        value={row.formatter(row.right)}
        winner={winner === "right"}
      />
    </div>
  );
}

function MetricValue({
  value,
  winner,
}: {
  value: string;
  winner: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        color: winner
          ? "#4ade80"
          : "#d1d5db",
        fontWeight: winner
          ? 800
          : 600,
      }}
    >
      {winner && "✓"}
      {value}
    </span>
  );
}

function AIComparisonSection({
  comparison,
  leftSymbol,
  rightSymbol,
}: {
  comparison: AIComparison;
  leftSymbol: string;
  rightSymbol: string;
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
        TradePilot intelligence
      </p>

      <h2 style={{ margin: 0 }}>
        {comparison.headline}
      </h2>

      <p
        style={{
          margin: "11px 0 0",
          color: "#d1d5db",
          lineHeight: 1.7,
        }}
      >
        {comparison.overview}
      </p>

      <div
        className="company-grid"
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: 14,
          marginTop: 18,
        }}
      >
        <BulletPanel
          title={`${leftSymbol} strengths`}
          items={
            comparison.leftStrengths
          }
          accent="#4ade80"
        />

        <BulletPanel
          title={`${rightSymbol} strengths`}
          items={
            comparison.rightStrengths
          }
          accent="#4ade80"
        />

        <BulletPanel
          title="Key differences"
          items={
            comparison.keyDifferences
          }
          accent="#60a5fa"
        />

        <BulletPanel
          title="Shared risks"
          items={
            comparison.sharedRisks
          }
          accent="#ff8a8a"
        />
      </div>

      <div
        style={{
          marginTop: 14,
          padding: 18,
          borderRadius: 13,
          background:
            "rgba(37,99,235,0.07)",
          border:
            "1px solid rgba(96,165,250,0.18)",
        }}
      >
        <strong
          style={{
            color: "#93c5fd",
          }}
        >
          Educational comparison
        </strong>

        <p
          style={{
            margin: "9px 0 0",
            lineHeight: 1.7,
          }}
        >
          {comparison.educationalVerdict}
        </p>
      </div>

      <p
        className="muted"
        style={{
          margin: "13px 0 0",
          fontSize: 11,
        }}
      >
        {comparison.disclaimer}
      </p>
    </section>
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
    <div
      style={{
        padding: 18,
        border:
          "1px solid rgba(255,255,255,0.08)",
        borderRadius: 13,
        background:
          "rgba(255,255,255,0.03)",
      }}
    >
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

function NewsColumn({
  title,
  articles,
}: {
  title: string;
  articles: NewsArticle[];
}) {
  return (
    <div
      style={{
        padding: 18,
        border:
          "1px solid rgba(255,255,255,0.08)",
        borderRadius: 13,
        background:
          "rgba(255,255,255,0.025)",
      }}
    >
      <h3 style={{ margin: 0 }}>
        {title}
      </h3>

      {articles.length === 0 ? (
        <p className="muted">
          No recent news available.
        </p>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 11,
            marginTop: 14,
          }}
        >
          {articles.map(
            (article, index) => (
              <a
                key={`${article.headline}-${index}`}
                href={article.url || "#"}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: 12,
                  border:
                    "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 10,
                  color: "inherit",
                  textDecoration: "none",
                  background:
                    "rgba(255,255,255,0.02)",
                }}
              >
                <strong
                  style={{
                    display: "block",
                    lineHeight: 1.45,
                  }}
                >
                  {article.headline ||
                    "Untitled article"}
                </strong>

                <span
                  className="muted"
                  style={{
                    display: "block",
                    marginTop: 6,
                    fontSize: 11,
                  }}
                >
                  {article.source ||
                    "Unknown source"}
                  {article.datetime
                    ? ` · ${formatRelativeTime(
                        article.datetime
                      )}`
                    : ""}
                </span>
              </a>
            )
          )}
        </div>
      )}
    </div>
  );
}

function ComparisonSkeleton() {
  return (
    <section
      className="card"
      style={{
        ...sectionStyle,
        minHeight: 420,
      }}
    >
      <h2>Loading comparison...</h2>

      <p className="muted">
        Gathering quotes, fundamentals,
        recent news, and AI context.
      </p>
    </section>
  );
}

function getWinner(
  row: MetricRow
): "left" | "right" | null {
  if (
    row.preference === "none" ||
    row.left === null ||
    row.right === null ||
    !Number.isFinite(row.left) ||
    !Number.isFinite(row.right) ||
    row.left === row.right
  ) {
    return null;
  }

  if (row.preference === "higher") {
    return row.left > row.right
      ? "left"
      : "right";
  }

  return row.left < row.right
    ? "left"
    : "right";
}

function formatCurrency(
  value: number | null
) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "Not available";
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
    return "Not available";
  }

  return `${value.toFixed(2)}%`;
}

function formatNumber(
  value: number | null
) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "Not available";
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function formatMarketCap(
  value: number | null
) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "Not available";
  }

  const absolute = Math.abs(value);

  if (absolute >= 1_000_000) {
    return `$${(
      value / 1_000_000
    ).toFixed(2)}T`;
  }

  if (absolute >= 1_000) {
    return `$${(
      value / 1_000
    ).toFixed(2)}B`;
  }

  return `$${value.toFixed(2)}M`;
}

function formatRelativeTime(
  unixSeconds: number
) {
  const difference =
    Date.now() - unixSeconds * 1000;

  const hours = Math.floor(
    difference / 3_600_000
  );

  if (hours < 1) {
    return "Less than 1h ago";
  }

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(
    hours / 24
  )}d ago`;
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

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "11px 13px",
  border:
    "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  background:
    "rgba(255,255,255,0.035)",
  color: "white",
  outline: "none",
  font: "inherit",
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