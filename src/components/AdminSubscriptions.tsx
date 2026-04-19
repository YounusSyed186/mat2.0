import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { SubscriptionPlan } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, CheckCircle, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function AdminSubscriptions() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<SubscriptionPlan> | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("subscription_plans").select("*").order("price_monthly", { ascending: true });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setPlans(data as SubscriptionPlan[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSave = async () => {
    if (!editingPlan?.name || !editingPlan?.price_monthly) {
      toast({ title: "Error", description: "Name and Monthly Price are required", variant: "destructive" });
      return;
    }

    const planData = {
      name: editingPlan.name,
      description: editingPlan.description || "",
      price_monthly: Number(editingPlan.price_monthly),
      price_quarterly: Number(editingPlan.price_quarterly || 0),
      price_yearly: Number(editingPlan.price_yearly || 0),
      interest_limit: Number(editingPlan.interest_limit || 0),
      is_active: editingPlan.is_active ?? true,
      features: Array.isArray(editingPlan.features) ? editingPlan.features : [],
    };

    if (editingPlan.id) {
      const { error } = await supabase.from("subscription_plans").update(planData).eq("id", editingPlan.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Plan updated successfully" });
    } else {
      const { error } = await supabase.from("subscription_plans").insert([planData]);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Plan created successfully" });
    }

    setIsDialogOpen(false);
    fetchPlans();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;
    const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Plan deleted" });
      fetchPlans();
    }
  };

  return (
    <Card className="border-card-border">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Subscription Plans</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setEditingPlan({ is_active: true })}>
              <Plus className="h-4 w-4 mr-2" />
              Add Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPlan?.id ? "Edit Plan" : "Create New Plan"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input
                  value={editingPlan?.name || ""}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  placeholder="e.g. Gold"
                />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Input
                  value={editingPlan?.description || ""}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  placeholder="Plan description..."
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="grid gap-2">
                  <Label>Monthly ($)</Label>
                  <Input
                    type="number"
                    value={editingPlan?.price_monthly || ""}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price_monthly: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Quarterly ($)</Label>
                  <Input
                    type="number"
                    value={editingPlan?.price_quarterly || ""}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price_quarterly: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Yearly ($)</Label>
                  <Input
                    type="number"
                    value={editingPlan?.price_yearly || ""}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price_yearly: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Interest Limit per month</Label>
                <Input
                  type="number"
                  value={editingPlan?.interest_limit || ""}
                  onChange={(e) => setEditingPlan({ ...editingPlan, interest_limit: Number(e.target.value) })}
                  placeholder="e.g. 50"
                />
              </div>
              <Button onClick={handleSave} className="mt-4">
                Save Plan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : plans.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No subscription plans found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Name</th>
                  <th className="pb-2 font-medium text-muted-foreground">Monthly</th>
                  <th className="pb-2 font-medium text-muted-foreground">Limit</th>
                  <th className="pb-2 font-medium text-muted-foreground">Status</th>
                  <th className="pb-2 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plans.map((p) => (
                  <tr key={p.id} className="py-2">
                    <td className="py-2.5 font-medium">{p.name}</td>
                    <td className="py-2.5">${p.price_monthly}</td>
                    <td className="py-2.5">{p.interest_limit} interests</td>
                    <td className="py-2.5">
                      {p.is_active ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </td>
                    <td className="py-2.5">
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            setEditingPlan(p);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(p.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
