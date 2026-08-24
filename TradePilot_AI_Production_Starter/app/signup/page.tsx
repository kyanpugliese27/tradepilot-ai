"use client";

import {
  Suspense,
  useEffect,
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

  if (
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/dashboard";
  }

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

function normalizeReferralCode(
  value: string | null
) {
  return (
    value
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "") ||
    ""
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupPageContent />
    </Suspense>
  );
}

function SignupPageContent() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const nextPath =
    getSafeNextPath(
      searchParams.get("next")
    );

  const loginHref =
    nextPath === "/dashboard"
      ? "/login"
      : `/login?next=${encodeURIComponent(
          nextPath
        )}`;

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    referralCode,
    setReferralCode,
  ] = useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    const code =
      normalizeReferralCode(
        searchParams.get("ref")
      );

    if (code) {
      setReferralCode(code);

      localStorage.setItem(
        "Norvexa_referral",
        code
      );
    } else {
      const savedCode =
        normalizeReferralCode(
          localStorage.getItem(
            "Norvexa_referral"
          )
        );

      if (savedCode) {
        setReferralCode(
          savedCode
        );
      }
    }
  }, [searchParams]);

  async function submit() {
    setMessage("");

    if (
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setMessage(
        "Please fill in every field."
      );

      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setMessage(
        "Passwords do not match."
      );

      return;
    }

    if (
      password.length < 6
    ) {
      setMessage(
        "Password must be at least 6 characters."
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

      return;
    }

    setLoading(true);

    try {
      const supabase =
        createBrowserClient(
          url,
          key
        );

      const savedReferral =
        normalizeReferralCode(
          referralCode ||
            localStorage.getItem(
              "Norvexa_referral"
            )
        );

      const {
        data,
        error,
      } =
        await supabase.auth.signUp(
          {
            email:
              email
                .trim()
                .toLowerCase(),

            password,

            options: {
              data: {
                referral_code:
                  savedReferral ||
                  null,
              },
            },
          }
        );

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error(
          "Account could not be created."
        );
      }

      localStorage.removeItem(
        "Norvexa_referral"
      );

      if (data.session) {
        setMessage(
          nextPath ===
            "/dashboard"
            ? "Account created. Opening your dashboard..."
            : "Account created. Taking you back..."
        );

        window.setTimeout(
          () => {
            router.replace(
              nextPath
            );

            router.refresh();
          },
          700
        );

        return;
      }

      setMessage(
        "Account created. Check your email if confirmation is required."
      );

      window.setTimeout(
        () => {
          router.replace(
            loginHref
          );
        },
        1200
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to create your account."
      );

      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <div className="form card">
        <div className="brand">
          Norvexa{" "}
          <span>AI</span>
        </div>

        <h1>
          Create your account
        </h1>

        <p className="muted">
          {nextPath ===
          "/dashboard"
            ? "Create an account to get started."
            : "Create an account to continue where you left off."}
        </p>

        {referralCode && (
          <div
            style={{
              marginBottom: 16,
              padding:
                "11px 12px",
              border:
                "1px solid rgba(96,165,250,0.2)",
              borderRadius: 10,
              background:
                "rgba(37,99,235,0.06)",
            }}
          >
            <div
              style={{
                color:
                  "#93c5fd",
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              👥 Referral applied
            </div>

            <div
              style={{
                marginTop: 4,
                color:
                  "#d1d5db",
                fontSize: 11,
              }}
            >
              Code:{" "}
              <strong>
                {
                  referralCode
                }
              </strong>
            </div>
          </div>
        )}

        {nextPath !==
          "/dashboard" && (
          <div
            style={{
              marginBottom: 16,
              padding:
                "10px 12px",
              border:
                "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              background:
                "rgba(255,255,255,0.025)",
              color:
                "#9ca3af",
              fontSize: 10,
              lineHeight: 1.5,
            }}
          >
            After signup,
            Norvexa will
            continue to{" "}
            <strong
              style={{
                color:
                  "#d1d5db",
              }}
            >
              {nextPath}
            </strong>
            .
          </div>
        )}

        <label>
          Email
        </label>

        <input
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

        <label>
          Password
        </label>

        <input
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
          type="password"
          autoComplete="new-password"
          placeholder="Create a password"
          disabled={loading}
        />

        <label>
          Confirm password
        </label>

        <input
          className="input"
          value={
            confirmPassword
          }
          onChange={(
            event
          ) =>
            setConfirmPassword(
              event.target
                .value
            )
          }
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          disabled={loading}
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
            ? "Creating account..."
            : "Create account"}
        </button>

        {message && (
          <p className="muted">
            {message}
          </p>
        )}

        <p className="muted">
          Already have an
          account?{" "}
          <Link
            className="green"
            href={loginHref}
          >
            Log in
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

function SignupFallback() {
  return (
    <main className="shell">
      <div className="form card">
        <div className="brand">
          Norvexa{" "}
          <span>AI</span>
        </div>

        <h1>
          Create your account
        </h1>

        <p className="muted">
          Loading signup...
        </p>
      </div>
    </main>
  );
}