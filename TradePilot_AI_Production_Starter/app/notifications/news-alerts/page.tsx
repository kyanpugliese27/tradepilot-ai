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

type NewsArticle = {
  category?: string;
  datetime: number;
  headline: string;
  id: number | string;
  image?: string;
  related?: string;
  source: string;
  summary: string;
  url: string;
};

type NewsAlert = {
  id: string;
  user_id: string;
  symbol: string;
  company_name: string | null;
  active: boolean;
  last_article_id: string | null;
  last_article_datetime: number | null;
  last_checked_at: string | null;
  last_notified_at: string | null;
  created_at: string;
  updated_at: string;
};

export default function NewsAlertsPage() {
  const router = useRouter();

  const [alerts, setAlerts] =
    useState<NewsAlert[]>([]);
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

  const checkNewsAlert = useCallback(
    async (
      alert: NewsAlert,
      userId: string
    ) => {
      if (!alert.active) return;

      try {
        const response = await fetch(
          `/api/stock-news?symbol=${encodeURIComponent(
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

        if (!response.ok) {
          return;
        }

        const result =
          await response.json();

        const articles: NewsArticle[] =
          Array.isArray(
            result.articles
          )
            ? result.articles
            : [];

        const sorted = [...articles]
          .filter(
            (article) =>
              article &&
              article.headline &&
              Number.isFinite(
                Number(
                  article.datetime
                )
              )
          )
          .sort(
            (a, b) =>
              Number(b.datetime) -
              Number(a.datetime)
          );

        const latest =
          sorted[0];

        const supabase =
          createClient();

        if (!latest) {
          await supabase
            .from("news_alerts")
            .update({
              last_checked_at:
                new Date().toISOString(),
            })
            .eq("id", alert.id);

          return;
        }

        const latestId =
          String(latest.id);

        const latestDatetime =
          Number(
            latest.datetime
          );

        const previousDatetime =
          Number(
            alert.last_article_datetime ||
              0
          );

        const isNew =
          Boolean(
            alert.last_article_id
          ) &&
          latestId !==
            alert.last_article_id &&
          latestDatetime >
            previousDatetime;

        await supabase
          .from("news_alerts")
          .update({
            last_article_id:
              latestId,
            last_article_datetime:
              latestDatetime,
            last_checked_at:
              new Date().toISOString(),
            ...(isNew
              ? {
                  last_notified_at:
                    new Date().toISOString(),
                }
              : {}),
          })
          .eq("id", alert.id);

        if (isNew) {
          const summary =
            cleanText(
              latest.summary
            );

          const message =
            summary
              ? `${latest.headline} — ${truncate(
                  summary,
                  180
                )}`
              : latest.headline;

          await supabase
            .from(
              "notifications"
            )
            .insert({
              user_id:
                userId,
              type:
                "news_alert",
              title:
                `${alert.symbol} News Alert`,
              message,
              symbol:
                alert.symbol,
              link:
                `/stock/${alert.symbol}`,
              is_read:
                false,
            });
        }
      } catch {
        // One failed news request should not block the rest.
      }
    },
    []
  );

  const loadAlerts = useCallback(
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
          .from("news_alerts")
          .select(
            `
              id,
              user_id,
              symbol,
              company_name,
              active,
              last_article_id,
              last_article_datetime,
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
          (data as NewsAlert[]) ??
          [];

        setAlerts(loaded);

        for (
          const alert of loaded
        ) {
          await checkNewsAlert(
            alert,
            user.id
          );
        }

        const {
          data: refreshed,
        } = await supabase
          .from("news_alerts")
          .select(
            `
              id,
              user_id,
              symbol,
              company_name,
              active,
              last_article_id,
              last_article_datetime,
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
            refreshed as NewsAlert[]
          );
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load news alerts."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      router,
      checkNewsAlert,
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

    return () =>
      window.clearInterval(
        interval
      );
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
        newsResponse,
      ] = await Promise.all([
        fetch(
          `/api/stock-details?symbol=${encodeURIComponent(
            normalized
          )}&refresh=${Date.now()}`,
          {
            cache:
              "no-store",
          }
        ),
        fetch(
          `/api/stock-news?symbol=${encodeURIComponent(
            normalized
          )}&refresh=${Date.now()}`,
          {
            cache:
              "no-store",
          }
        ),
      ]);

      const stockResult =
        await stockResponse.json();

      if (
        !stockResponse.ok ||
        !stockResult.stock
      ) {
        throw new Error(
          stockResult.error ||
            `Unable to verify ${normalized}.`
        );
      }

      const newsResult =
        newsResponse.ok
          ? await newsResponse.json()
          : {
              articles: [],
            };

      const articles:
        NewsArticle[] =
        Array.isArray(
          newsResult.articles
        )
          ? newsResult.articles
          : [];

      const latest =
        [...articles]
          .sort(
            (a, b) =>
              Number(
                b.datetime
              ) -
              Number(
                a.datetime
              )
          )[0] || null;

      const {
        data: existing,
        error:
          existingError,
      } = await supabase
        .from("news_alerts")
        .select(
          "id"
        )
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
          `You already have an active news alert for ${normalized}.`
        );
      }

      const {
        error: insertError,
      } = await supabase
        .from("news_alerts")
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
          active:
            true,
          last_article_id:
            latest
              ? String(
                  latest.id
                )
              : null,
          last_article_datetime:
            latest
              ? Number(
                  latest.datetime
                )
              : null,
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
        `News alert created for ${normalized}. New stories will appear in your Notification Center.`
      );

      await loadAlerts(
        true
      );
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create the news alert."
      );
    } finally {
      setCreating(false);
    }
  }

  async function toggleAlert(
    alert: NewsAlert
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
        .from("news_alerts")
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
          ? `${alert.symbol} news alert activated.`
          : `${alert.symbol} news alert paused.`
      );

      await loadAlerts(
        true
      );
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Unable to update this news alert."
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
        .from("news_alerts")
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
            (item) =>
              item.id !==
              alertId
          )
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete this news alert."
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
            (item) =>
              item.active
          ).length,
        paused:
          alerts.filter(
            (item) =>
              !item.active
          ).length,
        notified:
          alerts.filter(
            (item) =>
              Boolean(
                item.last_notified_at
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
              Loading News Alerts...
            </h1>
            <p style={mutedStyle}>
              Checking your tracked
              companies for new
              stories.
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
              : "Check News"}
          </button>
        </div>

        <p style={eyebrowStyle}>
          Company news monitoring
        </p>

        <h1 style={titleStyle}>
          News Alerts
        </h1>

        <p style={mutedStyle}>
          Follow a stock and receive
          an in-app notification when
          TradePilot detects a newer
          company news article.
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
            label="Paused"
            value={String(
              stats.paused
            )}
          />
          <StatCard
            label="Alerts delivered"
            value={String(
              stats.notified
            )}
            color="#a78bfa"
          />
        </div>

        <section
          style={{
            ...createCardStyle,
            marginTop: 16,
          }}
        >
          <p style={eyebrowStyle}>
            New news monitor
          </p>
          <h2 style={{ margin: 0 }}>
            Create News Alert
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
                placeholder="AAPL"
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
                Watched companies
              </p>
              <h2 style={{ margin: 0 }}>
                Your News Alerts
              </h2>
            </div>

            <span style={mutedStyle}>
              {alerts.length} alerts
            </span>
          </div>

          {alerts.length === 0 ? (
            <EmptyState
              title="No news alerts yet"
              text="Enter a ticker above to start watching for new company news."
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
                    key={alert.id}
                    alert={alert}
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
            Uses your existing stock-news API
          </strong>
          <p
            style={{
              margin: "6px 0 0",
              ...mutedStyle,
              fontSize: 11,
              lineHeight: 1.55,
            }}
          >
            When you create an alert,
            TradePilot saves the newest
            article as the starting
            point so old stories do not
            immediately trigger alerts.
            While this page is open,
            active alerts are checked
            every five minutes.
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
  alert: NewsAlert;
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
          label="Last checked"
          value={
            alert.last_checked_at
              ? formatDateTime(
                  alert.last_checked_at
                )
              : "Not yet"
          }
        />

        <MiniStat
          label="Last alert"
          value={
            alert.last_notified_at
              ? formatDateTime(
                  alert.last_notified_at
                )
              : "None yet"
          }
        />
      </div>

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
          Open Stock News
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

function cleanText(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value
        .replace(
          /\s+/g,
          " "
        )
        .trim()
    : "";
}

function truncate(
  value: string,
  length: number
) {
  return value.length <=
    length
    ? value
    : `${value.slice(
        0,
        length - 1
      )}…`;
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