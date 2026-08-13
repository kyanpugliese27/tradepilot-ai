"use client";

type WatchlistStock = {
  symbol: string;
  name?: string;
  logo?: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
  stale?: boolean;
  sentiment: "Bullish" | "Neutral" | "Bearish";
  sentimentReason: string;
};

type WatchlistRowProps = {
  stock: WatchlistStock;
  removing: boolean;
  onOpen: () => void;
  onRemove: () => void;
};

export default function WatchlistRow({
  stock,
  removing,
  onOpen,
  onRemove,
}: WatchlistRowProps) {
  const positive = stock.changePercent >= 0;

  const sentimentColor =
    stock.sentiment === "Bullish"
      ? "#4ade80"
      : stock.sentiment === "Bearish"
        ? "#ff8a8a"
        : "#fbbf24";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          onOpen();
        }
      }}
      style={{
        display: "grid",
        gridTemplateColumns:
          "minmax(210px, 1.4fr) 120px 120px 150px 90px",
        gap: "14px",
        alignItems: "center",
        padding: "14px 16px",
        border:
          "1px solid rgba(255,255,255,0.07)",
        borderRadius: "12px",
        background: "rgba(255,255,255,0.025)",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          minWidth: 0,
        }}
      >
        {stock.logo ? (
          <img
            src={stock.logo}
            alt={`${stock.symbol} logo`}
            style={{
              width: "38px",
              height: "38px",
              objectFit: "contain",
              borderRadius: "9px",
              padding: "5px",
              background: "white",
            }}
          />
        ) : (
          <div
            style={{
              width: "38px",
              height: "38px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "9px",
              background:
                "rgba(96,165,250,0.12)",
              color: "#93c5fd",
              fontWeight: 850,
            }}
          >
            {stock.symbol.slice(0, 2)}
          </div>
        )}

        <div style={{ minWidth: 0 }}>
          <strong>{stock.symbol}</strong>

          <div
            className="muted"
            style={{
              marginTop: "3px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: "12px",
            }}
          >
            {stock.name || stock.symbol}
          </div>
        </div>
      </div>

      <div>
        <strong>${stock.price.toFixed(2)}</strong>

        {stock.stale && (
          <div
            style={{
              marginTop: "3px",
              color: "#fbbf24",
              fontSize: "10px",
            }}
          >
            Cached quote
          </div>
        )}
      </div>

      <div
        style={{
          color: positive
            ? "#4ade80"
            : "#ff8a8a",
          fontWeight: 750,
        }}
      >
        {positive ? "+" : ""}
        {stock.changePercent.toFixed(2)}%

        <div
          style={{
            marginTop: "3px",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          {positive ? "+" : ""}
          {stock.change.toFixed(2)}
        </div>
      </div>

      <div>
        <span
          title={stock.sentimentReason}
          style={{
            display: "inline-block",
            padding: "6px 9px",
            borderRadius: "999px",
            border: `1px solid ${sentimentColor}44`,
            background: `${sentimentColor}14`,
            color: sentimentColor,
            fontSize: "11px",
            fontWeight: 850,
          }}
        >
          {stock.sentiment}
        </span>

        <div
          className="muted"
          style={{
            marginTop: "5px",
            fontSize: "10px",
          }}
        >
          AI daily tone
        </div>
      </div>

      <button
        type="button"
        disabled={removing}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        style={{
          padding: "8px 10px",
          border:
            "1px solid rgba(255,107,107,0.3)",
          borderRadius: "9px",
          background:
            "rgba(255,107,107,0.07)",
          color: "#ff8a8a",
          fontWeight: 700,
          cursor: removing
            ? "not-allowed"
            : "pointer",
          opacity: removing ? 0.65 : 1,
        }}
      >
        {removing ? "Removing..." : "Remove"}
      </button>
    </div>
  );
}

export type { WatchlistStock };