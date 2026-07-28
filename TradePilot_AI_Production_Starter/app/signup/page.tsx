"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setMessage("");

    if (!email || !password || !confirmPassword) {
      setMessage("Please fill in every field.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Account created. Check your email if confirmation is required.");

    setTimeout(() => {
      router.push("/login");
    }, 1200);
  }

  return (
    <main className="shell">
      <div className="form card">
        <div className="brand">
          TradePilot <span>AI</span>
        </div>

        <h1>Create your account</h1>

        <label>Email</label>
        <input
          className="input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
        />

        <label>Password</label>
        <input
          className="input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoComplete="new-password"
          placeholder="Create a password"
        />

        <label>Confirm password</label>
        <input
          className="input"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              submit();
            }
          }}
        />

        <button
          className="button"
          style={{ width: "100%" }}
          onClick={submit}
          disabled={loading}
        >
          {loading ? "Creating account..." : "Create account"}
        </button>

        {message && <p className="muted">{message}</p>}

        <p className="muted">
          Already have an account?{" "}
          <Link className="green" href="/login">
            Log in
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