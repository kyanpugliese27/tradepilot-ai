"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SearchResult = {
  symbol: string;
  name: string;
  type: string;
};

export default function StockSearch() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setResults([]);
      setError("");
      setLoading(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/stock-search?q=${encodeURIComponent(trimmedQuery)}`,
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Search failed.");
        }

        setResults(
          Array.isArray(data.results) ? data.results : []
        );
      } catch (error) {
        console.error("Stock search error:", error);

        setResults([]);
        setError(
          error instanceof Error
            ? error.message
            : "Unable to search stocks."
        );
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [query]);

  function openSymbol(symbol: string) {
    const cleanSymbol = symbol.trim().toUpperCase();

    if (!cleanSymbol) {
      return;
    }

    setQuery("");
    setResults([]);
    setError("");

    router.push(`/stock/${encodeURIComponent(cleanSymbol)}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return;
  }

  const normalizedQuery = trimmedQuery.toUpperCase();

  const exactSymbolResult = results.find(
    (result) =>
      result.symbol.toUpperCase() === normalizedQuery
  );

  const matchingCompanyResult = results.find(
    (result) =>
      result.name.toUpperCase().includes(normalizedQuery)
  );

  const selectedResult =
    exactSymbolResult ||
    matchingCompanyResult ||
    results[0];

  if (selectedResult) {
    openSymbol(selectedResult.symbol);
    return;
  }

  if (/^[A-Z0-9.-]{1,10}$/.test(normalizedQuery)) {
    openSymbol(normalizedQuery);
    return;
  }

  setError("Select a company from the search results.");
}

  const showDropdown =
    query.trim().length > 0 &&
    (loading || results.length > 0 || !!error);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "700px",
        marginTop: "22px",
        marginBottom: "22px",
        zIndex: 100,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: "10px",
          width: "100%",
        }}
      >
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search stocks by company or symbol..."
          autoComplete="off"
          aria-label="Search stocks"
          style={{
            flex: 1,
            minWidth: 0,
            padding: "14px 16px",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            borderRadius: "12px",
            background: "rgba(255,255,255,0.05)",
            color: "white",
            fontSize: "15px",
            outline: "none",
          }}
        />

        <button
          type="submit"
          disabled={!query.trim()}
          style={{
            padding: "14px 20px",
            border: "none",
            borderRadius: "12px",
            background: "#22c55e",
            color: "#07140d",
            fontWeight: 800,
            cursor: query.trim()
              ? "pointer"
              : "not-allowed",
            opacity: query.trim() ? 1 : 0.55,
          }}
        >
          Search
        </button>
      </form>

      {showDropdown && (
        <div
          style={{
            position: "absolute",
            top: "60px",
            left: 0,
            right: 0,
            zIndex: 200,
            overflow: "hidden",
            border: "1px solid rgba(34, 197, 94, 0.22)",
            borderRadius: "12px",
            background: "#07140d",
            boxShadow: "0 18px 45px rgba(0,0,0,0.45)",
          }}
        >
          {loading && (
            <p
              style={{
                margin: 0,
                padding: "16px",
                color: "#9ca3af",
              }}
            >
              Searching...
            </p>
          )}

          {!loading && error && (
            <p
              style={{
                margin: 0,
                padding: "16px",
                color: "#ff6b6b",
              }}
            >
              {error}
            </p>
          )}

          {!loading &&
            !error &&
            results.map((result) => (
              <button
                key={`${result.symbol}-${result.name}`}
                type="button"
                onClick={() => openSymbol(result.symbol)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "16px",
                  width: "100%",
                  padding: "14px 16px",
                  border: "none",
                  borderBottom:
                    "1px solid rgba(255,255,255,0.07)",
                  background: "transparent",
                  color: "white",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div>
                  <strong>{result.symbol}</strong>

                  <div
                    style={{
                      marginTop: "4px",
                      color: "#9ca3af",
                      fontSize: "13px",
                    }}
                  >
                    {result.name}
                  </div>
                </div>

                <span
                  style={{
                    color: "#22c55e",
                    fontSize: "13px",
                    whiteSpace: "nowrap",
                  }}
                >
                  View stock →
                </span>
              </button>
            ))}

          {!loading &&
            !error &&
            results.length === 0 && (
              <p
                style={{
                  margin: 0,
                  padding: "16px",
                  color: "#9ca3af",
                }}
              >
                No matching stocks found.
              </p>
            )}
        </div>
      )}
    </div>
  );
}