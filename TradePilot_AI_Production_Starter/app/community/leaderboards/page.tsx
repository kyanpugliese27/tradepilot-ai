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

type LeaderboardPeriod =
  | "weekly"
  | "monthly"
  | "all_time";

type RankingRow = {
  rank: number;
  userId: string;
  username: string | null;
  displayName: string | null;
  bio: string;
  avatarUrl: string | null;
  investingStyle: string | null;
  portfolioValue: number | null;
  returnAmount: number | null;
  returnPercent: number | null;
  realizedGainLoss: number | null;
  winRate: number | null;
  totalTrades: number;
  calculatedAt: string;
  viewerIsUser?: boolean;
};

type LeaderboardResponse = {
  success: boolean;
  error?: string;
  period: LeaderboardPeriod;
  periodStart: string;
  periodEnd: string;
  rankings: RankingRow[];
  currentUser: RankingRow | null;
};

type SortOption =
  | "rank"
  | "return"
  | "portfolio"
  | "win-rate"
  | "trades";

const periodLabels: Record<
  LeaderboardPeriod,
  string
> = {
  weekly: "Weekly",
  monthly: "Monthly",
  all_time: "All Time",
};

function safeLower(
  value: string | null | undefined
) {
  return (
    value ?? ""
  ).toLowerCase();
}

export default function LeaderboardsPage() {
  const router = useRouter();

  const [period, setPeriod] =
    useState<LeaderboardPeriod>("weekly");

  const [data, setData] =
    useState<LeaderboardResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [sort, setSort] =
    useState<SortOption>("rank");

  const [error, setError] =
    useState("");

  const [
    followedUsernames,
    setFollowedUsernames,
  ] = useState<Set<string>>(
    () => new Set()
  );

  const [
    followWorkingUsername,
    setFollowWorkingUsername,
  ] = useState<string | null>(
    null
  );

  const [
    followError,
    setFollowError,
  ] = useState("");

  const loadLeaderboard =
    useCallback(
      async (
        selectedPeriod: LeaderboardPeriod,
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
            data: result,
            error: rpcError,
          } = await supabase.rpc(
            "get_tradepilot_leaderboard",
            {
              requested_period:
                selectedPeriod,
              requested_limit: 100,
            }
          );

          if (rpcError) {
            throw new Error(
              rpcError.message
            );
          }

          const response =
            result as LeaderboardResponse;

          if (
            !response?.success
          ) {
            throw new Error(
              response?.error ||
                "Unable to load the leaderboard."
            );
          }

          setData({
            ...response,
            rankings:
              Array.isArray(
                response.rankings
              )
                ? response.rankings.map(
                    (row) => ({
                      ...row,
                      username:
                        row.username ??
                        null,
                      displayName:
                        row.displayName ||
                        "Trader",
                      investingStyle:
                        row.investingStyle ||
                        "Balanced",
                    })
                  )
                : [],
            currentUser:
              response.currentUser ||
              null,
          });
        } catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load the leaderboard."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [router]
    );

  const loadFollowing =
    useCallback(async () => {
      const supabase =
        createClient();

      try {
        setFollowError("");

        const {
          data: result,
          error: rpcError,
        } = await supabase.rpc(
          "get_tradepilot_following"
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
            following?: Array<{
              username: string;
            }>;
          };

        if (!response?.success) {
          throw new Error(
            response?.error ||
              "Unable to load followed traders."
          );
        }

        setFollowedUsernames(
          new Set(
            (
              response.following ||
              []
            ).map((item) =>
              item.username
                .trim()
                .toLowerCase()
            )
          )
        );
      } catch (loadFollowError) {
        setFollowError(
          loadFollowError instanceof Error
            ? loadFollowError.message
            : "Unable to load followed traders."
        );
      }
    }, []);

  async function toggleFollow(
    username: string
  ) {
    const normalized =
      username
        .trim()
        .toLowerCase();

    if (
      !normalized ||
      followWorkingUsername
    ) {
      return;
    }

    const supabase =
      createClient();

    try {
      setFollowWorkingUsername(
        normalized
      );
      setFollowError("");

      const {
        data: result,
        error: rpcError,
      } = await supabase.rpc(
        "toggle_tradepilot_follow",
        {
          requested_username:
            normalized,
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
        };

      if (!response?.success) {
        throw new Error(
          response?.error ||
            "Unable to update follow status."
        );
      }

      setFollowedUsernames(
        (current) => {
          const next =
            new Set(current);

          if (
            response.following
          ) {
            next.add(
              normalized
            );
          } else {
            next.delete(
              normalized
            );
          }

          return next;
        }
      );
    } catch (toggleError) {
      setFollowError(
        toggleError instanceof Error
          ? toggleError.message
          : "Unable to update follow status."
      );
    } finally {
      setFollowWorkingUsername(
        null
      );
    }
  }

  useEffect(() => {
    loadFollowing();
  }, [loadFollowing]);

  useEffect(() => {
    loadLeaderboard(period);

    const interval =
      window.setInterval(() => {
        loadLeaderboard(
          period,
          true
        );
      }, 60_000);

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    loadLeaderboard,
    period,
  ]);

  const visibleRankings =
    useMemo(() => {
      const rankings =
        data?.rankings || [];

      const query =
        search
          .trim()
          .toLowerCase();

      const filtered =
        rankings.filter(
          (ranking) => {
            if (!query) {
              return true;
            }

            return (
              safeLower(
                ranking.username
              )
                .includes(query) ||
              safeLower(
                ranking.displayName
              )
                .includes(query) ||
              safeLower(
                ranking.investingStyle
              )
                .includes(query)
            );
          }
        );

      return [...filtered].sort(
        (a, b) => {
          if (
            sort === "return"
          ) {
            return (
              toNumber(
                b.returnPercent
              ) -
              toNumber(
                a.returnPercent
              )
            );
          }

          if (
            sort === "portfolio"
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
            sort === "win-rate"
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

          return a.rank - b.rank;
        }
      );
    }, [
      data,
      search,
      sort,
    ]);

  const podium =
    useMemo(() => {
      const rankings =
        data?.rankings || [];

      return {
        first:
          rankings.find(
            (row) =>
              row.rank === 1
          ) || null,
        second:
          rankings.find(
            (row) =>
              row.rank === 2
          ) || null,
        third:
          rankings.find(
            (row) =>
              row.rank === 3
          ) || null,
      };
    }, [data]);

  const stats =
    useMemo(() => {
      const rankings =
        data?.rankings || [];

      const activeTraders =
        rankings.filter(
          (row) =>
            row.totalTrades > 0
        ).length;

      const averageReturn =
        rankings.length > 0
          ? rankings.reduce(
              (sum, row) =>
                sum +
                toNumber(
                  row.returnPercent
                ),
              0
            ) /
            rankings.length
          : 0;

      const averageWinRate =
        rankings.length > 0
          ? rankings.reduce(
              (sum, row) =>
                sum +
                toNumber(
                  row.winRate
                ),
              0
            ) /
            rankings.length
          : 0;

      return {
        traders:
          rankings.length,
        activeTraders,
        averageReturn,
        averageWinRate,
      };
    }, [data]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <section style={containerStyle}>
          <div style={cardStyle}>
            <h1>
              Loading Leaderboards...
            </h1>

            <p style={mutedStyle}>
              Calculating public
              paper-trading rankings.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (
    error ||
    !data
  ) {
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
              marginTop: 20,
            }}
          >
            <h1
              style={{
                color: "#ff8a8a",
              }}
            >
              Leaderboard unavailable
            </h1>

            <p style={mutedStyle}>
              {error ||
                "Leaderboard data could not be loaded."}
            </p>

            <button
              type="button"
              onClick={() =>
                loadLeaderboard(
                  period,
                  true
                )
              }
              style={{
                ...primaryButtonStyle,
                marginTop: 10,
              }}
            >
              Try Again
            </button>
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

            <button
              type="button"
              onClick={() =>
                loadLeaderboard(
                  period,
                  true
                )
              }
              disabled={refreshing}
              style={secondaryButtonStyle}
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh Rankings"}
            </button>
          </div>
        </div>

        <p style={eyebrowStyle}>
          Community competition
        </p>

        <h1 style={titleStyle}>
          Leaderboards
        </h1>

        <p style={mutedStyle}>
          Compare public
          paper-trading performance
          across weekly, monthly, and
          all-time rankings.
        </p>

        {followError && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              border:
                "1px solid rgba(239,68,68,0.22)",
              borderRadius: 10,
              background:
                "rgba(239,68,68,0.07)",
              color: "#ff8a8a",
              fontSize: 10,
            }}
          >
            {followError}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginTop: 20,
          }}
        >
          {(
            [
              "weekly",
              "monthly",
              "all_time",
            ] as LeaderboardPeriod[]
          ).map((option) => (
            <PeriodButton
              key={option}
              label={
                periodLabels[
                  option
                ]
              }
              active={
                period === option
              }
              onClick={() =>
                setPeriod(option)
              }
            />
          ))}
        </div>

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
          <StatCard
            label="Ranked traders"
            value={String(
              stats.traders
            )}
          />

          <StatCard
            label="Active traders"
            value={String(
              stats.activeTraders
            )}
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
            label="Average win rate"
            value={`${stats.averageWinRate.toFixed(
              2
            )}%`}
          />
        </div>

        {data.currentUser && (
          <section
            style={{
              ...currentUserCardStyle,
              marginTop: 16,
            }}
          >
            <div>
              <p style={eyebrowStyle}>
                Your ranking
              </p>

              <h2
                style={{
                  margin: 0,
                }}
              >
                #{data.currentUser.rank}
                {" · "}
                {
                  periodLabels[
                    period
                  ]
                }
              </h2>

              <p
                style={{
                  margin: "7px 0 0",
                  ...mutedStyle,
                  fontSize: 11,
                }}
              >
                @{data.currentUser.username}
              </p>
            </div>

            <div
              className="current-user-stats"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, minmax(100px, 1fr))",
                gap: 10,
              }}
            >
              <MiniStat
                label="Return"
                value={
                  data.currentUser
                    .returnPercent ===
                  null
                    ? "Hidden"
                    : formatSignedPercent(
                        data.currentUser
                          .returnPercent
                      )
                }
                color={
                  toNumber(
                    data.currentUser
                      .returnPercent
                  ) >= 0
                    ? "#4ade80"
                    : "#ff8a8a"
                }
              />

              <MiniStat
                label="Win rate"
                value={
                  data.currentUser
                    .winRate === null
                    ? "Hidden"
                    : `${data.currentUser.winRate.toFixed(
                        2
                      )}%`
                }
              />

              <MiniStat
                label="Trades"
                value={String(
                  data.currentUser
                    .totalTrades
                )}
              />

              <MiniStat
                label="Portfolio"
                value={
                  data.currentUser
                    .portfolioValue ===
                  null
                    ? "Hidden"
                    : formatCurrency(
                        data.currentUser
                          .portfolioValue
                      )
                }
              />
            </div>
          </section>
        )}

        <section
          style={{
            ...cardStyle,
            marginTop: 16,
          }}
        >
          <SectionHeading
            eyebrow="Top performers"
            title={`${periodLabels[period]} Podium`}
            subtitle={getPeriodDescription(
              period,
              data.periodStart,
              data.periodEnd
            )}
          />

          {data.rankings.length <
          1 ? (
            <EmptyState
              title="No rankings yet"
              text="Public users will appear after their leaderboard data is calculated."
            />
          ) : (
            <div
              className="podium-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, minmax(0, 1fr))",
                gap: 12,
                alignItems: "end",
                marginTop: 20,
              }}
            >
              <PodiumCard
                ranking={
                  podium.second
                }
                place={2}
                followedUsernames={
                  followedUsernames
                }
                followWorkingUsername={
                  followWorkingUsername
                }
                onToggleFollow={
                  toggleFollow
                }
              />

              <PodiumCard
                ranking={
                  podium.first
                }
                place={1}
                followedUsernames={
                  followedUsernames
                }
                followWorkingUsername={
                  followWorkingUsername
                }
                onToggleFollow={
                  toggleFollow
                }
              />

              <PodiumCard
                ranking={
                  podium.third
                }
                place={3}
                followedUsernames={
                  followedUsernames
                }
                followWorkingUsername={
                  followWorkingUsername
                }
                onToggleFollow={
                  toggleFollow
                }
              />
            </div>
          )}
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
                Full standings
              </p>

              <h2 style={{ margin: 0 }}>
                Rankings
              </h2>
            </div>

            <span style={mutedStyle}>
              {
                visibleRankings.length
              }{" "}
              shown
            </span>
          </div>

          <div
            className="controls-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr auto",
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
              placeholder="Search username, display name, or style..."
              style={inputStyle}
            />

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
              <option value="rank">
                Official rank
              </option>

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
            </select>
          </div>

          {visibleRankings.length ===
          0 ? (
            <EmptyState
              title="No matching traders"
              text="Try another search or sort option."
            />
          ) : (
            <>
              <div
                className="desktop-table"
                style={{
                  overflowX: "auto",
                  marginTop: 16,
                }}
              >
                <div
                  style={{
                    minWidth: 1080,
                  }}
                >
                  <LeaderboardHeader />

                  {visibleRankings.map(
                    (ranking) => (
                      <LeaderboardRow
                        key={
                          ranking.userId
                        }
                        ranking={
                          ranking
                        }
                        followed={
                          followedUsernames.has(
                            safeLower(
                              ranking.username
                            )
                          )
                        }
                        working={
                          followWorkingUsername ===
                          safeLower(
                            ranking.username
                          )
                        }
                        onToggleFollow={() =>
                          toggleFollow(
                            ranking.username ?? ""
                          )
                        }
                      />
                    )
                  )}
                </div>
              </div>

              <div
                className="mobile-cards"
                style={{
                  display: "none",
                  marginTop: 16,
                }}
              >
                {visibleRankings.map(
                  (ranking) => (
                    <LeaderboardCard
                      key={
                        ranking.userId
                      }
                      ranking={
                        ranking
                      }
                      followed={
                        followedUsernames.has(
                          safeLower(
                            ranking.username
                          )
                        )
                      }
                      working={
                        followWorkingUsername ===
                        safeLower(
                          ranking.username
                        )
                      }
                      onToggleFollow={() =>
                        toggleFollow(
                          ranking.username ?? ""
                        )
                      }
                    />
                  )
                )}
              </div>
            </>
          )}
        </section>

        <div style={noticeStyle}>
          <strong>
            Paper-trading rankings
          </strong>

          <p
            style={{
              margin: "6px 0 0",
              ...mutedStyle,
              fontSize: 11,
              lineHeight: 1.55,
            }}
          >
            Rankings use virtual
            TradePilot performance only.
            They do not represent
            verified brokerage assets,
            real-money returns, or
            investment skill guarantees.
          </p>
        </div>

        <style jsx>{`
          @media (max-width: 950px) {
            .stats-grid {
              grid-template-columns:
                repeat(
                  2,
                  minmax(0, 1fr)
                ) !important;
            }

            .podium-grid {
              grid-template-columns:
                1fr !important;
              align-items:
                stretch !important;
            }

            .current-user-stats {
              grid-template-columns:
                repeat(
                  2,
                  minmax(0, 1fr)
                ) !important;
            }
          }

          @media (max-width: 700px) {
            .desktop-table {
              display: none !important;
            }

            .mobile-cards {
              display: flex !important;
              flex-direction: column;
              gap: 10px;
            }
          }

          @media (max-width: 560px) {
            .stats-grid,
            .current-user-stats,
            .controls-grid {
              grid-template-columns:
                1fr !important;
            }
          }
        `}</style>
      </section>
    </main>
  );
}

function PodiumCard({
  ranking,
  place,
  followedUsernames,
  followWorkingUsername,
  onToggleFollow,
}: {
  ranking: RankingRow | null;
  place: 1 | 2 | 3;
  followedUsernames:
    Set<string>;
  followWorkingUsername:
    string | null;
  onToggleFollow:
    (username: string) => void;
}) {
  const height =
    place === 1
      ? 280
      : place === 2
        ? 245
        : 225;

  const medal =
    place === 1
      ? "🥇"
      : place === 2
        ? "🥈"
        : "🥉";

  if (!ranking) {
    return (
      <article
        style={{
          ...podiumCardStyle,
          minHeight: height,
          opacity: 0.45,
        }}
      >
        <div
          style={{
            fontSize: 34,
          }}
        >
          {medal}
        </div>

        <strong
          style={{
            display: "block",
            marginTop: 12,
          }}
        >
          Position open
        </strong>
      </article>
    );
  }

  return (
    <article
      style={{
        ...podiumCardStyle,
        minHeight: height,
        border:
          place === 1
            ? "1px solid rgba(251,191,36,0.35)"
            : podiumCardStyle.border,
        background:
          place === 1
            ? "linear-gradient(145deg, rgba(251,191,36,0.09), rgba(255,255,255,0.03))"
            : podiumCardStyle.background,
      }}
    >
      <div
        style={{
          fontSize: 35,
        }}
      >
        {medal}
      </div>

      <Avatar
        url={
          ranking.avatarUrl ||
          ""
        }
        name={
          ranking.displayName
        }
        size={66}
      />

      <Link
        href={
          ranking.username
            ? `/community/${ranking.username}`
            : "#"
        }
        style={{
          marginTop: 12,
          color: "#f9fafb",
          fontSize: 19,
          fontWeight: 850,
          textDecoration: "none",
        }}
      >
        {ranking.displayName || "Trader"}
      </Link>

      <span
        style={{
          marginTop: 4,
          color: "#93c5fd",
          fontSize: 10,
          fontWeight: 800,
        }}
      >
        @{ranking.username || "trader"}
      </span>

      <span
        style={{
          marginTop: 7,
          ...mutedStyle,
          fontSize: 9,
        }}
      >
        {ranking.investingStyle || "Balanced"}
      </span>

      <strong
        style={{
          marginTop: 14,
          color:
            toNumber(
              ranking.returnPercent
            ) >= 0
              ? "#4ade80"
              : "#ff8a8a",
          fontSize: 23,
        }}
      >
        {ranking.returnPercent ===
        null
          ? "Hidden"
          : formatSignedPercent(
              ranking.returnPercent
            )}
      </strong>

      <span
        style={{
          marginTop: 5,
          ...mutedStyle,
          fontSize: 9,
        }}
      >
        {ranking.totalTrades} trades
      </span>

      {!ranking.viewerIsUser &&
        ranking.username && (
        <FollowButton
          followed={
            followedUsernames.has(
              safeLower(
                ranking.username
              )
            )
          }
          working={
            followWorkingUsername ===
            safeLower(
              ranking.username
            )
          }
          onClick={() =>
            onToggleFollow(
              ranking.username ?? ""
            )
          }
          style={{
            marginTop: 14,
          }}
        />
      )}
    </article>
  );
}

function LeaderboardHeader() {
  const columns = [
    "Rank",
    "Trader",
    "Return",
    "Portfolio",
    "Realized P/L",
    "Win rate",
    "Trades",
    "Follow",
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "0.55fr 1.8fr 1fr 1.1fr 1fr 0.9fr 0.7fr 0.9fr",
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
      {columns.map((column) => (
        <span key={column}>
          {column}
        </span>
      ))}
    </div>
  );
}

function LeaderboardRow({
  ranking,
  followed,
  working,
  onToggleFollow,
}: {
  ranking: RankingRow;
  followed: boolean;
  working: boolean;
  onToggleFollow: () => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "0.55fr 1.8fr 1fr 1.1fr 1fr 0.9fr 0.7fr 0.9fr",
        gap: 10,
        padding: 10,
        borderTop:
          "1px solid rgba(255,255,255,0.07)",
        alignItems: "center",
        background:
          ranking.viewerIsUser
            ? "rgba(37,99,235,0.055)"
            : "transparent",
      }}
    >
      <RankValue
        rank={ranking.rank}
      />

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          minWidth: 0,
        }}
      >
        <Avatar
          url={
            ranking.avatarUrl ||
            ""
          }
          name={
            ranking.displayName
          }
          size={40}
        />

        <div
          style={{
            minWidth: 0,
          }}
        >
          <Link
            href={
          ranking.username
            ? `/community/${ranking.username}`
            : "#"
        }
            style={{
              color:
                "#93c5fd",
              fontWeight: 850,
              textDecoration:
                "none",
            }}
          >
            {ranking.displayName || "Trader"}
          </Link>

          <p
            style={{
              margin:
                "3px 0 0",
              ...mutedStyle,
              fontSize: 9,
            }}
          >
            @{ranking.username || "trader"}
            {" · "}
            {
              ranking.investingStyle
            }
          </p>
        </div>
      </div>

      <MetricValue
        value={
          ranking.returnPercent ===
          null
            ? "Hidden"
            : formatSignedPercent(
                ranking.returnPercent
              )
        }
        numericValue={
          ranking.returnPercent
        }
      />

      <span>
        {ranking.portfolioValue ===
        null
          ? "Hidden"
          : formatCurrency(
              ranking.portfolioValue
            )}
      </span>

      <MetricValue
        value={
          ranking.realizedGainLoss ===
          null
            ? "Hidden"
            : formatSignedCurrency(
                ranking.realizedGainLoss
              )
        }
        numericValue={
          ranking.realizedGainLoss
        }
      />

      <span>
        {ranking.winRate ===
        null
          ? "Hidden"
          : `${ranking.winRate.toFixed(
              2
            )}%`}
      </span>

      <span>
        {ranking.totalTrades}
      </span>

      {ranking.viewerIsUser ||
      !ranking.username ? (
        <span
          style={{
            color: "#6b7280",
            fontSize: 9,
          }}
        >
          {ranking.viewerIsUser
            ? "You"
            : "No username"}
        </span>
      ) : (
        <FollowButton
          followed={followed}
          working={working}
          onClick={
            onToggleFollow
          }
          compact
        />
      )}
    </div>
  );
}

function LeaderboardCard({
  ranking,
  followed,
  working,
  onToggleFollow,
}: {
  ranking: RankingRow;
  followed: boolean;
  working: boolean;
  onToggleFollow: () => void;
}) {
  return (
    <article
      style={{
        ...innerCardStyle,
        background:
          ranking.viewerIsUser
            ? "rgba(37,99,235,0.055)"
            : innerCardStyle.background,
      }}
    >
      <div style={sectionHeaderStyle}>
        <div
          style={{
            display: "flex",
            gap: 11,
            alignItems: "center",
          }}
        >
          <RankValue
            rank={ranking.rank}
          />

          <Avatar
            url={
              ranking.avatarUrl ||
              ""
            }
            name={
              ranking.displayName
            }
            size={48}
          />

          <div>
            <Link
              href={
          ranking.username
            ? `/community/${ranking.username}`
            : "#"
        }
              style={{
                color:
                  "#93c5fd",
                fontWeight:
                  850,
                textDecoration:
                  "none",
              }}
            >
              {ranking.displayName || "Trader"}
            </Link>

            <p
              style={{
                margin:
                  "3px 0 0",
                ...mutedStyle,
                fontSize: 9,
              }}
            >
              @{ranking.username || "trader"}
            </p>
          </div>
        </div>

        <MetricValue
          value={
            ranking.returnPercent ===
            null
              ? "Hidden"
              : formatSignedPercent(
                  ranking.returnPercent
                )
          }
          numericValue={
            ranking.returnPercent
          }
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
          gap: 8,
          marginTop: 13,
        }}
      >
        <MiniStat
          label="Portfolio"
          value={
            ranking.portfolioValue ===
            null
              ? "Hidden"
              : formatCurrency(
                  ranking.portfolioValue
                )
          }
        />

        <MiniStat
          label="Win rate"
          value={
            ranking.winRate ===
            null
              ? "Hidden"
              : `${ranking.winRate.toFixed(
                  2
                )}%`
          }
        />

        <MiniStat
          label="Realized P/L"
          value={
            ranking.realizedGainLoss ===
            null
              ? "Hidden"
              : formatSignedCurrency(
                  ranking.realizedGainLoss
                )
          }
          color={
            toNumber(
              ranking.realizedGainLoss
            ) >= 0
              ? "#4ade80"
              : "#ff8a8a"
          }
        />

        <MiniStat
          label="Trades"
          value={String(
            ranking.totalTrades
          )}
        />
      </div>

      {!ranking.viewerIsUser &&
        ranking.username && (
        <div
          style={{
            display: "flex",
            justifyContent:
              "flex-end",
            marginTop: 11,
          }}
        >
          <FollowButton
            followed={followed}
            working={working}
            onClick={
              onToggleFollow
            }
          />
        </div>
      )}
    </article>
  );
}

function FollowButton({
  followed,
  working,
  onClick,
  compact = false,
  style,
}: {
  followed: boolean;
  working: boolean;
  onClick: () => void;
  compact?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={working}
      style={{
        padding: compact
          ? "6px 8px"
          : "8px 11px",
        border: followed
          ? "1px solid rgba(74,222,128,0.28)"
          : "1px solid rgba(96,165,250,0.25)",
        borderRadius: 999,
        background: followed
          ? "rgba(34,197,94,0.10)"
          : "rgba(37,99,235,0.10)",
        color: followed
          ? "#4ade80"
          : "#93c5fd",
        fontSize: compact
          ? 8
          : 9,
        fontWeight: 900,
        whiteSpace:
          "nowrap",
        cursor: working
          ? "wait"
          : "pointer",
        opacity: working
          ? 0.6
          : 1,
        ...style,
      }}
    >
      {working
        ? "..."
        : followed
          ? "✓ Following"
          : "＋ Follow"}
    </button>
  );
}

function RankValue({
  rank,
}: {
  rank: number;
}) {
  const medal =
    rank === 1
      ? "🥇"
      : rank === 2
        ? "🥈"
        : rank === 3
          ? "🥉"
          : null;

  return (
    <strong
      style={{
        color:
          rank <= 3
            ? "#fbbf24"
            : "#f9fafb",
        fontSize:
          rank <= 3
            ? 18
            : 15,
      }}
    >
      {medal || `#${rank}`}
    </strong>
  );
}

function MetricValue({
  value,
  numericValue,
}: {
  value: string;
  numericValue:
    | number
    | null;
}) {
  const number =
    toNumber(
      numericValue
    );

  return (
    <strong
      style={{
        color:
          numericValue === null
            ? "#9ca3af"
            : number >= 0
              ? "#4ade80"
              : "#ff8a8a",
      }}
    >
      {value}
    </strong>
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
          14,
          size * 0.3
        ),
      }}
    >
      {getInitials(name)}
    </div>
  );
}

function PeriodButton({
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
        padding: "9px 13px",
        border: active
          ? "1px solid rgba(96,165,250,0.35)"
          : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 9,
        background: active
          ? "rgba(37,99,235,0.1)"
          : "rgba(255,255,255,0.025)",
        color: active
          ? "#93c5fd"
          : "#9ca3af",
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
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

function getPeriodDescription(
  period: LeaderboardPeriod,
  start: string,
  end: string
) {
  if (
    period === "all_time"
  ) {
    return "All public TradePilot paper-trading performance.";
  }

  const startDate =
    new Date(start);
  const endDate =
    new Date(end);

  if (
    Number.isNaN(
      startDate.getTime()
    ) ||
    Number.isNaN(
      endDate.getTime()
    )
  ) {
    return `${periodLabels[period]} paper-trading rankings.`;
  }

  return `${formatDate(
    startDate
  )} through ${formatDate(
    new Date(
      endDate.getTime() -
        1
    )
  )}.`;
}

function formatDate(
  date: Date
) {
  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
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

const podiumCardStyle = {
  padding: 19,
  border:
    "1px solid rgba(255,255,255,0.085)",
  borderRadius: 15,
  background:
    "rgba(255,255,255,0.028)",
  display: "flex",
  flexDirection:
    "column" as const,
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center" as const,
};

const currentUserCardStyle = {
  padding: 18,
  border:
    "1px solid rgba(96,165,250,0.24)",
  borderRadius: 15,
  background:
    "linear-gradient(145deg, rgba(37,99,235,0.1), rgba(255,255,255,0.03))",
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 18,
  flexWrap: "wrap" as const,
};

const innerCardStyle = {
  padding: 15,
  border:
    "1px solid rgba(255,255,255,0.07)",
  borderRadius: 11,
  background:
    "rgba(255,255,255,0.025)",
};

const miniCardStyle = {
  padding: 10,
  border:
    "1px solid rgba(255,255,255,0.065)",
  borderRadius: 9,
  background:
    "rgba(255,255,255,0.022)",
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
  minWidth: 180,
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