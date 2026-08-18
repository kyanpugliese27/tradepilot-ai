"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendResetEmail() {
    setMessage("");

    if (!email) {
      setMessage("Please enter your email address.");
      return;
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      setMessage("Supabase is not connected.");
      return;
    }

    setLoading(true);

    const supabase = createBrowserClient(url, key);

    const redirectUrl =
      window.location.hostname === "localhost"
        ? "http://localhost:3000/update-password"
        : `${window.location.origin}/update-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage(
      "Password reset email sent. Check your inbox and spam folder."
    );
    setLoading(false);
  }

  return (
    <main className="shell">
      <div className="form card">
        <div className="brand">
          Norvexa <span>AI</span>
        </div>

        <h1>Reset your password</h1>

        <p className="muted">
          Enter the email connected to your account. We&apos;ll send you a
          password-reset link.
        </p>

        <label>Email</label>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              sendResetEmail();
            }
          }}
        />

        <button
          className="button"
          style={{ width: "100%" }}
          onClick={sendResetEmail}
          disabled={loading}
        >
          {loading ? "Sending..." : "Send reset email"}
        </button>

        {message && <p className="muted">{message}</p>}

        <p className="muted">
          <Link className="green" href="/login">
            Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}