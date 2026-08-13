import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request
) {
  const stripeSecretKey =
    process.env.STRIPE_SECRET_KEY;

  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET;

  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY;

  if (
    !stripeSecretKey ||
    !webhookSecret ||
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    return NextResponse.json(
      {
        error:
          "Stripe or Supabase webhook environment variables are missing.",
      },
      { status: 500 }
    );
  }

  const stripe =
    new Stripe(
      stripeSecretKey
    );

  const signature =
    request.headers.get(
      "stripe-signature"
    );

  if (!signature) {
    return NextResponse.json(
      {
        error:
          "Missing Stripe signature.",
      },
      { status: 400 }
    );
  }

  const rawBody =
    await request.text();

  let event:
    Stripe.Event;

  try {
    event =
      stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
  } catch (error) {
    console.error(
      "Stripe webhook signature error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Invalid webhook signature.",
      },
      { status: 400 }
    );
  }

  const supabaseAdmin =
    createSupabaseAdmin(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession:
            false,
          autoRefreshToken:
            false,
        },
      }
    );

  try {
    if (
      event.type ===
      "checkout.session.completed"
    ) {
      const session =
        event.data
          .object as Stripe.Checkout.Session;

      const userId =
        session.metadata
          ?.tradepilot_user_id ||
        session.client_reference_id;

      const customerId =
        typeof session.customer ===
        "string"
          ? session.customer
          : session.customer?.id;

      const subscriptionId =
        typeof session.subscription ===
        "string"
          ? session.subscription
          : session.subscription?.id;

      if (
        userId &&
        customerId
      ) {
        const {
          error:
            checkoutUpdateError,
        } = await supabaseAdmin
          .from(
            "premium_subscriptions"
          )
          .upsert(
            {
              user_id:
                userId,
              stripe_customer_id:
                customerId,
              stripe_subscription_id:
                subscriptionId ||
                null,
            },
            {
              onConflict:
                "user_id",
            }
          );

        if (
          checkoutUpdateError
        ) {
          throw checkoutUpdateError;
        }
      }

      if (subscriptionId) {
        const subscription =
          await stripe.subscriptions.retrieve(
            subscriptionId
          );

        await syncSubscription(
          stripe,
          supabaseAdmin,
          subscription
        );
      }
    }

    if (
      [
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
      ].includes(
        event.type
      )
    ) {
      const subscription =
        event.data
          .object as Stripe.Subscription;

      await syncSubscription(
        stripe,
        supabaseAdmin,
        subscription
      );
    }

    return NextResponse.json(
      {
        received: true,
      }
    );
  } catch (error) {
    console.error(
      "Stripe webhook processing error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Webhook processing failed.",
      },
      { status: 500 }
    );
  }
}

async function syncSubscription(
  stripe: Stripe,
  supabaseAdmin:
    ReturnType<
      typeof createSupabaseAdmin
    >,
  subscription:
    Stripe.Subscription
) {
  const customerId =
    typeof subscription.customer ===
    "string"
      ? subscription.customer
      : subscription.customer.id;

  let userId =
    subscription.metadata
      ?.tradepilot_user_id ||
    null;

  if (!userId) {
    const customer =
      await stripe.customers.retrieve(
        customerId
      );

    if (
      !customer.deleted
    ) {
      userId =
        customer.metadata
          ?.tradepilot_user_id ||
        null;
    }
  }

  if (!userId) {
    const {
      data:
        existingSubscription,
    } = await supabaseAdmin
      .from(
        "premium_subscriptions"
      )
      .select("user_id")
      .eq(
        "stripe_customer_id",
        customerId
      )
      .maybeSingle();

    userId =
      existingSubscription
        ?.user_id ||
      null;
  }

  if (!userId) {
    throw new Error(
      `Unable to match Stripe customer ${customerId} to a TradePilot user.`
    );
  }

  const status =
    subscription.status;

  const hasPremiumAccess =
    status === "active" ||
    status === "trialing";

  const firstItem =
    subscription.items
      .data[0];

  const priceId =
    firstItem
      ?.price?.id ||
    null;

  const currentPeriodEndUnix =
    firstItem
      ?.current_period_end ||
    null;

  const currentPeriodEnd =
    currentPeriodEndUnix
      ? new Date(
          currentPeriodEndUnix *
            1000
        ).toISOString()
      : null;

  const {
    error,
  } = await supabaseAdmin
    .from(
      "premium_subscriptions"
    )
    .upsert(
      {
        user_id:
          userId,
        plan:
          hasPremiumAccess
            ? "premium"
            : "free",
        status,
        stripe_customer_id:
          customerId,
        stripe_subscription_id:
          subscription.id,
        stripe_price_id:
          priceId,
        current_period_end:
          currentPeriodEnd,
        cancel_at_period_end:
          subscription
            .cancel_at_period_end,
      },
      {
        onConflict:
          "user_id",
      }
    );

  if (error) {
    throw error;
  }
}