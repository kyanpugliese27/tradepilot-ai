"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import TradingViewChart from "@/components/TradingViewChart";
import AnalystCenter from "@/components/AnalystCenter";
import OwnershipCenter from "@/components/OwnershipCenter";
import ValuationCenter from "@/components/ValuationCenter";
import FinancialStatementsCenter from "@/components/FinancialStatementsCenter";
import AIResearchRatingCenter from "@/components/AIResearchRatingCenter";
import SECFilingsCenter from "@/components/SECFilingsCenter";
import CompetitorComparisonCenter from "@/components/CompetitorComparisonCenter";
import DividendCenter from "@/components/DividendCenter";
import WatchlistButton from "@/components/stock/WatchlistButton";
import BuyStockButton from "@/components/stock/BuyStockButton";
import SellStockButton from "@/components/stock/SellStockButton";

type Stock = {
  symbol: string;
  name?: string;
  logo?: string;
  exchange?: string;
  industry?: string;
  country?: string;
  currency?: string;
  website?: string;
  marketCapitalization?: number | null;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
};

type NewsArticle = {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
};

type AIAnalysis = {
  sentiment: "Bullish" | "Neutral" | "Bearish";
  score: number;
  summary: string;
  positiveFactors: string[];
  riskFactors: string[];
  strategy: string;
  disclaimer: string;
};

type PositionHolding = {
  symbol: string;
  shares: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  investedValue: number;
  gainLoss: number;
  gainLossPercent: number;
};

type PositionAllocation = {
  symbol: string;
  allocationPercent: number;
};

type StockPosition = PositionHolding & {
  allocationPercent: number;
};

type StockFundamentals = {
  symbol: string;
  metrics: {
    peRatio: number | null;
    eps: number | null;
    revenuePerShare: number | null;
    netProfitMargin: number | null;
    grossMargin: number | null;
    operatingMargin: number | null;
    week52High: number | null;
    week52Low: number | null;
    beta: number | null;
    dividendYield: number | null;
    averageVolume10Day: number | null;
    averageVolume3Month: number | null;
    marketCapitalization: number | null;
    priceToBook: number | null;
    currentRatio: number | null;
    debtToEquity: number | null;
    returnOnEquity: number | null;
  };
  peers: string[];
  updatedAt: string;
};

const companyNames: Record<string, string> = {
  AAPL: "Apple Inc.",
  NVDA: "NVIDIA Corporation",
  TSLA: "Tesla, Inc.",
  MSFT: "Microsoft Corporation",
};

export default function StockPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = params.symbol?.toUpperCase() || "";

  const [stock, setStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(true);
  const [stockError, setStockError] = useState("");

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [newsError, setNewsError] = useState("");

  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  const [position, setPosition] =
    useState<StockPosition | null>(null);
  const [loadingPosition, setLoadingPosition] =
    useState(true);
  const [positionError, setPositionError] =
    useState("");

  const [fundamentals, setFundamentals] =
    useState<StockFundamentals | null>(null);
  const [loadingFundamentals, setLoadingFundamentals] =
    useState(true);
  const [fundamentalsError, setFundamentalsError] =
    useState("");

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);
  const [refreshingPage, setRefreshingPage] =
    useState(false);

  const loadStock = useCallback(async () => {
    try {
      setStockError("");

      const response = await fetch(
        `/api/stock-details?symbol=${encodeURIComponent(
          symbol
        )}&refresh=${Date.now()}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control":
              "no-cache, no-store, must-revalidate",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Stock request failed."
        );
      }

      if (!data.stock) {
        throw new Error("Invalid stock data.");
      }

      setStock(data.stock as Stock);
      setLastUpdated(new Date());
    } catch (error) {
      setStockError(
        error instanceof Error
          ? error.message
          : `Unable to load live data for ${symbol}.`
      );
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    if (symbol) {
      loadStock();
    }

    const refreshInterval = window.setInterval(() => {
      if (symbol) {
        loadStock();
      }
    }, 60000);

    return () => {
      window.clearInterval(refreshInterval);
    };
  }, [loadStock, symbol]);

  useEffect(() => {
    async function loadNews() {
      try {
        setLoadingNews(true);
        setNewsError("");

        const response = await fetch(
          `/api/stock-news?symbol=${encodeURIComponent(symbol)}`,
          {
            cache: "no-store",
            headers: {
              "Cache-Control":
                "no-cache, no-store, must-revalidate",
            },
          }
        );

        if (!response.ok) {
          let message = `Unable to load news for ${symbol}.`;

          try {
            const errorData = await response.json();

            if (
              errorData &&
              typeof errorData.error === "string" &&
              errorData.error.trim()
            ) {
              message = errorData.error;
            }
          } catch {
            // Keep the normal fallback message when the API response is not JSON.
          }

          console.warn("Stock news unavailable:", message);

          setArticles([]);
          setNewsError(message);
          return;
        }

        const data = await response.json();

        if (!Array.isArray(data.articles)) {
          console.warn(
            "Stock news unavailable: the API returned an invalid articles list."
          );

          setArticles([]);
          setNewsError(`Unable to load news for ${symbol}.`);
          return;
        }

        setArticles(data.articles);
      } catch (error) {
        console.warn("Stock news unavailable:", error);

        setArticles([]);
        setNewsError(`Unable to load news for ${symbol}.`);
      } finally {
        setLoadingNews(false);
      }
    }

    if (symbol) {
      loadNews();
    } else {
      setArticles([]);
      setNewsError("");
      setLoadingNews(false);
    }
  }, [symbol]);

  const loadPosition = useCallback(async () => {
    try {
      setLoadingPosition(true);
      setPositionError("");

      const response = await fetch(
        `/api/portfolio?refresh=${Date.now()}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control":
              "no-cache, no-store, must-revalidate",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load your position."
        );
      }

      const holdings = Array.isArray(data.holdings)
        ? (data.holdings as PositionHolding[])
        : [];

      const allocations = Array.isArray(
        data.analytics?.allocations
      )
        ? (data.analytics
            .allocations as PositionAllocation[])
        : [];

      const holding =
        holdings.find(
          (item) =>
            item.symbol?.toUpperCase() === symbol
        ) ?? null;

      if (!holding) {
        setPosition(null);
        return;
      }

      const allocation = allocations.find(
        (item) =>
          item.symbol?.toUpperCase() === symbol
      );

      setPosition({
        ...holding,
        allocationPercent:
          Number(allocation?.allocationPercent) || 0,
      });
    } catch (error) {
      setPositionError(
        error instanceof Error
          ? error.message
          : "Unable to load your position."
      );
    } finally {
      setLoadingPosition(false);
    }
  }, [symbol]);

  const loadFundamentals = useCallback(async () => {
    try {
      setLoadingFundamentals(true);
      setFundamentalsError("");

      const response = await fetch(
        `/api/stock-fundamentals?symbol=${encodeURIComponent(
          symbol
        )}&refresh=${Date.now()}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control":
              "no-cache, no-store, must-revalidate",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load stock fundamentals."
        );
      }

      setFundamentals(
        data as StockFundamentals
      );
    } catch (error) {
      setFundamentalsError(
        error instanceof Error
          ? error.message
          : "Unable to load stock fundamentals."
      );
    } finally {
      setLoadingFundamentals(false);
    }
  }, [symbol]);

  useEffect(() => {
    if (!symbol) {
      return;
    }

    loadPosition();
    loadFundamentals();
  }, [
    loadFundamentals,
    loadPosition,
    symbol,
  ]);

  const refreshPage = useCallback(async () => {
    try {
      setRefreshingPage(true);

      await Promise.all([
        loadStock(),
        loadPosition(),
        loadFundamentals(),
      ]);
    } finally {
      setRefreshingPage(false);
    }
  }, [
    loadFundamentals,
    loadPosition,
    loadStock,
  ]);

  async function generateAnalysis() {
    if (!stock) {
      setAnalysisError("Stock data must load before analysis can begin.");
      return;
    }

    try {
      setLoadingAnalysis(true);
      setAnalysisError("");

      const response = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stock,
          articles,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI analysis request failed.");
      }

      if (!data.analysis) {
        throw new Error("The AI analysis was empty.");
      }

      setAnalysis(data.analysis);
    } catch (error) {
      console.error("AI analysis error:", error);

      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Unable to generate AI analysis."
      );
    } finally {
      setLoadingAnalysis(false);
    }
  }

  const isPositive = stock ? stock.changePercent >= 0 : false;

  const dayRangePercent = useMemo(() => {
    if (
      !stock ||
      !Number.isFinite(stock.high) ||
      !Number.isFinite(stock.low) ||
      stock.high <= stock.low
    ) {
      return 50;
    }

    return Math.max(
      0,
      Math.min(
        100,
        ((stock.price - stock.low) /
          (stock.high - stock.low)) *
          100
      )
    );
  }, [stock]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#07111f",
        color: "white",
        padding: "32px 24px",
      }}
    >
      <section
        style={{
          maxWidth: "1150px",
          margin: "0 auto",
        }}
      >
        <Link
          href="/dashboard"
          style={{
            display: "inline-block",
            marginBottom: "32px",
            padding: "10px 16px",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "10px",
            color: "#d1d5db",
            textDecoration: "none",
          }}
        >
          ← Back to Dashboard
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "22px",
          }}
        >
          <div
            style={{
              color: "#9ca3af",
              fontSize: "13px",
            }}
          >
            {lastUpdated
              ? `Quote updated ${lastUpdated.toLocaleTimeString(
                  "en-US",
                  {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  }
                )}`
              : "Waiting for the latest quote"}
          </div>

          <button
            type="button"
            onClick={refreshPage}
            disabled={refreshingPage}
            style={{
              padding: "9px 13px",
              border:
                "1px solid rgba(255,255,255,0.12)",
              borderRadius: "9px",
              background:
                "rgba(255,255,255,0.04)",
              color: "#d1d5db",
              fontWeight: 700,
              cursor: refreshingPage
                ? "not-allowed"
                : "pointer",
              opacity: refreshingPage ? 0.65 : 1,
            }}
          >
            {refreshingPage
              ? "Refreshing..."
              : "Refresh page"}
          </button>
        </div>

        {loading && (
          <div
            style={{
              padding: "30px",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "18px",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <h2>Loading {symbol}...</h2>

            <p style={{ color: "#9ca3af" }}>
              Getting the latest market price.
            </p>
          </div>
        )}

        {stockError && !loading && (
          <div
            style={{
              padding: "30px",
              border: "1px solid rgba(255,107,107,0.35)",
              borderRadius: "18px",
              background: "rgba(255,107,107,0.08)",
            }}
          >
            <h2 style={{ color: "#ff6b6b" }}>Stock unavailable</h2>
            <p>{stockError}</p>
          </div>
        )}

        {stock && !loading && !stockError && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "24px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "18px",
                }}
              >
                {stock.logo ? (
                  <img
                    src={stock.logo}
                    alt={`${stock.name || symbol} logo`}
                    style={{
                      width: "68px",
                      height: "68px",
                      objectFit: "contain",
                      borderRadius: "16px",
                      padding: "8px",
                      background: "white",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    style={{
                      width: "68px",
                      height: "68px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "16px",
                      background: "rgba(96,165,250,0.14)",
                      border: "1px solid rgba(96,165,250,0.25)",
                      color: "#60a5fa",
                      fontSize: "22px",
                      fontWeight: 800,
                    }}
                  >
                    {symbol.slice(0, 2)}
                  </div>
                )}

                <div>
                  <p
                    style={{
                      margin: "0 0 8px",
                      color: "#60a5fa",
                      fontSize: "14px",
                      fontWeight: 600,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    Stock overview
                  </p>

                  <h1
                    style={{
                      margin: 0,
                      fontSize: "44px",
                    }}
                  >
                    {symbol}
                  </h1>

                  <p
                    style={{
                      margin: "8px 0 0",
                      color: "#9ca3af",
                      fontSize: "18px",
                    }}
                  >
                    {stock.name || companyNames[symbol] || symbol}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: "16px",
                }}
              >
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "42px",
                      fontWeight: 700,
                    }}
                  >
                    ${stock.price.toFixed(2)}
                  </div>

                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "20px",
                      fontWeight: 600,
                      color: isPositive ? "#22c55e" : "#ff6b6b",
                    }}
                  >
                    {isPositive ? "+" : ""}
                    {stock.change.toFixed(2)}{" "}
                    ({isPositive ? "+" : ""}
                    {stock.changePercent.toFixed(2)}%)
                  </div>
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
                  <WatchlistButton symbol={symbol} />

                  <BuyStockButton
                    symbol={symbol}
                    companyName={
                      stock.name || companyNames[symbol] || symbol
                    }
                    currentPrice={stock.price}
                  />

                  <SellStockButton
                    symbol={symbol}
                    companyName={
                      stock.name || companyNames[symbol] || symbol
                    }
                    currentPrice={stock.price}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(190px, 1fr))",
                gap: "16px",
                marginTop: "34px",
              }}
            >
              <StockStat
                label="Open"
                value={`$${stock.open.toFixed(2)}`}
              />

              <StockStat
                label="Day High"
                value={`$${stock.high.toFixed(2)}`}
              />

              <StockStat
                label="Day Low"
                value={`$${stock.low.toFixed(2)}`}
              />

              <StockStat
                label="Previous Close"
                value={`$${stock.previousClose.toFixed(2)}`}
              />
            </div>

            <div
              style={{
                marginTop: "16px",
                padding: "16px 18px",
                border:
                  "1px solid rgba(255,255,255,0.08)",
                borderRadius: "14px",
                background:
                  "rgba(255,255,255,0.025)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  color: "#9ca3af",
                  fontSize: "13px",
                }}
              >
                <span>
                  Day low ${stock.low.toFixed(2)}
                </span>
                <span>
                  Day high ${stock.high.toFixed(2)}
                </span>
              </div>

              <div
                style={{
                  position: "relative",
                  height: "8px",
                  marginTop: "10px",
                  borderRadius: "999px",
                  background:
                    "rgba(255,255,255,0.08)",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: `${dayRangePercent}%`,
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    background: "#60a5fa",
                    border: "2px solid #07111f",
                    transform:
                      "translate(-50%, -50%)",
                    boxShadow:
                      "0 0 12px rgba(96,165,250,0.7)",
                  }}
                />
              </div>
            </div>

            <section
              style={{
                marginTop: "18px",
                padding: "24px",
                border:
                  "1px solid rgba(74,222,128,0.2)",
                borderRadius: "18px",
                background:
                  "linear-gradient(135deg, rgba(34,197,94,0.1), rgba(255,255,255,0.03))",
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
                    style={{
                      margin: "0 0 6px",
                      color: "#4ade80",
                      fontSize: "13px",
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    Personalized portfolio
                  </p>

                  <h2 style={{ margin: 0 }}>
                    Your Position
                  </h2>
                </div>

                {position && (
                  <span
                    style={{
                      padding: "7px 10px",
                      borderRadius: "999px",
                      background:
                        position.gainLoss >= 0
                          ? "rgba(34,197,94,0.12)"
                          : "rgba(239,68,68,0.12)",
                      color:
                        position.gainLoss >= 0
                          ? "#4ade80"
                          : "#ff8a8a",
                      fontSize: "12px",
                      fontWeight: 800,
                    }}
                  >
                    {formatSignedPercent(
                      position.gainLossPercent
                    )}
                  </span>
                )}
              </div>

              {loadingPosition ? (
                <PositionSkeleton />
              ) : positionError ? (
                <InlineError message={positionError} />
              ) : !position ? (
                <div
                  style={{
                    marginTop: "18px",
                    padding: "18px",
                    borderRadius: "12px",
                    background:
                      "rgba(255,255,255,0.035)",
                  }}
                >
                  <strong>
                    You do not currently own {symbol}.
                  </strong>

                  <p
                    style={{
                      margin: "7px 0 0",
                      color: "#9ca3af",
                    }}
                  >
                    Use the Buy button above to create a
                    paper-trading position.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(175px, 1fr))",
                    gap: "12px",
                    marginTop: "18px",
                  }}
                >
                  <PositionStat
                    label="Shares owned"
                    value={formatShares(position.shares)}
                  />

                  <PositionStat
                    label="Average cost"
                    value={formatCurrency(
                      position.averageCost
                    )}
                  />

                  <PositionStat
                    label="Current value"
                    value={formatCurrency(
                      position.marketValue
                    )}
                  />

                  <PositionStat
                    label="Cost basis"
                    value={formatCurrency(
                      position.investedValue
                    )}
                  />

                  <PositionStat
                    label="Unrealized P/L"
                    value={formatSignedCurrency(
                      position.gainLoss
                    )}
                    valueColor={
                      position.gainLoss >= 0
                        ? "#4ade80"
                        : "#ff8a8a"
                    }
                  />

                  <PositionStat
                    label="Portfolio weight"
                    value={`${position.allocationPercent.toFixed(
                      2
                    )}%`}
                  />
                </div>
              )}
            </section>

            <section
              style={{
                marginTop: "18px",
                padding: "24px",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "18px",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "16px",
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
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    Company profile
                  </p>

                  <h2 style={{ margin: 0, fontSize: "24px" }}>
                    About {stock.name || symbol}
                  </h2>
                </div>

                {stock.website && (
                  <a
                    href={stock.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "10px 14px",
                      border: "1px solid rgba(96,165,250,0.3)",
                      borderRadius: "10px",
                      color: "#60a5fa",
                      textDecoration: "none",
                      fontWeight: 650,
                    }}
                  >
                    Visit website ↗
                  </a>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "14px",
                }}
              >
                <CompanyInfoItem
                  label="Exchange"
                  value={stock.exchange || "Not available"}
                />

                <CompanyInfoItem
                  label="Industry"
                  value={stock.industry || "Not available"}
                />

                <CompanyInfoItem
                  label="Country"
                  value={stock.country || "Not available"}
                />

                <CompanyInfoItem
                  label="Currency"
                  value={stock.currency || "USD"}
                />

                <CompanyInfoItem
                  label="Market cap"
                  value={formatMarketCap(
                    stock.marketCapitalization,
                    stock.currency
                  )}
                />
              </div>
            </section>

            <section
              style={{
                marginTop: "18px",
                padding: "24px",
                border:
                  "1px solid rgba(255,255,255,0.1)",
                borderRadius: "18px",
                background:
                  "rgba(255,255,255,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "14px",
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
                    Financial snapshot
                  </p>

                  <h2 style={{ margin: 0 }}>
                    Key Fundamentals
                  </h2>
                </div>

                <span
                  style={{
                    color: "#9ca3af",
                    fontSize: "12px",
                  }}
                >
                  TTM or latest available period
                </span>
              </div>

              {loadingFundamentals ? (
                <FundamentalsSkeleton />
              ) : fundamentalsError ? (
                <InlineError
                  message={fundamentalsError}
                />
              ) : fundamentals ? (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(170px, 1fr))",
                      gap: "12px",
                      marginTop: "18px",
                    }}
                  >
                    <FundamentalStat
                      label="P/E ratio"
                      value={formatNullableNumber(
                        fundamentals.metrics.peRatio
                      )}
                    />

                    <FundamentalStat
                      label="EPS"
                      value={formatNullableCurrency(
                        fundamentals.metrics.eps
                      )}
                    />

                    <FundamentalStat
                      label="52-week high"
                      value={formatNullableCurrency(
                        fundamentals.metrics.week52High
                      )}
                    />

                    <FundamentalStat
                      label="52-week low"
                      value={formatNullableCurrency(
                        fundamentals.metrics.week52Low
                      )}
                    />

                    <FundamentalStat
                      label="Beta"
                      value={formatNullableNumber(
                        fundamentals.metrics.beta
                      )}
                    />

                    <FundamentalStat
                      label="Dividend yield"
                      value={formatNullablePercent(
                        fundamentals.metrics
                          .dividendYield
                      )}
                    />

                    <FundamentalStat
                      label="Net margin"
                      value={formatNullablePercent(
                        fundamentals.metrics
                          .netProfitMargin
                      )}
                    />

                    <FundamentalStat
                      label="Gross margin"
                      value={formatNullablePercent(
                        fundamentals.metrics
                          .grossMargin
                      )}
                    />

                    <FundamentalStat
                      label="Operating margin"
                      value={formatNullablePercent(
                        fundamentals.metrics
                          .operatingMargin
                      )}
                    />

                    <FundamentalStat
                      label="Price / book"
                      value={formatNullableNumber(
                        fundamentals.metrics
                          .priceToBook
                      )}
                    />

                    <FundamentalStat
                      label="Current ratio"
                      value={formatNullableNumber(
                        fundamentals.metrics
                          .currentRatio
                      )}
                    />

                    <FundamentalStat
                      label="Return on equity"
                      value={formatNullablePercent(
                        fundamentals.metrics
                          .returnOnEquity
                      )}
                    />

                    <FundamentalStat
                      label="10-day avg volume"
                      value={formatNullableVolume(
                        fundamentals.metrics
                          .averageVolume10Day
                      )}
                    />

                    <FundamentalStat
                      label="3-month avg volume"
                      value={formatNullableVolume(
                        fundamentals.metrics
                          .averageVolume3Month
                      )}
                    />
                  </div>

                  {fundamentals.peers.length > 0 && (
                    <div style={{ marginTop: "22px" }}>
                      <h3
                        style={{
                          margin: "0 0 12px",
                          fontSize: "17px",
                        }}
                      >
                        Related companies
                      </h3>

                      <div
                        style={{
                          display: "flex",
                          gap: "9px",
                          flexWrap: "wrap",
                        }}
                      >
                        {fundamentals.peers.map(
                          (peer) => (
                            <Link
                              key={peer}
                              href={`/stock/${peer}`}
                              style={{
                                padding: "8px 11px",
                                border:
                                  "1px solid rgba(96,165,250,0.22)",
                                borderRadius: "999px",
                                background:
                                  "rgba(37,99,235,0.08)",
                                color: "#93c5fd",
                                textDecoration: "none",
                                fontSize: "13px",
                                fontWeight: 750,
                              }}
                            >
                              {peer}
                            </Link>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </section>

            <div
              style={{
                marginTop: "18px",
                height: "560px",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "18px",
                background: "#111c2c",
              }}
            >
              <TradingViewChart symbol={symbol} />
            </div>

            <p
              style={{
                marginTop: "16px",
                color: "#6b7280",
                fontSize: "13px",
              }}
            >
              Live quote data refreshes automatically every 60 seconds.
            </p>

            <section
              style={{
                marginTop: "36px",
                padding: "28px",
                border: "1px solid rgba(96,165,250,0.25)",
                borderRadius: "20px",
                background:
                  "linear-gradient(135deg, rgba(37,99,235,0.12), rgba(255,255,255,0.04))",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "20px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <p
                    style={{
                      margin: "0 0 7px",
                      color: "#60a5fa",
                      fontSize: "13px",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    Norvexa intelligence
                  </p>

                  <h2
                    style={{
                      margin: 0,
                      fontSize: "28px",
                    }}
                  >
                    AI Stock Analysis
                  </h2>

                  <p
                    style={{
                      margin: "8px 0 0",
                      color: "#9ca3af",
                      lineHeight: 1.5,
                    }}
                  >
                    Analyze the current quote and recent company news for{" "}
                    {symbol}.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={generateAnalysis}
                  disabled={loadingAnalysis || loadingNews || !stock}
                  style={{
                    padding: "13px 20px",
                    border: "none",
                    borderRadius: "12px",
                    background: loadingAnalysis ? "#374151" : "#2563eb",
                    color: "white",
                    fontSize: "15px",
                    fontWeight: 700,
                    cursor:
                      loadingAnalysis || loadingNews
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      loadingAnalysis || loadingNews ? 0.75 : 1,
                  }}
                >
                  {loadingAnalysis
                    ? "Analyzing..."
                    : loadingNews
                      ? "Loading News..."
                      : analysis
                        ? "Refresh Analysis"
                        : "Generate AI Analysis"}
                </button>
              </div>

              {analysisError && (
                <div
                  style={{
                    marginTop: "22px",
                    padding: "16px",
                    border: "1px solid rgba(255,107,107,0.35)",
                    borderRadius: "12px",
                    background: "rgba(255,107,107,0.08)",
                    color: "#ff8a8a",
                  }}
                >
                  {analysisError}
                </div>
              )}

              {loadingAnalysis && (
                <div
                  style={{
                    marginTop: "24px",
                    padding: "22px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "14px",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#d1d5db",
                      fontWeight: 600,
                    }}
                  >
                    Norvexa is reviewing {symbol}...
                  </p>

                  <p
                    style={{
                      margin: "8px 0 0",
                      color: "#9ca3af",
                    }}
                  >
                    This may take several seconds.
                  </p>
                </div>
              )}

              {analysis && !loadingAnalysis && (
                <AIAnalysisPanel analysis={analysis} />
              )}
            </section>

            <AnalystCenter symbol={symbol} />

            <OwnershipCenter symbol={symbol} />

            <ValuationCenter symbol={symbol} />

            <FinancialStatementsCenter symbol={symbol} />

            <SECFilingsCenter symbol={symbol} />

            <CompetitorComparisonCenter symbol={symbol} />

            <DividendCenter symbol={symbol} />

            <AIResearchRatingCenter symbol={symbol} />

            <section
              style={{
                marginTop: "42px",
                paddingBottom: "50px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "16px",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <p
                    style={{
                      margin: "0 0 6px",
                      color: "#60a5fa",
                      fontSize: "13px",
                      fontWeight: 600,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    Latest updates
                  </p>

                  <h2
                    style={{
                      margin: 0,
                      fontSize: "28px",
                    }}
                  >
                    {symbol} News
                  </h2>
                </div>

                <span
                  style={{
                    color: "#9ca3af",
                    fontSize: "14px",
                  }}
                >
                  Last 7 days
                </span>
              </div>

              {loadingNews && (
                <div
                  style={{
                    padding: "24px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "18px",
                    background: "rgba(255,255,255,0.04)",
                  }}
                >
                  <p style={{ margin: 0, color: "#9ca3af" }}>
                    Loading the latest company news...
                  </p>
                </div>
              )}

              {newsError && !loadingNews && (
                <div
                  style={{
                    padding: "24px",
                    border: "1px solid rgba(255,107,107,0.35)",
                    borderRadius: "18px",
                    background: "rgba(255,107,107,0.08)",
                  }}
                >
                  <p style={{ margin: 0, color: "#ff6b6b" }}>
                    {newsError}
                  </p>
                </div>
              )}

              {!loadingNews &&
                !newsError &&
                articles.length === 0 && (
                  <div
                    style={{
                      padding: "24px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "18px",
                      background: "rgba(255,255,255,0.04)",
                    }}
                  >
                    <p style={{ margin: 0, color: "#9ca3af" }}>
                      No recent news was found for {symbol}.
                    </p>
                  </div>
                )}

              {!loadingNews &&
                !newsError &&
                articles.length > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(300px, 1fr))",
                      gap: "18px",
                    }}
                  >
                    {articles.map((article) => (
                      <NewsCard
                        key={article.id}
                        article={article}
                      />
                    ))}
                  </div>
                )}
            </section>
          </>
        )}
      </section>

      <style jsx>{`
        @media (max-width: 720px) {
          main {
            padding-left: 14px !important;
            padding-right: 14px !important;
          }

          h1 {
            font-size: 36px !important;
          }
        }
      `}</style>
    </main>
  );
}


function PositionSkeleton() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit, minmax(175px, 1fr))",
        gap: "12px",
        marginTop: "18px",
      }}
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          style={{
            height: "86px",
            borderRadius: "12px",
            background:
              "rgba(255,255,255,0.045)",
          }}
        />
      ))}
    </div>
  );
}

function FundamentalsSkeleton() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit, minmax(170px, 1fr))",
        gap: "12px",
        marginTop: "18px",
      }}
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          style={{
            height: "82px",
            borderRadius: "12px",
            background:
              "rgba(255,255,255,0.045)",
          }}
        />
      ))}
    </div>
  );
}

function InlineError({
  message,
}: {
  message: string;
}) {
  return (
    <div
      style={{
        marginTop: "18px",
        padding: "14px",
        border:
          "1px solid rgba(255,107,107,0.3)",
        borderRadius: "11px",
        background:
          "rgba(255,107,107,0.08)",
        color: "#ff8a8a",
      }}
    >
      {message}
    </div>
  );
}

function PositionStat({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        padding: "15px",
        borderRadius: "12px",
        border:
          "1px solid rgba(255,255,255,0.08)",
        background:
          "rgba(255,255,255,0.035)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#9ca3af",
          fontSize: "12px",
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: "7px 0 0",
          color: valueColor || "#f9fafb",
          fontSize: "18px",
          fontWeight: 800,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function FundamentalStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: "15px",
        borderRadius: "12px",
        border:
          "1px solid rgba(255,255,255,0.08)",
        background:
          "rgba(255,255,255,0.025)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#9ca3af",
          fontSize: "12px",
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: "7px 0 0",
          fontSize: "17px",
          fontWeight: 750,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function formatCurrency(value: number) {
  const safeValue = Number.isFinite(value)
    ? value
    : 0;

  return safeValue.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatSignedCurrency(value: number) {
  const sign = value >= 0 ? "+" : "-";

  return `${sign}${formatCurrency(
    Math.abs(value)
  )}`;
}

function formatSignedPercent(value: number) {
  const safeValue = Number.isFinite(value)
    ? value
    : 0;

  return `${safeValue >= 0 ? "+" : "-"}${Math.abs(
    safeValue
  ).toFixed(2)}%`;
}

function formatShares(value: number) {
  return Number(value).toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });
}

function formatNullableNumber(
  value: number | null
) {
  return value === null || !Number.isFinite(value)
    ? "Not available"
    : value.toLocaleString("en-US", {
        maximumFractionDigits: 2,
      });
}

function formatNullableCurrency(
  value: number | null
) {
  return value === null || !Number.isFinite(value)
    ? "Not available"
    : formatCurrency(value);
}

function formatNullablePercent(
  value: number | null
) {
  return value === null || !Number.isFinite(value)
    ? "Not available"
    : `${value.toFixed(2)}%`;
}

function formatNullableVolume(
  value: number | null
) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "Not available";
  }

  /*
   * Finnhub trading-volume metrics are commonly
   * expressed in millions of shares.
   */
  const shares = value * 1_000_000;

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(shares);
}

function formatRelativeTime(
  unixSeconds: number
) {
  const published = new Date(
    unixSeconds * 1000
  );

  if (Number.isNaN(published.getTime())) {
    return "Unknown time";
  }

  const difference =
    Date.now() - published.getTime();

  const minutes = Math.floor(
    difference / 60_000
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return published.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function formatMarketCap(
  marketCapitalization?: number | null,
  currency = "USD"
) {
  if (
    marketCapitalization === null ||
    marketCapitalization === undefined ||
    !Number.isFinite(marketCapitalization)
  ) {
    return "Not available";
  }

  // Finnhub returns market capitalization in millions.
  const value = marketCapitalization * 1_000_000;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function CompanyInfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "14px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.025)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#9ca3af",
          fontSize: "13px",
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: "7px 0 0",
          color: "#f3f4f6",
          fontSize: "15px",
          fontWeight: 650,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function StockStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: "22px",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "18px",
        background: "rgba(255,255,255,0.04)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#9ca3af",
          fontSize: "14px",
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: "10px 0 0",
          fontSize: "26px",
          fontWeight: 650,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function NewsCard({
  article,
}: {
  article: NewsArticle;
}) {
  const publishedDate = formatRelativeTime(
    article.datetime
  );

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "18px",
        background: "rgba(255,255,255,0.04)",
        color: "white",
        textDecoration: "none",
      }}
    >
      {article.image && (
        <img
          src={article.image}
          alt={article.headline}
          style={{
            width: "100%",
            height: "180px",
            objectFit: "cover",
            background: "#111c2c",
          }}
        />
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            color: "#9ca3af",
            fontSize: "13px",
          }}
        >
          <span>{article.source || "News"}</span>
          <span>{publishedDate}</span>
        </div>

        <h3
          style={{
            margin: "14px 0 10px",
            fontSize: "19px",
            lineHeight: 1.35,
          }}
        >
          {article.headline}
        </h3>

        {article.summary && (
          <p
            style={{
              margin: "0 0 18px",
              color: "#9ca3af",
              lineHeight: 1.55,
              fontSize: "14px",
            }}
          >
            {article.summary.length > 180
              ? `${article.summary.slice(0, 180)}...`
              : article.summary}
          </p>
        )}

        <span
          style={{
            marginTop: "auto",
            color: "#60a5fa",
            fontWeight: 600,
            fontSize: "14px",
          }}
        >
          Read full article →
        </span>
      </div>
    </a>
  );
}

function AIAnalysisPanel({
  analysis,
}: {
  analysis: AIAnalysis;
}) {
  const sentimentColor =
    analysis.sentiment === "Bullish"
      ? "#22c55e"
      : analysis.sentiment === "Bearish"
        ? "#ff6b6b"
        : "#fbbf24";

  const positiveFactors = Array.isArray(analysis.positiveFactors)
    ? analysis.positiveFactors
    : [];

  const riskFactors = Array.isArray(analysis.riskFactors)
    ? analysis.riskFactors
    : [];

  return (
    <div
      style={{
        marginTop: "26px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        <div
          style={{
            padding: "20px",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "16px",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#9ca3af",
              fontSize: "14px",
            }}
          >
            Market sentiment
          </p>

          <p
            style={{
              margin: "10px 0 0",
              color: sentimentColor,
              fontSize: "27px",
              fontWeight: 750,
            }}
          >
            {analysis.sentiment}
          </p>
        </div>

        <div
          style={{
            padding: "20px",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "16px",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#9ca3af",
              fontSize: "14px",
            }}
          >
            Analysis score
          </p>

          <p
            style={{
              margin: "10px 0 0",
              color: sentimentColor,
              fontSize: "27px",
              fontWeight: 750,
            }}
          >
            {analysis.score}/100
          </p>

          <div
            style={{
              height: "9px",
              marginTop: "13px",
              overflow: "hidden",
              borderRadius: "999px",
              background:
                "rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                width: `${Math.max(
                  0,
                  Math.min(100, analysis.score)
                )}%`,
                height: "100%",
                borderRadius: "999px",
                background: sentimentColor,
                transition: "width 300ms ease",
              }}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "16px",
          padding: "22px",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "16px",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <h3
          style={{
            margin: "0 0 10px",
            fontSize: "19px",
          }}
        >
          Summary
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
          gap: "16px",
          marginTop: "16px",
        }}
      >
        <AnalysisList
          title="Positive Factors"
          items={positiveFactors}
        />

        <AnalysisList
          title="Risk Factors"
          items={riskFactors}
        />
      </div>

      <div
        style={{
          marginTop: "16px",
          padding: "22px",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "16px",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <h3
          style={{
            margin: "0 0 10px",
            fontSize: "19px",
          }}
        >
          Educational Strategy
        </h3>

        <p
          style={{
            margin: 0,
            color: "#d1d5db",
            lineHeight: 1.7,
          }}
        >
          {analysis.strategy}
        </p>
      </div>

      <p
        style={{
          margin: "18px 0 0",
          color: "#6b7280",
          fontSize: "12px",
          lineHeight: 1.6,
        }}
      >
        {analysis.disclaimer}
      </p>
    </div>
  );
}

function AnalysisList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div
      style={{
        padding: "22px",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "16px",
        background: "rgba(255,255,255,0.04)",
      }}
    >
      <h3
        style={{
          margin: "0 0 14px",
          fontSize: "19px",
        }}
      >
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
              key={`${title}-${index}`}
              style={{
                marginBottom: "8px",
              }}
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p
          style={{
            margin: 0,
            color: "#9ca3af",
          }}
        >
          No factors were returned.
        </p>
      )}
    </div>
  );
}