import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PremiumPlan = "monthly" | "yearly" | "lifetime";

export async function POST(request: Request) {
  try {
    const stripeSecretKey =
      process.env.STRIPE_SECRET_KEY;

    const monthlyPriceId =
      process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID;

    const yearlyPriceId =
      process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID;

    const lifetimePriceId =
      process.env.STRIPE_PREMIUM_LIFETIME_PRICE_ID;

    if (!stripeSecretKey) {
      return NextResponse.json(
        {
          error:
            "STRIPE_SECRET_KEY is missing.",
        },
        { status: 500 }
      );
    }

    if (
      !monthlyPriceId ||
      !yearlyPriceId ||
      !lifetimePriceId
    ) {
      return NextResponse.json(
        {
          error:
            "One or more Norvexa Premium Stripe Price IDs are missing.",
        },
        { status: 500 }
      );
    }

    const stripe =
      new Stripe(
        stripeSecretKey
      );

    const supabase =
      await createClient();

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "You must be signed in.",
        },
        { status: 401 }
      );
    }

    let body: {
      plan?: PremiumPlan;
    } = {};

    try {
      body =
        await request.json();
    } catch {
      body = {};
    }

    const selectedPlan =
      body.plan;

    if (
      selectedPlan !== "monthly" &&
      selectedPlan !== "yearly" &&
      selectedPlan !== "lifetime"
    ) {
      return NextResponse.json(
        {
          error:
            "Please choose monthly, yearly, or lifetime Premium.",
        },
        { status: 400 }
      );
    }

    const priceId =
      selectedPlan === "monthly"
        ? monthlyPriceId
        : selectedPlan === "yearly"
        ? yearlyPriceId
        : lifetimePriceId;

    const checkoutMode:
      | "subscription"
      | "payment" =
      selectedPlan === "lifetime"
        ? "payment"
        : "subscription";

    const {
      data: existingSubscription,
      error: subscriptionError,
    } = await supabase
      .from(
        "premium_subscriptions"
      )
      .select(
        `
          user_id,
          plan,
          status,
          stripe_customer_id,
          stripe_subscription_id
        `
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

    if (subscriptionError) {
      throw new Error(
        subscriptionError.message
      );
    }

    const alreadyHasPremium =
      existingSubscription?.plan ===
        "premium" &&
      [
        "active",
        "trialing",
        "lifetime",
      ].includes(
        existingSubscription.status
      );

    if (alreadyHasPremium) {
      return NextResponse.json(
        {
          error:
            "You already have active Norvexa Premium access.",
        },
        { status: 409 }
      );
    }

    let customerId =
      existingSubscription
        ?.stripe_customer_id ||
      null;

    if (customerId) {
      try {
        const existingCustomer =
          await stripe.customers.retrieve(
            customerId
          );

        if (
          existingCustomer.deleted
        ) {
          customerId = null;
        }
      } catch {
        customerId = null;
      }
    }

    if (!customerId) {
      const customer =
        await stripe.customers.create(
          {
            email:
              user.email ||
              undefined,

            metadata: {
              Norvexa_user_id:
                user.id,
            },
          }
        );

      customerId =
        customer.id;

      const {
        error: upsertError,
      } = await supabase
        .from(
          "premium_subscriptions"
        )
        .upsert(
          {
            user_id:
              user.id,

            plan:
              existingSubscription
                ?.plan ||
              "free",

            status:
              existingSubscription
                ?.status ||
              "free",

            stripe_customer_id:
              customerId,
          },
          {
            onConflict:
              "user_id",
          }
        );

      if (upsertError) {
        throw new Error(
          upsertError.message
        );
      }
    }

    const requestUrl =
      new URL(
        request.url
      );

    const configuredSiteUrl =
      process.env
        .NEXT_PUBLIC_SITE_URL;

    const origin =
      configuredSiteUrl ||
      requestUrl.origin;

    const commonMetadata = {
      Norvexa_user_id:
        user.id,

      Norvexa_plan:
        selectedPlan,
    };

    const session =
      await stripe.checkout.sessions.create(
        checkoutMode ===
          "subscription"
          ? {
              mode:
                "subscription",

              customer:
                customerId,

              payment_method_collection:
                "if_required",

              line_items: [
                {
                  price:
                    priceId,
                  quantity: 1,
                },
              ],

              client_reference_id:
                user.id,

              metadata:
                commonMetadata,

              subscription_data: {
                metadata:
                  commonMetadata,
              },

              success_url:
                `${origin}/premium?success=1&plan=${selectedPlan}&session_id={CHECKOUT_SESSION_ID}`,

              cancel_url:
                `${origin}/premium?canceled=1`,

              allow_promotion_codes:
                true,
            }
          : {
              mode:
                "payment",

              customer:
                customerId,

              line_items: [
                {
                  price:
                    priceId,
                  quantity: 1,
                },
              ],

              client_reference_id:
                user.id,

              metadata:
                commonMetadata,

              payment_intent_data: {
                metadata:
                  commonMetadata,
              },

              success_url:
                `${origin}/premium?success=1&plan=lifetime&session_id={CHECKOUT_SESSION_ID}`,

              cancel_url:
                `${origin}/premium?canceled=1`,

              allow_promotion_codes:
                true,
            }
      );

    if (!session.url) {
      throw new Error(
        "Stripe did not return a Checkout URL."
      );
    }

    return NextResponse.json(
      {
        url:
          session.url,

        plan:
          selectedPlan,
      }
    );
  } catch (error) {
    console.error(
      "Stripe checkout error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start Stripe Checkout.",
      },
      { status: 500 }
    );
  }
}