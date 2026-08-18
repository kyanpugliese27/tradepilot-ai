"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

type AchievementNotification = {
  id: string;
  user_id: string;
  type: "achievement";
  title: string;
  message: string;
  link: string | null;
  created_at: string;
};

const POLL_INTERVAL_MS = 3000;
const TOAST_DURATION_MS = 4200;

export default function AchievementToastProvider() {
  const [toast, setToast] =
    useState<AchievementNotification | null>(
      null
    );

  const seenIdsRef =
    useRef<Set<string>>(new Set());

  const queueRef =
    useRef<AchievementNotification[]>([]);

  const activeTimerRef =
    useRef<number | null>(null);

  const mountedRef =
    useRef(true);

  const showNextToast =
    useCallback(() => {
      if (
        toast ||
        queueRef.current.length === 0
      ) {
        return;
      }

      const next =
        queueRef.current.shift() || null;

      if (!next) {
        return;
      }

      setToast(next);

      if (
        activeTimerRef.current !== null
      ) {
        window.clearTimeout(
          activeTimerRef.current
        );
      }

      activeTimerRef.current =
        window.setTimeout(() => {
          if (!mountedRef.current) {
            return;
          }

          setToast(null);
          activeTimerRef.current =
            null;
        }, TOAST_DURATION_MS);
    }, [toast]);

  useEffect(() => {
    if (!toast) {
      showNextToast();
    }
  }, [toast, showNextToast]);

  useEffect(() => {
    mountedRef.current = true;

    const supabase = createClient();

    let pollTimer:
      | number
      | null = null;

    let channel:
      | ReturnType<
          typeof supabase.channel
        >
      | null = null;

    let cancelled = false;

    function enqueue(
      notification:
        AchievementNotification
    ) {
      if (
        seenIdsRef.current.has(
          notification.id
        )
      ) {
        return;
      }

      seenIdsRef.current.add(
        notification.id
      );

      queueRef.current.push(
        notification
      );

      setToast((current) => {
        if (current) {
          return current;
        }

        const next =
          queueRef.current.shift() ||
          null;

        if (!next) {
          return current;
        }

        return next;
      });
    }

    async function initialize() {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        cancelled ||
        userError ||
        !user
      ) {
        return;
      }

      const userId = user.id;

      const {
        data: existing,
        error: existingError,
      } = await supabase
        .from("notifications")
        .select(
          `
            id,
            user_id,
            type,
            title,
            message,
            link,
            created_at
          `
        )
        .eq("user_id", userId)
        .eq("type", "achievement")
        .order("created_at", {
          ascending: false,
        })
        .limit(50);

      if (
        cancelled ||
        existingError
      ) {
        return;
      }

      for (
        const item of
        (existing || [])
      ) {
        seenIdsRef.current.add(
          item.id
        );
      }

      channel = supabase
        .channel(
          `tradepilot-achievements-${userId}`
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const row =
              payload.new as
                AchievementNotification;

            if (
              row.type !==
              "achievement"
            ) {
              return;
            }

            enqueue(row);
          }
        )
        .subscribe();

      async function poll() {
        if (cancelled) {
          return;
        }

        const {
          data,
          error,
        } = await supabase
          .from("notifications")
          .select(
            `
              id,
              user_id,
              type,
              title,
              message,
              link,
              created_at
            `
          )
          .eq(
            "user_id",
            userId
          )
          .eq(
            "type",
            "achievement"
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          )
          .limit(10);

        if (
          !cancelled &&
          !error &&
          data
        ) {
          [...data]
            .reverse()
            .forEach(
              (item) =>
                enqueue(
                  item as AchievementNotification
                )
            );
        }

        if (!cancelled) {
          pollTimer =
            window.setTimeout(
              poll,
              POLL_INTERVAL_MS
            );
        }
      }

      pollTimer =
        window.setTimeout(
          poll,
          POLL_INTERVAL_MS
        );
    }

    initialize();

    return () => {
      cancelled = true;
      mountedRef.current = false;

      if (
        pollTimer !== null
      ) {
        window.clearTimeout(
          pollTimer
        );
      }

      if (
        activeTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          activeTimerRef.current
        );
      }

      if (channel) {
        supabase.removeChannel(
          channel
        );
      }
    };
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    if (
      activeTimerRef.current !== null
    ) {
      window.clearTimeout(
        activeTimerRef.current
      );
    }

    activeTimerRef.current =
      window.setTimeout(() => {
        setToast(null);
        activeTimerRef.current =
          null;
      }, TOAST_DURATION_MS);

    return () => {
      if (
        activeTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          activeTimerRef.current
        );
        activeTimerRef.current =
          null;
      }
    };
  }, [toast]);

  if (!toast) {
    return null;
  }

  const title =
    toast.title.replace(
      /^🏆\s*Achievement Unlocked:\s*/i,
      ""
    );

  return (
    <>
      <aside
        className="tradepilot-achievement-toast"
        role="status"
        aria-live="polite"
        style={toastStyle}
      >
        <button
          type="button"
          aria-label="Dismiss achievement"
          onClick={() =>
            setToast(null)
          }
          style={closeStyle}
        >
          ×
        </button>

        <div style={sparkleStyle}>
          ✨
        </div>

        <p style={eyebrowStyle}>
          Achievement Unlocked
        </p>

        <div style={contentRowStyle}>
          <div style={iconStyle}>
            🏆
          </div>

          <div
            style={{
              minWidth: 0,
            }}
          >
            <h3 style={titleStyle}>
              {title}
            </h3>

            <p style={messageStyle}>
              {toast.message}
            </p>
          </div>
        </div>

        <div style={footerStyle}>
          <span style={earnedStyle}>
            New TradePilot badge
          </span>

          <Link
            href={
              toast.link ||
              "/profile"
            }
            style={linkStyle}
            onClick={() =>
              setToast(null)
            }
          >
            View Profile →
          </Link>
        </div>

        <div
          className="tradepilot-achievement-progress"
          style={progressStyle}
        />
      </aside>

      <style jsx global>{`
        @keyframes tradepilotAchievementIn {
          0% {
            opacity: 0;
            transform:
              translate3d(28px, 18px, 0)
              scale(0.96);
          }

          65% {
            opacity: 1;
            transform:
              translate3d(-3px, 0, 0)
              scale(1.01);
          }

          100% {
            opacity: 1;
            transform:
              translate3d(0, 0, 0)
              scale(1);
          }
        }

        @keyframes tradepilotAchievementGlow {
          0%,
          100% {
            box-shadow:
              0 20px 60px
                rgba(0, 0, 0, 0.42),
              0 0 0
                rgba(251, 191, 36, 0);
          }

          50% {
            box-shadow:
              0 20px 60px
                rgba(0, 0, 0, 0.42),
              0 0 32px
                rgba(251, 191, 36, 0.18);
          }
        }

        @keyframes tradepilotAchievementProgress {
          from {
            transform:
              scaleX(1);
          }

          to {
            transform:
              scaleX(0);
          }
        }

        .tradepilot-achievement-toast {
          animation:
            tradepilotAchievementIn
              420ms
              cubic-bezier(
                0.2,
                0.8,
                0.2,
                1
              )
              both,
            tradepilotAchievementGlow
              1.6s
              ease-in-out
              2;
        }

        .tradepilot-achievement-progress {
          animation:
            tradepilotAchievementProgress
              ${TOAST_DURATION_MS}ms
              linear
              forwards;
        }

        @media
          (prefers-reduced-motion:
            reduce) {
          .tradepilot-achievement-toast,
          .tradepilot-achievement-progress {
            animation: none !important;
          }
        }

        @media
          (max-width: 620px) {
          .tradepilot-achievement-toast {
            left: 14px !important;
            right: 14px !important;
            bottom: 14px !important;
            width: auto !important;
            max-width: none !important;
          }
        }
      `}</style>
    </>
  );
}

const toastStyle = {
  position:
    "fixed" as const,
  right: 22,
  bottom: 22,
  zIndex: 10000,
  width: 390,
  maxWidth:
    "calc(100vw - 44px)",
  overflow: "hidden",
  padding: "18px 18px 14px",
  border:
    "1px solid rgba(251,191,36,0.3)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(20,27,40,0.98), rgba(7,17,31,0.99))",
  color: "white",
  boxShadow:
    "0 20px 60px rgba(0,0,0,0.42)",
  backdropFilter:
    "blur(18px)",
};

const closeStyle = {
  position:
    "absolute" as const,
  top: 10,
  right: 11,
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  border:
    "1px solid rgba(255,255,255,0.08)",
  borderRadius: "50%",
  background:
    "rgba(255,255,255,0.035)",
  color: "#9ca3af",
  fontSize: 17,
  cursor: "pointer",
};

const sparkleStyle = {
  position:
    "absolute" as const,
  top: 13,
  left: 16,
  fontSize: 13,
};

const eyebrowStyle = {
  margin: "0 34px 13px 23px",
  color: "#fbbf24",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform:
    "uppercase" as const,
};

const contentRowStyle = {
  display: "grid",
  gridTemplateColumns:
    "54px 1fr",
  gap: 13,
  alignItems: "center",
};

const iconStyle = {
  width: 54,
  height: 54,
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  border:
    "1px solid rgba(251,191,36,0.25)",
  borderRadius: 14,
  background:
    "rgba(251,191,36,0.08)",
  fontSize: 27,
};

const titleStyle = {
  margin: 0,
  fontSize: 17,
  lineHeight: 1.25,
};

const messageStyle = {
  margin: "6px 0 0",
  color: "#b8c0cc",
  fontSize: 11,
  lineHeight: 1.55,
};

const footerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent:
    "space-between",
  gap: 10,
  marginTop: 15,
  paddingTop: 12,
  borderTop:
    "1px solid rgba(255,255,255,0.07)",
};

const earnedStyle = {
  color: "#6b7280",
  fontSize: 9,
};

const linkStyle = {
  color: "#fbbf24",
  fontSize: 10,
  fontWeight: 850,
  textDecoration:
    "none",
};

const progressStyle = {
  position:
    "absolute" as const,
  left: 0,
  right: 0,
  bottom: 0,
  height: 3,
  background:
    "linear-gradient(90deg, #fbbf24, #fde68a)",
  transformOrigin:
    "left center",
};