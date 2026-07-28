import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell">
      <nav className="nav">
        <div className="brand">TradePilot <span>AI</span></div>
        <div className="navlinks">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <Link className="button secondary" href="/login">Log in</Link>
          <Link className="button" href="/dashboard">Open demo</Link>
        </div>
      </nav>

      <section className="hero">
        <div>
          <div className="green">YOUR AI INVESTING COPILOT</div>
          <h1>Understand the market without the noise.</h1>
          <p>
            TradePilot AI turns market information into clear educational insights,
            portfolio context, watchlists, and plain-English explanations.
          </p>
          <div style={{display:"flex",gap:12,marginTop:26}}>
            <Link className="button" href="/dashboard">Explore the product</Link>
            <Link className="button secondary" href="/login">Create account</Link>
          </div>
          <p className="disclaimer" style={{marginTop:22}}>
            Educational research platform. Not personalized investment advice.
            TradePilot does not execute trades.
          </p>
        </div>

        <div className="card mock">
          <div className="row"><span className="muted">Portfolio value</span><span className="green">▲ 2.41%</span></div>
          <div className="value">$152,481.39</div>
          <div className="green">+$3,578.24 today</div>
          <div className="card" style={{marginTop:20}}>
            <div className="row"><strong>AI Market Brief</strong><span className="green">Bullish</span></div>
            <p className="muted">Technology and semiconductor shares are leading this demo session.</p>
          </div>
          <div className="card" style={{marginTop:12}}>
            <div className="row"><div><strong>NVDA</strong><div className="muted">AI opportunity</div></div><strong className="green">82/100</strong></div>
          </div>
        </div>
      </section>

      <section id="features" className="section">
        <h2>Built around understanding—not hype.</h2>
        <div className="grid">
          <div className="card"><h3>AI explanations</h3><p className="muted">Turn complex market information into plain English.</p></div>
          <div className="card"><h3>Portfolio context</h3><p className="muted">See concentration, volatility, and major portfolio drivers.</p></div>
          <div className="card"><h3>Smart watchlists</h3><p className="muted">Organize companies and receive meaningful educational alerts.</p></div>
        </div>
      </section>

      <section id="pricing" className="section">
        <h2>Simple launch pricing</h2>
        <div className="grid">
          <div className="card"><h3>Free</h3><div className="value">$0</div><p className="muted">Basic watchlist, market brief, and limited AI questions.</p></div>
          <div className="card"><h3>Pro</h3><div className="value">$19<span className="muted" style={{fontSize:15}}>/month</span></div><p className="muted">Expanded AI research, scanner, alerts, and portfolio insights.</p></div>
          <div className="card"><h3>Premium</h3><div className="value">$49<span className="muted" style={{fontSize:15}}>/month</span></div><p className="muted">Advanced research tools and early feature access.</p></div>
        </div>
      </section>
    </main>
  );
}
