import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { SubscriptionPlan } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, CheckCircle, XCircle, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function logSupabaseError(context: string, error: unknown) {
  console.error(`[AdminSubscriptions] ${context}`, {
    message: (error as { message?: string })?.message,
    code: (error as { code?: string })?.code,
    details: (error as { details?: string })?.details,
    hint: (error as { hint?: string })?.hint,
    raw: error,
  });
}

export function AdminSubscriptions() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<SubscriptionPlan> | null>(null);
  const [newFeatureText, setNewFeatureText] = useState("");

  const fetchPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("subscription_plans").select("*").order("price_monthly", { ascending: true });
    if (error) {
      logSupabaseError("Failed to fetch subscription plans", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      console.info("[AdminSubscriptions] Loaded subscription plans", data?.map((plan) => ({
        id: plan.id,
        name: plan.name,
        ai_token_limit_monthly: plan.ai_token_limit_monthly,
        message_limit_monthly: plan.message_limit_monthly,
        allow_unlimited_photos: plan.allow_unlimited_photos,
        allow_social_links: plan.allow_social_links,
      })));
      setPlans(data as SubscriptionPlan[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    const currentFeatures = editingPlan?.features || [];
    setEditingPlan({
      ...editingPlan,
      features: [...currentFeatures, newFeatureText.trim()],
    });
    setNewFeatureText("");
  };

  const handleUpdateFeature = (index: number, val: string) => {
    const currentFeatures = [...(editingPlan?.features || [])];
    currentFeatures[index] = val;
    setEditingPlan({
      ...editingPlan,
      features: currentFeatures,
    });
  };

  const handleRemoveFeature = (index: number) => {
    const currentFeatures = [...(editingPlan?.features || [])];
    currentFeatures.splice(index, 1);
    setEditingPlan({
      ...editingPlan,
      features: currentFeatures,
    });
  };

  const handleSave = async () => {
    if (!editingPlan?.name || editingPlan.price_monthly === undefined || editingPlan.price_monthly === null) {
      toast({ title: "Error", description: "Name and Monthly Price are required", variant: "destructive" });
      return;
    }

    const cleanFeatures = Array.isArray(editingPlan.features)
      ? editingPlan.features.map((f) => f.trim()).filter((f) => f.length > 0)
      : [];

    const planData = {
      name: editingPlan.name,
      description: editingPlan.description || "",
      price_monthly: Number(editingPlan.price_monthly),
      price_quarterly: Number(editingPlan.price_quarterly || 0),
      price_yearly: Number(editingPlan.price_yearly || 0),
      interest_limit: Number(editingPlan.interest_limit || 0),
      profile_view_limit_monthly: Number(editingPlan.profile_view_limit_monthly ?? 20),
      ai_token_limit_monthly: Number(editingPlan.ai_token_limit_monthly ?? 0),
      message_limit_monthly:
        editingPlan.message_limit_monthly === undefined || editingPlan.message_limit_monthly === null
          ? null
          : Number(editingPlan.message_limit_monthly),
      allow_unlimited_photos: Boolean(editingPlan.allow_unlimited_photos),
      allow_social_links: Boolean(editingPlan.allow_social_links),
      is_active: editingPlan.is_active ?? true,
      features: cleanFeatures,
    };

    console.info("[AdminSubscriptions] Saving subscription plan", {
      id: editingPlan.id || "new",
      previous: editingPlan,
      payload: planData,
    });

    setSaving(true);
    try {
      if (editingPlan.id) {
        const { data, error } = await supabase
          .from("subscription_plans")
          .update(planData)
          .eq("id", editingPlan.id)
          .select("*")
          .maybeSingle();

        if (error) {
          logSupabaseError("Failed to update subscription plan", error);
          toast({
            title: "Plan update failed",
            description: `${error.message}${error.hint ? ` Hint: ${error.hint}` : ""}`,
            variant: "destructive",
          });
          return;
        }

        console.info("[AdminSubscriptions] Plan update returned row", data);
        if (!data) {
          const message = "Supabase returned no updated row. This usually means RLS blocked the update or the plan id was not visible to this user.";
          console.error("[AdminSubscriptions] Plan update affected no visible rows", {
            planId: editingPlan.id,
            payload: planData,
            nextStep: "Check subscription_plans UPDATE/SELECT RLS policies for admin users.",
          });
          toast({
            title: "Plan update did not apply",
            description: message,
            variant: "destructive",
          });
          return;
        }
        toast({ title: "Plan updated successfully" });
      } else {
        const { data, error } = await supabase
          .from("subscription_plans")
          .insert([planData])
          .select("*")
          .maybeSingle();

        if (error) {
          logSupabaseError("Failed to create subscription plan", error);
          toast({
            title: "Plan create failed",
            description: `${error.message}${error.hint ? ` Hint: ${error.hint}` : ""}`,
            variant: "destructive",
          });
          return;
        }

        console.info("[AdminSubscriptions] Plan create returned row", data);
        if (!data) {
          const message = "Supabase inserted no visible row. This usually means RLS blocked insert/select for subscription plans.";
          console.error("[AdminSubscriptions] Plan create returned no visible row", {
            payload: planData,
            nextStep: "Check subscription_plans INSERT/SELECT RLS policies for admin users.",
          });
          toast({
            title: "Plan create did not apply",
            description: message,
            variant: "destructive",
          });
          return;
        }
        toast({ title: "Plan created successfully" });
      }

      setIsDialogOpen(false);
      await fetchPlans();
    } catch (error) {
      logSupabaseError("Unexpected plan save failure", error);
      toast({
        title: "Plan save failed",
        description: error instanceof Error ? error.message : "Unexpected error while saving the plan.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
            <Button
              size="sm"
              onClick={() => {
                setEditingPlan({
                  is_active: true,
                  allow_unlimited_photos: true,
                  allow_social_links: true,
                  features: [],
                });
                setNewFeatureText("");
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPlan?.id ? "Edit Plan" : "Create New Plan"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Plan Name</Label>
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
                    value={editingPlan?.price_monthly ?? ""}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price_monthly: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Quarterly ($)</Label>
                  <Input
                    type="number"
                    value={editingPlan?.price_quarterly ?? ""}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price_quarterly: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Yearly ($)</Label>
                  <Input
                    type="number"
                    value={editingPlan?.price_yearly ?? ""}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price_yearly: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Interest Limit per month</Label>
                <Input
                  type="number"
                  value={editingPlan?.interest_limit ?? ""}
                  onChange={(e) => setEditingPlan({ ...editingPlan, interest_limit: Number(e.target.value) })}
                  placeholder="e.g. 50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label>Profile views / month</Label>
                  <Input
                    type="number"
                    value={editingPlan?.profile_view_limit_monthly ?? ""}
                    onChange={(e) => setEditingPlan({ ...editingPlan, profile_view_limit_monthly: Number(e.target.value) })}
                    placeholder="-1 for unlimited"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>AI tokens / month</Label>
                  <Input
                    type="number"
                    value={editingPlan?.ai_token_limit_monthly ?? ""}
                    onChange={(e) => setEditingPlan({ ...editingPlan, ai_token_limit_monthly: Number(e.target.value) })}
                    placeholder="e.g. 50000"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Message limit / month</Label>
                <Input
                  type="number"
                  value={editingPlan?.message_limit_monthly ?? ""}
                  onChange={(e) =>
                    setEditingPlan({
                      ...editingPlan,
                      message_limit_monthly: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="Leave empty for unlimited"
                />
              </div>

              {/* Entitlement Toggles */}
              <div className="border border-border/80 rounded-lg p-3 space-y-3 bg-muted/20">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Entitlements & Features Access
                </h4>

                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    className="rounded border-input h-4 w-4 text-primary focus:ring-primary"
                    checked={editingPlan?.allow_unlimited_photos ?? false}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, allow_unlimited_photos: e.target.checked })
                    }
                  />
                  <span>Unlimited Profile Picture Views (Unblurred)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    className="rounded border-input h-4 w-4 text-primary focus:ring-primary"
                    checked={editingPlan?.allow_social_links ?? false}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, allow_social_links: e.target.checked })
                    }
                  />
                  <span>Full Social Media Links Access (Unblurred)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    className="rounded border-input h-4 w-4 text-primary focus:ring-primary"
                    checked={editingPlan?.is_active ?? true}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, is_active: e.target.checked })
                    }
                  />
                  <span>Active Plan (Visible to Users)</span>
                </label>
              </div>

              {/* Dynamic Custom Features Bullet Editor */}
              <div className="grid gap-2">
                <Label>Custom Feature Bullet Points</Label>
                <div className="space-y-2">
                  {(editingPlan?.features || []).map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={feature}
                        onChange={(e) => handleUpdateFeature(idx, e.target.value)}
                        placeholder={`Feature #${idx + 1}`}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => handleRemoveFeature(idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      value={newFeatureText}
                      onChange={(e) => setNewFeatureText(e.target.value)}
                      placeholder="Add a new feature bullet..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddFeature();
                        }
                      }}
                    />
                    <Button type="button" size="sm" variant="secondary" onClick={handleAddFeature}>
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} className="mt-4 w-full" disabled={saving}>
                {saving ? "Saving Plan..." : "Save Plan"}
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
                  <th className="pb-2 font-medium text-muted-foreground">Limits & Entitlements</th>
                  <th className="pb-2 font-medium text-muted-foreground">Status</th>
                  <th className="pb-2 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plans.map((p) => (
                  <tr key={p.id} className="py-2">
                    <td className="py-2.5 font-medium">{p.name}</td>
                    <td className="py-2.5">${p.price_monthly}</td>
                    <td className="py-2.5 text-xs text-muted-foreground">
                      <div>{p.interest_limit} interests</div>
                      <div>{p.profile_view_limit_monthly < 0 ? "Unlimited" : p.profile_view_limit_monthly} profile views</div>
                      <div>{p.ai_token_limit_monthly.toLocaleString()} AI tokens</div>
                      <div>{p.message_limit_monthly ?? "Unlimited"} messages</div>
                      <div className="font-semibold text-foreground/80 mt-0.5">
                        {p.allow_unlimited_photos ? "✓ Unlimited Photos" : "✗ Photos Blurred"} |{" "}
                        {p.allow_social_links ? "✓ Social Access" : "✗ Social Blurred"}
                      </div>
                      {p.features && p.features.length > 0 && (
                        <div className="text-[11px] text-muted-foreground italic mt-0.5">
                          + {p.features.length} custom feature(s)
                        </div>
                      )}
                    </td>
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
                            setNewFeatureText("");
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
