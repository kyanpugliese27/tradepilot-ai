"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type SECFilingsCenterProps = {
  symbol: string;
};

type Filing = {
  accessNumber?: string;
  symbol?: string;
  cik?: string;
  form?: string;
  filedDate?: string;
  acceptedDate?: string;
  reportUrl?: string;
  filingUrl?: string;
};

type FilingsResponse = {
  filings?: Filing[];
  error?: string;
};

type FilingFilter =
  | "all"
  | "10-K"
  | "10-Q"
  | "8-K"
  | "DEF 14A"
  | "other";

const filingDescriptions: Record<
  string,
  string
> = {
  "10-K":
    "Annual report covering the company’s business, risks, financial condition, and audited results.",
  "10-Q":
    "Quarterly report covering recent financial performance, operations, and material changes.",
  "8-K":
    "Current report used for major events such as leadership changes, acquisitions, agreements, and earnings releases.",
  "DEF 14A":
    "Definitive proxy statement covering executive pay, board matters, shareholder votes, and governance.",
  "S-1":
    "Registration statement commonly used before an initial public offering.",
  "S-3":
    "Shelf registration statement allowing an eligible company to offer securities over time.",
  "4":
    "Insider ownership filing reporting transactions by directors, officers, or major shareholders.",
};

export default function SECFilingsCenter({
  symbol,
}: SECFilingsCenterProps) {
  const [filings, setFilings] =
    useState<Filing[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [filter, setFilter] =
    useState<FilingFilter>("all");

  const [search, setSearch] =
    useState("");

  useEffect(() => {
    loadFilings();
  }, [symbol]);

  async function loadFilings(
    manual = false
  ) {
    try {
      manual
        ? setRefreshing(true)
        : setLoading(true);

      setError("");

      const response = await fetch(
        `/api/sec-filings?symbol=${encodeURIComponent(
          symbol
        )}&refresh=${Date.now()}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control":
              "no-cache, no-store, must-revalidate",
          },
        }
      );

      const data =
        (await response.json()) as FilingsResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load SEC filings."
        );
      }

      setFilings(
        Array.isArray(data.filings)
          ? data.filings
          : []
      );
    } catch (loadError) {
      setFilings([]);

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load SEC filings."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const visibleFilings = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return filings.filter((filing) => {
      const form =
        filing.form?.trim() || "Unknown";

      const matchesFilter =
        filter === "all" ||
        (filter === "other"
          ? ![
              "10-K",
              "10-Q",
              "8-K",
              "DEF 14A",
            ].includes(form)
          : form === filter);

      const matchesSearch =
        !normalizedSearch ||
        form
          .toLowerCase()
          .includes(
            normalizedSearch
          ) ||
        (
          filing.filedDate || ""
        )
          .toLowerCase()
          .includes(
            normalizedSearch
          );

      return (
        matchesFilter &&
        matchesSearch
      );
    });
  }, [filings, filter, search]);

  const counts = useMemo(() => {
    return {
      total: filings.length,
      tenK: filings.filter(
        (filing) =>
          filing.form === "10-K"
      ).length,
      tenQ: filings.filter(
        (filing) =>
          filing.form === "10-Q"
      ).length,
      eightK: filings.filter(
        (filing) =>
          filing.form === "8-K"
      ).length,
      proxy: filings.filter(
        (filing) =>
          filing.form === "DEF 14A"
      ).length,
    };
  }, [filings]);

  if (loading) {
    return (
      <section
        className="card"
        style={sectionStyle}
      >
        <h2>
          Loading SEC Filings...
        </h2>

        <p className="muted">
          Gathering recent regulatory
          filings for {symbol}.
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
          "1px solid rgba(251,191,36,0.22)",
      }}
    >
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>
            Regulatory research
          </p>

          <h2 style={{ margin: 0 }}>
            SEC Filings Center
          </h2>

          <p
            className="muted"
            style={{
              margin: "7px 0 0",
              fontSize: 12,
            }}
          >
            Recent annual, quarterly,
            event, and proxy filings for{" "}
            {symbol}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            loadFilings(true)
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

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      <div
        className="filing-summary-grid"
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(5, minmax(0, 1fr))",
          gap: 10,
          marginTop: 18,
        }}
      >
        <SummaryCard
          label="Total filings"
          value={counts.total}
        />

        <SummaryCard
          label="10-K"
          value={counts.tenK}
        />

        <SummaryCard
          label="10-Q"
          value={counts.tenQ}
        />

        <SummaryCard
          label="8-K"
          value={counts.eightK}
        />

        <SummaryCard
          label="Proxy"
          value={counts.proxy}
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
            "all",
            "10-K",
            "10-Q",
            "8-K",
            "DEF 14A",
            "other",
          ] as FilingFilter[]
        ).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() =>
              setFilter(option)
            }
            style={{
              ...filterButtonStyle,
              border:
                filter === option
                  ? "1px solid rgba(251,191,36,0.5)"
                  : filterButtonStyle.border,
              background:
                filter === option
                  ? "rgba(251,191,36,0.1)"
                  : filterButtonStyle.background,
              color:
                filter === option
                  ? "#fbbf24"
                  : "#d1d5db",
            }}
          >
            {option === "all"
              ? "All"
              : option === "other"
                ? "Other"
                : option}
          </button>
        ))}
      </div>

      <input
        value={search}
        onChange={(event) =>
          setSearch(
            event.target.value
          )
        }
        placeholder="Search by filing type or date..."
        style={{
          ...inputStyle,
          marginTop: 14,
        }}
      />

      {filings.length === 0 ? (
        <div style={emptyStyle}>
          <h3 style={{ margin: 0 }}>
            No SEC filings found
          </h3>

          <p
            className="muted"
            style={{
              margin: "7px 0 0",
              lineHeight: 1.55,
            }}
          >
            No recent filings were
            returned for {symbol}. This
            can happen when the provider
            has limited access or no
            filings in the selected
            period.
          </p>
        </div>
      ) : visibleFilings.length ===
        0 ? (
        <div style={emptyStyle}>
          <h3 style={{ margin: 0 }}>
            No matching filings
          </h3>

          <p
            className="muted"
            style={{
              margin: "7px 0 0",
            }}
          >
            Try another filing type or
            search term.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(290px, 1fr))",
            gap: 12,
            marginTop: 16,
          }}
        >
          {visibleFilings.map(
            (filing, index) => (
              <FilingCard
                key={[
                  filing.accessNumber ||
                    "access",
                  filing.form ||
                    "form",
                  filing.filedDate ||
                    "date",
                  index,
                ].join("-")}
                filing={filing}
              />
            )
          )}
        </div>
      )}

      <div style={educationPanelStyle}>
        <h3
          style={{
            margin: 0,
            color: "#fbbf24",
          }}
        >
          How to read these filings
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 10,
            marginTop: 12,
          }}
        >
          <EducationCard
            form="10-K"
            text={
              filingDescriptions["10-K"]
            }
          />

          <EducationCard
            form="10-Q"
            text={
              filingDescriptions["10-Q"]
            }
          />

          <EducationCard
            form="8-K"
            text={
              filingDescriptions["8-K"]
            }
          />

          <EducationCard
            form="DEF 14A"
            text={
              filingDescriptions[
                "DEF 14A"
              ]
            }
          />
        </div>
      </div>

      <p
        className="muted"
        style={{
          margin: "14px 0 0",
          fontSize: 10,
          lineHeight: 1.5,
        }}
      >
        SEC filings are official company
        disclosures. Filing links open
        outside TradePilot, and filing
        information may be delayed by
        the data provider.
      </p>

      <style jsx>{`
        @media (max-width: 850px) {
          .filing-summary-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              ) !important;
          }
        }

        @media (max-width: 520px) {
          .filing-summary-grid {
            grid-template-columns:
              1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

function FilingCard({
  filing,
}: {
  filing: Filing;
}) {
  const form =
    filing.form?.trim() ||
    "Unknown";

  const description =
    filingDescriptions[form] ||
    "Regulatory filing submitted by the company to the U.S. Securities and Exchange Commission.";

  const primaryUrl =
    filing.reportUrl ||
    filing.filingUrl ||
    "";

  return (
    <article style={filingCardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          gap: 10,
          alignItems:
            "flex-start",
        }}
      >
        <div>
          <span style={formBadgeStyle}>
            {form}
          </span>

          <h3
            style={{
              margin: "12px 0 0",
              fontSize: 18,
            }}
          >
            {getFilingTitle(form)}
          </h3>
        </div>

        <span
          className="muted"
          style={{
            fontSize: 10,
            whiteSpace: "nowrap",
          }}
        >
          {formatDate(
            filing.filedDate
          )}
        </span>
      </div>

      <p
        className="muted"
        style={{
          margin: "11px 0 0",
          lineHeight: 1.55,
          fontSize: 12,
        }}
      >
        {description}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: 8,
          marginTop: 13,
        }}
      >
        <SmallDetail
          label="Filed"
          value={formatDate(
            filing.filedDate
          )}
        />

        <SmallDetail
          label="Accepted"
          value={formatDateTime(
            filing.acceptedDate
          )}
        />
      </div>

      {filing.accessNumber && (
        <p
          className="muted"
          style={{
            margin: "10px 0 0",
            fontSize: 9,
            overflowWrap:
              "anywhere",
          }}
        >
          Accession:{" "}
          {filing.accessNumber}
        </p>
      )}

      {primaryUrl ? (
        <a
          href={primaryUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={primaryLinkStyle}
        >
          Open official filing ↗
        </a>
      ) : (
        <div style={unavailableLinkStyle}>
          Filing link unavailable
        </div>
      )}
    </article>
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
          fontSize: 22,
          color: "#fbbf24",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function SmallDetail({
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
          "rgba(255,255,255,0.03)",
        border:
          "1px solid rgba(255,255,255,0.06)",
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
          fontSize: 11,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function EducationCard({
  form,
  text,
}: {
  form: string;
  text: string;
}) {
  return (
    <div style={panelStyle}>
      <strong
        style={{
          color: "#fbbf24",
        }}
      >
        {form}
      </strong>

      <p
        className="muted"
        style={{
          margin: "7px 0 0",
          fontSize: 11,
          lineHeight: 1.5,
        }}
      >
        {text}
      </p>
    </div>
  );
}

function getFilingTitle(
  form: string
) {
  if (form === "10-K") {
    return "Annual Report";
  }

  if (form === "10-Q") {
    return "Quarterly Report";
  }

  if (form === "8-K") {
    return "Current Event Report";
  }

  if (form === "DEF 14A") {
    return "Proxy Statement";
  }

  if (form === "4") {
    return "Insider Transaction";
  }

  return `${form} Filing`;
}

function formatDate(
  value?: string
) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(
    `${value.slice(0, 10)}T12:00:00`
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

function formatDateTime(
  value?: string
) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

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
  color: "#fbbf24",
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

const filingCardStyle = {
  padding: 16,
  border:
    "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  background:
    "rgba(255,255,255,0.028)",
};

const formBadgeStyle = {
  display: "inline-block",
  padding: "6px 9px",
  border:
    "1px solid rgba(251,191,36,0.25)",
  borderRadius: 999,
  background:
    "rgba(251,191,36,0.08)",
  color: "#fbbf24",
  fontSize: 10,
  fontWeight: 850,
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

const primaryLinkStyle = {
  display: "block",
  marginTop: 14,
  padding: "10px 12px",
  borderRadius: 9,
  background:
    "rgba(251,191,36,0.1)",
  border:
    "1px solid rgba(251,191,36,0.22)",
  color: "#fbbf24",
  textAlign: "center" as const,
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 800,
};

const unavailableLinkStyle = {
  marginTop: 14,
  padding: "10px 12px",
  borderRadius: 9,
  background:
    "rgba(255,255,255,0.03)",
  color: "#6b7280",
  textAlign: "center" as const,
  fontSize: 11,
};

const emptyStyle = {
  marginTop: 16,
  padding: 18,
  border:
    "1px solid rgba(255,255,255,0.08)",
  borderRadius: 11,
  background:
    "rgba(255,255,255,0.025)",
};

const errorStyle = {
  marginTop: 14,
  padding: 12,
  border:
    "1px solid rgba(255,107,107,0.28)",
  borderRadius: 10,
  background:
    "rgba(255,107,107,0.07)",
  color: "#ff8a8a",
  fontSize: 11,
};

const educationPanelStyle = {
  marginTop: 16,
  padding: 17,
  border:
    "1px solid rgba(251,191,36,0.16)",
  borderRadius: 12,
  background:
    "rgba(251,191,36,0.04)",
};