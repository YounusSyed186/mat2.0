import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

function currentMonthBucket() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export function useAiAccess() {
  const { currentUser, profile } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);
  const [aiTokenLimit, setAiTokenLimit] = useState<number | null>(null);
  const [aiTokensUsed, setAiTokensUsed] = useState(0);
  const [usageLoading, setUsageLoading] = useState(false);

  const refreshUsage = useCallback(async () => {
    if (!currentUser) {
      setAiTokensUsed(0);
      return;
    }

    setUsageLoading(true);
    try {
      const monthBucket = currentMonthBucket();

      const { data, error } = await supabase
        .from("ai_usage_events")
        .select("estimated_tokens")
        .eq("user_id", currentUser.id)
        .eq("month_bucket", monthBucket);

      if (error) {
        console.error("AI usage fetch failed:", error);
        return;
      }

      const used = (data || []).reduce((total, event) => total + Number(event.estimated_tokens || 0), 0);
      console.info("[useAiAccess] Monthly AI usage loaded", {
        userId: currentUser.id,
        monthBucket,
        eventCount: data?.length || 0,
        used,
      });
      setAiTokensUsed(used);
    } catch (err) {
      console.error("Unexpected AI usage error:", err);
    } finally {
      setUsageLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setHasAccess(false);
      setPlanName(null);
      setAiTokenLimit(null);
      setAiTokensUsed(0);
      return;
    }

    const userId = currentUser.id;

    async function checkAccess() {
      try {
        if (profile?.role === "admin" || profile?.role === "primary_admin") {
          setPlanName("Admin");
          setAiTokenLimit(null);
          setHasAccess(true);
          console.info("[useAiAccess] Admin AI access bypass", {
            userId,
            role: profile.role,
          });
          await refreshUsage();
          return;
        }

        const { data, error } = await supabase
          .from("user_subscriptions")
          .select("*, plan:subscription_plans(name, ai_token_limit_monthly)")
          .eq("user_id", userId)
          .eq("status", "active")
          .gte("end_date", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("AI access check failed:", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            raw: error,
          });
          setHasAccess(false);
          setPlanName(null);
          setAiTokenLimit(null);
          return;
        }

        console.info("[useAiAccess] Active subscription plan response", {
          userId,
          subscriptionId: data?.id,
          status: data?.status,
          endDate: data?.end_date,
          plan: data?.plan,
        });

        if (data?.plan?.name) {
          const name = data.plan.name;
          const limit = Number(data.plan.ai_token_limit_monthly || 0);
          setPlanName(name);
          setAiTokenLimit(limit);
          setHasAccess(limit > 0);
          await refreshUsage();
        } else {
          setPlanName(null);
          setAiTokenLimit(null);
          setHasAccess(false);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setHasAccess(false);
        setPlanName(null);
        setAiTokenLimit(null);
      }
    }

    checkAccess();
  }, [currentUser, profile?.role, refreshUsage]);

  const aiTokensRemaining =
    aiTokenLimit === null || aiTokenLimit < 0
      ? null
      : Math.max(aiTokenLimit - aiTokensUsed, 0);

  return {
    hasAccess,
    planName,
    aiTokenLimit,
    aiTokensUsed,
    aiTokensRemaining,
    usageLoading,
    refreshUsage,
    isLoading: hasAccess === null,
  };
}
