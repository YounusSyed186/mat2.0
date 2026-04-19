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

export default function Subscription() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [activeSub, setActiveSub] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch active plans
      const { data: plansData } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price_monthly", { ascending: true });
        
      if (plansData) setPlans(plansData as SubscriptionPlan[]);

      // Fetch user active subscription
      if (currentUser) {
        const { data: subData } = await supabase
          .from("user_subscriptions")
          .select("*, plan:subscription_plans(*)")
          .eq("user_id", currentUser.id)
          .eq("status", "active")
          .gte("end_date", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
          
        if (subData) setActiveSub(subData as UserSubscription);
      }
      
      setLoading(false);
    };

    fetchData();
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
        await supabase
          .from("user_subscriptions")
          .update({ status: "cancelled" })
          .eq("id", activeSub.id);
      }

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
        .single();

      if (error) throw error;

      setActiveSub(data as UserSubscription);
      toast({
        title: "Subscription Successful!",
        description: `You are now subscribed to the ${plan.name} plan.`,
      });
    } catch (err: any) {
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
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
            <Sparkles className="w-3 h-3 mr-1" />
            Premium Features
          </Badge>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
            Find Your Perfect Match
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upgrade your experience to send more interests, unlock exclusive features, and increase your chances of finding the right person.
          </p>
        </div>

        {activeSub && (
          <div className="mb-12">
            <Card className="border-primary bg-primary/5">
              <CardContent className="flex flex-col md:flex-row items-center justify-between p-6">
                <div className="flex items-center gap-4 mb-4 md:mb-0">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
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
                  <Badge variant="outline" className="text-primary border-primary font-medium">
                    {activeSub.plan?.interest_limit} Interests / month
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex justify-center mb-8">
          <Tabs value={billingCycle} onValueChange={(v) => setBillingCycle(v as any)} className="w-[400px]">
            <TabsList className="grid w-full grid-cols-3">
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
                  className={`relative flex flex-col ${
                    isPopular 
                      ? 'border-primary shadow-lg scale-105 z-10' 
                      : 'border-border'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <CardHeader className="text-center pt-8">
                    <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
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
                      className="w-full" 
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
