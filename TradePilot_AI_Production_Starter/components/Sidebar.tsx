"use client";

import {
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type NavItem = {
  label: string;
  icon: string;
  href: string;
  matchPath?: string;
  externalAnchor?: boolean;
};

const MARKET_ITEMS: NavItem[] = [
  {
    label: "Markets",
    icon: "🌎",
    href: "/markets",
  },
  {
    label: "Earnings",
    icon: "📅",
    href: "/earnings",
  },
  {
    label: "Compare",
    icon: "⚖️",
    href: "/compare",
  },
  {
    label: "Watchlist",
    icon: "⭐",
    href: "/watchlist",
  },
];

const AI_ITEMS: NavItem[] = [
  {
    label: "AI Research",
    icon: "🤖",
    href: "/research",
  },
  {
    label: "AI Screener",
    icon: "🔎",
    href: "/screener",
  },
  {
    label: "Analytics",
    icon: "📈",
    href: "/analytics",
  },
];

const PORTFOLIO_COMMUNITY_ITEMS: NavItem[] = [
  {
    label: "Portfolio",
    icon: "💼",
    href: "/dashboard#portfolio",
    matchPath: "/dashboard",
    externalAnchor: true,
  },
  {
    label: "Activity",
    icon: "📜",
    href: "/activity",
  },
  {
    label: "Community",
    icon: "👥",
    href: "/community",
  },
];

export default function Sidebar() {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const [
    collapsed,
    setCollapsed,
  ] = useState(false);

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.overflow = "";
      return;
    }

    const media =
      window.matchMedia(
        "(max-width: 900px)"
      );

    if (media.matches) {
      document.body.style.overflow =
        "hidden";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  async function signOut() {
    const url =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const key =
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return;
    }

    const supabase =
      createBrowserClient(
        url,
        key
      );

    await supabase.auth
      .signOut();

    setMobileOpen(false);

    router.replace("/");
    router.refresh();
  }

  const isActive = (
    path: string
  ) =>
    pathname === path ||
    pathname.startsWith(
      path + "/"
    );

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="mobile-sidebar-toggle"
        onClick={() =>
          setMobileOpen(
            (current) => !current
          )
        }
        aria-label={
          mobileOpen
            ? "Close navigation"
            : "Open navigation"
        }
        aria-expanded={mobileOpen}
      >
        <span style={mobileMenuLineStyle} />
        <span style={mobileMenuLineStyle} />
        <span style={mobileMenuLineStyle} />
      </button>

      <button
        type="button"
        className={`mobile-sidebar-overlay ${
          mobileOpen
            ? "mobile-sidebar-overlay-open"
            : ""
        }`}
        onClick={closeMobileMenu}
        aria-label="Close navigation"
        tabIndex={
          mobileOpen ? 0 : -1
        }
      />

      <aside
        className={`sidebar ${
          mobileOpen
            ? "mobile-sidebar-open"
            : ""
        }`}
        style={{
          ...sidebarStyle,
          width: collapsed
            ? 78
            : 244,
        }}
      >
        <div style={topStyle}>
          <div
            style={{
              ...brandWrapStyle,
              justifyContent:
                collapsed
                  ? "center"
                  : "space-between",
            }}
          >
            {!collapsed && (
              <div className="brand">
                Norvexa{" "}
                <span>AI</span>
              </div>
            )}

            {collapsed && (
              <div style={collapsedBrandStyle}>
                N
              </div>
            )}

            <button
              type="button"
              className="desktop-sidebar-toggle"
              onClick={() =>
                setCollapsed(
                  (current) =>
                    !current
                )
              }
              aria-label={
                collapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
              }
              title={
                collapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
              }
              style={menuButtonStyle}
            >
              <span style={menuLineStyle} />
              <span style={menuLineStyle} />
              <span style={menuLineStyle} />
            </button>

            <button
              type="button"
              className="mobile-sidebar-close"
              onClick={closeMobileMenu}
              aria-label="Close navigation"
            >
              ×
            </button>
          </div>
        </div>

        <div
          className="sidebar-scroll-area"
          style={scrollAreaStyle}
        >
          <nav style={navStyle}>
            <NavLink
              icon="📊"
              label="Dashboard"
              href="/dashboard"
              active={isActive(
                "/dashboard"
              )}
              collapsed={
                collapsed
              }
              onNavigate={
                closeMobileMenu
              }
            />

            <NavSection
              title="Market"
              collapsed={
                collapsed
              }
            >
              {MARKET_ITEMS.map(
                (item) => (
                  <NavLink
                    key={
                      item.href
                    }
                    {...item}
                    active={isActive(
                      item.matchPath ??
                        item.href.split(
                          "#"
                        )[0]
                    )}
                    collapsed={
                      collapsed
                    }
                    onNavigate={
                      closeMobileMenu
                    }
                  />
                )
              )}
            </NavSection>

            <NavSection
              title="AI Tools"
              collapsed={
                collapsed
              }
            >
              {AI_ITEMS.map(
                (item) => (
                  <NavLink
                    key={
                      item.href
                    }
                    {...item}
                    active={isActive(
                      item.href
                    )}
                    collapsed={
                      collapsed
                    }
                    onNavigate={
                      closeMobileMenu
                    }
                  />
                )
              )}
            </NavSection>

            <NavSection
              title="Portfolio & Community"
              collapsed={
                collapsed
              }
            >
              {PORTFOLIO_COMMUNITY_ITEMS.map(
                (item) => (
                  <NavLink
                    key={
                      item.href
                    }
                    {...item}
                    active={
                      item.label ===
                      "Portfolio"
                        ? false
                        : isActive(
                            item.matchPath ??
                              item.href.split(
                                "#"
                              )[0]
                          )
                    }
                    collapsed={
                      collapsed
                    }
                    onNavigate={
                      closeMobileMenu
                    }
                  />
                )
              )}
            </NavSection>

            <div style={dividerStyle} />

            <NavLink
              icon="⚙️"
              label="Settings"
              href="/settings"
              active={isActive(
                "/settings"
              )}
              collapsed={
                collapsed
              }
              onNavigate={
                closeMobileMenu
              }
            />
          </nav>
        </div>

        <div style={bottomStyle}>
          <button
            type="button"
            onClick={signOut}
            className="side-link"
            title={
              collapsed
                ? "Sign Out"
                : undefined
            }
            style={{
              ...signOutStyle,
              justifyContent:
                collapsed
                  ? "center"
                  : "flex-start",
            }}
          >
            <span style={navIconStyle}>
              🚪
            </span>

            {!collapsed && (
              <span>
                Sign Out
              </span>
            )}
          </button>
        </div>

        <style jsx global>{`
          .sidebar-scroll-area {
            scrollbar-width: thin;
            scrollbar-color:
              rgba(148, 163, 184, 0.3)
              transparent;
          }

          .sidebar-scroll-area::-webkit-scrollbar {
            width: 6px;
          }

          .sidebar-scroll-area::-webkit-scrollbar-track {
            background: transparent;
          }

          .sidebar-scroll-area::-webkit-scrollbar-thumb {
            background:
              rgba(148, 163, 184, 0.25);
            border-radius: 999px;
          }

          .sidebar-scroll-area::-webkit-scrollbar-thumb:hover {
            background:
              rgba(148, 163, 184, 0.4);
          }

          .mobile-sidebar-toggle,
          .mobile-sidebar-overlay,
          .mobile-sidebar-close {
            display: none;
          }

          @media (max-width: 900px) {
            .desktop-sidebar-toggle {
              display: none !important;
            }

            .mobile-sidebar-toggle {
              position: fixed;
              top:
                max(
                  14px,
                  env(safe-area-inset-top)
                );
              left:
                max(
                  14px,
                  env(safe-area-inset-left)
                );
              z-index: 1202;

              width: 46px;
              height: 46px;

              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 5px;

              padding: 0;
              border:
                1px solid
                rgba(255,255,255,0.11);
              border-radius: 13px;

              background:
                rgba(6,14,26,0.94);
              backdrop-filter:
                blur(14px);
              -webkit-backdrop-filter:
                blur(14px);

              box-shadow:
                0 10px 28px
                rgba(0,0,0,0.32);

              cursor: pointer;
            }

            .mobile-sidebar-overlay {
              position: fixed;
              inset: 0;
              z-index: 1199;

              display: block;

              width: 100%;
              height: 100%;

              padding: 0;
              border: 0;

              background:
                rgba(0,0,0,0.56);

              opacity: 0;
              visibility: hidden;
              pointer-events: none;

              transition:
                opacity 180ms ease,
                visibility 180ms ease;
            }

            .mobile-sidebar-overlay-open {
              opacity: 1;
              visibility: visible;
              pointer-events: auto;
            }

            .sidebar {
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;

              z-index: 1200;

              width:
                min(
                  84vw,
                  310px
                ) !important;

              max-width: 310px;

              height: 100vh !important;
              height: 100dvh !important;

              padding-top:
                env(safe-area-inset-top);

              transform:
                translateX(-105%);

              transition:
                transform 220ms ease
                !important;

              box-shadow:
                24px 0 60px
                rgba(0,0,0,0.42);

              border-right:
                1px solid
                rgba(255,255,255,0.08)
                !important;
            }

            .mobile-sidebar-open {
              transform:
                translateX(0);
            }

            .sidebar .brand {
              display: block !important;
            }

            .mobile-sidebar-open
              .mobile-sidebar-close {
              width: 36px;
              height: 36px;

              display: inline-flex;
              align-items: center;
              justify-content: center;

              flex-shrink: 0;

              padding: 0;

              border:
                1px solid
                rgba(255,255,255,0.08);
              border-radius: 10px;

              background:
                rgba(255,255,255,0.03);

              color: #cbd5e1;

              font-size: 24px;
              line-height: 1;

              cursor: pointer;
            }

            .sidebar-scroll-area {
              -webkit-overflow-scrolling:
                touch;
            }
          }

          @media (max-width: 480px) {
            .sidebar {
              width:
                min(
                  88vw,
                  300px
                ) !important;
            }
          }
        `}</style>
      </aside>
    </>
  );
}

function NavSection({
  title,
  collapsed,
  children,
}: {
  title: string;
  collapsed: boolean;
  children:
    React.ReactNode;
}) {
  return (
    <section style={sectionStyle}>
      {!collapsed && (
        <div style={sectionLabelStyle}>
          {title}
        </div>
      )}

      {collapsed && (
        <div style={collapsedDividerStyle} />
      )}

      <div style={sectionLinksStyle}>
        {children}
      </div>
    </section>
  );
}

function NavLink({
  icon,
  label,
  href,
  active,
  collapsed,
  externalAnchor = false,
  onNavigate,
}: NavItem & {
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const content = (
    <>
      <span style={navIconStyle}>
        {icon}
      </span>

      {!collapsed && (
        <span style={navLabelStyle}>
          {label}
        </span>
      )}

      {!collapsed &&
        active && (
          <span style={activeDotStyle} />
        )}
    </>
  );

  const sharedStyle = {
    ...linkStyle,
    ...(active
      ? activeLinkStyle
      : {}),
    justifyContent:
      collapsed
        ? "center"
        : "flex-start",
  };

  if (externalAnchor) {
    return (
      <a
        className={`side-link ${
          active
            ? "active"
            : ""
        }`}
        href={href}
        title={
          collapsed
            ? label
            : undefined
        }
        style={sharedStyle}
        onClick={onNavigate}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      className={`side-link ${
        active
          ? "active"
          : ""
      }`}
      href={href}
      title={
        collapsed
          ? label
          : undefined
      }
      style={sharedStyle}
      onClick={onNavigate}
    >
      {content}
    </Link>
  );
}

const sidebarStyle = {
  position: "sticky" as const,
  top: 0,
  height: "100vh",
  minHeight: 0,
  display: "flex",
  flexDirection:
    "column" as const,
  overflow: "hidden",
  borderRight:
    "1px solid rgba(255,255,255,0.07)",
  background:
    "linear-gradient(180deg, rgba(4,10,20,0.98), rgba(7,17,31,0.98))",
  transition:
    "width 220ms ease",
};

const topStyle = {
  flexShrink: 0,
  padding:
    "18px 14px 14px",
  borderBottom:
    "1px solid rgba(255,255,255,0.055)",
};

const brandWrapStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const collapsedBrandStyle = {
  width: 34,
  height: 34,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border:
    "1px solid rgba(96,165,250,0.22)",
  borderRadius: 10,
  background:
    "rgba(37,99,235,0.09)",
  color: "#93c5fd",
  fontSize: 14,
  fontWeight: 900,
};

const menuButtonStyle = {
  width: 34,
  height: 34,
  display: "flex",
  flexDirection:
    "column" as const,
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  flexShrink: 0,
  border:
    "1px solid rgba(255,255,255,0.08)",
  borderRadius: 9,
  background:
    "rgba(255,255,255,0.025)",
  cursor: "pointer",
};

const menuLineStyle = {
  width: 14,
  height: 1.5,
  borderRadius: 999,
  background: "#9ca3af",
};

const mobileMenuLineStyle = {
  width: 19,
  height: 2,
  borderRadius: 999,
  background: "#cbd5e1",
};

const scrollAreaStyle = {
  flex: 1,
  minHeight: 0,
  overflowY:
    "auto" as const,
  overflowX:
    "hidden" as const,
  padding: "12px 10px",
};

const navStyle = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap: 6,
};

const sectionStyle = {
  display: "grid",
  gap: 6,
  marginTop: 12,
};

const sectionLabelStyle = {
  padding: "4px 10px 3px",
  color: "#526071",
  fontSize: 8,
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform:
    "uppercase" as const,
};

const collapsedDividerStyle = {
  height: 1,
  margin: "5px 8px",
  background:
    "rgba(255,255,255,0.06)",
};

const sectionLinksStyle = {
  display: "grid",
  gap: 5,
};

const linkStyle = {
  position: "relative" as const,
  minHeight: 40,
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "9px 11px",
  border:
    "1px solid transparent",
  borderRadius: 9,
  color: "#9ca3af",
  textDecoration: "none",
  fontSize: 11,
  fontWeight: 700,
  transition:
    "background 160ms ease, border-color 160ms ease, color 160ms ease",
};

const activeLinkStyle = {
  border:
    "1px solid rgba(96,165,250,0.14)",
  background:
    "rgba(37,99,235,0.08)",
  color: "#bfdbfe",
};

const navIconStyle = {
  width: 20,
  flexShrink: 0,
  textAlign: "center" as const,
  fontSize: 13,
};

const navLabelStyle = {
  minWidth: 0,
  overflow: "hidden",
  whiteSpace:
    "nowrap" as const,
  textOverflow:
    "ellipsis",
};

const activeDotStyle = {
  width: 5,
  height: 5,
  marginLeft: "auto",
  flexShrink: 0,
  borderRadius: "50%",
  background: "#60a5fa",
  boxShadow:
    "0 0 9px rgba(96,165,250,0.65)",
};

const dividerStyle = {
  height: 1,
  margin: "11px 8px 6px",
  background:
    "rgba(255,255,255,0.055)",
};

const bottomStyle = {
  flexShrink: 0,
  padding: "11px 10px 14px",
  borderTop:
    "1px solid rgba(255,255,255,0.055)",
  background:
    "rgba(2,7,19,0.28)",
};

const signOutStyle = {
  minHeight: 40,
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "9px 11px",
  border:
    "1px solid transparent",
  borderRadius: 9,
  background: "none",
  color: "#9ca3af",
  textAlign: "left" as const,
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
};