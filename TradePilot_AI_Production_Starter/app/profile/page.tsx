"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type InvestingStyle =
  | "Conservative"
  | "Balanced"
  | "Growth"
  | "Dividend"
  | "Value"
  | "Long-Term"
  | "Active Trader";

type ProfileVisibility =
  | "public"
  | "friends"
  | "private";

type ProfileRow = {
  user_id: string;
  username: string | null;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  investing_style: InvestingStyle;
  profile_visibility: ProfileVisibility;
  show_portfolio_value: boolean;
  show_portfolio_return: boolean;
  show_holdings: boolean;
  show_recent_trades: boolean;
  show_win_rate: boolean;
  created_at: string;
  updated_at: string;
};

type PortfolioSummary = {
  totalAccountValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
};

type PortfolioAnalytics = {
  winRate: number;
  holdingsCount: number;
  combinedGainLoss: number;
};

type PortfolioResponse = {
  summary?: PortfolioSummary;
  analytics?: PortfolioAnalytics;
  error?: string;
};

type EarnedBadge = {
  earned_at: string;
  badge: {
    slug: string;
    name: string;
    icon: string;
    description: string;
    category: string;
  };
};

const investingStyles: InvestingStyle[] = [
  "Conservative",
  "Balanced",
  "Growth",
  "Dividend",
  "Value",
  "Long-Term",
  "Active Trader",
];

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] =
    useState<ProfileRow | null>(null);

  const [portfolio, setPortfolio] =
    useState<PortfolioResponse | null>(null);

  const [earnedBadges, setEarnedBadges] =
    useState<EarnedBadge[]>([]);

  const [email, setEmail] =
    useState("");

  const [username, setUsername] =
    useState("");

  const [displayName, setDisplayName] =
    useState("");

  const [bio, setBio] =
    useState("");

  const [avatarUrl, setAvatarUrl] =
    useState("");

  const [investingStyle, setInvestingStyle] =
    useState<InvestingStyle>("Balanced");

  const [visibility, setVisibility] =
    useState<ProfileVisibility>("public");

  const [
    showPortfolioValue,
    setShowPortfolioValue,
  ] = useState(false);

  const [
    showPortfolioReturn,
    setShowPortfolioReturn,
  ] = useState(true);

  const [showHoldings, setShowHoldings] =
    useState(false);

  const [
    showRecentTrades,
    setShowRecentTrades,
  ] = useState(false);

  const [showWinRate, setShowWinRate] =
    useState(true);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [usernameStatus, setUsernameStatus] =
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

        setEmail(user.email || "");

        const [
          profileResult,
          portfolioResponse,
          badgesResult,
        ] = await Promise.all([
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
                created_at,
                updated_at
              `
            )
            .eq("user_id", user.id)
            .single(),
          fetch(
            `/api/portfolio?refresh=${Date.now()}`,
            {
              cache: "no-store",
            }
          ),
          supabase
            .from("user_badges")
            .select(
              `
                earned_at,
                badge:badges (
                  slug,
                  name,
                  icon,
                  description,
                  category
                )
              `
            )
            .eq("user_id", user.id)
            .order("earned_at", {
              ascending: false,
            }),
        ]);

        if (profileResult.error) {
          throw new Error(
            profileResult.error.message
          );
        }

        if (badgesResult.error) {
          console.error(
            "Unable to load achievements:",
            badgesResult.error
          );
        } else {
          setEarnedBadges(
            (badgesResult.data || []) as unknown as EarnedBadge[]
          );
        }

        const loadedProfile =
          profileResult.data as ProfileRow;

        setProfile(loadedProfile);
        setUsername(
          loadedProfile.username || ""
        );
        setDisplayName(
          loadedProfile.display_name || ""
        );
        setBio(loadedProfile.bio || "");
        setAvatarUrl(
          loadedProfile.avatar_url || ""
        );
        setInvestingStyle(
          loadedProfile.investing_style ||
            "Balanced"
        );
        setVisibility(
          loadedProfile.profile_visibility ||
            "public"
        );
        setShowPortfolioValue(
          Boolean(
            loadedProfile.show_portfolio_value
          )
        );
        setShowPortfolioReturn(
          Boolean(
            loadedProfile.show_portfolio_return
          )
        );
        setShowHoldings(
          Boolean(
            loadedProfile.show_holdings
          )
        );
        setShowRecentTrades(
          Boolean(
            loadedProfile.show_recent_trades
          )
        );
        setShowWinRate(
          Boolean(
            loadedProfile.show_win_rate
          )
        );

        if (portfolioResponse.ok) {
          const portfolioData =
            (await portfolioResponse.json()) as PortfolioResponse;

          setPortfolio(portfolioData);
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your profile."
        );
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function checkUsernameAvailability() {
    const normalizedUsername =
      normalizeUsername(username);

    if (!normalizedUsername) {
      setUsernameStatus("");
      return;
    }

    if (
      !/^[a-z0-9_]{3,20}$/.test(
        normalizedUsername
      )
    ) {
      setUsernameStatus(
        "Use 3–20 lowercase letters, numbers, or underscores."
      );
      return;
    }

    const supabase = createClient();

    try {
      setUsernameStatus("Checking...");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUsernameStatus(
          "Sign in again to check."
        );
        return;
      }

      const { data, error: queryError } =
        await supabase
          .from("profiles")
          .select("user_id")
          .eq(
            "username",
            normalizedUsername
          )
          .neq("user_id", user.id)
          .maybeSingle();

      if (queryError) {
        throw queryError;
      }

      setUsernameStatus(
        data
          ? "That username is already taken."
          : "Username is available."
      );
    } catch {
      setUsernameStatus(
        "Unable to check right now."
      );
    }
  }

  async function saveProfile(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const normalizedUsername =
      normalizeUsername(username);

    if (
      normalizedUsername &&
      !/^[a-z0-9_]{3,20}$/.test(
        normalizedUsername
      )
    ) {
      setError(
        "Username must be 3–20 characters using lowercase letters, numbers, or underscores."
      );
      return;
    }

    if (!displayName.trim()) {
      setError(
        "Display name is required."
      );
      return;
    }

    if (displayName.trim().length > 50) {
      setError(
        "Display name must be 50 characters or fewer."
      );
      return;
    }

    if (bio.trim().length > 240) {
      setError(
        "Bio must be 240 characters or fewer."
      );
      return;
    }

    const supabase = createClient();

    try {
      setSaving(true);
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
        data: existingUsername,
        error: usernameError,
      } = await supabase
        .from("profiles")
        .select("user_id")
        .eq(
          "username",
          normalizedUsername
        )
        .neq("user_id", user.id)
        .maybeSingle();

      if (usernameError) {
        throw new Error(
          usernameError.message
        );
      }

      if (existingUsername) {
        throw new Error(
          "That username is already taken."
        );
      }

      const {
        data: updatedProfile,
        error: updateError,
      } = await supabase
        .from("profiles")
        .update({
          username:
            normalizedUsername || null,
          display_name:
            displayName.trim(),
          bio: bio.trim(),
          avatar_url:
            avatarUrl.trim() || null,
          investing_style:
            investingStyle,
          profile_visibility:
            visibility,
          show_portfolio_value:
            showPortfolioValue,
          show_portfolio_return:
            showPortfolioReturn,
          show_holdings:
            showHoldings,
          show_recent_trades:
            showRecentTrades,
          show_win_rate:
            showWinRate,
        })
        .eq("user_id", user.id)
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
            created_at,
            updated_at
          `
        )
        .single();

      if (updateError) {
        throw new Error(
          updateError.message
        );
      }

      setProfile(
        updatedProfile as ProfileRow
      );

      setUsername(
        updatedProfile.username || ""
      );

      setSuccess(
        "Your community profile was saved."
      );

      setUsernameStatus("");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type)
    ) {
      setError(
        "Use a JPG, PNG, or WEBP image."
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Profile images must be 5 MB or smaller."
      );
      return;
    }

    const supabase = createClient();

    try {
      setUploading(true);
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

      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg";

      const filePath =
        `${user.id}/avatar-${Date.now()}.${extension}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from("profile-avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(
          uploadError.message
        );
      }

      const {
        data: publicUrlData,
      } = supabase.storage
        .from("profile-avatars")
        .getPublicUrl(filePath);

      const publicUrl =
        publicUrlData.publicUrl;

      const {
        error: updateError,
      } = await supabase
        .from("profiles")
        .update({
          avatar_url: publicUrl,
        })
        .eq("user_id", user.id);

      if (updateError) {
        throw new Error(
          updateError.message
        );
      }

      setAvatarUrl(publicUrl);

      setSuccess(
        "Profile picture uploaded."
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload the profile picture."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function removeAvatar() {
    const supabase = createClient();

    try {
      setUploading(true);
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
        error: updateError,
      } = await supabase
        .from("profiles")
        .update({
          avatar_url: null,
        })
        .eq("user_id", user.id);

      if (updateError) {
        throw new Error(
          updateError.message
        );
      }

      setAvatarUrl("");

      setSuccess(
        "Profile picture removed."
      );
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove the profile picture."
      );
    } finally {
      setUploading(false);
    }
  }

  const publicProfilePath =
    username.trim()
      ? `/community/${normalizeUsername(
          username
        )}`
      : "";

  const joinedDate = useMemo(() => {
    if (!profile?.created_at) {
      return "Recently";
    }

    const date = new Date(
      profile.created_at
    );

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
  }, [profile]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <section style={containerStyle}>
          <div style={cardStyle}>
            <h1>
              Loading Profile...
            </h1>

            <p style={mutedStyle}>
              Loading your community
              settings and portfolio
              statistics.
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

          {publicProfilePath && (
            <Link
              href={publicProfilePath}
              style={secondaryLinkStyle}
            >
              View Public Profile
            </Link>
          )}
        </div>

        <p style={eyebrowStyle}>
          Community identity
        </p>

        <h1 style={titleStyle}>
          Profile
        </h1>

        <p style={mutedStyle}>
          Control how you appear in the
          TradePilot community and what
          portfolio information other
          users may see.
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
          className="profile-layout"
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 0.85fr",
            gap: 16,
            marginTop: 22,
          }}
        >
          <form
            onSubmit={saveProfile}
            style={cardStyle}
          >
            <p style={eyebrowStyle}>
              Edit profile
            </p>

            <h2 style={{ margin: 0 }}>
              Public Information
            </h2>

            <div
              style={{
                display: "flex",
                gap: 14,
                alignItems: "center",
                marginTop: 18,
                flexWrap: "wrap",
              }}
            >
              <Avatar
                url={avatarUrl}
                name={
                  displayName ||
                  "Trader"
                }
                size={84}
              />

              <div>
                <label
                  style={
                    uploadButtonStyle
                  }
                >
                  {uploading
                    ? "Uploading..."
                    : "Upload Picture"}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={
                      uploadAvatar
                    }
                    disabled={
                      uploading
                    }
                    style={{
                      display: "none",
                    }}
                  />
                </label>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={
                      removeAvatar
                    }
                    disabled={
                      uploading
                    }
                    style={{
                      ...removeButtonStyle,
                      marginLeft: 8,
                    }}
                  >
                    Remove
                  </button>
                )}

                <p
                  style={{
                    margin:
                      "8px 0 0",
                    ...mutedStyle,
                    fontSize: 9,
                  }}
                >
                  JPG, PNG, or WEBP.
                  Maximum 5 MB.
                </p>
              </div>
            </div>

            <div style={fieldGridStyle}>
              <Field
                label="Display name"
                value={displayName}
                onChange={
                  setDisplayName
                }
                placeholder="Your name"
                maxLength={50}
              />

              <div>
                <Field
                  label="Username"
                  value={username}
                  onChange={(value) => {
                    setUsername(
                      normalizeUsername(
                        value
                      )
                    );
                    setUsernameStatus(
                      ""
                    );
                  }}
                  placeholder="your_username"
                  maxLength={20}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: 10,
                    marginTop: 7,
                  }}
                >
                  <span
                    style={{
                      color:
                        usernameStatus ===
                        "Username is available."
                          ? "#4ade80"
                          : "#9ca3af",
                      fontSize: 9,
                    }}
                  >
                    {usernameStatus ||
                      "3–20 lowercase letters, numbers, or underscores."}
                  </span>

                  <button
                    type="button"
                    onClick={
                      checkUsernameAvailability
                    }
                    style={
                      textButtonStyle
                    }
                  >
                    Check
                  </button>
                </div>
              </div>
            </div>

            <label
              style={{
                display: "block",
                marginTop: 15,
              }}
            >
              <span style={fieldLabelStyle}>
                Bio
              </span>

              <textarea
                value={bio}
                onChange={(event) =>
                  setBio(
                    event.target.value
                  )
                }
                maxLength={240}
                placeholder="Tell the community about your investing approach..."
                style={textareaStyle}
              />

              <span
                style={{
                  display: "block",
                  marginTop: 5,
                  textAlign: "right",
                  ...mutedStyle,
                  fontSize: 9,
                }}
              >
                {bio.length}/240
              </span>
            </label>

            <div style={fieldGridStyle}>
              <label>
                <span style={fieldLabelStyle}>
                  Investing style
                </span>

                <select
                  value={investingStyle}
                  onChange={(event) =>
                    setInvestingStyle(
                      event.target
                        .value as InvestingStyle
                    )
                  }
                  style={selectStyle}
                >
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
              </label>

              <label>
                <span style={fieldLabelStyle}>
                  Profile visibility
                </span>

                <select
                  value={visibility}
                  onChange={(event) =>
                    setVisibility(
                      event.target
                        .value as ProfileVisibility
                    )
                  }
                  style={selectStyle}
                >
                  <option value="public">
                    Public
                  </option>

                  <option value="friends">
                    Friends only
                  </option>

                  <option value="private">
                    Private
                  </option>
                </select>
              </label>
            </div>

            <div
              style={{
                ...preferencesPanelStyle,
                marginTop: 18,
              }}
            >
              <h3 style={{ margin: 0 }}>
                Portfolio Visibility
              </h3>

              <p
                style={{
                  margin: "6px 0 0",
                  ...mutedStyle,
                  fontSize: 10,
                  lineHeight: 1.5,
                }}
              >
                Choose which paper-trading
                statistics may appear on
                your public profile.
              </p>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  marginTop: 14,
                }}
              >
                <ToggleRow
                  label="Show portfolio value"
                  checked={
                    showPortfolioValue
                  }
                  onChange={
                    setShowPortfolioValue
                  }
                />

                <ToggleRow
                  label="Show portfolio return"
                  checked={
                    showPortfolioReturn
                  }
                  onChange={
                    setShowPortfolioReturn
                  }
                />

                <ToggleRow
                  label="Show win rate"
                  checked={showWinRate}
                  onChange={
                    setShowWinRate
                  }
                />

                <ToggleRow
                  label="Show holdings"
                  checked={showHoldings}
                  onChange={
                    setShowHoldings
                  }
                />

                <ToggleRow
                  label="Show recent trades"
                  checked={
                    showRecentTrades
                  }
                  onChange={
                    setShowRecentTrades
                  }
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                ...primaryButtonStyle,
                width: "100%",
                marginTop: 18,
                opacity: saving
                  ? 0.65
                  : 1,
              }}
            >
              {saving
                ? "Saving..."
                : "Save Profile"}
            </button>
          </form>

          <section style={previewCardStyle}>
            <p style={eyebrowStyle}>
              Live preview
            </p>

            <h2 style={{ margin: 0 }}>
              Public Profile
            </h2>

            <div
              style={{
                display: "flex",
                gap: 14,
                alignItems: "center",
                marginTop: 18,
              }}
            >
              <Avatar
                url={avatarUrl}
                name={
                  displayName ||
                  "Trader"
                }
                size={78}
              />

              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 22,
                  }}
                >
                  {displayName ||
                    "Trader"}
                </h3>

                <p
                  style={{
                    margin: "4px 0 0",
                    color: "#93c5fd",
                    fontWeight: 800,
                  }}
                >
                  {username
                    ? `@${normalizeUsername(
                        username
                      )}`
                    : "@username"}
                </p>

                <p
                  style={{
                    margin: "5px 0 0",
                    ...mutedStyle,
                    fontSize: 9,
                  }}
                >
                  Joined {joinedDate}
                </p>
              </div>
            </div>

            <p
              style={{
                margin: "16px 0 0",
                color: "#d1d5db",
                lineHeight: 1.6,
                minHeight: 50,
              }}
            >
              {bio.trim() ||
                "Your bio will appear here."}
            </p>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 14,
              }}
            >
              <Badge>
                {investingStyle}
              </Badge>

              <Badge>
                {visibility === "public"
                  ? "Public"
                  : visibility ===
                      "friends"
                    ? "Friends only"
                    : "Private"}
              </Badge>
            </div>

            <div
              className="preview-stat-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: 10,
                marginTop: 18,
              }}
            >
              {showPortfolioValue && (
                <PreviewStat
                  label="Portfolio value"
                  value={formatCurrency(
                    portfolio?.summary
                      ?.totalAccountValue ??
                      0
                  )}
                />
              )}

              {showPortfolioReturn && (
                <PreviewStat
                  label="Total return"
                  value={formatSignedPercent(
                    portfolio?.summary
                      ?.totalGainLossPercent ??
                      0
                  )}
                  color={
                    (
                      portfolio?.summary
                        ?.totalGainLossPercent ??
                      0
                    ) >= 0
                      ? "#4ade80"
                      : "#ff8a8a"
                  }
                />
              )}

              {showWinRate && (
                <PreviewStat
                  label="Win rate"
                  value={`${(
                    portfolio?.analytics
                      ?.winRate ?? 0
                  ).toFixed(2)}%`}
                />
              )}

              <PreviewStat
                label="Open holdings"
                value={String(
                  portfolio?.analytics
                    ?.holdingsCount ?? 0
                )}
              />
            </div>

            <div
              style={{
                marginTop: 16,
                padding: 13,
                border:
                  "1px solid rgba(255,255,255,0.07)",
                borderRadius: 10,
                background:
                  "rgba(255,255,255,0.025)",
              }}
            >
              <span
                style={{
                  ...mutedStyle,
                  fontSize: 9,
                }}
              >
                Signed-in email
              </span>

              <strong
                style={{
                  display: "block",
                  marginTop: 5,
                  fontSize: 12,
                }}
              >
                {email}
              </strong>

              <p
                style={{
                  margin: "7px 0 0",
                  ...mutedStyle,
                  fontSize: 9,
                }}
              >
                Your email is never shown
                on your public profile.
              </p>
            </div>
          </section>
        </div>

        <section style={achievementsCardStyle}>
          <div style={achievementsHeaderStyle}>
            <div>
              <p style={eyebrowStyle}>
                Achievements
              </p>

              <h2 style={{ margin: 0 }}>
                Your Badges
              </h2>

              <p
                style={{
                  margin: "7px 0 0",
                  ...mutedStyle,
                  fontSize: 10,
                  lineHeight: 1.55,
                }}
              >
                Badges unlock automatically as
                you reach TradePilot milestones.
              </p>
            </div>

            <span style={achievementCountStyle}>
              {earnedBadges.length} earned
            </span>
          </div>

          {earnedBadges.length === 0 ? (
            <div style={achievementEmptyStyle}>
              <div style={{ fontSize: 30 }}>
                🏆
              </div>

              <h3
                style={{
                  margin: "10px 0 0",
                }}
              >
                No badges yet
              </h3>

              <p
                style={{
                  margin: "7px auto 0",
                  maxWidth: 500,
                  ...mutedStyle,
                  fontSize: 10,
                  lineHeight: 1.55,
                }}
              >
                Complete paper-trading and
                TradePilot milestones to unlock
                achievements.
              </p>
            </div>
          ) : (
            <div
              className="achievement-grid"
              style={achievementGridStyle}
            >
              {earnedBadges.map(
                (item) => (
                  <article
                    key={item.badge.slug}
                    style={achievementItemStyle}
                  >
                    <div style={achievementIconStyle}>
                      {item.badge.icon}
                    </div>

                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          flexWrap: "wrap",
                        }}
                      >
                        <strong>
                          {item.badge.name}
                        </strong>

                        <span
                          style={
                            achievementCategoryStyle
                          }
                        >
                          {item.badge.category}
                        </span>
                      </div>

                      <p
                        style={{
                          margin: "6px 0 0",
                          ...mutedStyle,
                          fontSize: 10,
                          lineHeight: 1.5,
                        }}
                      >
                        {item.badge.description}
                      </p>

                      <span
                        style={{
                          display: "block",
                          marginTop: 8,
                          color: "#6b7280",
                          fontSize: 9,
                        }}
                      >
                        Earned{" "}
                        {new Date(
                          item.earned_at
                        ).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
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
            Public portfolio information
            comes only from your
            paper-trading account. Your
            email and login information are
            never included in community
            profiles.
          </p>
        </div>

        <style jsx>{`
          @media (max-width: 950px) {
            .profile-layout {
              grid-template-columns:
                1fr !important;
            }
          }

          @media (max-width: 560px) {
            .preview-stat-grid {
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

function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength: number;
}) {
  return (
    <label>
      <span style={fieldLabelStyle}>
        {label}
      </span>

      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        maxLength={maxLength}
        style={inputStyle}
      />
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label style={toggleRowStyle}>
      <span>{label}</span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        style={{
          width: 18,
          height: 18,
          accentColor: "#2563eb",
        }}
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
            "2px solid rgba(96,165,250,0.3)",
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
          "2px solid rgba(96,165,250,0.25)",
        background:
          "linear-gradient(135deg, rgba(37,99,235,0.25), rgba(168,85,247,0.18))",
        color: "#dbeafe",
        fontSize: Math.max(
          22,
          size * 0.34
        ),
        fontWeight: 900,
      }}
    >
      {getInitials(name)}
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

function PreviewStat({
  label,
  value,
  color = "#f9fafb",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div style={innerCardStyle}>
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
          marginTop: 6,
          color,
          fontSize: 17,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function normalizeUsername(
  value: string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
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
  maxWidth: 1180,
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
  textTransform: "uppercase" as const,
};

const mutedStyle = {
  color: "#9ca3af",
};

const cardStyle = {
  padding: 20,
  border:
    "1px solid rgba(255,255,255,0.09)",
  borderRadius: 15,
  background:
    "rgba(255,255,255,0.035)",
};

const previewCardStyle = {
  padding: 20,
  border:
    "1px solid rgba(96,165,250,0.2)",
  borderRadius: 15,
  background:
    "linear-gradient(145deg, rgba(37,99,235,0.08), rgba(255,255,255,0.03))",
  alignSelf: "start",
  position: "sticky" as const,
  top: 20,
};

const innerCardStyle = {
  padding: 13,
  border:
    "1px solid rgba(255,255,255,0.07)",
  borderRadius: 10,
  background:
    "rgba(255,255,255,0.025)",
};

const fieldGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 13,
  marginTop: 17,
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
  padding: "11px 12px",
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
  minHeight: 110,
  resize: "vertical" as const,
  fontFamily: "inherit",
};

const selectStyle = {
  ...inputStyle,
  background: "#111827",
};

const preferencesPanelStyle = {
  padding: 15,
  border:
    "1px solid rgba(255,255,255,0.07)",
  borderRadius: 11,
  background:
    "rgba(255,255,255,0.025)",
};

const toggleRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "10px 11px",
  border:
    "1px solid rgba(255,255,255,0.06)",
  borderRadius: 9,
  background:
    "rgba(255,255,255,0.02)",
  cursor: "pointer",
};

const badgeStyle = {
  display: "inline-block",
  padding: "6px 9px",
  border:
    "1px solid rgba(96,165,250,0.22)",
  borderRadius: 999,
  background:
    "rgba(37,99,235,0.07)",
  color: "#93c5fd",
  fontSize: 9,
  fontWeight: 800,
};

const primaryButtonStyle = {
  padding: "11px 15px",
  border: "none",
  borderRadius: 9,
  background: "#2563eb",
  color: "white",
  fontWeight: 850,
  cursor: "pointer",
};

const uploadButtonStyle = {
  display: "inline-block",
  padding: "9px 11px",
  border:
    "1px solid rgba(96,165,250,0.22)",
  borderRadius: 9,
  background:
    "rgba(37,99,235,0.07)",
  color: "#93c5fd",
  fontSize: 10,
  fontWeight: 800,
  cursor: "pointer",
};

const removeButtonStyle = {
  padding: "9px 11px",
  border:
    "1px solid rgba(239,68,68,0.2)",
  borderRadius: 9,
  background:
    "rgba(239,68,68,0.07)",
  color: "#ff8a8a",
  fontSize: 10,
  fontWeight: 800,
  cursor: "pointer",
};

const textButtonStyle = {
  padding: 0,
  border: "none",
  background: "transparent",
  color: "#93c5fd",
  fontSize: 9,
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

const achievementsCardStyle = {
  marginTop: 16,
  padding: 20,
  border:
    "1px solid rgba(251,191,36,0.16)",
  borderRadius: 15,
  background:
    "linear-gradient(145deg, rgba(251,191,36,0.05), rgba(255,255,255,0.025))",
};

const achievementsHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap" as const,
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

const achievementEmptyStyle = {
  marginTop: 16,
  padding: "34px 20px",
  border:
    "1px dashed rgba(255,255,255,0.1)",
  borderRadius: 11,
  textAlign: "center" as const,
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