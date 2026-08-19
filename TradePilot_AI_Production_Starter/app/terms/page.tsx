import Link from "next/link";

export default function TermsPage() {
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
            Terms of Service
          </h1>

          <p style={updatedStyle}>
            Last updated: August 19, 2026
          </p>

          <Section title="Acceptance of terms">
            By accessing or using Norvexa, you
            agree to these Terms of Service. If
            you do not agree, do not use the
            service.
          </Section>

          <Section title="Educational platform">
            Norvexa provides investment research,
            market information, educational
            content, analytical tools, artificial
            intelligence features, portfolio
            analytics, social features, and
            simulated paper trading.
          </Section>

          <Section title="Not financial advice">
            Norvexa does not provide personalized
            investment, legal, tax, or financial
            advice. You are responsible for your
            own investment decisions.
          </Section>

          <Section title="Eligibility">
            You must be legally capable of
            entering into a binding agreement in
            your jurisdiction to create an
            account or purchase a subscription.
          </Section>

          <Section title="Account security">
            You are responsible for maintaining
            the confidentiality of your account
            credentials and for activity occurring
            through your account. You must notify
            Norvexa if you believe your account
            has been compromised.
          </Section>

          <Section title="Subscriptions">
            Certain Norvexa features may require
            a paid subscription. Subscription
            pricing, billing frequency, trial
            terms, and available features will be
            disclosed at the time of purchase.
          </Section>

          <Section title="Recurring billing">
            Paid subscriptions may renew
            automatically until canceled. By
            subscribing, you authorize the
            applicable recurring charges until
            cancellation, subject to the terms
            presented during checkout.
          </Section>

          <Section title="Cancellation">
            You may cancel a subscription through
            the available subscription-management
            tools. Unless otherwise stated,
            cancellation prevents future renewal
            but does not necessarily provide a
            refund for a billing period already
            paid.
          </Section>

          <Section title="Paper trading">
            Paper trading is simulated and does
            not involve real securities or real
            money. Results are hypothetical and
            may differ substantially from
            real-world trading results.
          </Section>

          <Section title="Community conduct">
            You may not use Norvexa to harass
            others, impersonate another person,
            distribute unlawful content, manipulate
            community features, interfere with the
            platform, attempt unauthorized access,
            or engage in abusive or fraudulent
            activity.
          </Section>

          <Section title="Automated and AI content">
            AI-generated and automated content may
            contain errors or omissions. Norvexa
            does not guarantee the accuracy,
            completeness, or suitability of such
            outputs.
          </Section>

          <Section title="Third-party services">
            Norvexa relies on third-party services
            and data providers. Norvexa is not
            responsible for outages, errors,
            delays, changes, or interruptions
            caused by third-party services.
          </Section>

          <Section title="Availability">
            Norvexa may modify, suspend, restrict,
            or discontinue any feature or portion
            of the service at any time.
          </Section>

          <Section title="Prohibited use">
            You may not reverse engineer the
            platform, attempt to bypass access
            controls, abuse APIs, scrape the
            service in violation of applicable
            rules, introduce malicious code, or
            use Norvexa for unlawful purposes.
          </Section>

          <Section title="Intellectual property">
            Norvexa and its original software,
            branding, design, content, and related
            intellectual property are owned by
            Norvexa or its licensors, except for
            third-party content and data.
          </Section>

          <Section title="Disclaimer of warranties">
            Norvexa is provided on an
            &quot;as is&quot; and
            &quot;as available&quot; basis to the
            maximum extent permitted by law.
            Norvexa does not guarantee uninterrupted
            availability, accuracy, or fitness for
            a particular purpose.
          </Section>

          <Section title="Limitation of liability">
            To the maximum extent permitted by
            law, Norvexa and its operators will
            not be liable for investment losses,
            trading losses, lost profits, indirect
            damages, consequential damages, or
            losses arising from reliance on
            platform information.
          </Section>

          <Section title="Changes to these terms">
            Norvexa may update these Terms from
            time to time. Continued use of the
            service after updated terms become
            effective constitutes acceptance of
            the revised terms.
          </Section>

          <div style={footerLinksStyle}>
            <Link href="/privacy" style={linkStyle}>
              Privacy Policy
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