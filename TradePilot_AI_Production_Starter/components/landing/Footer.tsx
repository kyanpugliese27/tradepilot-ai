"use client";

import Link from "next/link";

export default function Footer() {
  const year =
    new Date().getFullYear();

  return (
    <footer style={footerStyle}>
      <div style={innerStyle}>
        <div
          className="footer-grid"
          style={gridStyle}
        >
          <div style={brandColumnStyle}>
            <Link
              href="/"
              style={brandStyle}
            >
              <span style={brandMarkStyle}>
                N
              </span>

              <span>
                Norvexa{" "}
                <span style={brandAiStyle}>
                  AI
                </span>
              </span>
            </Link>

            <p style={brandTextStyle}>
              AI-powered investing research,
              paper trading, portfolio tools,
              alerts, and community features
              in one modern workspace.
            </p>

            <div style={badgeRowStyle}>
              <span style={smallBadgeStyle}>
                Paper trading
              </span>

              <span style={smallBadgeStyle}>
                AI research
              </span>

              <span style={smallBadgeStyle}>
                Community
              </span>
            </div>
          </div>

          <FooterColumn
            title="Product"
            links={[
              {
                label: "Home",
                href: "/",
              },
              {
                label: "Premium",
                href: "/premium",
              },
              {
                label: "Create account",
                href: "/signup",
              },
              {
                label: "Log in",
                href: "/login",
              },
            ]}
          />

          <FooterColumn
            title="Explore"
            links={[
              {
                label: "Features",
                href: "/#features",
              },
              {
                label: "How it works",
                href: "/#how-it-works",
              },
              {
                label: "Community",
                href: "/#community",
              },
              {
                label: "Terms of Service",
                href: "/terms",
              },
              {
                label: "Privacy Policy",
                href: "/privacy",
              },
              {
                label: "Financial Disclaimer",
                href: "/disclaimer",
              },
            ]}
          />

          <div style={ctaColumnStyle}>
            <p style={columnTitleStyle}>
              Get started
            </p>

            <p style={ctaTextStyle}>
              Build your investing process
              with research, paper trading,
              and portfolio tools.
            </p>

            <Link
              href="/signup"
              style={footerCtaStyle}
            >
              Create free account
              <span>→</span>
            </Link>
          </div>
        </div>

        <div style={bottomBarStyle}>
          <span>
            © {year} Norvexa.
          </span>

          <div style={bottomRightStyle}>
            <div style={legalLinksStyle}>
              <Link
                href="/terms"
                style={bottomLegalLinkStyle}
              >
                Terms
              </Link>

              <Link
                href="/privacy"
                style={bottomLegalLinkStyle}
              >
                Privacy
              </Link>

              <Link
                href="/disclaimer"
                style={bottomLegalLinkStyle}
              >
                Disclaimer
              </Link>
            </div>

            <span style={disclaimerStyle}>
              Educational purposes only.
              Not financial advice.
            </span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 900px) {
          .footer-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 580px) {
          .footer-grid {
            grid-template-columns:
              1fr !important;
          }
        }
      `}</style>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{
    label: string;
    href: string;
  }>;
}) {
  return (
    <div>
      <p style={columnTitleStyle}>
        {title}
      </p>

      <div style={linkListStyle}>
        {links.map(
          (link) => (
            <Link
              key={link.href}
              href={link.href}
              style={footerLinkStyle}
            >
              {link.label}
            </Link>
          )
        )}
      </div>
    </div>
  );
}

const footerStyle = {
  background: "#020713",
  color: "#f8fafc",
  borderTop:
    "1px solid rgba(255,255,255,0.06)",
};

const innerStyle = {
  width: "100%",
  maxWidth: 1440,
  margin: "0 auto",
  padding: "64px 28px 30px",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns:
    "1.6fr 0.8fr 0.8fr 1fr",
  gap: 34,
  alignItems: "start",
};

const brandColumnStyle = {
  maxWidth: 420,
};

const brandStyle = {
  display: "inline-flex",
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
    "1px solid rgba(96,165,250,0.28)",
  borderRadius: 10,
  background:
    "linear-gradient(145deg, rgba(37,99,235,0.28), rgba(14,165,233,0.10))",
  color: "#bfdbfe",
};

const brandAiStyle = {
  color: "#60a5fa",
};

const brandTextStyle = {
  margin: "16px 0 0",
  maxWidth: 360,
  color: "#7d8999",
  fontSize: 10,
  lineHeight: 1.65,
};

const badgeRowStyle = {
  display: "flex",
  gap: 7,
  flexWrap: "wrap" as const,
  marginTop: 16,
};

const smallBadgeStyle = {
  padding: "5px 7px",
  border:
    "1px solid rgba(255,255,255,0.06)",
  borderRadius: 999,
  background:
    "rgba(255,255,255,0.02)",
  color: "#7f8b9b",
  fontSize: 7,
  fontWeight: 800,
};

const columnTitleStyle = {
  margin: 0,
  color: "#dbe4ef",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};

const linkListStyle = {
  display: "grid",
  gap: 10,
  marginTop: 15,
};

const footerLinkStyle = {
  color: "#7d8999",
  fontSize: 9,
  textDecoration: "none",
};

const ctaColumnStyle = {
  padding: 16,
  border:
    "1px solid rgba(96,165,250,0.10)",
  borderRadius: 12,
  background:
    "rgba(37,99,235,0.035)",
};

const ctaTextStyle = {
  margin: "9px 0 0",
  color: "#748092",
  fontSize: 9,
  lineHeight: 1.55,
};

const footerCtaStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 9,
  marginTop: 14,
  color: "#93c5fd",
  fontSize: 9,
  fontWeight: 900,
  textDecoration: "none",
};

const bottomBarStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap" as const,
  marginTop: 44,
  paddingTop: 20,
  borderTop:
    "1px solid rgba(255,255,255,0.05)",
  color: "#536072",
  fontSize: 8,
};

const bottomRightStyle = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap" as const,
};

const legalLinksStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap" as const,
};

const bottomLegalLinkStyle = {
  color: "#64748b",
  textDecoration: "none",
};

const disclaimerStyle = {
  color: "#64748b",
};