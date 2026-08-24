"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type SubscriptionRow = {
  user_id: string;
  plan: "free" | "premium";
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

type PremiumPlan =
  | "monthly"
  | "yearly"
  | "lifetime";

export default function PremiumPage() {
  const router = useRouter();

  const [subscription, setSubscription] =
    useState<SubscriptionRow | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [
    upgradingPlan,
    setUpgradingPlan,
  ] =
    useState<PremiumPlan | null>(
      null
    );

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadSubscription();
  }, []);

  async function loadSubscription() {
    const supabase =
      createClient();

    try {
      setLoading(true);
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
        data,
        error:
          subscriptionError,
      } = await supabase
        .from(
          "premium_subscriptions"
        )
        .select(
          `
            user_id,
            plan,
            status,
            stripe_customer_id,
            stripe_subscription_id,
            stripe_price_id,
            current_period_end,
            cancel_at_period_end
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
        throw new Error(
          subscriptionError.message
        );
      }

      setSubscription(
        data as SubscriptionRow | null
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load your subscription."
      );
    } finally {
      setLoading(false);
    }
  }

  async function upgradeToPremium(
    plan: PremiumPlan
  ) {
    try {
      setUpgradingPlan(plan);
      setError("");

      const response =
        await fetch(
          "/api/stripe/checkout",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              plan,
            }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.url
      ) {
        throw new Error(
          result.error ||
            "Unable to start Checkout."
        );
      }

      window.location.href =
        result.url;
    } catch (upgradeError) {
      setError(
        upgradeError instanceof Error
          ? upgradeError.message
          : "Unable to start Checkout."
      );

      setUpgradingPlan(null);
    }
  }

  const premium =
    subscription?.plan ===
      "premium" &&
    [
      "active",
      "trialing",
    ].includes(
      subscription.status
    );

  return (
    <main style={pageStyle}>
      <section style={containerStyle}>
        <div style={topBarStyle}>
          <Link
            href="/"
            style={backLinkStyle}
          >
            ← Back to Home
          </Link>

          <span
            style={{
              ...statusBadgeStyle,
              color: premium
                ? "#fbbf24"
                : "#9ca3af",
              border: premium
                ? "1px solid rgba(251,191,36,0.28)"
                : "1px solid rgba(255,255,255,0.1)",
              background: premium
                ? "rgba(251,191,36,0.08)"
                : "rgba(255,255,255,0.03)",
            }}
          >
            {loading
              ? "Loading..."
              : premium
                ? "Premium Active"
                : "Free Plan"}
          </span>
        </div>

        <p style={eyebrowStyle}>
          Norvexa membership
        </p>

        <h1 style={titleStyle}>
          Norvexa Premium
        </h1>

        <p style={subtitleStyle}>
          Unlock the premium tier of
          Norvexa with advanced
          research, deeper analytics,
          and future premium-only
          investing tools.
        </p>

        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}

        <div
          className="plans-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap: 16,
            marginTop: 25,
          }}
        >
          <article style={freeCardStyle}>
            <p style={planLabelStyle}>
              FREE
            </p>

            <h2
              style={{
                margin:
                  "8px 0 0",
                fontSize: 27,
              }}
            >
              Norvexa Free
            </h2>

            <div style={priceWrapStyle}>
              <strong style={priceStyle}>
                $0
              </strong>
              <span style={pricePeriodStyle}>
                forever
              </span>
            </div>

            <p style={mutedStyle}>
              Core investing research
              and paper trading.
            </p>

            <Feature>
              Market dashboard
            </Feature>

            <Feature>
              Watchlist
            </Feature>

            <Feature>
              Paper trading
            </Feature>

            <Feature>
              Community
            </Feature>

            <Feature>
              Core research
            </Feature>

            {!premium && (
              <div
                style={
                  currentPlanStyle
                }
              >
                Your current plan
              </div>
            )}
          </article>

          <article style={premiumCardStyle}>
            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                gap: 10,
              }}
            >
              <p style={premiumPlanLabelStyle}>
                MONTHLY
              </p>

              <span
                style={
                  flexibleStyle
                }
              >
                Flexible
              </span>
            </div>

            <h2
              style={{
                margin:
                  "8px 0 0",
                fontSize: 27,
              }}
            >
              Premium Monthly
            </h2>

            <div style={priceWrapStyle}>
              <strong style={priceStyle}>
                $79.99
              </strong>
              <span style={pricePeriodStyle}>
                / month
              </span>
            </div>

            <p style={mutedStyle}>
              Full Premium access with
              simple month-to-month billing.
            </p>

            <Feature>
              Everything in Free
            </Feature>

            <Feature>
              Premium AI research
            </Feature>

            <Feature>
              Advanced portfolio analytics
            </Feature>

            <Feature>
              Premium screeners and tools
            </Feature>

            <Feature>
              Future Premium features
            </Feature>

            {premium ? (
              <div style={premiumActiveStyle}>
                ✓ Premium is active
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  upgradeToPremium(
                    "monthly"
                  )
                }
                disabled={
                  upgradingPlan !==
                    null ||
                  loading
                }
                style={
                  upgradeButtonStyle
                }
              >
                {upgradingPlan ===
                "monthly"
                  ? "Opening Stripe..."
                  : "Choose Monthly"}
              </button>
            )}
          </article>

          <article
            style={{
              ...premiumCardStyle,
              border:
                "1px solid rgba(251,191,36,0.52)",
              boxShadow:
                "0 16px 50px rgba(251,191,36,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                gap: 10,
              }}
            >
              <p style={premiumPlanLabelStyle}>
                YEARLY
              </p>

              <span
                style={
                  recommendedStyle
                }
              >
                Best value
              </span>
            </div>

            <h2
              style={{
                margin:
                  "8px 0 0",
                fontSize: 27,
              }}
            >
              Premium Yearly
            </h2>

            <div style={priceWrapStyle}>
              <strong style={priceStyle}>
                $699.99
              </strong>
              <span style={pricePeriodStyle}>
                / year
              </span>
            </div>

            <p
              style={{
                ...mutedStyle,
                marginBottom: 8,
              }}
            >
              About $58.33/month.
              Save $259.89 per year
              versus monthly billing.
            </p>

            <Feature>
              Everything in Free
            </Feature>

            <Feature>
              Premium AI research
            </Feature>

            <Feature>
              Advanced portfolio analytics
            </Feature>

            <Feature>
              Premium screeners and tools
            </Feature>

            <Feature>
              Future Premium features
            </Feature>

            {premium ? (
              <div style={premiumActiveStyle}>
                ✓ Premium is active
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  upgradeToPremium(
                    "yearly"
                  )
                }
                disabled={
                  upgradingPlan !==
                    null ||
                  loading
                }
                style={
                  upgradeButtonStyle
                }
              >
                {upgradingPlan ===
                "yearly"
                  ? "Opening Stripe..."
                  : "Choose Yearly"}
              </button>
            )}
          </article>

          <article
            style={{
              ...premiumCardStyle,
              border:
                "1px solid rgba(96,165,250,0.34)",
              background:
                "linear-gradient(145deg, rgba(96,165,250,0.10), rgba(168,85,247,0.07), rgba(255,255,255,0.03))",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                gap: 10,
              }}
            >
              <p
                style={{
                  ...premiumPlanLabelStyle,
                  color: "#93c5fd",
                }}
              >
                LIFETIME
              </p>

              <span
                style={
                  lifetimeBadgeStyle
                }
              >
                One payment
              </span>
            </div>

            <h2
              style={{
                margin:
                  "8px 0 0",
                fontSize: 27,
              }}
            >
              Premium Lifetime
            </h2>

            <div style={priceWrapStyle}>
              <strong style={priceStyle}>
                $1,499.99
              </strong>
              <span style={pricePeriodStyle}>
                once
              </span>
            </div>

            <p style={mutedStyle}>
              Pay once for permanent
              Norvexa Premium access.
              No recurring subscription fee.
            </p>

            <Feature>
              Everything in Free
            </Feature>

            <Feature>
              Premium AI research
            </Feature>

            <Feature>
              Advanced portfolio analytics
            </Feature>

            <Feature>
              Premium screeners and tools
            </Feature>

            <Feature>
              Future Premium features
            </Feature>

            {premium ? (
              <div style={premiumActiveStyle}>
                ✓ Premium is active
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  upgradeToPremium(
                    "lifetime"
                  )
                }
                disabled={
                  upgradingPlan !==
                    null ||
                  loading
                }
                style={{
                  ...upgradeButtonStyle,
                  background:
                    "#93c5fd",
                }}
              >
                {upgradingPlan ===
                "lifetime"
                  ? "Opening Stripe..."
                  : "Choose Lifetime"}
              </button>
            )}
          </article>
        </div>

        {subscription &&
          subscription.status !==
            "free" && (
            <section
              style={{
                ...detailsCardStyle,
                marginTop: 16,
              }}
            >
              <p style={eyebrowStyle}>
                Subscription
              </p>

              <h2 style={{ margin: 0 }}>
                Billing Status
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 10,
                  marginTop: 14,
                }}
              >
                <Detail
                  label="Plan"
                  value={
                    subscription.plan
                  }
                />

                <Detail
                  label="Status"
                  value={
                    subscription.status
                  }
                />

                <Detail
                  label={
                    subscription.stripe_subscription_id
                      ? "Renews / ends"
                      : "Access"
                  }
                  value={
                    subscription.current_period_end
                      ? new Date(
                          subscription.current_period_end
                        ).toLocaleDateString(
                          "en-US"
                        )
                      : premium &&
                          !subscription.stripe_subscription_id
                        ? "Lifetime"
                        : "Not available"
                  }
                />

                <Detail
                  label="Cancel at period end"
                  value={
                    subscription.cancel_at_period_end
                      ? "Yes"
                      : "No"
                  }
                />
              </div>
            </section>
          )}

        <div style={noticeStyle}>
          <strong>
            Secure billing through Stripe
          </strong>

          <p
            style={{
              margin:
                "6px 0 0",
              ...mutedStyle,
              fontSize: 11,
              lineHeight: 1.55,
            }}
          >
            Monthly and yearly
            subscriptions, one-time Lifetime
            purchases, billing, payment
            methods, and cancellations are
            handled securely through Stripe.
          </p>
        </div>

        <style jsx>{`
          @media (max-width: 1100px) {
            .plans-grid {
              grid-template-columns:
                repeat(2, minmax(0, 1fr)) !important;
            }
          }

          @media (max-width: 700px) {
            .plans-grid {
              grid-template-columns:
                1fr !important;
            }
          }
        `}</style>
      </section>
    </main>
  );
}

function Feature({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <div style={featureStyle}>
      <span
        style={{
          color: "#4ade80",
          fontWeight: 900,
        }}
      >
        ✓
      </span>

      <span>{children}</span>
    </div>
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
    <div style={detailStyle}>
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
          textTransform:
            "capitalize",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  padding: "32px 24px",
  background: "#07111f",
  color: "white",
};

const containerStyle = {
  maxWidth: 1240,
  margin: "0 auto",
};

const topBarStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent:
    "space-between",
  gap: 12,
  flexWrap:
    "wrap" as const,
  marginBottom: 28,
};

const eyebrowStyle = {
  margin: "0 0 7px",
  color: "#60a5fa",
  fontSize: 10,
  fontWeight: 850,
  letterSpacing:
    "0.1em",
  textTransform:
    "uppercase" as const,
};

const titleStyle = {
  margin: 0,
  fontSize: 43,
};

const subtitleStyle = {
  margin: "10px 0 0",
  maxWidth: 720,
  color: "#9ca3af",
  lineHeight: 1.65,
};

const mutedStyle = {
  color: "#9ca3af",
};

const freeCardStyle = {
  padding: 24,
  border:
    "1px solid rgba(255,255,255,0.09)",
  borderRadius: 18,
  background:
    "rgba(255,255,255,0.03)",
};

const premiumCardStyle = {
  padding: 24,
  border:
    "1px solid rgba(251,191,36,0.3)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(251,191,36,0.09), rgba(37,99,235,0.05), rgba(255,255,255,0.03))",
};

const detailsCardStyle = {
  padding: 20,
  border:
    "1px solid rgba(255,255,255,0.09)",
  borderRadius: 15,
  background:
    "rgba(255,255,255,0.03)",
};

const planLabelStyle = {
  margin: 0,
  color: "#9ca3af",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing:
    "0.12em",
};

const premiumPlanLabelStyle = {
  ...planLabelStyle,
  color: "#fbbf24",
};

const priceWrapStyle = {
  display: "flex",
  alignItems: "baseline",
  gap: 6,
  margin: "18px 0 14px",
  flexWrap: "wrap" as const,
};

const priceStyle = {
  color: "white",
  fontSize: 31,
  lineHeight: 1,
  fontWeight: 900,
  letterSpacing: "-0.03em",
};

const pricePeriodStyle = {
  color: "#9ca3af",
  fontSize: 11,
  fontWeight: 700,
};

const flexibleStyle = {
  padding: "5px 8px",
  border:
    "1px solid rgba(255,255,255,0.12)",
  borderRadius: 999,
  background:
    "rgba(255,255,255,0.04)",
  color: "#d1d5db",
  fontSize: 8,
  fontWeight: 850,
};

const lifetimeBadgeStyle = {
  padding: "5px 8px",
  border:
    "1px solid rgba(147,197,253,0.28)",
  borderRadius: 999,
  background:
    "rgba(96,165,250,0.08)",
  color: "#93c5fd",
  fontSize: 8,
  fontWeight: 850,
};

const recommendedStyle = {
  padding: "5px 8px",
  border:
    "1px solid rgba(251,191,36,0.25)",
  borderRadius: 999,
  background:
    "rgba(251,191,36,0.06)",
  color: "#fbbf24",
  fontSize: 8,
  fontWeight: 850,
};

const featureStyle = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  marginTop: 12,
  color: "#d1d5db",
  fontSize: 12,
};

const currentPlanStyle = {
  marginTop: 22,
  padding: "11px 12px",
  border:
    "1px solid rgba(255,255,255,0.09)",
  borderRadius: 10,
  background:
    "rgba(255,255,255,0.025)",
  color: "#9ca3af",
  textAlign:
    "center" as const,
  fontWeight: 800,
};

const premiumActiveStyle = {
  marginTop: 22,
  padding: "11px 12px",
  border:
    "1px solid rgba(34,197,94,0.25)",
  borderRadius: 10,
  background:
    "rgba(34,197,94,0.07)",
  color: "#4ade80",
  textAlign:
    "center" as const,
  fontWeight: 850,
};

const upgradeButtonStyle = {
  width: "100%",
  marginTop: 22,
  padding: "12px 15px",
  border: "none",
  borderRadius: 10,
  background: "#fbbf24",
  color: "#111827",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
};

const detailStyle = {
  padding: 12,
  border:
    "1px solid rgba(255,255,255,0.07)",
  borderRadius: 10,
  background:
    "rgba(255,255,255,0.025)",
};

const statusBadgeStyle = {
  padding: "7px 10px",
  borderRadius: 999,
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