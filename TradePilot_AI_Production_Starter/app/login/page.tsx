"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success" | "">("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setMessage("");
    setMessageType("");

    if (!email.trim() || !password) {
      setMessage("Please enter your email and password.");
      setMessageType("error");
      return;
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      setMessage("Supabase is not connected.");
      setMessageType("error");
      return;
    }

    setLoading(true);

    const supabase = createBrowserClient(url, key, {
      auth: {
        persistSession: rememberMe,
      },
    });

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage("Incorrect email or password. Please try again.");
      setMessageType("error");
      setLoading(false);
      return;
    }

    setMessage("Successfully signed in. Opening your dashboard...");
    setMessageType("success");

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="shell">
      <div className="form card">
        <div className="brand">
          TradePilot <span>AI</span>
        </div>

        <h1>Welcome back</h1>

        <p className="muted">
          Log in to access your dashboard.
        </p>

        <label htmlFor="email">Email</label>

        <input
          id="email"
          className="input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          disabled={loading}
        />

        <label htmlFor="password">Password</label>

        <div style={{ position: "relative" }}>
          <input
            id="password"
            className="input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            disabled={loading}
            style={{
              width: "100%",
              paddingRight: 75,
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                submit();
              }
            }}
          />

          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            disabled={loading}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: 13,
              color: "inherit",
            }}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 18,
            fontSize: 14,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              disabled={loading}
            />

            Remember me
          </label>

          <Link className="green" href="/forgot-password">
            Forgot password?
          </Link>
        </div>

        <button
          className="button"
          style={{
            width: "100%",
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
          onClick={submit}
          disabled={loading}
        >
          {loading ? "Signing in..." : "Log in"}
        </button>

        {message && (
          <p
            style={{
              marginTop: 14,
              color: messageType === "error" ? "#ff6b6b" : "#22c55e",
            }}
          >
            {message}
          </p>
        )}

        <p className="muted">
          Don&apos;t have an account?{" "}
          <Link className="green" href="/signup">
            Create one
          </Link>
        </p>

        <p className="muted">
          <Link className="green" href="/">
            Back to homepage
          </Link>
        </p>
      </div>
    </main>
  );
}