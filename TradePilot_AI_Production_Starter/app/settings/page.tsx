"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

type SettingsData = {
  profile: {
    fullName: string;
    email: string;
    createdAt: string;
  };
  account: {
    cashBalance: number;
  };
};

type ThemePreference =
  | "dark"
  | "light"
  | "system";

const themeStorageKey =
  "tradepilot-theme-preference";

export default function SettingsPage() {
  const router = useRouter();

  const [settings, setSettings] =
    useState<SettingsData | null>(null);

  const [fullName, setFullName] =
    useState("");

  const [theme, setTheme] =
    useState<ThemePreference>("dark");

  const [startingCash, setStartingCash] =
    useState("100000");

  const [confirmation, setConfirmation] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [savingProfile, setSavingProfile] =
    useState(false);

  const [resetting, setResetting] =
    useState(false);

  const [profileMessage, setProfileMessage] =
    useState("");

  const [resetMessage, setResetMessage] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadSettings();

    const storedTheme =
      window.localStorage.getItem(
        themeStorageKey
      ) as ThemePreference | null;

    if (
      storedTheme === "dark" ||
      storedTheme === "light" ||
      storedTheme === "system"
    ) {
      setTheme(storedTheme);
    }
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/settings",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load settings."
        );
      }

      setSettings(data as SettingsData);
      setFullName(
        data.profile?.fullName || ""
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load settings."
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setSavingProfile(true);
      setProfileMessage("");
      setError("");

      const response = await fetch(
        "/api/settings",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            fullName,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to update your profile."
        );
      }

      setProfileMessage(
        "Your profile was updated."
      );

      setSettings((current) =>
        current
          ? {
              ...current,
              profile: {
                ...current.profile,
                fullName:
                  data.profile?.fullName ||
                  fullName,
              },
            }
          : current
      );

      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to update your profile."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  function changeTheme(
    nextTheme: ThemePreference
  ) {
    setTheme(nextTheme);

    window.localStorage.setItem(
      themeStorageKey,
      nextTheme
    );

    document.documentElement.dataset.theme =
      nextTheme;

    /*
     * Your current UI is dark by default.
     * The preference is stored now and can be
     * connected to global CSS during final UI polish.
     */
  }

  async function resetPaperAccount(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const confirmed = window.confirm(
      "This will permanently delete all holdings, trades, and portfolio history. Continue?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setResetting(true);
      setResetMessage("");
      setError("");

      const response = await fetch(
        "/api/settings",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action:
              "reset-paper-account",
            startingCash: Number(
              startingCash
            ),
            confirmation,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to reset your paper account."
        );
      }

      setResetMessage(
        `Paper account reset to ${formatCurrency(
          data.cashBalance
        )}.`
      );

      setConfirmation("");

      setSettings((current) =>
        current
          ? {
              ...current,
              account: {
                cashBalance:
                  data.cashBalance,
              },
            }
          : current
      );
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Unable to reset your paper account."
      );
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar />

        <main className="main">
          <div className="card">
            <h2>Loading settings...</h2>
            <p className="muted">
              Getting your account preferences.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="main">
        <section
          style={{
            maxWidth: "980px",
            margin: "0 auto",
          }}
        >
          <div style={{ marginBottom: "18px" }}>
            <p style={eyebrowStyle}>
              Account management
            </p>

            <h1
              style={{
                margin: 0,
                fontSize: "38px",
              }}
            >
              Settings
            </h1>

            <p
              className="muted"
              style={{
                margin: "9px 0 0",
                lineHeight: 1.6,
              }}
            >
              Manage your profile, display
              preference, and paper-trading
              account.
            </p>
          </div>

          {error && (
            <div style={errorStyle}>
              {error}
            </div>
          )}

          <section
            className="card"
            style={sectionStyle}
          >
            <div>
              <p style={eyebrowStyle}>
                Personal information
              </p>

              <h2 style={{ margin: 0 }}>
                Profile
              </h2>
            </div>

            <form
              onSubmit={saveProfile}
              style={{ marginTop: "20px" }}
            >
              <label style={labelStyle}>
                Display name
              </label>

              <input
                value={fullName}
                onChange={(event) =>
                  setFullName(
                    event.target.value
                  )
                }
                placeholder="Your name"
                maxLength={100}
                style={inputStyle}
              />

              <label
                style={{
                  ...labelStyle,
                  marginTop: "16px",
                }}
              >
                Email
              </label>

              <input
                value={
                  settings?.profile.email || ""
                }
                readOnly
                style={{
                  ...inputStyle,
                  opacity: 0.7,
                  cursor: "not-allowed",
                }}
              />

              <p
                className="muted"
                style={{
                  margin: "8px 0 0",
                  fontSize: "12px",
                }}
              >
                Email changes are not enabled
                from this screen.
              </p>

              <div style={actionRowStyle}>
                <button
                  type="submit"
                  disabled={savingProfile}
                  style={primaryButtonStyle}
                >
                  {savingProfile
                    ? "Saving..."
                    : "Save profile"}
                </button>

                {profileMessage && (
                  <span
                    style={{
                      color: "#4ade80",
                      fontSize: "13px",
                    }}
                  >
                    {profileMessage}
                  </span>
                )}
              </div>
            </form>
          </section>

          <section
            className="card"
            style={sectionStyle}
          >
            <p style={eyebrowStyle}>
              Appearance
            </p>

            <h2 style={{ margin: 0 }}>
              Theme preference
            </h2>

            <p
              className="muted"
              style={{
                margin: "8px 0 0",
                lineHeight: 1.55,
              }}
            >
              Your selection is stored on this
              device. Full light-theme styling can
              be connected during the final global
              design pass.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, minmax(0, 1fr))",
                gap: "10px",
                marginTop: "18px",
              }}
              className="theme-grid"
            >
              {(
                [
                  "dark",
                  "light",
                  "system",
                ] as ThemePreference[]
              ).map((option) => {
                const active =
                  theme === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      changeTheme(option)
                    }
                    style={{
                      padding: "14px",
                      border: active
                        ? "1px solid rgba(96,165,250,0.55)"
                        : "1px solid rgba(255,255,255,0.09)",
                      borderRadius: "12px",
                      background: active
                        ? "rgba(37,99,235,0.12)"
                        : "rgba(255,255,255,0.025)",
                      color: active
                        ? "#93c5fd"
                        : "#d1d5db",
                      fontWeight: 800,
                      textTransform:
                        "capitalize",
                      cursor: "pointer",
                    }}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </section>


          <section
            className="card"
            style={sectionStyle}
          >
            <p style={eyebrowStyle}>
              Subscription
            </p>

            <h2 style={{ margin: 0 }}>
              TradePilot Premium
            </h2>

            <p
              className="muted"
              style={{
                margin: "8px 0 0",
                lineHeight: 1.6,
              }}
            >
              Upgrade to Premium or manage your
              existing subscription, billing,
              invoices, and payment methods.
            </p>

            <div
              style={{
                marginTop: "18px",
                padding: "18px",
                border:
                  "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                background:
                  "rgba(255,255,255,0.03)",
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "16px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  Manage Subscription
                </div>

                <div
                  className="muted"
                  style={{
                    marginTop: "6px",
                    lineHeight: 1.55,
                  }}
                >
                  Upgrade, cancel, update your
                  payment method, and view invoices.
                </div>
              </div>

              <Link
                href="/settings/subscription"
                style={{
                  padding: "10px 18px",
                  borderRadius: "10px",
                  background: "#2563eb",
                  color: "white",
                  textDecoration: "none",
                  fontWeight: 800,
                }}
              >
                Open
              </Link>
            </div>
          </section>

          <section
            className="card"
            style={{
              ...sectionStyle,
              border:
                "1px solid rgba(255,107,107,0.25)",
              background:
                "rgba(255,107,107,0.045)",
            }}
          >
            <p
              style={{
                ...eyebrowStyle,
                color: "#ff8a8a",
              }}
            >
              Danger zone
            </p>

            <h2 style={{ margin: 0 }}>
              Reset paper account
            </h2>

            <p
              className="muted"
              style={{
                margin: "9px 0 0",
                lineHeight: 1.6,
              }}
            >
              This permanently deletes all
              holdings, transactions, and portfolio
              history. Your watchlist, saved
              research chats, and login remain.
            </p>

            <div
              style={{
                marginTop: "16px",
                padding: "14px",
                borderRadius: "11px",
                background:
                  "rgba(255,255,255,0.035)",
              }}
            >
              <span className="muted">
                Current cash balance
              </span>

              <strong
                style={{
                  display: "block",
                  marginTop: "6px",
                  fontSize: "24px",
                }}
              >
                {formatCurrency(
                  settings?.account
                    .cashBalance ?? 0
                )}
              </strong>
            </div>

            <form
              onSubmit={resetPaperAccount}
              style={{ marginTop: "18px" }}
            >
              <label style={labelStyle}>
                New starting cash
              </label>

              <input
                type="number"
                min={100}
                max={10000000}
                step="100"
                value={startingCash}
                onChange={(event) =>
                  setStartingCash(
                    event.target.value
                  )
                }
                style={inputStyle}
              />

              <label
                style={{
                  ...labelStyle,
                  marginTop: "16px",
                }}
              >
                Type RESET to confirm
              </label>

              <input
                value={confirmation}
                onChange={(event) =>
                  setConfirmation(
                    event.target.value
                  )
                }
                placeholder="RESET"
                style={inputStyle}
              />

              <div style={actionRowStyle}>
                <button
                  type="submit"
                  disabled={
                    resetting ||
                    confirmation !== "RESET"
                  }
                  style={{
                    ...dangerButtonStyle,
                    opacity:
                      confirmation === "RESET"
                        ? 1
                        : 0.55,
                    cursor:
                      confirmation === "RESET"
                        ? "pointer"
                        : "not-allowed",
                  }}
                >
                  {resetting
                    ? "Resetting..."
                    : "Reset paper account"}
                </button>

                {resetMessage && (
                  <span
                    style={{
                      color: "#4ade80",
                      fontSize: "13px",
                    }}
                  >
                    {resetMessage}
                  </span>
                )}
              </div>
            </form>
          </section>
        </section>

        <style jsx>{`
          @media (max-width: 640px) {
            .theme-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </main>
    </div>
  );
}

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

const eyebrowStyle = {
  margin: "0 0 6px",
  color: "#60a5fa",
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};

const sectionStyle = {
  marginTop: "14px",
  padding: "24px",
};

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  color: "#d1d5db",
  fontSize: "13px",
  fontWeight: 750,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "11px 13px",
  border:
    "1px solid rgba(255,255,255,0.12)",
  borderRadius: "10px",
  background:
    "rgba(255,255,255,0.035)",
  color: "white",
  outline: "none",
  font: "inherit",
};

const actionRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap" as const,
  marginTop: "18px",
};

const primaryButtonStyle = {
  padding: "10px 15px",
  border: "none",
  borderRadius: "10px",
  background: "#2563eb",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const dangerButtonStyle = {
  padding: "10px 15px",
  border:
    "1px solid rgba(255,107,107,0.4)",
  borderRadius: "10px",
  background:
    "rgba(255,107,107,0.1)",
  color: "#ff8a8a",
  fontWeight: 800,
};

const errorStyle = {
  marginTop: "14px",
  padding: "14px",
  border:
    "1px solid rgba(255,107,107,0.3)",
  borderRadius: "11px",
  background:
    "rgba(255,107,107,0.08)",
  color: "#ff8a8a",
};