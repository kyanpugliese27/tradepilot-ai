"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type WatchlistButtonProps = {
  symbol: string;
};

export default function WatchlistButton({
  symbol,
}: WatchlistButtonProps) {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkWatchlist() {
      try {
        setLoading(true);
        setMessage("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setMessage("You must be signed in.");
          return;
        }

        setUserId(user.id);

        const { data, error } = await supabase
          .from("watchlist")
          .select("id")
          .eq("user_id", user.id)
          .eq("symbol", symbol.toUpperCase())
          .maybeSingle();

        if (error) {
          throw error;
        }

        setIsSaved(Boolean(data));
      } catch (error) {
        console.error("Watchlist check error:", error);
        setMessage("Unable to check watchlist.");
      } finally {
        setLoading(false);
      }
    }

    if (symbol) {
      checkWatchlist();
    }
  }, [symbol]);

  async function toggleWatchlist() {
    if (!userId) {
      setMessage("You must be signed in.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      if (isSaved) {
        const { error } = await supabase
          .from("watchlist")
          .delete()
          .eq("user_id", userId)
          .eq("symbol", symbol.toUpperCase());

        if (error) {
          throw error;
        }

        setIsSaved(false);
        setMessage("Removed from your watchlist.");
      } else {
        const { error } = await supabase.from("watchlist").insert({
          user_id: userId,
          symbol: symbol.toUpperCase(),
        });

        if (error) {
          throw error;
        }

        setIsSaved(true);
        setMessage("Added to your watchlist.");
      }
    } catch (error) {
      console.error("Watchlist update error:", error);
      setMessage("Unable to update your watchlist.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggleWatchlist}
        disabled={loading}
        style={{
          padding: "12px 18px",
          border: isSaved
            ? "1px solid rgba(34,197,94,0.45)"
            : "1px solid rgba(96,165,250,0.45)",
          borderRadius: "12px",
          background: isSaved
            ? "rgba(34,197,94,0.12)"
            : "rgba(37,99,235,0.15)",
          color: isSaved ? "#4ade80" : "#93c5fd",
          fontSize: "15px",
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.65 : 1,
        }}
      >
        {loading
          ? "Loading..."
          : isSaved
            ? "★ Saved to Watchlist"
            : "☆ Add to Watchlist"}
      </button>

      {message && (
        <p
          style={{
            margin: "8px 0 0",
            color: "#9ca3af",
            fontSize: "13px",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}