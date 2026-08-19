import Link from "next/link";

export default function DisclaimerPage() {
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
            Financial & AI Disclaimer
          </h1>

          <p style={updatedStyle}>
            Last updated: August 19, 2026
          </p>

          <Section title="Educational purposes only">
            Norvexa provides educational,
            informational, analytical, and
            research tools related to investing
            and financial markets. Nothing on
            Norvexa constitutes personalized
            investment, financial, legal, tax,
            accounting, or other professional
            advice.
          </Section>

          <Section title="No investment recommendation">
            Norvexa does not recommend or
            guarantee the purchase, sale, or
            holding of any security, investment,
            or financial product. Ratings,
            scores, screeners, research results,
            portfolio analytics, and other
            outputs should not be interpreted as
            individualized investment
            recommendations.
          </Section>

          <Section title="Investment risk">
            Investing involves risk, including
            the possible loss of principal.
            Securities may decline substantially
            in value. Past performance does not
            guarantee future results, and no
            investment strategy can guarantee a
            profit or prevent a loss.
          </Section>

          <Section title="AI-generated content">
            Some Norvexa features use artificial
            intelligence to generate summaries,
            explanations, research signals, and
            other content. AI-generated outputs
            may be inaccurate, incomplete,
            outdated, misleading, or based on
            incomplete information.
            You should independently verify
            material information before relying
            on it.
          </Section>

          <Section title="Market data">
            Market prices, company information,
            financial metrics, analyst data,
            news, filings, and other market data
            may come from third-party providers.
            Such information may be delayed,
            incomplete, inaccurate, or
            unavailable. Norvexa does not
            guarantee the accuracy, timeliness,
            or completeness of third-party data.
          </Section>

          <Section title="Paper trading">
            Norvexa paper trading uses simulated
            funds and does not involve the
            purchase or sale of real securities.
            Simulated results may not reflect
            actual market execution, liquidity,
            spreads, slippage, fees, taxes,
            emotional decision-making, or other
            real-world conditions. Paper-trading
            performance does not guarantee
            future investment performance.
          </Section>

          <Section title="Independent judgment">
            You are solely responsible for your
            financial and investment decisions.
            Before making an investment decision,
            you should perform your own research
            and consider consulting a qualified
            financial, legal, or tax professional
            where appropriate.
          </Section>

          <Section title="No guarantees">
            Norvexa makes no guarantee regarding
            investment performance, future
            returns, market movements, portfolio
            outcomes, or the accuracy of any
            research signal, rating, forecast,
            or analysis.
          </Section>

          <div style={footerLinksStyle}>
            <Link href="/terms" style={linkStyle}>
              Terms of Service
            </Link>

            <Link href="/privacy" style={linkStyle}>
              Privacy Policy
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