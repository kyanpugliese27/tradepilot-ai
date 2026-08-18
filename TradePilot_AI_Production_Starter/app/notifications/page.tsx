"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NotificationType =
  | "price_alert"
  | "earnings_alert"
  | "news_alert"
  | "dividend_alert"
  | "friend_request"
  | "competition"
  | "achievement";

type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  symbol: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

type FilterType =
  | "all"
  | "unread"
  | NotificationType;

export default function NotificationsPage() {
  const router = useRouter();

  const [notifications, setNotifications] =
    useState<NotificationRow[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [workingId, setWorkingId] =
    useState<string | null>(null);

  const [filter, setFilter] =
    useState<FilterType>("all");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const loadNotifications = useCallback(
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
          error:
            notificationError,
        } = await supabase
          .from("notifications")
          .select(
            `
              id,
              user_id,
              type,
              title,
              message,
              symbol,
              link,
              is_read,
              created_at
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

        if (
          notificationError
        ) {
          throw new Error(
            notificationError.message
          );
        }

        setNotifications(
          (data as NotificationRow[]) ??
            []
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load notifications."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    loadNotifications();

    const interval =
      window.setInterval(() => {
        loadNotifications(true);
      }, 60_000);

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [loadNotifications]);

  const visibleNotifications =
    useMemo(() => {
      if (filter === "all") {
        return notifications;
      }

      if (filter === "unread") {
        return notifications.filter(
          (notification) =>
            !notification.is_read
        );
      }

      return notifications.filter(
        (notification) =>
          notification.type ===
          filter
      );
    }, [
      notifications,
      filter,
    ]);

  const stats = useMemo(() => {
    const unread =
      notifications.filter(
        (notification) =>
          !notification.is_read
      ).length;

    const price =
      notifications.filter(
        (notification) =>
          notification.type ===
          "price_alert"
      ).length;

    const market =
      notifications.filter(
        (notification) =>
          [
            "earnings_alert",
            "news_alert",
            "dividend_alert",
          ].includes(
            notification.type
          )
      ).length;

    const community =
      notifications.filter(
        (notification) =>
          [
            "friend_request",
            "competition",
          ].includes(
            notification.type
          )
      ).length;

    const achievements =
      notifications.filter(
        (notification) =>
          notification.type ===
          "achievement"
      ).length;

    return {
      unread,
      price,
      market,
      community,
      achievements,
    };
  }, [notifications]);

  async function markRead(
    notificationId: string
  ) {
    const supabase =
      createClient();

    try {
      setWorkingId(
        notificationId
      );

      setError("");
      setSuccess("");

      const {
        error: updateError,
      } = await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq(
          "id",
          notificationId
        );

      if (updateError) {
        throw new Error(
          updateError.message
        );
      }

      setNotifications(
        (current) =>
          current.map(
            (notification) =>
              notification.id ===
              notificationId
                ? {
                    ...notification,
                    is_read:
                      true,
                  }
                : notification
          )
      );
    } catch (readError) {
      setError(
        readError instanceof Error
          ? readError.message
          : "Unable to mark notification as read."
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function markAllRead() {
    const supabase =
      createClient();

    try {
      setRefreshing(true);
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

      const {
        error: updateError,
      } = await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "is_read",
          false
        );

      if (updateError) {
        throw new Error(
          updateError.message
        );
      }

      setNotifications(
        (current) =>
          current.map(
            (notification) => ({
              ...notification,
              is_read: true,
            })
          )
      );

      setSuccess(
        "All notifications marked as read."
      );
    } catch (markError) {
      setError(
        markError instanceof Error
          ? markError.message
          : "Unable to mark all notifications as read."
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function deleteNotification(
    notificationId: string
  ) {
    const supabase =
      createClient();

    try {
      setWorkingId(
        notificationId
      );

      setError("");
      setSuccess("");

      const {
        error: deleteError,
      } = await supabase
        .from("notifications")
        .delete()
        .eq(
          "id",
          notificationId
        );

      if (deleteError) {
        throw new Error(
          deleteError.message
        );
      }

      setNotifications(
        (current) =>
          current.filter(
            (notification) =>
              notification.id !==
              notificationId
          )
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete notification."
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function clearReadNotifications() {
    const confirmed =
      window.confirm(
        "Delete all read notifications?"
      );

    if (!confirmed) {
      return;
    }

    const supabase =
      createClient();

    try {
      setRefreshing(true);
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

      const {
        error: deleteError,
      } = await supabase
        .from("notifications")
        .delete()
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "is_read",
          true
        );

      if (deleteError) {
        throw new Error(
          deleteError.message
        );
      }

      setNotifications(
        (current) =>
          current.filter(
            (notification) =>
              !notification.is_read
          )
      );

      setSuccess(
        "Read notifications cleared."
      );
    } catch (clearError) {
      setError(
        clearError instanceof Error
          ? clearError.message
          : "Unable to clear read notifications."
      );
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <section style={containerStyle}>
          <div style={cardStyle}>
            <h1>
              Loading Notifications...
            </h1>

            <p style={mutedStyle}>
              Loading your Norvexa
              alerts and community
              updates.
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
              href="/notifications/price-alerts"
              style={alertManagerButtonStyle}
            >
              💵 Price Alerts
            </Link>

            <Link
              href="/notifications/earnings-alerts"
              style={alertManagerButtonStyle}
            >
              📅 Earnings Alerts
            </Link>

            <Link
              href="/notifications/news-alerts"
              style={alertManagerButtonStyle}
            >
              📰 News Alerts
            </Link>

            <Link
              href="/notifications/dividend-alerts"
              style={alertManagerButtonStyle}
            >
              💰 Dividend Alerts
            </Link>

            <button
              type="button"
              onClick={
                markAllRead
              }
              disabled={
                refreshing ||
                stats.unread === 0
              }
              style={
                secondaryButtonStyle
              }
            >
              Mark All Read
            </button>

            <button
              type="button"
              onClick={
                clearReadNotifications
              }
              disabled={refreshing}
              style={
                secondaryButtonStyle
              }
            >
              Clear Read
            </button>

            <button
              type="button"
              onClick={() =>
                loadNotifications(
                  true
                )
              }
              disabled={refreshing}
              style={
                secondaryButtonStyle
              }
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>
        </div>

        <p style={eyebrowStyle}>
          Alerts and updates
        </p>

        <h1 style={titleStyle}>
          Notification Center
        </h1>

        <p style={mutedStyle}>
          Keep track of market alerts,
          earnings, news, dividends,
          friend requests, and
          competition updates.
        </p>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginTop: 16,
          }}
        >
          <Link
            href="/notifications/price-alerts"
            style={alertManagerButtonStyle}
          >
            💵 Manage Price Alerts
          </Link>

          <Link
            href="/notifications/earnings-alerts"
            style={alertManagerButtonStyle}
          >
            📅 Manage Earnings Alerts
          </Link>

          <Link
            href="/notifications/news-alerts"
            style={alertManagerButtonStyle}
          >
            📰 Manage News Alerts
          </Link>

          <Link
            href="/notifications/dividend-alerts"
            style={alertManagerButtonStyle}
          >
            💰 Manage Dividend Alerts
          </Link>
        </div>

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
              "repeat(5, minmax(0, 1fr))",
            gap: 12,
            marginTop: 22,
          }}
        >
          <StatCard
            label="Unread"
            value={String(
              stats.unread
            )}
            color={
              stats.unread > 0
                ? "#fbbf24"
                : "#f9fafb"
            }
          />

          <StatCard
            label="Price alerts"
            value={String(
              stats.price
            )}
          />

          <StatCard
            label="Market updates"
            value={String(
              stats.market
            )}
          />

          <StatCard
            label="Community"
            value={String(
              stats.community
            )}
          />

          <StatCard
            label="Achievements"
            value={String(
              stats.achievements
            )}
            color={
              stats.achievements > 0
                ? "#fbbf24"
                : "#f9fafb"
            }
          />
        </div>

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
                Inbox
              </p>

              <h2 style={{ margin: 0 }}>
                Your Notifications
              </h2>
            </div>

            <span style={mutedStyle}>
              {
                visibleNotifications.length
              }{" "}
              shown
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 15,
            }}
          >
            <FilterButton
              label="All"
              active={
                filter === "all"
              }
              onClick={() =>
                setFilter("all")
              }
            />

            <FilterButton
              label={`Unread (${stats.unread})`}
              active={
                filter === "unread"
              }
              onClick={() =>
                setFilter(
                  "unread"
                )
              }
            />

            <FilterButton
              label="Price"
              active={
                filter ===
                "price_alert"
              }
              onClick={() =>
                setFilter(
                  "price_alert"
                )
              }
            />

            <FilterButton
              label="Earnings"
              active={
                filter ===
                "earnings_alert"
              }
              onClick={() =>
                setFilter(
                  "earnings_alert"
                )
              }
            />

            <FilterButton
              label="News"
              active={
                filter ===
                "news_alert"
              }
              onClick={() =>
                setFilter(
                  "news_alert"
                )
              }
            />

            <FilterButton
              label="Dividends"
              active={
                filter ===
                "dividend_alert"
              }
              onClick={() =>
                setFilter(
                  "dividend_alert"
                )
              }
            />

            <FilterButton
              label="Friends"
              active={
                filter ===
                "friend_request"
              }
              onClick={() =>
                setFilter(
                  "friend_request"
                )
              }
            />

            <FilterButton
              label="Competitions"
              active={
                filter ===
                "competition"
              }
              onClick={() =>
                setFilter(
                  "competition"
                )
              }
            />

            <FilterButton
              label="Achievements"
              active={
                filter ===
                "achievement"
              }
              onClick={() =>
                setFilter(
                  "achievement"
                )
              }
            />
          </div>

          {visibleNotifications.length ===
          0 ? (
            <EmptyState
              title="No notifications here"
              text={
                notifications.length ===
                0
                  ? "Your Norvexa alerts and updates will appear here."
                  : "There are no notifications matching this filter."
              }
            />
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection:
                  "column",
                gap: 10,
                marginTop: 16,
              }}
            >
              {visibleNotifications.map(
                (notification) => (
                  <NotificationCard
                    key={
                      notification.id
                    }
                    notification={
                      notification
                    }
                    working={
                      workingId ===
                      notification.id
                    }
                    onMarkRead={() =>
                      markRead(
                        notification.id
                      )
                    }
                    onDelete={() =>
                      deleteNotification(
                        notification.id
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
            Notification preferences
          </strong>

          <p
            style={{
              margin: "6px 0 0",
              ...mutedStyle,
              fontSize: 11,
              lineHeight: 1.55,
            }}
          >
            This page is the central
            inbox. Next, Price Alerts,
            Earnings Alerts, News
            Alerts, and Dividend Alerts
            will create notifications
            here automatically.
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
            .stats-grid {
              grid-template-columns:
                1fr !important;
            }
          }
        `}</style>
      </section>
    </main>
  );
}

function NotificationCard({
  notification,
  working,
  onMarkRead,
  onDelete,
}: {
  notification: NotificationRow;
  working: boolean;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  const meta =
    getNotificationMeta(
      notification.type
    );

  return (
    <article
      style={{
        ...notificationCardStyle,
        border:
          notification.is_read
            ? notificationCardStyle.border
            : `1px solid ${meta.color}55`,
        background:
          notification.is_read
            ? notificationCardStyle.background
            : `${meta.color}0d`,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 13,
          alignItems:
            "flex-start",
        }}
      >
        <div
          style={{
            ...iconStyle,
            border:
              `1px solid ${meta.color}44`,
            background:
              `${meta.color}12`,
          }}
        >
          {meta.icon}
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={
              sectionHeaderStyle
            }
          >
            <div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap:
                    "wrap",
                  alignItems:
                    "center",
                }}
              >
                <strong
                  style={{
                    fontSize: 15,
                  }}
                >
                  {
                    notification.title
                  }
                </strong>

                {!notification.is_read && (
                  <span
                    style={{
                      ...unreadBadgeStyle,
                      color:
                        meta.color,
                      border:
                        `1px solid ${meta.color}44`,
                      background:
                        `${meta.color}10`,
                    }}
                  >
                    New
                  </span>
                )}
              </div>

              <p
                style={{
                  margin:
                    "5px 0 0",
                  color:
                    meta.color,
                  fontSize: 9,
                  fontWeight:
                    850,
                  textTransform:
                    "uppercase",
                }}
              >
                {meta.label}
              </p>
            </div>

            <span
              style={{
                ...mutedStyle,
                fontSize: 9,
              }}
            >
              {formatRelativeDate(
                notification.created_at
              )}
            </span>
          </div>

          <p
            style={{
              margin: "11px 0 0",
              color: "#d1d5db",
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            {notification.message}
          </p>

          {notification.symbol && (
            <Link
              href={`/stock/${notification.symbol}`}
              style={symbolLinkStyle}
            >
              {notification.symbol}
            </Link>
          )}

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 13,
            }}
          >
            {notification.link && (
              <Link
                href={
                  notification.link
                }
                onClick={
                  !notification.is_read
                    ? onMarkRead
                    : undefined
                }
                style={
                  primarySmallLinkStyle
                }
              >
                Open
              </Link>
            )}

            {!notification.is_read && (
              <button
                type="button"
                onClick={
                  onMarkRead
                }
                disabled={working}
                style={
                  secondarySmallButtonStyle
                }
              >
                {working
                  ? "Working..."
                  : "Mark Read"}
              </button>
            )}

            <button
              type="button"
              onClick={
                onDelete
              }
              disabled={working}
              style={
                dangerSmallButtonStyle
              }
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function FilterButton({
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
        padding: "8px 10px",
        border: active
          ? "1px solid rgba(96,165,250,0.34)"
          : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 9,
        background: active
          ? "rgba(37,99,235,0.09)"
          : "rgba(255,255,255,0.025)",
        color: active
          ? "#93c5fd"
          : "#9ca3af",
        fontSize: 10,
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
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

function getNotificationMeta(
  type: NotificationType
) {
  if (
    type === "price_alert"
  ) {
    return {
      icon: "💵",
      label: "Price Alert",
      color: "#4ade80",
    };
  }

  if (
    type === "earnings_alert"
  ) {
    return {
      icon: "📅",
      label: "Earnings Alert",
      color: "#60a5fa",
    };
  }

  if (
    type === "news_alert"
  ) {
    return {
      icon: "📰",
      label: "News Alert",
      color: "#a78bfa",
    };
  }

  if (
    type === "dividend_alert"
  ) {
    return {
      icon: "💰",
      label: "Dividend Alert",
      color: "#fbbf24",
    };
  }

  if (
    type === "friend_request"
  ) {
    return {
      icon: "👥",
      label:
        "Friend Request",
      color: "#22d3ee",
    };
  }

  if (
    type === "achievement"
  ) {
    return {
      icon: "🏆",
      label:
        "Achievement",
      color: "#fbbf24",
    };
  }

  return {
    icon: "🏆",
    label:
      "Competition Update",
    color: "#fb923c",
  };
}

function formatRelativeDate(
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

  const difference =
    Date.now() -
    date.getTime();

  const minute =
    60_000;

  const hour =
    60 * minute;

  const day =
    24 * hour;

  if (
    difference <
    minute
  ) {
    return "Just now";
  }

  if (
    difference <
    hour
  ) {
    return `${Math.floor(
      difference /
        minute
    )}m ago`;
  }

  if (
    difference <
    day
  ) {
    return `${Math.floor(
      difference /
        hour
    )}h ago`;
  }

  if (
    difference <
    7 * day
  ) {
    return `${Math.floor(
      difference /
        day
    )}d ago`;
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

const notificationCardStyle = {
  padding: 16,
  border:
    "1px solid rgba(255,255,255,0.075)",
  borderRadius: 12,
  background:
    "rgba(255,255,255,0.025)",
};

const iconStyle = {
  width: 44,
  height: 44,
  flex: "0 0 auto",
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  borderRadius: 11,
  fontSize: 20,
};

const unreadBadgeStyle = {
  display: "inline-block",
  padding: "4px 7px",
  borderRadius: 999,
  fontSize: 8,
  fontWeight: 850,
};

const symbolLinkStyle = {
  display: "inline-block",
  marginTop: 10,
  padding: "5px 8px",
  border:
    "1px solid rgba(96,165,250,0.18)",
  borderRadius: 999,
  background:
    "rgba(37,99,235,0.05)",
  color: "#93c5fd",
  fontSize: 9,
  fontWeight: 850,
  textDecoration: "none",
};

const primarySmallLinkStyle = {
  display: "inline-block",
  padding: "8px 10px",
  border: "none",
  borderRadius: 8,
  background: "#2563eb",
  color: "white",
  fontSize: 10,
  fontWeight: 800,
  textDecoration: "none",
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

const alertManagerButtonStyle = {
  display: "inline-block",
  padding: "9px 12px",
  border:
    "1px solid rgba(167,139,250,0.25)",
  borderRadius: 9,
  background:
    "rgba(139,92,246,0.08)",
  color: "#c4b5fd",
  fontWeight: 800,
  textDecoration: "none",
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

const backLinkStyle = {
  display: "inline-block",
  padding: "9px 13px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  borderRadius: 9,
  color: "#d1d5db",
  textDecoration: "none",
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