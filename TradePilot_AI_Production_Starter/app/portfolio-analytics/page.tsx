"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
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

type PortfolioSummary = {
  cashBalance: number;
  portfolioValue: number;
  totalAccountValue: number;
  totalInvested: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  todayGainLoss: number;
  todayGainLossPercent: number;
};

type PortfolioAnalytics = {
  holdingsCount: number;
  winningHoldingsCount: number;
  losingHoldingsCount: number;
  flatHoldingsCount: number;
  winRate: number;
  unrealizedGainLoss: number;
  realizedGainLoss: number;
  combinedGainLoss: number;
  cashPercentage: number;
  stockPercentage: number;
  diversificationCount: number;
  allocations?: Array<{
    symbol: string;
    name?: string;
    marketValue: number;
    allocationPercent: number;
    stockOnlyAllocationPercent?: number;
  }>;
};

type SectorExposure = {
  sector: string;
  marketValue: number;
  percentage: number;
  symbols: string[];
};

type ScoreSet = {
  healthScore: number;
  diversificationScore: number;
  concentrationScore: number;
  riskScore: number;
};

type BenchmarkComparison = {
  symbol: string;
  price: number;
  changePercent: number;
  portfolioTodayPercent: number;
  differencePercent: number;
};

type HighlightHolding =
  | Holding
  | null;

type AIAnalysis = {
  headline: string;
  overview: string;
  strengths: string[];
  risks: string[];
  concentrationComment: string;
  diversificationComment: string;
  benchmarkComment: string;
  educationalInsight: string;
  disclaimer: string;
};

type AnalyticsResponse = {
  summary?: PortfolioSummary;
  analytics?: PortfolioAnalytics;
  holdings?: Holding[];
  sectorExposure?: SectorExposure[];
  scores?: ScoreSet;
  highlights?: {
    largestHolding:
      | HighlightHolding;
    bestHolding:
      | HighlightHolding;
    worstHolding:
      | HighlightHolding;
  };
  benchmark:
    | BenchmarkComparison
    | null;
  aiAnalysis:
    | AIAnalysis
    | null;
  generatedAt?: string;
  error?: string;
};

export default function PortfolioAnalyticsPage() {
  const router = useRouter();

  const [data, setData] =
    useState<AnalyticsResponse | null>(
      null
    );

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
            headers: {
              "Cache-Control":
                "no-cache, no-store, must-revalidate",
            },
          }
        );

        const result =
          (await response.json()) as AnalyticsResponse;

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Unable to load portfolio analytics."
          );
        }

        setData(result);
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
    [router]
  );

  useEffect(() => {
    loadAnalytics();

    const interval =
      window.setInterval(() => {
        loadAnalytics(true);
      }, 60_000);

    const refreshOnFocus = () => {
      loadAnalytics(true);
    };

    window.addEventListener(
      "focus",
      refreshOnFocus
    );

    return () => {
      window.clearInterval(
        interval
      );

      window.removeEventListener(
        "focus",
        refreshOnFocus
      );
    };
  }, [loadAnalytics]);

  const allocations = useMemo(
    () =>
      Array.isArray(
        data?.analytics?.allocations
      )
        ? data!.analytics!
            .allocations!
        : [],
    [data]
  );

  const sectors = useMemo(
    () =>
      Array.isArray(
        data?.sectorExposure
      )
        ? data!.sectorExposure!
        : [],
    [data]
  );

  if (loading) {
    return (
      <main style={pageStyle}>
        <section style={containerStyle}>
          <div style={cardStyle}>
            <h1>
              Loading Portfolio Analytics...
            </h1>

            <p style={mutedStyle}>
              Calculating performance,
              allocation, concentration,
              sector exposure, and risk.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (
    error ||
    !data ||
    !data.summary ||
    !data.analytics ||
    !data.scores
  ) {
    return (
      <main style={pageStyle}>
        <section style={containerStyle}>
          <Link
            href="/dashboard"
            style={backLinkStyle}
          >
            ← Back to Dashboard
          </Link>

          <div
            style={{
              ...cardStyle,
              marginTop: 20,
            }}
          >
            <h1
              style={{
                color: "#ff8a8a",
              }}
            >
              Portfolio Analytics unavailable
            </h1>

            <p style={mutedStyle}>
              {error ||
                "No portfolio analytics are available."}
            </p>

            <button
              type="button"
              onClick={() =>
                loadAnalytics(true)
              }
              style={{
                ...primaryButtonStyle,
                marginTop: 10,
              }}
            >
              Try Again
            </button>
          </div>
        </section>
      </main>
    );
  }

  const {
    summary,
    analytics,
    scores,
    highlights,
    benchmark,
    aiAnalysis,
  } = data;

  const holdings =
    data.holdings || [];

  return (
    <main style={pageStyle}>
      <section style={containerStyle}>
        <div style={topBarStyle}>
          <Link
            href="/dashboard"
            style={backLinkStyle}
          >
            ← Back to Dashboard
          </Link>

          <div
            style={{
              display: "flex",
              gap: 9,
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/paper-trading"
              style={secondaryLinkStyle}
            >
              Paper Trading
            </Link>

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
                : "Refresh Analytics"}
            </button>
          </div>
        </div>

        <p style={eyebrowStyle}>
          Portfolio intelligence
        </p>

        <h1 style={titleStyle}>
          Portfolio Analytics
        </h1>

        <p style={mutedStyle}>
          Review performance,
          allocation, diversification,
          concentration, visible risk,
          and benchmark results for your
          paper-trading account.
        </p>

        <div
          className="summary-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(5, minmax(0, 1fr))",
            gap: 12,
            marginTop: 22,
          }}
        >
          <SummaryCard
            label="Account value"
            value={formatCurrency(
              summary.totalAccountValue
            )}
          />

          <SummaryCard
            label="Portfolio value"
            value={formatCurrency(
              summary.portfolioValue
            )}
          />

          <SummaryCard
            label="Available cash"
            value={formatCurrency(
              summary.cashBalance
            )}
          />

          <SummaryCard
            label="Total P/L"
            value={formatSignedCurrency(
              summary.totalGainLoss
            )}
            detail={formatSignedPercent(
              summary.totalGainLossPercent
            )}
            color={
              summary.totalGainLoss >= 0
                ? "#4ade80"
                : "#ff8a8a"
            }
          />

          <SummaryCard
            label="Today's P/L"
            value={formatSignedCurrency(
              summary.todayGainLoss
            )}
            detail={formatSignedPercent(
              summary.todayGainLossPercent
            )}
            color={
              summary.todayGainLoss >= 0
                ? "#4ade80"
                : "#ff8a8a"
            }
          />
        </div>

        <div
          className="score-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap: 12,
            marginTop: 14,
          }}
        >
          <ScoreCard
            label="Portfolio health"
            value={scores.healthScore}
          />

          <ScoreCard
            label="Diversification"
            value={
              scores.diversificationScore
            }
          />

          <ScoreCard
            label="Concentration balance"
            value={
              scores.concentrationScore
            }
          />

          <ScoreCard
            label="Risk"
            value={scores.riskScore}
            inverse
          />
        </div>

        <div
          className="analytics-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(6, minmax(0, 1fr))",
            gap: 10,
            marginTop: 14,
          }}
        >
          <SmallCard
            label="Holdings"
            value={String(
              analytics.holdingsCount
            )}
          />

          <SmallCard
            label="Winners"
            value={String(
              analytics.winningHoldingsCount
            )}
            color="#4ade80"
          />

          <SmallCard
            label="Losers"
            value={String(
              analytics.losingHoldingsCount
            )}
            color="#ff8a8a"
          />

          <SmallCard
            label="Win rate"
            value={`${analytics.winRate.toFixed(
              2
            )}%`}
          />

          <SmallCard
            label="Realized P/L"
            value={formatSignedCurrency(
              analytics.realizedGainLoss
            )}
            color={
              analytics.realizedGainLoss >=
              0
                ? "#4ade80"
                : "#ff8a8a"
            }
          />

          <SmallCard
            label="Combined P/L"
            value={formatSignedCurrency(
              analytics.combinedGainLoss
            )}
            color={
              analytics.combinedGainLoss >=
              0
                ? "#4ade80"
                : "#ff8a8a"
            }
          />
        </div>

        <div
          className="main-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: 16,
            marginTop: 16,
          }}
        >
          <section style={cardStyle}>
            <SectionHeading
              eyebrow="Account mix"
              title="Asset Allocation"
              subtitle="Cash and individual holdings as a percentage of total account value."
            />

            <AllocationBars
              allocations={allocations}
            />
          </section>

          <section style={cardStyle}>
            <SectionHeading
              eyebrow="Exposure"
              title="Sector Allocation"
              subtitle="Visible sector exposure calculated from the companies currently held."
            />

            <SectorBars
              sectors={sectors}
            />
          </section>
        </div>

        <div
          className="highlight-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",
            gap: 12,
            marginTop: 16,
          }}
        >
          <HighlightCard
            label="Largest position"
            holding={
              highlights?.largestHolding ??
              null
            }
            mode="largest"
          />

          <HighlightCard
            label="Best performer"
            holding={
              highlights?.bestHolding ??
              null
            }
            mode="best"
          />

          <HighlightCard
            label="Worst performer"
            holding={
              highlights?.worstHolding ??
              null
            }
            mode="worst"
          />
        </div>

        <section
          style={{
            ...cardStyle,
            marginTop: 16,
          }}
        >
          <SectionHeading
            eyebrow="Benchmark"
            title="Portfolio vs. SPY"
            subtitle="Compares today's portfolio percentage move with the SPDR S&P 500 ETF."
          />

          {benchmark ? (
            <div
              className="benchmark-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, minmax(0, 1fr))",
                gap: 10,
                marginTop: 15,
              }}
            >
              <SmallCard
                label="SPY price"
                value={formatCurrency(
                  benchmark.price
                )}
              />

              <SmallCard
                label="SPY today"
                value={formatSignedPercent(
                  benchmark.changePercent
                )}
                color={
                  benchmark.changePercent >=
                  0
                    ? "#4ade80"
                    : "#ff8a8a"
                }
              />

              <SmallCard
                label="Portfolio today"
                value={formatSignedPercent(
                  benchmark.portfolioTodayPercent
                )}
                color={
                  benchmark.portfolioTodayPercent >=
                  0
                    ? "#4ade80"
                    : "#ff8a8a"
                }
              />

              <SmallCard
                label="Difference"
                value={formatSignedPercent(
                  benchmark.differencePercent
                )}
                color={
                  benchmark.differencePercent >=
                  0
                    ? "#4ade80"
                    : "#ff8a8a"
                }
              />
            </div>
          ) : (
            <EmptyState
              title="Benchmark unavailable"
              text="SPY quote data could not be loaded right now."
            />
          )}
        </section>

        <section
          style={{
            ...cardStyle,
            marginTop: 16,
          }}
        >
          <SectionHeading
            eyebrow="Holdings detail"
            title="Position Performance"
            subtitle="Live market value and profit or loss for each open holding."
          />

          {holdings.length === 0 ? (
            <EmptyState
              title="No holdings to analyze"
              text="Open a paper-trading position to begin building portfolio analytics."
            />
          ) : (
            <div
              style={{
                overflowX: "auto",
                marginTop: 16,
              }}
            >
              <div
                style={{
                  minWidth: 930,
                }}
              >
                <TableHeader />

                {holdings.map(
                  (holding) => (
                    <HoldingRow
                      key={
                        holding.symbol
                      }
                      holding={
                        holding
                      }
                    />
                  )
                )}
              </div>
            </div>
          )}
        </section>

        {aiAnalysis && (
          <section
            style={{
              ...aiCardStyle,
              marginTop: 16,
            }}
          >
            <p style={eyebrowStyle}>
              Norvexa
            </p>

            <h2 style={{ margin: 0 }}>
              {aiAnalysis.headline}
            </h2>

            <p
              style={{
                margin: "10px 0 0",
                color: "#d1d5db",
                lineHeight: 1.7,
              }}
            >
              {aiAnalysis.overview}
            </p>

            <div
              className="ai-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: 12,
                marginTop: 14,
              }}
            >
              <BulletPanel
                title="Visible strengths"
                items={
                  aiAnalysis.strengths
                }
                color="#4ade80"
              />

              <BulletPanel
                title="Visible risks"
                items={aiAnalysis.risks}
                color="#ff8a8a"
              />
            </div>

            <InsightPanel
              title="Concentration"
              text={
                aiAnalysis.concentrationComment
              }
            />

            <InsightPanel
              title="Diversification"
              text={
                aiAnalysis.diversificationComment
              }
            />

            <InsightPanel
              title="Benchmark comparison"
              text={
                aiAnalysis.benchmarkComment
              }
            />

            <InsightPanel
              title="Educational insight"
              text={
                aiAnalysis.educationalInsight
              }
            />

            <p
              style={{
                margin: "13px 0 0",
                ...mutedStyle,
                fontSize: 10,
                lineHeight: 1.5,
              }}
            >
              {aiAnalysis.disclaimer}
            </p>
          </section>
        )}

        <div style={noticeStyle}>
          <strong>
            Educational analytics
          </strong>

          <p
            style={{
              margin: "6px 0 0",
              ...mutedStyle,
              fontSize: 11,
              lineHeight: 1.55,
            }}
          >
            These scores describe only
            the visible paper portfolio.
            They are not predictions,
            guarantees, or personalized
            investment recommendations.
          </p>
        </div>

        <style jsx>{`
          @media (max-width: 1050px) {
            .summary-grid {
              grid-template-columns:
                repeat(
                  2,
                  minmax(0, 1fr)
                ) !important;
            }

            .score-grid,
            .analytics-grid {
              grid-template-columns:
                repeat(
                  2,
                  minmax(0, 1fr)
                ) !important;
            }

            .main-grid {
              grid-template-columns:
                1fr !important;
            }
          }

          @media (max-width: 750px) {
            .highlight-grid,
            .benchmark-grid,
            .ai-grid {
              grid-template-columns:
                1fr !important;
            }
          }

          @media (max-width: 560px) {
            .summary-grid,
            .score-grid,
            .analytics-grid {
              grid-template-columns:
                1fr !important;
            }
          }
        `}</style>
      </section>
    </main>
  );
}

function AllocationBars({
  allocations,
}: {
  allocations: NonNullable<
    PortfolioAnalytics["allocations"]
  >;
}) {
  if (
    allocations.length === 0
  ) {
    return (
      <EmptyState
        title="No allocation data"
        text="Allocation data will appear after opening a paper position."
      />
    );
  }

  return (
    <div style={barListStyle}>
      {allocations.map(
        (allocation) => (
          <BarRow
            key={allocation.symbol}
            label={
              allocation.symbol
            }
            detail={
              allocation.name ||
              allocation.symbol
            }
            percentage={
              allocation.allocationPercent
            }
            value={formatCurrency(
              allocation.marketValue
            )}
          />
        )
      )}
    </div>
  );
}

function SectorBars({
  sectors,
}: {
  sectors: SectorExposure[];
}) {
  if (sectors.length === 0) {
    return (
      <EmptyState
        title="No sector data"
        text="Sector exposure will appear when company profile data is available."
      />
    );
  }

  return (
    <div style={barListStyle}>
      {sectors.map((sector) => (
        <BarRow
          key={sector.sector}
          label={sector.sector}
          detail={
            sector.symbols.join(
              ", "
            )
          }
          percentage={
            sector.percentage
          }
          value={formatCurrency(
            sector.marketValue
          )}
        />
      ))}
    </div>
  );
}

function BarRow({
  label,
  detail,
  percentage,
  value,
}: {
  label: string;
  detail: string;
  percentage: number;
  value: string;
}) {
  const safePercentage =
    Math.max(
      0,
      Math.min(
        100,
        Number.isFinite(
          percentage
        )
          ? percentage
          : 0
      )
    );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          gap: 10,
          alignItems:
            "flex-end",
        }}
      >
        <div>
          <strong>{label}</strong>

          <p
            style={{
              margin: "3px 0 0",
              ...mutedStyle,
              fontSize: 9,
            }}
          >
            {detail}
          </p>
        </div>

        <div
          style={{
            textAlign: "right",
          }}
        >
          <strong>
            {safePercentage.toFixed(
              2
            )}
            %
          </strong>

          <p
            style={{
              margin: "3px 0 0",
              ...mutedStyle,
              fontSize: 9,
            }}
          >
            {value}
          </p>
        </div>
      </div>

      <div style={barTrackStyle}>
        <div
          style={{
            width: `${safePercentage}%`,
            height: "100%",
            borderRadius: 999,
            background:
              "linear-gradient(90deg, #2563eb, #60a5fa)",
          }}
        />
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  inverse = false,
}: {
  label: string;
  value: number;
  inverse?: boolean;
}) {
  const safe = Math.max(
    0,
    Math.min(100, value)
  );

  const color = inverse
    ? safe <= 35
      ? "#4ade80"
      : safe <= 65
        ? "#fbbf24"
        : "#ff8a8a"
    : safe >= 70
      ? "#4ade80"
      : safe >= 45
        ? "#fbbf24"
        : "#ff8a8a";

  return (
    <div style={cardStyle}>
      <span
        style={{
          ...mutedStyle,
          fontSize: 10,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          display: "block",
          marginTop: 8,
          color,
          fontSize: 25,
        }}
      >
        {safe}/100
      </strong>

      <div style={scoreTrackStyle}>
        <div
          style={{
            width: `${safe}%`,
            height: "100%",
            borderRadius: 999,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

function HighlightCard({
  label,
  holding,
  mode,
}: {
  label: string;
  holding: HighlightHolding;
  mode:
    | "largest"
    | "best"
    | "worst";
}) {
  if (!holding) {
    return (
      <div style={cardStyle}>
        <span style={mutedStyle}>
          {label}
        </span>

        <strong
          style={{
            display: "block",
            marginTop: 8,
          }}
        >
          N/A
        </strong>
      </div>
    );
  }

  const gainColor =
    holding.gainLoss >= 0
      ? "#4ade80"
      : "#ff8a8a";

  return (
    <div style={cardStyle}>
      <span
        style={{
          ...mutedStyle,
          fontSize: 10,
        }}
      >
        {label}
      </span>

      <Link
        href={`/stock/${holding.symbol}`}
        style={{
          display: "block",
          marginTop: 8,
          color: "#93c5fd",
          fontSize: 22,
          fontWeight: 850,
          textDecoration: "none",
        }}
      >
        {holding.symbol}
      </Link>

      <p
        style={{
          margin: "4px 0 0",
          ...mutedStyle,
          fontSize: 10,
        }}
      >
        {holding.name ||
          holding.symbol}
      </p>

      {mode === "largest" ? (
        <>
          <strong
            style={{
              display: "block",
              marginTop: 13,
              fontSize: 18,
            }}
          >
            {formatCurrency(
              holding.marketValue
            )}
          </strong>

          <span
            style={{
              display: "block",
              marginTop: 5,
              color: gainColor,
              fontWeight: 800,
            }}
          >
            {formatSignedPercent(
              holding.gainLossPercent
            )}
          </span>
        </>
      ) : (
        <>
          <strong
            style={{
              display: "block",
              marginTop: 13,
              color: gainColor,
              fontSize: 18,
            }}
          >
            {formatSignedCurrency(
              holding.gainLoss
            )}
          </strong>

          <span
            style={{
              display: "block",
              marginTop: 5,
              color: gainColor,
              fontWeight: 800,
            }}
          >
            {formatSignedPercent(
              holding.gainLossPercent
            )}
          </span>
        </>
      )}
    </div>
  );
}

function HoldingRow({
  holding,
}: {
  holding: Holding;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "1.2fr 0.8fr 1fr 1fr 1fr 1fr 1fr",
        gap: 10,
        padding: 10,
        borderTop:
          "1px solid rgba(255,255,255,0.07)",
        alignItems: "center",
      }}
    >
      <div>
        <Link
          href={`/stock/${holding.symbol}`}
          style={{
            color: "#93c5fd",
            fontWeight: 850,
            textDecoration: "none",
          }}
        >
          {holding.symbol}
        </Link>

        <p
          style={{
            margin: "3px 0 0",
            ...mutedStyle,
            fontSize: 9,
          }}
        >
          {holding.name ||
            holding.symbol}
        </p>
      </div>

      <span>
        {formatShares(
          holding.shares
        )}
      </span>

      <span>
        {formatCurrency(
          holding.averageCost
        )}
      </span>

      <span>
        {formatCurrency(
          holding.currentPrice
        )}
      </span>

      <span>
        {formatCurrency(
          holding.marketValue
        )}
      </span>

      <GainValue
        value={
          holding.gainLoss
        }
        percent={
          holding.gainLossPercent
        }
      />

      <GainValue
        value={
          holding.todayGainLoss
        }
        percent={
          holding.todayGainLossPercent
        }
      />
    </div>
  );
}

function TableHeader() {
  const columns = [
    "Symbol",
    "Shares",
    "Average cost",
    "Current price",
    "Market value",
    "Total P/L",
    "Today's P/L",
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "1.2fr 0.8fr 1fr 1fr 1fr 1fr 1fr",
        gap: 10,
        padding: "0 10px 10px",
        color: "#9ca3af",
        fontSize: 9,
        fontWeight: 800,
        textTransform:
          "uppercase",
      }}
    >
      {columns.map((column) => (
        <span key={column}>
          {column}
        </span>
      ))}
    </div>
  );
}

function GainValue({
  value,
  percent,
}: {
  value: number;
  percent: number;
}) {
  const positive =
    value >= 0;

  return (
    <span
      style={{
        color: positive
          ? "#4ade80"
          : "#ff8a8a",
        fontWeight: 800,
      }}
    >
      {formatSignedCurrency(
        value
      )}
      <br />
      <small>
        {formatSignedPercent(
          percent
        )}
      </small>
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <p style={eyebrowStyle}>
        {eyebrow}
      </p>

      <h2 style={{ margin: 0 }}>
        {title}
      </h2>

      <p
        style={{
          margin: "6px 0 0",
          ...mutedStyle,
          fontSize: 11,
          lineHeight: 1.5,
        }}
      >
        {subtitle}
      </p>
    </div>
  );
}

function InsightPanel({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div style={insightStyle}>
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
    <div style={innerPanelStyle}>
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

function SummaryCard({
  label,
  value,
  detail,
  color = "#f9fafb",
}: {
  label: string;
  value: string;
  detail?: string;
  color?: string;
}) {
  return (
    <div style={cardStyle}>
      <span
        style={{
          ...mutedStyle,
          fontSize: 10,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          display: "block",
          marginTop: 8,
          color,
          fontSize: 21,
        }}
      >
        {value}
      </strong>

      {detail && (
        <span
          style={{
            display: "block",
            marginTop: 5,
            color,
            fontSize: 10,
            fontWeight: 800,
          }}
        >
          {detail}
        </span>
      )}
    </div>
  );
}

function SmallCard({
  label,
  value,
  color = "#f9fafb",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div style={smallCardStyle}>
      <span
        style={{
          ...mutedStyle,
          fontSize: 9,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          display: "block",
          marginTop: 6,
          color,
          fontSize: 16,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function EmptyState({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div style={emptyStyle}>
      <strong>{title}</strong>

      <p
        style={{
          margin: "7px 0 0",
          ...mutedStyle,
          lineHeight: 1.5,
        }}
      >
        {text}
      </p>
    </div>
  );
}

function formatCurrency(
  value: number
) {
  const safe =
    Number.isFinite(value)
      ? value
      : 0;

  return safe.toLocaleString(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

function formatSignedCurrency(
  value: number
) {
  return `${value >= 0 ? "+" : "-"}${formatCurrency(
    Math.abs(value)
  )}`;
}

function formatSignedPercent(
  value: number
) {
  const safe =
    Number.isFinite(value)
      ? value
      : 0;

  return `${safe >= 0 ? "+" : "-"}${Math.abs(
    safe
  ).toFixed(2)}%`;
}

function formatShares(
  value: number
) {
  return Number(value).toLocaleString(
    "en-US",
    {
      maximumFractionDigits: 4,
    }
  );
}

const pageStyle = {
  minHeight: "100vh",
  padding: "32px 24px",
  background: "#07111f",
  color: "white",
};

const containerStyle = {
  maxWidth: 1280,
  margin: "0 auto",
};

const topBarStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap" as const,
  marginBottom: 28,
};

const titleStyle = {
  margin: 0,
  fontSize: 42,
};

const eyebrowStyle = {
  margin: "0 0 7px",
  color: "#60a5fa",
  fontSize: 10,
  fontWeight: 850,
  letterSpacing: "0.1em",
  textTransform:
    "uppercase" as const,
};

const mutedStyle = {
  color: "#9ca3af",
};

const cardStyle = {
  padding: 19,
  border:
    "1px solid rgba(255,255,255,0.09)",
  borderRadius: 15,
  background:
    "rgba(255,255,255,0.035)",
};

const smallCardStyle = {
  padding: 13,
  border:
    "1px solid rgba(255,255,255,0.075)",
  borderRadius: 11,
  background:
    "rgba(255,255,255,0.025)",
};

const aiCardStyle = {
  padding: 20,
  border:
    "1px solid rgba(96,165,250,0.2)",
  borderRadius: 15,
  background:
    "linear-gradient(135deg, rgba(37,99,235,0.08), rgba(255,255,255,0.03))",
};

const innerPanelStyle = {
  padding: 15,
  border:
    "1px solid rgba(255,255,255,0.07)",
  borderRadius: 11,
  background:
    "rgba(255,255,255,0.025)",
};

const insightStyle = {
  marginTop: 12,
  padding: 14,
  border:
    "1px solid rgba(255,255,255,0.07)",
  borderRadius: 11,
  background:
    "rgba(255,255,255,0.025)",
};

const barListStyle = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap: 14,
  marginTop: 17,
};

const barTrackStyle = {
  height: 9,
  marginTop: 8,
  overflow: "hidden",
  borderRadius: 999,
  background:
    "rgba(255,255,255,0.07)",
};

const scoreTrackStyle = {
  height: 8,
  marginTop: 11,
  overflow: "hidden",
  borderRadius: 999,
  background:
    "rgba(255,255,255,0.07)",
};

const backLinkStyle = {
  display: "inline-block",
  padding: "9px 13px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  borderRadius: 9,
  color: "#d1d5db",
  textDecoration: "none",
};

const secondaryLinkStyle = {
  display: "inline-block",
  padding: "9px 12px",
  border:
    "1px solid rgba(96,165,250,0.2)",
  borderRadius: 9,
  background:
    "rgba(37,99,235,0.06)",
  color: "#93c5fd",
  fontWeight: 750,
  textDecoration: "none",
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

const emptyStyle = {
  marginTop: 16,
  padding: 18,
  border:
    "1px solid rgba(255,255,255,0.07)",
  borderRadius: 11,
  background:
    "rgba(255,255,255,0.025)",
};

const noticeStyle = {
  marginTop: 16,
  padding: 15,
  border:
    "1px solid rgba(251,191,36,0.16)",
  borderRadius: 11,
  background:
    "rgba(251,191,36,0.04)",
  color: "#fbbf24",
};