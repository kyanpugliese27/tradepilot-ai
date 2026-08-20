import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const stripeSecretKey =
      process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      return NextResponse.json(
        {
          error:
            "STRIPE_SECRET_KEY is missing.",
        },
        { status: 500 }
      );
    }

    const stripe = new Stripe(
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
      data: subscription,
      error: subscriptionError,
    } = await supabase
      .from(
        "premium_subscriptions"
      )
      .select(
        `
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

    const customerId =
      subscription
        ?.stripe_customer_id;

    if (!customerId) {
      return NextResponse.json(
        {
          error:
            "No Stripe customer is connected to this account.",
        },
        { status: 404 }
      );
    }

    // Make sure the customer ID actually exists
    // in the Stripe account connected to this deployment.
    try {
      const customer =
        await stripe.customers.retrieve(
          customerId
        );

      if (customer.deleted) {
        return NextResponse.json(
          {
            error:
              "The Stripe customer connected to this account has been deleted.",
          },
          { status: 404 }
        );
      }
    } catch (error) {
      if (
        error instanceof Stripe.errors.StripeInvalidRequestError &&
        error.code ===
          "resource_missing"
      ) {
        return NextResponse.json(
          {
            error:
              "The Stripe customer connected to this account could not be found.",
          },
          { status: 404 }
        );
      }

      throw error;
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

    const portalSession =
      await stripe.billingPortal.sessions.create(
        {
          customer:
            customerId,

          return_url:
            `${origin}/settings/subscription`,
        }
      );

    if (!portalSession.url) {
      throw new Error(
        "Stripe did not return a billing portal URL."
      );
    }

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error(
      "Stripe customer portal error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to open billing management.",
      },
      { status: 500 }
    );
  }
}