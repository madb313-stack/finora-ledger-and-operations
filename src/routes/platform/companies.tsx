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
  Building2,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Eye,
  ShieldBan,
  ShieldCheck,
  Calendar,
  Layers,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";

export const Route = createFileRoute("/platform/companies")({
  component: PlatformCompaniesPage,
});

interface Tenant {
  id: string;
  name: string;
  legal_name: string | null;
  business_type: string | null;
  tax_number: string | null;
  commercial_register: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country_code: string;
  base_currency: string;
  timezone: string;
  status: "active" | "suspended";
  suspended_reason: string | null;
  inventory_enabled: boolean;
  allow_negative_stock: boolean;
  require_sales_approval: boolean;
  require_purchase_approval: boolean;
  require_expense_approval: boolean;
  created_at: string;
  subscriptions?: {
    id: string;
    status: string;
    billing_cycle: string;
    trial_ends_at: string | null;
    current_period_end: string | null;
    plan?: {
      code: string;
      name_ar: string;
      name_en: string;
    };
  }[];
}

function PlatformCompaniesPage() {
  const { isRTL } = useTranslation();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  // Suspend / Activate dialog state
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [actionTenant, setActionTenant] = useState<Tenant | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["platform_tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select(`
          *,
          subscriptions:subscriptions(
            id,
            status,
            billing_cycle,
            trial_ends_at,
            current_period_end,
            plan:subscription_plans(code, name_ar, name_en)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Tenant[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      if (!actionTenant) return;
      const newStatus = actionTenant.status === "active" ? "suspended" : "active";

      const { error } = await supabase
        .from("tenants")
        .update({
          status: newStatus,
          suspended_reason: newStatus === "suspended" ? suspendReason.trim() : null,
        })
        .eq("id", actionTenant.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform_tenants"] });
      toast.success(
        actionTenant?.status === "active"
          ? (isRTL ? "تم تجميد حساب الشركة بنجاح" : "Tenant suspended successfully")
          : (isRTL ? "تم تفعيل حساب الشركة بنجاح" : "Tenant activated successfully")
      );
      setStatusDialogOpen(false);
      setActionTenant(null);
      setSuspendReason("");
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل تعديل حالة الشركة" : "Failed to update tenant status"));
    },
  });

  const openStatusDialog = (t: Tenant) => {
    setActionTenant(t);
    setSuspendReason(t.suspended_reason || "");
    setStatusDialogOpen(true);
  };

  const filteredTenants = tenants?.filter((t) => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchLegal = t.legal_name?.toLowerCase().includes(q);
      const matchEmail = t.email?.toLowerCase().includes(q);
      const matchTax = t.tax_number?.toLowerCase().includes(q);
      const matchPhone = t.phone?.toLowerCase().includes(q);
      return matchName || matchLegal || matchEmail || matchTax || matchPhone;
    }
    return true;
  });

  const activeCount = tenants?.filter((t) => t.status === "active").length || 0;
  const suspendedCount = tenants?.filter((t) => t.status === "suspended").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            {isRTL ? "إدارة الشركات والمستأجرين" : "Tenants Management"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "متابعة الشركات المشتركة في منصة FINORA والتحكم في حالتها التشغيلية"
              : "Monitor onboarded tenants, subscriptions, and administrative status"}
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{isRTL ? "إجمالي الشركات" : "Total Tenants"}</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : tenants?.length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-emerald-200 dark:border-emerald-950">
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-700 dark:text-emerald-400">
              {isRTL ? "الشركات النشطة" : "Active Tenants"}
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : activeCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-amber-200 dark:border-amber-950">
          <CardHeader className="pb-2">
            <CardDescription className="text-amber-700 dark:text-amber-400">
              {isRTL ? "الشركات المجمدة" : "Suspended Tenants"}
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : suspendedCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute start-3 top-3 text-muted-foreground" />
              <Input
                placeholder={isRTL ? "بحث باسم الشركة، الرقم الضريبي، البريد..." : "Search by company name, tax ID, email..."}
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
                <option value="active">{isRTL ? "نشطة فقط" : "Active Only"}</option>
                <option value="suspended">{isRTL ? "مجمدة فقط" : "Suspended Only"}</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenants Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredTenants?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {isRTL ? "لا توجد شركات مسجلة مطابقة" : "No matching tenants found"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-start">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground text-xs uppercase">
                    <th className="py-2.5 px-4 text-start">{isRTL ? "الشركة" : "Company"}</th>
                    <th className="py-2.5 px-4 text-start">{isRTL ? "الخطة الحالية" : "Current Plan"}</th>
                    <th className="py-2.5 px-4 text-start">{isRTL ? "العملة / البلد" : "Currency / Country"}</th>
                    <th className="py-2.5 px-4 text-start">{isRTL ? "تاريخ التسجيل" : "Registered"}</th>
                    <th className="py-2.5 px-4 text-start">{isRTL ? "الحالة" : "Status"}</th>
                    <th className="py-2.5 px-4 text-end">{isRTL ? "الإجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredTenants?.map((t) => {
                    const currentSub = t.subscriptions?.[0];
                    return (
                      <tr key={t.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-sm">{t.name}</div>
                          {t.legal_name && (
                            <div className="text-xs text-muted-foreground">{t.legal_name}</div>
                          )}
                          <div className="text-[11px] text-muted-foreground font-mono" dir="ltr">
                            {t.email || t.phone || "-"}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {currentSub?.plan ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                              <Layers className="w-3 h-3" />
                              {isRTL ? currentSub.plan.name_ar : currentSub.plan.name_en}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              {isRTL ? "بدون اشتراك" : "No Plan"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-semibold">{t.base_currency}</span>
                          <span className="text-xs text-muted-foreground ml-1">({t.country_code})</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium ${
                              t.status === "active"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                            }`}
                          >
                            {t.status === "active" ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                {isRTL ? "نشطة" : "Active"}
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3 h-3" />
                                {isRTL ? "مجمدة" : "Suspended"}
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-end space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTenant(t)}
                            className="h-8 px-2 text-xs"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            {isRTL ? "تفاصيل" : "View"}
                          </Button>
                          <Button
                            variant={t.status === "active" ? "ghost" : "outline"}
                            size="sm"
                            onClick={() => openStatusDialog(t)}
                            className={`h-8 px-2 text-xs ${
                              t.status === "active"
                                ? "text-destructive hover:bg-destructive/10"
                                : "text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                            }`}
                          >
                            {t.status === "active" ? (
                              <>
                                <ShieldBan className="w-3.5 h-3.5 mr-1" />
                                {isRTL ? "تجميد" : "Suspend"}
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                                {isRTL ? "تفعيل" : "Activate"}
                              </>
                            )}
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

      {/* Tenant Details Dialog */}
      <Dialog open={!!selectedTenant} onOpenChange={(open) => !open && setSelectedTenant(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              {selectedTenant?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedTenant && (
            <div className="space-y-4 text-sm py-2">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg text-xs">
                <div>
                  <span className="text-muted-foreground block">{isRTL ? "الاسم القانوني:" : "Legal Name:"}</span>
                  <span className="font-semibold">{selectedTenant.legal_name || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{isRTL ? "الرقم الضريبي (TIN):" : "Tax Number:"}</span>
                  <span className="font-semibold font-mono">{selectedTenant.tax_number || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{isRTL ? "السجل التجاري:" : "Commercial Register:"}</span>
                  <span className="font-semibold font-mono">{selectedTenant.commercial_register || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{isRTL ? "المدينة والبلد:" : "City / Country:"}</span>
                  <span className="font-semibold">{selectedTenant.city || "-"} ({selectedTenant.country_code})</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{isRTL ? "البريد الإلكتروني:" : "Email:"}</span>
                  <span className="font-semibold" dir="ltr">{selectedTenant.email || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{isRTL ? "الهاتف:" : "Phone:"}</span>
                  <span className="font-semibold" dir="ltr">{selectedTenant.phone || "-"}</span>
                </div>
              </div>

              <div className="space-y-2 border-t pt-3">
                <h4 className="text-xs font-semibold text-primary">{isRTL ? "السياسات التشغيلية" : "Operational Policies"}</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    {selectedTenant.inventory_enabled ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <span className="w-3.5 h-3.5 block rounded-full bg-muted" />
                    )}
                    <span>{isRTL ? "وحدة المخزون مفعلة" : "Inventory Enabled"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {selectedTenant.allow_negative_stock ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <span className="w-3.5 h-3.5 block rounded-full bg-muted" />
                    )}
                    <span>{isRTL ? "البيع بالسالب مسموح" : "Allow Negative Stock"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {selectedTenant.require_sales_approval ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <span className="w-3.5 h-3.5 block rounded-full bg-muted" />
                    )}
                    <span>{isRTL ? "اعتماد المبيعات مطلوب" : "Sales Approval Required"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {selectedTenant.require_purchase_approval ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <span className="w-3.5 h-3.5 block rounded-full bg-muted" />
                    )}
                    <span>{isRTL ? "اعتماد المشتريات مطلوب" : "Purchase Approval Required"}</span>
                  </div>
                </div>
              </div>

              {selectedTenant.suspended_reason && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-xs">
                  <span className="font-semibold text-red-800 dark:text-red-300 block mb-1">
                    {isRTL ? "سبب التجميد:" : "Suspension Reason:"}
                  </span>
                  <p className="text-red-700 dark:text-red-400">{selectedTenant.suspended_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Suspend / Activate Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionTenant?.status === "active"
                ? (isRTL ? "تجميد حساب الشركة" : "Suspend Company")
                : (isRTL ? "تفعيل حساب الشركة" : "Activate Company")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {actionTenant?.status === "active"
                ? (isRTL
                    ? `هل أنت متأكد من تجميد حساب "${actionTenant?.name}"؟ سيتم حظر كافة العمليات المالية وتسجيل الدخول مؤقتاً.`
                    : `Are you sure you want to suspend "${actionTenant?.name}"? Financial postings and operations will be blocked.`)
                : (isRTL
                    ? `هل تريد إعادة تفعيل حساب "${actionTenant?.name}" واستئناف العمليات؟`
                    : `Reactivate account for "${actionTenant?.name}" to resume operations?`)}
            </p>

            {actionTenant?.status === "active" && (
              <div className="space-y-1.5">
                <Label>{isRTL ? "سبب التجميد" : "Suspension Reason"}</Label>
                <Input
                  placeholder={isRTL ? "مثال: عدم سداد الاشتراك / مخالفة الشروط" : "e.g. Non-payment, violation..."}
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              variant={actionTenant?.status === "active" ? "destructive" : "default"}
              onClick={() => updateStatusMutation.mutate()}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              {actionTenant?.status === "active"
                ? (isRTL ? "تأكيد التجميد" : "Confirm Suspension")
                : (isRTL ? "تأكيد التفعيل" : "Confirm Activation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
