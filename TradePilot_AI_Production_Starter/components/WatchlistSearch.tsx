"use client";

import {
  FormEvent,
  useState,
} from "react";

type WatchlistSearchProps = {
  onAdded: () => void;
};

export default function WatchlistSearch({
  onAdded,
}: WatchlistSearchProps) {
  const [symbol, setSymbol] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const normalized = symbol
      .trim()
      .toUpperCase();

    if (!normalized) {
      setError("Enter a stock symbol.");
      return;
    }

    try {
      setAdding(true);
      setError("");

      const response = await fetch(
        "/api/watchlist-live",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            symbol: normalized,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to add this stock."
        );
      }

      setSymbol("");
      onAdded();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to add this stock."
      );
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <input
          value={symbol}
          onChange={(event) =>
            setSymbol(
              event.target.value.toUpperCase()
            )
          }
          placeholder="Enter ticker, e.g. AAPL"
          maxLength={15}
          style={{
            flex: "1 1 220px",
            minWidth: 0,
            padding: "11px 13px",
            border:
              "1px solid rgba(255,255,255,0.12)",
            borderRadius: "10px",
            background:
              "rgba(255,255,255,0.035)",
            color: "white",
            outline: "none",
            font: "inherit",
          }}
        />

        <button
          type="submit"
          disabled={adding}
          style={{
            padding: "11px 16px",
            border: "none",
            borderRadius: "10px",
            background: adding
              ? "#374151"
              : "#2563eb",
            color: "white",
            fontWeight: 800,
            cursor: adding
              ? "not-allowed"
              : "pointer",
          }}
        >
          {adding ? "Adding..." : "Add Stock"}
        </button>
      </form>

      {error && (
        <p
          style={{
            margin: "8px 0 0",
            color: "#ff8a8a",
            fontSize: "12px",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}