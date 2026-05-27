import { supabase } from "@/lib/supabaseClient";

export type ProfileViewLimitResult = {
  allowed: boolean;
  already_viewed?: boolean;
  remaining?: number | null;
  limit?: number | null;
  reason?: string;
};

export async function recordProfileView(viewedUserId: string): Promise<ProfileViewLimitResult> {
  const { data, error } = await supabase.rpc("record_profile_view", {
    viewed_user_id: viewedUserId,
  });

  if (error) throw error;
  return (data as ProfileViewLimitResult) || { allowed: true };
}

export type MessageLimitResult = {
  allowed: boolean;
  planName: string | null;
  limit: number | null;
  used: number;
  remaining: number | null;
  reason?: string;
};

export async function checkMessageLimit(userId: string, userRole?: string | null): Promise<MessageLimitResult> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthBucket = monthStart.toISOString();

  if (userRole === "admin" || userRole === "primary_admin") {
    console.info("[MessageLimit] Admin bypass", { userId, userRole });
    return { allowed: true, planName: "Admin", limit: null, used: 0, remaining: null, reason: "admin_bypass" };
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("user_subscriptions")
    .select("id, status, end_date, plan:subscription_plans(name, message_limit_monthly)")
    .eq("user_id", userId)
    .eq("status", "active")
    .gte("end_date", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscriptionError) {
    console.error("[MessageLimit] Failed to load active subscription", {
      userId,
      message: subscriptionError.message,
      code: subscriptionError.code,
      details: subscriptionError.details,
      hint: subscriptionError.hint,
      raw: subscriptionError,
    });
    throw subscriptionError;
  }

  const plan = subscription?.plan as { name?: string | null; message_limit_monthly?: number | null } | null | undefined;
  const limit = plan?.message_limit_monthly ?? null;
  const planName = plan?.name ?? null;

  const { count, error: countError } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", userId)
    .gte("created_at", monthBucket);

  if (countError) {
    console.error("[MessageLimit] Failed to count sent messages", {
      userId,
      monthBucket,
      message: countError.message,
      code: countError.code,
      details: countError.details,
      hint: countError.hint,
      raw: countError,
    });
    throw countError;
  }

  const used = count || 0;
  const allowed = limit === null || limit < 0 || used < limit;
  const remaining = limit === null || limit < 0 ? null : Math.max(limit - used, 0);

  console.info("[MessageLimit] Current message usage", {
    userId,
    subscriptionId: subscription?.id,
    planName,
    limit,
    used,
    remaining,
    allowed,
    monthBucket,
  });

  return {
    allowed,
    planName,
    limit,
    used,
    remaining,
    reason: allowed ? undefined : "message_limit_exceeded",
  };
}
