import Sidebar from "@/components/Sidebar";
import AIChat from "@/components/AIChat";

const stocks = [
  ["AAPL","Apple","$189.98","+1.84%"],
  ["NVDA","NVIDIA","$198.42","+3.12%"],
  ["TSLA","Tesla","$178.62","-0.72%"],
  ["MSFT","Microsoft","$415.32","+0.64%"]
];

export default function DashboardPage() {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main">
        <div className="row">
          <div><h1 style={{marginBottom:5}}>Good afternoon, Ari 👋</h1><p className="muted">Here is what deserves your attention today.</p></div>
          <span className="green">Demo environment</span>
        </div>

        <div className="card">
          <div className="row"><span className="muted">Portfolio value</span><span className="green">▲ 2.41%</span></div>
          <div className="value">$152,481.39</div>
          <div className="green">+$3,578.24 today</div>
        </div>

        <div className="stat-grid" style={{marginTop:14}}>
          <div className="card"><span className="muted">Market mood</span><h2 className="green">Bullish</h2></div>
          <div className="card"><span className="muted">Portfolio risk</span><h2>Moderate</h2></div>
          <div className="card"><span className="muted">AI opportunity</span><h2>NVDA 82</h2></div>
        </div>

        <div className="grid" style={{gridTemplateColumns:"1fr 1fr",marginTop:14}}>
          <div className="card" id="watchlist">
            <div className="row"><h3>Watchlist</h3><span className="green">View all</span></div>
            {stocks.map(s=>(
              <div className="stock-row" key={s[0]}>
                <div><strong>{s[0]}</strong><div className="muted">{s[1]}</div></div>
                <div style={{textAlign:"right"}}><div>{s[2]}</div><div className={s[3].startsWith("-")?"":"green"}>{s[3]}</div></div>
              </div>
            ))}
          </div>

          <div className="card" id="portfolio">
            <h3>Portfolio insight</h3>
            <p>Your demo portfolio is concentrated in large-cap technology.</p>
            <p className="muted">This concentration helped today, but it can increase sensitivity to rates and semiconductor volatility.</p>
            <div className="card" style={{marginTop:18}}>
              <strong>Largest exposure</strong>
              <div className="value" style={{fontSize:29}}>Technology 82%</div>
            </div>
          </div>
        </div>

        <div style={{marginTop:14}}><AIChat /></div>
      </main>
    </div>
  );
}
