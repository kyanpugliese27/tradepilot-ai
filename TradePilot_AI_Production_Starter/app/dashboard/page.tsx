"use client";

import Link from "next/link";
import StockSearch from "@/components/StockSearch";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AIChat from "@/components/AIChat";
import PortfolioPerformanceChart from "@/components/PortfolioPerformanceChart";
import PortfolioAISummary from "@/components/PortfolioAISummary";
import { createClient } from "@/lib/supabase/client";

type Stock = {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
};

type WatchlistRow = {
  symbol: string;
};

type RecentTransaction = {
  id: string;
  symbol: string;
  transaction_type: "buy" | "sell";
  shares: number | string;
  price: number | string;
  total_amount: number | string;
  realized_gain_loss: number | string | null;
  created_at: string;
};

type MarketOverviewItem = {
  symbol: string;
  label: string;
  description: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
  stale?: boolean;
};

type MarketOverview = {
  status: {
    state:
      | "open"
      | "closed"
      | "pre-market"
      | "after-hours";
    label: string;
    isOpen: boolean;
    holiday: string | null;
    session: string | null;
    timezone: string;
    source: "provider" | "schedule";
  };
  markets: MarketOverviewItem[];
  updatedAt: string;
  note: string;
};


type PortfolioSummary = {
  cashBalance: number;
  portfolioValue: number;
  totalAccountValue: number;
  totalInvested: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  todayGainLoss: number;
  todayGainLossPercent: number;
};

type PortfolioHolding = {
  symbol: string;
  name: string;
  shares: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  investedValue: number;
  gainLoss: number;
  gainLossPercent: number;
  todayGainLoss: number;
  todayGainLossPercent: number;
};

type PortfolioPerformer = {
  symbol: string;
  name?: string;
  gainLoss: number;
  gainLossPercent: number;
  marketValue: number;
};

type PortfolioAllocation = {
  symbol: string;
  name: string;
  marketValue: number;
  allocationPercent: number;
  stockOnlyAllocationPercent: number;
};

type PortfolioAnalytics = {
  holdingsCount: number;
  winningHoldingsCount: number;
  losingHoldingsCount: number;
  flatHoldingsCount: number;
  winRate: number;
  unrealizedGainLoss: number;
  realizedGainLoss: number;
  combinedGainLoss: number;
  cashPercentage: number;
  stockPercentage: number;
  diversificationCount: number;
  bestPerformer: PortfolioPerformer | null;
  worstPerformer: PortfolioPerformer | null;
  largestPosition: PortfolioAllocation | null;
  allocations: PortfolioAllocation[];
};

type PortfolioAIAnalysis = {
  riskLevel: "Low" | "Moderate" | "High";
  score: number;
  headline: string;
  summary: string;
  strengths: string[];
  risks: string[];
  diversificationReview: string;
  cashReview: string;
  concentrationReview: string;
  educationalNextSteps: string[];
  disclaimer: string;
};

const companyNames: Record<string, string> = {
  AAPL: "Apple",
  NVDA: "NVIDIA",
  TSLA: "Tesla",
  MSFT: "Microsoft",
  AMZN: "Amazon",
  GOOGL: "Alphabet",
  GOOG: "Alphabet",
  META: "Meta Platforms",
  COST: "Costco",
};

const symbolAliases: Record<string, string> = {
  GOOGLE: "GOOGL",
  AMAZON: "AMZN",
  APPLE: "AAPL",
  MICROSOFT: "MSFT",
  TESLA: "TSLA",
  NVIDIA: "NVDA",
  FACEBOOK: "META",
};

function normalizeSymbol(value: string) {
  const uppercaseSymbol = value.trim().toUpperCase();

  return symbolAliases[uppercaseSymbol] || uppercaseSymbol;
}

function getStoredSymbolVariants(symbol: string) {
  const normalizedSymbol = normalizeSymbol(symbol);

  const aliases = Object.entries(symbolAliases)
    .filter(([, ticker]) => ticker === normalizedSymbol)
    .map(([alias]) => alias);

  return Array.from(new Set([normalizedSymbol, ...aliases]));
}

export default function DashboardPage() {
  const router = useRouter();
  const latestPortfolioRequest = useRef(0);

  const [name, setName] = useState("Trader");
  const [email, setEmail] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [unreadNotifications, setUnreadNotifications] =
    useState(0);

  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [stockError, setStockError] = useState("");
  const [removingSymbol, setRemovingSymbol] = useState<string | null>(null);

  const [portfolioSummary, setPortfolioSummary] =
    useState<PortfolioSummary | null>(null);

  const [portfolioHoldings, setPortfolioHoldings] =
    useState<PortfolioHolding[]>([]);

  const [portfolioAnalytics, setPortfolioAnalytics] =
    useState<PortfolioAnalytics | null>(null);

  const [portfolioAIAnalysis, setPortfolioAIAnalysis] =
    useState<PortfolioAIAnalysis | null>(null);
  const [loadingPortfolioAI, setLoadingPortfolioAI] =
    useState(false);
  const [portfolioAIError, setPortfolioAIError] =
    useState("");

  const [selectedAllocationSymbol, setSelectedAllocationSymbol] =
    useState<string | null>(null);

  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [portfolioError, setPortfolioError] = useState("");
  const [refreshingDashboard, setRefreshingDashboard] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [recentTransactions, setRecentTransactions] =
    useState<RecentTransaction[]>([]);
  const [loadingRecentTransactions, setLoadingRecentTransactions] =
    useState(true);
  const [recentTransactionsError, setRecentTransactionsError] =
    useState("");

  const [marketOverview, setMarketOverview] =
    useState<MarketOverview | null>(null);
  const [loadingMarketOverview, setLoadingMarketOverview] =
    useState(true);
  const [marketOverviewError, setMarketOverviewError] =
    useState("");

  const loadPortfolio = useCallback(async () => {
    const requestId = ++latestPortfolioRequest.current;

    try {
      setLoadingPortfolio(true);
      setPortfolioError("");

      const response = await fetch(
        `/api/portfolio?refresh=${Date.now()}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to load your portfolio."
        );
      }

      if (requestId !== latestPortfolioRequest.current) {
        return;
      }

      setPortfolioSummary({
        cashBalance: Number(data.summary?.cashBalance) || 0,
        portfolioValue: Number(data.summary?.portfolioValue) || 0,
        totalAccountValue:
          Number(data.summary?.totalAccountValue) || 0,
        totalInvested: Number(data.summary?.totalInvested) || 0,
        totalGainLoss: Number(data.summary?.totalGainLoss) || 0,
        totalGainLossPercent:
          Number(data.summary?.totalGainLossPercent) || 0,
        todayGainLoss: Number(data.summary?.todayGainLoss) || 0,
        todayGainLossPercent:
          Number(data.summary?.todayGainLossPercent) || 0,
      });

      setPortfolioHoldings(
        Array.isArray(data.holdings) ? data.holdings : []
      );

      setPortfolioAnalytics(
        data.analytics && typeof data.analytics === "object"
          ? (data.analytics as PortfolioAnalytics)
          : null
      );

      setLastUpdated(new Date());
    } catch (error) {
      if (requestId === latestPortfolioRequest.current) {
        setPortfolioError(
          error instanceof Error
            ? error.message
            : "Unable to load your portfolio."
        );
      }
    } finally {
      if (requestId === latestPortfolioRequest.current) {
        setLoadingPortfolio(false);
      }
    }
  }, []);

  const loadMarketOverview = useCallback(async () => {
    try {
      setLoadingMarketOverview(true);
      setMarketOverviewError("");

      const response = await fetch(
        `/api/market-overview?refresh=${Date.now()}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            "Cache-Control":
              "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load the market overview."
        );
      }

      setMarketOverview(data as MarketOverview);
    } catch (error) {
      setMarketOverviewError(
        error instanceof Error
          ? error.message
          : "Unable to load the market overview."
      );
    } finally {
      setLoadingMarketOverview(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    const supabase = createClient();

    try {
      setStockError("");
      setLoadingStocks(true);
      setLoadingRecentTransactions(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Trader";

      setName(fullName);
      setEmail(user.email || "");
      setCheckingAuth(false);

      const { data: watchlistData, error: watchlistError } =
        await supabase
          .from("watchlist")
          .select("symbol")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

      if (watchlistError) {
        throw watchlistError;
      }

      const rawRows = (watchlistData || []) as WatchlistRow[];

      const savedSymbols = Array.from(
        new Set(
          rawRows
            .map((item) => normalizeSymbol(item.symbol))
            .filter(Boolean)
        )
      );

      setWatchlistSymbols(savedSymbols);

      const {
        data: recentTransactionData,
        error: recentTransactionError,
      } = await supabase
        .from("transactions")
        .select(
          `
            id,
            symbol,
            transaction_type,
            shares,
            price,
            total_amount,
            realized_gain_loss,
            created_at
          `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentTransactionError) {
        setRecentTransactionsError(recentTransactionError.message);
      } else {
        setRecentTransactions(
          (recentTransactionData as RecentTransaction[]) ?? []
        );
        setRecentTransactionsError("");
      }

      setLoadingRecentTransactions(false);

      await loadPortfolio();

      if (savedSymbols.length === 0) {
        setStocks([]);
        return;
      }

      const stockRequests = savedSymbols.map(
        async (savedSymbol): Promise<Stock | null> => {
          try {
            const response = await fetch(
              `/api/stock-details?symbol=${encodeURIComponent(savedSymbol)}`,
              {
                cache: "no-store",
              }
            );

            const data = await response.json();

            if (!response.ok || !data.stock) {
              return null;
            }

            return data.stock as Stock;
          } catch {
            return null;
          }
        }
      );

      const stockResults = await Promise.all(stockRequests);

      const savedStocks = stockResults.filter(
        (stock): stock is Stock => stock !== null
      );

      setStocks(savedStocks);


      if (savedStocks.length === 0 && savedSymbols.length > 0) {
        setStockError(
          "None of your saved stocks could be loaded right now."
        );
      }
    } catch (error) {
      console.error("Dashboard loading error:", error);

      setStockError(
        error instanceof Error
          ? error.message
          : "Unable to load your watchlist."
      );
    } finally {
      setLoadingStocks(false);
      setCheckingAuth(false);
    }
  }, [loadPortfolio, router]);

  const refreshDashboard = useCallback(async () => {
    try {
      setRefreshingDashboard(true);
      await Promise.all([
        loadDashboard(),
        loadMarketOverview(),
      ]);
    } finally {
      setRefreshingDashboard(false);
    }
  }, [loadDashboard, loadMarketOverview]);

  const analyzePortfolio = useCallback(async () => {
    if (
      !portfolioSummary ||
      !portfolioAnalytics ||
      portfolioHoldings.length === 0
    ) {
      setPortfolioAIError(
        "Buy at least one stock before analyzing your portfolio."
      );
      return;
    }

    try {
      setLoadingPortfolioAI(true);
      setPortfolioAIError("");

      const response = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          mode: "portfolio",
          holdings: portfolioHoldings,
          summary: portfolioSummary,
          analytics: portfolioAnalytics,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.analysis) {
        throw new Error(
          data.error ||
            "Unable to analyze your portfolio."
        );
      }

      setPortfolioAIAnalysis(
        data.analysis as PortfolioAIAnalysis
      );
    } catch (error) {
      setPortfolioAIError(
        error instanceof Error
          ? error.message
          : "Unable to analyze your portfolio."
      );
    } finally {
      setLoadingPortfolioAI(false);
    }
  }, [
    portfolioAnalytics,
    portfolioHoldings,
    portfolioSummary,
  ]);

  const removeFromWatchlist = useCallback(
    async (symbol: string) => {
      const normalizedSymbol = normalizeSymbol(symbol);
      const supabase = createClient();

      try {
        setRemovingSymbol(normalizedSymbol);
        setStockError("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        const storedVariants = getStoredSymbolVariants(normalizedSymbol);

        const { error: deleteError } = await supabase
          .from("watchlist")
          .delete()
          .eq("user_id", user.id)
          .in("symbol", storedVariants);

        if (deleteError) {
          throw deleteError;
        }

        setWatchlistSymbols((currentSymbols) =>
          currentSymbols.filter(
            (savedSymbol) =>
              normalizeSymbol(savedSymbol) !== normalizedSymbol
          )
        );

        setStocks((currentStocks) =>
          currentStocks.filter(
            (savedStock) =>
              normalizeSymbol(savedStock.symbol) !== normalizedSymbol
          )
        );
      } catch (error) {
        console.error("Watchlist removal error:", error);

        setStockError(
          error instanceof Error
            ? error.message
            : `Unable to remove ${normalizedSymbol} from your watchlist.`
        );
      } finally {
        setRemovingSymbol(null);
      }
    },
    [router]
  );

  const loadUnreadNotifications = useCallback(async () => {
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUnreadNotifications(0);
        return;
      }

      const {
        count,
        error,
      } = await supabase
        .from("notifications")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) {
        console.warn(
          "Unable to load unread notifications:",
          error.message
        );
        return;
      }

      setUnreadNotifications(count || 0);
    } catch (error) {
      console.warn(
        "Unable to load unread notifications:",
        error
      );
    }
  }, []);

  useEffect(() => {
    loadUnreadNotifications();

    const notificationInterval =
      window.setInterval(() => {
        loadUnreadNotifications();
      }, 30_000);

    const refreshNotifications = () => {
      loadUnreadNotifications();
    };

    window.addEventListener(
      "focus",
      refreshNotifications
    );

    return () => {
      window.clearInterval(
        notificationInterval
      );

      window.removeEventListener(
        "focus",
        refreshNotifications
      );
    };
  }, [loadUnreadNotifications]);

  useEffect(() => {
    loadDashboard();
    loadMarketOverview();

    const dashboardInterval = window.setInterval(() => {
      loadDashboard();
      loadMarketOverview();
    }, 60000);

    return () => {
      window.clearInterval(dashboardInterval);
    };
  }, [loadDashboard, loadMarketOverview]);

  useEffect(() => {
    loadPortfolio();

    const portfolioInterval = window.setInterval(() => {
      loadPortfolio();
    }, 3000);

    const refreshPortfolio = () => {
      loadPortfolio();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadPortfolio();
      }
    };

    window.addEventListener("focus", refreshPortfolio);
    window.addEventListener("pageshow", refreshPortfolio);
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.clearInterval(portfolioInterval);
      window.removeEventListener("focus", refreshPortfolio);
      window.removeEventListener("pageshow", refreshPortfolio);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [loadPortfolio]);

  if (checkingAuth) {
    return (
      <main
        className="shell"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="card">
          <h2>Loading Norvexa...</h2>
          <p className="muted">Checking your account.</p>
        </div>
      </main>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="main">
        <div className="row">
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <h1 style={{ marginBottom: 5, marginTop: 0 }}>
                Hello, {name} 👋
              </h1>

              <Link
                href="/notifications"
                aria-label={
                  unreadNotifications > 0
                    ? `${unreadNotifications} unread notifications`
                    : "Open notifications"
                }
                title="Notifications"
                style={{
                  position: "relative",
                  width: "42px",
                  height: "42px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border:
                    unreadNotifications > 0
                      ? "1px solid rgba(96,165,250,0.42)"
                      : "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "12px",
                  background:
                    unreadNotifications > 0
                      ? "rgba(37,99,235,0.12)"
                      : "rgba(255,255,255,0.04)",
                  color: "white",
                  fontSize: "20px",
                  textDecoration: "none",
                }}
              >
                🔔

                {unreadNotifications > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-6px",
                      right: "-7px",
                      minWidth: "19px",
                      height: "19px",
                      padding: "0 5px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "999px",
                      border: "2px solid #07111f",
                      background: "#ef4444",
                      color: "white",
                      fontSize: "9px",
                      lineHeight: 1,
                      fontWeight: 900,
                      boxSizing: "border-box",
                    }}
                  >
                    {unreadNotifications > 99
                      ? "99+"
                      : unreadNotifications}
                  </span>
                )}
              </Link>
            </div>

            <p className="muted">
              {email
                ? `Signed in as ${email}`
                : "Here is what deserves your attention today."}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ textAlign: "right" }}>
              <div className="green" style={{ fontWeight: 750 }}>
                Live market data
              </div>

              <div
                className="muted"
                style={{ marginTop: "3px", fontSize: "12px" }}
              >
                {lastUpdated
                  ? `Updated ${formatUpdateTime(lastUpdated)}`
                  : loadingPortfolio
                    ? "Loading portfolio..."
                    : "Waiting for update"}
              </div>
            </div>

            <button
              type="button"
              onClick={refreshDashboard}
              disabled={refreshingDashboard}
              style={{
                padding: "9px 13px",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "9px",
                background: "rgba(255,255,255,0.04)",
                color: "#d1d5db",
                fontWeight: 750,
                cursor: refreshingDashboard ? "not-allowed" : "pointer",
                opacity: refreshingDashboard ? 0.65 : 1,
              }}
            >
              {refreshingDashboard ? "Refreshing..." : "Refresh dashboard"}
            </button>
          </div>
        </div>

        <PortfolioAISummary
          refreshKey={lastUpdated?.getTime() ?? 0}
        />

        <StockSearch />

        {portfolioError && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
              flexWrap: "wrap",
              marginTop: "14px",
              padding: "14px 16px",
              border: "1px solid rgba(255,107,107,0.32)",
              borderRadius: "12px",
              background: "rgba(255,107,107,0.08)",
            }}
          >
            <div>
              <strong style={{ color: "#ff8a8a" }}>
                Portfolio data could not refresh
              </strong>
              <p
                className="muted"
                style={{ margin: "5px 0 0", fontSize: "13px" }}
              >
                {portfolioError}
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadPortfolio()}
              style={{
                padding: "8px 12px",
                border: "1px solid rgba(255,107,107,0.35)",
                borderRadius: "9px",
                background: "transparent",
                color: "#ff8a8a",
                fontWeight: 750,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        )}

        {loadingPortfolio && !portfolioSummary && (
          <DashboardSummarySkeleton />
        )}

        <section
          className="card"
          style={{
            marginTop: "14px",
            padding: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                className="muted"
                style={{
                  margin: "0 0 5px",
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                U.S. market overview
              </p>

              <h2 style={{ margin: 0 }}>
                Market Snapshot
              </h2>
            </div>

            <MarketStatusBadge
              overview={marketOverview}
              loading={loadingMarketOverview}
            />
          </div>

          {marketOverviewError && (
            <div
              style={{
                marginTop: "16px",
                padding: "13px",
                borderRadius: "10px",
                border:
                  "1px solid rgba(255,107,107,0.3)",
                background:
                  "rgba(255,107,107,0.08)",
                color: "#ff8a8a",
              }}
            >
              {marketOverviewError}
            </div>
          )}

          {loadingMarketOverview &&
          !marketOverview ? (
            <MarketOverviewSkeleton />
          ) : (
            <div
              className="market-overview-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, minmax(0, 1fr))",
                gap: "12px",
                marginTop: "18px",
              }}
            >
              {(marketOverview?.markets ?? []).map(
                (market) => (
                  <MarketOverviewCard
                    key={market.symbol}
                    market={market}
                    onClick={() =>
                      router.push(
                        `/stock/${market.symbol}`
                      )
                    }
                  />
                )
              )}
            </div>
          )}

          <p
            className="muted"
            style={{
              margin: "14px 0 0",
              fontSize: "11px",
              lineHeight: 1.5,
            }}
          >
            {marketOverview?.note ??
              "Market cards use liquid ETFs as practical proxies for major U.S. indexes and volatility."}
          </p>
        </section>

        <div
          className="grid"
          style={{
            display: portfolioSummary ? undefined : "none",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "14px",
            marginTop: "14px",
          }}
        >
          <div className="card">
            <div className="row">
              <span className="muted">Total account value</span>

              <span
                className={
                  (portfolioSummary?.totalGainLossPercent ?? 0) >= 0
                    ? "green"
                    : ""
                }
                style={
                  (portfolioSummary?.totalGainLossPercent ?? 0) >= 0
                    ? undefined
                    : { color: "#ff6b6b" }
                }
              >
                {(portfolioSummary?.totalGainLossPercent ?? 0) >= 0 ? "▲" : "▼"}{" "}
                {Math.abs(
                  portfolioSummary?.totalGainLossPercent ?? 0
                ).toFixed(2)}
                %
              </span>
            </div>

            <div className="value">
              ${(portfolioSummary?.totalAccountValue ?? 0).toLocaleString(
                "en-US",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </div>

            <div
              className={
                (portfolioSummary?.todayGainLoss ?? 0) >= 0 ? "green" : ""
              }
              style={
                (portfolioSummary?.todayGainLoss ?? 0) >= 0
                  ? undefined
                  : { color: "#ff6b6b" }
              }
            >
              {(portfolioSummary?.todayGainLoss ?? 0) >= 0 ? "+" : "-"}$
              {Math.abs(
                portfolioSummary?.todayGainLoss ?? 0
              ).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              today (
              {(portfolioSummary?.todayGainLoss ?? 0) >= 0 ? "+" : ""}
              {(portfolioSummary?.todayGainLossPercent ?? 0).toFixed(2)}%)
            </div>
          </div>

          <div className="card">
            <span className="muted">Cash available</span>
            <div className="value" style={{ fontSize: "30px" }}>
              ${(portfolioSummary?.cashBalance ?? 0).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="muted" style={{ margin: "8px 0 0" }}>
              Available to buy stocks
            </p>
          </div>

          <div className="card">
            <span className="muted">Portfolio value</span>
            <div className="value" style={{ fontSize: "30px" }}>
              ${(portfolioSummary?.portfolioValue ?? 0).toLocaleString(
                "en-US",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </div>
            <p className="muted" style={{ margin: "8px 0 0" }}>
              {portfolioHoldings.length} holding
              {portfolioHoldings.length === 1 ? "" : "s"} · $
              {(portfolioSummary?.totalInvested ?? 0).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              invested
            </p>
          </div>

          <div className="card">
            <span className="muted">Total gain/loss</span>
            <div
              className="value"
              style={{
                fontSize: "30px",
                color:
                  (portfolioSummary?.totalGainLoss ?? 0) >= 0
                    ? "#22c55e"
                    : "#ff6b6b",
              }}
            >
              {(portfolioSummary?.totalGainLoss ?? 0) >= 0 ? "+" : "-"}$
              {Math.abs(
                portfolioSummary?.totalGainLoss ?? 0
              ).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p
              style={{
                margin: "8px 0 0",
                color:
                  (portfolioSummary?.totalGainLossPercent ?? 0) >= 0
                    ? "#22c55e"
                    : "#ff6b6b",
              }}
            >
              {(portfolioSummary?.totalGainLossPercent ?? 0) >= 0 ? "+" : ""}
              {(portfolioSummary?.totalGainLossPercent ?? 0).toFixed(2)}% all time
            </p>
          </div>
        </div>

        <PortfolioPerformanceChart
          key={[
            portfolioSummary?.totalAccountValue ?? 0,
            portfolioSummary?.cashBalance ?? 0,
            portfolioSummary?.portfolioValue ?? 0,
          ].join("-")}
          currentAccountValue={portfolioSummary?.totalAccountValue ?? 0}
        />

        <section
          id="analytics"
          style={{
            marginTop: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: "14px",
              flexWrap: "wrap",
              marginBottom: "14px",
            }}
          >
            <div>
              <p
                className="muted"
                style={{
                  margin: "0 0 5px",
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Portfolio intelligence
              </p>

              <h2 style={{ margin: 0 }}>Portfolio Analytics</h2>
            </div>

            <button
              type="button"
              onClick={loadPortfolio}
              style={{
                padding: "9px 13px",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "9px",
                background: "rgba(255,255,255,0.04)",
                color: "#d1d5db",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Refresh analytics
            </button>
          </div>

          {portfolioHoldings.length === 0 ? (
            <div
              className="card"
              style={{
                padding: "24px",
              }}
            >
              <h3 style={{ margin: "0 0 8px" }}>
                No open positions yet
              </h3>

              <p className="muted" style={{ margin: 0 }}>
                Buy a stock to unlock best performer, position size,
                win rate, and allocation analytics.
              </p>
            </div>
          ) : (
            <>
              <div
                className="grid"
                style={{
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(210px, 1fr))",
                  gap: "14px",
                }}
              >
                <AnalyticsCard
                  label="Best performer"
                  primary={
                    portfolioAnalytics?.bestPerformer?.symbol ?? "—"
                  }
                  secondary={
                    portfolioAnalytics?.bestPerformer
                      ? `${formatSignedPercent(
                          portfolioAnalytics.bestPerformer.gainLossPercent
                        )} · ${formatSignedCurrency(
                          portfolioAnalytics.bestPerformer.gainLoss
                        )}`
                      : "Not enough data"
                  }
                  tone="positive"
                />

                <AnalyticsCard
                  label="Worst performer"
                  primary={
                    portfolioAnalytics?.worstPerformer?.symbol ?? "—"
                  }
                  secondary={
                    portfolioAnalytics?.worstPerformer
                      ? `${formatSignedPercent(
                          portfolioAnalytics.worstPerformer.gainLossPercent
                        )} · ${formatSignedCurrency(
                          portfolioAnalytics.worstPerformer.gainLoss
                        )}`
                      : "Not enough data"
                  }
                  tone="negative"
                />

                <AnalyticsCard
                  label="Largest position"
                  primary={
                    portfolioAnalytics?.largestPosition?.symbol ?? "—"
                  }
                  secondary={
                    portfolioAnalytics?.largestPosition
                      ? `${portfolioAnalytics.largestPosition.allocationPercent.toFixed(
                          2
                        )}% of account · ${formatCurrency(
                          portfolioAnalytics.largestPosition.marketValue
                        )}`
                      : "No position data"
                  }
                />

                <AnalyticsCard
                  label="Win rate"
                  primary={`${(
                    portfolioAnalytics?.winRate ?? 0
                  ).toFixed(1)}%`}
                  secondary={`${portfolioAnalytics?.winningHoldingsCount ?? 0} winning · ${
                    portfolioAnalytics?.losingHoldingsCount ?? 0
                  } losing`}
                  tone={
                    (portfolioAnalytics?.winRate ?? 0) >= 50
                      ? "positive"
                      : "negative"
                  }
                />

                <AnalyticsCard
                  label="Unrealized P/L"
                  primary={formatSignedCurrency(
                    portfolioAnalytics?.unrealizedGainLoss ?? 0
                  )}
                  secondary="Current open positions"
                  tone={
                    (portfolioAnalytics?.unrealizedGainLoss ?? 0) >= 0
                      ? "positive"
                      : "negative"
                  }
                />

                <AnalyticsCard
                  label="Realized P/L"
                  primary={formatSignedCurrency(
                    portfolioAnalytics?.realizedGainLoss ?? 0
                  )}
                  secondary="Completed sell transactions"
                  tone={
                    (portfolioAnalytics?.realizedGainLoss ?? 0) >= 0
                      ? "positive"
                      : "negative"
                  }
                />

                <AnalyticsCard
                  label="Diversification"
                  primary={`${portfolioAnalytics?.diversificationCount ?? 0} stock${
                    (portfolioAnalytics?.diversificationCount ?? 0) === 1
                      ? ""
                      : "s"
                  }`}
                  secondary={`${(
                    portfolioAnalytics?.cashPercentage ?? 0
                  ).toFixed(1)}% cash · ${(
                    portfolioAnalytics?.stockPercentage ?? 0
                  ).toFixed(1)}% invested`}
                />

                <AnalyticsCard
                  label="Combined P/L"
                  primary={formatSignedCurrency(
                    portfolioAnalytics?.combinedGainLoss ?? 0
                  )}
                  secondary="Realized plus unrealized"
                  tone={
                    (portfolioAnalytics?.combinedGainLoss ?? 0) >= 0
                      ? "positive"
                      : "negative"
                  }
                />
              </div>

              <div
                className="card"
                style={{
                  marginTop: 14,
                  padding: "22px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0 }}>Portfolio Allocation</h3>

                    <p
                      className="muted"
                      style={{
                        margin: "6px 0 0",
                      }}
                    >
                      Interactive breakdown of cash and open positions.
                    </p>
                  </div>

                  <span className="muted">
                    {(portfolioAnalytics?.allocations?.length ?? 0).toLocaleString()} categories
                  </span>
                </div>

                <div
                  className="allocation-layout"
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(260px, 0.85fr) minmax(320px, 1.15fr)",
                    gap: "28px",
                    alignItems: "center",
                    marginTop: "24px",
                  }}
                >
                  <PortfolioAllocationDonut
                    allocations={portfolioAnalytics?.allocations ?? []}
                    selectedSymbol={selectedAllocationSymbol}
                    onSelect={setSelectedAllocationSymbol}
                  />

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "14px",
                    }}
                  >
                    {(portfolioAnalytics?.allocations ?? []).map(
                      (allocation) => (
                        <AllocationRow
                          key={allocation.symbol}
                          allocation={allocation}
                          selected={
                            selectedAllocationSymbol === allocation.symbol
                          }
                          onSelect={() =>
                            setSelectedAllocationSymbol((current) =>
                              current === allocation.symbol
                                ? null
                                : allocation.symbol
                            )
                          }
                        />
                      )
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        <section
          id="research"
          className="card"
          style={{
            marginTop: 14,
            padding: "24px",
            border:
              "1px solid rgba(96,165,250,0.24)",
            background:
              "linear-gradient(135deg, rgba(37,99,235,0.12), rgba(255,255,255,0.03))",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "18px",
              flexWrap: "wrap",
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

              <h2 style={{ margin: 0 }}>
                AI Portfolio Analysis
              </h2>

              <p
                className="muted"
                style={{
                  margin: "8px 0 0",
                  maxWidth: "680px",
                  lineHeight: 1.55,
                }}
              >
                Review concentration, cash allocation,
                diversification, winners, losers, and
                visible risk using your current paper
                portfolio.
              </p>
            </div>

            <button
              type="button"
              onClick={analyzePortfolio}
              disabled={
                loadingPortfolioAI ||
                portfolioHoldings.length === 0
              }
              style={{
                padding: "12px 18px",
                border: "none",
                borderRadius: "11px",
                background:
                  loadingPortfolioAI ||
                  portfolioHoldings.length === 0
                    ? "#374151"
                    : "#2563eb",
                color: "white",
                fontWeight: 800,
                cursor:
                  loadingPortfolioAI ||
                  portfolioHoldings.length === 0
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  portfolioHoldings.length === 0
                    ? 0.65
                    : 1,
              }}
            >
              {loadingPortfolioAI
                ? "Analyzing..."
                : portfolioAIAnalysis
                  ? "Refresh Analysis"
                  : "Analyze My Portfolio"}
            </button>
          </div>

          {portfolioHoldings.length === 0 && (
            <p
              className="muted"
              style={{
                margin: "18px 0 0",
              }}
            >
              Buy at least one stock to unlock the AI
              portfolio review.
            </p>
          )}

          {portfolioAIError && (
            <div
              style={{
                marginTop: "20px",
                padding: "14px",
                borderRadius: "11px",
                border:
                  "1px solid rgba(255,107,107,0.3)",
                background:
                  "rgba(255,107,107,0.08)",
                color: "#ff8a8a",
              }}
            >
              {portfolioAIError}
            </div>
          )}

          {portfolioAIAnalysis && (
            <PortfolioAIAnalysisPanel
              analysis={portfolioAIAnalysis}
            />
          )}
        </section>

        <div
          className="grid dashboard-two-column"
          style={{
            gridTemplateColumns: "1fr 1fr",
            marginTop: 14,
          }}
        >
          <div
            className="card"
            id="watchlist"
            style={{
              height: "520px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div className="row">
              <h3>My Watchlist</h3>

              <button
                type="button"
                onClick={loadDashboard}
                disabled={loadingStocks}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  color: "#22c55e",
                  cursor: loadingStocks
                    ? "not-allowed"
                    : "pointer",
                  opacity: loadingStocks ? 0.6 : 1,
                  font: "inherit",
                }}
              >
                {loadingStocks
                  ? "Refreshing..."
                  : "Refresh prices"}
              </button>
            </div>

            {stocks.length > 0 && (
              <WatchlistMovers stocks={stocks} />
            )}

            {loadingStocks && stocks.length === 0 && (
              <p className="muted">
                Loading your saved stocks...
              </p>
            )}

            {stockError && (
              <div
                style={{
                  marginTop: 14,
                  padding: 14,
                  borderRadius: 10,
                  border:
                    "1px solid rgba(255, 107, 107, 0.35)",
                  background:
                    "rgba(255, 107, 107, 0.08)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#ff6b6b",
                  }}
                >
                  {stockError}
                </p>

                <button
                  type="button"
                  onClick={loadDashboard}
                  style={{
                    marginTop: 10,
                    border: "none",
                    background: "transparent",
                    color: "#60a5fa",
                    cursor: "pointer",
                    padding: 0,
                    font: "inherit",
                    fontWeight: 600,
                  }}
                >
                  Try again
                </button>
              </div>
            )}

            {!loadingStocks &&
              !stockError &&
              watchlistSymbols.length === 0 && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 22,
                    borderRadius: 14,
                    border:
                      "1px solid rgba(255,255,255,0.1)",
                    background:
                      "rgba(255,255,255,0.03)",
                  }}
                >
                  <h4 style={{ margin: "0 0 8px" }}>
                    Your watchlist is empty
                  </h4>

                  <p
                    className="muted"
                    style={{ margin: "0 0 16px" }}
                  >
                    Search for a stock above, open its page,
                    and select “Add to Watchlist.”
                  </p>

                  <button
                    type="button"
                    onClick={() => router.push("/stock/AAPL")}
                    style={{
                      padding: "10px 16px",
                      border: "none",
                      borderRadius: 10,
                      background: "#2563eb",
                      color: "white",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Browse Apple stock
                  </button>
                </div>
              )}

            {!loadingStocks &&
              !stockError &&
              watchlistSymbols.length > 0 &&
              stocks.length === 0 && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 18,
                    borderRadius: 12,
                    border:
                      "1px solid rgba(255,255,255,0.1)",
                    background:
                      "rgba(255,255,255,0.03)",
                  }}
                >
                  <p
                    className="muted"
                    style={{ margin: 0 }}
                  >
                    Your saved stocks are not currently
                    available.
                  </p>
                </div>
              )}

            <div
              style={{
                overflowY: "auto",
                flex: 1,
                marginTop: "12px",
                paddingRight: "6px",
              }}
            >
              {!stockError &&
                stocks.map((stock) => {
                  const isPositive =
                    stock.changePercent >= 0;

                  const stockName =
                    stock.name ||
                    companyNames[stock.symbol] ||
                    stock.symbol;

                  const isRemoving =
                    removingSymbol === normalizeSymbol(stock.symbol);

                  return (
                    <div
                      key={stock.symbol}
                      className="stock-row"
                      role="link"
                      tabIndex={0}
                      onClick={() =>
                        router.push(`/stock/${stock.symbol}`)
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" ||
                          event.key === " "
                        ) {
                          event.preventDefault();
                          router.push(`/stock/${stock.symbol}`);
                        }
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "14px",
                        color: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <strong>{stock.symbol}</strong>

                        <div
                          className="muted"
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {stockName}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                          flexShrink: 0,
                        }}
                      >
                        <div style={{ textAlign: "right" }}>
                          <div>
                            ${stock.price.toFixed(2)}
                          </div>

                          <div
                            className={
                              isPositive ? "green" : ""
                            }
                            style={
                              isPositive
                                ? undefined
                                : { color: "#ff6b6b" }
                            }
                          >
                            {isPositive ? "+" : ""}
                            {stock.changePercent.toFixed(2)}%
                          </div>
                        </div>

                        <button
                          type="button"
                          aria-label={`Remove ${stock.symbol} from watchlist`}
                          title={`Remove ${stock.symbol}`}
                          disabled={isRemoving}
                          onClick={(event) => {
                            event.stopPropagation();
                            removeFromWatchlist(stock.symbol);
                          }}
                          style={{
                            minWidth: "76px",
                            padding: "8px 10px",
                            border:
                              "1px solid rgba(255,107,107,0.35)",
                            borderRadius: "9px",
                            background:
                              "rgba(255,107,107,0.08)",
                            color: "#ff8a8a",
                            fontSize: "13px",
                            fontWeight: 650,
                            cursor: isRemoving
                              ? "not-allowed"
                              : "pointer",
                            opacity: isRemoving ? 0.65 : 1,
                          }}
                        >
                          {isRemoving ? "Removing..." : "Remove"}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="card" id="portfolio">
            <h3>My Holdings</h3>

            {portfolioHoldings.length === 0 ? (
              <p className="muted">
                Buy a stock to start building your portfolio.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  marginTop: "14px",
                  maxHeight: "450px",
                  overflowY: "auto",
                }}
              >
                {portfolioHoldings.map((holding) => {
                  const positive = holding.gainLoss >= 0;

                  return (
                    <div
                      key={holding.symbol}
                      style={{
                        padding: "14px",
                        borderRadius: "12px",
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.03)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <strong>{holding.symbol}</strong>
                          <div className="muted">
                            {holding.shares} shares
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <strong>
                            ${holding.marketValue.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </strong>

                          <div
                            className={positive ? "green" : ""}
                            style={
                              positive
                                ? undefined
                                : { color: "#ff6b6b" }
                            }
                          >
                            {positive ? "+" : "-"}$
                            {Math.abs(
                              holding.gainLoss
                            ).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </div>
                      </div>

                      <div
                        className="muted"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginTop: "10px",
                          fontSize: "13px",
                        }}
                      >
                        <span>
                          Avg: ${holding.averageCost.toFixed(2)}
                        </span>

                        <span>
                          Current: ${holding.currentPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div
          className="grid dashboard-two-column"
          style={{
            gridTemplateColumns: "0.8fr 1.2fr",
            marginTop: 14,
            gap: "14px",
          }}
        >
          <section className="card" style={{ padding: "22px" }}>
            <div>
              <p
                className="muted"
                style={{
                  margin: "0 0 5px",
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Shortcuts
              </p>

              <h3 style={{ margin: 0 }}>Quick Actions</h3>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: "10px",
                marginTop: "18px",
              }}
            >
              <QuickActionButton
                label="Search Stocks"
                description="Find a company or ticker"
                onClick={() => {
                  const searchInput =
                    document.querySelector<HTMLInputElement>(
                      'input[type="search"], input[placeholder*="Search"]'
                    );

                  searchInput?.focus();
                  window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                }}
              />

              <QuickActionButton
                label="Browse Apple"
                description="Open a stock page"
                onClick={() => router.push("/stock/AAPL")}
              />

              <QuickActionButton
                label="View Activity"
                description="Review every trade"
                onClick={() => router.push("/activity")}
              />

              <QuickActionButton
                label="View Holdings"
                description="Jump to your portfolio"
                onClick={() => {
                  document
                    .getElementById("portfolio")
                    ?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                }}
              />
            </div>
          </section>

          <section className="card" style={{ padding: "22px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <p
                  className="muted"
                  style={{
                    margin: "0 0 5px",
                    fontSize: "13px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Latest trades
                </p>

                <h3 style={{ margin: 0 }}>Recent Activity</h3>
              </div>

              <button
                type="button"
                onClick={() => router.push("/activity")}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  color: "#60a5fa",
                  font: "inherit",
                  fontWeight: 750,
                  cursor: "pointer",
                }}
              >
                View all
              </button>
            </div>

            {loadingRecentTransactions ? (
              <div style={{ marginTop: "18px" }}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    style={{
                      height: "62px",
                      marginTop: index === 0 ? 0 : "10px",
                      borderRadius: "11px",
                      background: "rgba(255,255,255,0.05)",
                    }}
                  />
                ))}
              </div>
            ) : recentTransactionsError ? (
              <div
                style={{
                  marginTop: "18px",
                  padding: "13px",
                  borderRadius: "10px",
                  background: "rgba(255,107,107,0.08)",
                  color: "#ff8a8a",
                }}
              >
                {recentTransactionsError}
              </div>
            ) : recentTransactions.length === 0 ? (
              <p className="muted" style={{ margin: "18px 0 0" }}>
                Your latest buys and sells will appear here.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  marginTop: "18px",
                }}
              >
                {recentTransactions.map((transaction) => (
                  <RecentActivityRow
                    key={transaction.id}
                    transaction={transaction}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <div style={{ marginTop: 14 }}>
          <AIChat />
        </div>

        <style jsx>{`
          @media (max-width: 900px) {
            .allocation-layout,
            .dashboard-two-column {
              grid-template-columns: 1fr !important;
            }

            .market-overview-grid {
              grid-template-columns:
                repeat(2, minmax(0, 1fr)) !important;
            }

            section#analytics .card > div[style*="grid-template-columns"] {
              grid-template-columns: 1fr !important;
            }
          }

          @media (max-width: 640px) {
            .market-overview-grid {
              grid-template-columns: 1fr !important;
            }

            .main {
              padding-left: 14px !important;
              padding-right: 14px !important;
            }

            .value {
              overflow-wrap: anywhere;
            }

            .stock-row {
              align-items: flex-start !important;
            }
          }
        `}</style>
      </main>
    </div>
  );
}




function MarketStatusBadge({
  overview,
  loading,
}: {
  overview: MarketOverview | null;
  loading: boolean;
}) {
  const state =
    overview?.status.state ?? "closed";

  const color =
    state === "open"
      ? "#4ade80"
      : state === "pre-market"
        ? "#fbbf24"
        : state === "after-hours"
          ? "#60a5fa"
          : "#ff8a8a";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "9px",
        padding: "9px 12px",
        borderRadius: "999px",
        border: `1px solid ${color}55`,
        background: `${color}14`,
        color,
        fontSize: "13px",
        fontWeight: 800,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 12px ${color}`,
        }}
      />

      {loading && !overview
        ? "Checking market..."
        : overview?.status.label ??
          "Market status unavailable"}
    </div>
  );
}

function MarketOverviewCard({
  market,
  onClick,
}: {
  market: MarketOverviewItem;
  onClick: () => void;
}) {
  const positive = market.changePercent >= 0;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        padding: "15px",
        border:
          "1px solid rgba(255,255,255,0.08)",
        borderRadius: "12px",
        background: "rgba(255,255,255,0.03)",
        color: "inherit",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "10px",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <strong>{market.label}</strong>

          <div
            className="muted"
            style={{
              marginTop: "4px",
              fontSize: "11px",
              lineHeight: 1.35,
            }}
          >
            {market.symbol} · {market.description}
          </div>
        </div>

        {market.stale && (
          <span
            style={{
              color: "#fbbf24",
              fontSize: "10px",
              fontWeight: 750,
            }}
          >
            Cached
          </span>
        )}
      </div>

      <div
        style={{
          marginTop: "14px",
          fontSize: "22px",
          fontWeight: 850,
        }}
      >
        {formatCurrency(market.price)}
      </div>

      <div
        style={{
          marginTop: "5px",
          color: positive ? "#4ade80" : "#ff8a8a",
          fontWeight: 750,
          fontSize: "13px",
        }}
      >
        {positive ? "+" : ""}
        {market.change.toFixed(2)} (
        {positive ? "+" : ""}
        {market.changePercent.toFixed(2)}%)
      </div>
    </button>
  );
}

function MarketOverviewSkeleton() {
  return (
    <div
      className="market-overview-grid"
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(4, minmax(0, 1fr))",
        gap: "12px",
        marginTop: "18px",
      }}
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          style={{
            minHeight: "125px",
            borderRadius: "12px",
            background:
              "rgba(255,255,255,0.045)",
          }}
        />
      ))}
    </div>
  );
}

function WatchlistMovers({
  stocks,
}: {
  stocks: Stock[];
}) {
  const sorted = [...stocks].sort(
    (first, second) =>
      second.changePercent -
      first.changePercent
  );

  const gainer = sorted[0];
  const loser = sorted[sorted.length - 1];

  if (!gainer || !loser) {
    return null;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(2, minmax(0, 1fr))",
        gap: "9px",
        marginTop: "12px",
      }}
    >
      <div
        style={{
          padding: "10px",
          borderRadius: "10px",
          background: "rgba(34,197,94,0.08)",
        }}
      >
        <div
          className="muted"
          style={{ fontSize: "11px" }}
        >
          Top watchlist gainer
        </div>

        <strong
          style={{
            display: "block",
            marginTop: "5px",
            color: "#4ade80",
          }}
        >
          {gainer.symbol}{" "}
          {gainer.changePercent >= 0 ? "+" : ""}
          {gainer.changePercent.toFixed(2)}%
        </strong>
      </div>

      <div
        style={{
          padding: "10px",
          borderRadius: "10px",
          background: "rgba(239,68,68,0.08)",
        }}
      >
        <div
          className="muted"
          style={{ fontSize: "11px" }}
        >
          Top watchlist loser
        </div>

        <strong
          style={{
            display: "block",
            marginTop: "5px",
            color: "#ff8a8a",
          }}
        >
          {loser.symbol}{" "}
          {loser.changePercent >= 0 ? "+" : ""}
          {loser.changePercent.toFixed(2)}%
        </strong>
      </div>
    </div>
  );
}

function QuickActionButton({
  label,
  description,
  onClick,
}: {
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "14px",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: "12px",
        background: "rgba(255,255,255,0.035)",
        color: "inherit",
        textAlign: "left",
        cursor: "pointer",
        transition: "transform 160ms ease, border-color 160ms ease",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = "translateY(-2px)";
        event.currentTarget.style.borderColor =
          "rgba(96,165,250,0.4)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = "translateY(0)";
        event.currentTarget.style.borderColor =
          "rgba(255,255,255,0.09)";
      }}
    >
      <strong style={{ display: "block" }}>{label}</strong>

      <span
        className="muted"
        style={{
          display: "block",
          marginTop: "5px",
          fontSize: "12px",
          lineHeight: 1.4,
        }}
      >
        {description}
      </span>
    </button>
  );
}

function RecentActivityRow({
  transaction,
}: {
  transaction: RecentTransaction;
}) {
  const isBuy = transaction.transaction_type === "buy";
  const totalAmount = Number(transaction.total_amount);
  const shares = Number(transaction.shares);

  return (
    <button
      type="button"
      onClick={() => {
        window.location.href = `/stock/${transaction.symbol}`;
      }}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "14px",
        padding: "12px",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "11px",
        background: "rgba(255,255,255,0.025)",
        color: "inherit",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "11px",
          minWidth: 0,
        }}
      >
        <span
          style={{
            minWidth: "46px",
            padding: "5px 8px",
            borderRadius: "999px",
            background: isBuy
              ? "rgba(34,197,94,0.12)"
              : "rgba(239,68,68,0.12)",
            color: isBuy ? "#4ade80" : "#ff8a8a",
            fontSize: "11px",
            fontWeight: 850,
            textAlign: "center",
            textTransform: "uppercase",
          }}
        >
          {transaction.transaction_type}
        </span>

        <div style={{ minWidth: 0 }}>
          <strong>{transaction.symbol}</strong>

          <div
            className="muted"
            style={{
              marginTop: "3px",
              fontSize: "12px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {Number.isFinite(shares)
              ? shares.toLocaleString("en-US", {
                  maximumFractionDigits: 4,
                })
              : "0"}{" "}
            shares · {formatCompactDate(transaction.created_at)}
          </div>
        </div>
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <strong
          style={{
            color: isBuy ? "#ff8a8a" : "#4ade80",
          }}
        >
          {isBuy ? "-" : "+"}
          {formatCurrency(
            Number.isFinite(totalAmount) ? totalAmount : 0
          )}
        </strong>

        <div
          className="muted"
          style={{ marginTop: "3px", fontSize: "12px" }}
        >
          at {formatCurrency(Number(transaction.price))}
        </div>
      </div>
    </button>
  );
}

function formatCompactDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function DashboardSummarySkeleton() {
  return (
    <div
      className="grid"
      aria-label="Loading dashboard summary"
      style={{
        gridTemplateColumns:
          "repeat(auto-fit, minmax(210px, 1fr))",
        gap: "14px",
        marginTop: "14px",
      }}
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="card"
          style={{ minHeight: "132px", padding: "18px" }}
        >
          <div
            style={{
              width: "45%",
              height: "12px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.08)",
            }}
          />

          <div
            style={{
              width: "72%",
              height: "30px",
              marginTop: "20px",
              borderRadius: "9px",
              background: "rgba(255,255,255,0.1)",
            }}
          />

          <div
            style={{
              width: "58%",
              height: "11px",
              marginTop: "16px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.06)",
            }}
          />
        </div>
      ))}
    </div>
  );
}

function formatUpdateTime(value: Date) {
  return value.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function PortfolioAIAnalysisPanel({
  analysis,
}: {
  analysis: PortfolioAIAnalysis;
}) {
  const riskColor =
    analysis.riskLevel === "Low"
      ? "#4ade80"
      : analysis.riskLevel === "High"
        ? "#ff8a8a"
        : "#fbbf24";

  return (
    <div style={{ marginTop: "24px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "14px",
        }}
      >
        <div
          style={{
            padding: "18px",
            borderRadius: "14px",
            border:
              "1px solid rgba(255,255,255,0.1)",
            background:
              "rgba(255,255,255,0.04)",
          }}
        >
          <p className="muted" style={{ margin: 0 }}>
            Portfolio score
          </p>

          <p
            style={{
              margin: "9px 0 0",
              fontSize: "28px",
              fontWeight: 850,
              color: "#60a5fa",
            }}
          >
            {analysis.score.toFixed(0)}/100
          </p>
        </div>

        <div
          style={{
            padding: "18px",
            borderRadius: "14px",
            border:
              "1px solid rgba(255,255,255,0.1)",
            background:
              "rgba(255,255,255,0.04)",
          }}
        >
          <p className="muted" style={{ margin: 0 }}>
            Visible risk level
          </p>

          <p
            style={{
              margin: "9px 0 0",
              fontSize: "28px",
              fontWeight: 850,
              color: riskColor,
            }}
          >
            {analysis.riskLevel}
          </p>
        </div>
      </div>

      <div
        style={{
          marginTop: "14px",
          padding: "20px",
          borderRadius: "14px",
          border:
            "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <h3 style={{ margin: "0 0 10px" }}>
          {analysis.headline}
        </h3>

        <p
          style={{
            margin: 0,
            color: "#d1d5db",
            lineHeight: 1.7,
          }}
        >
          {analysis.summary}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "14px",
          marginTop: "14px",
        }}
      >
        <AIListCard
          title="Strengths"
          items={analysis.strengths}
          emptyText="No clear strengths were identified."
        />

        <AIListCard
          title="Risks to review"
          items={analysis.risks}
          emptyText="No clear risks were identified."
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "14px",
          marginTop: "14px",
        }}
      >
        <AITextCard
          title="Diversification"
          text={analysis.diversificationReview}
        />

        <AITextCard
          title="Cash allocation"
          text={analysis.cashReview}
        />

        <AITextCard
          title="Concentration"
          text={analysis.concentrationReview}
        />
      </div>

      <div
        style={{
          marginTop: "14px",
          padding: "20px",
          borderRadius: "14px",
          border:
            "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <h3 style={{ margin: "0 0 12px" }}>
          Educational next steps
        </h3>

        <ol
          style={{
            margin: 0,
            paddingLeft: "20px",
            color: "#d1d5db",
            lineHeight: 1.7,
          }}
        >
          {analysis.educationalNextSteps.map(
            (step, index) => (
              <li
                key={`${index}-${step}`}
                style={{ marginBottom: "8px" }}
              >
                {step}
              </li>
            )
          )}
        </ol>
      </div>

      <p
        className="muted"
        style={{
          margin: "16px 0 0",
          fontSize: "12px",
          lineHeight: 1.6,
        }}
      >
        {analysis.disclaimer}
      </p>
    </div>
  );
}

function AIListCard({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "14px",
        border:
          "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.04)",
      }}
    >
      <h3 style={{ margin: "0 0 12px" }}>
        {title}
      </h3>

      {items.length > 0 ? (
        <ul
          style={{
            margin: 0,
            paddingLeft: "20px",
            color: "#d1d5db",
            lineHeight: 1.7,
          }}
        >
          {items.map((item, index) => (
            <li
              key={`${index}-${item}`}
              style={{ marginBottom: "8px" }}
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          {emptyText}
        </p>
      )}
    </div>
  );
}

function AITextCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "14px",
        border:
          "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.04)",
      }}
    >
      <h3 style={{ margin: "0 0 10px" }}>
        {title}
      </h3>

      <p
        style={{
          margin: 0,
          color: "#d1d5db",
          lineHeight: 1.65,
        }}
      >
        {text}
      </p>
    </div>
  );
}


function AnalyticsCard({
  label,
  primary,
  secondary,
  tone = "neutral",
}: {
  label: string;
  primary: string;
  secondary: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const valueColor =
    tone === "positive"
      ? "#4ade80"
      : tone === "negative"
        ? "#ff8a8a"
        : "#f9fafb";

  return (
    <div
      className="card"
      style={{
        padding: "18px",
      }}
    >
      <p
        className="muted"
        style={{
          margin: 0,
          fontSize: "13px",
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: "9px 0 0",
          color: valueColor,
          fontSize: "24px",
          fontWeight: 850,
          letterSpacing: "-0.02em",
        }}
      >
        {primary}
      </p>

      <p
        className="muted"
        style={{
          margin: "7px 0 0",
          fontSize: "13px",
          lineHeight: 1.45,
        }}
      >
        {secondary}
      </p>
    </div>
  );
}

const allocationColors = [
  "#60a5fa",
  "#4ade80",
  "#fbbf24",
  "#f472b6",
  "#a78bfa",
  "#fb7185",
  "#22d3ee",
  "#fb923c",
  "#34d399",
  "#c084fc",
];

function PortfolioAllocationDonut({
  allocations,
  selectedSymbol,
  onSelect,
}: {
  allocations: PortfolioAllocation[];
  selectedSymbol: string | null;
  onSelect: (symbol: string | null) => void;
}) {
  const validAllocations = allocations.filter(
    (allocation) =>
      Number.isFinite(allocation.allocationPercent) &&
      allocation.allocationPercent > 0
  );

  let cursor = 0;

  const gradientStops = validAllocations.map(
    (allocation, index) => {
      const start = cursor;
      const end = cursor + allocation.allocationPercent;
      cursor = end;

      return `${allocationColors[index % allocationColors.length]} ${start}% ${end}%`;
    }
  );

  const selectedAllocation =
    validAllocations.find(
      (allocation) => allocation.symbol === selectedSymbol
    ) ?? null;

  const centerLabel = selectedAllocation
    ? selectedAllocation.symbol
    : "Account";

  const centerValue = selectedAllocation
    ? `${selectedAllocation.allocationPercent.toFixed(1)}%`
    : formatCurrency(
        validAllocations.reduce(
          (total, allocation) =>
            total + allocation.marketValue,
          0
        )
      );

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        role="img"
        aria-label="Interactive portfolio allocation donut chart"
        onClick={() => onSelect(null)}
        style={{
          position: "relative",
          width: "260px",
          height: "260px",
          borderRadius: "50%",
          background:
            gradientStops.length > 0
              ? `conic-gradient(${gradientStops.join(", ")})`
              : "rgba(255,255,255,0.08)",
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.08), 0 20px 45px rgba(0,0,0,0.22)",
          cursor: selectedAllocation ? "pointer" : "default",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "48px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            background: "#0d1828",
            border: "1px solid rgba(255,255,255,0.1)",
            textAlign: "center",
            padding: "18px",
          }}
        >
          <span
            className="muted"
            style={{
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            {centerLabel}
          </span>

          <strong
            style={{
              marginTop: "7px",
              fontSize: selectedAllocation ? "30px" : "22px",
              lineHeight: 1.1,
            }}
          >
            {centerValue}
          </strong>

          <span
            className="muted"
            style={{
              marginTop: "7px",
              fontSize: "12px",
            }}
          >
            {selectedAllocation
              ? formatCurrency(selectedAllocation.marketValue)
              : "Total allocation"}
          </span>
        </div>
      </div>
    </div>
  );
}

function AllocationRow({
  allocation,
  selected,
  onSelect,
}: {
  allocation: PortfolioAllocation;
  selected: boolean;
  onSelect: () => void;
}) {
  const width = Math.max(
    0,
    Math.min(100, allocation.allocationPercent)
  );

  const colorIndex = Math.abs(
    Array.from(allocation.symbol).reduce(
      (total, character) => total + character.charCodeAt(0),
      0
    )
  ) % allocationColors.length;

  const color = allocationColors[colorIndex];

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        width: "100%",
        padding: selected ? "13px" : "12px",
        border: selected
          ? `1px solid ${color}`
          : "1px solid rgba(255,255,255,0.07)",
        borderRadius: "12px",
        background: selected
          ? "rgba(255,255,255,0.06)"
          : "rgba(255,255,255,0.025)",
        color: "inherit",
        textAlign: "left",
        cursor: "pointer",
        transition: "all 180ms ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "9px",
            minWidth: 0,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: "10px",
              height: "10px",
              flexShrink: 0,
              borderRadius: "50%",
              background: color,
            }}
          />

          <div style={{ minWidth: 0 }}>
            <strong>{allocation.symbol}</strong>

            <span
              className="muted"
              style={{
                marginLeft: "8px",
                fontSize: "13px",
              }}
            >
              {allocation.name}
            </span>
          </div>
        </div>

        <div
          style={{
            textAlign: "right",
            flexShrink: 0,
          }}
        >
          <strong>
            {allocation.allocationPercent.toFixed(2)}%
          </strong>

          <span
            className="muted"
            style={{
              marginLeft: "8px",
              fontSize: "13px",
            }}
          >
            {formatCurrency(allocation.marketValue)}
          </span>
        </div>
      </div>

      <div
        style={{
          height: "9px",
          overflow: "hidden",
          borderRadius: "999px",
          background: "rgba(255,255,255,0.07)",
        }}
      >
        <div
          style={{
            width: `${width}%`,
            height: "100%",
            borderRadius: "999px",
            background: color,
            transition: "width 300ms ease",
          }}
        />
      </div>
    </button>
  );
}

function formatCurrency(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;

  return safeValue.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatSignedCurrency(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const sign = safeValue >= 0 ? "+" : "-";

  return `${sign}${formatCurrency(Math.abs(safeValue))}`;
}

function formatSignedPercent(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const sign = safeValue >= 0 ? "+" : "-";

  return `${sign}${Math.abs(safeValue).toFixed(2)}%`;
}