import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main style={pageStyle}>
      <section style={containerStyle}>
        <Link href="/" style={backStyle}>
          ← Back to Norvexa
        </Link>

        <div style={cardStyle}>
          <p style={eyebrowStyle}>
            NORVEXA LEGAL
          </p>

          <h1 style={titleStyle}>
            Privacy Policy
          </h1>

          <p style={updatedStyle}>
            Last updated: August 19, 2026
          </p>

          <Section title="Information we collect">
            Norvexa may collect information you
            provide directly, such as your email
            address, account information, profile
            information, preferences, watchlists,
            paper-trading activity, portfolio
            inputs, community activity, and
            communications with Norvexa.
          </Section>

          <Section title="Authentication and account data">
            Account authentication and related
            user data may be processed through
            Supabase. Norvexa may use this
            information to create and maintain
            your account, authenticate sessions,
            save preferences, and provide
            application features.
          </Section>

          <Section title="Payments">
            Payments and subscriptions are
            processed by Stripe. Norvexa does not
            directly store full payment-card
            numbers. Stripe may collect payment
            details, billing information, and
            transaction information in accordance
            with its own privacy practices.
          </Section>

          <Section title="AI features">
            Information you submit to AI-enabled
            features may be processed by third-
            party AI service providers in order
            to generate responses, research,
            summaries, or analysis.
          </Section>

          <Section title="Market-data providers">
            Norvexa may use third-party providers
            to obtain market prices, financial
            data, company information, filings,
            analyst data, news, and related
            information.
          </Section>

          <Section title="How we use information">
            We may use information to operate,
            secure, maintain, and improve Norvexa;
            provide requested features; process
            subscriptions; prevent abuse and
            fraud; personalize the experience;
            respond to support requests; and
            comply with legal obligations.
          </Section>

          <Section title="Service providers">
            Norvexa may share information with
            service providers when necessary to
            operate the platform, including
            hosting, authentication, payment,
            database, analytics, market-data,
            security, and AI service providers.
            These providers may process
            information on Norvexa&apos;s behalf.
          </Section>

          <Section title="Community features">
            If you choose to make portions of
            your Norvexa profile or paper-trading
            activity public, other users may be
            able to view information you choose
            to make public. Your login credentials
            and private authentication data are
            not intended to be displayed publicly.
          </Section>

          <Section title="Security">
            Norvexa uses reasonable technical and
            organizational measures intended to
            protect user information. However, no
            online system can guarantee absolute
            security.
          </Section>

          <Section title="Data retention">
            Norvexa may retain information for as
            long as reasonably necessary to
            operate the service, satisfy legal
            requirements, resolve disputes,
            prevent fraud, and enforce agreements.
          </Section>

          <Section title="Account deletion">
            You may request deletion of your
            Norvexa account and associated
            personal information, subject to any
            information Norvexa is required or
            permitted to retain for legal,
            security, fraud-prevention, or
            business purposes.
          </Section>

          <Section title="Children">
            Norvexa is not intended for children
            under 13. We do not knowingly collect
            personal information from children
            under 13.
          </Section>

          <Section title="Changes to this policy">
            We may update this Privacy Policy from
            time to time. The updated version will
            be posted on this page with a revised
            effective date.
          </Section>

          <Section title="Contact">
            Privacy questions may be sent through
            the contact information provided by
            Norvexa on the website.
          </Section>

          <div style={footerLinksStyle}>
            <Link href="/terms" style={linkStyle}>
              Terms of Service
            </Link>

            <Link href="/disclaimer" style={linkStyle}>
              Financial Disclaimer
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={sectionStyle}>
      <h2 style={sectionTitleStyle}>
        {title}
      </h2>

      <p style={paragraphStyle}>
        {children}
      </p>
    </section>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#07111f",
  color: "#f9fafb",
  padding: "40px 20px",
};

const containerStyle = {
  maxWidth: 900,
  margin: "0 auto",
};

const backStyle = {
  color: "#93c5fd",
  textDecoration: "none",
  fontSize: 14,
};

const cardStyle = {
  marginTop: 18,
  padding: 30,
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 18,
  background: "rgba(255,255,255,0.025)",
};

const eyebrowStyle = {
  color: "#60a5fa",
  fontWeight: 900,
  fontSize: 10,
  letterSpacing: "0.12em",
};

const titleStyle = {
  margin: "8px 0 0",
  fontSize: 36,
};

const updatedStyle = {
  color: "#9ca3af",
  fontSize: 12,
};

const sectionStyle = {
  marginTop: 28,
};

const sectionTitleStyle = {
  margin: 0,
  fontSize: 20,
};

const paragraphStyle = {
  margin: "8px 0 0",
  color: "#cbd5e1",
  lineHeight: 1.75,
};

const footerLinksStyle = {
  display: "flex",
  gap: 18,
  marginTop: 36,
  paddingTop: 20,
  borderTop: "1px solid rgba(255,255,255,0.08)",
};

const linkStyle = {
  color: "#93c5fd",
  textDecoration: "none",
};