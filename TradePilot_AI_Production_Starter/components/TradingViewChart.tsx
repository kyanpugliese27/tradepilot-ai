"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";

type TradingViewChartProps = {
  symbol: string;
};

type ChartInterval = {
  label: string;
  value: string;
  range: string;
};

const intervals: ChartInterval[] = [
  { label: "1D", value: "5", range: "1D" },
  { label: "1W", value: "30", range: "5D" },
  { label: "1M", value: "60", range: "1M" },
  { label: "3M", value: "240", range: "3M" },
  { label: "1Y", value: "D", range: "12M" },
  { label: "ALL", value: "W", range: "ALL" },
];

function TradingViewChart({ symbol }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [selectedInterval, setSelectedInterval] =
    useState<ChartInterval>(intervals[4]);

  const [showSimpleMovingAverage, setShowSimpleMovingAverage] =
    useState(false);

  const [showMomentumPanel, setShowMomentumPanel] =
    useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const normalizedSymbol = useMemo(
    () => symbol.trim().toUpperCase(),
    [symbol]
  );

  const tradingViewSymbol = useMemo(
    () => resolveTradingViewSymbol(normalizedSymbol),
    [normalizedSymbol]
  );

  const studies = useMemo(() => {
    const selectedStudies: string[] = [];

    if (showSimpleMovingAverage) {
      selectedStudies.push("MASimple@tv-basicstudies");
    }

    if (showMomentumPanel) {
      selectedStudies.push("StochasticRSI@tv-basicstudies");
    }

    return selectedStudies;
  }, [showSimpleMovingAverage, showMomentumPanel]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !normalizedSymbol) {
      return;
    }

    setIsLoading(true);
    container.innerHTML = "";

    const widgetContainer = document.createElement("div");

    widgetContainer.className =
      "tradingview-widget-container__widget";

    widgetContainer.style.height = "100%";
    widgetContainer.style.width = "100%";

    const script = document.createElement("script");

    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

    script.type = "text/javascript";
    script.async = true;

    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tradingViewSymbol,
      interval: selectedInterval.value,
      range: selectedInterval.range,
      timezone: "exchange",
      theme: "dark",
      backgroundColor: "#0d1828",
      gridColor: "rgba(255, 255, 255, 0.06)",
      style: "1",
      locale: "en",
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      withdateranges: true,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      details: false,
      hotlist: false,
      studies,
      support_host: "https://www.tradingview.com",
    });

    const loadingTimeout = window.setTimeout(() => {
      setIsLoading(false);
    }, 1800);

    container.appendChild(widgetContainer);
    container.appendChild(script);

    return () => {
      window.clearTimeout(loadingTimeout);
      container.innerHTML = "";
    };
  }, [
    normalizedSymbol,
    selectedInterval,
    studies,
    tradingViewSymbol,
  ]);

  return (
    <section
      style={{
        width: "100%",
        height: "100%",
        minHeight: "560px",
        display: "flex",
        flexDirection: "column",
        background: "#0d1828",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "14px",
          flexWrap: "wrap",
          padding: "13px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "#0b1524",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            flexWrap: "wrap",
          }}
        >
          {intervals.map((interval) => {
            const active =
              selectedInterval.label === interval.label;

            return (
              <button
                key={interval.label}
                type="button"
                onClick={() => setSelectedInterval(interval)}
                style={{
                  minWidth: "46px",
                  padding: "8px 10px",
                  border: active
                    ? "1px solid rgba(96,165,250,0.55)"
                    : "1px solid transparent",
                  borderRadius: "9px",
                  background: active
                    ? "rgba(37,99,235,0.18)"
                    : "transparent",
                  color: active ? "#93c5fd" : "#9ca3af",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {interval.label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <IndicatorButton
            label="SMA"
            active={showSimpleMovingAverage}
            onClick={() =>
              setShowSimpleMovingAverage((current) => !current)
            }
          />

          <IndicatorButton
            label="Momentum"
            active={showMomentumPanel}
            onClick={() =>
              setShowMomentumPanel((current) => !current)
            }
          />

          <span
            style={{
              padding: "7px 10px",
              borderRadius: "999px",
              background: "rgba(34,197,94,0.1)",
              color: "#4ade80",
              fontSize: "12px",
              fontWeight: 800,
            }}
          >
            Candles + Volume
          </span>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          flex: 1,
          minHeight: "500px",
        }}
      >
        {isLoading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#0d1828",
              color: "#9ca3af",
              fontWeight: 700,
            }}
          >
            Loading {normalizedSymbol} chart...
          </div>
        )}

        <div
          ref={containerRef}
          className="tradingview-widget-container"
          style={{
            width: "100%",
            height: "100%",
            minHeight: "500px",
          }}
        />
      </div>
    </section>
  );
}

function IndicatorButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: "8px 11px",
        border: active
          ? "1px solid rgba(74,222,128,0.5)"
          : "1px solid rgba(255,255,255,0.1)",
        borderRadius: "9px",
        background: active
          ? "rgba(34,197,94,0.12)"
          : "rgba(255,255,255,0.035)",
        color: active ? "#4ade80" : "#d1d5db",
        fontSize: "13px",
        fontWeight: 750,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function resolveTradingViewSymbol(symbol: string) {
  const exchangeOverrides: Record<string, string> = {
    "BRK.B": "NYSE:BRK.B",
    "BRK.A": "NYSE:BRK.A",
    DIS: "NYSE:DIS",
    JPM: "NYSE:JPM",
    BAC: "NYSE:BAC",
    WMT: "NYSE:WMT",
    V: "NYSE:V",
    MA: "NYSE:MA",
    KO: "NYSE:KO",
    NKE: "NYSE:NKE",
    IBM: "NYSE:IBM",
    GE: "NYSE:GE",
    F: "NYSE:F",
    GM: "NYSE:GM",
    UBER: "NYSE:UBER",
  };

  return exchangeOverrides[symbol] || `NASDAQ:${symbol}`;
}

export default memo(TradingViewChart);