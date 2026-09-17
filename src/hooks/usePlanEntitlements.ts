import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import type { SubscriptionPlan } from "@/types";

export function usePlanEntitlements() {
  const { currentUser, profile } = useAuth();
  const [activePlan, setActivePlan] = useState<SubscriptionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setActivePlan(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchPlan() {
      try {
        const { data, error } = await supabase
          .from("user_subscriptions")
          .select("*, plan:subscription_plans(*)")
          .eq("user_id", currentUser.id)
          .eq("status", "active")
          .gte("end_date", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("[usePlanEntitlements] Error fetching user subscription:", error);
        }

        if (isMounted) {
          if (data?.plan) {
            setActivePlan(data.plan as SubscriptionPlan);
          } else {
            setActivePlan(null);
          }
        }
      } catch (err) {
        console.error("[usePlanEntitlements] Unexpected error:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchPlan();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const isAdmin = profile?.role === "admin" || profile?.role === "primary_admin";

  const isPremium = Boolean(
    isAdmin ||
    (activePlan && activePlan.price_monthly > 0) ||
    (activePlan?.name && !activePlan.name.toLowerCase().includes("free"))
  );

  const canViewProfilePhoto = (cardIndex?: number) => {
    if (isAdmin) return true;
    if (activePlan?.allow_unlimited_photos !== undefined) {
      if (activePlan.allow_unlimited_photos) return true;
    } else if (isPremium) {
      return true;
    }
    if (typeof cardIndex === "number" && cardIndex < 3) return true;
    return false;
  };

  const canViewSocialLinks = Boolean(
    isAdmin ||
    (activePlan?.allow_social_links !== undefined ? activePlan.allow_social_links : isPremium)
  );

  return {
    planName: isAdmin ? "Admin" : activePlan?.name || "Free",
    activePlan,
    isPremium,
    canViewProfilePhoto,
    canViewSocialLinks,
    isLoading,
  };
}
