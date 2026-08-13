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

type Direction =
  | "above"
  | "below";

type PriceAlert = {
  id: string;
  user_id: string;
  symbol: string;
  company_name: string | null;
  target_price: number | string;
  direction: Direction;
  triggered: boolean;
  triggered_at: string | null;
  last_checked_price: number | string | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

type Quote = {
  symbol: string;
  name?: string;
  price: number;
};

export default function PriceAlertsPage() {
  const router = useRouter();

  const [alerts, setAlerts] =
    useState<PriceAlert[]>([]);

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

  const [targetPrice, setTargetPrice] =
    useState("");

  const [direction, setDirection] =
    useState<Direction>("above");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const loadAlerts = useCallback(
    async (manual = false) => {
      const supabase = createClient();

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
          router.replace("/login");
          return;
        }

        const {
          data,
          error: alertError,
        } = await supabase
          .from("price_alerts")
          .select(
            `
              id,
              user_id,
              symbol,
              company_name,
              target_price,
              direction,
              triggered,
              triggered_at,
              last_checked_price,
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
              ascending: false,
            }
          );

        if (alertError) {
          throw new Error(
            alertError.message
          );
        }

        const loaded =
          (data as PriceAlert[]) ??
          [];

        setAlerts(loaded);

        await checkActiveAlerts(
          loaded,
          user.id
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load price alerts."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  const checkActiveAlerts =
    useCallback(
      async (
        sourceAlerts: PriceAlert[],
        userId: string
      ) => {
        const active =
          sourceAlerts.filter(
            (alert) =>
              !alert.triggered
          );

        if (
          active.length === 0
        ) {
          return;
        }

        const supabase =
          createClient();

        for (
          const alert of active
        ) {
          try {
            const response =
              await fetch(
                `/api/stock-details?symbol=${encodeURIComponent(
                  alert.symbol
                )}&refresh=${Date.now()}`,
                {
                  cache:
                    "no-store",
                }
              );

            const result =
              await response.json();

            if (
              !response.ok ||
              !result.stock
            ) {
              continue;
            }

            const quote =
              normalizeQuote(
                result.stock
              );

            const target =
              Number(
                alert.target_price
              );

            const triggered =
              alert.direction ===
              "above"
                ? quote.price >=
                  target
                : quote.price <=
                  target;

            await supabase
              .from(
                "price_alerts"
              )
              .update({
                last_checked_price:
                  quote.price,
                last_checked_at:
                  new Date().toISOString(),
                ...(triggered
                  ? {
                      triggered:
                        true,
                      triggered_at:
                        new Date().toISOString(),
                    }
                  : {}),
              })
              .eq(
                "id",
                alert.id
              );

            if (triggered) {
              const directionText =
                alert.direction ===
                "above"
                  ? "reached or moved above"
                  : "reached or moved below";

              await supabase
                .from(
                  "notifications"
                )
                .insert({
                  user_id:
                    userId,
                  type:
                    "price_alert",
                  title:
                    `${alert.symbol} Price Alert`,
                  message:
                    `${alert.symbol} ${directionText} your ${formatCurrency(
                      target
                    )} target. Current price: ${formatCurrency(
                      quote.price
                    )}.`,
                  symbol:
                    alert.symbol,
                  link:
                    `/stock/${alert.symbol}`,
                  is_read:
                    false,
                });
            }
          } catch {
            // A failed quote check should not block the rest.
          }
        }

        const {
          data: refreshed,
        } = await supabase
          .from(
            "price_alerts"
          )
          .select(
            `
              id,
              user_id,
              symbol,
              company_name,
              target_price,
              direction,
              triggered,
              triggered_at,
              last_checked_price,
              last_checked_at,
              created_at,
              updated_at
            `
          )
          .eq(
            "user_id",
            userId
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (
          refreshed
        ) {
          setAlerts(
            refreshed as PriceAlert[]
          );
        }
      },
      []
    );

  useEffect(() => {
    loadAlerts();

    const interval =
      window.setInterval(() => {
        loadAlerts(true);
      }, 60_000);

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

    const target =
      Number(
        targetPrice
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
      !Number.isFinite(
        target
      ) ||
      target <= 0
    ) {
      setError(
        "Enter a valid target price."
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
        router.replace("/login");
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

      const quote =
        normalizeQuote(
          quoteResult.stock
        );

      const {
        error: insertError,
      } = await supabase
        .from("price_alerts")
        .insert({
          user_id: user.id,
          symbol:
            normalizedSymbol,
          company_name:
            quote.name ||
            normalizedSymbol,
          target_price:
            target,
          direction,
          last_checked_price:
            quote.price,
          last_checked_at:
            new Date().toISOString(),
        });

      if (insertError) {
        throw new Error(
          insertError.message
        );
      }

      setSymbol("");
      setTargetPrice("");
      setDirection("above");

      setSuccess(
        `Price alert created for ${normalizedSymbol}.`
      );

      await loadAlerts(true);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create the price alert."
      );
    } finally {
      setCreating(false);
    }
  }

  async function resetAlert(
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
        error: updateError,
      } = await supabase
        .from(
          "price_alerts"
        )
        .update({
          triggered:
            false,
          triggered_at:
            null,
        })
        .eq(
          "id",
          alertId
        );

      if (updateError) {
        throw new Error(
          updateError.message
        );
      }

      setSuccess(
        "Price alert reactivated."
      );

      await loadAlerts(true);
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Unable to reactivate this alert."
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
          "price_alerts"
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
            !alert.triggered
        ).length;

      const triggered =
        alerts.filter(
          (alert) =>
            alert.triggered
        ).length;

      const above =
        alerts.filter(
          (alert) =>
            alert.direction ===
            "above"
        ).length;

      return {
        total:
          alerts.length,
        active,
        triggered,
        above,
      };
    }, [alerts]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <section style={containerStyle}>
          <div style={cardStyle}>
            <h1>
              Loading Price Alerts...
            </h1>

            <p style={mutedStyle}>
              Loading your saved
              targets and checking
              market prices.
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
              : "Check Prices"}
          </button>
        </div>

        <p style={eyebrowStyle}>
          Market monitoring
        </p>

        <h1 style={titleStyle}>
          Price Alerts
        </h1>

        <p style={mutedStyle}>
          Choose a stock, set a target,
          and TradePilot will create a
          notification when the target
          condition is met.
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
            label="Total alerts"
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
            label="Triggered"
            value={String(
              stats.triggered
            )}
            color="#fbbf24"
          />

          <StatCard
            label="Above targets"
            value={String(
              stats.above
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
            New alert
          </p>

          <h2 style={{ margin: 0 }}>
            Create Price Alert
          </h2>

          <form
            onSubmit={
              createAlert
            }
            className="create-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr auto auto",
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
                Target price
              </span>

              <input
                type="number"
                step="0.01"
                min="0.01"
                value={targetPrice}
                onChange={(event) =>
                  setTargetPrice(
                    event.target.value
                  )
                }
                placeholder="250.00"
                style={inputStyle}
              />
            </label>

            <label>
              <span
                style={
                  fieldLabelStyle
                }
              >
                Direction
              </span>

              <select
                value={direction}
                onChange={(event) =>
                  setDirection(
                    event.target
                      .value as Direction
                  )
                }
                style={
                  selectStyle
                }
              >
                <option value="above">
                  At or above
                </option>

                <option value="below">
                  At or below
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
                Saved targets
              </p>

              <h2 style={{ margin: 0 }}>
                Your Price Alerts
              </h2>
            </div>

            <span style={mutedStyle}>
              {alerts.length} alerts
            </span>
          </div>

          {alerts.length === 0 ? (
            <EmptyState
              title="No price alerts yet"
              text="Create your first target above."
            />
          ) : (
            <div
              className="alert-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(280px, 1fr))",
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
                    onReset={() =>
                      resetAlert(
                        alert.id
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
            Price checking
          </strong>

          <p
            style={{
              margin: "6px 0 0",
              ...mutedStyle,
              fontSize: 11,
              lineHeight: 1.55,
            }}
          >
            Active price alerts are
            checked when this page loads
            and every 60 seconds while it
            remains open. Triggered
            alerts are automatically
            added to your Notification
            Center.
          </p>
        </div>

        <style jsx>{`
          @media (max-width: 900px) {
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
  onReset,
  onDelete,
}: {
  alert: PriceAlert;
  working: boolean;
  onReset: () => void;
  onDelete: () => void;
}) {
  const target =
    Number(
      alert.target_price
    );

  const current =
    alert.last_checked_price ===
    null
      ? null
      : Number(
          alert.last_checked_price
        );

  const statusColor =
    alert.triggered
      ? "#fbbf24"
      : "#4ade80";

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
          {alert.triggered
            ? "Triggered"
            : "Active"}
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
          label="Target"
          value={formatCurrency(
            target
          )}
        />

        <MiniStat
          label="Last price"
          value={
            current === null
              ? "Not checked"
              : formatCurrency(
                  current
                )
          }
        />
      </div>

      <p
        style={{
          margin: "13px 0 0",
          color: "#d1d5db",
          fontSize: 11,
        }}
      >
        Notify when{" "}
        <strong>
          {alert.symbol}
        </strong>{" "}
        is{" "}
        <strong>
          {alert.direction ===
          "above"
            ? "at or above"
            : "at or below"}
        </strong>{" "}
        {formatCurrency(
          target
        )}
        .
      </p>

      {alert.last_checked_at && (
        <p
          style={{
            margin: "8px 0 0",
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
        {alert.triggered && (
          <button
            type="button"
            onClick={onReset}
            disabled={working}
            style={
              secondarySmallButtonStyle
            }
          >
            Reactivate
          </button>
        )}

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

function normalizeQuote(
  value:
    Record<string, unknown>
): Quote {
  return {
    symbol: String(
      value.symbol || ""
    ).toUpperCase(),
    name:
      typeof value.name ===
      "string"
        ? value.name
        : "",
    price:
      toNumber(
        value.price
      ),
  };
}

function toNumber(
  value: unknown
) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
}

function formatCurrency(
  value: number
) {
  return value.toLocaleString(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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

const selectStyle = {
  minWidth: 145,
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