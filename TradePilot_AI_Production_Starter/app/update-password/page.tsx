"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function updatePassword() {
    setMessage("");

    if (!password || !confirmPassword) {
      setMessage("Please fill in both password fields.");
      return;
    }

    if (password.length < 8) {
      setMessage("Your password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
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

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Password updated successfully.");

    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 1200);
  }

  return (
    <main className="shell">
      <div className="form card">
        <div className="brand">
          Norvexa <span>AI</span>
        </div>

        <h1>Choose a new password</h1>

        <label>New password</label>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter a new password"
          autoComplete="new-password"
        />

        <label>Confirm new password</label>
        <input
          className="input"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Re-enter your new password"
          autoComplete="new-password"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              updatePassword();
            }
          }}
        />

        <button
          className="button"
          style={{ width: "100%" }}
          onClick={updatePassword}
          disabled={loading}
        >
          {loading ? "Updating..." : "Update password"}
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