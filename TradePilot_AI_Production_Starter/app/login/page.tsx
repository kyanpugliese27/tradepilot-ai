"use client";

import {
  Suspense,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

function getSafeNextPath(
  value: string | null
) {
  if (!value) {
    return "/dashboard";
  }

  /*
   * Only allow internal TradePilot paths.
   * This prevents URLs such as:
   *
   * /login?next=https://example.com
   * /login?next=//example.com
   *
   * from becoming open redirects.
   */
  if (
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/dashboard";
  }

  /*
   * Do not redirect back into auth pages.
   */
  if (
    value === "/login" ||
    value.startsWith("/login?") ||
    value === "/signup" ||
    value.startsWith("/signup?") ||
    value === "/forgot-password" ||
    value.startsWith(
      "/forgot-password?"
    )
  ) {
    return "/dashboard";
  }

  return value;
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <LoginFallback />
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();

  const searchParams =
    useSearchParams();

  const nextPath =
    getSafeNextPath(
      searchParams.get("next")
    );

  const signupHref =
    nextPath === "/dashboard"
      ? "/signup"
      : `/signup?next=${encodeURIComponent(
          nextPath
        )}`;

  const forgotPasswordHref =
    nextPath === "/dashboard"
      ? "/forgot-password"
      : `/forgot-password?next=${encodeURIComponent(
          nextPath
        )}`;

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    rememberMe,
    setRememberMe,
  ] = useState(true);

  const [message, setMessage] =
    useState("");

  const [
    messageType,
    setMessageType,
  ] = useState<
    "error" | "success" | ""
  >("");

  const [loading, setLoading] =
    useState(false);

  async function submit() {
    setMessage("");
    setMessageType("");

    if (
      !email.trim() ||
      !password
    ) {
      setMessage(
        "Please enter your email and password."
      );

      setMessageType(
        "error"
      );

      return;
    }

    const url =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const key =
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      setMessage(
        "Supabase is not connected."
      );

      setMessageType(
        "error"
      );

      return;
    }

    setLoading(true);

    const supabase =
      createBrowserClient(
        url,
        key,
        {
          auth: {
            persistSession:
              rememberMe,
          },
        }
      );

    const {
      error,
    } =
      await supabase.auth
        .signInWithPassword({
          email:
            email.trim(),
          password,
        });

    if (error) {
      setMessage(
        "Incorrect email or password. Please try again."
      );

      setMessageType(
        "error"
      );

      setLoading(false);

      return;
    }

    setMessage(
      nextPath ===
        "/dashboard"
        ? "Successfully signed in. Opening your dashboard..."
        : "Successfully signed in. Taking you back..."
    );

    setMessageType(
      "success"
    );

    /*
     * replace() is intentional:
     * after login, pressing Back should not
     * send the user back to the login form.
     */
    router.replace(
      nextPath
    );

    router.refresh();
  }

  return (
    <main className="shell">
      <div className="form card">
        <div className="brand">
          TradePilot{" "}
          <span>AI</span>
        </div>

        <h1>
          Welcome back
        </h1>

        <p className="muted">
          {nextPath ===
          "/dashboard"
            ? "Log in to access your dashboard."
            : "Log in to continue where you left off."}
        </p>

        <label htmlFor="email">
          Email
        </label>

        <input
          id="email"
          className="input"
          value={email}
          onChange={(
            event
          ) =>
            setEmail(
              event.target
                .value
            )
          }
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          disabled={loading}
        />

        <label htmlFor="password">
          Password
        </label>

        <div
          style={{
            position:
              "relative",
          }}
        >
          <input
            id="password"
            className="input"
            value={password}
            onChange={(
              event
            ) =>
              setPassword(
                event.target
                  .value
              )
            }
            type={
              showPassword
                ? "text"
                : "password"
            }
            autoComplete="current-password"
            placeholder="Enter your password"
            disabled={loading}
            style={{
              width:
                "100%",
              paddingRight: 75,
            }}
            onKeyDown={(
              event
            ) => {
              if (
                event.key ===
                  "Enter" &&
                !loading
              ) {
                submit();
              }
            }}
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword(
                (current) =>
                  !current
              )
            }
            disabled={loading}
            style={{
              position:
                "absolute",
              right: 12,
              top: "50%",
              transform:
                "translateY(-50%)",
              border: "none",
              background:
                "transparent",
              cursor: loading
                ? "not-allowed"
                : "pointer",
              fontSize: 13,
              color:
                "inherit",
            }}
          >
            {showPassword
              ? "Hide"
              : "Show"}
          </button>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            gap: 12,
            marginBottom: 18,
            fontSize: 14,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems:
                "center",
              gap: 8,
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={
                rememberMe
              }
              onChange={(
                event
              ) =>
                setRememberMe(
                  event.target
                    .checked
                )
              }
              disabled={loading}
            />

            Remember me
          </label>

          <Link
            className="green"
            href={
              forgotPasswordHref
            }
          >
            Forgot password?
          </Link>
        </div>

        <button
          className="button"
          style={{
            width: "100%",
            opacity: loading
              ? 0.7
              : 1,
            cursor: loading
              ? "not-allowed"
              : "pointer",
          }}
          onClick={submit}
          disabled={loading}
        >
          {loading
            ? "Signing in..."
            : "Log in"}
        </button>

        {message && (
          <p
            style={{
              marginTop: 14,
              color:
                messageType ===
                "error"
                  ? "#ff6b6b"
                  : "#22c55e",
            }}
          >
            {message}
          </p>
        )}

        {nextPath !==
          "/dashboard" && (
          <p
            className="muted"
            style={{
              marginTop: 12,
            }}
          >
            After login,
            TradePilot will
            return you to{" "}
            <strong>
              {nextPath}
            </strong>
            .
          </p>
        )}

        <p className="muted">
          Don&apos;t have an
          account?{" "}
          <Link
            className="green"
            href={signupHref}
          >
            Create one
          </Link>
        </p>

        <p className="muted">
          <Link
            className="green"
            href="/"
          >
            Back to homepage
          </Link>
        </p>
      </div>
    </main>
  );
}

function LoginFallback() {
  return (
    <main className="shell">
      <div className="form card">
        <div className="brand">
          TradePilot{" "}
          <span>AI</span>
        </div>

        <h1>
          Welcome back
        </h1>

        <p className="muted">
          Loading login...
        </p>
      </div>
    </main>
  );
}