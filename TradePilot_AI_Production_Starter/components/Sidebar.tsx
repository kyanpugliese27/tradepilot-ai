import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand" style={{marginBottom:28}}>TradePilot <span>AI</span></div>
      <nav>
        <Link className="side-link active" href="/dashboard">Dashboard</Link>
        <a className="side-link" href="#watchlist">Watchlist</a>
        <a className="side-link" href="#research">AI Research</a>
        <a className="side-link" href="#portfolio">Portfolio</a>
        <Link className="side-link" href="/">Settings</Link>
      </nav>
    </aside>
  );
}
