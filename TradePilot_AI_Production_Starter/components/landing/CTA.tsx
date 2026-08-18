"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
} from "react";

export default function CTA() {
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
          threshold: 0.15,
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
      style={sectionStyle}
    >
      <div style={innerStyle}>
        <div
          data-reveal
          className="cta-panel tp-reveal"
          style={panelStyle}
        >
          <div
            className="cta-glow-one"
            style={glowOneStyle}
          />
          <div
            className="cta-glow-two"
            style={glowTwoStyle}
          />

          <div style={contentStyle}>
            <p style={eyebrowStyle}>
              READY WHEN YOU ARE
            </p>

            <h2 style={titleStyle}>
              Start researching smarter.
              <br />
              Build your process with Norvexa.
            </h2>

            <p style={subtitleStyle}>
              Create a free account to start paper trading,
              tracking your portfolio, exploring the community,
              and learning your way around the platform.
            </p>

            <div style={buttonRowStyle}>
              <Link
                href="/signup"
                style={primaryButtonStyle}
              >
                Create free account
                <span>→</span>
              </Link>

              <Link
                href="/premium"
                style={premiumButtonStyle}
              >
                ⭐ View Premium
              </Link>
            </div>

            <div style={trustRowStyle}>
              <TrustItem>
                Free plan available
              </TrustItem>

              <TrustItem>
                Paper trading included
              </TrustItem>

              <TrustItem>
                Upgrade anytime
              </TrustItem>
            </div>
          </div>

          <div
            className="cta-preview-grid"
            style={previewGridStyle}
          >
            <MiniCard
              icon="✦"
              title="Research"
              text="Ask better questions."
            />

            <MiniCard
              icon="↗"
              title="Paper Trade"
              text="Test ideas safely."
            />

            <MiniCard
              icon="◔"
              title="Analyze"
              text="Understand your portfolio."
            />

            <MiniCard
              icon="🏆"
              title="Compete"
              text="Track your progress."
            />
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes ctaGlowOneMove {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(28px, 16px, 0);
          }
        }

        @keyframes ctaGlowTwoMove {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(-24px, -14px, 0);
          }
        }

        .tp-reveal {
          opacity: 0;
          transform: translateY(22px);
          transition:
            opacity 700ms ease,
            transform 700ms ease;
        }

        .tp-reveal.tp-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .cta-panel {
          transition:
            transform 260ms ease,
            box-shadow 260ms ease,
            border-color 260ms ease;
        }

        .cta-panel:hover {
          transform: translateY(-4px);
          box-shadow:
            0 42px 125px rgba(0,0,0,0.34);
          border-color:
            rgba(96,165,250,0.24) !important;
        }

        .cta-glow-one {
          animation:
            ctaGlowOneMove
            8s ease-in-out
            infinite;
        }

        .cta-glow-two {
          animation:
            ctaGlowTwoMove
            10s ease-in-out
            infinite;
        }

        .cta-mini-card {
          transition:
            transform 220ms ease,
            background 220ms ease,
            border-color 220ms ease;
        }

        .cta-mini-card:hover {
          transform: translateY(-4px);
          background:
            rgba(2,7,19,0.46) !important;
          border-color:
            rgba(96,165,250,0.14) !important;
        }

        @media (prefers-reduced-motion: reduce) {
          .tp-reveal,
          .tp-reveal.tp-visible,
          .cta-panel,
          .cta-glow-one,
          .cta-glow-two,
          .cta-mini-card {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
            animation: none !important;
          }
        }

        @media (max-width: 760px) {
          .cta-preview-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 480px) {
          .cta-preview-grid {
            grid-template-columns:
              1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

function TrustItem({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span style={trustItemStyle}>
      <span style={trustCheckStyle}>
        ✓
      </span>

      {children}
    </span>
  );
}

function MiniCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div
      className="cta-mini-card"
      style={miniCardStyle}
    >
      <div style={miniIconStyle}>
        {icon}
      </div>

      <strong style={miniTitleStyle}>
        {title}
      </strong>

      <span style={miniTextStyle}>
        {text}
      </span>
    </div>
  );
}

const sectionStyle = {
  background:
    "linear-gradient(180deg, #050b15 0%, #020713 100%)",
  color: "#f8fafc",
};

const innerStyle = {
  width: "100%",
  maxWidth: 1440,
  margin: "0 auto",
  padding: "40px 28px 110px",
};

const panelStyle = {
  position: "relative" as const,
  overflow: "hidden",
  padding: "70px 28px 34px",
  border:
    "1px solid rgba(96,165,250,0.16)",
  borderRadius: 24,
  background:
    "linear-gradient(145deg, rgba(37,99,235,0.10), rgba(14,165,233,0.05), rgba(255,255,255,0.025))",
  boxShadow:
    "0 35px 110px rgba(0,0,0,0.28)",
};

const glowOneStyle = {
  position: "absolute" as const,
  top: -130,
  left: "8%",
  width: 360,
  height: 360,
  borderRadius: "50%",
  background:
    "rgba(37,99,235,0.16)",
  filter: "blur(90px)",
};

const glowTwoStyle = {
  position: "absolute" as const,
  right: "4%",
  bottom: -150,
  width: 420,
  height: 420,
  borderRadius: "50%",
  background:
    "rgba(14,165,233,0.10)",
  filter: "blur(100px)",
};

const contentStyle = {
  position: "relative" as const,
  zIndex: 2,
  maxWidth: 840,
  margin: "0 auto",
  textAlign: "center" as const,
};

const eyebrowStyle = {
  margin: 0,
  color: "#60a5fa",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "0.14em",
};

const titleStyle = {
  margin: "16px auto 0",
  maxWidth: 900,
  fontSize:
    "clamp(36px, 5vw, 64px)",
  lineHeight: 1.04,
  letterSpacing: "-0.05em",
};

const subtitleStyle = {
  maxWidth: 680,
  margin: "20px auto 0",
  color: "#93a0b0",
  fontSize: 14,
  lineHeight: 1.7,
};

const buttonRowStyle = {
  display: "flex",
  justifyContent: "center",
  gap: 11,
  flexWrap: "wrap" as const,
  marginTop: 30,
};

const primaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 13,
  padding: "14px 18px",
  borderRadius: 11,
  background:
    "linear-gradient(135deg, #2563eb, #0284c7)",
  color: "white",
  fontSize: 12,
  fontWeight: 900,
  textDecoration: "none",
  boxShadow:
    "0 16px 42px rgba(37,99,235,0.28)",
};

const premiumButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "14px 18px",
  border:
    "1px solid rgba(251,191,36,0.18)",
  borderRadius: 11,
  background:
    "rgba(245,158,11,0.05)",
  color: "#fbbf24",
  fontSize: 12,
  fontWeight: 850,
  textDecoration: "none",
};

const trustRowStyle = {
  display: "flex",
  justifyContent: "center",
  gap: 16,
  flexWrap: "wrap" as const,
  marginTop: 22,
};

const trustItemStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  color: "#748092",
  fontSize: 8,
};

const trustCheckStyle = {
  color: "#4ade80",
  fontWeight: 900,
};

const previewGridStyle = {
  position: "relative" as const,
  zIndex: 2,
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: 9,
  maxWidth: 900,
  margin: "42px auto 0",
};

const miniCardStyle = {
  padding: 14,
  border:
    "1px solid rgba(255,255,255,0.07)",
  borderRadius: 12,
  background:
    "rgba(2,7,19,0.35)",
};

const miniIconStyle = {
  width: 34,
  height: 34,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto",
  borderRadius: 9,
  background:
    "rgba(37,99,235,0.08)",
  color: "#93c5fd",
  fontSize: 13,
};

const miniTitleStyle = {
  display: "block",
  marginTop: 10,
  textAlign: "center" as const,
  fontSize: 9,
};

const miniTextStyle = {
  display: "block",
  marginTop: 4,
  color: "#697586",
  textAlign: "center" as const,
  fontSize: 7,
  lineHeight: 1.4,
};