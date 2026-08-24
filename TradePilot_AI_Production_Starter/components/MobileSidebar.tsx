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
  { label: "Markets", icon: "🌎", href: "/markets" },
  { label: "Earnings", icon: "📅", href: "/earnings" },
  { label: "Compare", icon: "⚖️", href: "/compare" },
  { label: "Watchlist", icon: "⭐", href: "/watchlist" },
];

const AI_ITEMS: NavItem[] = [
  { label: "AI Research", icon: "🤖", href: "/research" },
  { label: "AI Screener", icon: "🔎", href: "/screener" },
  { label: "Analytics", icon: "📈", href: "/analytics" },
];

const PORTFOLIO_COMMUNITY_ITEMS: NavItem[] = [
  {
    label: "Portfolio",
    icon: "💼",
    href: "/dashboard#portfolio",
    matchPath: "/dashboard",
    externalAnchor: true,
  },
  { label: "Activity", icon: "📜", href: "/activity" },
  { label: "Community", icon: "👥", href: "/community" },
];

export default function MobileSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const isActive = (path: string) =>
    pathname === path ||
    pathname.startsWith(path + "/");

  function closeMenu() {
    setOpen(false);
  }

  async function signOut() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return;
    }

    const supabase = createBrowserClient(url, key);

    await supabase.auth.signOut();

    setOpen(false);
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="norvexa-mobile-nav">
      <button
        type="button"
        className="norvexa-mobile-menu-button"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
      >
        <span />
        <span />
        <span />
      </button>

      <button
        type="button"
        className={`norvexa-mobile-overlay ${open ? "is-open" : ""}`}
        onClick={closeMenu}
        aria-label="Close navigation"
        tabIndex={open ? 0 : -1}
      />

      <aside
        className={`norvexa-mobile-drawer ${open ? "is-open" : ""}`}
        aria-hidden={!open}
      >
        <div className="norvexa-mobile-header">
          <Link
            href="/dashboard"
            className="norvexa-mobile-brand"
            onClick={closeMenu}
          >
            Norvexa <span>AI</span>
          </Link>

          <button
            type="button"
            className="norvexa-mobile-close"
            onClick={closeMenu}
            aria-label="Close navigation"
          >
            ×
          </button>
        </div>

        <div className="norvexa-mobile-scroll">
          <nav className="norvexa-mobile-links">
            <MobileNavLink
              icon="📊"
              label="Dashboard"
              href="/dashboard"
              active={isActive("/dashboard")}
              onNavigate={closeMenu}
            />

            <MobileSection title="Market">
              {MARKET_ITEMS.map((item) => (
                <MobileNavLink
                  key={item.href}
                  {...item}
                  active={isActive(
                    item.matchPath ?? item.href.split("#")[0]
                  )}
                  onNavigate={closeMenu}
                />
              ))}
            </MobileSection>

            <MobileSection title="AI Tools">
              {AI_ITEMS.map((item) => (
                <MobileNavLink
                  key={item.href}
                  {...item}
                  active={isActive(item.href)}
                  onNavigate={closeMenu}
                />
              ))}
            </MobileSection>

            <MobileSection title="Portfolio & Community">
              {PORTFOLIO_COMMUNITY_ITEMS.map((item) => (
                <MobileNavLink
                  key={item.href}
                  {...item}
                  active={
                    item.label === "Portfolio"
                      ? false
                      : isActive(
                          item.matchPath ?? item.href.split("#")[0]
                        )
                  }
                  onNavigate={closeMenu}
                />
              ))}
            </MobileSection>

            <div className="norvexa-mobile-divider" />

            <MobileNavLink
              icon="⚙️"
              label="Settings"
              href="/settings"
              active={isActive("/settings")}
              onNavigate={closeMenu}
            />
          </nav>
        </div>

        <div className="norvexa-mobile-bottom">
          <button
            type="button"
            onClick={signOut}
            className="norvexa-mobile-signout"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <style jsx global>{`
        .norvexa-mobile-nav {
          display: none;
        }

        @media (max-width: 900px) {
          .norvexa-mobile-nav {
            display: block;
          }

          .norvexa-mobile-menu-button {
            position: fixed;
            top: max(14px, env(safe-area-inset-top));
            right: max(14px, env(safe-area-inset-right));
            z-index: 1402;
            width: 46px;
            height: 46px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 5px;
            padding: 0;
            border: 1px solid rgba(255,255,255,0.11);
            border-radius: 13px;
            background: rgba(6,14,26,0.94);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            box-shadow: 0 10px 28px rgba(0,0,0,0.32);
            cursor: pointer;
          }

          .norvexa-mobile-menu-button span {
            width: 19px;
            height: 2px;
            border-radius: 999px;
            background: #cbd5e1;
          }

          .norvexa-mobile-overlay {
            position: fixed;
            inset: 0;
            z-index: 1399;
            width: 100%;
            height: 100%;
            display: block;
            padding: 0;
            border: 0;
            background: rgba(0,0,0,0.58);
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            transition: opacity 180ms ease, visibility 180ms ease;
          }

          .norvexa-mobile-overlay.is-open {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
          }

          .norvexa-mobile-drawer {
            position: fixed;
            top: 0;
            left: 0;
            z-index: 1400;
            width: min(86vw, 310px);
            height: 100vh;
            height: 100dvh;
            display: flex;
            flex-direction: column;
            padding-top: env(safe-area-inset-top);
            padding-bottom: env(safe-area-inset-bottom);
            overflow: hidden;
            border-right: 1px solid rgba(255,255,255,0.08);
            background:
              linear-gradient(
                180deg,
                rgba(4,10,20,0.995),
                rgba(7,17,31,0.995)
              );
            box-shadow: 24px 0 60px rgba(0,0,0,0.44);
            transform: translateX(-105%);
            transition: transform 220ms ease;
          }

          .norvexa-mobile-drawer.is-open {
            transform: translateX(0);
          }

          .norvexa-mobile-header {
            min-height: 68px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            flex-shrink: 0;
            padding: 14px 15px;
            border-bottom: 1px solid rgba(255,255,255,0.055);
          }

          .norvexa-mobile-brand {
            color: #f8fafc;
            font-size: 20px;
            font-weight: 900;
            letter-spacing: -0.02em;
            text-decoration: none;
          }

          .norvexa-mobile-brand span {
            color: #60a5fa;
          }

          .norvexa-mobile-close {
            width: 38px;
            height: 38px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            padding: 0;
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 10px;
            background: rgba(255,255,255,0.03);
            color: #cbd5e1;
            font-size: 25px;
            line-height: 1;
            cursor: pointer;
          }

          .norvexa-mobile-scroll {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 12px 10px;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
            scrollbar-color: rgba(148,163,184,0.3) transparent;
          }

          .norvexa-mobile-scroll::-webkit-scrollbar {
            width: 5px;
          }

          .norvexa-mobile-scroll::-webkit-scrollbar-track {
            background: transparent;
          }

          .norvexa-mobile-scroll::-webkit-scrollbar-thumb {
            border-radius: 999px;
            background: rgba(148,163,184,0.26);
          }

          .norvexa-mobile-links {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .norvexa-mobile-section {
            display: grid;
            gap: 6px;
            margin-top: 13px;
          }

          .norvexa-mobile-section-title {
            padding: 4px 11px 3px;
            color: #526071;
            font-size: 8px;
            font-weight: 900;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }

          .norvexa-mobile-section-links {
            display: grid;
            gap: 5px;
          }

          .norvexa-mobile-link {
            position: relative;
            width: 100%;
            min-height: 48px;
            display: flex;
            align-items: center;
            gap: 11px;
            padding: 11px 12px;
            border: 1px solid transparent;
            border-radius: 11px;
            color: #a4afbd;
            text-decoration: none;
            font-size: 13px;
            font-weight: 750;
            transition:
              background 160ms ease,
              border-color 160ms ease,
              color 160ms ease;
          }

          .norvexa-mobile-link.active {
            border-color: rgba(96,165,250,0.16);
            background: rgba(37,99,235,0.09);
            color: #bfdbfe;
          }

          .norvexa-mobile-icon {
            width: 24px;
            flex-shrink: 0;
            text-align: center;
            font-size: 15px;
          }

          .norvexa-mobile-label {
            min-width: 0;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          .norvexa-mobile-active-dot {
            width: 6px;
            height: 6px;
            margin-left: auto;
            flex-shrink: 0;
            border-radius: 50%;
            background: #60a5fa;
            box-shadow: 0 0 9px rgba(96,165,250,0.65);
          }

          .norvexa-mobile-divider {
            height: 1px;
            margin: 13px 8px 7px;
            background: rgba(255,255,255,0.055);
          }

          .norvexa-mobile-bottom {
            flex-shrink: 0;
            padding: 11px 10px 14px;
            border-top: 1px solid rgba(255,255,255,0.055);
            background: rgba(2,7,19,0.28);
          }

          .norvexa-mobile-signout {
            width: 100%;
            min-height: 48px;
            display: flex;
            align-items: center;
            gap: 11px;
            padding: 11px 12px;
            border: 1px solid transparent;
            border-radius: 11px;
            background: none;
            color: #a4afbd;
            font-size: 13px;
            font-weight: 750;
            text-align: left;
            cursor: pointer;
          }
        }

        @media (max-width: 420px) {
          .norvexa-mobile-drawer {
            width: min(88vw, 300px);
          }
        }
      `}</style>
    </div>
  );
}

function MobileSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="norvexa-mobile-section">
      <div className="norvexa-mobile-section-title">
        {title}
      </div>

      <div className="norvexa-mobile-section-links">
        {children}
      </div>
    </section>
  );
}

function MobileNavLink({
  icon,
  label,
  href,
  active,
  externalAnchor = false,
  onNavigate,
}: NavItem & {
  active: boolean;
  onNavigate: () => void;
}) {
  const content = (
    <>
      <span className="norvexa-mobile-icon">
        {icon}
      </span>

      <span className="norvexa-mobile-label">
        {label}
      </span>

      {active && (
        <span className="norvexa-mobile-active-dot" />
      )}
    </>
  );

  if (externalAnchor) {
    return (
      <a
        href={href}
        className={`norvexa-mobile-link ${
          active ? "active" : ""
        }`}
        onClick={onNavigate}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={`norvexa-mobile-link ${
        active ? "active" : ""
      }`}
      onClick={onNavigate}
    >
      {content}
    </Link>
  );
}