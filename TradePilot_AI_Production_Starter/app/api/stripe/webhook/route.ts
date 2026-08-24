import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const stripeSecretKey =
    process.env.STRIPE_SECRET_KEY;

  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET;

  const lifetimePriceId =
    process.env.STRIPE_PREMIUM_LIFETIME_PRICE_ID;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    new Stripe(stripeSecretKey);

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

  let event: Stripe.Event;

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
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

  try {
    if (
      event.type ===
        "checkout.session.completed" ||
      event.type ===
        "checkout.session.async_payment_succeeded"
    ) {
      const session =
        event.data
          .object as Stripe.Checkout.Session;

      await handleCheckoutSession(
        stripe,
        supabaseAdmin,
        session,
        lifetimePriceId || null
      );
    }

    if (
      [
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
      ].includes(event.type)
    ) {
      const subscription =
        event.data
          .object as Stripe.Subscription;

      await syncSubscription(
        stripe,
        supabaseAdmin,
        subscription,
        lifetimePriceId || null
      );
    }

    return NextResponse.json({
      received: true,
    });
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

async function handleCheckoutSession(
  stripe: Stripe,
  supabaseAdmin: any,
  session: Stripe.Checkout.Session,
  lifetimePriceId: string | null
) {
  const userId =
    session.metadata
      ?.Norvexa_user_id ||
    session.metadata
      ?.tradepilot_user_id ||
    session.client_reference_id;

  if (!userId) {
    throw new Error(
      `Checkout session ${session.id} does not contain a Norvexa user ID.`
    );
  }

  const customerId =
    typeof session.customer ===
    "string"
      ? session.customer
      : session.customer?.id;

  if (!customerId) {
    throw new Error(
      `Checkout session ${session.id} does not contain a Stripe customer.`
    );
  }

  /*
    MONTHLY / YEARLY SUBSCRIPTIONS
  */
  if (
    session.mode ===
      "subscription"
  ) {
    const subscriptionId =
      typeof session.subscription ===
      "string"
        ? session.subscription
        : session.subscription?.id;

    if (!subscriptionId) {
      throw new Error(
        `Subscription checkout ${session.id} did not return a subscription ID.`
      );
    }

    const {
      error:
        checkoutUpdateError,
    } =
      await supabaseAdmin
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
              subscriptionId,
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

    const subscription =
      await stripe.subscriptions.retrieve(
        subscriptionId
      );

    await syncSubscription(
      stripe,
      supabaseAdmin,
      subscription,
      lifetimePriceId
    );

    return;
  }

  /*
    LIFETIME / ONE-TIME PAYMENT
  */
  if (
    session.mode ===
      "payment"
  ) {
    const selectedPlan =
      session.metadata
        ?.Norvexa_plan;

    const paymentSucceeded =
      session.payment_status ===
        "paid" ||
      session.payment_status ===
        "no_payment_required";

    if (!paymentSucceeded) {
      console.log(
        `Checkout session ${session.id} has not been paid yet. Current status: ${session.payment_status}`
      );
      return;
    }

    /*
      We only grant lifetime access when
      the checkout explicitly says it was
      the lifetime plan.
    */
    if (
      selectedPlan !==
        "lifetime"
    ) {
      console.log(
        `Ignoring one-time checkout ${session.id} because it is not marked as Norvexa lifetime.`
      );
      return;
    }

    const lineItems =
      await stripe.checkout.sessions.listLineItems(
        session.id,
        {
          limit: 10,
        }
      );

    const purchasedPriceId =
      lineItems.data[0]
        ?.price?.id ||
      lifetimePriceId ||
      null;

    if (
      lifetimePriceId &&
      purchasedPriceId !==
        lifetimePriceId
    ) {
      throw new Error(
        `Lifetime checkout used unexpected Stripe price ${purchasedPriceId}.`
      );
    }

    const {
      error:
        lifetimeUpdateError,
    } =
      await supabaseAdmin
        .from(
          "premium_subscriptions"
        )
        .upsert(
          {
            user_id:
              userId,

            plan:
              "premium",

            /*
              Keep "active" so your existing
              Premium gates continue working
              without needing a new DB status.
            */
            status:
              "active",

            stripe_customer_id:
              customerId,

            stripe_subscription_id:
              null,

            stripe_price_id:
              purchasedPriceId,

            current_period_end:
              null,

            cancel_at_period_end:
              false,
          },
          {
            onConflict:
              "user_id",
          }
        );

    if (
      lifetimeUpdateError
    ) {
      throw lifetimeUpdateError;
    }

    console.log(
      `Lifetime Premium activated for Norvexa user ${userId}.`
    );
  }
}

async function syncSubscription(
  stripe: Stripe,
  supabaseAdmin: any,
  subscription: Stripe.Subscription,
  lifetimePriceId: string | null
) {
  const customerId =
    typeof subscription.customer ===
    "string"
      ? subscription.customer
      : subscription.customer.id;

  let userId =
    subscription.metadata
      ?.Norvexa_user_id ||
    subscription.metadata
      ?.tradepilot_user_id ||
    null;

  if (!userId) {
    const customer =
      await stripe.customers.retrieve(
        customerId
      );

    if (!customer.deleted) {
      userId =
        customer.metadata
          ?.Norvexa_user_id ||
        customer.metadata
          ?.tradepilot_user_id ||
        null;
    }
  }

  if (!userId) {
    const {
      data:
        existingSubscription,
      error:
        lookupError,
    } =
      await supabaseAdmin
        .from(
          "premium_subscriptions"
        )
        .select(
          "user_id"
        )
        .eq(
          "stripe_customer_id",
          customerId
        )
        .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    userId =
      existingSubscription
        ?.user_id ||
      null;
  }

  if (!userId) {
    throw new Error(
      `Unable to match Stripe customer ${customerId} to a Norvexa user.`
    );
  }

  /*
    Safety:
    if this Norvexa user already owns
    Lifetime Premium, do not let a stale
    subscription event downgrade it.
  */
  if (lifetimePriceId) {
    const {
      data: currentAccess,
      error:
        currentAccessError,
    } =
      await supabaseAdmin
        .from(
          "premium_subscriptions"
        )
        .select(
          `
            plan,
            status,
            stripe_price_id,
            stripe_subscription_id
          `
        )
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();

    if (
      currentAccessError
    ) {
      throw currentAccessError;
    }

    const hasLifetimeAccess =
      currentAccess?.plan ===
        "premium" &&
      currentAccess
        ?.stripe_price_id ===
        lifetimePriceId &&
      !currentAccess
        ?.stripe_subscription_id;

    if (hasLifetimeAccess) {
      console.log(
        `Ignoring subscription event ${subscription.id} because user ${userId} already owns Lifetime Premium.`
      );
      return;
    }
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
      ?.price
      ?.id ||
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
  } =
    await supabaseAdmin
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