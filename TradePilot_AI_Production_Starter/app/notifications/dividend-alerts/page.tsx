"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type DividendAlert = {
  id: string;
  user_id: string;
  symbol: string;
  company_name: string | null;
  active: boolean;
  last_dividend_yield: number | string | null;
  last_checked_at: string | null;
  last_notified_at: string | null;
  created_at: string;
  updated_at: string;
};

type FundamentalsResponse = {
  metrics?: {
    dividendYield?: number | null;
  };
  error?: string;
};

export default function DividendAlertsPage() {
  const router = useRouter();

  const [alerts, setAlerts] =
    useState<DividendAlert[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [workingId, setWorkingId] =
    useState<string | null>(null);

  const [symbol, setSymbol] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const checkDividendAlert =
    useCallback(
      async (
        alert: DividendAlert,
        userId: string
      ) => {
        if (!alert.active) {
          return;
        }

        try {
          const response =
            await fetch(
              `/api/stock-fundamentals?symbol=${encodeURIComponent(
                alert.symbol
              )}&refresh=${Date.now()}`,
              {
                cache: "no-store",
                headers: {
                  "Cache-Control":
                    "no-cache, no-store, must-revalidate",
                },
              }
            );

          const result =
            (await response.json()) as FundamentalsResponse;

          if (!response.ok) {
            return;
          }

          const currentYield =
            toNullableNumber(
              result.metrics
                ?.dividendYield
            );

          const previousYield =
            toNullableNumber(
              alert.last_dividend_yield
            );

          const hasBaseline =
            alert.last_checked_at !==
            null;

          const changed =
            hasBaseline &&
            currentYield !==
              previousYield;

          const supabase =
            createClient();

          await supabase
            .from(
              "dividend_alerts"
            )
            .update({
              last_dividend_yield:
                currentYield,
              last_checked_at:
                new Date().toISOString(),
              ...(changed
                ? {
                    last_notified_at:
                      new Date().toISOString(),
                  }
                : {}),
            })
            .eq(
              "id",
              alert.id
            );

          if (changed) {
            await supabase
              .from(
                "notifications"
              )
              .insert({
                user_id: userId,
                type:
                  "dividend_alert",
                title:
                  `${alert.symbol} Dividend Update`,
                message:
                  buildDividendMessage(
                    alert.symbol,
                    previousYield,
                    currentYield
                  ),
                symbol:
                  alert.symbol,
                link:
                  `/stock/${alert.symbol}`,
                is_read: false,
              });
          }
        } catch {
          // One failed check should not block the other alerts.
        }
      },
      []
    );

  const loadAlerts =
    useCallback(
      async (
        manual = false
      ) => {
        const supabase =
          createClient();

        try {
          manual
            ? setRefreshing(true)
            : setLoading(true);

          setError("");

          const {
            data: { user },
            error: userError,
          } =
            await supabase.auth.getUser();

          if (
            userError ||
            !user
          ) {
            router.replace(
              "/login"
            );
            return;
          }

          const {
            data,
            error:
              alertError,
          } = await supabase
            .from(
              "dividend_alerts"
            )
            .select(
              `
                id,
                user_id,
                symbol,
                company_name,
                active,
                last_dividend_yield,
                last_checked_at,
                last_notified_at,
                created_at,
                updated_at
              `
            )
            .eq(
              "user_id",
              user.id
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            );

          if (alertError) {
            throw new Error(
              alertError.message
            );
          }

          const loaded =
            (data as DividendAlert[]) ??
            [];

          setAlerts(loaded);

          for (
            const alert of loaded
          ) {
            await checkDividendAlert(
              alert,
              user.id
            );
          }

          const {
            data: refreshed,
          } = await supabase
            .from(
              "dividend_alerts"
            )
            .select(
              `
                id,
                user_id,
                symbol,
                company_name,
                active,
                last_dividend_yield,
                last_checked_at,
                last_notified_at,
                created_at,
                updated_at
              `
            )
            .eq(
              "user_id",
              user.id
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            );

          if (refreshed) {
            setAlerts(
              refreshed as DividendAlert[]
            );
          }
        } catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load dividend alerts."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        router,
        checkDividendAlert,
      ]
    );

  useEffect(() => {
    loadAlerts();

    const interval =
      window.setInterval(
        () => {
          loadAlerts(true);
        },
        5 * 60_000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [loadAlerts]);

  async function createAlert(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const normalized =
      symbol
        .trim()
        .toUpperCase();

    if (
      !normalized ||
      !/^[A-Z0-9.-]{1,15}$/.test(
        normalized
      )
    ) {
      setError(
        "Enter a valid stock symbol."
      );
      return;
    }

    const supabase =
      createClient();

    try {
      setCreating(true);
      setError("");
      setSuccess("");

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !user
      ) {
        router.replace(
          "/login"
        );
        return;
      }

      const [
        stockResponse,
        fundamentalsResponse,
      ] = await Promise.all([
        fetch(
          `/api/stock-details?symbol=${encodeURIComponent(
            normalized
          )}&refresh=${Date.now()}`,
          {
            cache: "no-store",
          }
        ),

        fetch(
          `/api/stock-fundamentals?symbol=${encodeURIComponent(
            normalized
          )}&refresh=${Date.now()}`,
          {
            cache: "no-store",
          }
        ),
      ]);

      const stockResult =
        await stockResponse.json();

      const fundamentalsResult =
        (await fundamentalsResponse.json()) as FundamentalsResponse;

      if (
        !stockResponse.ok ||
        !stockResult.stock
      ) {
        throw new Error(
          stockResult.error ||
            `Unable to verify ${normalized}.`
        );
      }

      if (
        !fundamentalsResponse.ok
      ) {
        throw new Error(
          fundamentalsResult.error ||
            `Unable to load dividend data for ${normalized}.`
        );
      }

      const currentYield =
        toNullableNumber(
          fundamentalsResult
            .metrics
            ?.dividendYield
        );

      const {
        data: existing,
        error:
          existingError,
      } = await supabase
        .from(
          "dividend_alerts"
        )
        .select("id")
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "symbol",
          normalized
        )
        .eq(
          "active",
          true
        )
        .maybeSingle();

      if (existingError) {
        throw new Error(
          existingError.message
        );
      }

      if (existing) {
        throw new Error(
          `You already have an active dividend alert for ${normalized}.`
        );
      }

      const {
        error:
          insertError,
      } = await supabase
        .from(
          "dividend_alerts"
        )
        .insert({
          user_id:
            user.id,
          symbol:
            normalized,
          company_name:
            typeof stockResult
              .stock.name ===
              "string"
              ? stockResult
                  .stock.name
              : normalized,
          active: true,
          last_dividend_yield:
            currentYield,
          last_checked_at:
            new Date().toISOString(),
        });

      if (insertError) {
        throw new Error(
          insertError.message
        );
      }

      setSymbol("");

      setSuccess(
        `Dividend alert created for ${normalized}.`
      );

      await loadAlerts(
        true
      );
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create the dividend alert."
      );
    } finally {
      setCreating(false);
    }
  }

  async function toggleAlert(
    alert:
      DividendAlert
  ) {
    const supabase =
      createClient();

    try {
      setWorkingId(
        alert.id
      );

      setError("");
      setSuccess("");

      const {
        error:
          updateError,
      } = await supabase
        .from(
          "dividend_alerts"
        )
        .update({
          active:
            !alert.active,
        })
        .eq(
          "id",
          alert.id
        );

      if (updateError) {
        throw new Error(
          updateError.message
        );
      }

      setSuccess(
        !alert.active
          ? `${alert.symbol} dividend alert activated.`
          : `${alert.symbol} dividend alert paused.`
      );

      await loadAlerts(
        true
      );
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Unable to update this dividend alert."
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function deleteAlert(
    alertId: string
  ) {
    const supabase =
      createClient();

    try {
      setWorkingId(
        alertId
      );

      setError("");
      setSuccess("");

      const {
        error:
          deleteError,
      } = await supabase
        .from(
          "dividend_alerts"
        )
        .delete()
        .eq(
          "id",
          alertId
        );

      if (deleteError) {
        throw new Error(
          deleteError.message
        );
      }

      setAlerts(
        (current) =>
          current.filter(
            (alert) =>
              alert.id !==
              alertId
          )
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete this dividend alert."
      );
    } finally {
      setWorkingId(null);
    }
  }

  const stats =
    useMemo(() => {
      return {
        total:
          alerts.length,
        active:
          alerts.filter(
            (alert) =>
              alert.active
          ).length,
        dividendPayers:
          alerts.filter(
            (alert) =>
              toNullableNumber(
                alert.last_dividend_yield
              ) !== null
          ).length,
        notified:
          alerts.filter(
            (alert) =>
              Boolean(
                alert.last_notified_at
              )
          ).length,
      };
    }, [alerts]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <section style={containerStyle}>
          <div style={cardStyle}>
            <h1>
              Loading Dividend Alerts...
            </h1>

            <p style={mutedStyle}>
              Checking dividend data for
              your tracked companies.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <section style={containerStyle}>
        <div style={topBarStyle}>
          <Link
            href="/notifications"
            style={backLinkStyle}
          >
            ← Notification Center
          </Link>

          <button
            type="button"
            onClick={() =>
              loadAlerts(true)
            }
            disabled={refreshing}
            style={
              secondaryButtonStyle
            }
          >
            {refreshing
              ? "Checking..."
              : "Check Dividends"}
          </button>
        </div>

        <p style={eyebrowStyle}>
          Dividend monitoring
        </p>

        <h1 style={titleStyle}>
          Dividend Alerts
        </h1>

        <p style={mutedStyle}>
          Track changes to the dividend
          information TradePilot already
          receives for a company.
        </p>

        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}

        {success && (
          <div style={successStyle}>
            {success}
          </div>
        )}

        <div
          className="stats-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap: 12,
            marginTop: 22,
          }}
        >
          <StatCard
            label="Tracked companies"
            value={String(
              stats.total
            )}
          />

          <StatCard
            label="Active"
            value={String(
              stats.active
            )}
            color="#4ade80"
          />

          <StatCard
            label="Dividend data available"
            value={String(
              stats.dividendPayers
            )}
            color="#fbbf24"
          />

          <StatCard
            label="Updates delivered"
            value={String(
              stats.notified
            )}
          />
        </div>

        <section
          style={{
            ...createCardStyle,
            marginTop: 16,
          }}
        >
          <p style={eyebrowStyle}>
            New dividend monitor
          </p>

          <h2 style={{ margin: 0 }}>
            Create Dividend Alert
          </h2>

          <form
            onSubmit={
              createAlert
            }
            className="create-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr auto",
              gap: 10,
              alignItems: "end",
              marginTop: 16,
            }}
          >
            <label>
              <span
                style={
                  fieldLabelStyle
                }
              >
                Stock symbol
              </span>

              <input
                value={symbol}
                onChange={(event) =>
                  setSymbol(
                    event.target.value.toUpperCase()
                  )
                }
                placeholder="KO"
                style={inputStyle}
              />
            </label>

            <button
              type="submit"
              disabled={creating}
              style={primaryButtonStyle}
            >
              {creating
                ? "Creating..."
                : "Create Alert"}
            </button>
          </form>
        </section>

        <section
          style={{
            ...cardStyle,
            marginTop: 16,
          }}
        >
          <div
            style={
              sectionHeaderStyle
            }
          >
            <div>
              <p style={eyebrowStyle}>
                Tracked dividends
              </p>

              <h2 style={{ margin: 0 }}>
                Your Dividend Alerts
              </h2>
            </div>

            <span style={mutedStyle}>
              {alerts.length} alerts
            </span>
          </div>

          {alerts.length === 0 ? (
            <EmptyState
              title="No dividend alerts yet"
              text="Enter a ticker above to start monitoring its dividend information."
            />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(285px, 1fr))",
                gap: 12,
                marginTop: 16,
              }}
            >
              {alerts.map(
                (alert) => (
                  <AlertCard
                    key={
                      alert.id
                    }
                    alert={
                      alert
                    }
                    working={
                      workingId ===
                      alert.id
                    }
                    onToggle={() =>
                      toggleAlert(
                        alert
                      )
                    }
                    onDelete={() =>
                      deleteAlert(
                        alert.id
                      )
                    }
                  />
                )
              )}
            </div>
          )}
        </section>

        <div style={noticeStyle}>
          <strong>
            Current dividend data source
          </strong>

          <p
            style={{
              margin: "6px 0 0",
              ...mutedStyle,
              fontSize: 11,
              lineHeight: 1.55,
            }}
          >
            This version monitors the
            dividend-yield data already
            returned by TradePilot&apos;s
            fundamentals system and
            notifies you when that value
            changes. A production
            corporate-actions feed can
            later add exact declaration,
            ex-dividend, and payment-date
            alerts.
          </p>
        </div>

        <style jsx>{`
          @media (max-width: 850px) {
            .stats-grid {
              grid-template-columns:
                repeat(
                  2,
                  minmax(0, 1fr)
                ) !important;
            }
          }

          @media (max-width: 560px) {
            .stats-grid,
            .create-grid {
              grid-template-columns:
                1fr !important;
            }
          }
        `}</style>
      </section>
    </main>
  );
}

function AlertCard({
  alert,
  working,
  onToggle,
  onDelete,
}: {
  alert: DividendAlert;
  working: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const yieldValue =
    toNullableNumber(
      alert.last_dividend_yield
    );

  const statusColor =
    alert.active
      ? "#4ade80"
      : "#9ca3af";

  return (
    <article style={alertCardStyle}>
      <div style={sectionHeaderStyle}>
        <div>
          <Link
            href={`/stock/${alert.symbol}`}
            style={symbolStyle}
          >
            {alert.symbol}
          </Link>

          <p
            style={{
              margin: "4px 0 0",
              ...mutedStyle,
              fontSize: 9,
            }}
          >
            {alert.company_name ||
              alert.symbol}
          </p>
        </div>

        <span
          style={{
            ...statusBadgeStyle,
            color: statusColor,
            border:
              `1px solid ${statusColor}44`,
            background:
              `${statusColor}10`,
          }}
        >
          {alert.active
            ? "Active"
            : "Paused"}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
          gap: 8,
          marginTop: 15,
        }}
      >
        <MiniStat
          label="Dividend yield"
          value={
            yieldValue === null
              ? "Not available"
              : formatPercent(
                  yieldValue
                )
          }
        />

        <MiniStat
          label="Last checked"
          value={
            alert.last_checked_at
              ? formatDateTime(
                  alert.last_checked_at
                )
              : "Not yet"
          }
        />
      </div>

      {alert.last_notified_at && (
        <p
          style={{
            margin: "10px 0 0",
            color: "#fbbf24",
            fontSize: 9,
            fontWeight: 800,
          }}
        >
          Last update delivered{" "}
          {formatDateTime(
            alert.last_notified_at
          )}
        </p>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginTop: 14,
        }}
      >
        <Link
          href={`/stock/${alert.symbol}`}
          style={smallLinkStyle}
        >
          Open Stock
        </Link>

        <button
          type="button"
          onClick={onToggle}
          disabled={working}
          style={
            secondarySmallButtonStyle
          }
        >
          {alert.active
            ? "Pause"
            : "Activate"}
        </button>

        <button
          type="button"
          onClick={onDelete}
          disabled={working}
          style={
            dangerSmallButtonStyle
          }
        >
          {working
            ? "Working..."
            : "Delete"}
        </button>
      </div>
    </article>
  );
}

function StatCard({
  label,
  value,
  color = "#f9fafb",
}: {
  label: string;
  value: string;
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
          fontSize: 23,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={miniCardStyle}>
      <span
        style={{
          ...mutedStyle,
          fontSize: 8,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          display: "block",
          marginTop: 5,
          fontSize: 11,
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

function buildDividendMessage(
  symbol: string,
  previousYield: number | null,
  currentYield: number | null
) {
  if (
    previousYield === null &&
    currentYield !== null
  ) {
    return `${symbol} now has dividend-yield data available at ${formatPercent(
      currentYield
    )}.`;
  }

  if (
    previousYield !== null &&
    currentYield === null
  ) {
    return `${symbol}'s previously available dividend-yield data is no longer being returned.`;
  }

  return `${symbol}'s reported dividend yield changed from ${formatPercent(
    previousYield || 0
  )} to ${formatPercent(
    currentYield || 0
  )}.`;
}

function toNullableNumber(
  value: unknown
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : null;
}

function formatPercent(
  value: number
) {
  const percent =
    Math.abs(value) <= 1
      ? value * 100
      : value;

  return `${percent.toFixed(
    2
  )}%`;
}

function formatDateTime(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
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
  maxWidth: 1180,
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

const sectionHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap" as const,
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

const createCardStyle = {
  padding: 20,
  border:
    "1px solid rgba(96,165,250,0.22)",
  borderRadius: 15,
  background:
    "linear-gradient(145deg, rgba(37,99,235,0.09), rgba(255,255,255,0.03))",
};

const alertCardStyle = {
  padding: 16,
  border:
    "1px solid rgba(255,255,255,0.075)",
  borderRadius: 12,
  background:
    "rgba(255,255,255,0.025)",
};

const miniCardStyle = {
  padding: 10,
  border:
    "1px solid rgba(255,255,255,0.065)",
  borderRadius: 9,
  background:
    "rgba(255,255,255,0.023)",
};

const fieldLabelStyle = {
  display: "block",
  marginBottom: 6,
  color: "#9ca3af",
  fontSize: 10,
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

const secondarySmallButtonStyle = {
  padding: "8px 10px",
  border:
    "1px solid rgba(255,255,255,0.09)",
  borderRadius: 8,
  background:
    "rgba(255,255,255,0.025)",
  color: "#d1d5db",
  fontSize: 10,
  fontWeight: 800,
  cursor: "pointer",
};

const dangerSmallButtonStyle = {
  padding: "8px 10px",
  border:
    "1px solid rgba(239,68,68,0.2)",
  borderRadius: 8,
  background:
    "rgba(239,68,68,0.06)",
  color: "#ff8a8a",
  fontSize: 10,
  fontWeight: 800,
  cursor: "pointer",
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

const smallLinkStyle = {
  display: "inline-block",
  padding: "8px 10px",
  border:
    "1px solid rgba(96,165,250,0.18)",
  borderRadius: 8,
  background:
    "rgba(37,99,235,0.05)",
  color: "#93c5fd",
  fontSize: 10,
  fontWeight: 800,
  textDecoration: "none",
};

const symbolStyle = {
  color: "#93c5fd",
  fontSize: 20,
  fontWeight: 850,
  textDecoration: "none",
};

const statusBadgeStyle = {
  display: "inline-block",
  padding: "5px 8px",
  borderRadius: 999,
  fontSize: 8,
  fontWeight: 850,
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

const errorStyle = {
  marginTop: 15,
  padding: 13,
  border:
    "1px solid rgba(239,68,68,0.25)",
  borderRadius: 10,
  background:
    "rgba(239,68,68,0.08)",
  color: "#ff8a8a",
};

const successStyle = {
  marginTop: 15,
  padding: 13,
  border:
    "1px solid rgba(34,197,94,0.25)",
  borderRadius: 10,
  background:
    "rgba(34,197,94,0.08)",
  color: "#4ade80",
};

const noticeStyle = {
  marginTop: 16,
  padding: 15,
  border:
    "1px solid rgba(96,165,250,0.16)",
  borderRadius: 11,
  background:
    "rgba(37,99,235,0.04)",
  color: "#93c5fd",
};