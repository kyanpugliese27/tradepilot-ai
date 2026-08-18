"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Metrics = {
  totalUsers: number;
  freeUsers: number;
  premiumUsers: number;
  stripeMrr: number;
  lifetimeCollected: number;
  revenueLast30Days: number;
  scheduledCancellations: number;
  newUsersLast7Days: number;
  premiumConversionRate: number;
};

type ChartPoint = {
  date: string;
  value: number;
};

type RecentUser = {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  plan: "free" | "premium";
  status: string;
  cancelAtPeriodEnd: boolean;
  periodEnd: string | null;
};

type AdminResponse = {
  metrics: Metrics;
  charts: {
    userGrowth: ChartPoint[];
    revenueGrowth: ChartPoint[];
  };
  recentUsers: RecentUser[];
  generatedAt: string;
};

export default function AdminPage() {
  const [data, setData] = useState<AdminResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadAdmin = useCallback(async (manual = false) => {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch("/api/admin/metrics", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to load admin dashboard.");
      }

      setData(result as AdminResponse);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load admin dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAdmin(false);
  }, [loadAdmin]);

  return (
    <main style={pageStyle}>
      <section style={containerStyle}>
        <div style={topBarStyle}>
          <div>
            <Link href="/dashboard" style={backLinkStyle}>
              ← Back to Dashboard
            </Link>

            <p style={eyebrowStyle}>Norvexa owner</p>
            <h1 style={titleStyle}>Admin Dashboard</h1>
            <p style={subtitleStyle}>
              Users, subscriptions, Stripe revenue and growth at a glance.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadAdmin(true)}
            disabled={refreshing}
            style={refreshButtonStyle}
          >
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        {error && (
          <div style={errorStyle}>
            <strong>Admin dashboard unavailable</strong>
            <p style={{ margin: "6px 0 0" }}>{error}</p>
          </div>
        )}

        {loading ? (
          <div style={loadingStyle}>Loading business metrics...</div>
        ) : data ? (
          <>
            <div className="metric-grid" style={metricGridStyle}>
              <MetricCard
                label="Total users"
                value={formatNumber(data.metrics.totalUsers)}
                note={`${data.metrics.newUsersLast7Days} new in the last 7 days`}
              />

              <MetricCard
                label="Premium users"
                value={formatNumber(data.metrics.premiumUsers)}
                note={`${data.metrics.premiumConversionRate.toFixed(1)}% conversion`}
                accent="gold"
              />

              <MetricCard
                label="Free users"
                value={formatNumber(data.metrics.freeUsers)}
                note="Eligible to upgrade"
              />

              <MetricCard
                label="Stripe MRR"
                value={formatCurrency(data.metrics.stripeMrr)}
                note="Calculated from active Stripe subscriptions"
                accent="green"
              />

              <MetricCard
                label="Revenue · 30D"
                value={formatCurrency(data.metrics.revenueLast30Days)}
                note="Successful Stripe charges, less refunds"
                accent="blue"
              />

              <MetricCard
                label="Lifetime collected"
                value={formatCurrency(data.metrics.lifetimeCollected)}
                note="Successful Stripe charges, less refunds"
                accent="green"
              />

              <MetricCard
                label="New users"
                value={formatNumber(data.metrics.newUsersLast7Days)}
                note="Last 7 days"
                accent="blue"
              />

              <MetricCard
                label="Cancellations"
                value={formatNumber(data.metrics.scheduledCancellations)}
                note="Scheduled for period end"
                accent={
                  data.metrics.scheduledCancellations > 0 ? "red" : undefined
                }
              />
            </div>

            <div className="chart-grid" style={chartGridStyle}>
              <ChartCard
                eyebrow="Growth"
                title="User Growth"
                subtitle="Total registered users · last 30 days"
                data={data.charts.userGrowth}
                formatValue={(value) => formatNumber(value)}
              />

              <ChartCard
                eyebrow="Revenue"
                title="Stripe Revenue"
                subtitle="Daily collected revenue · last 30 days"
                data={data.charts.revenueGrowth}
                formatValue={(value) => formatCurrency(value)}
              />
            </div>

            <section style={sectionStyle}>
              <div style={sectionHeaderStyle}>
                <div>
                  <p style={eyebrowStyle}>Customers</p>
                  <h2 style={sectionTitleStyle}>Recent Users</h2>
                </div>

                <span style={smallBadgeStyle}>Latest 20</span>
              </div>

              {data.recentUsers.length === 0 ? (
                <div style={emptyStyle}>No users yet.</div>
              ) : (
                <div style={tableWrapperStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <TableHead>User</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Billing</TableHead>
                      </tr>
                    </thead>

                    <tbody>
                      {data.recentUsers.map((user) => (
                        <tr key={user.id} style={rowStyle}>
                          <TableCell>
                            <strong>{user.email}</strong>
                            <div style={userIdStyle}>
                              {user.id.slice(0, 8)}…
                            </div>
                          </TableCell>

                          <TableCell>
                            <PlanBadge plan={user.plan} />
                          </TableCell>

                          <TableCell>
                            <StatusBadge status={user.status} />
                          </TableCell>

                          <TableCell>{formatDate(user.createdAt)}</TableCell>

                          <TableCell>
                            {user.cancelAtPeriodEnd
                              ? `Cancels ${
                                  user.periodEnd
                                    ? formatDate(user.periodEnd)
                                    : "at period end"
                                }`
                              : user.plan === "premium"
                                ? user.periodEnd
                                  ? `Renews ${formatDate(user.periodEnd)}`
                                  : "Active"
                                : "—"}
                          </TableCell>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div style={footerNoteStyle}>
              Last updated{" "}
              {new Date(data.generatedAt).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
              . Stripe revenue values shown here use the Stripe account connected
              by your current STRIPE_SECRET_KEY.
            </div>
          </>
        ) : null}

        <style jsx>{`
          @media (max-width: 900px) {
            .chart-grid {
              grid-template-columns: 1fr !important;
            }
          }

          @media (max-width: 760px) {
            .metric-grid {
              grid-template-columns: 1fr 1fr !important;
            }
          }

          @media (max-width: 500px) {
            .metric-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </section>
    </main>
  );
}

function ChartCard({
  eyebrow,
  title,
  subtitle,
  data,
  formatValue,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  data: ChartPoint[];
  formatValue: (value: number) => string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chart = useMemo(() => {
    const width = 760;
    const height = 230;
    const padX = 22;
    const padTop = 18;
    const padBottom = 25;

    const values = data.map((point) => point.value);
    const max = Math.max(1, ...values);
    const min = Math.min(0, ...values);
    const range = Math.max(1, max - min);

    const points = data.map((point, index) => {
      const x =
        data.length <= 1
          ? width / 2
          : padX + (index / (data.length - 1)) * (width - padX * 2);

      const y =
        padTop +
        ((max - point.value) / range) * (height - padTop - padBottom);

      return { ...point, x, y };
    });

    return {
      width,
      height,
      points,
      max,
    };
  }, [data]);

  const activePoint =
    hoverIndex === null ? null : chart.points[hoverIndex] || null;

  const polyline = chart.points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <section style={chartCardStyle}>
      <div style={chartHeaderStyle}>
        <div>
          <p style={eyebrowStyle}>{eyebrow}</p>
          <h2 style={sectionTitleStyle}>{title}</h2>
          <p style={chartSubtitleStyle}>{subtitle}</p>
        </div>

        <div style={chartValueStyle}>
          {activePoint
            ? formatValue(activePoint.value)
            : data.length
              ? formatValue(data[data.length - 1].value)
              : formatValue(0)}
        </div>
      </div>

      <div style={chartCanvasStyle}>
        {data.length === 0 ? (
          <div style={emptyStyle}>No chart data yet.</div>
        ) : (
          <svg
            viewBox={`0 0 ${chart.width} ${chart.height}`}
            width="100%"
            height="230"
            preserveAspectRatio="none"
            role="img"
            aria-label={title}
          >
            <line
              x1="22"
              x2={chart.width - 22}
              y1={chart.height - 25}
              y2={chart.height - 25}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />

            <polyline
              points={polyline}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {chart.points.map((point, index) => (
              <g key={point.date}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={hoverIndex === index ? 5 : 2.5}
                  fill="currentColor"
                />

                <rect
                  x={Math.max(0, point.x - 12)}
                  y="0"
                  width="24"
                  height={chart.height}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(index)}
                  onMouseLeave={() => setHoverIndex(null)}
                />
              </g>
            ))}
          </svg>
        )}

        {activePoint && (
          <div style={chartTooltipStyle}>
            <strong>{formatValue(activePoint.value)}</strong>
            <span style={{ color: "#9ca3af" }}>
              {new Date(activePoint.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note: string;
  accent?: "gold" | "green" | "blue" | "red";
}) {
  const accentColor =
    accent === "gold"
      ? "#fbbf24"
      : accent === "green"
        ? "#4ade80"
        : accent === "blue"
          ? "#60a5fa"
          : accent === "red"
            ? "#ff8a8a"
            : "white";

  return (
    <article style={metricCardStyle}>
      <span style={metricLabelStyle}>{label}</span>
      <strong style={{ ...metricValueStyle, color: accentColor }}>
        {value}
      </strong>
      <span style={metricNoteStyle}>{note}</span>
    </article>
  );
}

function PlanBadge({ plan }: { plan: "free" | "premium" }) {
  const premium = plan === "premium";

  return (
    <span
      style={{
        ...badgeStyle,
        color: premium ? "#fbbf24" : "#d1d5db",
        border: premium
          ? "1px solid rgba(251,191,36,0.25)"
          : "1px solid rgba(255,255,255,0.09)",
        background: premium
          ? "rgba(251,191,36,0.07)"
          : "rgba(255,255,255,0.025)",
      }}
    >
      {premium ? "⭐ Premium" : "Free"}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = status === "active" || status === "trialing";

  return (
    <span
      style={{
        ...badgeStyle,
        color: active ? "#4ade80" : status === "free" ? "#9ca3af" : "#ffb4b4",
        background: active
          ? "rgba(34,197,94,0.07)"
          : "rgba(255,255,255,0.025)",
        border: active
          ? "1px solid rgba(34,197,94,0.18)"
          : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {status}
    </span>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return <th style={tableHeadStyle}>{children}</th>;
}

function TableCell({ children }: { children: React.ReactNode }) {
  return <td style={tableCellStyle}>{children}</td>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const pageStyle = {
  minHeight: "100vh",
  padding: "32px 24px",
  background: "#07111f",
  color: "white",
};

const containerStyle = {
  maxWidth: 1180,
  margin: "0 auto",
};

const topBarStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 20,
  flexWrap: "wrap" as const,
};

const backLinkStyle = {
  display: "inline-block",
  marginBottom: 25,
  padding: "9px 13px",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 9,
  color: "#d1d5db",
  textDecoration: "none",
};

const eyebrowStyle = {
  margin: "0 0 7px",
  color: "#60a5fa",
  fontSize: 10,
  fontWeight: 850,
  letterSpacing: "0.11em",
  textTransform: "uppercase" as const,
};

const titleStyle = {
  margin: 0,
  fontSize: 43,
};

const subtitleStyle = {
  margin: "9px 0 0",
  color: "#9ca3af",
  lineHeight: 1.55,
};

const refreshButtonStyle = {
  marginTop: 3,
  padding: "10px 14px",
  border: "1px solid rgba(96,165,250,0.2)",
  borderRadius: 10,
  background: "rgba(37,99,235,0.07)",
  color: "#93c5fd",
  fontWeight: 800,
  cursor: "pointer",
};

const metricGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 12,
  marginTop: 26,
};

const metricCardStyle = {
  padding: 18,
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  background: "rgba(255,255,255,0.03)",
};

const metricLabelStyle = {
  display: "block",
  color: "#9ca3af",
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};

const metricValueStyle = {
  display: "block",
  marginTop: 8,
  fontSize: 30,
  lineHeight: 1.1,
};

const metricNoteStyle = {
  display: "block",
  marginTop: 8,
  color: "#6b7280",
  fontSize: 10,
};

const chartGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
  marginTop: 16,
};

const chartCardStyle = {
  padding: 18,
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 15,
  background: "rgba(255,255,255,0.025)",
  color: "#60a5fa",
};

const chartHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 12,
};

const chartSubtitleStyle = {
  margin: "6px 0 0",
  color: "#6b7280",
  fontSize: 10,
};

const chartValueStyle = {
  color: "white",
  fontSize: 18,
  fontWeight: 850,
};

const chartCanvasStyle = {
  position: "relative" as const,
  minHeight: 230,
  borderTop: "1px solid rgba(255,255,255,0.06)",
  paddingTop: 5,
};

const chartTooltipStyle = {
  position: "absolute" as const,
  right: 8,
  top: 8,
  display: "flex",
  flexDirection: "column" as const,
  gap: 2,
  padding: "8px 10px",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 8,
  background: "#0b1727",
  color: "white",
  fontSize: 10,
  pointerEvents: "none" as const,
};

const sectionStyle = {
  marginTop: 16,
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 15,
  background: "rgba(255,255,255,0.025)",
  overflow: "hidden",
};

const sectionHeaderStyle = {
  padding: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  borderBottom: "1px solid rgba(255,255,255,0.07)",
};

const sectionTitleStyle = {
  margin: 0,
  fontSize: 21,
  color: "white",
};

const smallBadgeStyle = {
  padding: "6px 9px",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 999,
  color: "#9ca3af",
  fontSize: 9,
};

const tableWrapperStyle = {
  overflowX: "auto" as const,
};

const tableStyle = {
  width: "100%",
  minWidth: 850,
  borderCollapse: "collapse" as const,
};

const tableHeadStyle = {
  padding: "11px 15px",
  textAlign: "left" as const,
  color: "#6b7280",
  fontSize: 9,
  fontWeight: 850,
  letterSpacing: "0.07em",
  textTransform: "uppercase" as const,
};

const tableCellStyle = {
  padding: "14px 15px",
  color: "#d1d5db",
  fontSize: 11,
};

const rowStyle = {
  borderTop: "1px solid rgba(255,255,255,0.06)",
};

const userIdStyle = {
  marginTop: 3,
  color: "#6b7280",
  fontSize: 9,
};

const badgeStyle = {
  display: "inline-block",
  padding: "5px 8px",
  borderRadius: 999,
  fontSize: 9,
  fontWeight: 800,
  textTransform: "capitalize" as const,
};

const loadingStyle = {
  marginTop: 25,
  padding: 30,
  textAlign: "center" as const,
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  color: "#9ca3af",
  background: "rgba(255,255,255,0.025)",
};

const emptyStyle = {
  padding: 30,
  textAlign: "center" as const,
  color: "#9ca3af",
};

const errorStyle = {
  marginTop: 20,
  padding: 15,
  border: "1px solid rgba(239,68,68,0.22)",
  borderRadius: 11,
  background: "rgba(239,68,68,0.07)",
  color: "#ff9b9b",
};

const footerNoteStyle = {
  marginTop: 14,
  color: "#6b7280",
  fontSize: 10,
  textAlign: "right" as const,
};