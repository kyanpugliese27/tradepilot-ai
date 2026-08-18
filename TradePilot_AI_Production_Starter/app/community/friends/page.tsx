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

type CommunityUser = {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  investingStyle: string;
  createdAt: string;
};

type FriendRow = CommunityUser & {
  friendshipId: string;
};

type RequestRow = CommunityUser & {
  requestId: string;
};

type FriendsResponse = {
  friends: FriendRow[];
  incomingRequests: RequestRow[];
  outgoingRequests: RequestRow[];
};

type SearchProfile = {
  user_id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  investing_style: string;
  profile_visibility: string;
};

type ActionResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

type ActiveTab =
  | "friends"
  | "incoming"
  | "outgoing";

export default function FriendsPage() {
  const router = useRouter();

  const [friendsData, setFriendsData] =
    useState<FriendsResponse>({
      friends: [],
      incomingRequests: [],
      outgoingRequests: [],
    });

  const [searchResults, setSearchResults] =
    useState<SearchProfile[]>([]);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [activeTab, setActiveTab] =
    useState<ActiveTab>("friends");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [searching, setSearching] =
    useState(false);

  const [workingId, setWorkingId] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const loadFriends = useCallback(
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

        const {
          data,
          error: rpcError,
        } = await supabase.rpc(
          "get_Norvexa_friends"
        );

        if (rpcError) {
          throw new Error(
            rpcError.message
          );
        }

        const result =
          data as FriendsResponse;

        setFriendsData({
          friends: Array.isArray(
            result?.friends
          )
            ? result.friends
            : [],
          incomingRequests:
            Array.isArray(
              result?.incomingRequests
            )
              ? result.incomingRequests
              : [],
          outgoingRequests:
            Array.isArray(
              result?.outgoingRequests
            )
              ? result.outgoingRequests
              : [],
        });
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your friends."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    loadFriends();

    const interval =
      window.setInterval(() => {
        loadFriends(true);
      }, 60_000);

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [loadFriends]);

  async function searchUsers(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const query =
      searchQuery
        .trim()
        .toLowerCase();

    if (query.length < 2) {
      setError(
        "Enter at least 2 characters."
      );
      return;
    }

    const supabase = createClient();

    try {
      setSearching(true);
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
        data,
        error: searchError,
      } = await supabase
        .from("community_profiles")
        .select(
          `
            user_id,
            username,
            display_name,
            bio,
            avatar_url,
            investing_style,
            profile_visibility
          `
        )
        .neq("user_id", user.id)
        .not("username", "is", null)
        .or(
          `username.ilike.%${escapeSearch(query)}%,display_name.ilike.%${escapeSearch(query)}%`
        )
        .limit(20);

      if (searchError) {
        throw new Error(
          searchError.message
        );
      }

      setSearchResults(
        (data as SearchProfile[]) ??
          []
      );
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Unable to search users."
      );
    } finally {
      setSearching(false);
    }
  }

  async function sendRequest(
    username: string
  ) {
    const supabase = createClient();

    try {
      setWorkingId(username);
      setError("");
      setSuccess("");

      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "send_friend_request",
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

      const result =
        data as ActionResponse;

      if (!result.success) {
        throw new Error(
          result.error ||
            "Unable to send the friend request."
        );
      }

      setSuccess(
        result.message ||
          "Friend request sent."
      );

      await loadFriends(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send the friend request."
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function respondToRequest(
    requestId: string,
    action: "accept" | "decline"
  ) {
    const supabase = createClient();

    try {
      setWorkingId(requestId);
      setError("");
      setSuccess("");

      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "respond_to_friend_request",
        {
          request_id: requestId,
          response_action: action,
        }
      );

      if (rpcError) {
        throw new Error(
          rpcError.message
        );
      }

      const result =
        data as ActionResponse;

      if (!result.success) {
        throw new Error(
          result.error ||
            "Unable to respond to the request."
        );
      }

      setSuccess(
        result.message ||
          `Friend request ${action}ed.`
      );

      await loadFriends(true);
    } catch (responseError) {
      setError(
        responseError instanceof Error
          ? responseError.message
          : "Unable to respond to the request."
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function cancelRequest(
    requestId: string
  ) {
    const supabase = createClient();

    try {
      setWorkingId(requestId);
      setError("");
      setSuccess("");

      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "cancel_friend_request",
        {
          request_id: requestId,
        }
      );

      if (rpcError) {
        throw new Error(
          rpcError.message
        );
      }

      const result =
        data as ActionResponse;

      if (!result.success) {
        throw new Error(
          result.error ||
            "Unable to cancel the request."
        );
      }

      setSuccess(
        result.message ||
          "Friend request cancelled."
      );

      await loadFriends(true);
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Unable to cancel the request."
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function removeFriend(
    friendUserId: string
  ) {
    const confirmed =
      window.confirm(
        "Remove this user from your friends list?"
      );

    if (!confirmed) {
      return;
    }

    const supabase = createClient();

    try {
      setWorkingId(friendUserId);
      setError("");
      setSuccess("");

      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "remove_friend",
        {
          friend_user_id:
            friendUserId,
        }
      );

      if (rpcError) {
        throw new Error(
          rpcError.message
        );
      }

      const result =
        data as ActionResponse;

      if (!result.success) {
        throw new Error(
          result.error ||
            "Unable to remove this friend."
        );
      }

      setSuccess(
        result.message ||
          "Friend removed."
      );

      await loadFriends(true);
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove this friend."
      );
    } finally {
      setWorkingId(null);
    }
  }

  const relationshipMap =
    useMemo(() => {
      const map =
        new Map<
          string,
          | "friend"
          | "incoming"
          | "outgoing"
        >();

      for (
        const friend of friendsData.friends
      ) {
        map.set(
          friend.userId,
          "friend"
        );
      }

      for (
        const request of friendsData.incomingRequests
      ) {
        map.set(
          request.userId,
          "incoming"
        );
      }

      for (
        const request of friendsData.outgoingRequests
      ) {
        map.set(
          request.userId,
          "outgoing"
        );
      }

      return map;
    }, [friendsData]);

  const activeItems =
    activeTab === "friends"
      ? friendsData.friends
      : activeTab === "incoming"
        ? friendsData.incomingRequests
        : friendsData.outgoingRequests;

  if (loading) {
    return (
      <main style={pageStyle}>
        <section style={containerStyle}>
          <div style={cardStyle}>
            <h1>
              Loading Friends...
            </h1>

            <p style={mutedStyle}>
              Loading your friends and
              pending requests.
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

          <button
            type="button"
            onClick={() =>
              loadFriends(true)
            }
            disabled={refreshing}
            style={secondaryButtonStyle}
          >
            {refreshing
              ? "Refreshing..."
              : "Refresh Friends"}
          </button>
        </div>

        <p style={eyebrowStyle}>
          Community connections
        </p>

        <h1 style={titleStyle}>
          Friends
        </h1>

        <p style={mutedStyle}>
          Find other traders, manage
          requests, and view your
          Norvexa friends.
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
              "repeat(3, minmax(0, 1fr))",
            gap: 12,
            marginTop: 22,
          }}
        >
          <StatCard
            label="Friends"
            value={String(
              friendsData.friends.length
            )}
          />

          <StatCard
            label="Incoming requests"
            value={String(
              friendsData
                .incomingRequests.length
            )}
            color={
              friendsData
                .incomingRequests.length >
              0
                ? "#fbbf24"
                : "#f9fafb"
            }
          />

          <StatCard
            label="Sent requests"
            value={String(
              friendsData
                .outgoingRequests.length
            )}
          />
        </div>

        <section
          style={{
            ...cardStyle,
            marginTop: 16,
          }}
        >
          <p style={eyebrowStyle}>
            Find traders
          </p>

          <h2 style={{ margin: 0 }}>
            Search Community
          </h2>

          <form
            onSubmit={searchUsers}
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr auto",
              gap: 9,
              marginTop: 15,
            }}
          >
            <input
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value
                )
              }
              placeholder="Search username or display name..."
              style={inputStyle}
            />

            <button
              type="submit"
              disabled={searching}
              style={primaryButtonStyle}
            >
              {searching
                ? "Searching..."
                : "Search"}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div
              className="user-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 11,
                marginTop: 16,
              }}
            >
              {searchResults.map(
                (user) => (
                  <SearchResultCard
                    key={user.user_id}
                    user={user}
                    relationship={
                      relationshipMap.get(
                        user.user_id
                      )
                    }
                    working={
                      workingId ===
                      user.username
                    }
                    onSend={() =>
                      sendRequest(
                        user.username
                      )
                    }
                  />
                )
              )}
            </div>
          )}
        </section>

        <section
          style={{
            ...cardStyle,
            marginTop: 16,
          }}
        >
          <div style={tabRowStyle}>
            <TabButton
              label="Friends"
              count={
                friendsData.friends.length
              }
              active={
                activeTab === "friends"
              }
              onClick={() =>
                setActiveTab("friends")
              }
            />

            <TabButton
              label="Incoming"
              count={
                friendsData
                  .incomingRequests.length
              }
              active={
                activeTab ===
                "incoming"
              }
              onClick={() =>
                setActiveTab(
                  "incoming"
                )
              }
            />

            <TabButton
              label="Sent"
              count={
                friendsData
                  .outgoingRequests.length
              }
              active={
                activeTab ===
                "outgoing"
              }
              onClick={() =>
                setActiveTab(
                  "outgoing"
                )
              }
            />
          </div>

          {activeItems.length === 0 ? (
            <EmptyState
              title={
                activeTab === "friends"
                  ? "No friends yet"
                  : activeTab ===
                      "incoming"
                    ? "No incoming requests"
                    : "No sent requests"
              }
              text={
                activeTab === "friends"
                  ? "Search the Norvexa community to connect with other traders."
                  : activeTab ===
                      "incoming"
                    ? "New friend requests will appear here."
                    : "Requests you send will appear here until they are accepted or cancelled."
              }
            />
          ) : (
            <div
              className="user-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 11,
                marginTop: 16,
              }}
            >
              {activeTab === "friends" &&
                friendsData.friends.map(
                  (friend) => (
                    <FriendCard
                      key={
                        friend.friendshipId
                      }
                      friend={friend}
                      working={
                        workingId ===
                        friend.userId
                      }
                      onRemove={() =>
                        removeFriend(
                          friend.userId
                        )
                      }
                    />
                  )
                )}

              {activeTab === "incoming" &&
                friendsData.incomingRequests.map(
                  (request) => (
                    <IncomingRequestCard
                      key={
                        request.requestId
                      }
                      request={request}
                      working={
                        workingId ===
                        request.requestId
                      }
                      onAccept={() =>
                        respondToRequest(
                          request.requestId,
                          "accept"
                        )
                      }
                      onDecline={() =>
                        respondToRequest(
                          request.requestId,
                          "decline"
                        )
                      }
                    />
                  )
                )}

              {activeTab === "outgoing" &&
                friendsData.outgoingRequests.map(
                  (request) => (
                    <OutgoingRequestCard
                      key={
                        request.requestId
                      }
                      request={request}
                      working={
                        workingId ===
                        request.requestId
                      }
                      onCancel={() =>
                        cancelRequest(
                          request.requestId
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
            Community privacy
          </strong>

          <p
            style={{
              margin: "6px 0 0",
              ...mutedStyle,
              fontSize: 11,
              lineHeight: 1.55,
            }}
          >
            Friend connections use your
            public Norvexa profile.
            Email addresses and login
            information are never shown.
          </p>
        </div>

        <style jsx>{`
          @media (max-width: 700px) {
            .stats-grid {
              grid-template-columns:
                1fr !important;
            }
          }

          @media (max-width: 560px) {
            form {
              grid-template-columns:
                1fr !important;
            }
          }
        `}</style>
      </section>
    </main>
  );
}

function SearchResultCard({
  user,
  relationship,
  working,
  onSend,
}: {
  user: SearchProfile;
  relationship:
    | "friend"
    | "incoming"
    | "outgoing"
    | undefined;
  working: boolean;
  onSend: () => void;
}) {
  return (
    <article style={userCardStyle}>
      <UserIdentity
        avatarUrl={user.avatar_url}
        displayName={user.display_name}
        username={user.username}
        investingStyle={
          user.investing_style
        }
        bio={user.bio}
      />

      <div style={actionRowStyle}>
        <Link
          href={`/community/${user.username}`}
          style={viewButtonStyle}
        >
          View Profile
        </Link>

        {relationship === "friend" ? (
          <StatusBadge>
            Friends
          </StatusBadge>
        ) : relationship ===
          "outgoing" ? (
          <StatusBadge>
            Request Sent
          </StatusBadge>
        ) : relationship ===
          "incoming" ? (
          <StatusBadge>
            Respond in Incoming
          </StatusBadge>
        ) : (
          <button
            type="button"
            onClick={onSend}
            disabled={working}
            style={primarySmallButtonStyle}
          >
            {working
              ? "Sending..."
              : "Add Friend"}
          </button>
        )}
      </div>
    </article>
  );
}

function FriendCard({
  friend,
  working,
  onRemove,
}: {
  friend: FriendRow;
  working: boolean;
  onRemove: () => void;
}) {
  return (
    <article style={userCardStyle}>
      <UserIdentity
        avatarUrl={friend.avatarUrl}
        displayName={
          friend.displayName
        }
        username={friend.username}
        investingStyle={
          friend.investingStyle
        }
        bio={friend.bio}
      />

      <div style={actionRowStyle}>
        <Link
          href={`/community/${friend.username}`}
          style={viewButtonStyle}
        >
          View Profile
        </Link>

        <button
          type="button"
          onClick={onRemove}
          disabled={working}
          style={dangerSmallButtonStyle}
        >
          {working
            ? "Removing..."
            : "Remove"}
        </button>
      </div>
    </article>
  );
}

function IncomingRequestCard({
  request,
  working,
  onAccept,
  onDecline,
}: {
  request: RequestRow;
  working: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <article style={userCardStyle}>
      <UserIdentity
        avatarUrl={request.avatarUrl}
        displayName={
          request.displayName
        }
        username={request.username}
        investingStyle={
          request.investingStyle
        }
        bio={request.bio}
      />

      <div style={actionRowStyle}>
        <Link
          href={`/community/${request.username}`}
          style={viewButtonStyle}
        >
          View Profile
        </Link>

        <button
          type="button"
          onClick={onAccept}
          disabled={working}
          style={successSmallButtonStyle}
        >
          {working
            ? "Working..."
            : "Accept"}
        </button>

        <button
          type="button"
          onClick={onDecline}
          disabled={working}
          style={dangerSmallButtonStyle}
        >
          Decline
        </button>
      </div>
    </article>
  );
}

function OutgoingRequestCard({
  request,
  working,
  onCancel,
}: {
  request: RequestRow;
  working: boolean;
  onCancel: () => void;
}) {
  return (
    <article style={userCardStyle}>
      <UserIdentity
        avatarUrl={request.avatarUrl}
        displayName={
          request.displayName
        }
        username={request.username}
        investingStyle={
          request.investingStyle
        }
        bio={request.bio}
      />

      <div style={actionRowStyle}>
        <Link
          href={`/community/${request.username}`}
          style={viewButtonStyle}
        >
          View Profile
        </Link>

        <StatusBadge>
          Pending
        </StatusBadge>

        <button
          type="button"
          onClick={onCancel}
          disabled={working}
          style={dangerSmallButtonStyle}
        >
          {working
            ? "Cancelling..."
            : "Cancel"}
        </button>
      </div>
    </article>
  );
}

function UserIdentity({
  avatarUrl,
  displayName,
  username,
  investingStyle,
  bio,
}: {
  avatarUrl: string | null;
  displayName: string;
  username: string;
  investingStyle: string;
  bio: string;
}) {
  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <Avatar
          url={avatarUrl || ""}
          name={displayName}
          size={58}
        />

        <div>
          <strong
            style={{
              display: "block",
              fontSize: 17,
            }}
          >
            {displayName}
          </strong>

          <span
            style={{
              display: "block",
              marginTop: 3,
              color: "#93c5fd",
              fontSize: 10,
              fontWeight: 800,
            }}
          >
            @{username}
          </span>

          <span
            style={{
              display: "inline-block",
              marginTop: 6,
              padding: "4px 7px",
              borderRadius: 999,
              background:
                "rgba(37,99,235,0.07)",
              border:
                "1px solid rgba(96,165,250,0.2)",
              color: "#93c5fd",
              fontSize: 8,
              fontWeight: 800,
            }}
          >
            {investingStyle}
          </span>
        </div>
      </div>

      <p
        style={{
          margin: "13px 0 0",
          color: "#9ca3af",
          fontSize: 11,
          lineHeight: 1.55,
          minHeight: 34,
        }}
      >
        {bio ||
          "No community bio yet."}
      </p>
    </>
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
        fontSize: 18,
      }}
    >
      {getInitials(name)}
    </div>
  );
}

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "9px 12px",
        border: active
          ? "1px solid rgba(96,165,250,0.36)"
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
      {label} ({count})
    </button>
  );
}

function StatusBadge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span style={statusBadgeStyle}>
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

function escapeSearch(
  value: string
) {
  return value.replace(
    /[%_,()]/g,
    ""
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

const userCardStyle = {
  padding: 15,
  border:
    "1px solid rgba(255,255,255,0.075)",
  borderRadius: 12,
  background:
    "rgba(255,255,255,0.025)",
};

const actionRowStyle = {
  display: "flex",
  gap: 7,
  flexWrap: "wrap" as const,
  marginTop: 14,
};

const tabRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap" as const,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "11px 12px",
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

const primarySmallButtonStyle = {
  padding: "8px 10px",
  border: "none",
  borderRadius: 8,
  background: "#2563eb",
  color: "white",
  fontSize: 10,
  fontWeight: 800,
  cursor: "pointer",
};

const successSmallButtonStyle = {
  padding: "8px 10px",
  border:
    "1px solid rgba(34,197,94,0.24)",
  borderRadius: 8,
  background:
    "rgba(34,197,94,0.09)",
  color: "#4ade80",
  fontSize: 10,
  fontWeight: 800,
  cursor: "pointer",
};

const dangerSmallButtonStyle = {
  padding: "8px 10px",
  border:
    "1px solid rgba(239,68,68,0.22)",
  borderRadius: 8,
  background:
    "rgba(239,68,68,0.07)",
  color: "#ff8a8a",
  fontSize: 10,
  fontWeight: 800,
  cursor: "pointer",
};

const viewButtonStyle = {
  display: "inline-block",
  padding: "8px 10px",
  border:
    "1px solid rgba(96,165,250,0.2)",
  borderRadius: 8,
  background:
    "rgba(37,99,235,0.06)",
  color: "#93c5fd",
  fontSize: 10,
  fontWeight: 800,
  textDecoration: "none",
};

const statusBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 10px",
  border:
    "1px solid rgba(251,191,36,0.2)",
  borderRadius: 8,
  background:
    "rgba(251,191,36,0.06)",
  color: "#fbbf24",
  fontSize: 10,
  fontWeight: 800,
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