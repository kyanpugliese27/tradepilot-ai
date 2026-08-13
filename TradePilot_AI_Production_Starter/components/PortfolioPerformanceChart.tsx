"use client";

import {
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ChartRange =
  | "1D"
  | "1W"
  | "1M"
  | "3M"
  | "YTD"
  | "1Y"
  | "ALL";

type PortfolioSnapshot = {
  id: string;
  totalAccountValue: number;
  portfolioValue: number;
  cashBalance: number;
  recordedAt: string;
};

type PortfolioPerformanceChartProps = {
  currentAccountValue: number;
};

type ChartPoint = PortfolioSnapshot & {
  x: number;
  y: number;
};

type HoveredPoint = {
  point: ChartPoint;
  index: number;
};

const chartRanges: ChartRange[] = [
  "1D",
  "1W",
  "1M",
  "3M",
  "YTD",
  "1Y",
  "ALL",
];

const chartWidth = 1000;
const chartHeight = 330;

const paddingTop = 35;
const paddingRight = 30;
const paddingBottom = 45;
const paddingLeft = 30;

export default function PortfolioPerformanceChart({
  currentAccountValue,
}: PortfolioPerformanceChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [selectedRange, setSelectedRange] =
    useState<ChartRange>("1M");

  const [snapshots, setSnapshots] = useState<
    PortfolioSnapshot[]
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [hoveredPoint, setHoveredPoint] =
    useState<HoveredPoint | null>(null);

  const loadHistory = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setIsLoading(true);
        }

        setError("");

        const response = await fetch(
          `/api/portfolio-history?range=${selectedRange}`,
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to load portfolio history."
          );
        }

        setSnapshots(data.snapshots || []);
      } catch (loadError) {
        console.error(
          "Portfolio chart loading error:",
          loadError
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load portfolio history."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [selectedRange]
  );

  useEffect(() => {
    loadHistory(true);

    const refreshInterval = window.setInterval(() => {
      loadHistory(false);
    }, 60000);

    return () => {
      window.clearInterval(refreshInterval);
    };
  }, [loadHistory]);

  useEffect(() => {
    setHoveredPoint(null);
  }, [selectedRange]);

  const chartData = useMemo(() => {
    const validSnapshots = snapshots
      .filter(
        (snapshot) =>
          Number.isFinite(snapshot.totalAccountValue) &&
          !Number.isNaN(
            new Date(snapshot.recordedAt).getTime()
          )
      )
      .sort(
        (firstSnapshot, secondSnapshot) =>
          new Date(firstSnapshot.recordedAt).getTime() -
          new Date(secondSnapshot.recordedAt).getTime()
      );

    const safeCurrentAccountValue =
      Number.isFinite(currentAccountValue)
        ? currentAccountValue
        : 0;

    if (validSnapshots.length === 0) {
      return [
        {
          id: "current-account-value",
          totalAccountValue: safeCurrentAccountValue,
          portfolioValue: 0,
          cashBalance: safeCurrentAccountValue,
          recordedAt: new Date().toISOString(),
        },
      ];
    }

    const latestSnapshot =
      validSnapshots[validSnapshots.length - 1];

    const latestSnapshotTime = new Date(
      latestSnapshot.recordedAt
    ).getTime();

    const livePoint: PortfolioSnapshot = {
      id: "live-current-account-value",
      totalAccountValue: safeCurrentAccountValue,
      portfolioValue: latestSnapshot.portfolioValue,
      cashBalance: latestSnapshot.cashBalance,
      recordedAt: new Date(
        Math.max(Date.now(), latestSnapshotTime + 1)
      ).toISOString(),
    };

    return [...validSnapshots, livePoint];
  }, [snapshots, currentAccountValue]);

  const chart = useMemo(() => {
    if (chartData.length === 0) {
      return null;
    }

    const values = chartData.map(
      (snapshot) =>
        snapshot.totalAccountValue
    );

    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);

    const difference = rawMax - rawMin;

    const valuePadding = Math.max(
      difference * 0.2,
      rawMax * 0.0015,
      5
    );

    const minValue = rawMin - valuePadding;
    const maxValue = rawMax + valuePadding;

    const valueRange = Math.max(
      maxValue - minValue,
      1
    );

    const usableWidth =
      chartWidth -
      paddingLeft -
      paddingRight;

    const usableHeight =
      chartHeight -
      paddingTop -
      paddingBottom;

    const firstTimestamp = new Date(
      chartData[0].recordedAt
    ).getTime();

    const lastTimestamp = new Date(
      chartData[
        chartData.length - 1
      ].recordedAt
    ).getTime();

    const timestampRange = Math.max(
      lastTimestamp - firstTimestamp,
      1
    );

    const points: ChartPoint[] =
      chartData.map(
        (snapshot, index) => {
          const timestamp = new Date(
            snapshot.recordedAt
          ).getTime();

          const x =
            chartData.length === 1
              ? paddingLeft +
                usableWidth / 2
              : paddingLeft +
                ((timestamp -
                  firstTimestamp) /
                  timestampRange) *
                  usableWidth;

          const y =
            paddingTop +
            ((maxValue -
              snapshot.totalAccountValue) /
              valueRange) *
              usableHeight;

          return {
            ...snapshot,
            x,
            y,
          };
        }
      );

    const smoothLinePath =
      createSmoothPath(points);

    const chartBottom =
      paddingTop + usableHeight;

    const areaPath =
      points.length > 1
        ? `${smoothLinePath} L ${
            points[
              points.length - 1
            ].x
          } ${chartBottom} L ${
            points[0].x
          } ${chartBottom} Z`
        : "";

    const startingValue =
      chartData[0]
        ?.totalAccountValue ??
      currentAccountValue;

    const endingValue =
      chartData[
        chartData.length - 1
      ]?.totalAccountValue ??
      currentAccountValue;

    const change =
      endingValue - startingValue;

    const changePercent =
      startingValue > 0
        ? (change / startingValue) *
          100
        : 0;

    return {
      points,
      smoothLinePath,
      areaPath,
      minValue,
      maxValue,
      startingValue,
      endingValue,
      change,
      changePercent,
      positive: change >= 0,
      chartBottom,
    };
  }, [chartData, currentAccountValue]);

  const activePoint =
    hoveredPoint?.point ??
    chart?.points[
      chart.points.length - 1
    ] ??
    null;

  const displayedValue =
    activePoint?.totalAccountValue ??
    chart?.endingValue ??
    currentAccountValue;

  function handleMouseMove(
    event: MouseEvent<SVGSVGElement>
  ) {
    if (
      !chart ||
      chart.points.length === 0 ||
      !svgRef.current
    ) {
      return;
    }

    const svgBounds =
      svgRef.current.getBoundingClientRect();

    const relativeX =
      ((event.clientX -
        svgBounds.left) /
        svgBounds.width) *
      chartWidth;

    let closestIndex = 0;
    let closestDistance =
      Number.POSITIVE_INFINITY;

    chart.points.forEach(
      (point, index) => {
        const distance = Math.abs(
          point.x - relativeX
        );

        if (
          distance < closestDistance
        ) {
          closestDistance = distance;
          closestIndex = index;
        }
      }
    );

    setHoveredPoint({
      point:
        chart.points[closestIndex],
      index: closestIndex,
    });
  }

  function handleMouseLeave() {
    setHoveredPoint(null);
  }

  return (
    <section
      className="card"
      style={{
        marginTop: "14px",
        padding: "22px",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes portfolioLineDraw {
          from {
            stroke-dashoffset: 1600;
          }

          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes portfolioPointPulse {
          0% {
            opacity: 0.5;
            transform: scale(0.8);
          }

          50% {
            opacity: 1;
            transform: scale(1.15);
          }

          100% {
            opacity: 0.5;
            transform: scale(0.8);
          }
        }

        .portfolio-chart-line {
          stroke-dasharray: 1600;
          stroke-dashoffset: 1600;
          animation: portfolioLineDraw 1.2s ease forwards;
        }

        .portfolio-chart-active-dot {
          transform-box: fill-box;
          transform-origin: center;
          animation: portfolioPointPulse 1.8s ease-in-out infinite;
        }

        .portfolio-range-button:hover {
          background: rgba(255, 255, 255, 0.06) !important;
          color: #ffffff !important;
        }

        .portfolio-refresh-button:hover:not(:disabled) {
          border-color: rgba(34, 197, 94, 0.55) !important;
          color: #4ade80 !important;
        }
      `}</style>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent:
            "space-between",
          gap: "18px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <span className="muted">
            Portfolio performance
          </span>

          <div
            style={{
              marginTop: "8px",
              fontSize: "31px",
              fontWeight: 800,
              letterSpacing: "-0.5px",
            }}
          >
            {formatCurrency(
              displayedValue
            )}
          </div>

          {activePoint &&
          hoveredPoint ? (
            <div
              style={{
                marginTop: "5px",
                color: "#9ca3af",
                fontWeight: 600,
              }}
            >
              {formatFullDate(
                activePoint.recordedAt
              )}
            </div>
          ) : (
            chart && (
              <div
                style={{
                  marginTop: "5px",
                  color: chart.positive
                    ? "#22c55e"
                    : "#ff6b6b",
                  fontWeight: 650,
                }}
              >
                {chart.positive
                  ? "+"
                  : "-"}
                {formatCurrency(
                  Math.abs(
                    chart.change
                  )
                )}{" "}
                (
                {chart.positive
                  ? "+"
                  : ""}
                {chart.changePercent.toFixed(
                  2
                )}
                %)
                <span
                  className="muted"
                  style={{
                    marginLeft: "5px",
                  }}
                >
                  during{" "}
                  {selectedRange}
                </span>
              </div>
            )
          )}
        </div>

        <button
          className="portfolio-refresh-button"
          type="button"
          onClick={() =>
            loadHistory(true)
          }
          disabled={isLoading}
          style={{
            padding: "9px 14px",
            border:
              "1px solid rgba(255,255,255,0.12)",
            borderRadius: "9px",
            background:
              "rgba(255,255,255,0.04)",
            color: "#d1d5db",
            fontWeight: 650,
            cursor: isLoading
              ? "not-allowed"
              : "pointer",
            opacity: isLoading
              ? 0.6
              : 1,
            transition:
              "all 0.2s ease",
          }}
        >
          {isLoading
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>

      <div
        style={{
          marginTop: "18px",
          width: "100%",
          overflowX: "auto",
        }}
      >
        {isLoading &&
        snapshots.length === 0 ? (
          <ChartMessage>
            Loading performance
            chart...
          </ChartMessage>
        ) : error ? (
          <ChartMessage
            color="#ff8a8a"
          >
            {error}
          </ChartMessage>
        ) : chart ? (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            role="img"
            aria-label="Interactive portfolio performance chart"
            onMouseMove={
              handleMouseMove
            }
            onMouseLeave={
              handleMouseLeave
            }
            style={{
              display: "block",
              width: "100%",
              minWidth: "680px",
              height: "auto",
              cursor:
                chart.points.length >
                1
                  ? "crosshair"
                  : "default",
              touchAction: "none",
            }}
          >
            <defs>
              <linearGradient
                id="portfolio-positive-area-gradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#22c55e"
                  stopOpacity="0.33"
                />

                <stop
                  offset="55%"
                  stopColor="#22c55e"
                  stopOpacity="0.1"
                />

                <stop
                  offset="100%"
                  stopColor="#22c55e"
                  stopOpacity="0"
                />
              </linearGradient>

              <linearGradient
                id="portfolio-negative-area-gradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#ff6b6b"
                  stopOpacity="0.33"
                />

                <stop
                  offset="55%"
                  stopColor="#ff6b6b"
                  stopOpacity="0.1"
                />

                <stop
                  offset="100%"
                  stopColor="#ff6b6b"
                  stopOpacity="0"
                />
              </linearGradient>

              <filter
                id="portfolio-line-glow"
                x="-40%"
                y="-40%"
                width="180%"
                height="180%"
              >
                <feGaussianBlur
                  stdDeviation="4"
                  result="blur"
                />

                <feMerge>
                  <feMergeNode
                    in="blur"
                  />

                  <feMergeNode
                    in="SourceGraphic"
                  />
                </feMerge>
              </filter>
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map(
              (position) => {
                const usableHeight =
                  chartHeight -
                  paddingTop -
                  paddingBottom;

                const y =
                  paddingTop +
                  position *
                    usableHeight;

                const value =
                  chart.maxValue -
                  position *
                    (chart.maxValue -
                      chart.minValue);

                return (
                  <g key={position}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={
                        chartWidth -
                        paddingRight
                      }
                      y2={y}
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="1"
                    />

                    <text
                      x={
                        chartWidth -
                        paddingRight
                      }
                      y={y - 8}
                      textAnchor="end"
                      fill="#6b7280"
                      fontSize="12"
                    >
                      {formatCompactCurrency(
                        value
                      )}
                    </text>
                  </g>
                );
              }
            )}

            {chart.areaPath && (
              <path
                d={chart.areaPath}
                fill={
                  chart.positive
                    ? "url(#portfolio-positive-area-gradient)"
                    : "url(#portfolio-negative-area-gradient)"
                }
              />
            )}

            {chart.smoothLinePath && (
              <>
                <path
                  d={
                    chart.smoothLinePath
                  }
                  fill="none"
                  stroke={
                    chart.positive
                      ? "rgba(34,197,94,0.2)"
                      : "rgba(255,107,107,0.2)"
                  }
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#portfolio-line-glow)"
                />

                <path
                  className="portfolio-chart-line"
                  d={
                    chart.smoothLinePath
                  }
                  fill="none"
                  stroke={
                    chart.positive
                      ? "#22c55e"
                      : "#ff6b6b"
                  }
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {chart.points.length === 1 && (
              <circle
                cx={
                  chart.points[0].x
                }
                cy={
                  chart.points[0].y
                }
                r="6"
                fill={
                  chart.positive
                    ? "#22c55e"
                    : "#ff6b6b"
                }
              />
            )}

            {activePoint &&
              hoveredPoint && (
                <>
                  <line
                    x1={activePoint.x}
                    y1={paddingTop}
                    x2={activePoint.x}
                    y2={
                      chart.chartBottom
                    }
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="1"
                    strokeDasharray="4 5"
                  />

                  <line
                    x1={paddingLeft}
                    y1={activePoint.y}
                    x2={
                      chartWidth -
                      paddingRight
                    }
                    y2={activePoint.y}
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="1"
                    strokeDasharray="4 5"
                  />

                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="10"
                    fill={
                      chart.positive
                        ? "rgba(34,197,94,0.18)"
                        : "rgba(255,107,107,0.18)"
                    }
                  />

                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="5"
                    fill={
                      chart.positive
                        ? "#22c55e"
                        : "#ff6b6b"
                    }
                    stroke="#08130d"
                    strokeWidth="2"
                  />

                  <ChartTooltip
                    point={activePoint}
                    positive={
                      chart.positive
                    }
                  />
                </>
              )}

            {!hoveredPoint &&
              chart.points.length > 1 && (
                <circle
                  className="portfolio-chart-active-dot"
                  cx={
                    chart.points[
                      chart.points
                        .length - 1
                    ].x
                  }
                  cy={
                    chart.points[
                      chart.points
                        .length - 1
                    ].y
                  }
                  r="5"
                  fill={
                    chart.positive
                      ? "#22c55e"
                      : "#ff6b6b"
                  }
                  stroke="#08130d"
                  strokeWidth="2"
                />
              )}

            {chart.points.length > 0 && (
              <>
                <text
                  x={paddingLeft}
                  y={
                    chartHeight - 11
                  }
                  fill="#6b7280"
                  fontSize="12"
                >
                  {formatChartDate(
                    chart.points[0]
                      .recordedAt,
                    selectedRange
                  )}
                </text>

                <text
                  x={
                    chartWidth -
                    paddingRight
                  }
                  y={
                    chartHeight - 11
                  }
                  textAnchor="end"
                  fill="#6b7280"
                  fontSize="12"
                >
                  {formatChartDate(
                    chart.points[
                      chart.points
                        .length - 1
                    ].recordedAt,
                    selectedRange
                  )}
                </text>
              </>
            )}
          </svg>
        ) : (
          <ChartMessage>
            No portfolio history is
            available yet.
          </ChartMessage>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "7px",
          marginTop: "12px",
          flexWrap: "wrap",
        }}
      >
        {chartRanges.map(
          (range) => {
            const active =
              selectedRange === range;

            return (
              <button
                className="portfolio-range-button"
                key={range}
                type="button"
                onClick={() =>
                  setSelectedRange(
                    range
                  )
                }
                style={{
                  minWidth: "48px",
                  padding:
                    "8px 11px",
                  border: active
                    ? "1px solid rgba(34,197,94,0.55)"
                    : "1px solid transparent",
                  borderRadius: "9px",
                  background: active
                    ? "rgba(34,197,94,0.13)"
                    : "transparent",
                  color: active
                    ? "#4ade80"
                    : "#9ca3af",
                  fontSize: "13px",
                  fontWeight: 750,
                  cursor: "pointer",
                  transition:
                    "all 0.2s ease",
                }}
              >
                {range}
              </button>
            );
          }
        )}
      </div>

      {chartData.length <= 1 && (
        <p
          className="muted"
          style={{
            margin:
              "14px 0 0",
            textAlign: "center",
            fontSize: "13px",
          }}
        >
          More chart movement will
          appear as additional
          portfolio snapshots are
          recorded.
        </p>
      )}
    </section>
  );
}

function ChartTooltip({
  point,
  positive,
}: {
  point: ChartPoint;
  positive: boolean;
}) {
  const tooltipWidth = 190;
  const tooltipHeight = 75;

  const placeOnLeft =
    point.x >
    chartWidth - 230;

  const tooltipX = placeOnLeft
    ? point.x -
      tooltipWidth -
      16
    : point.x + 16;

  const tooltipY = Math.max(
    paddingTop,
    Math.min(
      point.y -
        tooltipHeight / 2,
      chartHeight -
        paddingBottom -
        tooltipHeight
    )
  );

  return (
    <g
      pointerEvents="none"
      transform={`translate(${tooltipX}, ${tooltipY})`}
    >
      <rect
        width={tooltipWidth}
        height={tooltipHeight}
        rx="11"
        fill="rgba(7, 18, 12, 0.96)"
        stroke={
          positive
            ? "rgba(34,197,94,0.4)"
            : "rgba(255,107,107,0.4)"
        }
        strokeWidth="1"
      />

      <text
        x="14"
        y="27"
        fill="#ffffff"
        fontSize="17"
        fontWeight="750"
      >
        {formatCurrency(
          point.totalAccountValue
        )}
      </text>

      <text
        x="14"
        y="52"
        fill="#9ca3af"
        fontSize="12"
      >
        {formatFullDate(
          point.recordedAt
        )}
      </text>
    </g>
  );
}

function ChartMessage({
  children,
  color = "#9ca3af",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <div
      style={{
        height: "330px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "18px",
        color,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

function createSmoothPath(
  points: ChartPoint[]
) {
  if (points.length < 2) {
    return "";
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (
    let index = 0;
    index < points.length - 1;
    index += 1
  ) {
    const currentPoint =
      points[index];

    const nextPoint =
      points[index + 1];

    const controlPointX =
      (currentPoint.x +
        nextPoint.x) /
      2;

    path += ` C ${controlPointX} ${currentPoint.y}, ${controlPointX} ${nextPoint.y}, ${nextPoint.x} ${nextPoint.y}`;
  }

  return path;
}

function formatCurrency(
  value: number
) {
  const safeValue =
    Number.isFinite(value)
      ? value
      : 0;

  return safeValue.toLocaleString(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

function formatCompactCurrency(
  value: number
) {
  const safeValue =
    Number.isFinite(value)
      ? value
      : 0;

  return safeValue.toLocaleString(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }
  );
}

function formatChartDate(
  value: string,
  range: ChartRange
) {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "";
  }

  if (range === "1D") {
    return date.toLocaleTimeString(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );
  }

  if (
    range === "1W" ||
    range === "1M"
  ) {
    return date.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
      }
    );
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function formatFullDate(
  value: string
) {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "";
  }

  return date.toLocaleString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}