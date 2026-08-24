"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
} from "react";

export default function Hero() {
  const heroRef =
    useRef<HTMLElement | null>(
      null
    );

  const socialMenuRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const [
    socialMenuOpen,
    setSocialMenuOpen,
  ] = useState(false);

  useEffect(() => {
    const node =
      heroRef.current;

    if (!node) {
      return;
    }

    const revealTargets =
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

    revealTargets.forEach(
      (target) =>
        observer.observe(target)
    );

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(
      event: MouseEvent | TouchEvent
    ) {
      const target =
        event.target as Node | null;

      if (
        target &&
        socialMenuRef.current &&
        !socialMenuRef.current.contains(
          target
        )
      ) {
        setSocialMenuOpen(false);
      }
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        setSocialMenuOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown
    );
    document.addEventListener(
      "touchstart",
      handlePointerDown
    );
    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown
      );
      document.removeEventListener(
        "touchstart",
        handlePointerDown
      );
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

  return (
    <section
      ref={heroRef}
      style={shellStyle}
    >
      <div style={backgroundGlowOneStyle} />
      <div style={backgroundGlowTwoStyle} />
      <div style={gridOverlayStyle} />

      <div style={pageContentStyle}>
        <header style={navStyle}>
          <Link
            href="/"
            style={brandStyle}
          >
            <span style={brandMarkStyle}>
              T
            </span>

            <span>
              Norvexa{" "}
              <span style={brandAiStyle}>
                AI
              </span>
            </span>
          </Link>

          <nav
            className="desktop-nav"
            style={navLinksStyle}
          >
            <a
              href="#features"
              style={navLinkStyle}
            >
              Features
            </a>

            <Link
              href="/premium"
              style={navLinkStyle}
            >
              Premium
            </Link>

            <a
              href="#community"
              style={navLinkStyle}
            >
              Community
            </a>

            <a
              href="#how-it-works"
              style={navLinkStyle}
            >
              How it works
            </a>

            <div
              ref={socialMenuRef}
              className="Norvexa-social-menu"
              style={socialMenuWrapStyle}
            >
              <button
                type="button"
                onClick={() =>
                  setSocialMenuOpen(
                    (current) =>
                      !current
                  )
                }
                aria-haspopup="menu"
                aria-expanded={
                  socialMenuOpen
                }
                style={followButtonStyle}
              >
                Follow Us
                <span
                  style={{
                    ...followChevronStyle,
                    transform:
                      socialMenuOpen
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                  }}
                >
                  ▾
                </span>
              </button>

              {socialMenuOpen && (
                <div
                  role="menu"
                  style={socialDropdownStyle}
                >
                  <a
                    role="menuitem"
                    href="https://www.instagram.com/norvexaai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={socialItemStyle}
                    onClick={() =>
                      setSocialMenuOpen(
                        false
                      )
                    }
                  >
                    <span style={socialIconStyle}>
                      ◎
                    </span>
                    <span>
                      Instagram
                    </span>
                    <span style={socialArrowStyle}>
                      ↗
                    </span>
                  </a>

                  <a
                    role="menuitem"
                    href="https://www.tiktok.com/@norvexaai"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={socialItemStyle}
                    onClick={() =>
                      setSocialMenuOpen(
                        false
                      )
                    }
                  >
                    <span style={socialIconStyle}>
                      ♪
                    </span>
                    <span>
                      TikTok
                    </span>
                    <span style={socialArrowStyle}>
                      ↗
                    </span>
                  </a>

                  <a
                    role="menuitem"
                    href="https://x.com/Norvexa_AI"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={socialItemStyle}
                    onClick={() =>
                      setSocialMenuOpen(
                        false
                      )
                    }
                  >
                    <span style={socialIconStyle}>
                      𝕏
                    </span>
                    <span>
                      X / Twitter
                    </span>
                    <span style={socialArrowStyle}>
                      ↗
                    </span>
                  </a>
                </div>
              )}
            </div>
          </nav>

          <div style={navActionsStyle}>
            <Link
              href="/login"
              className="Norvexa-nav-login"
              style={loginButtonStyle}
            >
              Log in
            </Link>

            <Link
              href="/signup"
              style={signupButtonStyle}
            >
              Get started
            </Link>
          </div>
        </header>

        <div
          className="Norvexa-mobile-socials"
          style={mobileSocialRowStyle}
        >
          <span style={mobileSocialLabelStyle}>
            Follow Norvexa
          </span>

          <a
            href="https://www.instagram.com/norvexaai/"
            target="_blank"
            rel="noopener noreferrer"
            style={mobileSocialLinkStyle}
          >
            Instagram
          </a>

          <a
            href="https://www.tiktok.com/@norvexaai"
            target="_blank"
            rel="noopener noreferrer"
            style={mobileSocialLinkStyle}
          >
            TikTok
          </a>

          <a
            href="https://x.com/Norvexa_AI"
            target="_blank"
            rel="noopener noreferrer"
            style={mobileSocialLinkStyle}
          >
            X
          </a>
        </div>

        <section
          className="Norvexa-hero"
          style={heroStyle}
        >
          <div
            data-reveal
            className="tp-reveal tp-reveal-left"
            style={heroCopyStyle}
          >
            <div style={announcementStyle}>
              <span style={announcementDotStyle} />
              AI research, paper trading, analytics & community
              <span style={announcementArrowStyle}>
                →
              </span>
            </div>

            <h1 style={heroTitleStyle}>
              Research smarter.
              <br />
              <span style={heroAccentStyle}>
                Invest with context.
              </span>
            </h1>

            <p style={heroSubtitleStyle}>
              Norvexa brings market research,
              AI-powered analysis, portfolio tools,
              paper trading, alerts, and a social
              investing community into one modern
              workspace.
            </p>

            <div style={heroActionsStyle}>
              <Link
                href="/signup"
                style={primaryCtaStyle}
              >
                Start for free
                <span>→</span>
              </Link>

              <Link
                href="/login"
                style={secondaryCtaStyle}
              >
                Sign in
              </Link>
            </div>

            <div style={trustRowStyle}>
              <TrustItem>
                No brokerage connection required
              </TrustItem>

              <TrustItem>
                Paper trading included
              </TrustItem>

              <TrustItem>
                Free plan available
              </TrustItem>
            </div>
          </div>

          <div
            data-reveal
            className="Norvexa-preview tp-reveal tp-reveal-right"
            style={previewWrapStyle}
          >
            <div style={previewGlowStyle} />

            <div
              className="tp-dashboard-preview"
              style={previewWindowStyle}
            >
              <div style={browserBarStyle}>
                <div style={browserDotsStyle}>
                  <span
                    style={{
                      ...browserDotStyle,
                      background: "#ff6b6b",
                    }}
                  />
                  <span
                    style={{
                      ...browserDotStyle,
                      background: "#fbbf24",
                    }}
                  />
                  <span
                    style={{
                      ...browserDotStyle,
                      background: "#4ade80",
                    }}
                  />
                </div>

                <div style={browserAddressStyle}>
                  Norvexa.ai/dashboard
                </div>

                <span style={secureStyle}>
                  Secure
                </span>
              </div>

              <div style={appPreviewStyle}>
                <aside
                  className="Norvexa-mini-sidebar"
                  style={miniSidebarStyle}
                >
                  <div style={miniBrandStyle}>
                    <span style={miniBrandMarkStyle}>
                      T
                    </span>

                    <span>
                      Norvexa
                    </span>
                  </div>

                  {[
                    ["▦", "Dashboard", true],
                    ["⌁", "Markets", false],
                    ["★", "Watchlist", false],
                    ["◫", "Portfolio", false],
                    ["✦", "AI Research", false],
                    ["◎", "Community", false],
                  ].map(
                    ([icon, label, active]) => (
                      <div
                        key={String(label)}
                        style={{
                          ...miniNavItemStyle,
                          ...(active
                            ? miniNavActiveStyle
                            : {}),
                        }}
                      >
                        <span>
                          {String(icon)}
                        </span>

                        <span>
                          {String(label)}
                        </span>
                      </div>
                    )
                  )}
                </aside>

                <section style={miniMainStyle}>
                  <div style={miniTopRowStyle}>
                    <div>
                      <p style={miniEyebrowStyle}>
                        GOOD AFTERNOON
                      </p>

                      <h2 style={miniHeadingStyle}>
                        Your investing workspace
                      </h2>
                    </div>

                    <div style={miniAvatarStyle}>
                      A
                    </div>
                  </div>

                  <div
                    className="Norvexa-mini-stats"
                    style={miniStatGridStyle}
                  >
                    <MiniStat
                      label="Portfolio value"
                      value="$152,481"
                      note="+2.41% today"
                      positive
                    />

                    <MiniStat
                      label="Buying power"
                      value="$34,280"
                      note="Available"
                    />

                    <MiniStat
                      label="Watchlist"
                      value="18"
                      note="Tracked stocks"
                    />
                  </div>

                  <div
                    className="Norvexa-mini-content"
                    style={miniContentGridStyle}
                  >
                    <article style={miniChartCardStyle}>
                      <div style={miniCardHeaderStyle}>
                        <div>
                          <span style={miniCardLabelStyle}>
                            Portfolio
                          </span>

                          <strong style={miniCardTitleStyle}>
                            Performance
                          </strong>
                        </div>

                        <span style={miniGreenPillStyle}>
                          +8.6%
                        </span>
                      </div>

                      <div style={chartAreaStyle}>
                        <svg
                          viewBox="0 0 500 180"
                          width="100%"
                          height="100%"
                          preserveAspectRatio="none"
                          aria-hidden="true"
                        >
                          <defs>
                            <linearGradient
                              id="landing-chart-fill"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#60a5fa"
                                stopOpacity="0.3"
                              />

                              <stop
                                offset="100%"
                                stopColor="#60a5fa"
                                stopOpacity="0"
                              />
                            </linearGradient>
                          </defs>

                          <path
                            d="M0 142 C42 138,58 120,88 126 C120 134,137 91,170 99 C207 108,219 72,255 81 C291 90,302 57,338 63 C376 70,390 39,421 46 C452 52,469 27,500 22 L500 180 L0 180 Z"
                            fill="url(#landing-chart-fill)"
                          />

                          <path
                            d="M0 142 C42 138,58 120,88 126 C120 134,137 91,170 99 C207 108,219 72,255 81 C291 90,302 57,338 63 C376 70,390 39,421 46 C452 52,469 27,500 22"
                            fill="none"
                            stroke="#60a5fa"
                            strokeWidth="4"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>

                      <div style={chartFooterStyle}>
                        <span>1D</span>
                        <span>1W</span>
                        <span style={chartSelectedStyle}>
                          1M
                        </span>
                        <span>3M</span>
                        <span>1Y</span>
                      </div>
                    </article>

                    <article style={aiCardStyle}>
                      <div style={aiIconStyle}>
                        ✦
                      </div>

                      <span style={miniCardLabelStyle}>
                        Norvexa
                      </span>

                      <strong style={aiCardTitleStyle}>
                        Ask the market.
                      </strong>

                      <p style={aiCardTextStyle}>
                        Research companies,
                        compare stocks, and
                        understand portfolio
                        risk with AI.
                      </p>

                      <div style={aiPromptStyle}>
                        Analyze NVDA
                        <span>↗</span>
                      </div>
                    </article>
                  </div>

                  <div style={tickerStripStyle}>
                    <Ticker
                      symbol="AAPL"
                      value="$229.31"
                      change="+1.28%"
                    />

                    <Ticker
                      symbol="NVDA"
                      value="$183.16"
                      change="+2.04%"
                    />

                    <Ticker
                      symbol="MSFT"
                      value="$524.10"
                      change="+0.76%"
                    />

                    <Ticker
                      symbol="TSLA"
                      value="$341.70"
                      change="-0.43%"
                      negative
                    />
                  </div>
                </section>
              </div>
            </div>

            <div
              className="tp-floating-card-one"
              style={floatingCardOneStyle}
            >
              <span style={floatingIconStyle}>
                ✦
              </span>

              <div>
                <span style={floatingLabelStyle}>
                  AI Research
                </span>

                <strong style={floatingValueStyle}>
                  Ready
                </strong>
              </div>
            </div>

            <div
              className="tp-floating-card-two"
              style={floatingCardTwoStyle}
            >
              <span style={floatingIconStyle}>
                🏆
              </span>

              <div>
                <span style={floatingLabelStyle}>
                  Community
                </span>

                <strong style={floatingValueStyle}>
                  Leaderboards
                </strong>
              </div>
            </div>
          </div>
        </section>

        <section
          data-reveal
          className="Norvexa-proof tp-reveal"
          style={proofStripStyle}
        >
          <span style={proofLeadStyle}>
            ONE PLATFORM FOR
          </span>

          {[
            "AI Research",
            "Paper Trading",
            "Portfolio Analytics",
            "Market Alerts",
            "Community",
          ].map((item) => (
            <span
              key={item}
              style={proofItemStyle}
            >
              <span style={proofCheckStyle}>
                ✓
              </span>

              {item}
            </span>
          ))}
        </section>
      </div>

      <style jsx global>{`
        @keyframes tpFloat {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-7px);
          }
        }

        @keyframes tpPulse {
          0%,
          100% {
            opacity: 0.6;
          }

          50% {
            opacity: 1;
          }
        }


        @keyframes tpDashboardDrift {
          0%,
          100% {
            transform:
              perspective(1600px)
              rotateY(-3deg)
              rotateX(1deg)
              translateY(0);
          }

          50% {
            transform:
              perspective(1600px)
              rotateY(-2deg)
              rotateX(0.6deg)
              translateY(-5px);
          }
        }

        @keyframes tpGlowPulse {
          0%,
          100% {
            opacity: 0.8;
          }

          50% {
            opacity: 1;
          }
        }

        .tp-reveal {
          opacity: 0;
          transform: translateY(22px);
          transition:
            opacity 700ms ease,
            transform 700ms ease;
        }

        .tp-reveal-left {
          transform:
            translateX(-24px)
            translateY(14px);
        }

        .tp-reveal-right {
          transform:
            translateX(24px)
            translateY(14px);
        }

        .tp-reveal.tp-visible {
          opacity: 1;
          transform:
            translateX(0)
            translateY(0);
        }

        .tp-dashboard-preview {
          animation:
            tpDashboardDrift
            7s ease-in-out
            infinite;
          will-change: transform;
        }

        .tp-dashboard-preview:hover {
          animation-play-state:
            paused;
          transform:
            perspective(1600px)
            rotateY(-1deg)
            rotateX(0deg)
            translateY(-4px);
        }

        .tp-floating-card-one,
        .tp-floating-card-two {
          transition:
            transform 220ms ease,
            border-color 220ms ease,
            background 220ms ease;
        }

        .tp-floating-card-one:hover,
        .tp-floating-card-two:hover {
          transform:
            translateY(-4px)
            scale(1.02);
          border-color:
            rgba(96,165,250,0.3) !important;
          background:
            rgba(10,22,40,0.98) !important;
        }

        .Norvexa-proof span {
          transition:
            color 180ms ease,
            transform 180ms ease;
        }

        .Norvexa-proof > span:not(:first-child):hover {
          color: #cbd5e1 !important;
          transform:
            translateY(-1px);
        }

        @media (prefers-reduced-motion: reduce) {
          .tp-reveal,
          .tp-reveal-left,
          .tp-reveal-right,
          .tp-reveal.tp-visible {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }

          .tp-dashboard-preview,
          .tp-floating-card-one,
          .tp-floating-card-two {
            animation: none !important;
            transition: none !important;
          }
        }

        .Norvexa-mobile-socials {
          display: none !important;
        }

        @media (max-width: 1120px) {
          .desktop-nav {
            gap: 20px !important;
          }
        }

        @media (max-width: 980px) {
          .desktop-nav {
            display: none !important;
          }

          .Norvexa-mobile-socials {
            display: flex !important;
          }
        }

        @media (max-width: 860px) {
          .Norvexa-hero {
            grid-template-columns: 1fr !important;
          }

          .Norvexa-preview {
            margin-top: 10px !important;
          }
        }

        @media (max-width: 620px) {
          .Norvexa-nav-login {
            display: none !important;
          }

          .Norvexa-mini-sidebar {
            display: none !important;
          }

          .Norvexa-mini-content {
            grid-template-columns: 1fr !important;
          }

          .Norvexa-mini-stats {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }

          .Norvexa-proof {
            justify-content: flex-start !important;
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

function MiniStat({
  label,
  value,
  note,
  positive = false,
}: {
  label: string;
  value: string;
  note: string;
  positive?: boolean;
}) {
  return (
    <article style={miniStatCardStyle}>
      <span style={miniStatLabelStyle}>
        {label}
      </span>

      <strong style={miniStatValueStyle}>
        {value}
      </strong>

      <span
        style={{
          ...miniStatNoteStyle,
          color: positive
            ? "#4ade80"
            : miniStatNoteStyle.color,
        }}
      >
        {note}
      </span>
    </article>
  );
}

function Ticker({
  symbol,
  value,
  change,
  negative = false,
}: {
  symbol: string;
  value: string;
  change: string;
  negative?: boolean;
}) {
  return (
    <div style={tickerStyle}>
      <strong>
        {symbol}
      </strong>

      <span style={tickerValueStyle}>
        {value}
      </span>

      <span
        style={{
          ...tickerChangeStyle,
          color: negative
            ? "#ff8a8a"
            : "#4ade80",
        }}
      >
        {change}
      </span>
    </div>
  );
}

const shellStyle = {
  position: "relative" as const,
  overflow: "hidden",
  background:
    "linear-gradient(180deg, #020713 0%, #06101e 70%, #050b15 100%)",
  color: "#f8fafc",
};

const pageContentStyle = {
  position: "relative" as const,
  zIndex: 2,
  width: "100%",
  maxWidth: 1440,
  margin: "0 auto",
  padding: "0 28px",
};

const backgroundGlowOneStyle = {
  position: "absolute" as const,
  top: -260,
  left: "4%",
  width: 680,
  height: 680,
  borderRadius: "50%",
  background: "rgba(37,99,235,0.13)",
  filter: "blur(110px)",
};

const backgroundGlowTwoStyle = {
  position: "absolute" as const,
  top: 180,
  right: "-10%",
  width: 720,
  height: 720,
  borderRadius: "50%",
  background: "rgba(14,165,233,0.08)",
  filter: "blur(130px)",
};

const gridOverlayStyle = {
  position: "absolute" as const,
  inset: 0,
  opacity: 0.055,
  backgroundImage:
    "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
  backgroundSize: "56px 56px",
  maskImage:
    "linear-gradient(to bottom, black 0%, transparent 75%)",
};

const navStyle = {
  minHeight: 84,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 22,
  borderBottom:
    "1px solid rgba(255,255,255,0.07)",
};

const brandStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "#f8fafc",
  fontSize: 18,
  fontWeight: 900,
  textDecoration: "none",
  letterSpacing: "-0.02em",
};

const brandMarkStyle = {
  width: 34,
  height: 34,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border:
    "1px solid rgba(96,165,250,0.35)",
  borderRadius: 10,
  background:
    "linear-gradient(145deg, rgba(37,99,235,0.35), rgba(14,165,233,0.12))",
  color: "#bfdbfe",
  boxShadow:
    "0 8px 24px rgba(37,99,235,0.18)",
};

const brandAiStyle = {
  color: "#60a5fa",
};

const navLinksStyle = {
  display: "flex",
  alignItems: "center",
  gap: 30,
};

const navLinkStyle = {
  color: "#9ca3af",
  fontSize: 13,
  fontWeight: 650,
  textDecoration: "none",
};

const socialMenuWrapStyle = {
  position: "relative" as const,
};

const followButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: 0,
  border: "none",
  background: "transparent",
  color: "#9ca3af",
  fontSize: 13,
  fontWeight: 650,
  fontFamily: "inherit",
  cursor: "pointer",
};

const followChevronStyle = {
  display: "inline-block",
  color: "#60a5fa",
  fontSize: 10,
  transition:
    "transform 160ms ease",
};

const socialDropdownStyle = {
  position: "absolute" as const,
  top: "calc(100% + 14px)",
  right: 0,
  zIndex: 50,
  width: 190,
  padding: 8,
  border:
    "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  background:
    "rgba(7,17,31,0.98)",
  boxShadow:
    "0 18px 50px rgba(0,0,0,0.42)",
  backdropFilter: "blur(16px)",
};

const socialItemStyle = {
  display: "grid",
  gridTemplateColumns:
    "24px 1fr auto",
  alignItems: "center",
  gap: 8,
  padding: "10px 10px",
  borderRadius: 9,
  color: "#d1d5db",
  fontSize: 11,
  fontWeight: 750,
  textDecoration: "none",
};

const socialIconStyle = {
  color: "#93c5fd",
  fontSize: 13,
  textAlign: "center" as const,
};

const socialArrowStyle = {
  color: "#64748b",
  fontSize: 10,
};

const mobileSocialRowStyle = {
  display: "none",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap" as const,
  padding: "12px 0 0",
};

const mobileSocialLabelStyle = {
  marginRight: 2,
  color: "#64748b",
  fontSize: 9,
  fontWeight: 850,
  letterSpacing: "0.08em",
  textTransform:
    "uppercase" as const,
};

const mobileSocialLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 9px",
  border:
    "1px solid rgba(96,165,250,0.16)",
  borderRadius: 999,
  background:
    "rgba(37,99,235,0.05)",
  color: "#93c5fd",
  fontSize: 9,
  fontWeight: 800,
  textDecoration: "none",
};

const navActionsStyle = {
  display: "flex",
  alignItems: "center",
  gap: 9,
};

const loginButtonStyle = {
  padding: "10px 14px",
  borderRadius: 10,
  color: "#d1d5db",
  fontSize: 12,
  fontWeight: 750,
  textDecoration: "none",
};

const signupButtonStyle = {
  padding: "10px 15px",
  border:
    "1px solid rgba(96,165,250,0.42)",
  borderRadius: 10,
  background:
    "linear-gradient(135deg, #2563eb, #0284c7)",
  color: "white",
  fontSize: 12,
  fontWeight: 850,
  textDecoration: "none",
  boxShadow:
    "0 10px 30px rgba(37,99,235,0.24)",
};

const heroStyle = {
  display: "grid",
  gridTemplateColumns: "0.9fr 1.15fr",
  gap: 64,
  alignItems: "center",
  minHeight: 720,
  padding: "80px 0 64px",
};

const heroCopyStyle = {
  maxWidth: 620,
};

const announcementStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 9,
  padding: "7px 11px",
  border:
    "1px solid rgba(96,165,250,0.18)",
  borderRadius: 999,
  background: "rgba(37,99,235,0.055)",
  color: "#a7c7ff",
  fontSize: 10,
  fontWeight: 750,
};

const announcementDotStyle = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "#4ade80",
  boxShadow:
    "0 0 12px rgba(74,222,128,0.75)",
  animation:
    "tpPulse 1.8s ease-in-out infinite",
};

const announcementArrowStyle = {
  color: "#60a5fa",
};

const heroTitleStyle = {
  margin: "24px 0 0",
  maxWidth: 760,
  fontSize:
    "clamp(48px, 5.8vw, 82px)",
  lineHeight: 0.98,
  letterSpacing: "-0.055em",
  fontWeight: 900,
};

const heroAccentStyle = {
  background:
    "linear-gradient(90deg, #93c5fd 0%, #60a5fa 40%, #67e8f9 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

const heroSubtitleStyle = {
  maxWidth: 610,
  margin: "24px 0 0",
  color: "#9ca3af",
  fontSize: 17,
  lineHeight: 1.7,
};

const heroActionsStyle = {
  display: "flex",
  alignItems: "center",
  gap: 11,
  flexWrap: "wrap" as const,
  marginTop: 30,
};

const primaryCtaStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 14,
  padding: "14px 18px",
  borderRadius: 11,
  background:
    "linear-gradient(135deg, #2563eb, #0284c7)",
  color: "white",
  fontSize: 13,
  fontWeight: 900,
  textDecoration: "none",
  boxShadow:
    "0 16px 44px rgba(37,99,235,0.3)",
};

const secondaryCtaStyle = {
  padding: "14px 18px",
  border:
    "1px solid rgba(255,255,255,0.11)",
  borderRadius: 11,
  background: "rgba(255,255,255,0.025)",
  color: "#d1d5db",
  fontSize: 13,
  fontWeight: 800,
  textDecoration: "none",
};

const trustRowStyle = {
  display: "flex",
  gap: 15,
  flexWrap: "wrap" as const,
  marginTop: 24,
};

const trustItemStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  color: "#7f8b9b",
  fontSize: 9,
};

const trustCheckStyle = {
  color: "#4ade80",
  fontWeight: 900,
};

const previewWrapStyle = {
  position: "relative" as const,
  width: "100%",
};

const previewGlowStyle = {
  position: "absolute" as const,
  inset: "10% 8%",
  borderRadius: 40,
  background: "rgba(37,99,235,0.2)",
  filter: "blur(70px)",
};

const previewWindowStyle = {
  position: "relative" as const,
  overflow: "hidden",
  border:
    "1px solid rgba(255,255,255,0.12)",
  borderRadius: 20,
  background: "rgba(7,17,31,0.94)",
  boxShadow:
    "0 40px 120px rgba(0,0,0,0.5)",
  transform:
    "perspective(1600px) rotateY(-3deg) rotateX(1deg)",
};

const browserBarStyle = {
  height: 46,
  display: "grid",
  gridTemplateColumns: "90px 1fr 90px",
  alignItems: "center",
  gap: 10,
  padding: "0 14px",
  borderBottom:
    "1px solid rgba(255,255,255,0.07)",
  background: "rgba(255,255,255,0.025)",
};

const browserDotsStyle = {
  display: "flex",
  gap: 6,
};

const browserDotStyle = {
  width: 8,
  height: 8,
  borderRadius: "50%",
};

const browserAddressStyle = {
  justifySelf: "center",
  width: "min(340px, 100%)",
  padding: "6px 12px",
  border:
    "1px solid rgba(255,255,255,0.06)",
  borderRadius: 8,
  background: "rgba(0,0,0,0.18)",
  color: "#6b7280",
  textAlign: "center" as const,
  fontSize: 8,
};

const secureStyle = {
  justifySelf: "end",
  color: "#4ade80",
  fontSize: 8,
  fontWeight: 800,
};

const appPreviewStyle = {
  minHeight: 515,
  display: "grid",
  gridTemplateColumns: "145px 1fr",
};

const miniSidebarStyle = {
  padding: "16px 10px",
  borderRight:
    "1px solid rgba(255,255,255,0.06)",
  background: "rgba(2,7,19,0.56)",
};

const miniBrandStyle = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  padding: "0 6px 15px",
  fontSize: 9,
  fontWeight: 850,
};

const miniBrandMarkStyle = {
  width: 23,
  height: 23,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 7,
  background: "rgba(37,99,235,0.18)",
  color: "#93c5fd",
};

const miniNavItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 4,
  padding: "8px 8px",
  borderRadius: 7,
  color: "#778292",
  fontSize: 8,
};

const miniNavActiveStyle = {
  background: "rgba(37,99,235,0.1)",
  color: "#bfdbfe",
};

const miniMainStyle = {
  padding: 20,
};

const miniTopRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const miniEyebrowStyle = {
  margin: 0,
  color: "#60a5fa",
  fontSize: 7,
  fontWeight: 900,
  letterSpacing: "0.11em",
};

const miniHeadingStyle = {
  margin: "5px 0 0",
  fontSize: 17,
};

const miniAvatarStyle = {
  width: 31,
  height: 31,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border:
    "1px solid rgba(255,255,255,0.1)",
  borderRadius: "50%",
  background: "rgba(255,255,255,0.05)",
  color: "#bfdbfe",
  fontSize: 9,
  fontWeight: 900,
};

const miniStatGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: 8,
  marginTop: 16,
};

const miniStatCardStyle = {
  padding: 11,
  border:
    "1px solid rgba(255,255,255,0.07)",
  borderRadius: 9,
  background: "rgba(255,255,255,0.025)",
};

const miniStatLabelStyle = {
  display: "block",
  color: "#697586",
  fontSize: 7,
};

const miniStatValueStyle = {
  display: "block",
  marginTop: 5,
  fontSize: 14,
};

const miniStatNoteStyle = {
  display: "block",
  marginTop: 3,
  color: "#788494",
  fontSize: 7,
};

const miniContentGridStyle = {
  display: "grid",
  gridTemplateColumns: "1.55fr 0.8fr",
  gap: 9,
  marginTop: 9,
};

const miniChartCardStyle = {
  minHeight: 260,
  padding: 13,
  border:
    "1px solid rgba(255,255,255,0.07)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.025)",
};

const miniCardHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
};

const miniCardLabelStyle = {
  display: "block",
  color: "#697586",
  fontSize: 7,
  fontWeight: 800,
};

const miniCardTitleStyle = {
  display: "block",
  marginTop: 4,
  fontSize: 11,
};

const miniGreenPillStyle = {
  padding: "4px 6px",
  borderRadius: 999,
  background: "rgba(34,197,94,0.08)",
  color: "#4ade80",
  fontSize: 7,
  fontWeight: 850,
};

const chartAreaStyle = {
  height: 168,
  marginTop: 12,
};

const chartFooterStyle = {
  display: "flex",
  gap: 13,
  color: "#586474",
  fontSize: 7,
};

const chartSelectedStyle = {
  color: "#93c5fd",
  fontWeight: 900,
};

const aiCardStyle = {
  minHeight: 260,
  padding: 14,
  border:
    "1px solid rgba(96,165,250,0.12)",
  borderRadius: 10,
  background:
    "linear-gradient(145deg, rgba(37,99,235,0.07), rgba(255,255,255,0.02))",
};

const aiIconStyle = {
  width: 31,
  height: 31,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 17,
  borderRadius: 9,
  background: "rgba(37,99,235,0.13)",
  color: "#93c5fd",
};

const aiCardTitleStyle = {
  display: "block",
  marginTop: 7,
  fontSize: 15,
};

const aiCardTextStyle = {
  margin: "9px 0 0",
  color: "#7c8796",
  fontSize: 8,
  lineHeight: 1.55,
};

const aiPromptStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  marginTop: 19,
  padding: "9px 10px",
  border:
    "1px solid rgba(96,165,250,0.14)",
  borderRadius: 8,
  background: "rgba(37,99,235,0.065)",
  color: "#bfdbfe",
  fontSize: 8,
  fontWeight: 800,
};

const tickerStripStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: 6,
  marginTop: 9,
};

const tickerStyle = {
  padding: "8px 9px",
  border:
    "1px solid rgba(255,255,255,0.055)",
  borderRadius: 8,
  background: "rgba(255,255,255,0.018)",
  fontSize: 7,
};

const tickerValueStyle = {
  display: "block",
  marginTop: 4,
  color: "#a9b3c0",
};

const tickerChangeStyle = {
  display: "block",
  marginTop: 2,
};

const floatingCardOneStyle = {
  position: "absolute" as const,
  top: -25,
  right: -18,
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "10px 12px",
  border:
    "1px solid rgba(96,165,250,0.18)",
  borderRadius: 11,
  background: "rgba(8,18,32,0.94)",
  boxShadow:
    "0 18px 45px rgba(0,0,0,0.3)",
  animation:
    "tpFloat 4s ease-in-out infinite",
};

const floatingCardTwoStyle = {
  ...floatingCardOneStyle,
  top: "auto",
  right: "auto",
  left: -28,
  bottom: 28,
  animationDelay: "1.2s",
};

const floatingIconStyle = {
  width: 27,
  height: 27,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  background: "rgba(37,99,235,0.1)",
  fontSize: 12,
};

const floatingLabelStyle = {
  display: "block",
  color: "#6b7280",
  fontSize: 7,
};

const floatingValueStyle = {
  display: "block",
  marginTop: 2,
  fontSize: 9,
};

const proofStripStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 25,
  flexWrap: "wrap" as const,
  padding: "19px 22px",
  borderTop:
    "1px solid rgba(255,255,255,0.065)",
  borderBottom:
    "1px solid rgba(255,255,255,0.065)",
  color: "#8b96a6",
};

const proofLeadStyle = {
  color: "#536072",
  fontSize: 8,
  fontWeight: 900,
  letterSpacing: "0.13em",
};

const proofItemStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 9,
  fontWeight: 700,
};

const proofCheckStyle = {
  color: "#60a5fa",
};