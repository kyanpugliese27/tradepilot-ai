"use client";

import ResponsiveSidebar from "@/components/ResponsiveSidebar";
import ResearchChat from "@/components/ResearchChat";

export default function ResearchPage() {
  return (
    <div className="dashboard-layout">
      <ResponsiveSidebar />

      <main
        className="main"
        style={{
          minHeight: "100vh",
        }}
      >
        <section
          style={{
            maxWidth: "1180px",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: "18px",
              flexWrap: "wrap",
              marginBottom: "18px",
            }}
          >
            <div>
              <p
                style={{
                  margin: "0 0 6px",
                  color: "#60a5fa",
                  fontSize: "13px",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Norvexa intelligence
              </p>

              <h1
                style={{
                  margin: 0,
                  fontSize: "38px",
                  letterSpacing: "-0.03em",
                }}
              >
                AI Research Center
              </h1>

              <p
                className="muted"
                style={{
                  margin: "10px 0 0",
                  maxWidth: "720px",
                  lineHeight: 1.6,
                }}
              >
                Ask investing questions, compare companies, learn market
                concepts, and prepare deeper research in one place.
              </p>
            </div>

            <div
              style={{
                padding: "9px 12px",
                borderRadius: "999px",
                border: "1px solid rgba(96,165,250,0.24)",
                background: "rgba(37,99,235,0.08)",
                color: "#93c5fd",
                fontSize: "12px",
                fontWeight: 750,
              }}
            >
              Educational research only
            </div>
          </div>

          <ResearchChat />
        </section>

        <style jsx>{`
          @media (max-width: 640px) {
            .main {
              padding-left: 14px !important;
              padding-right: 14px !important;
            }

            h1 {
              font-size: 32px !important;
            }
          }
        `}</style>
      </main>
    </div>
  );
}