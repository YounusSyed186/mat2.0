import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import type { SubscriptionPlan, UserSubscription } from "@/types";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Crown, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateEmbedding } from "@/lib/ai";

export default function Subscription() {
  const { currentUser, profile } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [activeSub, setActiveSub] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);

      try {
        const plansQuery = supabase
          .from("subscription_plans")
          .select("*")
          .eq("is_active", true)
          .order("price_monthly", { ascending: true });

        const subscriptionQuery = currentUser
          ? supabase
              .from("user_subscriptions")
              .select("*, plan:subscription_plans(*)")
              .eq("user_id", currentUser.id)
              .eq("status", "active")
              .gte("end_date", new Date().toISOString())
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null });

        const [{ data: plansData, error: plansError }, { data: subData, error: subError }] = await Promise.all([
          plansQuery,
          subscriptionQuery,
        ]);

        if (!isMounted) return;

        if (plansError) {
          console.error("[Subscription] Failed to load plans", {
            message: plansError.message,
            code: plansError.code,
            details: plansError.details,
            hint: plansError.hint,
            raw: plansError,
          });
          toast({
            title: "Could not load plans",
            description: plansError.message,
            variant: "destructive",
          });
        }

        if (subError) {
          console.error("[Subscription] Failed to load active subscription", {
            message: subError.message,
            code: subError.code,
            details: subError.details,
            hint: subError.hint,
            raw: subError,
          });
        }

        console.info("[Subscription] Loaded subscription data", {
          userId: currentUser?.id,
          plans: plansData?.map((plan) => ({
            id: plan.id,
            name: plan.name,
            ai_token_limit_monthly: plan.ai_token_limit_monthly,
            message_limit_monthly: plan.message_limit_monthly,
          })),
          activeSubscription: subData,
        });

        if (plansData) setPlans(plansData as SubscriptionPlan[]);
        if (subData) setActiveSub(subData as UserSubscription);
      } catch (err) {
        console.error("Failed to load subscription data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!currentUser) return;
    setIsProcessing(plan.id);

    try {
      // In a real app, you would redirect to Stripe/Payment gateway here.
      // For demonstration, we'll directly create the subscription.

      // Calculate end date based on billing cycle
      const startDate = new Date();
      const endDate = new Date();
      if (billingCycle === "monthly") endDate.setMonth(endDate.getMonth() + 1);
      else if (billingCycle === "quarterly") endDate.setMonth(endDate.getMonth() + 3);
      else if (billingCycle === "yearly") endDate.setFullYear(endDate.getFullYear() + 1);

      // Cancel existing active subscription if any
      if (activeSub) {
        const { error: cancelError } = await supabase
          .from("user_subscriptions")
          .update({ status: "cancelled" })
          .eq("id", activeSub.id);

        if (cancelError) {
          console.error("[Subscription] Failed to cancel previous subscription", {
            subscriptionId: activeSub.id,
            message: cancelError.message,
            code: cancelError.code,
            details: cancelError.details,
            hint: cancelError.hint,
            raw: cancelError,
          });
          throw cancelError;
        }
      }

      console.info("[Subscription] Creating subscription", {
        userId: currentUser.id,
        planId: plan.id,
        planName: plan.name,
        ai_token_limit_monthly: plan.ai_token_limit_monthly,
        message_limit_monthly: plan.message_limit_monthly,
        billingCycle,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const { data, error } = await supabase
        .from("user_subscriptions")
        .insert({
          user_id: currentUser.id,
          plan_id: plan.id,
          billing_cycle: billingCycle,
          status: "active",
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        })
        .select("*, plan:subscription_plans(*)")
        .maybeSingle();

      if (error) throw error;

      console.info("[Subscription] Subscription created", data);
      setActiveSub(data as UserSubscription);

      // Auto-generate embedding if this is a Gold or Diamond plan
      const AI_ELIGIBLE_PLANS = ["Gold", "Diamond"];
      if (AI_ELIGIBLE_PLANS.includes(plan.name) && profile) {
        try {
          const profileText = `${profile.name} ${profile.age} ${profile.gender} ${profile.religion} ${profile.city} ${profile.profession} ${profile.bio}`;
          const embedding = await generateEmbedding(profileText, { billable: false, featureName: "subscription_embedding" });
          if (embedding) {
            await supabase
              .from("profiles")
              .update({ embedding: `[${embedding.join(",")}]` })
              .eq("id", currentUser.id);
          }
        } catch (embErr) {
          console.error("Embedding generation failed after subscription:", embErr);
          // Non-blocking — profile is still subscribed
        }
      }

      toast({
        title: "Subscription Successful!",
        description: `You are now subscribed to the ${plan.name} plan.${["Gold", "Diamond"].includes(plan.name) ? " AI features are now unlocked!" : ""
          }`,
      });
    } catch (err: any) {
      console.error("[Subscription] Subscription failed", {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        raw: err,
      });
      toast({
        title: "Subscription Failed",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const getPrice = (plan: SubscriptionPlan) => {
    if (billingCycle === "monthly") return plan.price_monthly;
    if (billingCycle === "quarterly") return plan.price_quarterly;
    return plan.price_yearly;
  };

  const getDiscount = (plan: SubscriptionPlan) => {
    if (billingCycle === "monthly" || plan.price_monthly === 0) return 0;
    const monthlyEquivalent = getPrice(plan) / (billingCycle === "quarterly" ? 3 : 12);
    const savings = plan.price_monthly - monthlyEquivalent;
    return Math.round((savings / plan.price_monthly) * 100);
  };

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 py-10 md:py-12">
        <div className="text-center mb-12">
          <Badge className="mb-4 rounded-full border-primary/20 bg-white/70 px-3 py-1.5 text-primary hover:bg-white/70 dark:bg-white/10">
            <Sparkles className="w-3 h-3 mr-1" />
            Premium Features
          </Badge>
          <h1 className="premium-gradient-text mb-4 font-serif text-4xl font-bold md:text-6xl">
            Find Your Perfect Match
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upgrade your experience to send more interests, unlock exclusive features, and increase your chances of finding the right person.
          </p>
        </div>

        {activeSub && (
          <div className="mb-12">
            <Card className="premium-card rounded-[30px] border-primary/20 shadow-none">
              <CardContent className="flex flex-col md:flex-row items-center justify-between p-6">
                <div className="flex items-center gap-4 mb-4 md:mb-0">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Your Current Plan: {activeSub.plan?.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Renews on {new Date(activeSub.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Badge variant="outline" className="text-primary border-primary font-medium">
                      {activeSub.plan?.interest_limit} Interests / month
                    </Badge>
                    <Badge variant="outline" className="font-medium">
                      {(activeSub.plan?.ai_token_limit_monthly || 0).toLocaleString()} AI tokens / month
                    </Badge>
                    <Badge variant="outline" className="font-medium">
                      {activeSub.plan?.message_limit_monthly ?? "Unlimited"} Messages / month
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex justify-center mb-8">
          <Tabs value={billingCycle} onValueChange={(v) => setBillingCycle(v as any)} className="w-full max-w-[430px]">
            <TabsList className="grid h-12 w-full grid-cols-3 rounded-full bg-white/70 p-1 shadow-sm backdrop-blur dark:bg-white/5">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
              <TabsTrigger value="yearly">
                Yearly
                <span className="ml-1.5 text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
                  SAVE
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border">
                <CardHeader>
                  <Skeleton className="h-6 w-24 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-12 w-32 mb-6" />
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((j) => <Skeleton key={j} className="h-4 w-full" />)}
                  </div>
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan, index) => {
              const price = getPrice(plan);
              const discount = getDiscount(plan);
              const isPopular = index === 1; // Highlight the middle plan
              const isCurrentPlan = activeSub?.plan_id === plan.id;

              return (
              <Card
                  key={plan.id}
                  className={`premium-card interactive-surface animate-soft-enter relative flex flex-col overflow-hidden rounded-[30px] shadow-none ${isPopular
                      ? 'z-10 border-primary/40 md:-translate-y-1'
                      : ''
                    }`}
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  {isPopular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <span className="premium-cta text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-none">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <CardHeader className="text-center pt-8">
                    <CardTitle className="font-serif text-2xl font-bold">{plan.name}</CardTitle>
                    <CardDescription className="min-h-[40px]">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="text-center mb-6">
                      <div className="flex items-end justify-center gap-1">
                        <span className="text-3xl font-bold">$</span>
                        <span className="text-5xl font-black tracking-tight">{price}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        per {billingCycle === 'monthly' ? 'month' : billingCycle === 'quarterly' ? 'quarter' : 'year'}
                      </div>
                      {discount > 0 && (
                        <div className="text-sm font-medium text-green-600 mt-2">
                          Save {discount}% compared to monthly
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm font-medium">
                          {plan.interest_limit} interests per month
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm font-medium">
                          {(plan.ai_token_limit_monthly || 0).toLocaleString()} AI tokens per month
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm font-medium">
                          {plan.message_limit_monthly ?? "Unlimited"} messages per month
                        </span>
                      </div>

                      {plan.features?.map((feature: string, i: number) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                            <Check className="w-3 h-3 text-primary" />
                          </div>
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="premium-cta pressable w-full rounded-full shadow-none"
                      variant={isPopular ? "default" : "outline"}
                      disabled={isCurrentPlan || isProcessing === plan.id}
                      onClick={() => handleSubscribe(plan)}
                    >
                      {isProcessing === plan.id
                        ? "Processing..."
                        : isCurrentPlan
                          ? "Current Plan"
                          : "Subscribe Now"
                      }
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
