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

type PublicPortfolioRow = {
  user_id: string;
  is_public: boolean;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  user_id: string;
  username: string | null;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  investing_style: string;
  profile_visibility: string;
  show_portfolio_value: boolean;
  show_portfolio_return: boolean;
  show_holdings: boolean;
  show_recent_trades: boolean;
  show_win_rate: boolean;
  created_at: string;
};

type LeaderboardRow = {
  user_id: string;
  ending_value: number | string;
  return_amount: number | string;
  return_percent: number | string;
  realized_gain_loss: number | string;
  win_rate: number | string;
  total_trades: number;
  calculated_at: string;
};

type PublicTrader = {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  investingStyle: string;
  joinedAt: string;
  portfolioValue: number | null;
  returnAmount: number | null;
  returnPercent: number | null;
  realizedGainLoss: number | null;
  winRate: number | null;
  totalTrades: number;
  showPortfolioValue: boolean;
  showPortfolioReturn: boolean;
  showHoldings: boolean;
  showRecentTrades: boolean;
  showWinRate: boolean;
};

type SortOption =
  | "return"
  | "portfolio"
  | "win-rate"
  | "trades"
  | "newest"
  | "name";

type StyleFilter =
  | "all"
  | string;

export default function PublicPortfoliosPage() {
  const router = useRouter();

  const [userId, setUserId] =
    useState("");

  const [myProfile, setMyProfile] =
    useState<ProfileRow | null>(null);

  const [myPublicPortfolio, setMyPublicPortfolio] =
    useState<PublicPortfolioRow | null>(null);

  const [traders, setTraders] =
    useState<PublicTrader[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [sort, setSort] =
    useState<SortOption>("return");

  const [styleFilter, setStyleFilter] =
    useState<StyleFilter>("all");

  const [publishDisplayName, setPublishDisplayName] =
    useState("");

  const [publishBio, setPublishBio] =
    useState("");

  const [publishAvatarUrl, setPublishAvatarUrl] =
    useState("");

  const loadPublicPortfolios =
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

          setUserId(user.id);

          const [
            publicPortfolioResult,
            profileResult,
            myPublicPortfolioResult,
            leaderboardResult,
          ] = await Promise.all([
            supabase
              .from(
                "public_portfolios"
              )
              .select(
                `
                  user_id,
                  is_public,
                  display_name,
                  bio,
                  avatar_url,
                  created_at,
                  updated_at
                `
              )
              .eq(
                "is_public",
                true
              )
              .order(
                "updated_at",
                {
                  ascending:
                    false,
                }
              ),

            supabase
              .from("profiles")
              .select(
                `
                  user_id,
                  username,
                  display_name,
                  bio,
                  avatar_url,
                  investing_style,
                  profile_visibility,
                  show_portfolio_value,
                  show_portfolio_return,
                  show_holdings,
                  show_recent_trades,
                  show_win_rate,
                  created_at
                `
              ),

            supabase
              .from(
                "public_portfolios"
              )
              .select(
                `
                  user_id,
                  is_public,
                  display_name,
                  bio,
                  avatar_url,
                  created_at,
                  updated_at
                `
              )
              .eq(
                "user_id",
                user.id
              )
              .maybeSingle(),

            supabase
              .from(
                "leaderboard_snapshots"
              )
              .select(
                `
                  user_id,
                  ending_value,
                  return_amount,
                  return_percent,
                  realized_gain_loss,
                  win_rate,
                  total_trades,
                  calculated_at
                `
              )
              .eq(
                "period",
                "all_time"
              )
              .order(
                "calculated_at",
                {
                  ascending:
                    false,
                }
              ),
          ]);

          if (
            publicPortfolioResult.error
          ) {
            throw new Error(
              publicPortfolioResult.error.message
            );
          }

          if (
            profileResult.error
          ) {
            throw new Error(
              profileResult.error.message
            );
          }

          if (
            myPublicPortfolioResult.error
          ) {
            throw new Error(
              myPublicPortfolioResult.error.message
            );
          }

          if (
            leaderboardResult.error
          ) {
            throw new Error(
              leaderboardResult.error.message
            );
          }

          const publicRows =
            (publicPortfolioResult.data ||
              []) as PublicPortfolioRow[];

          const profiles =
            (profileResult.data ||
              []) as ProfileRow[];

          const leaderboardRows =
            (leaderboardResult.data ||
              []) as LeaderboardRow[];

          const profileMap =
            new Map<
              string,
              ProfileRow
            >();

          for (
            const profile of profiles
          ) {
            profileMap.set(
              profile.user_id,
              profile
            );
          }

          const latestLeaderboardMap =
            new Map<
              string,
              LeaderboardRow
            >();

          for (
            const row of leaderboardRows
          ) {
            if (
              !latestLeaderboardMap.has(
                row.user_id
              )
            ) {
              latestLeaderboardMap.set(
                row.user_id,
                row
              );
            }
          }

          const builtTraders =
            publicRows
              .map(
                (
                  publicPortfolio
                ): PublicTrader | null => {
                  const profile =
                    profileMap.get(
                      publicPortfolio.user_id
                    );

                  if (
                    !profile ||
                    !profile.username ||
                    profile.profile_visibility !==
                      "public"
                  ) {
                    return null;
                  }

                  const leaderboard =
                    latestLeaderboardMap.get(
                      publicPortfolio.user_id
                    );

                  return {
                    userId:
                      publicPortfolio.user_id,
                    username:
                      profile.username,
                    displayName:
                      publicPortfolio.display_name ||
                      profile.display_name,
                    bio:
                      publicPortfolio.bio ||
                      profile.bio ||
                      "",
                    avatarUrl:
                      publicPortfolio.avatar_url ||
                      profile.avatar_url,
                    investingStyle:
                      profile.investing_style,
                    joinedAt:
                      profile.created_at,
                    portfolioValue:
                      profile.show_portfolio_value
                        ? toNumberOrNull(
                            leaderboard?.ending_value
                          )
                        : null,
                    returnAmount:
                      profile.show_portfolio_return
                        ? toNumberOrNull(
                            leaderboard?.return_amount
                          )
                        : null,
                    returnPercent:
                      profile.show_portfolio_return
                        ? toNumberOrNull(
                            leaderboard?.return_percent
                          )
                        : null,
                    realizedGainLoss:
                      profile.show_portfolio_return
                        ? toNumberOrNull(
                            leaderboard?.realized_gain_loss
                          )
                        : null,
                    winRate:
                      profile.show_win_rate
                        ? toNumberOrNull(
                            leaderboard?.win_rate
                          )
                        : null,
                    totalTrades:
                      Number(
                        leaderboard?.total_trades ||
                          0
                      ),
                    showPortfolioValue:
                      profile.show_portfolio_value,
                    showPortfolioReturn:
                      profile.show_portfolio_return,
                    showHoldings:
                      profile.show_holdings,
                    showRecentTrades:
                      profile.show_recent_trades,
                    showWinRate:
                      profile.show_win_rate,
                  };
                }
              )
              .filter(
                (
                  trader
                ): trader is PublicTrader =>
                  trader !== null
              );

          setTraders(
            builtTraders
          );

          const ownProfile =
            profileMap.get(
              user.id
            ) || null;

          setMyProfile(
            ownProfile
          );

          const ownPublicPortfolio =
            (myPublicPortfolioResult.data ||
              null) as PublicPortfolioRow | null;

          setMyPublicPortfolio(
            ownPublicPortfolio
          );

          setPublishDisplayName(
            ownPublicPortfolio
              ?.display_name ||
              ownProfile
                ?.display_name ||
              ""
          );

          setPublishBio(
            ownPublicPortfolio
              ?.bio ||
              ownProfile?.bio ||
              ""
          );

          setPublishAvatarUrl(
            ownPublicPortfolio
              ?.avatar_url ||
              ownProfile
                ?.avatar_url ||
              ""
          );
        } catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load public portfolios."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [router]
    );

  useEffect(() => {
    loadPublicPortfolios();

    const interval =
      window.setInterval(() => {
        loadPublicPortfolios(
          true
        );
      }, 60_000);

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [loadPublicPortfolios]);

  async function savePublicPortfolio(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !publishDisplayName.trim()
    ) {
      setError(
        "Display name is required."
      );
      return;
    }

    const supabase =
      createClient();

    try {
      setSaving(true);
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
        error: upsertError,
      } = await supabase
        .from(
          "public_portfolios"
        )
        .upsert(
          {
            user_id:
              user.id,
            is_public:
              true,
            display_name:
              publishDisplayName.trim(),
            bio:
              publishBio.trim() ||
              null,
            avatar_url:
              publishAvatarUrl.trim() ||
              null,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "user_id",
          }
        );

      if (upsertError) {
        throw new Error(
          upsertError.message
        );
      }

      setSuccess(
        "Your portfolio is now public."
      );

      await loadPublicPortfolios(
        true
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to publish your portfolio."
      );
    } finally {
      setSaving(false);
    }
  }

  async function hidePublicPortfolio() {
    const confirmed =
      window.confirm(
        "Hide your portfolio from the public portfolio directory?"
      );

    if (!confirmed) {
      return;
    }

    const supabase =
      createClient();

    try {
      setSaving(true);
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
        .from(
          "public_portfolios"
        )
        .upsert(
          {
            user_id:
              user.id,
            is_public:
              false,
            display_name:
              publishDisplayName.trim() ||
              myProfile
                ?.display_name ||
              "Trader",
            bio:
              publishBio.trim() ||
              null,
            avatar_url:
              publishAvatarUrl.trim() ||
              null,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "user_id",
          }
        );

      if (updateError) {
        throw new Error(
          updateError.message
        );
      }

      setSuccess(
        "Your portfolio is now hidden."
      );

      await loadPublicPortfolios(
        true
      );
    } catch (hideError) {
      setError(
        hideError instanceof Error
          ? hideError.message
          : "Unable to hide your portfolio."
      );
    } finally {
      setSaving(false);
    }
  }

  const investingStyles =
    useMemo(() => {
      return Array.from(
        new Set(
          traders.map(
            (trader) =>
              trader.investingStyle
          )
        )
      ).sort();
    }, [traders]);

  const visibleTraders =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      const filtered =
        traders.filter(
          (trader) => {
            const matchesSearch =
              !query ||
              trader.username
                .toLowerCase()
                .includes(query) ||
              trader.displayName
                .toLowerCase()
                .includes(query) ||
              trader.bio
                .toLowerCase()
                .includes(query) ||
              trader.investingStyle
                .toLowerCase()
                .includes(query);

            const matchesStyle =
              styleFilter ===
                "all" ||
              trader.investingStyle ===
                styleFilter;

            return (
              matchesSearch &&
              matchesStyle
            );
          }
        );

      return [...filtered].sort(
        (a, b) => {
          if (
            sort ===
            "portfolio"
          ) {
            return (
              toNumber(
                b.portfolioValue
              ) -
              toNumber(
                a.portfolioValue
              )
            );
          }

          if (
            sort ===
            "win-rate"
          ) {
            return (
              toNumber(
                b.winRate
              ) -
              toNumber(
                a.winRate
              )
            );
          }

          if (
            sort === "trades"
          ) {
            return (
              b.totalTrades -
              a.totalTrades
            );
          }

          if (
            sort === "newest"
          ) {
            return (
              new Date(
                b.joinedAt
              ).getTime() -
              new Date(
                a.joinedAt
              ).getTime()
            );
          }

          if (
            sort === "name"
          ) {
            return a.displayName.localeCompare(
              b.displayName
            );
          }

          return (
            toNumber(
              b.returnPercent
            ) -
            toNumber(
              a.returnPercent
            )
          );
        }
      );
    }, [
      traders,
      search,
      styleFilter,
      sort,
    ]);

  const stats = useMemo(() => {
    const averageReturn =
      traders.length > 0
        ? traders.reduce(
            (
              total,
              trader
            ) =>
              total +
              toNumber(
                trader.returnPercent
              ),
            0
          ) /
          traders.length
        : 0;

    const positiveTraders =
      traders.filter(
        (trader) =>
          toNumber(
            trader.returnPercent
          ) > 0
      ).length;

    const totalTrades =
      traders.reduce(
        (
          total,
          trader
        ) =>
          total +
          trader.totalTrades,
        0
      );

    return {
      publicCount:
        traders.length,
      averageReturn,
      positiveTraders,
      totalTrades,
    };
  }, [traders]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <section style={containerStyle}>
          <div style={cardStyle}>
            <h1>
              Loading Public Portfolios...
            </h1>

            <p style={mutedStyle}>
              Loading shared community
              portfolios and public
              performance.
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
              href="/community/friends"
              style={secondaryLinkStyle}
            >
              Friends
            </Link>

            <Link
              href="/community/leaderboards"
              style={secondaryLinkStyle}
            >
              Leaderboards
            </Link>

            <button
              type="button"
              onClick={() =>
                loadPublicPortfolios(
                  true
                )
              }
              disabled={refreshing}
              style={secondaryButtonStyle}
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>
        </div>

        <p style={eyebrowStyle}>
          Community discovery
        </p>

        <h1 style={titleStyle}>
          Public Portfolios
        </h1>

        <p style={mutedStyle}>
          Discover public
          paper-trading portfolios,
          investing styles, returns,
          and shared strategies.
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
            label="Public portfolios"
            value={String(
              stats.publicCount
            )}
          />

          <StatCard
            label="Positive returns"
            value={String(
              stats.positiveTraders
            )}
            color="#4ade80"
          />

          <StatCard
            label="Average return"
            value={formatSignedPercent(
              stats.averageReturn
            )}
            color={
              stats.averageReturn >=
              0
                ? "#4ade80"
                : "#ff8a8a"
            }
          />

          <StatCard
            label="Community trades"
            value={stats.totalTrades.toLocaleString(
              "en-US"
            )}
          />
        </div>

        <section
          style={{
            ...publishCardStyle,
            marginTop: 16,
          }}
        >
          <div style={sectionHeaderStyle}>
            <div>
              <p style={eyebrowStyle}>
                Your portfolio
              </p>

              <h2 style={{ margin: 0 }}>
                {myPublicPortfolio
                  ?.is_public
                  ? "Public Portfolio Enabled"
                  : "Publish Your Portfolio"}
              </h2>

              <p
                style={{
                  margin: "6px 0 0",
                  ...mutedStyle,
                  fontSize: 11,
                  lineHeight: 1.5,
                }}
              >
                Your existing profile
                privacy settings still
                control which portfolio
                details visitors can see.
              </p>
            </div>

            <StatusBadge
              active={Boolean(
                myPublicPortfolio
                  ?.is_public
              )}
            />
          </div>

          <form
            onSubmit={
              savePublicPortfolio
            }
            style={{
              marginTop: 17,
            }}
          >
            <div
              className="publish-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <Field
                label="Public display name"
                value={
                  publishDisplayName
                }
                onChange={
                  setPublishDisplayName
                }
                placeholder="Your trader name"
              />

              <Field
                label="Avatar URL"
                value={
                  publishAvatarUrl
                }
                onChange={
                  setPublishAvatarUrl
                }
                placeholder="Optional profile image URL"
              />
            </div>

            <label
              style={{
                display: "block",
                marginTop: 12,
              }}
            >
              <span style={fieldLabelStyle}>
                Public portfolio bio
              </span>

              <textarea
                value={publishBio}
                onChange={(event) =>
                  setPublishBio(
                    event.target.value
                  )
                }
                placeholder="Describe your investing approach..."
                style={textareaStyle}
              />
            </label>

            <div
              style={{
                display: "flex",
                gap: 9,
                flexWrap: "wrap",
                marginTop: 13,
              }}
            >
              <button
                type="submit"
                disabled={saving}
                style={primaryButtonStyle}
              >
                {saving
                  ? "Saving..."
                  : myPublicPortfolio
                        ?.is_public
                    ? "Update Public Portfolio"
                    : "Publish Portfolio"}
              </button>

              {myPublicPortfolio
                ?.is_public && (
                <button
                  type="button"
                  onClick={
                    hidePublicPortfolio
                  }
                  disabled={saving}
                  style={dangerButtonStyle}
                >
                  Hide Portfolio
                </button>
              )}

              {myProfile
                ?.username && (
                <Link
                  href={`/community/${myProfile.username}`}
                  style={viewOwnProfileStyle}
                >
                  View Public Profile
                </Link>
              )}
            </div>
          </form>
        </section>

        <section
          style={{
            ...cardStyle,
            marginTop: 16,
          }}
        >
          <div style={sectionHeaderStyle}>
            <div>
              <p style={eyebrowStyle}>
                Browse traders
              </p>

              <h2 style={{ margin: 0 }}>
                Portfolio Directory
              </h2>
            </div>

            <span style={mutedStyle}>
              {
                visibleTraders.length
              }{" "}
              shown
            </span>
          </div>

          <div
            className="controls-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr auto auto",
              gap: 9,
              marginTop: 15,
            }}
          >
            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search trader, username, style, or bio..."
              style={inputStyle}
            />

            <select
              value={styleFilter}
              onChange={(event) =>
                setStyleFilter(
                  event.target.value
                )
              }
              style={selectStyle}
            >
              <option value="all">
                All styles
              </option>

              {investingStyles.map(
                (style) => (
                  <option
                    key={style}
                    value={style}
                  >
                    {style}
                  </option>
                )
              )}
            </select>

            <select
              value={sort}
              onChange={(event) =>
                setSort(
                  event.target
                    .value as SortOption
                )
              }
              style={selectStyle}
            >
              <option value="return">
                Highest return
              </option>

              <option value="portfolio">
                Highest portfolio
              </option>

              <option value="win-rate">
                Highest win rate
              </option>

              <option value="trades">
                Most trades
              </option>

              <option value="newest">
                Newest profiles
              </option>

              <option value="name">
                Name A–Z
              </option>
            </select>
          </div>

          {visibleTraders.length ===
          0 ? (
            <EmptyState
              title="No public portfolios found"
              text="Publish your portfolio or change your search and filters."
            />
          ) : (
            <div
              className="portfolio-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(290px, 1fr))",
                gap: 12,
                marginTop: 16,
              }}
            >
              {visibleTraders.map(
                (trader) => (
                  <TraderCard
                    key={
                      trader.userId
                    }
                    trader={trader}
                    isCurrentUser={
                      trader.userId ===
                      userId
                    }
                  />
                )
              )}
            </div>
          )}
        </section>

        <div style={noticeStyle}>
          <strong>
            Public portfolio privacy
          </strong>

          <p
            style={{
              margin: "6px 0 0",
              ...mutedStyle,
              fontSize: 11,
              lineHeight: 1.55,
            }}
          >
            Publishing adds your profile
            to this community directory.
            Your Profile page controls
            whether portfolio value,
            returns, holdings, trades,
            and win rate are visible.
          </p>
        </div>

        <style jsx>{`
          @media (max-width: 850px) {
            .stats-grid,
            .publish-grid {
              grid-template-columns:
                repeat(
                  2,
                  minmax(0, 1fr)
                ) !important;
            }

            .controls-grid {
              grid-template-columns:
                1fr !important;
            }
          }

          @media (max-width: 560px) {
            .stats-grid,
            .publish-grid {
              grid-template-columns:
                1fr !important;
            }
          }
        `}</style>
      </section>
    </main>
  );
}

function TraderCard({
  trader,
  isCurrentUser,
}: {
  trader: PublicTrader;
  isCurrentUser: boolean;
}) {
  return (
    <article
      style={{
        ...traderCardStyle,
        border:
          isCurrentUser
            ? "1px solid rgba(96,165,250,0.32)"
            : traderCardStyle.border,
        background:
          isCurrentUser
            ? "linear-gradient(145deg, rgba(37,99,235,0.08), rgba(255,255,255,0.025))"
            : traderCardStyle.background,
      }}
    >
      <div style={sectionHeaderStyle}>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <Avatar
            url={
              trader.avatarUrl ||
              ""
            }
            name={
              trader.displayName
            }
            size={62}
          />

          <div>
            <Link
              href={`/community/${trader.username}`}
              style={{
                color:
                  "#f9fafb",
                fontSize: 18,
                fontWeight:
                  850,
                textDecoration:
                  "none",
              }}
            >
              {trader.displayName}
            </Link>

            <p
              style={{
                margin: "4px 0 0",
                color:
                  "#93c5fd",
                fontSize: 10,
                fontWeight:
                  800,
              }}
            >
              @{trader.username}
            </p>

            <span
              style={styleBadgeStyle}
            >
              {trader.investingStyle}
            </span>
          </div>
        </div>

        {isCurrentUser && (
          <span
            style={yourPortfolioBadgeStyle}
          >
            You
          </span>
        )}
      </div>

      <p
        style={{
          margin: "14px 0 0",
          color: "#9ca3af",
          fontSize: 11,
          lineHeight: 1.55,
          minHeight: 52,
        }}
      >
        {trader.bio ||
          "This trader has not added a public portfolio bio."}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
          gap: 8,
          marginTop: 14,
        }}
      >
        <MiniStat
          label="Return"
          value={
            trader.returnPercent ===
            null
              ? "Hidden"
              : formatSignedPercent(
                  trader.returnPercent
                )
          }
          color={
            toNumber(
              trader.returnPercent
            ) >= 0
              ? "#4ade80"
              : "#ff8a8a"
          }
        />

        <MiniStat
          label="Portfolio"
          value={
            trader.portfolioValue ===
            null
              ? "Hidden"
              : formatCurrency(
                  trader.portfolioValue
                )
          }
        />

        <MiniStat
          label="Win rate"
          value={
            trader.winRate ===
            null
              ? "Hidden"
              : `${trader.winRate.toFixed(
                  2
                )}%`
          }
        />

        <MiniStat
          label="Trades"
          value={String(
            trader.totalTrades
          )}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: 7,
          flexWrap: "wrap",
          marginTop: 13,
        }}
      >
        {trader.showHoldings && (
          <VisibilityTag>
            Holdings shared
          </VisibilityTag>
        )}

        {trader.showRecentTrades && (
          <VisibilityTag>
            Trades shared
          </VisibilityTag>
        )}

        {trader.showWinRate && (
          <VisibilityTag>
            Win rate shared
          </VisibilityTag>
        )}
      </div>

      <Link
        href={`/community/${trader.username}`}
        style={openPortfolioStyle}
      >
        Open Public Portfolio →
      </Link>
    </article>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label>
      <span style={fieldLabelStyle}>
        {label}
      </span>

      <input
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={placeholder}
        style={inputStyle}
      />
    </label>
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
            "2px solid rgba(96,165,250,0.28)",
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
          "2px solid rgba(96,165,250,0.23)",
        background:
          "linear-gradient(135deg, rgba(37,99,235,0.25), rgba(168,85,247,0.18))",
        color: "#dbeafe",
        fontWeight: 900,
        fontSize: Math.max(
          16,
          size * 0.3
        ),
      }}
    >
      {getInitials(name)}
    </div>
  );
}

function StatusBadge({
  active,
}: {
  active: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "7px 10px",
        border: active
          ? "1px solid rgba(34,197,94,0.26)"
          : "1px solid rgba(156,163,175,0.18)",
        borderRadius: 999,
        background: active
          ? "rgba(34,197,94,0.08)"
          : "rgba(156,163,175,0.05)",
        color: active
          ? "#4ade80"
          : "#9ca3af",
        fontSize: 9,
        fontWeight: 850,
      }}
    >
      {active
        ? "Published"
        : "Hidden"}
    </span>
  );
}

function VisibilityTag({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span style={visibilityTagStyle}>
      {children}
    </span>
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
  color = "#f9fafb",
}: {
  label: string;
  value: string;
  color?: string;
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
          color,
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

function getInitials(
  value: string
) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (
    parts.length === 0
  ) {
    return "T";
  }

  return parts
    .slice(0, 2)
    .map((part) =>
      part
        .charAt(0)
        .toUpperCase()
    )
    .join("");
}

function toNumber(
  value:
    | number
    | null
    | undefined
) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
}

function toNumberOrNull(
  value: unknown
) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : null;
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

const pageStyle = {
  minHeight: "100vh",
  padding: "32px 24px",
  background: "#07111f",
  color: "white",
};

const containerStyle = {
  maxWidth: 1250,
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

const publishCardStyle = {
  padding: 20,
  border:
    "1px solid rgba(96,165,250,0.22)",
  borderRadius: 15,
  background:
    "linear-gradient(145deg, rgba(37,99,235,0.09), rgba(255,255,255,0.03))",
};

const traderCardStyle = {
  padding: 17,
  border:
    "1px solid rgba(255,255,255,0.08)",
  borderRadius: 13,
  background:
    "rgba(255,255,255,0.027)",
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

const textareaStyle = {
  ...inputStyle,
  minHeight: 95,
  resize: "vertical" as const,
  fontFamily: "inherit",
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

const dangerButtonStyle = {
  padding: "10px 14px",
  border:
    "1px solid rgba(239,68,68,0.22)",
  borderRadius: 9,
  background:
    "rgba(239,68,68,0.07)",
  color: "#ff8a8a",
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

const viewOwnProfileStyle = {
  display: "inline-block",
  padding: "10px 13px",
  border:
    "1px solid rgba(96,165,250,0.2)",
  borderRadius: 9,
  background:
    "rgba(37,99,235,0.06)",
  color: "#93c5fd",
  fontWeight: 800,
  textDecoration: "none",
};

const openPortfolioStyle = {
  display: "block",
  marginTop: 14,
  padding: "10px 12px",
  border:
    "1px solid rgba(96,165,250,0.18)",
  borderRadius: 9,
  background:
    "rgba(37,99,235,0.06)",
  color: "#93c5fd",
  textAlign: "center" as const,
  fontSize: 10,
  fontWeight: 850,
  textDecoration: "none",
};

const styleBadgeStyle = {
  display: "inline-block",
  marginTop: 6,
  padding: "4px 7px",
  border:
    "1px solid rgba(96,165,250,0.18)",
  borderRadius: 999,
  background:
    "rgba(37,99,235,0.05)",
  color: "#93c5fd",
  fontSize: 8,
  fontWeight: 800,
};

const yourPortfolioBadgeStyle = {
  display: "inline-block",
  padding: "5px 8px",
  border:
    "1px solid rgba(34,197,94,0.22)",
  borderRadius: 999,
  background:
    "rgba(34,197,94,0.07)",
  color: "#4ade80",
  fontSize: 8,
  fontWeight: 850,
};

const visibilityTagStyle = {
  display: "inline-block",
  padding: "5px 7px",
  border:
    "1px solid rgba(255,255,255,0.07)",
  borderRadius: 999,
  background:
    "rgba(255,255,255,0.025)",
  color: "#9ca3af",
  fontSize: 8,
  fontWeight: 750,
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