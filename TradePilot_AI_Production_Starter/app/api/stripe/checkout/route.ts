import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const stripeSecretKey =
      process.env.STRIPE_SECRET_KEY;

    console.log(
      "STRIPE MODE:",
      stripeSecretKey?.startsWith("sk_live_")
        ? "LIVE"
        : stripeSecretKey?.startsWith("sk_test_")
        ? "TEST"
        : "UNKNOWN"
    );

    const premiumPriceId =
      process.env.STRIPE_PREMIUM_PRICE_ID;

    if (!stripeSecretKey) {
      return NextResponse.json(
        {
          error:
            "STRIPE_SECRET_KEY is missing.",
        },
        { status: 500 }
      );
    }

    if (!premiumPriceId) {
      return NextResponse.json(
        {
          error:
            "STRIPE_PREMIUM_PRICE_ID is missing.",
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

    if (
      existingSubscription?.plan ===
        "premium" &&
      [
        "active",
        "trialing",
      ].includes(
        existingSubscription.status
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You already have an active Premium subscription.",
        },
        { status: 409 }
      );
    }

    let customerId =
      existingSubscription
        ?.stripe_customer_id ||
      null;

    if (!customerId) {
      const customer =
        await stripe.customers.create(
          {
            email:
              user.email ||
              undefined,

            metadata: {
              tradepilot_user_id:
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
              existingSubscription?.plan ||
              "free",
            status:
              existingSubscription?.status ||
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

    const session =
      await stripe.checkout.sessions.create(
        {
          mode:
            "subscription",

          customer:
            customerId,

          line_items: [
            {
              price:
                premiumPriceId,
              quantity: 1,
            },
          ],

          client_reference_id:
            user.id,

          metadata: {
            tradepilot_user_id:
              user.id,
          },

          subscription_data: {
            metadata: {
              tradepilot_user_id:
                user.id,
            },
          },

          success_url:
            `${origin}/premium?success=1&session_id={CHECKOUT_SESSION_ID}`,

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
        url: session.url,
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