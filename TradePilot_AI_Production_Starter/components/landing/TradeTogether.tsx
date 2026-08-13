"use client";

import {
  useEffect,
  useRef,
} from "react";

export default function TradeTogether() {
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
      id="community"
      style={sectionStyle}
    >
      <div style={innerStyle}>
        <div
          data-reveal
          className="tp-reveal"
          style={introStyle}
        >
          <p style={eyebrowStyle}>
            TRADE TOGETHER
          </p>

          <h2 style={titleStyle}>
            Learn from traders.
            <br />
            Build your investing reputation.
          </h2>

          <p style={subtitleStyle}>
            Follow public paper traders, compare performance,
            earn achievements, and see how your investing process
            stacks up across the TradePilot community.
          </p>
        </div>

        <div
          className="trade-together-grid"
          style={gridStyle}
        >
          <article
            data-reveal
            className="community-showcase-card tp-reveal"
            style={featuredCardStyle}
          >
            <div style={cardHeaderStyle}>
              <div>
                <p style={cardEyebrowStyle}>
                  FEATURED TRADER
                </p>

                <h3 style={cardTitleStyle}>
                  Public profile preview
                </h3>
              </div>

              <span style={previewBadgeStyle}>
                Preview
              </span>
            </div>

            <div style={profileHeroStyle}>
              <div style={avatarStyle}>
                M
              </div>

              <div style={{ minWidth: 0 }}>
                <strong style={profileNameStyle}>
                  @marketmind
                </strong>

                <span style={profileMetaStyle}>
                  Long-term growth · Public trader
                </span>
              </div>
            </div>

            <div style={profileStatsStyle}>
              <Stat
                label="Return"
                value="+18.4%"
                positive
              />

              <Stat
                label="Followers"
                value="143"
              />

              <Stat
                label="Badges"
                value="12"
              />
            </div>

            <div style={badgeRowStyle}>
              <span style={miniBadgeStyle}>
                🏆 Top 10
              </span>

              <span style={miniBadgeStyle}>
                ✓ First Trade
              </span>

              <span style={miniBadgeStyle}>
                📊 Diversified
              </span>
            </div>

            <div style={profileFooterStyle}>
              <span>
                Public portfolio
              </span>

              <span>
                Follow system enabled
              </span>
            </div>
          </article>

          <article
            data-reveal
            className="community-showcase-card tp-reveal"
            style={leaderboardCardStyle}
          >
            <div style={cardHeaderStyle}>
              <div>
                <p style={cardEyebrowStyle}>
                  LEADERBOARDS
                </p>

                <h3 style={cardTitleStyle}>
                  Compare paper-trading performance.
                </h3>
              </div>

              <span style={trophyStyle}>
                🏆
              </span>
            </div>

            <div style={leaderboardListStyle}>
              <LeaderboardRow
                rank="1"
                name="marketmind"
                returnValue="+18.4%"
              />

              <LeaderboardRow
                rank="2"
                name="valueview"
                returnValue="+15.7%"
              />

              <LeaderboardRow
                rank="3"
                name="longtermleo"
                returnValue="+13.2%"
              />

              <LeaderboardRow
                rank="4"
                name="compoundclub"
                returnValue="+11.6%"
              />
            </div>

            <div style={leaderboardFooterStyle}>
              Weekly · Monthly · All Time
            </div>
          </article>

          <article
            data-reveal
            className="community-showcase-card tp-reveal"
            style={achievementCardStyle}
          >
            <div style={cardHeaderStyle}>
              <div>
                <p style={cardEyebrowStyle}>
                  ACHIEVEMENTS
                </p>

                <h3 style={cardTitleStyle}>
                  Progress that feels visible.
                </h3>
              </div>

              <span style={achievementIconStyle}>
                ✦
              </span>
            </div>

            <div style={achievementListStyle}>
              <AchievementRow
                icon="✓"
                title="First Trade"
                text="Complete your first paper trade."
                earned
              />

              <AchievementRow
                icon="📊"
                title="Diversified"
                text="Build a broader paper portfolio."
                earned
              />

              <AchievementRow
                icon="✦"
                title="AI Researcher"
                text="Use advanced research tools."
              />

              <AchievementRow
                icon="🏆"
                title="Top 10"
                text="Reach the community leaderboard."
              />
            </div>
          </article>
        </div>

        <div
          data-reveal
          className="tp-reveal"
          style={benefitStripStyle}
        >
          <Benefit
            icon="👤"
            title="Public profiles"
            text="Share a profile built around paper-trading activity."
          />

          <Benefit
            icon="＋"
            title="Follow traders"
            text="Build a one-way following network around public users."
          />

          <Benefit
            icon="🏆"
            title="Compete"
            text="Compare weekly, monthly, and all-time performance."
          />

          <Benefit
            icon="🎖"
            title="Earn badges"
            text="Turn progress into visible achievements."
          />

          <Benefit
            icon="↗"
            title="Share"
            text="Share public profiles with a simple profile link."
          />
        </div>
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

        .community-showcase-card {
          transition:
            transform 220ms ease,
            box-shadow 220ms ease,
            border-color 220ms ease;
        }

        .community-showcase-card:hover {
          transform: translateY(-6px);
          box-shadow:
            0 30px 85px rgba(0,0,0,0.24);
        }

        .trade-together-grid
        > .community-showcase-card:nth-child(1) {
          transition-delay: 50ms;
        }

        .trade-together-grid
        > .community-showcase-card:nth-child(2) {
          transition-delay: 120ms;
        }

        .trade-together-grid
        > .community-showcase-card:nth-child(3) {
          transition-delay: 190ms;
        }

        @media (prefers-reduced-motion: reduce) {
          .tp-reveal,
          .tp-reveal.tp-visible,
          .community-showcase-card {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
        }

        @media (max-width: 980px) {
          .trade-together-grid {
            grid-template-columns:
              1fr 1fr !important;
          }
        }

        @media (max-width: 680px) {
          .trade-together-grid {
            grid-template-columns:
              1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

function Stat({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div style={statStyle}>
      <span style={statLabelStyle}>
        {label}
      </span>

      <strong
        style={{
          ...statValueStyle,
          color: positive
            ? "#4ade80"
            : "#f8fafc",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function LeaderboardRow({
  rank,
  name,
  returnValue,
}: {
  rank: string;
  name: string;
  returnValue: string;
}) {
  return (
    <div style={leaderboardRowStyle}>
      <span style={rankStyle}>
        #{rank}
      </span>

      <div style={smallAvatarStyle}>
        {name
          .charAt(0)
          .toUpperCase()}
      </div>

      <strong style={leaderboardNameStyle}>
        @{name}
      </strong>

      <span style={returnStyle}>
        {returnValue}
      </span>
    </div>
  );
}

function AchievementRow({
  icon,
  title,
  text,
  earned = false,
}: {
  icon: string;
  title: string;
  text: string;
  earned?: boolean;
}) {
  return (
    <div
      style={{
        ...achievementRowStyle,
        opacity: earned
          ? 1
          : 0.72,
      }}
    >
      <div
        style={{
          ...achievementSmallIconStyle,
          color: earned
            ? "#4ade80"
            : "#93c5fd",
        }}
      >
        {icon}
      </div>

      <div>
        <strong style={achievementTitleStyle}>
          {title}
        </strong>

        <span style={achievementTextStyle}>
          {text}
        </span>
      </div>

      <span
        style={{
          ...achievementStatusStyle,
          color: earned
            ? "#4ade80"
            : "#64748b",
        }}
      >
        {earned
          ? "Earned"
          : "Locked"}
      </span>
    </div>
  );
}

function Benefit({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div style={benefitStyle}>
      <div style={benefitIconStyle}>
        {icon}
      </div>

      <strong style={benefitTitleStyle}>
        {title}
      </strong>

      <span style={benefitTextStyle}>
        {text}
      </span>
    </div>
  );
}

const sectionStyle = {
  background:
    "linear-gradient(180deg, #050b15 0%, #06101e 48%, #07111f 100%)",
  color: "#f8fafc",
};

const innerStyle = {
  width: "100%",
  maxWidth: 1440,
  margin: "0 auto",
  padding: "105px 28px 110px",
};

const introStyle = {
  maxWidth: 820,
  margin: "0 auto",
  textAlign: "center" as const,
};

const eyebrowStyle = {
  margin: 0,
  color: "#f9a8d4",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "0.14em",
};

const titleStyle = {
  margin: "15px auto 0",
  maxWidth: 830,
  fontSize:
    "clamp(34px, 4.4vw, 58px)",
  lineHeight: 1.05,
  letterSpacing: "-0.045em",
};

const subtitleStyle = {
  maxWidth: 700,
  margin: "18px auto 0",
  color: "#8490a0",
  fontSize: 14,
  lineHeight: 1.7,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns:
    "1.1fr 1fr 1fr",
  gap: 15,
  marginTop: 46,
};

const cardBaseStyle = {
  minHeight: 460,
  padding: 21,
  borderRadius: 17,
  boxShadow:
    "0 24px 70px rgba(0,0,0,0.18)",
};

const featuredCardStyle = {
  ...cardBaseStyle,
  border:
    "1px solid rgba(244,114,182,0.16)",
  background:
    "linear-gradient(145deg, rgba(219,39,119,0.07), rgba(255,255,255,0.025))",
};

const leaderboardCardStyle = {
  ...cardBaseStyle,
  border:
    "1px solid rgba(251,191,36,0.16)",
  background:
    "linear-gradient(145deg, rgba(245,158,11,0.055), rgba(255,255,255,0.025))",
};

const achievementCardStyle = {
  ...cardBaseStyle,
  border:
    "1px solid rgba(96,165,250,0.16)",
  background:
    "linear-gradient(145deg, rgba(37,99,235,0.06), rgba(255,255,255,0.025))",
};

const cardHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
};

const cardEyebrowStyle = {
  margin: 0,
  color: "#738095",
  fontSize: 8,
  fontWeight: 900,
  letterSpacing: "0.12em",
};

const cardTitleStyle = {
  margin: "6px 0 0",
  fontSize: 19,
  lineHeight: 1.2,
};

const previewBadgeStyle = {
  padding: "6px 8px",
  border:
    "1px solid rgba(244,114,182,0.18)",
  borderRadius: 999,
  background:
    "rgba(219,39,119,0.06)",
  color: "#f9a8d4",
  fontSize: 7,
  fontWeight: 900,
};

const trophyStyle = {
  fontSize: 20,
};

const achievementIconStyle = {
  width: 35,
  height: 35,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 10,
  background:
    "rgba(37,99,235,0.08)",
  color: "#93c5fd",
};

const profileHeroStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginTop: 26,
};

const avatarStyle = {
  width: 58,
  height: 58,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border:
    "1px solid rgba(244,114,182,0.18)",
  borderRadius: "50%",
  background:
    "rgba(219,39,119,0.07)",
  color: "#f9a8d4",
  fontSize: 20,
  fontWeight: 900,
};

const profileNameStyle = {
  display: "block",
  fontSize: 17,
};

const profileMetaStyle = {
  display: "block",
  marginTop: 4,
  color: "#748092",
  fontSize: 8,
};

const profileStatsStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0,1fr))",
  gap: 8,
  marginTop: 22,
};

const statStyle = {
  padding: 11,
  border:
    "1px solid rgba(255,255,255,0.06)",
  borderRadius: 9,
  background:
    "rgba(255,255,255,0.02)",
};

const statLabelStyle = {
  display: "block",
  color: "#64748b",
  fontSize: 7,
};

const statValueStyle = {
  display: "block",
  marginTop: 4,
  fontSize: 15,
};

const badgeRowStyle = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 7,
  marginTop: 18,
};

const miniBadgeStyle = {
  padding: "6px 8px",
  border:
    "1px solid rgba(255,255,255,0.06)",
  borderRadius: 999,
  background:
    "rgba(255,255,255,0.022)",
  color: "#aab4c1",
  fontSize: 7,
  fontWeight: 800,
};

const profileFooterStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  marginTop: 23,
  paddingTop: 15,
  borderTop:
    "1px solid rgba(255,255,255,0.06)",
  color: "#64748b",
  fontSize: 7,
};

const leaderboardListStyle = {
  display: "grid",
  gap: 7,
  marginTop: 25,
};

const leaderboardRowStyle = {
  display: "grid",
  gridTemplateColumns:
    "28px 32px 1fr auto",
  gap: 8,
  alignItems: "center",
  padding: "9px 10px",
  border:
    "1px solid rgba(255,255,255,0.06)",
  borderRadius: 9,
  background:
    "rgba(255,255,255,0.02)",
};

const rankStyle = {
  color: "#7a8494",
  fontSize: 8,
  fontWeight: 900,
};

const smallAvatarStyle = {
  width: 30,
  height: 30,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  background:
    "rgba(251,191,36,0.06)",
  color: "#fbbf24",
  fontSize: 8,
  fontWeight: 900,
};

const leaderboardNameStyle = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontSize: 8,
};

const returnStyle = {
  color: "#4ade80",
  fontSize: 8,
  fontWeight: 900,
};

const leaderboardFooterStyle = {
  marginTop: 16,
  paddingTop: 14,
  borderTop:
    "1px solid rgba(255,255,255,0.06)",
  color: "#64748b",
  fontSize: 7,
  textAlign: "center" as const,
};

const achievementListStyle = {
  display: "grid",
  gap: 8,
  marginTop: 24,
};

const achievementRowStyle = {
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

const achievementSmallIconStyle = {
  width: 32,
  height: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 9,
  background:
    "rgba(37,99,235,0.05)",
  fontSize: 11,
  fontWeight: 900,
};

const achievementTitleStyle = {
  display: "block",
  fontSize: 8,
};

const achievementTextStyle = {
  display: "block",
  marginTop: 3,
  color: "#748092",
  fontSize: 7,
  lineHeight: 1.35,
};

const achievementStatusStyle = {
  fontSize: 7,
  fontWeight: 900,
};

const benefitStripStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 10,
  marginTop: 17,
};

const benefitStyle = {
  padding: 14,
  border:
    "1px solid rgba(255,255,255,0.06)",
  borderRadius: 12,
  background:
    "rgba(255,255,255,0.018)",
};

const benefitIconStyle = {
  width: 32,
  height: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 9,
  background:
    "rgba(255,255,255,0.03)",
  fontSize: 13,
};

const benefitTitleStyle = {
  display: "block",
  marginTop: 11,
  fontSize: 10,
};

const benefitTextStyle = {
  display: "block",
  marginTop: 5,
  color: "#6f7b8c",
  fontSize: 8,
  lineHeight: 1.45,
};