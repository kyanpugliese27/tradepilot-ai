"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  usePathname,
} from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NorvexaCopilot from "@/components/TradePilotCopilot";

type SubscriptionRow = {
  plan: "free" | "premium";
  status: string;
};

const HIDDEN_ROUTES = new Set([
  "/",
  "/login",
  "/signup",
]);

export default function PremiumCopilotGate() {
  const pathname =
    usePathname();

  const [allowed, setAllowed] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      if (
        !pathname ||
        HIDDEN_ROUTES.has(
          pathname
        )
      ) {
        if (!cancelled) {
          setAllowed(false);
        }

        return;
      }

      const supabase =
        createClient();

      try {
        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (
          cancelled ||
          userError ||
          !user
        ) {
          if (!cancelled) {
            setAllowed(false);
          }

          return;
        }

        const {
          data,
          error:
            subscriptionError,
        } = await supabase
          .from(
            "premium_subscriptions"
          )
          .select(
            "plan, status"
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

        if (cancelled) {
          return;
        }

        if (
          subscriptionError
        ) {
          console.warn(
            "Copilot premium check failed:",
            subscriptionError.message
          );

          setAllowed(false);
          return;
        }

        const subscription =
          data as SubscriptionRow | null;

        const premiumActive =
          subscription?.plan ===
            "premium" &&
          [
            "active",
            "trialing",
          ].includes(
            subscription.status
          );

        setAllowed(
          premiumActive
        );
      } catch (error) {
        console.warn(
          "Copilot access check failed:",
          error
        );

        if (!cancelled) {
          setAllowed(false);
        }
      }
    }

    setAllowed(false);
    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!allowed) {
    return null;
  }

  return (
    <NorvexaCopilot />
  );
}