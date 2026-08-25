"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type CompetitorComparisonCenterProps = {
  symbol: string;
};

type CompanyComparison = {
  symbol: string;
  name: string;
  logo: string;
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
};

type ComparisonResponse = {
  symbol: string;
  companies: CompanyComparison[];
  peerSymbols: string[];
  winners: Record<string, string | null>;
  generatedAt: string;
  source?: string;
  peerGroup?: {
    sector?: string | null;
    industry?: string | null;
    totalPeers?: number | null;
  };
  error?: string;
};

type MetricDefinition = {
  key: keyof CompanyComparison;
  label: string;
  format: (
    value: number | null
  ) => string;
  winnerKey: string;
};

const metrics: MetricDefinition[] = [
  {
    key: "marketCapitalization",
    label: "Market cap",
    format: formatMarketCap,
    winnerKey: "marketCapitalization",
  },
  {
    key: "peRatio",
    label: "P/E ratio",
    format: formatNumber,
    winnerKey: "peRatio",
  },
  {
    key: "eps",
    label: "EPS",
    format: formatCurrency,
    winnerKey: "eps",
  },
  {
    key: "netProfitMargin",
    label: "Net margin",
    format: formatPercent,
    winnerKey: "netProfitMargin",
  },
  {
    key: "operatingMargin",
    label: "Operating margin",
    format: formatPercent,
    winnerKey: "operatingMargin",
  },
  {
    key: "returnOnEquity",
    label: "Return on equity",
    format: formatPercent,
    winnerKey: "returnOnEquity",
  },
  {
    key: "currentRatio",
    label: "Current ratio",
    format: formatNumber,
    winnerKey: "currentRatio",
  },
  {
    key: "debtToEquity",
    label: "Debt / equity",
    format: formatNumber,
    winnerKey: "debtToEquity",
  },
  {
    key: "changePercent",
    label: "Daily performance",
    format: formatSignedPercent,
    winnerKey: "dailyPerformance",
  },
];

export default function CompetitorComparisonCenter({
  symbol,
}: CompetitorComparisonCenterProps) {
  const router = useRouter();

  const [data, setData] =
    useState<ComparisonResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [peerInput, setPeerInput] =
    useState("");

  useEffect(() => {
    loadComparison();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  async function loadComparison(
    manual = false
  ) {
    try {
      manual
        ? setRefreshing(true)
        : setLoading(true);

      setError("");

      const params =
        new URLSearchParams({
          symbol:
            symbol
              .trim()
              .toUpperCase(),
          refresh:
            Date.now().toString(),
        });

      const response =
        await fetch(
          `/api/stock-competitors?${params.toString()}`,
          {
            cache:
              "no-store",
          }
        );

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      if (
        !contentType.includes(
          "application/json"
        )
      ) {
        throw new Error(
          "Competitor comparison returned an unexpected response."
        );
      }

      const result =
        (await response.json()) as ComparisonResponse;

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to load competitor comparison."
        );
      }

      const normalizedCompanies =
        Array.isArray(
          result.companies
        )
          ? result.companies.filter(
              isValidCompany
            )
          : [];

      if (
        normalizedCompanies.length ===
        0
      ) {
        throw new Error(
          "No comparison data was available."
        );
      }

      const baseSymbol =
        symbol
          .trim()
          .toUpperCase();

      const baseCompany =
        normalizedCompanies.find(
          (company) =>
            company.symbol
              .trim()
              .toUpperCase() ===
            baseSymbol
        );

      if (!baseCompany) {
        throw new Error(
          `Unable to locate ${baseSymbol} in the comparison results.`
        );
      }

      /*
       * Always keep the selected stock first
       * even if the API changes its ordering.
       */
      const orderedCompanies = [
        baseCompany,
        ...normalizedCompanies.filter(
          (company) =>
            company.symbol
              .trim()
              .toUpperCase() !==
            baseSymbol
        ),
      ];

      setData({
        ...result,
        companies:
          orderedCompanies,
        winners:
          result.winners || {},
        peerSymbols:
          Array.isArray(
            result.peerSymbols
          )
            ? result.peerSymbols
            : orderedCompanies
                .slice(1)
                .map(
                  (company) =>
                    company.symbol
                ),
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load competitor comparison."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function submitPeers(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const requested =
      peerInput
        .split(",")
        .map(
          (value) =>
            value
              .trim()
              .toUpperCase()
        )
        .filter(Boolean);

    const firstPeer =
      requested[0] || "";

    if (!firstPeer) {
      setError(
        "Enter a ticker to compare."
      );
      return;
    }

    if (
      !/^[A-Z0-9.-]{1,15}$/.test(
        firstPeer
      )
    ) {
      setError(
        "Enter a valid ticker symbol."
      );
      return;
    }

    if (
      firstPeer ===
      symbol
        .trim()
        .toUpperCase()
    ) {
      setError(
        "Choose a different stock to compare."
      );
      return;
    }

    /*
     * The dedicated Compare page is now
     * working with direct Business Quant
     * data, so custom peer comparisons
     * should use that route instead of
     * forcing the stock-page peer endpoint
     * to reload a custom universe.
     */
    router.push(
      `/compare?left=${encodeURIComponent(
        symbol
          .trim()
          .toUpperCase()
      )}&right=${encodeURIComponent(
        firstPeer
      )}`
    );
  }

  const companies =
    data?.companies || [];

  const baseCompany =
    companies.find(
      (company) =>
        company.symbol
          .trim()
          .toUpperCase() ===
        symbol
          .trim()
          .toUpperCase()
    ) ||
    companies[0];

  const strongestCompany =
    useMemo(() => {
      if (!data) {
        return null;
      }

      const counts =
        new Map<
          string,
          number
        >();

      Object.values(
        data.winners || {}
      ).forEach(
        (winner) => {
          if (!winner) {
            return;
          }

          counts.set(
            winner,
            (counts.get(
              winner
            ) || 0) +
              1
          );
        }
      );

      return (
        Array.from(
          counts.entries()
        ).sort(
          (a, b) =>
            b[1] -
            a[1]
        )[0]?.[0] ||
        null
      );
    }, [data]);

  if (loading) {
    return (
      <section
        className="card"
        style={sectionStyle}
      >
        <h2>
          Loading Competitor Comparison...
        </h2>

        <p className="muted">
          Gathering peer-company quotes and fundamentals.
        </p>
      </section>
    );
  }

  if (
    error &&
    !data
  ) {
    return (
      <section
        className="card"
        style={sectionStyle}
      >
        <h2
          style={{
            color:
              "#ff8a8a",
          }}
        >
          Competitor Comparison unavailable
        </h2>

        <p className="muted">
          {error}
        </p>

        <button
          type="button"
          onClick={() =>
            loadComparison(
              true
            )
          }
          style={{
            ...secondaryButtonStyle,
            marginTop: 12,
          }}
        >
          Retry
        </button>
      </section>
    );
  }

  if (
    !data ||
    !baseCompany
  ) {
    return null;
  }

  return (
    <section
      className="card"
      style={{
        ...sectionStyle,
        border:
          "1px solid rgba(236,72,153,0.22)",
      }}
    >
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>
            Peer intelligence
          </p>

          <h2
            style={{
              margin: 0,
            }}
          >
            Competitor Comparison
          </h2>

          <p
            className="muted"
            style={{
              margin:
                "7px 0 0",
              fontSize: 12,
            }}
          >
            Compare {symbol} with automatically selected peers or open a direct two-stock comparison.
          </p>

          {data.peerGroup?.industry && (
            <p
              className="muted"
              style={{
                margin:
                  "5px 0 0",
                fontSize: 10,
              }}
            >
              Peer group:{" "}
              {data.peerGroup.industry}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            loadComparison(
              true
            )
          }
          disabled={
            refreshing
          }
          style={{
            ...secondaryButtonStyle,
            opacity:
              refreshing
                ? 0.65
                : 1,
          }}
        >
          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      <form
        onSubmit={
          submitPeers
        }
        style={{
          display:
            "grid",
          gridTemplateColumns:
            "1fr auto",
          gap: 9,
          marginTop: 16,
        }}
      >
        <input
          value={
            peerInput
          }
          onChange={(
            event
          ) =>
            setPeerInput(
              event.target
                .value
                .toUpperCase()
            )
          }
          placeholder="Compare directly, e.g. MSFT"
          style={inputStyle}
        />

        <button
          type="submit"
          style={
            primaryButtonStyle
          }
        >
          Compare
        </button>
      </form>

      {companies.length ===
        1 && (
        <div
          style={{
            ...warningStyle,
            marginTop: 14,
          }}
        >
          Norvexa loaded {baseCompany.symbol}, but no additional automatic peers were returned. You can still enter a ticker above for a direct comparison.
        </div>
      )}

      <div
        className="company-card-grid"
        style={{
          display:
            "grid",
          gridTemplateColumns:
            `repeat(${Math.max(
              companies.length,
              1
            )}, minmax(210px, 1fr))`,
          gap: 10,
          marginTop: 16,
          overflowX:
            "auto",
        }}
      >
        {companies.map(
          (
            company,
            index
          ) => (
            <CompanyCard
              key={
                company.symbol
              }
              company={
                company
              }
              primary={
                company.symbol ===
                  baseCompany.symbol ||
                index === 0
              }
              strongest={
                strongestCompany ===
                company.symbol
              }
            />
          )
        )}
      </div>

      <div
        style={{
          overflowX:
            "auto",
          marginTop: 16,
        }}
      >
        <div
          style={{
            minWidth:
              Math.max(
                760,
                180 +
                  companies.length *
                    145
              ),
          }}
        >
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                `180px repeat(${companies.length}, minmax(135px, 1fr))`,
              gap: 8,
              padding:
                "0 10px 10px",
              color:
                "#9ca3af",
              fontSize: 10,
              fontWeight: 800,
              textTransform:
                "uppercase",
            }}
          >
            <span>
              Metric
            </span>

            {companies.map(
              (company) => (
                <span
                  key={
                    company.symbol
                  }
                >
                  {
                    company.symbol
                  }
                </span>
              )
            )}
          </div>

          {metrics.map(
            (metric) => (
              <ComparisonRow
                key={
                  metric.key
                }
                metric={
                  metric
                }
                companies={
                  companies
                }
                winner={
                  data.winners?.[
                    metric
                      .winnerKey
                  ] || null
                }
              />
            )
          )}
        </div>
      </div>

      <div
        style={
          educationPanelStyle
        }
      >
        <strong
          style={{
            color:
              "#f9a8d4",
          }}
        >
          How to interpret this comparison
        </strong>

        <p
          className="muted"
          style={{
            margin:
              "7px 0 0",
            fontSize: 11,
            lineHeight: 1.6,
          }}
        >
          Highlighted cells show the strongest visible value for each metric. A lower P/E or debt-to-equity ratio is not automatically better, and a higher margin or ROE does not guarantee future performance. Different industries can also have very different normal ranges.
        </p>

        {data.source && (
          <p
            className="muted"
            style={{
              margin:
                "8px 0 0",
              fontSize: 10,
            }}
          >
            Source:{" "}
            {data.source}
          </p>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 700px) {
          form {
            grid-template-columns:
              1fr !important;
          }

          .company-card-grid {
            grid-template-columns:
              repeat(
                ${companies.length},
                minmax(
                  230px,
                  1fr
                )
              ) !important;
          }
        }
      `}</style>
    </section>
  );
}

function CompanyCard({
  company,
  primary,
  strongest,
}: {
  company:
    CompanyComparison;
  primary: boolean;
  strongest: boolean;
}) {
  return (
    <article
      style={{
        ...panelStyle,
        minWidth: 210,
        border:
          primary
            ? "1px solid rgba(96,165,250,0.35)"
            : strongest
              ? "1px solid rgba(236,72,153,0.35)"
              : panelStyle.border,
      }}
    >
      <div
        style={{
          display:
            "flex",
          gap: 10,
          alignItems:
            "center",
        }}
      >
        {company.logo ? (
          <img
            src={
              company.logo
            }
            alt={`${company.name} logo`}
            style={{
              width: 40,
              height: 40,
              objectFit:
                "contain",
              borderRadius: 9,
              padding: 5,
              background:
                "white",
            }}
          />
        ) : (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 9,
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              background:
                "rgba(236,72,153,0.1)",
              color:
                "#f9a8d4",
              fontWeight: 850,
            }}
          >
            {company.symbol.slice(
              0,
              2
            )}
          </div>
        )}

        <div>
          <Link
            href={`/stock/${company.symbol}`}
            style={{
              color:
                "white",
              textDecoration:
                "none",
              fontWeight: 850,
            }}
          >
            {company.symbol}
          </Link>

          <p
            className="muted"
            style={{
              margin:
                "3px 0 0",
              fontSize: 9,
            }}
          >
            {primary
              ? "Selected company"
              : strongest
                ? "Most metric wins"
                : "Peer company"}
          </p>
        </div>
      </div>

      <strong
        style={{
          display:
            "block",
          marginTop: 13,
          fontSize: 21,
        }}
      >
        {formatCurrency(
          company.price
        )}
      </strong>

      <span
        style={{
          display:
            "block",
          marginTop: 5,
          color:
            company.changePercent >=
            0
              ? "#4ade80"
              : "#ff8a8a",
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {formatSignedPercent(
          company.changePercent
        )}
      </span>
    </article>
  );
}

function ComparisonRow({
  metric,
  companies,
  winner,
}: {
  metric:
    MetricDefinition;
  companies:
    CompanyComparison[];
  winner:
    string | null;
}) {
  return (
    <div
      style={{
        display:
          "grid",
        gridTemplateColumns:
          `180px repeat(${companies.length}, minmax(135px, 1fr))`,
        gap: 8,
        padding: 10,
        borderTop:
          "1px solid rgba(255,255,255,0.07)",
        alignItems:
          "center",
      }}
    >
      <strong>
        {metric.label}
      </strong>

      {companies.map(
        (company) => {
          const rawValue =
            company[
              metric.key
            ];

          const value =
            typeof rawValue ===
            "number"
              ? rawValue
              : null;

          const isWinner =
            winner ===
            company.symbol;

          return (
            <div
              key={`${String(
                metric.key
              )}-${company.symbol}`}
              style={{
                padding:
                  "8px 9px",
                borderRadius: 8,
                background:
                  isWinner
                    ? "rgba(236,72,153,0.1)"
                    : "transparent",
                border:
                  isWinner
                    ? "1px solid rgba(236,72,153,0.22)"
                    : "1px solid transparent",
                color:
                  isWinner
                    ? "#f9a8d4"
                    : "#d1d5db",
                fontWeight:
                  isWinner
                    ? 850
                    : 600,
              }}
            >
              {metric.format(
                value
              )}
            </div>
          );
        }
      )}
    </div>
  );
}

function isValidCompany(
  value: unknown
): value is CompanyComparison {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return false;
  }

  const company =
    value as Partial<CompanyComparison>;

  return (
    typeof company.symbol ===
      "string" &&
    company.symbol.trim()
      .length > 0 &&
    typeof company.price ===
      "number" &&
    Number.isFinite(
      company.price
    )
  );
}

function formatCurrency(
  value: number | null
) {
  if (
    value === null ||
    !Number.isFinite(
      value
    )
  ) {
    return "N/A";
  }

  return value.toLocaleString(
    "en-US",
    {
      style:
        "currency",
      currency:
        "USD",
      maximumFractionDigits:
        2,
    }
  );
}

function formatMarketCap(
  value: number | null
) {
  if (
    value === null ||
    !Number.isFinite(
      value
    )
  ) {
    return "N/A";
  }

  const dollars =
    value <
    10_000_000
      ? value *
        1_000_000
      : value;

  return new Intl.NumberFormat(
    "en-US",
    {
      style:
        "currency",
      currency:
        "USD",
      notation:
        "compact",
      maximumFractionDigits:
        2,
    }
  ).format(
    dollars
  );
}

function formatNumber(
  value: number | null
) {
  if (
    value === null ||
    !Number.isFinite(
      value
    )
  ) {
    return "N/A";
  }

  return value.toFixed(
    2
  );
}

function formatPercent(
  value: number | null
) {
  if (
    value === null ||
    !Number.isFinite(
      value
    )
  ) {
    return "N/A";
  }

  return `${value.toFixed(
    2
  )}%`;
}

function formatSignedPercent(
  value: number | null
) {
  if (
    value === null ||
    !Number.isFinite(
      value
    )
  ) {
    return "N/A";
  }

  return `${
    value >= 0
      ? "+"
      : ""
  }${value.toFixed(
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
  flexWrap:
    "wrap" as const,
};

const eyebrowStyle = {
  margin:
    "0 0 6px",
  color:
    "#f472b6",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing:
    "0.08em",
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

const inputStyle = {
  width:
    "100%",
  boxSizing:
    "border-box" as const,
  padding:
    "10px 12px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  borderRadius: 9,
  background:
    "rgba(255,255,255,0.025)",
  color:
    "white",
  outline:
    "none",
};

const primaryButtonStyle = {
  padding:
    "10px 14px",
  border:
    "none",
  borderRadius: 9,
  background:
    "#db2777",
  color:
    "white",
  fontWeight: 800,
  cursor:
    "pointer",
};

const secondaryButtonStyle = {
  padding:
    "9px 12px",
  border:
    "1px solid rgba(255,255,255,0.11)",
  borderRadius: 9,
  background:
    "rgba(255,255,255,0.035)",
  color:
    "#d1d5db",
  fontWeight: 750,
  cursor:
    "pointer",
};

const errorStyle = {
  marginTop: 14,
  padding: 12,
  border:
    "1px solid rgba(255,107,107,0.28)",
  borderRadius: 10,
  background:
    "rgba(255,107,107,0.07)",
  color:
    "#ff8a8a",
  fontSize: 11,
};

const warningStyle = {
  padding: 12,
  border:
    "1px solid rgba(250,204,21,0.24)",
  borderRadius: 10,
  background:
    "rgba(250,204,21,0.06)",
  color:
    "#facc15",
  fontSize: 11,
  lineHeight: 1.5,
};

const educationPanelStyle = {
  marginTop: 16,
  padding: 15,
  border:
    "1px solid rgba(236,72,153,0.16)",
  borderRadius: 11,
  background:
    "rgba(236,72,153,0.04)",
};