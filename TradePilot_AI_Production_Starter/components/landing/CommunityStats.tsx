"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

type LandingStatsResponse = {
  success: boolean;
  error?: string;
  stats?: {
    publicTraders: number;
    totalTrades: number;
    followConnections: number;
    achievementsEarned: number;
    activeTraders7d: number;
    premiumMembers: number;
  };
};

export default function CommunityStats() {
  const sectionRef =
    useRef<HTMLElement | null>(
      null
    );

  const [stats, setStats] =
    useState<
      LandingStatsResponse["stats"] | null
    >(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadStats =
    useCallback(async () => {
      const supabase =
        createClient();

      try {
        setLoading(true);
        setError("");

        const {
          data,
          error: rpcError,
        } = await supabase.rpc(
          "get_tradepilot_public_landing_stats"
        );

        if (rpcError) {
          throw new Error(
            rpcError.message
          );
        }

        const response =
          data as LandingStatsResponse;

        if (
          !response?.success ||
          !response.stats
        ) {
          throw new Error(
            response?.error ||
              "Unable to load community statistics."
          );
        }

        setStats(
          response.stats
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load community statistics."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    const node =
      sectionRef.current;

    if (!node) {
      return;
    }

    const targets =
      node.querySelectorAll(
        "[data-reveal]"
      );

    const observer =
      new IntersectionObserver(
        (entries) => {
          entries.forEach(
            (entry) => {
              if (
                entry.isIntersecting
              ) {
                entry.target.classList.add(
                  "tp-visible"
                );
              }
            }
          );
        },
        {
          threshold: 0.12,
        }
      );

    targets.forEach(
      (target) =>
        observer.observe(target)
    );

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <section
      ref={sectionRef}
      style={sectionStyle}
    >
      <div style={innerStyle}>
        <div
          data-reveal
          className="tp-reveal"
          style={headerStyle}
        >
          <div>
            <p style={eyebrowStyle}>
              LIVE TRADEPILOT ACTIVITY
            </p>

            <h2 style={titleStyle}>
              Real activity.
              <br />
              Real community.
            </h2>

            <p style={subtitleStyle}>
              These numbers come from TradePilot itself,
              so the homepage grows as the platform grows.
            </p>
          </div>

          <div style={liveBadgeStyle}>
            <span style={liveDotStyle} />
            Live database totals
          </div>
        </div>

        {error && (
          <div style={errorStyle}>
            <strong>
              Community stats unavailable.
            </strong>

            <span style={errorTextStyle}>
              {error}
            </span>
          </div>
        )}

        <div
          data-reveal
          className="landing-stats-grid tp-reveal"
          style={statsGridStyle}
        >
          <StatCard
            icon="👤"
            label="Public Traders"
            value={
              loading
                ? "—"
                : formatNumber(
                    stats?.publicTraders
                  )
            }
            text="Community profiles visible to other traders."
          />

          <StatCard
            icon="⚡"
            label="Active This Week"
            value={
              loading
                ? "—"
                : formatNumber(
                    stats?.activeTraders7d
                  )
            }
            text="Public traders with paper-trading activity in the last 7 days."
          />

          <StatCard
            icon="📈"
            label="Paper Trades"
            value={
              loading
                ? "—"
                : formatNumber(
                    stats?.totalTrades
                  )
            }
            text="Trades recorded across TradePilot paper portfolios."
          />

          <StatCard
            icon="🔗"
            label="Follow Connections"
            value={
              loading
                ? "—"
                : formatNumber(
                    stats?.followConnections
                  )
            }
            text="Connections created through the trader follow system."
          />

          <StatCard
            icon="🏆"
            label="Achievements Earned"
            value={
              loading
                ? "—"
                : formatNumber(
                    stats?.achievementsEarned
                  )
            }
            text="Badges unlocked through activity and progress."
          />

          <StatCard
            icon="⭐"
            label="Premium Members"
            value={
              loading
                ? "—"
                : formatNumber(
                    stats?.premiumMembers
                  )
            }
            text="Active TradePilot Premium memberships."
            premium
          />
        </div>

        <div
          data-reveal
          className="tp-reveal"
          style={bottomNoteStyle}
        >
          <span>
            Updated when this page loads.
          </span>

          <button
            type="button"
            onClick={loadStats}
            disabled={loading}
            style={{
              ...refreshButtonStyle,
              opacity: loading
                ? 0.55
                : 1,
              cursor: loading
                ? "wait"
                : "pointer",
            }}
          >
            {loading
              ? "Refreshing..."
              : "Refresh totals"}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .tp-reveal {
          opacity: 0;
          transform: translateY(22px);
          transition:
            opacity 650ms ease,
            transform 650ms ease;
        }

        .tp-reveal.tp-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .landing-stat-card {
          transition:
            transform 220ms ease,
            box-shadow 220ms ease,
            border-color 220ms ease;
        }

        .landing-stat-card:hover {
          transform: translateY(-5px);
          box-shadow:
            0 28px 75px rgba(0,0,0,0.22);
        }

        .landing-stats-grid
        > .landing-stat-card:nth-child(1) {
          transition-delay: 40ms;
        }

        .landing-stats-grid
        > .landing-stat-card:nth-child(2) {
          transition-delay: 80ms;
        }

        .landing-stats-grid
        > .landing-stat-card:nth-child(3) {
          transition-delay: 120ms;
        }

        .landing-stats-grid
        > .landing-stat-card:nth-child(4) {
          transition-delay: 160ms;
        }

        .landing-stats-grid
        > .landing-stat-card:nth-child(5) {
          transition-delay: 200ms;
        }

        .landing-stats-grid
        > .landing-stat-card:nth-child(6) {
          transition-delay: 240ms;
        }

        @media (prefers-reduced-motion: reduce) {
          .tp-reveal,
          .tp-reveal.tp-visible,
          .landing-stat-card {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
        }

        @media (max-width: 980px) {
          .landing-stats-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 620px) {
          .landing-stats-grid {
            grid-template-columns:
              1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
  text,
  premium = false,
}: {
  icon: string;
  label: string;
  value: string;
  text: string;
  premium?: boolean;
}) {
  return (
    <article
      className="landing-stat-card"
      style={{
        ...cardStyle,
        border: premium
          ? "1px solid rgba(251,191,36,0.18)"
          : cardStyle.border,
        background: premium
          ? "linear-gradient(145deg, rgba(245,158,11,0.055), rgba(255,255,255,0.02))"
          : cardStyle.background,
      }}
    >
      <div
        style={{
          ...iconStyle,
          color: premium
            ? "#fbbf24"
            : "#93c5fd",
          border: premium
            ? "1px solid rgba(251,191,36,0.15)"
            : iconStyle.border,
          background: premium
            ? "rgba(245,158,11,0.05)"
            : iconStyle.background,
        }}
      >
        {icon}
      </div>

      <span style={labelStyle}>
        {label}
      </span>

      <strong
        style={{
          ...valueStyle,
          color: premium
            ? "#fbbf24"
            : "#f8fafc",
        }}
      >
        {value}
      </strong>

      <p style={textStyle}>
        {text}
      </p>
    </article>
  );
}

function formatNumber(
  value: number | undefined
) {
  return new Intl.NumberFormat(
    "en-US"
  ).format(
    Number.isFinite(value)
      ? value!
      : 0
  );
}

const sectionStyle = {
  background:
    "linear-gradient(180deg, #07111f 0%, #050b15 100%)",
  color: "#f8fafc",
};

const innerStyle = {
  width: "100%",
  maxWidth: 1440,
  margin: "0 auto",
  padding: "105px 28px 110px",
};

const headerStyle = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 24,
  flexWrap: "wrap" as const,
};

const eyebrowStyle = {
  margin: 0,
  color: "#60a5fa",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "0.14em",
};

const titleStyle = {
  margin: "14px 0 0",
  maxWidth: 700,
  fontSize:
    "clamp(34px, 4.3vw, 58px)",
  lineHeight: 1.04,
  letterSpacing: "-0.045em",
};

const subtitleStyle = {
  maxWidth: 620,
  margin: "17px 0 0",
  color: "#8490a0",
  fontSize: 14,
  lineHeight: 1.65,
};

const liveBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 11px",
  border:
    "1px solid rgba(74,222,128,0.14)",
  borderRadius: 999,
  background:
    "rgba(34,197,94,0.045)",
  color: "#86efac",
  fontSize: 8,
  fontWeight: 850,
};

const liveDotStyle = {
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: "#4ade80",
  boxShadow:
    "0 0 12px rgba(74,222,128,0.7)",
};

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: 13,
  marginTop: 38,
};

const cardStyle = {
  minHeight: 240,
  padding: 20,
  border:
    "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16,
  background:
    "linear-gradient(145deg, rgba(37,99,235,0.035), rgba(255,255,255,0.02))",
  boxShadow:
    "0 22px 60px rgba(0,0,0,0.16)",
};

const iconStyle = {
  width: 40,
  height: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border:
    "1px solid rgba(96,165,250,0.14)",
  borderRadius: 11,
  background:
    "rgba(37,99,235,0.05)",
  color: "#93c5fd",
  fontSize: 17,
};

const labelStyle = {
  display: "block",
  marginTop: 20,
  color: "#7a8798",
  fontSize: 8,
  fontWeight: 900,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
};

const valueStyle = {
  display: "block",
  marginTop: 6,
  fontSize:
    "clamp(28px, 3vw, 42px)",
  lineHeight: 1,
  letterSpacing: "-0.04em",
};

const textStyle = {
  margin: "12px 0 0",
  color: "#6f7b8c",
  fontSize: 9,
  lineHeight: 1.55,
};

const bottomNoteStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap" as const,
  marginTop: 15,
  padding: "12px 14px",
  border:
    "1px solid rgba(255,255,255,0.05)",
  borderRadius: 11,
  background:
    "rgba(255,255,255,0.015)",
  color: "#64748b",
  fontSize: 8,
};

const refreshButtonStyle = {
  padding: "8px 10px",
  border:
    "1px solid rgba(96,165,250,0.15)",
  borderRadius: 8,
  background:
    "rgba(37,99,235,0.05)",
  color: "#93c5fd",
  fontSize: 8,
  fontWeight: 850,
};

const errorStyle = {
  display: "grid",
  gap: 4,
  marginTop: 22,
  padding: "11px 13px",
  border:
    "1px solid rgba(239,68,68,0.18)",
  borderRadius: 10,
  background:
    "rgba(239,68,68,0.05)",
  color: "#ff9a9a",
  fontSize: 9,
};

const errorTextStyle = {
  color: "#b97b7b",
  fontSize: 8,
};