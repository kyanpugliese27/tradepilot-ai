"use client";

import {
  useEffect,
  useRef,
} from "react";

export default function Features() {
  const sectionRef =
    useRef<HTMLElement | null>(
      null
    );

  useEffect(() => {
    const node =
      sectionRef.current;

    if (!node) {
      return;
    }

    const targets =
      node.querySelectorAll(
        "[data-reveal]"
      );

    const observer =
      new IntersectionObserver(
        (entries) => {
          entries.forEach(
            (entry) => {
              if (
                entry.isIntersecting
              ) {
                entry.target.classList.add(
                  "tp-visible"
                );
              }
            }
          );
        },
        {
          threshold: 0.12,
        }
      );

    targets.forEach(
      (target) =>
        observer.observe(target)
    );

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      style={sectionShellStyle}
    >
      <div style={innerStyle}>
        <section
          id="features"
          style={featuresSectionStyle}
        >
          <div
            data-reveal
            className="tp-reveal"
            style={featuresIntroStyle}
          >
            <p style={sectionEyebrowStyle}>
              BUILT FOR BETTER RESEARCH
            </p>

            <h2 style={sectionTitleStyle}>
              Everything you need before you make the next move.
            </h2>

            <p style={sectionTextStyle}>
              Research companies, test ideas, track your portfolio,
              stay on top of alerts, and learn from the community
              without jumping between five different tools.
            </p>
          </div>

          <div
            className="feature-showcase-grid"
            style={featureShowcaseGridStyle}
          >
            <FeatureCard
              eyebrow="AI RESEARCH"
              icon="✦"
              title="Ask better questions about any stock."
              description="Use Norvexa to research companies, compare stocks, understand earnings, and break down investing concepts in plain English."
              accent="blue"
              large
            >
              <div style={researchDemoStyle}>
                <div style={researchBubbleUserStyle}>
                  Compare Apple and Microsoft for long-term growth.
                </div>

                <div style={researchBubbleAiStyle}>
                  <div style={researchAiHeadingStyle}>
                    <span>✦</span>
                    Norvexa
                  </div>

                  <p style={researchAiTextStyle}>
                    Apple offers stronger ecosystem economics, while Microsoft
                    has broader enterprise exposure and recurring cloud revenue.
                  </p>

                  <div style={researchTagRowStyle}>
                    <span style={researchTagStyle}>Growth</span>
                    <span style={researchTagStyle}>Margins</span>
                    <span style={researchTagStyle}>Risk</span>
                  </div>
                </div>
              </div>
            </FeatureCard>

            <FeatureCard
              eyebrow="AI STOCK SCREENER"
              icon="⌕"
              title="Describe the stock you want."
              description="Use natural language to screen for companies that match the financial traits you care about."
              accent="cyan"
            >
              <div style={screenerDemoStyle}>
                <div style={screenerPromptStyle}>
                  Profitable semiconductor companies with strong margins
                </div>

                <div style={screenerResultStyle}>
                  <span style={screenerRankStyle}>01</span>
                  <strong>NVDA</strong>
                  <span style={screenerScoreStyle}>94 match</span>
                </div>

                <div style={screenerResultStyle}>
                  <span style={screenerRankStyle}>02</span>
                  <strong>AVGO</strong>
                  <span style={screenerScoreStyle}>89 match</span>
                </div>

                <div style={screenerResultStyle}>
                  <span style={screenerRankStyle}>03</span>
                  <strong>AMD</strong>
                  <span style={screenerScoreStyle}>82 match</span>
                </div>
              </div>
            </FeatureCard>

            <FeatureCard
              eyebrow="PORTFOLIO ANALYTICS"
              icon="◔"
              title="See what your portfolio is really doing."
              description="Track allocation, diversification, gains, losses, and portfolio health in one place."
              accent="green"
            >
              <div style={allocationDemoStyle}>
                <div style={allocationRingStyle}>
                  <div style={allocationRingInnerStyle}>
                    <span style={allocationRingLabelStyle}>
                      Allocation
                    </span>
                    <strong style={allocationRingValueStyle}>
                      100%
                    </strong>
                  </div>
                </div>

                <div style={allocationLegendStyle}>
                  <AllocationRow
                    label="Technology"
                    value="42%"
                  />
                  <AllocationRow
                    label="Consumer"
                    value="24%"
                  />
                  <AllocationRow
                    label="Healthcare"
                    value="18%"
                  />
                  <AllocationRow
                    label="Other"
                    value="16%"
                  />
                </div>
              </div>
            </FeatureCard>

            <FeatureCard
              eyebrow="PAPER TRADING"
              icon="↗"
              title="Test ideas before risking real money."
              description="Buy and sell with a virtual portfolio, review your transaction history, and track realized performance."
              accent="violet"
            >
              <div style={tradeDemoStyle}>
                <div style={tradeTopRowStyle}>
                  <div>
                    <span style={tradeSymbolStyle}>
                      AAPL
                    </span>
                    <span style={tradeCompanyStyle}>
                      Apple Inc.
                    </span>
                  </div>

                  <strong style={tradePriceStyle}>
                    $229.31
                  </strong>
                </div>

                <div style={tradeButtonsStyle}>
                  <span style={buyDemoButtonStyle}>
                    Buy
                  </span>

                  <span style={sellDemoButtonStyle}>
                    Sell
                  </span>
                </div>

                <div style={tradeAccountStyle}>
                  <span>Virtual buying power</span>
                  <strong>$34,280.00</strong>
                </div>
              </div>
            </FeatureCard>

            <FeatureCard
              eyebrow="SMART ALERTS"
              icon="◉"
              title="Know when something worth watching happens."
              description="Create price, earnings, news, dividend, and achievement notifications from one notification center."
              accent="amber"
            >
              <div style={alertsDemoStyle}>
                <AlertDemo
                  icon="📈"
                  title="Price Alert"
                  text="NVDA crossed your target."
                  time="Now"
                />

                <AlertDemo
                  icon="📰"
                  title="News Alert"
                  text="New AAPL headline detected."
                  time="4m"
                />

                <AlertDemo
                  icon="🏆"
                  title="Achievement"
                  text="First Trade unlocked."
                  time="12m"
                />
              </div>
            </FeatureCard>

            <FeatureCard
              eyebrow="COMMUNITY"
              icon="◎"
              title="Learn from other paper traders."
              description="Follow public traders, compare rankings, share profiles, earn badges, and compete through the Norvexa community."
              accent="pink"
            >
              <div style={communityDemoStyle}>
                <CommunityDemoRow
                  rank="1"
                  name="marketmind"
                  returnValue="+18.4%"
                />

                <CommunityDemoRow
                  rank="2"
                  name="longtermleo"
                  returnValue="+15.8%"
                />

                <CommunityDemoRow
                  rank="3"
                  name="valueview"
                  returnValue="+13.1%"
                />

                <div style={communityFooterStyle}>
                  <span>🏆 Leaderboards</span>
                  <span>✓ Follow traders</span>
                </div>
              </div>
            </FeatureCard>
          </div>
        </section>

        <section
          id="how-it-works"
          style={workflowSectionStyle}
        >
          <div
            data-reveal
            className="tp-reveal"
            style={workflowIntroStyle}
          >
            <p style={sectionEyebrowStyle}>
              ONE CONNECTED WORKFLOW
            </p>

            <h2 style={sectionTitleStyle}>
              Go from idea to insight without leaving Norvexa.
            </h2>
          </div>

          <div
            className="workflow-grid"
            style={workflowGridStyle}
          >
            <WorkflowStep
              number="01"
              title="Discover"
              text="Start with markets, watchlists, screeners, or a company you already want to study."
            />

            <WorkflowArrow />

            <WorkflowStep
              number="02"
              title="Research"
              text="Use AI Research, company data, comparisons, and portfolio context to understand the idea."
            />

            <WorkflowArrow />

            <WorkflowStep
              number="03"
              title="Test"
              text="Paper trade the idea and watch how it affects your virtual portfolio."
            />

            <WorkflowArrow />

            <WorkflowStep
              number="04"
              title="Track"
              text="Use alerts, analytics, achievements, and community rankings to keep learning."
            />
          </div>
        </section>
      </div>

      <style jsx global>{`
        .tp-reveal {
          opacity: 0;
          transform: translateY(22px);
          transition:
            opacity 650ms ease,
            transform 650ms ease;
        }

        .tp-reveal.tp-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .feature-card {
          transition:
            transform 220ms ease,
            border-color 220ms ease,
            box-shadow 220ms ease;
        }

        .feature-card:hover {
          transform: translateY(-6px);
          box-shadow:
            0 28px 80px rgba(0,0,0,0.24);
        }

        .workflow-step {
          transition:
            transform 220ms ease,
            border-color 220ms ease,
            background 220ms ease;
        }

        .workflow-step:hover {
          transform: translateY(-4px);
          border-color:
            rgba(96,165,250,0.14) !important;
          background:
            rgba(255,255,255,0.03) !important;
        }

        .feature-showcase-grid
        > .feature-card:nth-child(1) {
          transition-delay: 40ms;
        }

        .feature-showcase-grid
        > .feature-card:nth-child(2) {
          transition-delay: 90ms;
        }

        .feature-showcase-grid
        > .feature-card:nth-child(3) {
          transition-delay: 140ms;
        }

        .feature-showcase-grid
        > .feature-card:nth-child(4) {
          transition-delay: 190ms;
        }

        .feature-showcase-grid
        > .feature-card:nth-child(5) {
          transition-delay: 240ms;
        }

        .feature-showcase-grid
        > .feature-card:nth-child(6) {
          transition-delay: 290ms;
        }

        @media (prefers-reduced-motion: reduce) {
          .tp-reveal,
          .tp-reveal.tp-visible,
          .feature-card,
          .workflow-step {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
        }

        @media (max-width: 1080px) {
          .feature-showcase-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }

          .feature-card-large {
            grid-column:
              span 2 !important;
          }

          .workflow-grid {
            grid-template-columns:
              1fr !important;
          }

          .workflow-arrow {
            transform:
              rotate(90deg);
            justify-self:
              center;
          }
        }

        @media (max-width: 620px) {
          .feature-showcase-grid {
            grid-template-columns:
              1fr !important;
          }

          .feature-card-large {
            grid-column:
              span 1 !important;
          }
        }
      `}</style>
    </section>
  );
}

function FeatureCard({
  eyebrow,
  icon,
  title,
  description,
  accent,
  large = false,
  children,
}: {
  eyebrow: string;
  icon: string;
  title: string;
  description: string;
  accent:
    | "blue"
    | "cyan"
    | "green"
    | "violet"
    | "amber"
    | "pink";
  large?: boolean;
  children: React.ReactNode;
}) {
  const accents = {
    blue: {
      border: "rgba(96,165,250,0.17)",
      glow: "rgba(37,99,235,0.08)",
      icon: "#93c5fd",
    },
    cyan: {
      border: "rgba(103,232,249,0.16)",
      glow: "rgba(6,182,212,0.07)",
      icon: "#67e8f9",
    },
    green: {
      border: "rgba(74,222,128,0.16)",
      glow: "rgba(34,197,94,0.07)",
      icon: "#4ade80",
    },
    violet: {
      border: "rgba(167,139,250,0.17)",
      glow: "rgba(124,58,237,0.07)",
      icon: "#c4b5fd",
    },
    amber: {
      border: "rgba(251,191,36,0.17)",
      glow: "rgba(245,158,11,0.07)",
      icon: "#fbbf24",
    },
    pink: {
      border: "rgba(244,114,182,0.16)",
      glow: "rgba(219,39,119,0.07)",
      icon: "#f9a8d4",
    },
  } as const;

  const current = accents[accent];

  return (
    <article
      data-reveal
      className={
        large
          ? "feature-card feature-card-large tp-reveal"
          : "feature-card tp-reveal"
      }
      style={{
        ...featureCardStyle,
        gridColumn: large
          ? "span 2"
          : undefined,
        border: `1px solid ${current.border}`,
        background: `linear-gradient(145deg, ${current.glow}, rgba(255,255,255,0.022))`,
      }}
    >
      <div style={featureCardTopStyle}>
        <div
          style={{
            ...featureIconStyle,
            color: current.icon,
            border: `1px solid ${current.border}`,
            background: current.glow,
          }}
        >
          {icon}
        </div>

        <span style={featureEyebrowStyle}>
          {eyebrow}
        </span>
      </div>

      <h3 style={featureTitleStyle}>
        {title}
      </h3>

      <p style={featureDescriptionStyle}>
        {description}
      </p>

      <div style={featureDemoWrapStyle}>
        {children}
      </div>

      <div
        style={{
          ...featureCtaStyle,
          color: current.icon,
          cursor: "default",
        }}
      >
        <span>
          Preview feature
        </span>

        <span
          style={{
            color: "#586474",
            fontWeight: 700,
          }}
        >
          Sign up to access
        </span>
      </div>
    </article>
  );
}

function AllocationRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={allocationRowStyle}>
      <span style={allocationRowLabelStyle}>
        <span style={allocationDotStyle} />
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function AlertDemo({
  icon,
  title,
  text,
  time,
}: {
  icon: string;
  title: string;
  text: string;
  time: string;
}) {
  return (
    <div style={alertDemoRowStyle}>
      <div style={alertDemoIconStyle}>
        {icon}
      </div>

      <div style={alertDemoBodyStyle}>
        <strong style={alertDemoTitleStyle}>
          {title}
        </strong>

        <span style={alertDemoTextStyle}>
          {text}
        </span>
      </div>

      <span style={alertDemoTimeStyle}>
        {time}
      </span>
    </div>
  );
}

function CommunityDemoRow({
  rank,
  name,
  returnValue,
}: {
  rank: string;
  name: string;
  returnValue: string;
}) {
  return (
    <div style={communityDemoRowStyle}>
      <span style={communityRankStyle}>
        #{rank}
      </span>

      <div style={communityAvatarStyle}>
        {name
          .charAt(0)
          .toUpperCase()}
      </div>

      <strong style={communityNameStyle}>
        @{name}
      </strong>

      <span style={communityReturnStyle}>
        {returnValue}
      </span>
    </div>
  );
}

function WorkflowStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <article
      data-reveal
      className="workflow-step tp-reveal"
      style={workflowStepStyle}
    >
      <span style={workflowNumberStyle}>
        {number}
      </span>

      <h3 style={workflowTitleStyle}>
        {title}
      </h3>

      <p style={workflowTextStyle}>
        {text}
      </p>
    </article>
  );
}

function WorkflowArrow() {
  return (
    <div
      className="workflow-arrow"
      style={workflowArrowStyle}
    >
      →
    </div>
  );
}

const sectionShellStyle = {
  background:
    "linear-gradient(180deg, #050b15 0%, #06101e 55%, #050b15 100%)",
  color: "#f8fafc",
};

const innerStyle = {
  width: "100%",
  maxWidth: 1440,
  margin: "0 auto",
  padding: "0 28px 100px",
};

const featuresSectionStyle = {
  padding: "110px 0 40px",
};

const featuresIntroStyle = {
  maxWidth: 820,
  margin: "0 auto",
  textAlign: "center" as const,
};

const sectionEyebrowStyle = {
  margin: 0,
  color: "#60a5fa",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "0.13em",
};

const sectionTitleStyle = {
  maxWidth: 800,
  margin: "15px auto 0",
  fontSize:
    "clamp(32px, 4vw, 52px)",
  lineHeight: 1.08,
  letterSpacing: "-0.04em",
};

const sectionTextStyle = {
  maxWidth: 680,
  margin: "17px auto 0",
  color: "#7d8999",
  fontSize: 14,
  lineHeight: 1.65,
};

const featureShowcaseGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: 15,
  marginTop: 44,
};

const featureCardStyle = {
  position: "relative" as const,
  minHeight: 500,
  display: "flex",
  flexDirection: "column" as const,
  overflow: "hidden",
  padding: 22,
  borderRadius: 18,
  boxShadow:
    "0 20px 60px rgba(0,0,0,0.18)",
  cursor: "default",
  userSelect: "none" as const,
};

const featureCardTopStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const featureIconStyle = {
  width: 38,
  height: 38,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 10,
  fontSize: 16,
};

const featureEyebrowStyle = {
  color: "#7f8b9b",
  fontSize: 8,
  fontWeight: 900,
  letterSpacing: "0.12em",
};

const featureTitleStyle = {
  maxWidth: 520,
  margin: "18px 0 0",
  fontSize: 24,
  lineHeight: 1.12,
  letterSpacing: "-0.03em",
};

const featureDescriptionStyle = {
  maxWidth: 560,
  margin: "10px 0 0",
  color: "#8490a0",
  fontSize: 12,
  lineHeight: 1.65,
};

const featureDemoWrapStyle = {
  flex: 1,
  marginTop: 20,
};

const featureCtaStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginTop: 18,
  paddingTop: 13,
  borderTop:
    "1px solid rgba(255,255,255,0.06)",
  fontSize: 9,
  fontWeight: 900,
};

const researchDemoStyle = {
  display: "grid",
  gap: 10,
  padding: 15,
  border:
    "1px solid rgba(96,165,250,0.11)",
  borderRadius: 12,
  background:
    "rgba(2,7,19,0.42)",
};

const researchBubbleUserStyle = {
  justifySelf: "end",
  maxWidth: "72%",
  padding: "10px 12px",
  borderRadius:
    "11px 11px 3px 11px",
  background:
    "rgba(37,99,235,0.18)",
  color: "#dbeafe",
  fontSize: 9,
  lineHeight: 1.5,
};

const researchBubbleAiStyle = {
  maxWidth: "84%",
  padding: 13,
  border:
    "1px solid rgba(255,255,255,0.07)",
  borderRadius:
    "11px 11px 11px 3px",
  background:
    "rgba(255,255,255,0.025)",
};

const researchAiHeadingStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  color: "#93c5fd",
  fontSize: 8,
  fontWeight: 900,
};

const researchAiTextStyle = {
  margin: "8px 0 0",
  color: "#9ba7b7",
  fontSize: 9,
  lineHeight: 1.55,
};

const researchTagRowStyle = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap" as const,
  marginTop: 10,
};

const researchTagStyle = {
  padding: "4px 6px",
  border:
    "1px solid rgba(96,165,250,0.12)",
  borderRadius: 999,
  color: "#93c5fd",
  fontSize: 7,
};

const screenerDemoStyle = {
  display: "grid",
  gap: 7,
};

const screenerPromptStyle = {
  padding: "10px 11px",
  border:
    "1px solid rgba(103,232,249,0.12)",
  borderRadius: 9,
  background:
    "rgba(6,182,212,0.04)",
  color: "#b6f4fb",
  fontSize: 8,
  lineHeight: 1.45,
};

const screenerResultStyle = {
  display: "grid",
  gridTemplateColumns:
    "28px 1fr auto",
  gap: 8,
  alignItems: "center",
  padding: "9px 10px",
  border:
    "1px solid rgba(255,255,255,0.06)",
  borderRadius: 8,
  background:
    "rgba(255,255,255,0.02)",
  fontSize: 8,
};

const screenerRankStyle = {
  color: "#556273",
  fontWeight: 900,
};

const screenerScoreStyle = {
  color: "#67e8f9",
  fontSize: 7,
};

const allocationDemoStyle = {
  display: "grid",
  gridTemplateColumns:
    "120px 1fr",
  gap: 16,
  alignItems: "center",
  minHeight: 180,
};

const allocationRingStyle = {
  width: 118,
  height: 118,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  background:
    "conic-gradient(#4ade80 0 42%, #60a5fa 42% 66%, #a78bfa 66% 84%, #334155 84% 100%)",
};

const allocationRingInnerStyle = {
  width: 76,
  height: 76,
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  background: "#0a1422",
};

const allocationRingLabelStyle = {
  color: "#64748b",
  fontSize: 7,
};

const allocationRingValueStyle = {
  marginTop: 3,
  fontSize: 14,
};

const allocationLegendStyle = {
  display: "grid",
  gap: 8,
};

const allocationRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  color: "#a7b1bf",
  fontSize: 8,
};

const allocationRowLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const allocationDotStyle = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "#4ade80",
};

const tradeDemoStyle = {
  padding: 14,
  border:
    "1px solid rgba(167,139,250,0.12)",
  borderRadius: 11,
  background:
    "rgba(124,58,237,0.035)",
};

const tradeTopRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
};

const tradeSymbolStyle = {
  display: "block",
  fontSize: 15,
  fontWeight: 900,
};

const tradeCompanyStyle = {
  display: "block",
  marginTop: 3,
  color: "#727e8e",
  fontSize: 7,
};

const tradePriceStyle = {
  fontSize: 15,
};

const tradeButtonsStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 8,
  marginTop: 18,
};

const buyDemoButtonStyle = {
  padding: "9px 10px",
  borderRadius: 8,
  background:
    "rgba(34,197,94,0.12)",
  color: "#4ade80",
  textAlign: "center" as const,
  fontSize: 8,
  fontWeight: 900,
};

const sellDemoButtonStyle = {
  padding: "9px 10px",
  borderRadius: 8,
  background:
    "rgba(239,68,68,0.1)",
  color: "#ff8a8a",
  textAlign: "center" as const,
  fontSize: 8,
  fontWeight: 900,
};

const tradeAccountStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  marginTop: 12,
  paddingTop: 10,
  borderTop:
    "1px solid rgba(255,255,255,0.06)",
  color: "#7f8b9b",
  fontSize: 7,
};

const alertsDemoStyle = {
  display: "grid",
  gap: 7,
};

const alertDemoRowStyle = {
  display: "grid",
  gridTemplateColumns:
    "34px 1fr auto",
  gap: 9,
  alignItems: "center",
  padding: "9px 10px",
  border:
    "1px solid rgba(255,255,255,0.06)",
  borderRadius: 9,
  background:
    "rgba(255,255,255,0.02)",
};

const alertDemoIconStyle = {
  width: 34,
  height: 34,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 9,
  background:
    "rgba(251,191,36,0.06)",
  fontSize: 13,
};

const alertDemoBodyStyle = {
  minWidth: 0,
};

const alertDemoTitleStyle = {
  display: "block",
  fontSize: 8,
};

const alertDemoTextStyle = {
  display: "block",
  marginTop: 3,
  color: "#7d8999",
  fontSize: 7,
};

const alertDemoTimeStyle = {
  color: "#586474",
  fontSize: 7,
};

const communityDemoStyle = {
  display: "grid",
  gap: 6,
};

const communityDemoRowStyle = {
  display: "grid",
  gridTemplateColumns:
    "25px 30px 1fr auto",
  gap: 8,
  alignItems: "center",
  padding: "8px 9px",
  border:
    "1px solid rgba(255,255,255,0.06)",
  borderRadius: 8,
  background:
    "rgba(255,255,255,0.02)",
};

const communityRankStyle = {
  color: "#64748b",
  fontSize: 7,
  fontWeight: 900,
};

const communityAvatarStyle = {
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  background:
    "rgba(244,114,182,0.08)",
  color: "#f9a8d4",
  fontSize: 8,
  fontWeight: 900,
};

const communityNameStyle = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontSize: 8,
};

const communityReturnStyle = {
  color: "#4ade80",
  fontSize: 8,
  fontWeight: 900,
};

const communityFooterStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  marginTop: 5,
  color: "#7f8b9b",
  fontSize: 7,
};

const workflowSectionStyle = {
  padding: "105px 0 20px",
};

const workflowIntroStyle = {
  maxWidth: 820,
  margin: "0 auto",
  textAlign: "center" as const,
};

const workflowGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "1fr auto 1fr auto 1fr auto 1fr",
  gap: 12,
  alignItems: "center",
  marginTop: 40,
};

const workflowStepStyle = {
  minHeight: 180,
  padding: 18,
  border:
    "1px solid rgba(255,255,255,0.07)",
  borderRadius: 14,
  background:
    "rgba(255,255,255,0.022)",
};

const workflowNumberStyle = {
  color: "#60a5fa",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: "0.1em",
};

const workflowTitleStyle = {
  margin: "16px 0 0",
  fontSize: 20,
};

const workflowTextStyle = {
  margin: "8px 0 0",
  color: "#7d8999",
  fontSize: 10,
  lineHeight: 1.6,
};

const workflowArrowStyle = {
  color: "#45556a",
  fontSize: 20,
  fontWeight: 900,
};