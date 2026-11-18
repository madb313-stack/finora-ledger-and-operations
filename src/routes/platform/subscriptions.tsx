import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CreditCard,
  Search,
  Filter,
  Loader2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Building2,
  Edit2,
  Layers,
} from "lucide-react";

export const Route = createFileRoute("/platform/subscriptions")({
  component: PlatformSubscriptionsPage,
});

interface SubscriptionRow {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: "trial" | "active" | "past_due" | "suspended" | "cancelled" | "expired";
  billing_cycle: "monthly" | "annual";
  started_at: string;
  current_period_end: string | null;
  trial_ends_at: string | null;
  is_current: boolean;
  notes: string | null;
  created_at: string;
  tenant?: {
    id: string;
    name: string;
    base_currency: string;
  };
  plan?: {
    id: string;
    code: string;
    name_ar: string;
    name_en: string;
    price_monthly: number;
    price_annual: number;
  };
}

function PlatformSubscriptionsPage() {
  const { isRTL } = useTranslation();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Edit subscription modal
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubscriptionRow | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<any>("active");
  const [selectedCycle, setSelectedCycle] = useState<any>("monthly");
  const [periodEnd, setPeriodEnd] = useState("");

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ["platform_subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          *,
          tenant:tenants(id, name, base_currency),
          plan:subscription_plans(id, code, name_ar, name_en, price_monthly, price_annual)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as SubscriptionRow[];
    },
  });

  const { data: plans } = useQuery({
    queryKey: ["platform_plans_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("id, code, name_ar, name_en")
        .eq("is_active", true)
        .order("sort");

      if (error) throw error;
      return data || [];
    },
  });

  const openEdit = (sub: SubscriptionRow) => {
    setEditingSub(sub);
    setSelectedPlanId(sub.plan_id);
    setSelectedStatus(sub.status);
    setSelectedCycle(sub.billing_cycle);
    setPeriodEnd(sub.current_period_end || sub.trial_ends_at || "");
    setDialogOpen(true);
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingSub) return;
      const { error } = await supabase
        .from("subscriptions")
        .update({
          plan_id: selectedPlanId,
          status: selectedStatus,
          billing_cycle: selectedCycle,
          current_period_end: periodEnd || null,
        })
        .eq("id", editingSub.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform_subscriptions"] });
      toast.success(isRTL ? "تم تحديث بيانات الاشتراك بنجاح" : "Subscription updated successfully");
      setDialogOpen(false);
      setEditingSub(null);
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل تحديث الاشتراك" : "Failed to update subscription"));
    },
  });

  const filteredSubs = subscriptions?.filter((sub) => {
    if (statusFilter !== "ALL" && sub.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTenant = sub.tenant?.name?.toLowerCase().includes(q);
      const matchPlan = sub.plan?.name_ar?.toLowerCase().includes(q) || sub.plan?.code?.toLowerCase().includes(q);
      return matchTenant || matchPlan;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return {
          label: isRTL ? "نشط" : "Active",
          icon: CheckCircle2,
          cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
        };
      case "trial":
        return {
          label: isRTL ? "تجريبي" : "Trial",
          icon: Clock,
          cls: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
        };
      case "past_due":
        return {
          label: isRTL ? "متأخر السداد" : "Past Due",
          icon: AlertTriangle,
          cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
        };
      case "suspended":
        return {
          label: isRTL ? "موقوف" : "Suspended",
          icon: XCircle,
          cls: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
        };
      case "cancelled":
        return {
          label: isRTL ? "ملغي" : "Cancelled",
          icon: XCircle,
          cls: "bg-muted text-muted-foreground",
        };
      case "expired":
        return {
          label: isRTL ? "منتهي" : "Expired",
          icon: XCircle,
          cls: "bg-muted text-muted-foreground",
        };
      default:
        return {
          label: status,
          icon: Clock,
          cls: "bg-muted text-muted-foreground",
        };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            {isRTL ? "اشتراكات الشركات" : "Tenant Subscriptions"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "متابعة فترات وتجديدات وباقات اشتراك المنشآت النشطة والتجريبية"
              : "Monitor subscription lifecycles, trial expiries and billing cycles across all tenants"}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute start-3 top-3 text-muted-foreground" />
              <Input
                placeholder={isRTL ? "بحث باسم الشركة أو الخطة..." : "Search by tenant or plan..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
            <div className="w-full sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="ALL">{isRTL ? "كافة الحالات" : "All Statuses"}</option>
                <option value="active">{isRTL ? "نشط" : "Active"}</option>
                <option value="trial">{isRTL ? "تجريبي" : "Trial"}</option>
                <option value="past_due">{isRTL ? "متأخر" : "Past Due"}</option>
                <option value="suspended">{isRTL ? "موقوف" : "Suspended"}</option>
                <option value="expired">{isRTL ? "منتهي" : "Expired"}</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredSubs?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {isRTL ? "لا توجد اشتراكات مسجلة" : "No subscriptions found"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-start">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground text-xs uppercase">
                    <th className="py-2.5 px-4 text-start">{isRTL ? "الشركة" : "Tenant"}</th>
                    <th className="py-2.5 px-4 text-start">{isRTL ? "الخطة" : "Plan"}</th>
                    <th className="py-2.5 px-4 text-start">{isRTL ? "دورة الفوترة" : "Cycle"}</th>
                    <th className="py-2.5 px-4 text-start">{isRTL ? "تاريخ البدء" : "Started"}</th>
                    <th className="py-2.5 px-4 text-start">{isRTL ? "نهاية الفترة / التجربة" : "Expires"}</th>
                    <th className="py-2.5 px-4 text-start">{isRTL ? "الحالة" : "Status"}</th>
                    <th className="py-2.5 px-4 text-end">{isRTL ? "الإجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredSubs?.map((sub) => {
                    const badge = getStatusBadge(sub.status);
                    const StatusIcon = badge.icon;
                    return (
                      <tr key={sub.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-semibold text-sm">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-primary" />
                            <span>{sub.tenant?.name || "-"}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-xs">
                            {sub.plan ? (isRTL ? sub.plan.name_ar : sub.plan.name_en) : "-"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {sub.billing_cycle === "annual"
                            ? (isRTL ? "سنوي" : "Annual")
                            : (isRTL ? "شهري" : "Monthly")}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                          {sub.started_at}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">
                          {sub.current_period_end || sub.trial_ends_at || "-"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium ${badge.cls}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            <span>{badge.label}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(sub)}
                            className="h-8 px-2 text-xs"
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1" />
                            {isRTL ? "تعديل" : "Edit"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Subscription Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isRTL ? "تعديل اشتراك الشركة" : "Edit Subscription"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{isRTL ? "باقة الاشتراك" : "Plan"}</Label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {plans?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {isRTL ? p.name_ar : p.name_en} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{isRTL ? "الحالة" : "Status"}</Label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="active">{isRTL ? "نشط" : "Active"}</option>
                  <option value="trial">{isRTL ? "تجريبي" : "Trial"}</option>
                  <option value="past_due">{isRTL ? "متأخر" : "Past Due"}</option>
                  <option value="suspended">{isRTL ? "موقوف" : "Suspended"}</option>
                  <option value="cancelled">{isRTL ? "ملغي" : "Cancelled"}</option>
                  <option value="expired">{isRTL ? "منتهي" : "Expired"}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>{isRTL ? "دورة الفوترة" : "Cycle"}</Label>
                <select
                  value={selectedCycle}
                  onChange={(e) => setSelectedCycle(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="monthly">{isRTL ? "شهري" : "Monthly"}</option>
                  <option value="annual">{isRTL ? "سنوي" : "Annual"}</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{isRTL ? "تاريخ نهاية الفترة / انتهاء التجربة" : "Period End Date"}</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              {isRTL ? "حفظ التعديلات" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
