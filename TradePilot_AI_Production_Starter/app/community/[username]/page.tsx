"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PublicProfileResponse = {
  found: boolean;
  reason?: "not_found" | "private";
  viewerIsOwner?: boolean;
  profile?: {
    userId: string;
    username: string;
    displayName: string;
    bio: string;
    avatarUrl: string | null;
    investingStyle: string;
    profileVisibility: string;
    createdAt: string;
    updatedAt: string;
  };
  visibility?: {
    showPortfolioValue: boolean;
    showPortfolioReturn: boolean;
    showHoldings: boolean;
    showRecentTrades: boolean;
    showWinRate: boolean;
  };
  stats?: {
    portfolioValue: number | null;
    portfolioReturn: number | null;
    portfolioReturnPercent: number | null;
    winRate: number | null;
    holdingsCount: number;
    sellCount: number;
  };
  holdings?: Array<{
    symbol: string;
    shares: number;
    averageCost: number;
    updatedAt: string;
  }>;
  recentTrades?: Array<{
    id: string;
    symbol: string;
    transactionType: "buy" | "sell";
    shares: number;
    price: number;
    totalAmount: number;
    realizedGainLoss: number | null;
    createdAt: string;
  }>;
  achievements?: Array<{
    slug: string;
    name: string;
    icon: string;
    description: string;
    category: string;
    earnedAt: string;
  }>;
};

type FollowStatus = {
  success: boolean;
  error?: string;
  isOwnProfile: boolean;
  canFollow: boolean;
  following: boolean;
  followers: number;
  followingCount: number;
};

export default function PublicCommunityProfilePage() {
  const params = useParams();
  const router = useRouter();

  const username = String(
    params.username || ""
  )
    .trim()
    .toLowerCase();

  const [data, setData] =
    useState<PublicProfileResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [followStatus, setFollowStatus] =
    useState<FollowStatus | null>(null);

  const [followWorking, setFollowWorking] =
    useState(false);

  const [followError, setFollowError] =
    useState("");

  const [shareMessage, setShareMessage] =
    useState("");

  const loadProfile = useCallback(
    async () => {
      const supabase = createClient();

      try {
        setLoading(true);
        setError("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        const {
          data: result,
          error: rpcError,
        } = await supabase.rpc(
          "get_Norvexa_public_profile",
          {
            requested_username:
              username,
          }
        );

        if (rpcError) {
          throw new Error(
            rpcError.message
          );
        }

        setData(
          result as PublicProfileResponse
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load this community profile."
        );
      } finally {
        setLoading(false);
      }
    },
    [router, username]
  );

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const loadFollowStatus =
    useCallback(async () => {
      if (!username) {
        return;
      }

      const supabase =
        createClient();

      try {
        setFollowError("");

        const {
          data: result,
          error: rpcError,
        } = await supabase.rpc(
          "get_Norvexa_follow_status",
          {
            requested_username:
              username,
          }
        );

        if (rpcError) {
          throw new Error(
            rpcError.message
          );
        }

        const response =
          result as FollowStatus;

        if (!response?.success) {
          throw new Error(
            response?.error ||
              "Unable to load follow status."
          );
        }

        setFollowStatus(
          response
        );
      } catch (statusError) {
        setFollowError(
          statusError instanceof Error
            ? statusError.message
            : "Unable to load follow status."
        );
      }
    }, [username]);

  useEffect(() => {
    loadFollowStatus();
  }, [loadFollowStatus]);

  async function toggleFollow() {
    if (
      !followStatus?.canFollow ||
      followWorking
    ) {
      return;
    }

    const supabase =
      createClient();

    try {
      setFollowWorking(true);
      setFollowError("");

      const {
        data: result,
        error: rpcError,
      } = await supabase.rpc(
        "toggle_Norvexa_follow",
        {
          requested_username:
            username,
        }
      );

      if (rpcError) {
        throw new Error(
          rpcError.message
        );
      }

      const response =
        result as {
          success: boolean;
          error?: string;
          following: boolean;
          followers: number;
        };

      if (!response?.success) {
        throw new Error(
          response?.error ||
            "Unable to update follow status."
        );
      }

      setFollowStatus(
        (current) =>
          current
            ? {
                ...current,
                following:
                  response.following,
                followers:
                  response.followers,
              }
            : current
      );
    } catch (toggleError) {
      setFollowError(
        toggleError instanceof Error
          ? toggleError.message
          : "Unable to update follow status."
      );
    } finally {
      setFollowWorking(false);
    }
  }

  async function shareProfile() {
    if (!data?.profile) {
      return;
    }

    const profileUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/community/${username}`
        : `/community/${username}`;

    const shareTitle =
      `${data.profile.displayName || "Trader"} on Norvexa`;

    const shareText =
      `Check out @${username}'s Norvexa paper-trading profile.`;

    try {
      if (
        typeof navigator !==
          "undefined" &&
        navigator.share
      ) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: profileUrl,
        });

        setShareMessage(
          "Profile shared."
        );

        return;
      }

      await navigator.clipboard.writeText(
        profileUrl
      );

      setShareMessage(
        "Profile link copied."
      );
    } catch (shareError) {
      if (
        shareError instanceof DOMException &&
        shareError.name ===
          "AbortError"
      ) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          profileUrl
        );

        setShareMessage(
          "Profile link copied."
        );
      } catch {
        setShareMessage(
          "Unable to share this profile."
        );
      }
    }

    window.setTimeout(() => {
      setShareMessage("");
    }, 2500);
  }

  const joinedDate = useMemo(() => {
    const value =
      data?.profile?.createdAt;

    if (!value) {
      return "Recently";
    }

    const date = new Date(value);

    if (
      Number.isNaN(date.getTime())
    ) {
      return "Recently";
    }

    return date.toLocaleDateString(
      "en-US",
      {
        month: "long",
        year: "numeric",
      }
    );
  }, [data]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <section style={containerStyle}>
          <div style={cardStyle}>
            <h1>
              Loading Community Profile...
            </h1>

            <p style={mutedStyle}>
              Loading public profile
              information and shared
              paper-trading statistics.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (
    error ||
    !data ||
    !data.found ||
    !data.profile
  ) {
    const privateProfile =
      data?.reason === "private";

    return (
      <main style={pageStyle}>
        <section style={containerStyle}>
          <Link
            href="/dashboard"
            style={backLinkStyle}
          >
            ← Back to Dashboard
          </Link>

          <div
            style={{
              ...cardStyle,
              marginTop: 22,
              textAlign: "center",
              padding: 36,
            }}
          >
            <h1 style={{ margin: 0 }}>
              {privateProfile
                ? "This profile is private"
                : "Profile not found"}
            </h1>

            <p
              style={{
                margin: "10px 0 0",
                ...mutedStyle,
                lineHeight: 1.6,
              }}
            >
              {error ||
                (privateProfile
                  ? "This user has chosen not to share their community profile publicly."
                  : "The requested Norvexa username does not exist.")}
            </p>
          </div>
        </section>
      </main>
    );
  }

  const {
    profile,
    visibility,
    stats,
    holdings = [],
    recentTrades = [],
    achievements = [],
    viewerIsOwner,
  } = data;

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

          {viewerIsOwner && (
            <Link
              href="/profile"
              style={secondaryLinkStyle}
            >
              Edit Profile
            </Link>
          )}
        </div>

        <section style={heroCardStyle}>
          <div
            className="profile-header"
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              gap: 20,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 16,
                alignItems: "center",
              }}
            >
              <Avatar
                url={
                  profile.avatarUrl || ""
                }
                name={
                  profile.displayName
                }
                size={96}
              />

              <div>
                <p style={eyebrowStyle}>
                  Norvexa Community
                </p>

                <h1
                  style={{
                    margin: 0,
                    fontSize: 36,
                  }}
                >
                  {profile.displayName}
                </h1>

                <p
                  style={{
                    margin: "5px 0 0",
                    color: "#93c5fd",
                    fontWeight: 850,
                  }}
                >
                  @{profile.username}
                </p>

                <p
                  style={{
                    margin: "6px 0 0",
                    ...mutedStyle,
                    fontSize: 10,
                  }}
                >
                  Joined {joinedDate}
                </p>

                {followStatus && (
                  <p
                    style={{
                      margin: "7px 0 0",
                      color: "#d1d5db",
                      fontSize: 10,
                      fontWeight: 750,
                    }}
                  >
                    <strong>
                      {followStatus.followers}
                    </strong>{" "}
                    {followStatus.followers === 1
                      ? "Follower"
                      : "Followers"}
                    {" · "}
                    <strong>
                      {followStatus.followingCount}
                    </strong>{" "}
                    Following
                  </p>
                )}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {followStatus?.canFollow && (
                <button
                  type="button"
                  onClick={toggleFollow}
                  disabled={followWorking}
                  style={{
                    ...followButtonStyle,
                    border: followStatus.following
                      ? "1px solid rgba(74,222,128,0.28)"
                      : followButtonStyle.border,
                    background: followStatus.following
                      ? "rgba(34,197,94,0.10)"
                      : followButtonStyle.background,
                    color: followStatus.following
                      ? "#4ade80"
                      : "#f9fafb",
                    opacity: followWorking
                      ? 0.65
                      : 1,
                    cursor: followWorking
                      ? "wait"
                      : "pointer",
                  }}
                >
                  {followWorking
                    ? "Updating..."
                    : followStatus.following
                      ? "✓ Following"
                      : "＋ Follow"}
                </button>
              )}

              <button
                type="button"
                onClick={shareProfile}
                style={shareButtonStyle}
              >
                ↗ Share Profile
              </button>

              <Badge>
                {profile.investingStyle}
              </Badge>

              {viewerIsOwner && (
                <Badge>
                  Your profile
                </Badge>
              )}
            </div>
          </div>

          <p
            style={{
              margin: "20px 0 0",
              color: "#d1d5db",
              lineHeight: 1.7,
              maxWidth: 760,
            }}
          >
            {profile.bio ||
              "This trader has not added a bio yet."}
          </p>
        </section>

        {followError && (
          <div style={followErrorStyle}>
            {followError}
          </div>
        )}

        {shareMessage && (
          <div style={shareMessageStyle}>
            {shareMessage}
          </div>
        )}

        <div
          className="stats-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap: 12,
            marginTop: 16,
          }}
        >
          {visibility
            ?.showPortfolioValue && (
            <StatCard
              label="Portfolio value"
              value={formatCurrency(
                stats?.portfolioValue ??
                  0
              )}
            />
          )}

          {visibility
            ?.showPortfolioReturn && (
            <StatCard
              label="Portfolio return"
              value={formatSignedCurrency(
                stats?.portfolioReturn ??
                  0
              )}
              detail={formatSignedPercent(
                stats?.portfolioReturnPercent ??
                  0
              )}
              color={
                (
                  stats?.portfolioReturn ??
                  0
                ) >= 0
                  ? "#4ade80"
                  : "#ff8a8a"
              }
            />
          )}

          {visibility?.showWinRate && (
            <StatCard
              label="Sell win rate"
              value={`${(
                stats?.winRate ?? 0
              ).toFixed(2)}%`}
            />
          )}

          <StatCard
            label="Open holdings"
            value={String(
              stats?.holdingsCount ?? 0
            )}
          />
        </div>

        {visibility?.showHoldings && (
          <section
            style={{
              ...cardStyle,
              marginTop: 16,
            }}
          >
            <SectionHeading
              eyebrow="Shared portfolio"
              title="Open Holdings"
              subtitle="The user chose to make these paper-trading positions visible."
            />

            {holdings.length === 0 ? (
              <EmptyState
                title="No open holdings"
                text="This user currently has no paper-trading positions."
              />
            ) : (
              <div
                className="holding-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 10,
                  marginTop: 16,
                }}
              >
                {holdings.map(
                  (holding) => (
                    <article
                      key={holding.symbol}
                      style={innerCardStyle}
                    >
                      <Link
                        href={`/stock/${holding.symbol}`}
                        style={{
                          color: "#93c5fd",
                          fontSize: 19,
                          fontWeight: 850,
                          textDecoration: "none",
                        }}
                      >
                        {holding.symbol}
                      </Link>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "1fr 1fr",
                          gap: 8,
                          marginTop: 12,
                        }}
                      >
                        <MiniStat
                          label="Shares"
                          value={formatShares(
                            holding.shares
                          )}
                        />

                        <MiniStat
                          label="Average cost"
                          value={formatCurrency(
                            holding.averageCost
                          )}
                        />
                      </div>
                    </article>
                  )
                )}
              </div>
            )}
          </section>
        )}

        {visibility
          ?.showRecentTrades && (
          <section
            style={{
              ...cardStyle,
              marginTop: 16,
            }}
          >
            <SectionHeading
              eyebrow="Shared activity"
              title="Recent Trades"
              subtitle="The latest paper trades this user chose to share."
            />

            {recentTrades.length ===
            0 ? (
              <EmptyState
                title="No recent trades"
                text="This user has no shared paper-trading activity yet."
              />
            ) : (
              <div
                style={{
                  overflowX: "auto",
                  marginTop: 16,
                }}
              >
                <div
                  style={{
                    minWidth: 820,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "1.2fr 0.7fr 0.9fr 0.8fr 1fr 1fr",
                      gap: 10,
                      padding:
                        "0 10px 10px",
                      color: "#9ca3af",
                      fontSize: 9,
                      fontWeight: 800,
                      textTransform:
                        "uppercase",
                    }}
                  >
                    <span>Date</span>
                    <span>Side</span>
                    <span>Symbol</span>
                    <span>Shares</span>
                    <span>Price</span>
                    <span>Total</span>
                  </div>

                  {recentTrades.map(
                    (trade) => (
                      <div
                        key={trade.id}
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            "1.2fr 0.7fr 0.9fr 0.8fr 1fr 1fr",
                          gap: 10,
                          padding: 10,
                          borderTop:
                            "1px solid rgba(255,255,255,0.07)",
                          alignItems:
                            "center",
                        }}
                      >
                        <span
                          style={{
                            ...mutedStyle,
                            fontSize: 10,
                          }}
                        >
                          {formatDateTime(
                            trade.createdAt
                          )}
                        </span>

                        <TradeBadge
                          side={
                            trade.transactionType
                          }
                        />

                        <Link
                          href={`/stock/${trade.symbol}`}
                          style={{
                            color:
                              "#93c5fd",
                            fontWeight:
                              850,
                            textDecoration:
                              "none",
                          }}
                        >
                          {trade.symbol}
                        </Link>

                        <span>
                          {formatShares(
                            trade.shares
                          )}
                        </span>

                        <span>
                          {formatCurrency(
                            trade.price
                          )}
                        </span>

                        <strong>
                          {formatCurrency(
                            trade.totalAmount
                          )}
                        </strong>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        <section
          style={{
            ...cardStyle,
            marginTop: 16,
            border:
              "1px solid rgba(251,191,36,0.16)",
            background:
              "linear-gradient(145deg, rgba(251,191,36,0.05), rgba(255,255,255,0.03))",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "flex-start",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <SectionHeading
              eyebrow="Achievements"
              title="Badges"
              subtitle="Milestones this trader has earned on Norvexa."
            />

            <span
              style={
                achievementCountStyle
              }
            >
              {achievements.length} earned
            </span>
          </div>

          {achievements.length === 0 ? (
            <EmptyState
              title="No badges yet"
              text="This trader has not unlocked any Norvexa achievements yet."
            />
          ) : (
            <div
              className="achievement-grid"
              style={
                achievementGridStyle
              }
            >
              {achievements.map(
                (achievement) => (
                  <article
                    key={
                      achievement.slug
                    }
                    style={
                      achievementItemStyle
                    }
                  >
                    <div
                      style={
                        achievementIconStyle
                      }
                    >
                      {
                        achievement.icon
                      }
                    </div>

                    <div>
                      <div
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap: 7,
                          flexWrap:
                            "wrap",
                        }}
                      >
                        <strong>
                          {
                            achievement.name
                          }
                        </strong>

                        <span
                          style={
                            achievementCategoryStyle
                          }
                        >
                          {
                            achievement.category
                          }
                        </span>
                      </div>

                      <p
                        style={{
                          margin:
                            "6px 0 0",
                          ...mutedStyle,
                          fontSize: 10,
                          lineHeight: 1.5,
                        }}
                      >
                        {
                          achievement.description
                        }
                      </p>

                      <span
                        style={{
                          display:
                            "block",
                          marginTop: 8,
                          color:
                            "#6b7280",
                          fontSize: 9,
                        }}
                      >
                        Earned{" "}
                        {new Date(
                          achievement.earnedAt
                        ).toLocaleDateString(
                          "en-US",
                          {
                            month:
                              "short",
                            day:
                              "numeric",
                            year:
                              "numeric",
                          }
                        )}
                      </span>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>

        <div style={noticeStyle}>
          <strong>
            Paper-trading profile
          </strong>

          <p
            style={{
              margin: "6px 0 0",
              ...mutedStyle,
              fontSize: 11,
              lineHeight: 1.55,
            }}
          >
            Community statistics are
            based only on virtual
            Norvexa activity. They do
            not represent verified
            brokerage assets or real-money
            investment performance.
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
            .profile-header {
              align-items:
                flex-start !important;
            }

            .stats-grid {
              grid-template-columns:
                1fr !important;
            }

            .achievement-grid {
              grid-template-columns:
                1fr !important;
            }
          }
        `}</style>
      </section>
    </main>
  );
}

function Avatar({
  url,
  name,
  size,
}: {
  url: string;
  name: string;
  size: number;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt={`${name} profile picture`}
        style={{
          width: size,
          height: size,
          flex: "0 0 auto",
          objectFit: "cover",
          borderRadius: "50%",
          border:
            "2px solid rgba(96,165,250,0.32)",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        flex: "0 0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        border:
          "2px solid rgba(96,165,250,0.26)",
        background:
          "linear-gradient(135deg, rgba(37,99,235,0.28), rgba(168,85,247,0.2))",
        color: "#dbeafe",
        fontSize: 30,
        fontWeight: 900,
      }}
    >
      {getInitials(name)}
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  color = "#f9fafb",
}: {
  label: string;
  value: string;
  detail?: string;
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
          fontSize: 21,
        }}
      >
        {value}
      </strong>

      {detail && (
        <span
          style={{
            display: "block",
            marginTop: 5,
            color,
            fontSize: 10,
            fontWeight: 800,
          }}
        >
          {detail}
        </span>
      )}
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
    <div>
      <span
        style={{
          ...mutedStyle,
          fontSize: 9,
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

function TradeBadge({
  side,
}: {
  side: "buy" | "sell";
}) {
  const buy = side === "buy";

  return (
    <span
      style={{
        display: "inline-block",
        width: "fit-content",
        padding: "5px 8px",
        borderRadius: 999,
        border: buy
          ? "1px solid rgba(239,68,68,0.23)"
          : "1px solid rgba(34,197,94,0.23)",
        background: buy
          ? "rgba(239,68,68,0.08)"
          : "rgba(34,197,94,0.08)",
        color: buy
          ? "#ff8a8a"
          : "#4ade80",
        fontSize: 9,
        fontWeight: 850,
        textTransform: "uppercase",
      }}
    >
      {side}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <p style={eyebrowStyle}>
        {eyebrow}
      </p>

      <h2 style={{ margin: 0 }}>
        {title}
      </h2>

      <p
        style={{
          margin: "6px 0 0",
          ...mutedStyle,
          fontSize: 11,
          lineHeight: 1.5,
        }}
      >
        {subtitle}
      </p>
    </div>
  );
}

function Badge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span style={badgeStyle}>
      {children}
    </span>
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

function getInitials(
  value: string
) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "T";
  }

  return parts
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join("");
}

function formatCurrency(
  value: number
) {
  return Number(value).toLocaleString(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

function formatSignedCurrency(
  value: number
) {
  return `${value >= 0 ? "+" : "-"}${formatCurrency(
    Math.abs(value)
  )}`;
}

function formatSignedPercent(
  value: number
) {
  const safe =
    Number.isFinite(value)
      ? value
      : 0;

  return `${safe >= 0 ? "+" : "-"}${Math.abs(
    safe
  ).toFixed(2)}%`;
}

function formatShares(
  value: number
) {
  return Number(value).toLocaleString(
    "en-US",
    {
      maximumFractionDigits: 4,
    }
  );
}

function formatDateTime(
  value: string
) {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
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

const heroCardStyle = {
  padding: 24,
  border:
    "1px solid rgba(96,165,250,0.2)",
  borderRadius: 17,
  background:
    "linear-gradient(145deg, rgba(37,99,235,0.09), rgba(255,255,255,0.03))",
};

const innerCardStyle = {
  padding: 14,
  border:
    "1px solid rgba(255,255,255,0.07)",
  borderRadius: 11,
  background:
    "rgba(255,255,255,0.025)",
};

const badgeStyle = {
  display: "inline-block",
  padding: "7px 10px",
  border:
    "1px solid rgba(96,165,250,0.23)",
  borderRadius: 999,
  background:
    "rgba(37,99,235,0.07)",
  color: "#93c5fd",
  fontSize: 9,
  fontWeight: 850,
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

const emptyStyle = {
  marginTop: 16,
  padding: 18,
  border:
    "1px solid rgba(255,255,255,0.07)",
  borderRadius: 11,
  background:
    "rgba(255,255,255,0.025)",
};

const achievementCountStyle = {
  padding: "6px 9px",
  border:
    "1px solid rgba(251,191,36,0.18)",
  borderRadius: 999,
  background:
    "rgba(251,191,36,0.06)",
  color: "#fbbf24",
  fontSize: 9,
  fontWeight: 850,
};

const achievementGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 10,
  marginTop: 16,
};

const achievementItemStyle = {
  display: "grid",
  gridTemplateColumns: "48px 1fr",
  gap: 12,
  alignItems: "start",
  padding: 14,
  border:
    "1px solid rgba(255,255,255,0.07)",
  borderRadius: 11,
  background:
    "rgba(255,255,255,0.025)",
};

const achievementIconStyle = {
  width: 48,
  height: 48,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 12,
  border:
    "1px solid rgba(251,191,36,0.18)",
  background:
    "rgba(251,191,36,0.06)",
  fontSize: 23,
};

const achievementCategoryStyle = {
  padding: "4px 6px",
  border:
    "1px solid rgba(96,165,250,0.14)",
  borderRadius: 999,
  background:
    "rgba(37,99,235,0.05)",
  color: "#93c5fd",
  fontSize: 8,
  fontWeight: 800,
};

const shareButtonStyle = {
  padding: "9px 13px",
  border:
    "1px solid rgba(255,255,255,0.12)",
  borderRadius: 999,
  background:
    "rgba(255,255,255,0.04)",
  color: "#d1d5db",
  fontSize: 10,
  fontWeight: 850,
  cursor: "pointer",
};

const shareMessageStyle = {
  marginTop: 12,
  padding: "10px 12px",
  border:
    "1px solid rgba(74,222,128,0.18)",
  borderRadius: 10,
  background:
    "rgba(34,197,94,0.06)",
  color: "#4ade80",
  fontSize: 10,
};

const followButtonStyle = {
  padding: "9px 13px",
  border:
    "1px solid rgba(96,165,250,0.28)",
  borderRadius: 999,
  background:
    "rgba(37,99,235,0.12)",
  color: "#f9fafb",
  fontSize: 10,
  fontWeight: 900,
};

const followErrorStyle = {
  marginTop: 12,
  padding: "10px 12px",
  border:
    "1px solid rgba(239,68,68,0.22)",
  borderRadius: 10,
  background:
    "rgba(239,68,68,0.07)",
  color: "#ff8a8a",
  fontSize: 10,
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