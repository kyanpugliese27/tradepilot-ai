"use client";

import {
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

type SubscriptionRow = {
  plan: string | null;
  status: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
  stripe_customer_id?: string | null;
};

function formatDate(
  value: string | null | undefined
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  );
}

export default function SubscriptionSettingsPage() {
  const [
    subscription,
    setSubscription,
  ] =
    useState<SubscriptionRow | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] =
    useState<
      "checkout" | "portal" | null
    >(null);

  const [
    error,
    setError,
  ] =
    useState("");

  useEffect(() => {
    async function loadSubscription() {
      const url =
        process.env
          .NEXT_PUBLIC_SUPABASE_URL;

      const key =
        process.env
          .NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !key) {
        setError(
          "Supabase is not connected."
        );
        setLoading(false);
        return;
      }

      const supabase =
        createBrowserClient(
          url,
          key
        );

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !user
      ) {
        setError(
          "You must be signed in to manage your subscription."
        );
        setLoading(false);
        return;
      }

      const {
        data,
        error:
          subscriptionError,
      } = await supabase
        .from(
          "premium_subscriptions"
        )
        .select(
          `
            plan,
            status,
            current_period_end,
            cancel_at_period_end,
            stripe_customer_id
          `
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

      if (
        subscriptionError
      ) {
        setError(
          subscriptionError.message
        );
        setLoading(false);
        return;
      }

      setSubscription(
        (data as SubscriptionRow | null) ??
          null
      );

      setLoading(false);
    }

    loadSubscription();
  }, []);

  const isPremium =
    subscription?.plan ===
      "premium" &&
    [
      "active",
      "trialing",
    ].includes(
      subscription?.status ??
        ""
    );

  const status =
    subscription?.status ??
    "free";

  const renewalDate =
    formatDate(
      subscription
        ?.current_period_end
    );

  async function startCheckout() {
    try {
      setError("");
      setActionLoading(
        "checkout"
      );

      const response =
        await fetch(
          "/api/stripe/checkout",
          {
            method: "POST",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to start checkout."
        );
      }

      if (!data.url) {
        throw new Error(
          "Checkout URL was not returned."
        );
      }

      window.location.href =
        data.url;
    } catch (checkoutError) {
      setError(
        checkoutError instanceof
          Error
          ? checkoutError.message
          : "Unable to start checkout."
      );

      setActionLoading(
        null
      );
    }
  }

  async function openPortal() {
    try {
      setError("");
      setActionLoading(
        "portal"
      );

      const response =
        await fetch(
          "/api/stripe/portal",
          {
            method: "POST",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to open billing management."
        );
      }

      if (!data.url) {
        throw new Error(
          "Billing portal URL was not returned."
        );
      }

      window.location.href =
        data.url;
    } catch (portalError) {
      setError(
        portalError instanceof
          Error
          ? portalError.message
          : "Unable to open billing management."
      );

      setActionLoading(
        null
      );
    }
  }

  return (
    <main style={pageStyle}>
      <section style={containerStyle}>
        <div style={topBarStyle}>
          <div>
            <Link
              href="/settings"
              style={backLinkStyle}
            >
              ← Back to Settings
            </Link>

            <p style={eyebrowStyle}>
              Billing & subscription
            </p>

            <h1 style={titleStyle}>
              Manage Subscription
            </h1>

            <p style={subtitleStyle}>
              View your current plan,
              upgrade to Premium, or
              manage billing through Stripe.
            </p>
          </div>
        </div>

        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={loadingStyle}>
            Loading subscription...
          </div>
        ) : (
          <>
            <section style={planCardStyle}>
              <div style={planTopStyle}>
                <div>
                  <p style={labelStyle}>
                    Current plan
                  </p>

                  <h2 style={planTitleStyle}>
                    {isPremium
                      ? "Norvexa Premium"
                      : "Free Plan"}
                  </h2>

                  <p style={planDescriptionStyle}>
                    {isPremium
                      ? "You have access to Norvexa Premium features."
                      : "Upgrade anytime to unlock advanced Norvexa tools."}
                  </p>
                </div>

                <span
                  style={{
                    ...statusBadgeStyle,
                    ...(isPremium
                      ? premiumBadgeStyle
                      : freeBadgeStyle),
                  }}
                >
                  {isPremium
                    ? "⭐ Premium"
                    : "Free"}
                </span>
              </div>

              <div style={detailsGridStyle}>
                <Detail
                  label="Plan"
                  value={
                    isPremium
                      ? "Premium"
                      : "Free"
                  }
                />

                <Detail
                  label="Status"
                  value={
                    status
                      .charAt(0)
                      .toUpperCase() +
                    status.slice(1)
                  }
                />

                {isPremium &&
                  renewalDate && (
                    <Detail
                      label={
                        subscription
                          ?.cancel_at_period_end
                          ? "Access until"
                          : "Renews"
                      }
                      value={
                        renewalDate
                      }
                    />
                  )}

                {isPremium &&
                  subscription
                    ?.cancel_at_period_end && (
                    <Detail
                      label="Cancellation"
                      value="Scheduled"
                    />
                  )}
              </div>

              <div style={buttonRowStyle}>
                {isPremium ? (
                  <button
                    type="button"
                    onClick={
                      openPortal
                    }
                    disabled={
                      actionLoading !==
                      null
                    }
                    style={{
                      ...primaryButtonStyle,
                      opacity:
                        actionLoading
                          ? 0.7
                          : 1,
                    }}
                  >
                    {actionLoading ===
                    "portal"
                      ? "Opening Stripe..."
                      : "Manage Subscription"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={
                      startCheckout
                    }
                    disabled={
                      actionLoading !==
                      null
                    }
                    style={{
                      ...primaryButtonStyle,
                      opacity:
                        actionLoading
                          ? 0.7
                          : 1,
                    }}
                  >
                    {actionLoading ===
                    "checkout"
                      ? "Opening Checkout..."
                      : "Upgrade to Premium"}
                  </button>
                )}

                <Link
                  href="/premium"
                  style={secondaryButtonStyle}
                >
                  View Premium
                </Link>
              </div>
            </section>

            <section style={benefitsCardStyle}>
              <p style={eyebrowStyle}>
                Premium benefits
              </p>

              <h2 style={sectionTitleStyle}>
                Everything included with Premium
              </h2>

              <div style={benefitGridStyle}>
                <Benefit>
                  Advanced AI Research
                </Benefit>

                <Benefit>
                  AI Stock Screener
                </Benefit>

                <Benefit>
                  Advanced Analytics
                </Benefit>

                <Benefit>
                  Portfolio Analytics
                </Benefit>

                <Benefit>
                  Premium AI Copilot
                </Benefit>

                <Benefit>
                  Future Premium features
                </Benefit>
              </div>
            </section>

            <section style={infoCardStyle}>
              <p style={labelStyle}>
                Billing management
              </p>

              <p style={infoTextStyle}>
                Payment methods,
                cancellation, invoices,
                and subscription changes
                are handled securely
                through Stripe.
              </p>

              {isPremium && (
                <button
                  type="button"
                  onClick={
                    openPortal
                  }
                  disabled={
                    actionLoading !==
                    null
                  }
                  style={textButtonStyle}
                >
                  Open Stripe billing portal →
                </button>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={detailCardStyle}>
      <p style={detailLabelStyle}>
        {label}
      </p>

      <p style={detailValueStyle}>
        {value}
      </p>
    </div>
  );
}

function Benefit({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <div style={benefitStyle}>
      <span style={checkStyle}>
        ✓
      </span>

      <span>
        {children}
      </span>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#07111f",
  color: "#f8fafc",
  padding: "32px 24px 70px",
};

const containerStyle = {
  width: "100%",
  maxWidth: 960,
  margin: "0 auto",
};

const topBarStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 20,
  marginBottom: 24,
};

const backLinkStyle = {
  display: "inline-block",
  marginBottom: 22,
  color: "#93c5fd",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 700,
};

const eyebrowStyle = {
  margin: "0 0 7px",
  color: "#60a5fa",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
};

const titleStyle = {
  margin: 0,
  fontSize: 34,
  lineHeight: 1.1,
  letterSpacing: "-0.03em",
};

const subtitleStyle = {
  maxWidth: 620,
  margin: "10px 0 0",
  color: "#9ca3af",
  fontSize: 14,
  lineHeight: 1.65,
};

const planCardStyle = {
  padding: 24,
  border:
    "1px solid rgba(96,165,250,0.18)",
  borderRadius: 18,
  background:
    "linear-gradient(135deg, rgba(37,99,235,0.10), rgba(255,255,255,0.03))",
  boxShadow:
    "0 24px 70px rgba(0,0,0,0.22)",
};

const planTopStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
  alignItems: "flex-start",
  flexWrap: "wrap" as const,
};

const labelStyle = {
  margin: 0,
  color: "#7d8999",
  fontSize: 10,
  fontWeight: 800,
};

const planTitleStyle = {
  margin: "5px 0 0",
  fontSize: 26,
};

const planDescriptionStyle = {
  maxWidth: 520,
  margin: "8px 0 0",
  color: "#9ca3af",
  fontSize: 13,
  lineHeight: 1.6,
};

const statusBadgeStyle = {
  padding: "7px 10px",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 900,
};

const premiumBadgeStyle = {
  border:
    "1px solid rgba(251,191,36,0.22)",
  background:
    "rgba(251,191,36,0.08)",
  color: "#fbbf24",
};

const freeBadgeStyle = {
  border:
    "1px solid rgba(148,163,184,0.16)",
  background:
    "rgba(148,163,184,0.06)",
  color: "#cbd5e1",
};

const detailsGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 10,
  marginTop: 22,
};

const detailCardStyle = {
  padding: 14,
  border:
    "1px solid rgba(255,255,255,0.06)",
  borderRadius: 12,
  background:
    "rgba(2,7,19,0.28)",
};

const detailLabelStyle = {
  margin: 0,
  color: "#6b7280",
  fontSize: 9,
  fontWeight: 800,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};

const detailValueStyle = {
  margin: "5px 0 0",
  color: "#e5e7eb",
  fontSize: 13,
  fontWeight: 800,
};

const buttonRowStyle = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap" as const,
  marginTop: 22,
};

const primaryButtonStyle = {
  padding: "11px 16px",
  border: "none",
  borderRadius: 10,
  background:
    "linear-gradient(135deg, #2563eb, #0284c7)",
  color: "white",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow:
    "0 12px 30px rgba(37,99,235,0.22)",
};

const secondaryButtonStyle = {
  padding: "11px 16px",
  border:
    "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  background:
    "rgba(255,255,255,0.025)",
  color: "#d1d5db",
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 800,
};

const benefitsCardStyle = {
  marginTop: 18,
  padding: 22,
  border:
    "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16,
  background:
    "rgba(255,255,255,0.025)",
};

const sectionTitleStyle = {
  margin: 0,
  fontSize: 21,
};

const benefitGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
  marginTop: 16,
};

const benefitStyle = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "11px 12px",
  border:
    "1px solid rgba(255,255,255,0.05)",
  borderRadius: 10,
  background:
    "rgba(2,7,19,0.22)",
  color: "#d1d5db",
  fontSize: 12,
};

const checkStyle = {
  width: 20,
  height: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  background:
    "rgba(34,197,94,0.10)",
  color: "#4ade80",
  fontSize: 11,
  fontWeight: 900,
};

const infoCardStyle = {
  marginTop: 18,
  padding: 18,
  border:
    "1px solid rgba(255,255,255,0.06)",
  borderRadius: 14,
  background:
    "rgba(255,255,255,0.02)",
};

const infoTextStyle = {
  margin: "7px 0 0",
  maxWidth: 700,
  color: "#7d8999",
  fontSize: 12,
  lineHeight: 1.6,
};

const textButtonStyle = {
  marginTop: 12,
  padding: 0,
  border: "none",
  background: "transparent",
  color: "#93c5fd",
  fontSize: 11,
  fontWeight: 800,
  cursor: "pointer",
};

const errorStyle = {
  marginBottom: 16,
  padding: "12px 14px",
  border:
    "1px solid rgba(248,113,113,0.18)",
  borderRadius: 10,
  background:
    "rgba(127,29,29,0.10)",
  color: "#fca5a5",
  fontSize: 12,
};

const loadingStyle = {
  padding: 24,
  border:
    "1px solid rgba(255,255,255,0.06)",
  borderRadius: 14,
  background:
    "rgba(255,255,255,0.025)",
  color: "#9ca3af",
  fontSize: 13,
};