import "server-only";

import {
  createClient,
} from "@supabase/supabase-js";

export type AwardBadgeResult = {
  awarded: boolean;
  badge_id: string;
  slug: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  earned_at: string;
};

export async function awardBadge(
  userId: string,
  badgeSlug: string
): Promise<
  AwardBadgeResult | null
> {
  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY;

  if (
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    throw new Error(
      "Badge service environment variables are missing."
    );
  }

  if (!userId) {
    throw new Error(
      "A user id is required to award a badge."
    );
  }

  if (!badgeSlug.trim()) {
    throw new Error(
      "A badge slug is required."
    );
  }

  const admin =
    createClient(
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

  const {
    data,
    error,
  } = await admin.rpc(
    "award_Norvexa_badge",
    {
      target_user_id:
        userId,
      target_badge_slug:
        badgeSlug
          .trim()
          .toLowerCase(),
    }
  );

  if (error) {
    throw new Error(
      `Unable to award badge "${badgeSlug}": ${error.message}`
    );
  }

  const result =
    Array.isArray(data)
      ? data[0]
      : null;

  if (!result) {
    return null;
  }

  return result as AwardBadgeResult;
}