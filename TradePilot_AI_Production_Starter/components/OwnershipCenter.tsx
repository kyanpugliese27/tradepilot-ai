"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type OwnershipCenterProps = {
  symbol: string;
};

type InsiderTransaction = {
  name: string;
  symbol: string;
  share: number;
  change: number;
  filingDate: string;
  transactionDate: string;
  transactionCode: string;
  transactionPrice: number | null;
};

type OwnershipHolder = {
  name: string;
  share: number;
  change: number;
  filingDate: string;
  portfolioPercent: number | null;
};

type OwnershipResponse = {
  symbol: string;
  insiders: InsiderTransaction[];
  institutions: OwnershipHolder[];
  funds: OwnershipHolder[];
  summary: {
    insiderTransactions: number;
    buyTransactions: number;
    sellTransactions: number;
    buyShares: number;
    sellShares: number;
    netShares: number;
    institutionalHolders: number;
    fundHolders: number;
    netInstitutionalChange: number;
    netFundChange: number;
  };
  availability: {
    insiders: boolean;
    institutions: boolean;
    funds: boolean;
    insiderStatus:
      | number
      | null;
    ownershipStatus:
      | number
      | null;
    fundOwnershipStatus:
      | number
      | null;
  };
  generatedAt: string;
  error?: string;
};

type OwnershipTab =
  | "insiders"
  | "institutions"
  | "funds";

export default function OwnershipCenter({
  symbol,
}: OwnershipCenterProps) {
  const [data, setData] =
    useState<OwnershipResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [tab, setTab] =
    useState<OwnershipTab>(
      "insiders"
    );

  useEffect(() => {
    loadOwnership();
  }, [symbol]);

  async function loadOwnership() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/stock-ownership?symbol=${encodeURIComponent(
          symbol
        )}&refresh=${Date.now()}`,
        {
          cache: "no-store",
        }
      );

      const result =
        (await response.json()) as OwnershipResponse;

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to load ownership data."
        );
      }

      setData(result);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load ownership data."
      );
    } finally {
      setLoading(false);
    }
  }

  const recentInsiders =
    useMemo(
      () =>
        (
          data?.insiders || []
        ).slice(0, 15),
      [data?.insiders]
    );

  if (loading) {
    return (
      <section
        className="card"
        style={sectionStyle}
      >
        <h2>
          Loading Ownership Center...
        </h2>

        <p className="muted">
          Gathering insider and
          institutional activity.
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
          Ownership Center unavailable
        </h2>

        <p className="muted">
          {error ||
            "No ownership data is available."}
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
          "1px solid rgba(139,92,246,0.22)",
      }}
    >
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>
            Ownership intelligence
          </p>

          <h2 style={{ margin: 0 }}>
            Ownership Center
          </h2>

          <p
            className="muted"
            style={{
              margin: "7px 0 0",
              fontSize: 12,
            }}
          >
            Insider transactions,
            institutional holders, and
            fund ownership for{" "}
            {data.symbol}
          </p>
        </div>

        <button
          type="button"
          onClick={loadOwnership}
          style={secondaryButtonStyle}
        >
          Refresh
        </button>
      </div>

      <div
        className="ownership-summary-grid"
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4, minmax(0, 1fr))",
          gap: 10,
          marginTop: 18,
        }}
      >
        <SummaryCard
          label="Insider buys"
          value={String(
            data.summary
              .buyTransactions
          )}
          color="#4ade80"
        />

        <SummaryCard
          label="Insider sells"
          value={String(
            data.summary
              .sellTransactions
          )}
          color="#ff8a8a"
        />

        <SummaryCard
          label="Net insider shares"
          value={formatSignedShares(
            data.summary.netShares
          )}
          color={
            data.summary.netShares >=
            0
              ? "#4ade80"
              : "#ff8a8a"
          }
        />

        <SummaryCard
          label="Known holders"
          value={String(
            data.summary
              .institutionalHolders +
              data.summary
                .fundHolders
          )}
          color="#a78bfa"
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
        <TabButton
          label="Insiders"
          active={
            tab === "insiders"
          }
          onClick={() =>
            setTab("insiders")
          }
        />

        <TabButton
          label="Institutions"
          active={
            tab ===
            "institutions"
          }
          onClick={() =>
            setTab(
              "institutions"
            )
          }
        />

        <TabButton
          label="Funds"
          active={tab === "funds"}
          onClick={() =>
            setTab("funds")
          }
        />
      </div>

      {tab === "insiders" && (
        <div style={{ marginTop: 14 }}>
          {data.availability
            .insiders &&
          recentInsiders.length >
            0 ? (
            <div
              style={{
                overflowX:
                  "auto",
              }}
            >
              <div
                style={{
                  minWidth: 760,
                }}
              >
                <TableHeader
                  columns={[
                    "Insider",
                    "Date",
                    "Type",
                    "Shares changed",
                    "Shares after",
                    "Price",
                  ]}
                />

                {recentInsiders.map(
                  (
                    item,
                    index
                  ) => (
                    <InsiderRow
                      key={`${item.name}-${item.transactionDate}-${index}`}
                      item={item}
                    />
                  )
                )}
              </div>
            </div>
          ) : (
            <Unavailable
              text="No recent insider transactions were returned for this symbol."
              premium={false}
            />
          )}
        </div>
      )}

      {tab ===
        "institutions" && (
        <div style={{ marginTop: 14 }}>
          {data.availability
            .institutions &&
          data.institutions.length >
            0 ? (
            <HolderList
              holders={
                data.institutions
              }
              type="Institution"
            />
          ) : (
            <Unavailable
              text="Institutional ownership data is unavailable on the current Finnhub plan or for this symbol."
              premium
            />
          )}
        </div>
      )}

      {tab === "funds" && (
        <div style={{ marginTop: 14 }}>
          {data.availability
            .funds &&
          data.funds.length > 0 ? (
            <HolderList
              holders={
                data.funds
              }
              type="Fund"
            />
          ) : (
            <Unavailable
              text="Fund ownership data is unavailable on the current Finnhub plan or for this symbol."
              premium
            />
          )}
        </div>
      )}

      <p
        className="muted"
        style={{
          margin: "14px 0 0",
          fontSize: 10,
          lineHeight: 1.5,
        }}
      >
        Positive share changes indicate
        net buying and negative changes
        indicate net selling. Filing data
        can be delayed and does not show
        an investor’s full strategy.
      </p>

      <style jsx>{`
        @media (max-width: 820px) {
          .ownership-summary-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              ) !important;
          }
        }

        @media (max-width: 520px) {
          .ownership-summary-grid {
            grid-template-columns:
              1fr !important;
          }
        }
      `}</style>
    </section>
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
          fontSize: 21,
          color,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function TabButton({
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
          ? "1px solid rgba(167,139,250,0.5)"
          : "1px solid rgba(255,255,255,0.09)",
        borderRadius: 9,
        background: active
          ? "rgba(139,92,246,0.12)"
          : "rgba(255,255,255,0.025)",
        color: active
          ? "#c4b5fd"
          : "#d1d5db",
        fontWeight: 750,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function TableHeader({
  columns,
}: {
  columns: string[];
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "1.6fr 0.8fr 0.7fr 1fr 1fr 0.8fr",
        gap: 10,
        padding: "0 11px 10px",
        color: "#9ca3af",
        fontSize: 10,
        fontWeight: 800,
        textTransform:
          "uppercase",
      }}
    >
      {columns.map(
        (column) => (
          <span key={column}>
            {column}
          </span>
        )
      )}
    </div>
  );
}

function InsiderRow({
  item,
}: {
  item: InsiderTransaction;
}) {
  const buy = item.change > 0;
  const sell = item.change < 0;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "1.6fr 0.8fr 0.7fr 1fr 1fr 0.8fr",
        gap: 10,
        padding: 11,
        borderTop:
          "1px solid rgba(255,255,255,0.07)",
        alignItems: "center",
      }}
    >
      <strong>{item.name}</strong>

      <span className="muted">
        {item.transactionDate}
      </span>

      <span
        style={{
          color: buy
            ? "#4ade80"
            : sell
              ? "#ff8a8a"
              : "#fbbf24",
          fontWeight: 800,
        }}
      >
        {buy
          ? "Buy"
          : sell
            ? "Sell"
            : "Other"}
      </span>

      <span
        style={{
          color: buy
            ? "#4ade80"
            : sell
              ? "#ff8a8a"
              : "#d1d5db",
          fontWeight: 750,
        }}
      >
        {formatSignedShares(
          item.change
        )}
      </span>

      <span>
        {formatShares(
          item.share
        )}
      </span>

      <span>
        {item.transactionPrice !==
        null
          ? formatCurrency(
              item.transactionPrice
            )
          : "N/A"}
      </span>
    </div>
  );
}

function HolderList({
  holders,
  type,
}: {
  holders: OwnershipHolder[];
  type: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 9,
      }}
    >
      {holders.map(
        (holder, index) => {
          const positive =
            holder.change >= 0;

          return (
            <div
              key={`${holder.name}-${holder.filingDate}-${index}`}
              style={panelStyle}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong>
                    {holder.name}
                  </strong>

                  <p
                    className="muted"
                    style={{
                      margin:
                        "5px 0 0",
                      fontSize: 10,
                    }}
                  >
                    {type}
                    {holder.filingDate
                      ? ` · Filed ${holder.filingDate}`
                      : ""}
                  </p>
                </div>

                <div
                  style={{
                    textAlign: "right",
                  }}
                >
                  <strong>
                    {formatShares(
                      holder.share
                    )}{" "}
                    shares
                  </strong>

                  <p
                    style={{
                      margin:
                        "5px 0 0",
                      color: positive
                        ? "#4ade80"
                        : "#ff8a8a",
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    {formatSignedShares(
                      holder.change
                    )}
                  </p>
                </div>
              </div>

              {holder.portfolioPercent !==
                null && (
                <p
                  className="muted"
                  style={{
                    margin:
                      "8px 0 0",
                    fontSize: 10,
                  }}
                >
                  Portfolio weight:{" "}
                  {holder.portfolioPercent.toFixed(
                    2
                  )}
                  %
                </p>
              )}
            </div>
          );
        }
      )}
    </div>
  );
}

function Unavailable({
  text,
  premium,
}: {
  text: string;
  premium: boolean;
}) {
  return (
    <div
      style={{
        padding: 15,
        border:
          "1px solid rgba(251,191,36,0.18)",
        borderRadius: 11,
        background:
          "rgba(251,191,36,0.05)",
        color: "#fbbf24",
        fontSize: 11,
        lineHeight: 1.55,
      }}
    >
      {text}
      {premium
        ? " The rest of TradePilot continues to work normally."
        : ""}
    </div>
  );
}

function formatShares(
  value: number
) {
  return Number(value || 0)
    .toLocaleString("en-US", {
      maximumFractionDigits: 0,
    });
}

function formatSignedShares(
  value: number
) {
  const safe =
    Number(value || 0);

  return `${safe >= 0 ? "+" : "-"}${formatShares(
    Math.abs(safe)
  )}`;
}

function formatCurrency(
  value: number
) {
  return Number(value || 0)
    .toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    });
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
  color: "#a78bfa",
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