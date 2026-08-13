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
      data: subscription,
      error:
        subscriptionError,
    } = await supabase
      .from(
        "premium_subscriptions"
      )
      .select(
        `
          stripe_customer_id
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
            "No Stripe customer was found for this account.",
        },
        { status: 404 }
      );
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
            `${origin}/premium`,
        }
      );

    return NextResponse.json(
      {
        url:
          portalSession.url,
      }
    );
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