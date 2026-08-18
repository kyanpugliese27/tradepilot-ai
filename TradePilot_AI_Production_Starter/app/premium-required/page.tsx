"use client";

import Link from "next/link";
import {
  Suspense,
} from "react";
import {
  useSearchParams,
} from "next/navigation";

const FEATURES = [
  {
    icon: "🤖",
    title:
      "Advanced AI Research",
    description:
      "Use TradePilot's deeper AI research workspace and saved research tools.",
  },
  {
    icon: "📊",
    title:
      "Portfolio Analytics",
    description:
      "Unlock advanced portfolio health, diversification, risk, and benchmark analysis.",
  },
  {
    icon: "🔎",
    title:
      "AI Stock Screener",
    description:
      "Describe the type of company you want and let TradePilot rank matching stocks.",
  },
];

export default function PremiumRequiredPage() {
  return (
    <Suspense
      fallback={
        <PremiumRequiredFallback />
      }
    >
      <PremiumRequiredContent />
    </Suspense>
  );
}

function PremiumRequiredContent() {
  const searchParams =
    useSearchParams();

  const from =
    searchParams.get(
      "from"
    );

  const reason =
    searchParams.get(
      "reason"
    );

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

          <span style={premiumBadgeStyle}>
            ⭐ Premium
          </span>
        </div>

        <section style={heroStyle}>
          <div style={lockCircleStyle}>
            🔒
          </div>

          <p style={eyebrowStyle}>
            TradePilot Premium
          </p>

          <h1 style={titleStyle}>
            Premium Required
          </h1>

          <p style={subtitleStyle}>
            {reason ===
            "verification"
              ? "TradePilot could not verify your Premium status. Try again or open your subscription page."
              : "This feature is part of TradePilot Premium. Upgrade to unlock the full investing research experience."}
          </p>

          {from && (
            <div style={requestedStyle}>
              You tried to open{" "}
              <strong>
                {friendlyPath(
                  from
                )}
              </strong>
            </div>
          )}

          <div style={buttonRowStyle}>
            <Link
              href="/premium"
              style={upgradeButtonStyle}
            >
              ⭐ Upgrade to Premium
            </Link>

            <Link
              href="/dashboard"
              style={secondaryButtonStyle}
            >
              Maybe Later
            </Link>
          </div>
        </section>

        <div
          className="feature-grid"
          style={gridStyle}
        >
          {FEATURES.map(
            (feature) => (
              <article
                key={
                  feature.title
                }
                style={featureCardStyle}
              >
                <div style={iconStyle}>
                  {feature.icon}
                </div>

                <h2 style={featureTitleStyle}>
                  {feature.title}
                </h2>

                <p style={featureTextStyle}>
                  {
                    feature.description
                  }
                </p>
              </article>
            )
          )}
        </div>

        <section style={includedStyle}>
          <p style={eyebrowStyle}>
            Included with Premium
          </p>

          <h2 style={{ margin: 0 }}>
            One subscription. Full access.
          </h2>

          <div style={checkGridStyle}>
            <Check>
              Advanced AI Research
            </Check>

            <Check>
              Advanced Portfolio Analytics
            </Check>

            <Check>
              AI Stock Screener
            </Check>

            <Check>
              Premium features added later
            </Check>
          </div>
        </section>

        <div style={noticeStyle}>
          <strong>
            Already subscribed?
          </strong>

          <p
            style={{
              margin:
                "6px 0 0",
              color:
                "#9ca3af",
              fontSize: 11,
              lineHeight: 1.55,
            }}
          >
            If your subscription was
            just activated, return to
            the Premium page first so
            TradePilot can display your
            current billing status,
            then reopen the feature.
          </p>
        </div>

        <style jsx>{`
          @media (max-width: 760px) {
            .feature-grid {
              grid-template-columns:
                1fr !important;
            }
          }
        `}</style>
      </section>
    </main>
  );
}

function PremiumRequiredFallback() {
  return (
    <main style={pageStyle}>
      <section style={containerStyle}>
        <section style={heroStyle}>
          <div style={lockCircleStyle}>
            🔒
          </div>

          <p style={eyebrowStyle}>
            TradePilot Premium
          </p>

          <h1 style={titleStyle}>
            Loading...
          </h1>

          <p style={subtitleStyle}>
            Checking the requested Premium feature.
          </p>
        </section>
      </section>
    </main>
  );
}

function Check({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <div style={checkStyle}>
      <span
        style={{
          color:
            "#4ade80",
          fontWeight:
            900,
        }}
      >
        ✓
      </span>

      <span>
        {children}
      </span>
    </div>
  );
}

function friendlyPath(
  pathname: string
) {
  if (
    pathname.startsWith(
      "/research"
    )
  ) {
    return "AI Research";
  }

  if (
    pathname.startsWith(
      "/portfolio-analytics"
    )
  ) {
    return "Portfolio Analytics";
  }

  if (
    pathname.startsWith(
      "/screener"
    )
  ) {
    return "AI Stock Screener";
  }

  return pathname;
}

const pageStyle = {
  minHeight: "100vh",
  padding: "34px 24px",
  background: "#07111f",
  color: "white",
};

const containerStyle = {
  maxWidth: 1050,
  margin: "0 auto",
};

const topBarStyle = {
  display: "flex",
  alignItems:
    "center",
  justifyContent:
    "space-between",
  gap: 12,
  flexWrap:
    "wrap" as const,
  marginBottom: 24,
};

const backLinkStyle = {
  display:
    "inline-block",
  padding: "9px 13px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  borderRadius: 9,
  color: "#d1d5db",
  textDecoration:
    "none",
};

const premiumBadgeStyle = {
  padding: "7px 10px",
  border:
    "1px solid rgba(251,191,36,0.28)",
  borderRadius: 999,
  background:
    "rgba(251,191,36,0.08)",
  color: "#fbbf24",
  fontSize: 9,
  fontWeight: 900,
};

const heroStyle = {
  padding: "38px 28px",
  border:
    "1px solid rgba(251,191,36,0.25)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(251,191,36,0.08), rgba(37,99,235,0.07), rgba(255,255,255,0.025))",
  textAlign:
    "center" as const,
};

const lockCircleStyle = {
  width: 64,
  height: 64,
  display:
    "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  margin:
    "0 auto 16px",
  border:
    "1px solid rgba(251,191,36,0.26)",
  borderRadius:
    "50%",
  background:
    "rgba(251,191,36,0.08)",
  fontSize: 29,
};

const eyebrowStyle = {
  margin:
    "0 0 8px",
  color: "#fbbf24",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing:
    "0.12em",
  textTransform:
    "uppercase" as const,
};

const titleStyle = {
  margin: 0,
  fontSize: 42,
};

const subtitleStyle = {
  maxWidth: 640,
  margin:
    "12px auto 0",
  color: "#9ca3af",
  lineHeight: 1.7,
};

const requestedStyle = {
  display:
    "inline-block",
  marginTop: 16,
  padding:
    "7px 10px",
  border:
    "1px solid rgba(255,255,255,0.08)",
  borderRadius: 999,
  background:
    "rgba(255,255,255,0.025)",
  color: "#d1d5db",
  fontSize: 10,
};

const buttonRowStyle = {
  display: "flex",
  justifyContent:
    "center",
  gap: 10,
  flexWrap:
    "wrap" as const,
  marginTop: 23,
};

const upgradeButtonStyle = {
  padding:
    "12px 17px",
  borderRadius: 10,
  background:
    "#fbbf24",
  color: "#111827",
  fontWeight: 900,
  textDecoration:
    "none",
};

const secondaryButtonStyle = {
  padding:
    "12px 17px",
  border:
    "1px solid rgba(255,255,255,0.11)",
  borderRadius: 10,
  background:
    "rgba(255,255,255,0.03)",
  color: "#d1d5db",
  fontWeight: 800,
  textDecoration:
    "none",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: 13,
  marginTop: 16,
};

const featureCardStyle = {
  padding: 19,
  border:
    "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  background:
    "rgba(255,255,255,0.03)",
};

const iconStyle = {
  width: 45,
  height: 45,
  display:
    "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  border:
    "1px solid rgba(96,165,250,0.16)",
  borderRadius: 11,
  background:
    "rgba(37,99,235,0.05)",
  fontSize: 21,
};

const featureTitleStyle = {
  margin:
    "14px 0 0",
  fontSize: 17,
};

const featureTextStyle = {
  margin:
    "8px 0 0",
  color: "#9ca3af",
  fontSize: 11,
  lineHeight: 1.6,
};

const includedStyle = {
  marginTop: 16,
  padding: 20,
  border:
    "1px solid rgba(96,165,250,0.15)",
  borderRadius: 14,
  background:
    "rgba(37,99,235,0.04)",
};

const checkGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 9,
  marginTop: 15,
};

const checkStyle = {
  display: "flex",
  gap: 8,
  alignItems:
    "center",
  color: "#d1d5db",
  fontSize: 11,
};

const noticeStyle = {
  marginTop: 16,
  padding: 15,
  border:
    "1px solid rgba(251,191,36,0.15)",
  borderRadius: 11,
  background:
    "rgba(251,191,36,0.035)",
  color: "#fbbf24",
};