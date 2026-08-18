"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type CommunityStats = {
  success: boolean;
  error?: string;
  community: {
    publicTraders: number;
    totalTrades: number;
    followConnections: number;
    achievementsEarned: number;
    activeTraders7d: number;
  };
  viewer: {
    following: number;
    followers: number;
    badges: number;
    trades: number;
  };
};

const communityItems = [
  {
    title: "Friends",
    description: "Find traders, manage friend requests, and view your Norvexa connections.",
    href: "/community/friends",
    icon: "👥",
    badge: "Connect",
  },
  {
    title: "Leaderboards",
    description: "See weekly, monthly, and all-time paper-trading rankings across the community.",
    href: "/community/leaderboards",
    icon: "🏆",
    badge: "Rankings",
  },
  {
    title: "Competitions",
    description: "Create and join virtual trading competitions with other Norvexa users.",
    href: "/community/competitions",
    icon: "🏁",
    badge: "Compete",
  },
  {
    title: "Public Portfolios",
    description: "Browse public paper-trading portfolios, strategies, returns, and shared holdings.",
    href: "/community/portfolios",
    icon: "📊",
    badge: "Discover",
  },
  {
    title: "Your Profile",
    description: "Edit your username, bio, profile picture, investing style, and community privacy.",
    href: "/profile",
    icon: "👤",
    badge: "Profile",
  },
];

export default function CommunityPage() {
  const router = useRouter();

  const [stats, setStats] =
    useState<CommunityStats | null>(
      null
    );

  const [loadingStats, setLoadingStats] =
    useState(true);

  const [statsError, setStatsError] =
    useState("");

  const loadStats =
    useCallback(async () => {
      const supabase =
        createClient();

      try {
        setStatsError("");

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
          data: result,
          error: rpcError,
        } = await supabase.rpc(
          "get_Norvexa_community_stats"
        );

        if (rpcError) {
          throw new Error(
            rpcError.message
          );
        }

        const response =
          result as CommunityStats;

        if (!response?.success) {
          throw new Error(
            response?.error ||
              "Unable to load community statistics."
          );
        }

        setStats(response);
      } catch (loadError) {
        setStatsError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load community statistics."
        );
      } finally {
        setLoadingStats(false);
      }
    }, [router]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <main style={pageStyle}>
      <section style={containerStyle}>
        <div style={topBarStyle}>
          <Link href="/dashboard" style={backLinkStyle}>
            ← Back to Dashboard
          </Link>
        </div>

        <p style={eyebrowStyle}>Norvexa social investing</p>
        <h1 style={titleStyle}>Community</h1>
        <p style={subtitleStyle}>
          Connect with other traders, compare paper-trading performance,
          compete in challenges, and discover public portfolios.
        </p>

        <section style={heroStyle}>
          <div>
            <p style={heroEyebrowStyle}>COMMUNITY HUB</p>
            <h2 style={heroTitleStyle}>
              Learn, compete, and grow with other Norvexa users.
            </h2>
            <p style={heroTextStyle}>
              Your Community hub brings together profiles, friends,
              leaderboards, competitions, and public portfolios in one place.
            </p>
          </div>

          <div style={heroBadgeStyle}>
            <span style={{ fontSize: 34 }}>🌐</span>
            <strong style={{ marginTop: 7 }}>Norvexa Community</strong>
            <span style={{ ...mutedStyle, fontSize: 10, marginTop: 4 }}>
              Paper-trading network
            </span>
          </div>
        </section>

        <section style={statsPanelStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <p style={statsEyebrowStyle}>
                Live community
              </p>

              <h2 style={{ margin: 0 }}>
                Community Statistics
              </h2>

              <p style={statsSubtitleStyle}>
                Real activity across the Norvexa
                paper-trading community.
              </p>
            </div>

            <button
              type="button"
              onClick={loadStats}
              disabled={loadingStats}
              style={refreshButtonStyle}
            >
              {loadingStats
                ? "Loading..."
                : "Refresh"}
            </button>
          </div>

          {statsError && (
            <div style={statsErrorStyle}>
              {statsError}
            </div>
          )}

          <div
            className="community-stats-grid"
            style={statsGridStyle}
          >
            <CommunityStat
              icon="👤"
              label="Public Traders"
              value={
                loadingStats
                  ? "—"
                  : formatNumber(
                      stats?.community
                        .publicTraders ?? 0
                    )
              }
              note="Visible community profiles"
            />

            <CommunityStat
              icon="⚡"
              label="Active This Week"
              value={
                loadingStats
                  ? "—"
                  : formatNumber(
                      stats?.community
                        .activeTraders7d ?? 0
                    )
              }
              note="Public traders with a trade in 7 days"
            />

            <CommunityStat
              icon="📈"
              label="Paper Trades"
              value={
                loadingStats
                  ? "—"
                  : formatNumber(
                      stats?.community
                        .totalTrades ?? 0
                    )
              }
              note="Trades recorded across Norvexa"
            />

            <CommunityStat
              icon="🔗"
              label="Follows"
              value={
                loadingStats
                  ? "—"
                  : formatNumber(
                      stats?.community
                        .followConnections ?? 0
                    )
              }
              note="Trader follow connections"
            />

            <CommunityStat
              icon="🏆"
              label="Achievements"
              value={
                loadingStats
                  ? "—"
                  : formatNumber(
                      stats?.community
                        .achievementsEarned ?? 0
                    )
              }
              note="Badges earned by users"
            />
          </div>

          {stats && (
            <div style={yourStatsStyle}>
              <span style={yourStatsTitleStyle}>
                Your community activity
              </span>

              <span>
                <strong>
                  {formatNumber(
                    stats.viewer.followers
                  )}
                </strong>{" "}
                followers
              </span>

              <span>
                <strong>
                  {formatNumber(
                    stats.viewer.following
                  )}
                </strong>{" "}
                following
              </span>

              <span>
                <strong>
                  {formatNumber(
                    stats.viewer.badges
                  )}
                </strong>{" "}
                badges
              </span>

              <span>
                <strong>
                  {formatNumber(
                    stats.viewer.trades
                  )}
                </strong>{" "}
                trades
              </span>
            </div>
          )}
        </section>

        <div className="community-grid" style={gridStyle}>
          {communityItems.map((item) => (
            <Link key={item.href} href={item.href} style={cardLinkStyle}>
              <article style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <div style={iconStyle}>{item.icon}</div>
                  <span style={badgeStyle}>{item.badge}</span>
                </div>

                <h2 style={cardTitleStyle}>{item.title}</h2>
                <p style={cardDescriptionStyle}>{item.description}</p>

                <div style={openRowStyle}>
                  <span>Open {item.title}</span>
                  <span>→</span>
                </div>
              </article>
            </Link>
          ))}
        </div>

        <section style={quickLinksStyle}>
          <div>
            <p style={eyebrowStyle}>Quick access</p>
            <h2 style={{ margin: 0 }}>Community Navigation</h2>
          </div>

          <div style={quickLinkRowStyle}>
            <Link href="/community/friends" style={smallLinkStyle}>👥 Friends</Link>
            <Link href="/community/leaderboards" style={smallLinkStyle}>🏆 Leaderboards</Link>
            <Link href="/community/competitions" style={smallLinkStyle}>🏁 Competitions</Link>
            <Link href="/community/portfolios" style={smallLinkStyle}>📊 Portfolios</Link>
            <Link href="/profile" style={smallLinkStyle}>👤 Profile</Link>
          </div>
        </section>

        <div style={noticeStyle}>
          <strong>Paper-trading community</strong>
          <p style={{ margin: "6px 0 0", ...mutedStyle, fontSize: 11, lineHeight: 1.55 }}>
            Community rankings, portfolios, and competitions are based on
            Norvexa virtual trading activity and are not verified
            real-money brokerage results.
          </p>
        </div>

        <style jsx>{`
          @media (max-width: 850px) {
            .community-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
          }

          @media (max-width: 560px) {
            .community-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </section>
    </main>
  );
}

function CommunityStat({
  icon,
  label,
  value,
  note,
}: {
  icon: string;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article style={statCardStyle}>
      <div style={statIconStyle}>
        {icon}
      </div>

      <div>
        <span style={statLabelStyle}>
          {label}
        </span>

        <strong style={statValueStyle}>
          {value}
        </strong>

        <span style={statNoteStyle}>
          {note}
        </span>
      </div>
    </article>
  );
}

function formatNumber(
  value: number
) {
  return new Intl.NumberFormat(
    "en-US"
  ).format(
    Number.isFinite(value)
      ? value
      : 0
  );
}

const statsPanelStyle = {
  marginTop: 18,
  padding: 20,
  border:
    "1px solid rgba(96,165,250,0.15)",
  borderRadius: 16,
  background:
    "linear-gradient(145deg, rgba(37,99,235,0.055), rgba(255,255,255,0.025))",
};

const sectionHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap" as const,
};

const statsEyebrowStyle = {
  margin: "0 0 6px",
  color: "#60a5fa",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: "0.11em",
  textTransform: "uppercase" as const,
};

const statsSubtitleStyle = {
  margin: "7px 0 0",
  color: "#9ca3af",
  fontSize: 10,
  lineHeight: 1.55,
};

const refreshButtonStyle = {
  padding: "8px 11px",
  border:
    "1px solid rgba(96,165,250,0.2)",
  borderRadius: 9,
  background:
    "rgba(37,99,235,0.07)",
  color: "#93c5fd",
  fontSize: 9,
  fontWeight: 850,
  cursor: "pointer",
};

const statsErrorStyle = {
  marginTop: 13,
  padding: "10px 12px",
  border:
    "1px solid rgba(239,68,68,0.22)",
  borderRadius: 10,
  background:
    "rgba(239,68,68,0.07)",
  color: "#ff8a8a",
  fontSize: 10,
};

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(5, minmax(0, 1fr))",
  gap: 10,
  marginTop: 16,
};

const statCardStyle = {
  display: "grid",
  gridTemplateColumns:
    "40px 1fr",
  gap: 10,
  alignItems: "center",
  padding: 13,
  border:
    "1px solid rgba(255,255,255,0.07)",
  borderRadius: 11,
  background:
    "rgba(255,255,255,0.025)",
};

const statIconStyle = {
  width: 40,
  height: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border:
    "1px solid rgba(96,165,250,0.15)",
  borderRadius: 10,
  background:
    "rgba(37,99,235,0.05)",
  fontSize: 18,
};

const statLabelStyle = {
  display: "block",
  color: "#9ca3af",
  fontSize: 8,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
};

const statValueStyle = {
  display: "block",
  marginTop: 3,
  color: "#f9fafb",
  fontSize: 19,
};

const statNoteStyle = {
  display: "block",
  marginTop: 3,
  color: "#6b7280",
  fontSize: 8,
  lineHeight: 1.35,
};

const yourStatsStyle = {
  display: "flex",
  gap: 13,
  alignItems: "center",
  flexWrap: "wrap" as const,
  marginTop: 13,
  padding: "10px 12px",
  border:
    "1px solid rgba(255,255,255,0.06)",
  borderRadius: 10,
  background:
    "rgba(255,255,255,0.02)",
  color: "#d1d5db",
  fontSize: 9,
};

const yourStatsTitleStyle = {
  color: "#93c5fd",
  fontWeight: 900,
};

const pageStyle = {
  minHeight: "100vh",
  padding: "32px 24px",
  background: "#07111f",
  color: "white",
};

const containerStyle = {
  maxWidth: 1200,
  margin: "0 auto",
};

const topBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap" as const,
  marginBottom: 28,
};

const eyebrowStyle = {
  margin: "0 0 7px",
  color: "#60a5fa",
  fontSize: 10,
  fontWeight: 850,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
};

const titleStyle = {
  margin: 0,
  fontSize: 42,
};

const subtitleStyle = {
  margin: "10px 0 0",
  maxWidth: 760,
  color: "#9ca3af",
  lineHeight: 1.65,
};

const mutedStyle = {
  color: "#9ca3af",
};

const heroStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 24,
  alignItems: "center",
  flexWrap: "wrap" as const,
  marginTop: 22,
  padding: 24,
  border: "1px solid rgba(96,165,250,0.2)",
  borderRadius: 17,
  background: "linear-gradient(145deg, rgba(37,99,235,0.1), rgba(168,85,247,0.05), rgba(255,255,255,0.025))",
};

const heroEyebrowStyle = {
  margin: "0 0 8px",
  color: "#93c5fd",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "0.12em",
};

const heroTitleStyle = {
  margin: 0,
  maxWidth: 650,
  fontSize: 28,
  lineHeight: 1.2,
};

const heroTextStyle = {
  margin: "10px 0 0",
  maxWidth: 680,
  color: "#9ca3af",
  fontSize: 12,
  lineHeight: 1.6,
};

const heroBadgeStyle = {
  minWidth: 190,
  padding: 18,
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  background: "rgba(255,255,255,0.03)",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  textAlign: "center" as const,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 14,
  marginTop: 16,
};

const cardLinkStyle = {
  textDecoration: "none",
  color: "inherit",
};

const cardStyle = {
  height: "100%",
  boxSizing: "border-box" as const,
  padding: 18,
  border: "1px solid rgba(255,255,255,0.085)",
  borderRadius: 14,
  background: "rgba(255,255,255,0.03)",
};

const cardHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const iconStyle = {
  width: 46,
  height: 46,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 12,
  background: "rgba(37,99,235,0.08)",
  border: "1px solid rgba(96,165,250,0.16)",
  fontSize: 22,
};

const badgeStyle = {
  padding: "5px 8px",
  border: "1px solid rgba(96,165,250,0.18)",
  borderRadius: 999,
  background: "rgba(37,99,235,0.05)",
  color: "#93c5fd",
  fontSize: 8,
  fontWeight: 850,
};

const cardTitleStyle = {
  margin: "16px 0 0",
  fontSize: 20,
};

const cardDescriptionStyle = {
  margin: "8px 0 0",
  minHeight: 58,
  color: "#9ca3af",
  fontSize: 11,
  lineHeight: 1.6,
};

const openRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  marginTop: 16,
  paddingTop: 13,
  borderTop: "1px solid rgba(255,255,255,0.06)",
  color: "#93c5fd",
  fontSize: 10,
  fontWeight: 850,
};

const quickLinksStyle = {
  marginTop: 16,
  padding: 19,
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  background: "rgba(255,255,255,0.028)",
};

const quickLinkRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap" as const,
  marginTop: 14,
};

const smallLinkStyle = {
  display: "inline-block",
  padding: "8px 10px",
  border: "1px solid rgba(96,165,250,0.18)",
  borderRadius: 8,
  background: "rgba(37,99,235,0.05)",
  color: "#93c5fd",
  fontSize: 10,
  fontWeight: 800,
  textDecoration: "none",
};

const backLinkStyle = {
  display: "inline-block",
  padding: "9px 13px",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 9,
  color: "#d1d5db",
  textDecoration: "none",
};

const noticeStyle = {
  marginTop: 16,
  padding: 15,
  border: "1px solid rgba(96,165,250,0.16)",
  borderRadius: 11,
  background: "rgba(37,99,235,0.04)",
  color: "#93c5fd",
};