import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const adminEmail = process.env.TRADEPILOT_ADMIN_EMAIL?.trim().toLowerCase();

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !serviceRoleKey ||
      !stripeSecretKey ||
      !adminEmail
    ) {
      return NextResponse.json(
        { error: "Admin environment variables are not configured." },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Cookies can be read-only in some server contexts.
          }
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 }
      );
    }

    if (user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const admin = createSupabaseAdmin(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const stripe = new Stripe(stripeSecretKey);

    const [allUsers, stripeSubscriptions, allCharges] = await Promise.all([
      listAllUsers(admin),
      listAllStripeSubscriptions(stripe),
      listAllStripeCharges(stripe),
    ]);

    const { data: subscriptionRows, error: subscriptionError } = await admin
      .from("premium_subscriptions")
      .select(`
        user_id,
        plan,
        status,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_price_id,
        current_period_end,
        cancel_at_period_end,
        created_at,
        updated_at
      `);

    if (subscriptionError) {
      throw new Error(subscriptionError.message);
    }

    const subscriptions = subscriptionRows || [];
    const subscriptionByUser = new Map(
      subscriptions.map((subscription) => [subscription.user_id, subscription])
    );

    const activeStatuses = new Set(["active", "trialing"]);

    const premiumUsers = subscriptions.filter(
      (subscription) =>
        subscription.plan === "premium" &&
        activeStatuses.has(subscription.status)
    );

    const scheduledCancellations = premiumUsers.filter(
      (subscription) => subscription.cancel_at_period_end
    );

    const totalUsers = allUsers.length;
    const premiumCount = premiumUsers.length;
    const freeCount = Math.max(0, totalUsers - premiumCount);

    const activeStripeSubscriptions = stripeSubscriptions.filter(
      (subscription) =>
        subscription.status === "active" || subscription.status === "trialing"
    );

    const stripeMrr = activeStripeSubscriptions.reduce(
      (total, subscription) => total + subscriptionMonthlyValue(subscription),
      0
    );

    const successfulCharges = allCharges.filter(
      (charge) => charge.paid && charge.status === "succeeded"
    );

    const lifetimeCollected = successfulCharges.reduce(
      (total, charge) =>
        total + Math.max(0, charge.amount_captured - charge.amount_refunded),
      0
    ) / 100;

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const newUsersLast7Days = allUsers.filter(
      (authUser) => new Date(authUser.created_at).getTime() >= sevenDaysAgo
    ).length;

    const revenueLast30Days =
      successfulCharges
        .filter((charge) => charge.created * 1000 >= thirtyDaysAgo)
        .reduce(
          (total, charge) =>
            total + Math.max(0, charge.amount_captured - charge.amount_refunded),
          0
        ) / 100;

    const userGrowth = buildDailySeries(30, (start, end) =>
      allUsers.filter((authUser) => {
        const created = new Date(authUser.created_at).getTime();
        return created >= start && created < end;
      }).length
    );

    const revenueGrowth = buildDailySeries(30, (start, end) =>
      successfulCharges
        .filter((charge) => {
          const created = charge.created * 1000;
          return created >= start && created < end;
        })
        .reduce(
          (total, charge) =>
            total + Math.max(0, charge.amount_captured - charge.amount_refunded),
          0
        ) / 100
    );

    let runningUsers = Math.max(
      0,
      totalUsers - userGrowth.reduce((sum, item) => sum + item.value, 0)
    );

    const cumulativeUserGrowth = userGrowth.map((item) => {
      runningUsers += item.value;
      return {
        date: item.date,
        value: runningUsers,
      };
    });

    const recentUsers = [...allUsers]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )
      .slice(0, 20)
      .map((authUser) => {
        const subscription = subscriptionByUser.get(authUser.id);

        const isPremium =
          subscription?.plan === "premium" &&
          activeStatuses.has(subscription.status);

        return {
          id: authUser.id,
          email: authUser.email || "No email",
          createdAt: authUser.created_at,
          lastSignInAt: authUser.last_sign_in_at || null,
          plan: isPremium ? "premium" : "free",
          status: subscription?.status || "free",
          cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
          periodEnd: subscription?.current_period_end || null,
        };
      });

    return NextResponse.json(
      {
        metrics: {
          totalUsers,
          freeUsers: freeCount,
          premiumUsers: premiumCount,
          stripeMrr,
          lifetimeCollected,
          revenueLast30Days,
          scheduledCancellations: scheduledCancellations.length,
          newUsersLast7Days,
          premiumConversionRate:
            totalUsers > 0 ? (premiumCount / totalUsers) * 100 : 0,
        },
        charts: {
          userGrowth: cumulativeUserGrowth,
          revenueGrowth,
        },
        recentUsers,
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Admin metrics error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load admin metrics.",
      },
      { status: 500 }
    );
  }
}

async function listAllUsers(
  admin: ReturnType<typeof createSupabaseAdmin>
) {
  const users: any[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    users.push(...data.users);

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

async function listAllStripeSubscriptions(stripe: Stripe) {
  const subscriptions: Stripe.Subscription[] = [];
  let startingAfter: string | undefined;

  while (true) {
    const page = await stripe.subscriptions.list({
      status: "all",
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    subscriptions.push(...page.data);

    if (!page.has_more || page.data.length === 0) {
      break;
    }

    startingAfter = page.data[page.data.length - 1].id;
  }

  return subscriptions;
}

async function listAllStripeCharges(stripe: Stripe) {
  const charges: Stripe.Charge[] = [];
  let startingAfter: string | undefined;

  while (true) {
    const page = await stripe.charges.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    charges.push(...page.data);

    if (!page.has_more || page.data.length === 0) {
      break;
    }

    startingAfter = page.data[page.data.length - 1].id;
  }

  return charges;
}

function subscriptionMonthlyValue(subscription: Stripe.Subscription) {
  return subscription.items.data.reduce((subscriptionTotal, item) => {
    const recurring = item.price.recurring;
    const unitAmount = item.price.unit_amount || 0;
    const quantity = item.quantity || 1;

    if (!recurring) {
      return subscriptionTotal;
    }

    const amount = (unitAmount * quantity) / 100;
    const count = Math.max(1, recurring.interval_count || 1);

    if (recurring.interval === "month") {
      return subscriptionTotal + amount / count;
    }

    if (recurring.interval === "year") {
      return subscriptionTotal + amount / (12 * count);
    }

    if (recurring.interval === "week") {
      return subscriptionTotal + (amount * 52) / (12 * count);
    }

    if (recurring.interval === "day") {
      return subscriptionTotal + (amount * 365) / (12 * count);
    }

    return subscriptionTotal;
  }, 0);
}

function buildDailySeries(
  days: number,
  getValue: (start: number, end: number) => number
) {
  const result: Array<{ date: string; value: number }> = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let index = days - 1; index >= 0; index -= 1) {
    const start = new Date(today);
    start.setDate(today.getDate() - index);

    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    result.push({
      date: start.toISOString(),
      value: getValue(start.getTime(), end.getTime()),
    });
  }

  return result;
}