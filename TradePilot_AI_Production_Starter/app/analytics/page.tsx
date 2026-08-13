"use client";

import Sidebar from "@/components/Sidebar";
import PortfolioAnalyticsDashboard from "@/components/PortfolioAnalyticsDashboard";

export default function AnalyticsPage() {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="main">
        <section
          style={{
            maxWidth: 1180,
            margin: "0 auto",
          }}
        >
          <div style={{ marginBottom: 18 }}>
            <p
              style={{
                margin: "0 0 6px",
                color: "#60a5fa",
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              TradePilot portfolio intelligence
            </p>

            <h1
              style={{
                margin: 0,
                fontSize: 38,
              }}
            >
              Portfolio Analytics
            </h1>

            <p
              className="muted"
              style={{
                margin: "9px 0 0",
                maxWidth: 760,
                lineHeight: 1.6,
              }}
            >
              Review portfolio health,
              diversification, concentration,
              sector exposure, performance, and
              benchmark comparisons for your
              paper-trading account.
            </p>
          </div>

          <PortfolioAnalyticsDashboard />
        </section>
      </main>
    </div>
  );
}