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

type CompetitionVisibility =
  | "public"
  | "private"
  | "friends";

type CompetitionStatus =
  | "upcoming"
  | "active"
  | "completed";

type CompetitionRow = {
  id: string;
  host_id: string;
  name: string;
  description: string | null;
  visibility: CompetitionVisibility;
  starting_cash: number | string;
  start_date: string;
  end_date: string;
  max_players: number | null;
  prize: string | null;
  created_at: string;
};

type CompetitionMemberRow = {
  id: string;
  competition_id: string;
  user_id: string;
  joined_at: string;
};

type CompetitionWithMeta =
  CompetitionRow & {
    memberCount: number;
    joined: boolean;
    isHost: boolean;
    status: CompetitionStatus;
  };

type StatusFilter =
  | "all"
  | CompetitionStatus;

type SortOption =
  | "soonest"
  | "newest"
  | "most-members"
  | "largest-cash";

export default function CompetitionsPage() {
  const router = useRouter();

  const [userId, setUserId] =
    useState("");

  const [competitions, setCompetitions] =
    useState<CompetitionWithMeta[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [joiningId, setJoiningId] =
    useState<string | null>(null);

  const [showCreate, setShowCreate] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [sort, setSort] =
    useState<SortOption>("soonest");

  const [name, setName] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [visibility, setVisibility] =
    useState<CompetitionVisibility>(
      "public"
    );

  const [startingCash, setStartingCash] =
    useState("100000");

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [maxPlayers, setMaxPlayers] =
    useState("100");

  const [prize, setPrize] =
    useState("");

  const loadCompetitions = useCallback(
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
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        setUserId(user.id);

        const [
          competitionResult,
          memberResult,
        ] = await Promise.all([
          supabase
            .from("competitions")
            .select(
              `
                id,
                host_id,
                name,
                description,
                visibility,
                starting_cash,
                start_date,
                end_date,
                max_players,
                prize,
                created_at
              `
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            ),
          supabase
            .from(
              "competition_members"
            )
            .select(
              `
                id,
                competition_id,
                user_id,
                joined_at
              `
            ),
        ]);

        if (
          competitionResult.error
        ) {
          throw new Error(
            competitionResult.error.message
          );
        }

        if (memberResult.error) {
          throw new Error(
            memberResult.error.message
          );
        }

        const rows =
          (competitionResult.data ||
            []) as CompetitionRow[];

        const members =
          (memberResult.data ||
            []) as CompetitionMemberRow[];

        const memberCountMap =
          new Map<string, number>();

        const joinedSet =
          new Set<string>();

        for (const member of members) {
          memberCountMap.set(
            member.competition_id,
            (memberCountMap.get(
              member.competition_id
            ) || 0) + 1
          );

          if (
            member.user_id === user.id
          ) {
            joinedSet.add(
              member.competition_id
            );
          }
        }

        setCompetitions(
          rows.map((competition) => ({
            ...competition,
            memberCount:
              memberCountMap.get(
                competition.id
              ) || 0,
            joined: joinedSet.has(
              competition.id
            ),
            isHost:
              competition.host_id ===
              user.id,
            status:
              getCompetitionStatus(
                competition.start_date,
                competition.end_date
              ),
          }))
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load competitions."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    loadCompetitions();

    const interval =
      window.setInterval(() => {
        loadCompetitions(true);
      }, 60_000);

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [loadCompetitions]);

  async function createCompetition(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanName =
      name.trim();

    const cash =
      Number(startingCash);

    const playerLimit =
      Number(maxPlayers);

    const start =
      new Date(startDate);

    const end =
      new Date(endDate);

    if (!cleanName) {
      setError(
        "Competition name is required."
      );
      return;
    }

    if (
      !Number.isFinite(cash) ||
      cash <= 0
    ) {
      setError(
        "Starting cash must be greater than zero."
      );
      return;
    }

    if (
      !Number.isInteger(playerLimit) ||
      playerLimit < 2
    ) {
      setError(
        "Maximum players must be at least 2."
      );
      return;
    }

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      setError(
        "Choose valid start and end dates."
      );
      return;
    }

    if (end <= start) {
      setError(
        "The end date must be after the start date."
      );
      return;
    }

    const supabase = createClient();

    try {
      setCreating(true);
      setError("");
      setSuccess("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const {
        data: competition,
        error: createError,
      } = await supabase
        .from("competitions")
        .insert({
          host_id: user.id,
          name: cleanName,
          description:
            description.trim() ||
            null,
          visibility,
          starting_cash: cash,
          start_date:
            start.toISOString(),
          end_date:
            end.toISOString(),
          max_players:
            playerLimit,
          prize:
            prize.trim() || null,
        })
        .select("id")
        .single();

      if (createError) {
        throw new Error(
          createError.message
        );
      }

      const {
        error: joinError,
      } = await supabase
        .from(
          "competition_members"
        )
        .insert({
          competition_id:
            competition.id,
          user_id: user.id,
        });

      if (joinError) {
        throw new Error(
          joinError.message
        );
      }

      setName("");
      setDescription("");
      setVisibility("public");
      setStartingCash("100000");
      setStartDate("");
      setEndDate("");
      setMaxPlayers("100");
      setPrize("");
      setShowCreate(false);

      setSuccess(
        "Competition created successfully."
      );

      await loadCompetitions(true);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create the competition."
      );
    } finally {
      setCreating(false);
    }
  }

  async function joinCompetition(
    competition: CompetitionWithMeta
  ) {
    if (competition.joined) {
      return;
    }

    if (
      competition.status ===
      "completed"
    ) {
      setError(
        "This competition has already ended."
      );
      return;
    }

    if (
      competition.max_players !==
        null &&
      competition.memberCount >=
        competition.max_players
    ) {
      setError(
        "This competition is full."
      );
      return;
    }

    const supabase = createClient();

    try {
      setJoiningId(
        competition.id
      );

      setError("");
      setSuccess("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const {
        error: joinError,
      } = await supabase
        .from(
          "competition_members"
        )
        .insert({
          competition_id:
            competition.id,
          user_id: user.id,
        });

      if (joinError) {
        throw new Error(
          joinError.message
        );
      }

      setSuccess(
        `You joined ${competition.name}.`
      );

      await loadCompetitions(true);
    } catch (joinError) {
      setError(
        joinError instanceof Error
          ? joinError.message
          : "Unable to join the competition."
      );
    } finally {
      setJoiningId(null);
    }
  }

  const visibleCompetitions =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      const filtered =
        competitions.filter(
          (competition) => {
            const matchesSearch =
              !query ||
              competition.name
                .toLowerCase()
                .includes(query) ||
              (
                competition.description ||
                ""
              )
                .toLowerCase()
                .includes(query);

            const matchesStatus =
              statusFilter ===
                "all" ||
              competition.status ===
                statusFilter;

            return (
              matchesSearch &&
              matchesStatus
            );
          }
        );

      return [...filtered].sort(
        (a, b) => {
          if (
            sort === "newest"
          ) {
            return (
              new Date(
                b.created_at
              ).getTime() -
              new Date(
                a.created_at
              ).getTime()
            );
          }

          if (
            sort ===
            "most-members"
          ) {
            return (
              b.memberCount -
              a.memberCount
            );
          }

          if (
            sort ===
            "largest-cash"
          ) {
            return (
              toNumber(
                b.starting_cash
              ) -
              toNumber(
                a.starting_cash
              )
            );
          }

          return (
            new Date(
              a.start_date
            ).getTime() -
            new Date(
              b.start_date
            ).getTime()
          );
        }
      );
    }, [
      competitions,
      search,
      statusFilter,
      sort,
    ]);

  const stats = useMemo(() => {
    return {
      total:
        competitions.length,
      active:
        competitions.filter(
          (competition) =>
            competition.status ===
            "active"
        ).length,
      upcoming:
        competitions.filter(
          (competition) =>
            competition.status ===
            "upcoming"
        ).length,
      joined:
        competitions.filter(
          (competition) =>
            competition.joined
        ).length,
    };
  }, [competitions]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <section style={containerStyle}>
          <div style={cardStyle}>
            <h1>
              Loading Competitions...
            </h1>

            <p style={mutedStyle}>
              Loading community
              paper-trading competitions.
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
              href="/community/leaderboards"
              style={secondaryLinkStyle}
            >
              Leaderboards
            </Link>

            <button
              type="button"
              onClick={() =>
                setShowCreate(
                  (current) =>
                    !current
                )
              }
              style={primaryButtonStyle}
            >
              {showCreate
                ? "Close Form"
                : "Create Competition"}
            </button>

            <button
              type="button"
              onClick={() =>
                loadCompetitions(
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
          Community challenges
        </p>

        <h1 style={titleStyle}>
          Competitions
        </h1>

        <p style={mutedStyle}>
          Create and join virtual
          paper-trading challenges with
          the Norvexa community.
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
            label="Competitions"
            value={String(
              stats.total
            )}
          />

          <StatCard
            label="Active now"
            value={String(
              stats.active
            )}
            color="#4ade80"
          />

          <StatCard
            label="Upcoming"
            value={String(
              stats.upcoming
            )}
            color="#fbbf24"
          />

          <StatCard
            label="Joined"
            value={String(
              stats.joined
            )}
          />
        </div>

        {showCreate && (
          <section
            style={{
              ...createCardStyle,
              marginTop: 16,
            }}
          >
            <p style={eyebrowStyle}>
              Host a challenge
            </p>

            <h2 style={{ margin: 0 }}>
              Create Competition
            </h2>

            <form
              onSubmit={
                createCompetition
              }
              style={{
                marginTop: 18,
              }}
            >
              <div
                className="form-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                <Field
                  label="Competition name"
                  value={name}
                  onChange={setName}
                  placeholder="August Trading Challenge"
                />

                <label>
                  <span
                    style={
                      fieldLabelStyle
                    }
                  >
                    Visibility
                  </span>

                  <select
                    value={visibility}
                    onChange={(event) =>
                      setVisibility(
                        event.target
                          .value as CompetitionVisibility
                      )
                    }
                    style={
                      selectFieldStyle
                    }
                  >
                    <option value="public">
                      Public
                    </option>

                    <option value="friends">
                      Friends
                    </option>

                    <option value="private">
                      Private
                    </option>
                  </select>
                </label>

                <Field
                  label="Starting cash"
                  value={startingCash}
                  onChange={
                    setStartingCash
                  }
                  placeholder="100000"
                  type="number"
                />

                <Field
                  label="Maximum players"
                  value={maxPlayers}
                  onChange={
                    setMaxPlayers
                  }
                  placeholder="100"
                  type="number"
                />

                <Field
                  label="Start date"
                  value={startDate}
                  onChange={
                    setStartDate
                  }
                  placeholder=""
                  type="datetime-local"
                />

                <Field
                  label="End date"
                  value={endDate}
                  onChange={
                    setEndDate
                  }
                  placeholder=""
                  type="datetime-local"
                />

                <Field
                  label="Prize or reward"
                  value={prize}
                  onChange={setPrize}
                  placeholder="Winner badge"
                />
              </div>

              <label
                style={{
                  display: "block",
                  marginTop: 12,
                }}
              >
                <span
                  style={
                    fieldLabelStyle
                  }
                >
                  Description
                </span>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  placeholder="Describe the challenge and its rules..."
                  style={textareaStyle}
                />
              </label>

              <button
                type="submit"
                disabled={creating}
                style={{
                  ...primaryButtonStyle,
                  width: "100%",
                  marginTop: 14,
                }}
              >
                {creating
                  ? "Creating..."
                  : "Create Competition"}
              </button>
            </form>
          </section>
        )}

        <section
          style={{
            ...cardStyle,
            marginTop: 16,
          }}
        >
          <div style={sectionHeaderStyle}>
            <div>
              <p style={eyebrowStyle}>
                Browse challenges
              </p>

              <h2 style={{ margin: 0 }}>
                Community Competitions
              </h2>
            </div>

            <span style={mutedStyle}>
              {
                visibleCompetitions.length
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
              placeholder="Search competitions..."
              style={inputStyle}
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as StatusFilter
                )
              }
              style={selectStyle}
            >
              <option value="all">
                All statuses
              </option>

              <option value="upcoming">
                Upcoming
              </option>

              <option value="active">
                Active
              </option>

              <option value="completed">
                Completed
              </option>
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
              <option value="soonest">
                Starting soonest
              </option>

              <option value="newest">
                Newest
              </option>

              <option value="most-members">
                Most members
              </option>

              <option value="largest-cash">
                Largest starting cash
              </option>
            </select>
          </div>

          {visibleCompetitions.length ===
          0 ? (
            <EmptyState
              title="No competitions found"
              text="Create the first competition or change your search and filters."
            />
          ) : (
            <div
              className="competition-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(300px, 1fr))",
                gap: 12,
                marginTop: 16,
              }}
            >
              {visibleCompetitions.map(
                (competition) => (
                  <CompetitionCard
                    key={
                      competition.id
                    }
                    competition={
                      competition
                    }
                    currentUserId={
                      userId
                    }
                    joining={
                      joiningId ===
                      competition.id
                    }
                    onJoin={() =>
                      joinCompetition(
                        competition
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
            Virtual competitions
          </strong>

          <p
            style={{
              margin: "6px 0 0",
              ...mutedStyle,
              fontSize: 11,
              lineHeight: 1.55,
            }}
          >
            Competitions use
            paper-trading accounts only.
            Starting cash, prizes, and
            rankings are virtual and do
            not represent real-money
            rewards unless separately
            stated by Norvexa.
          </p>
        </div>

        <style jsx>{`
          @media (max-width: 850px) {
            .stats-grid,
            .form-grid {
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
            .form-grid {
              grid-template-columns:
                1fr !important;
            }
          }
        `}</style>
      </section>
    </main>
  );
}

function CompetitionCard({
  competition,
  joining,
  onJoin,
}: {
  competition: CompetitionWithMeta;
  currentUserId: string;
  joining: boolean;
  onJoin: () => void;
}) {
  const full =
    competition.max_players !==
      null &&
    competition.memberCount >=
      competition.max_players;

  const statusColor =
    competition.status === "active"
      ? "#4ade80"
      : competition.status ===
          "upcoming"
        ? "#fbbf24"
        : "#9ca3af";

  return (
    <article style={competitionCardStyle}>
      <div style={sectionHeaderStyle}>
        <StatusBadge
          label={competition.status}
          color={statusColor}
        />

        <VisibilityBadge
          visibility={
            competition.visibility
          }
        />
      </div>

      <h3
        style={{
          margin: "15px 0 0",
          fontSize: 20,
        }}
      >
        {competition.name}
      </h3>

      <p
        style={{
          margin: "8px 0 0",
          color: "#9ca3af",
          fontSize: 11,
          lineHeight: 1.55,
          minHeight: 50,
        }}
      >
        {competition.description ||
          "No competition description was provided."}
      </p>

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
          label="Starting cash"
          value={formatCurrency(
            toNumber(
              competition.starting_cash
            )
          )}
        />

        <MiniStat
          label="Players"
          value={`${competition.memberCount}/${competition.max_players ?? "∞"}`}
        />

        <MiniStat
          label="Starts"
          value={formatDate(
            competition.start_date
          )}
        />

        <MiniStat
          label="Ends"
          value={formatDate(
            competition.end_date
          )}
        />
      </div>

      <div style={countdownStyle}>
        <span
          style={{
            color: statusColor,
            fontWeight: 850,
          }}
        >
          {getCountdownText(
            competition
          )}
        </span>
      </div>

      {competition.prize && (
        <div style={prizeStyle}>
          <span
            style={{
              ...mutedStyle,
              fontSize: 9,
            }}
          >
            Prize
          </span>

          <strong
            style={{
              display: "block",
              marginTop: 5,
              color: "#fbbf24",
            }}
          >
            {competition.prize}
          </strong>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginTop: 14,
        }}
      >
        {competition.isHost ? (
          <StatusAction>
            Hosted by you
          </StatusAction>
        ) : competition.joined ? (
          <StatusAction>
            Joined
          </StatusAction>
        ) : (
          <button
            type="button"
            onClick={onJoin}
            disabled={
              joining ||
              full ||
              competition.status ===
                "completed"
            }
            style={{
              ...primarySmallButtonStyle,
              opacity:
                full ||
                competition.status ===
                  "completed"
                  ? 0.5
                  : 1,
            }}
          >
            {joining
              ? "Joining..."
              : full
                ? "Competition Full"
                : competition.status ===
                    "completed"
                  ? "Competition Ended"
                  : "Join Competition"}
          </button>
        )}
      </div>
    </article>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label>
      <span style={fieldLabelStyle}>
        {label}
      </span>

      <input
        type={type}
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

function StatusBadge({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 8px",
        border:
          `1px solid ${color}55`,
        borderRadius: 999,
        background: `${color}14`,
        color,
        fontSize: 9,
        fontWeight: 850,
        textTransform:
          "capitalize",
      }}
    >
      {label}
    </span>
  );
}

function VisibilityBadge({
  visibility,
}: {
  visibility: CompetitionVisibility;
}) {
  return (
    <span style={visibilityBadgeStyle}>
      {visibility === "public"
        ? "Public"
        : visibility ===
            "friends"
          ? "Friends"
          : "Private"}
    </span>
  );
}

function StatusAction({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span style={joinedStyle}>
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
          fontSize: 12,
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

function getCompetitionStatus(
  startDate: string,
  endDate: string
): CompetitionStatus {
  const now = Date.now();
  const start =
    new Date(startDate).getTime();
  const end =
    new Date(endDate).getTime();

  if (now < start) {
    return "upcoming";
  }

  if (now >= end) {
    return "completed";
  }

  return "active";
}

function getCountdownText(
  competition: CompetitionWithMeta
) {
  if (
    competition.status ===
    "completed"
  ) {
    return "Competition completed";
  }

  const target =
    competition.status === "upcoming"
      ? new Date(
          competition.start_date
        ).getTime()
      : new Date(
          competition.end_date
        ).getTime();

  const difference =
    Math.max(
      0,
      target - Date.now()
    );

  const days =
    Math.floor(
      difference /
        86_400_000
    );

  const hours =
    Math.floor(
      (difference %
        86_400_000) /
        3_600_000
    );

  const minutes =
    Math.floor(
      (difference %
        3_600_000) /
        60_000
    );

  const prefix =
    competition.status ===
    "upcoming"
      ? "Starts in"
      : "Ends in";

  if (days > 0) {
    return `${prefix} ${days}d ${hours}h`;
  }

  return `${prefix} ${hours}h ${minutes}m`;
}

function formatDate(
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

function formatCurrency(
  value: number
) {
  return value.toLocaleString(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }
  );
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

const createCardStyle = {
  padding: 20,
  border:
    "1px solid rgba(96,165,250,0.22)",
  borderRadius: 15,
  background:
    "linear-gradient(145deg, rgba(37,99,235,0.09), rgba(255,255,255,0.03))",
};

const competitionCardStyle = {
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

const countdownStyle = {
  marginTop: 13,
  padding: 10,
  border:
    "1px solid rgba(255,255,255,0.065)",
  borderRadius: 9,
  background:
    "rgba(255,255,255,0.02)",
  fontSize: 11,
};

const prizeStyle = {
  marginTop: 10,
  padding: 11,
  border:
    "1px solid rgba(251,191,36,0.17)",
  borderRadius: 9,
  background:
    "rgba(251,191,36,0.045)",
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
  minHeight: 100,
  resize: "vertical" as const,
  fontFamily: "inherit",
};

const selectStyle = {
  minWidth: 155,
  padding: "10px 11px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  borderRadius: 9,
  background: "#111827",
  color: "white",
  outline: "none",
};

const selectFieldStyle = {
  ...inputStyle,
  background: "#111827",
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

const primarySmallButtonStyle = {
  padding: "9px 11px",
  border: "none",
  borderRadius: 8,
  background: "#2563eb",
  color: "white",
  fontSize: 10,
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

const visibilityBadgeStyle = {
  display: "inline-block",
  padding: "5px 8px",
  border:
    "1px solid rgba(96,165,250,0.18)",
  borderRadius: 999,
  background:
    "rgba(37,99,235,0.05)",
  color: "#93c5fd",
  fontSize: 9,
  fontWeight: 800,
};

const joinedStyle = {
  display: "inline-block",
  padding: "9px 11px",
  border:
    "1px solid rgba(34,197,94,0.23)",
  borderRadius: 8,
  background:
    "rgba(34,197,94,0.07)",
  color: "#4ade80",
  fontSize: 10,
  fontWeight: 800,
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