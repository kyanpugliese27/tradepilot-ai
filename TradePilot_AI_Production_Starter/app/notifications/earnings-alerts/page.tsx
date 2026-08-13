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

type EarningsHour =
  | "bmo"
  | "amc"
  | "dmh"
  | "unknown";

type EarningsEvent = {
  symbol: string;
  date: string;
  hour: EarningsHour;
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

type EarningsResponse = {
  events?: EarningsEvent[];
  error?: string;
};

type EarningsAlert = {
  id: string;
  user_id: string;
  symbol: string;
  company_name: string | null;
  days_before: number;
  active: boolean;
  last_event_key: string | null;
  last_notified_at: string | null;
  last_checked_event_date: string | null;
  last_checked_event_hour: string | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

type StockQuote = {
  symbol: string;
  name?: string;
};

export default function EarningsAlertsPage() {
  const router = useRouter();

  const [alerts, setAlerts] =
    useState<EarningsAlert[]>([]);

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

  const [daysBefore, setDaysBefore] =
    useState("1");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const checkAlert = useCallback(
    async (
      alert: EarningsAlert,
      userId: string
    ) => {
      if (!alert.active) {
        return;
      }

      const today =
        startOfDay(
          new Date()
        );

      const toDate =
        addDays(
          today,
          Math.max(
            14,
            alert.days_before + 7
          )
        );

      const params =
        new URLSearchParams({
          from: formatApiDate(
            today
          ),
          to: formatApiDate(
            toDate
          ),
          symbol:
            alert.symbol,
        });

      try {
        const response =
          await fetch(
            `/api/earnings?${params.toString()}`,
            {
              cache: "no-store",
            }
          );

        const result =
          (await response.json()) as EarningsResponse;

        if (
          !response.ok ||
          !Array.isArray(
            result.events
          )
        ) {
          return;
        }

        const upcoming =
          result.events
            .filter(
              (event) =>
                event.status ===
                "upcoming" &&
                event.symbol.toUpperCase() ===
                  alert.symbol.toUpperCase()
            )
            .sort(
              (a, b) =>
                new Date(
                  `${a.date}T12:00:00`
                ).getTime() -
                new Date(
                  `${b.date}T12:00:00`
                ).getTime()
            )[0];

        const supabase =
          createClient();

        if (!upcoming) {
          await supabase
            .from(
              "earnings_alerts"
            )
            .update({
              last_checked_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              alert.id
            );

          return;
        }

        const eventDate =
          startOfDay(
            new Date(
              `${upcoming.date}T12:00:00`
            )
          );

        const daysUntil =
          Math.ceil(
            (eventDate.getTime() -
              today.getTime()) /
              86_400_000
          );

        const eventKey =
          [
            upcoming.symbol,
            upcoming.date,
            upcoming.hour,
            upcoming.quarter ??
              "Q",
            upcoming.year ??
              "Y",
          ].join("-");

        const shouldNotify =
          daysUntil >= 0 &&
          daysUntil <=
            alert.days_before &&
          alert.last_event_key !==
            eventKey;

        await supabase
          .from(
            "earnings_alerts"
          )
          .update({
            last_checked_event_date:
              upcoming.date,
            last_checked_event_hour:
              upcoming.hour,
            last_checked_at:
              new Date().toISOString(),
            ...(shouldNotify
              ? {
                  last_event_key:
                    eventKey,
                  last_notified_at:
                    new Date().toISOString(),
                }
              : {}),
          })
          .eq(
            "id",
            alert.id
          );

        if (shouldNotify) {
          const timing =
            formatEarningsHour(
              upcoming.hour
            );

          const whenText =
            daysUntil === 0
              ? "today"
              : daysUntil === 1
                ? "tomorrow"
                : `in ${daysUntil} days`;

          const estimates =
            buildEstimateText(
              upcoming
            );

          await supabase
            .from(
              "notifications"
            )
            .insert({
              user_id:
                userId,
              type:
                "earnings_alert",
              title:
                `${alert.symbol} Earnings ${whenText === "today" ? "Today" : "Reminder"}`,
              message:
                `${alert.symbol} is scheduled to report ${whenText}${timing ? ` (${timing})` : ""}.${estimates}`,
              symbol:
                alert.symbol,
              link:
                `/earnings?symbol=${encodeURIComponent(
                  alert.symbol
                )}`,
              is_read:
                false,
            });
        }
      } catch {
        // A failed event check should not prevent other alerts from loading.
      }
    },
    []
  );

  const loadAlerts = useCallback(
    async (manual = false) => {
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
          error: alertError,
        } = await supabase
          .from(
            "earnings_alerts"
          )
          .select(
            `
              id,
              user_id,
              symbol,
              company_name,
              days_before,
              active,
              last_event_key,
              last_notified_at,
              last_checked_event_date,
              last_checked_event_hour,
              last_checked_at,
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
          (data as EarningsAlert[]) ??
          [];

        setAlerts(loaded);

        for (
          const alert of loaded
        ) {
          await checkAlert(
            alert,
            user.id
          );
        }

        const {
          data: refreshed,
        } = await supabase
          .from(
            "earnings_alerts"
          )
          .select(
            `
              id,
              user_id,
              symbol,
              company_name,
              days_before,
              active,
              last_event_key,
              last_notified_at,
              last_checked_event_date,
              last_checked_event_hour,
              last_checked_at,
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
            refreshed as EarningsAlert[]
          );
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load earnings alerts."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      router,
      checkAlert,
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

    const normalizedSymbol =
      symbol
        .trim()
        .toUpperCase();

    const reminderDays =
      Number(
        daysBefore
      );

    if (
      !normalizedSymbol ||
      !/^[A-Z0-9.-]{1,15}$/.test(
        normalizedSymbol
      )
    ) {
      setError(
        "Enter a valid stock symbol."
      );
      return;
    }

    if (
      ![
        0,
        1,
        3,
        7,
      ].includes(
        reminderDays
      )
    ) {
      setError(
        "Choose a valid reminder window."
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

      const quoteResponse =
        await fetch(
          `/api/stock-details?symbol=${encodeURIComponent(
            normalizedSymbol
          )}&refresh=${Date.now()}`,
          {
            cache: "no-store",
          }
        );

      const quoteResult =
        await quoteResponse.json();

      if (
        !quoteResponse.ok ||
        !quoteResult.stock
      ) {
        throw new Error(
          quoteResult.error ||
            `Unable to verify ${normalizedSymbol}.`
        );
      }

      const stock =
        normalizeStock(
          quoteResult.stock
        );

      const {
        data: existing,
        error: existingError,
      } = await supabase
        .from(
          "earnings_alerts"
        )
        .select(
          "id, active"
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "symbol",
          normalizedSymbol
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
          `You already have an active earnings alert for ${normalizedSymbol}.`
        );
      }

      const {
        error: insertError,
      } = await supabase
        .from(
          "earnings_alerts"
        )
        .insert({
          user_id:
            user.id,
          symbol:
            normalizedSymbol,
          company_name:
            stock.name ||
            normalizedSymbol,
          days_before:
            reminderDays,
          active:
            true,
        });

      if (insertError) {
        throw new Error(
          insertError.message
        );
      }

      setSymbol("");
      setDaysBefore("1");

      setSuccess(
        `Earnings alert created for ${normalizedSymbol}.`
      );

      await loadAlerts(
        true
      );
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create the earnings alert."
      );
    } finally {
      setCreating(false);
    }
  }

  async function toggleAlert(
    alert:
      EarningsAlert
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
        error: updateError,
      } = await supabase
        .from(
          "earnings_alerts"
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
          ? `${alert.symbol} earnings alert activated.`
          : `${alert.symbol} earnings alert paused.`
      );

      await loadAlerts(
        true
      );
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Unable to update this alert."
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
        error: deleteError,
      } = await supabase
        .from(
          "earnings_alerts"
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
          : "Unable to delete this alert."
      );
    } finally {
      setWorkingId(null);
    }
  }

  const stats =
    useMemo(() => {
      const active =
        alerts.filter(
          (alert) =>
            alert.active
        ).length;

      const upcomingKnown =
        alerts.filter(
          (alert) =>
            Boolean(
              alert.last_checked_event_date
            )
        ).length;

      const notified =
        alerts.filter(
          (alert) =>
            Boolean(
              alert.last_notified_at
            )
        ).length;

      return {
        total:
          alerts.length,
        active,
        upcomingKnown,
        notified,
      };
    }, [alerts]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <section style={containerStyle}>
          <div style={cardStyle}>
            <h1>
              Loading Earnings Alerts...
            </h1>

            <p style={mutedStyle}>
              Checking your tracked
              companies for upcoming
              earnings reports.
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

          <div
            style={{
              display: "flex",
              gap: 9,
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/earnings"
              style={secondaryLinkStyle}
            >
              Earnings Hub
            </Link>

            <button
              type="button"
              onClick={() =>
                loadAlerts(
                  true
                )
              }
              disabled={refreshing}
              style={
                secondaryButtonStyle
              }
            >
              {refreshing
                ? "Checking..."
                : "Check Earnings"}
            </button>
          </div>
        </div>

        <p style={eyebrowStyle}>
          Company event monitoring
        </p>

        <h1 style={titleStyle}>
          Earnings Alerts
        </h1>

        <p style={mutedStyle}>
          Track a company and receive a
          Notification Center reminder
          before its next scheduled
          earnings report.
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
            label="Active alerts"
            value={String(
              stats.active
            )}
            color="#4ade80"
          />

          <StatCard
            label="Upcoming dates found"
            value={String(
              stats.upcomingKnown
            )}
          />

          <StatCard
            label="Notifications sent"
            value={String(
              stats.notified
            )}
            color="#fbbf24"
          />
        </div>

        <section
          style={{
            ...createCardStyle,
            marginTop: 16,
          }}
        >
          <p style={eyebrowStyle}>
            New earnings reminder
          </p>

          <h2 style={{ margin: 0 }}>
            Create Earnings Alert
          </h2>

          <form
            onSubmit={
              createAlert
            }
            className="create-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr auto auto",
              gap: 10,
              marginTop: 16,
              alignItems: "end",
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
                placeholder="AAPL"
                style={inputStyle}
              />
            </label>

            <label>
              <span
                style={
                  fieldLabelStyle
                }
              >
                Remind me
              </span>

              <select
                value={daysBefore}
                onChange={(event) =>
                  setDaysBefore(
                    event.target.value
                  )
                }
                style={selectStyle}
              >
                <option value="7">
                  7 days before
                </option>

                <option value="3">
                  3 days before
                </option>

                <option value="1">
                  1 day before
                </option>

                <option value="0">
                  Day of earnings
                </option>
              </select>
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
                Tracked earnings
              </p>

              <h2 style={{ margin: 0 }}>
                Your Earnings Alerts
              </h2>
            </div>

            <span style={mutedStyle}>
              {alerts.length} alerts
            </span>
          </div>

          {alerts.length === 0 ? (
            <EmptyState
              title="No earnings alerts yet"
              text="Track a company above to receive a reminder before its next report."
            />
          ) : (
            <div
              className="alert-grid"
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
            Uses your existing Earnings Hub
          </strong>

          <p
            style={{
              margin: "6px 0 0",
              ...mutedStyle,
              fontSize: 11,
              lineHeight: 1.55,
            }}
          >
            These alerts reuse
            TradePilot&apos;s existing
            earnings calendar data.
            Active alerts are checked
            when this page loads and
            every five minutes while the
            page remains open.
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

            .create-grid {
              grid-template-columns:
                1fr 1fr !important;
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
  alert: EarningsAlert;
  working: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
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
            color:
              statusColor,
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
          label="Reminder"
          value={
            alert.days_before === 0
              ? "Day of"
              : `${alert.days_before} day${
                  alert.days_before === 1
                    ? ""
                    : "s"
                } before`
          }
        />

        <MiniStat
          label="Next report"
          value={
            alert.last_checked_event_date
              ? formatEventDate(
                  alert.last_checked_event_date
                )
              : "Not found yet"
          }
        />
      </div>

      {alert.last_checked_event_date && (
        <div style={eventPanelStyle}>
          <span
            style={{
              ...mutedStyle,
              fontSize: 9,
            }}
          >
            Upcoming event
          </span>

          <strong
            style={{
              display: "block",
              marginTop: 5,
            }}
          >
            {formatEventDate(
              alert.last_checked_event_date
            )}
            {alert.last_checked_event_hour
              ? ` · ${formatEarningsHour(
                  alert.last_checked_event_hour as EarningsHour
                )}`
              : ""}
          </strong>
        </div>
      )}

      {alert.last_notified_at && (
        <p
          style={{
            margin: "10px 0 0",
            color: "#fbbf24",
            fontSize: 9,
            fontWeight: 800,
          }}
        >
          Last reminder sent{" "}
          {formatDateTime(
            alert.last_notified_at
          )}
        </p>
      )}

      {alert.last_checked_at && (
        <p
          style={{
            margin: "7px 0 0",
            ...mutedStyle,
            fontSize: 9,
          }}
        >
          Last checked{" "}
          {formatDateTime(
            alert.last_checked_at
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
          href={`/earnings?symbol=${encodeURIComponent(
            alert.symbol
          )}`}
          style={
            smallLinkStyle
          }
        >
          Open Earnings
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
          fontSize: 13,
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

function normalizeStock(
  value:
    Record<string, unknown>
): StockQuote {
  return {
    symbol: String(
      value.symbol || ""
    ).toUpperCase(),
    name:
      typeof value.name ===
      "string"
        ? value.name
        : "",
  };
}

function buildEstimateText(
  event: EarningsEvent
) {
  const parts:
    string[] = [];

  if (
    event.epsEstimate !==
    null
  ) {
    parts.push(
      ` EPS estimate: ${formatNumber(
        event.epsEstimate
      )}.`
    );
  }

  if (
    event.revenueEstimate !==
    null
  ) {
    parts.push(
      ` Revenue estimate: ${formatCompactCurrency(
        event.revenueEstimate
      )}.`
    );
  }

  return parts.join("");
}

function formatEarningsHour(
  hour: EarningsHour
) {
  if (hour === "bmo") {
    return "before market open";
  }

  if (hour === "amc") {
    return "after market close";
  }

  if (hour === "dmh") {
    return "during market hours";
  }

  return "time not specified";
}

function startOfDay(
  date: Date
) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function addDays(
  date: Date,
  days: number
) {
  const result =
    new Date(date);

  result.setDate(
    result.getDate() +
      days
  );

  return result;
}

function formatApiDate(
  date: Date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function formatEventDate(
  value: string
) {
  const date =
    new Date(
      `${value}T12:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
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
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

function formatNumber(
  value: number
) {
  return Number(value).toLocaleString(
    "en-US",
    {
      maximumFractionDigits: 2,
    }
  );
}

function formatCompactCurrency(
  value: number
) {
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

const eventPanelStyle = {
  marginTop: 12,
  padding: 11,
  border:
    "1px solid rgba(96,165,250,0.13)",
  borderRadius: 9,
  background:
    "rgba(37,99,235,0.04)",
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

const selectStyle = {
  minWidth: 165,
  padding: "10px 11px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  borderRadius: 9,
  background: "#111827",
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