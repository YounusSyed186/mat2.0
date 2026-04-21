import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

// Plans that unlock AI features
const AI_ELIGIBLE_PLANS = ["Gold", "Diamond"];

export function useAiAccess() {
  const { currentUser } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setHasAccess(false);
      setPlanName(null);
      return;
    }

    async function checkAccess() {
      try {
        const { data, error } = await supabase
          .from("user_subscriptions")
          .select("*, plan:subscription_plans(name)")
          .eq("user_id", currentUser?.id)
          .eq("status", "active")
          .gte("end_date", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("AI access check failed:", error);
          setHasAccess(false);
          setPlanName(null);
          return;
        }

        if (data?.plan?.name) {
          const name = data.plan.name;
          setPlanName(name);
          setHasAccess(AI_ELIGIBLE_PLANS.includes(name));
        } else {
          setPlanName(null);
          setHasAccess(false);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setHasAccess(false);
        setPlanName(null);
      }
    }

    checkAccess();
  }, [currentUser]);

  return { hasAccess, planName, isLoading: hasAccess === null };
}