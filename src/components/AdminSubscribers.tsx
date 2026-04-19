import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Users, DollarSign, TrendingUp } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";

type SubscriberData = {
  id: string;
  user_id: string;
  billing_cycle: 'monthly' | 'quarterly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired';
  start_date: string;
  end_date: string;
  created_at: string;
  profiles: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
  subscription_plans: {
    name: string;
    price_monthly: number;
    price_quarterly: number;
    price_yearly: number;
  } | null;
};

export function AdminSubscribers() {
  const [subscribers, setSubscribers] = useState<SubscriberData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select(`
          *,
          profiles ( id, name, avatar_url ),
          subscription_plans ( name, price_monthly, price_quarterly, price_yearly )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubscribers((data as any) || []);
    } catch (error) {
      console.error("Error fetching subscribers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate analytics
  const activeSubscribers = subscribers.filter(s => s.status === 'active');
  
  const totalRevenue = subscribers.reduce((acc, sub) => {
    if (!sub.subscription_plans) return acc;
    const plan = sub.subscription_plans;
    let price = 0;
    if (sub.billing_cycle === 'monthly') price = plan.price_monthly;
    if (sub.billing_cycle === 'quarterly') price = plan.price_quarterly;
    if (sub.billing_cycle === 'yearly') price = plan.price_yearly;
    return acc + price;
  }, 0);

  const mrr = activeSubscribers.reduce((acc, sub) => {
    if (!sub.subscription_plans) return acc;
    const plan = sub.subscription_plans;
    let monthlyEquivalent = 0;
    if (sub.billing_cycle === 'monthly') monthlyEquivalent = plan.price_monthly;
    if (sub.billing_cycle === 'quarterly') monthlyEquivalent = plan.price_quarterly / 3;
    if (sub.billing_cycle === 'yearly') monthlyEquivalent = plan.price_yearly / 12;
    return acc + monthlyEquivalent;
  }, 0);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading subscriber data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscribers</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubscribers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently active plans
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All-time gross volume
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estimated MRR</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${mrr.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Monthly Recurring Revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscribers Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Subscriber History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Plan</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Cycle</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Amount Paid</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Period</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No subscriptions found.
                    </td>
                  </tr>
                ) : (
                  subscribers.map((sub) => {
                    const plan = sub.subscription_plans;
                    const amountPaid = plan 
                      ? (sub.billing_cycle === 'monthly' ? plan.price_monthly 
                         : sub.billing_cycle === 'quarterly' ? plan.price_quarterly 
                         : plan.price_yearly)
                      : 0;

                    return (
                      <tr key={sub.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <UserAvatar 
                              name={sub.profiles?.name || 'Unknown'} 
                              avatarUrl={sub.profiles?.avatar_url} 
                              size="sm" 
                            />
                            <span className="font-medium">{sub.profiles?.name || 'Unknown User'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-primary">
                          {plan?.name || 'Deleted Plan'}
                        </td>
                        <td className="px-4 py-3 capitalize">
                          {sub.billing_cycle}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={sub.status === 'active' ? 'default' : 'secondary'} className={sub.status === 'active' ? 'bg-green-500 hover:bg-green-600' : ''}>
                            {sub.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          ${amountPaid.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {format(new Date(sub.start_date), "MMM d, yyyy")} - {format(new Date(sub.end_date), "MMM d, yyyy")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
