import {
  createServerClient,
} from "@supabase/ssr";
import {
  type NextRequest,
  NextResponse,
} from "next/server";

/*
|--------------------------------------------------------------------------
| Public routes
|--------------------------------------------------------------------------
*/

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/premium",
  "/premium-required",
];

/*
|--------------------------------------------------------------------------
| Auth pages
|--------------------------------------------------------------------------
|
| If a user is already signed in, these should send them to the dashboard.
|
*/

const AUTH_PAGES = [
  "/login",
  "/signup",
  "/forgot-password",
];

/*
|--------------------------------------------------------------------------
| Login required
|--------------------------------------------------------------------------
*/

const AUTH_REQUIRED_PATHS = [
  "/activity",
  "/admin",
  "/community",
  "/compare",
  "/dashboard",
  "/earnings",
  "/markets",
  "/notifications",
  "/paper-trading",
  "/portfolio-performance",
  "/profile",
  "/referrals",
  "/settings",
  "/stock",
  "/update-password",
  "/watchlist",
];

/*
|--------------------------------------------------------------------------
| Premium required
|--------------------------------------------------------------------------
*/

const PREMIUM_PAGE_PATHS = [
  "/analytics",
  "/portfolio-analytics",
  "/research",
  "/screener",
  "/copilot",
];

/*
|--------------------------------------------------------------------------
| Premium APIs
|--------------------------------------------------------------------------
*/

const PREMIUM_API_PATHS = [
  "/api/copilot",
  "/api/research",
  "/api/research-conversations",
  "/api/screener",
];

/*
|--------------------------------------------------------------------------
| Admin routes + APIs
|--------------------------------------------------------------------------
*/

const ADMIN_PATHS = [
  "/admin",
  "/api/admin",
];

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function matchesRoute(
  pathname: string,
  routes: string[]
) {
  return routes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(
        `${route}/`
      )
  );
}

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

export async function middleware(
  request: NextRequest
) {
  let response =
    NextResponse.next({
      request,
    });

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const pathname =
    request.nextUrl.pathname;

  const isPublic =
    matchesRoute(
      pathname,
      PUBLIC_PATHS
    );

  const isAuthPage =
    matchesRoute(
      pathname,
      AUTH_PAGES
    );

  const requiresLogin =
    matchesRoute(
      pathname,
      AUTH_REQUIRED_PATHS
    );

  const requiresPremium =
    matchesRoute(
      pathname,
      PREMIUM_PAGE_PATHS
    );

  const isPremiumApi =
    matchesRoute(
      pathname,
      PREMIUM_API_PATHS
    );

  const requiresAdmin =
    matchesRoute(
      pathname,
      ADMIN_PATHS
    );

  /*
  |--------------------------------------------------------------------------
  | Routes with no access rule
  |--------------------------------------------------------------------------
  */

  if (
    !isPublic &&
    !requiresLogin &&
    !requiresPremium &&
    !isPremiumApi &&
    !requiresAdmin
  ) {
    return response;
  }

  /*
  |--------------------------------------------------------------------------
  | Fail closed if Supabase is not configured
  |--------------------------------------------------------------------------
  */

  if (
    !supabaseUrl ||
    !supabaseAnonKey
  ) {
    console.error(
      "Missing Supabase environment variables."
    );

    return NextResponse.json(
      {
        error:
          "Server configuration error.",
      },
      {
        status: 500,
      }
    );
  }

  const supabase =
    createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(cookiesToSet) {
            cookiesToSet.forEach(
              ({
                name,
                value,
              }) => {
                request.cookies.set(
                  name,
                  value
                );
              }
            );

            response =
              NextResponse.next({
                request,
              });

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                response.cookies.set(
                  name,
                  value,
                  options
                );
              }
            );
          },
        },
      }
    );

  /*
  |--------------------------------------------------------------------------
  | Auth pages
  |--------------------------------------------------------------------------
  |
  | Authenticated users should not stay on login/signup/forgot-password.
  |
  */

  if (isAuthPage) {
    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (user) {
      const dashboardUrl =
        request.nextUrl.clone();

      dashboardUrl.pathname =
        "/dashboard";

      dashboardUrl.search = "";

      return NextResponse.redirect(
        dashboardUrl
      );
    }

    return response;
  }

  /*
  |--------------------------------------------------------------------------
  | Other public routes
  |--------------------------------------------------------------------------
  */

  if (
    isPublic &&
    !requiresPremium &&
    !isPremiumApi &&
    !requiresAdmin
  ) {
    return response;
  }

  /*
  |--------------------------------------------------------------------------
  | Get authenticated user
  |--------------------------------------------------------------------------
  */

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  /*
  |--------------------------------------------------------------------------
  | Authentication required
  |--------------------------------------------------------------------------
  */

  if (
    userError ||
    !user
  ) {
    if (
      isPremiumApi ||
      requiresAdmin
    ) {
      return NextResponse.json(
        {
          error:
            "You must be signed in.",
        },
        {
          status: 401,
        }
      );
    }

    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname =
      "/login";

    loginUrl.search = "";

    loginUrl.searchParams.set(
      "next",
      `${pathname}${request.nextUrl.search}`
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Admin protection
  |--------------------------------------------------------------------------
  */

  if (requiresAdmin) {
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

    const isAdmin =
      !profileError &&
      profile?.role === "admin";

    if (!isAdmin) {
      /*
      |--------------------------------------------------------------------------
      | Admin API
      |--------------------------------------------------------------------------
      */

      if (
        pathname === "/api/admin" ||
        pathname.startsWith(
          "/api/admin/"
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Admin access required.",
          },
          {
            status: 403,
          }
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Admin page
      |--------------------------------------------------------------------------
      */

      const dashboardUrl =
        request.nextUrl.clone();

      dashboardUrl.pathname =
        "/dashboard";

      dashboardUrl.search = "";

      return NextResponse.redirect(
        dashboardUrl
      );
    }

    return response;
  }

  /*
  |--------------------------------------------------------------------------
  | Standard authenticated routes
  |--------------------------------------------------------------------------
  */

  if (
    !requiresPremium &&
    !isPremiumApi
  ) {
    return response;
  }

  /*
  |--------------------------------------------------------------------------
  | Premium verification
  |--------------------------------------------------------------------------
  */

  const {
    data: subscription,
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

  /*
  |--------------------------------------------------------------------------
  | Premium verification failure
  |--------------------------------------------------------------------------
  */

  if (subscriptionError) {
    if (isPremiumApi) {
      return NextResponse.json(
        {
          error:
            "Unable to verify Premium access.",
        },
        {
          status: 503,
        }
      );
    }

    const verificationUrl =
      request.nextUrl.clone();

    verificationUrl.pathname =
      "/premium-required";

    verificationUrl.search = "";

    verificationUrl.searchParams.set(
      "reason",
      "verification"
    );

    verificationUrl.searchParams.set(
      "from",
      pathname
    );

    return NextResponse.redirect(
      verificationUrl
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Determine Premium access
  |--------------------------------------------------------------------------
  */

  const hasPremiumAccess =
    subscription?.plan ===
      "premium" &&
    [
      "active",
      "trialing",
    ].includes(
      subscription.status
    );

  /*
  |--------------------------------------------------------------------------
  | Premium required
  |--------------------------------------------------------------------------
  */

  if (!hasPremiumAccess) {
    if (isPremiumApi) {
      return NextResponse.json(
        {
          error:
            "Norvexa Premium is required to use this feature.",
          premiumRequired:
            true,
          upgradeUrl:
            "/premium",
        },
        {
          status: 403,
        }
      );
    }

    const upgradeUrl =
      request.nextUrl.clone();

    upgradeUrl.pathname =
      "/premium-required";

    upgradeUrl.search = "";

    upgradeUrl.searchParams.set(
      "from",
      pathname
    );

    return NextResponse.redirect(
      upgradeUrl
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest).*)",
  ],
};