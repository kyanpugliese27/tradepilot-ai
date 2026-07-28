"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Sidebar from "@/components/Sidebar";
import AIChat from "@/components/AIChat";

const stocks = [
  ["AAPL", "Apple", "$189.98", "+1.84%"],
  ["NVDA", "NVIDIA", "$198.42", "+3.12%"],
  ["TSLA", "Tesla", "$178.62", "-0.72%"],
  ["MSFT", "Microsoft", "$415.32", "+0.64%"],
];

export default function DashboardPage() {
  const [name, setName] = useState("Trader");

  useEffect(() => {
    async function loadUser() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !key) {
        return;
      }

      const supabase = createBrowserClient(url, key);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const fullName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "Trader";

        setName(fullName);
      }
    }

    loadUser();
  }, []);

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="main">
        <div className="row">
          <div>
            <h1 style={{ marginBottom: 5 }}>
              Good afternoon, {name} 👋
            </h1>

            <p className="muted">
              Here is what deserves your attention today.
            </p>
          </div>

          <span className="green">Demo environment</span>
        </div>

        <div className="card">
          <div className="row">
            <span className="muted">Portfolio value</span>
            <span className="green">▲ 2.41%</span>
          </div>

          <div className="value">$152,481.39</div>
          <div className="green">+$3,578.24 today</div>
        </div>

        <div className="stat-grid" style={{ marginTop: 14 }}>
          <div className="card">
            <span className="muted">Market mood</span>
            <h2 className="green">Bullish</h2>
          </div>

          <div className="card">
            <span className="muted">Portfolio risk</span>
            <h2>Moderate</h2>
          </div>

          <div className="card">
            <span className="muted">AI opportunity</span>
            <h2>NVDA 82</h2>
          </div>
        </div>

        <div
          className="grid"
          style={{ gridTemplateColumns: "1fr 1fr", marginTop: 14 }}
        >
          <div className="card" id="watchlist">
            <div className="row">
              <h3>Watchlist</h3>
              <span className="green">View all</span>
            </div>

            {stocks.map((stock) => (
              <div className="stock-row" key={stock[0]}>
                <div>
                  <strong>{stock[0]}</strong>
                  <div className="muted">{stock[1]}</div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div>{stock[2]}</div>
                  <div className={stock[3].startsWith("-") ? "" : "green"}>
                    {stock[3]}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card" id="portfolio">
            <h3>Portfolio insight</h3>

            <p>
              Your demo portfolio is concentrated in large-cap technology.
            </p>

            <p className="muted">
              This concentration helped today, but it can increase sensitivity
              to rates and semiconductor volatility.
            </p>

            <div className="card" style={{ marginTop: 18 }}>
              <strong>Largest exposure</strong>
              <div className="value" style={{ fontSize: 29 }}>
                Technology 82%
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <AIChat />
        </div>
      </main>
    </div>
  );
}