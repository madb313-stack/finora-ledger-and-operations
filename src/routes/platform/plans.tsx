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
  Layers,
  Plus,
  Loader2,
  Check,
  Edit2,
  Users,
  GitBranch,
  HardDrive,
  Package,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/platform/plans")({
  component: PlatformPlansPage,
});

interface SubscriptionPlan {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  price_monthly: number;
  price_annual: number;
  currency_code: string;
  max_users: number;
  max_branches: number;
  storage_mb: number;
  inventory_enabled: boolean;
  advanced_reports: boolean;
  trial_days: number;
  is_active: boolean;
  sort: number;
}

function PlatformPlansPage() {
  const { isRTL } = useTranslation();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  // Form states
  const [code, setCode] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [priceMonthly, setPriceMonthly] = useState("0");
  const [priceAnnual, setPriceAnnual] = useState("0");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [maxUsers, setMaxUsers] = useState("3");
  const [maxBranches, setMaxBranches] = useState("1");
  const [storageMb, setStorageMb] = useState("500");
  const [trialDays, setTrialDays] = useState("0");
  const [inventoryEnabled, setInventoryEnabled] = useState(false);
  const [advancedReports, setAdvancedReports] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState("1");

  const { data: plans, isLoading } = useQuery({
    queryKey: ["platform_plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("sort", { ascending: true });

      if (error) throw error;
      return (data || []) as SubscriptionPlan[];
    },
  });

  const openNew = () => {
    setEditingPlan(null);
    setCode("");
    setNameAr("");
    setNameEn("");
    setDescriptionAr("");
    setDescriptionEn("");
    setPriceMonthly("0");
    setPriceAnnual("0");
    setCurrencyCode("USD");
    setMaxUsers("3");
    setMaxBranches("1");
    setStorageMb("500");
    setTrialDays("0");
    setInventoryEnabled(false);
    setAdvancedReports(false);
    setIsActive(true);
    setSortOrder(String((plans?.length || 0) + 1));
    setDialogOpen(true);
  };

  const openEdit = (p: SubscriptionPlan) => {
    setEditingPlan(p);
    setCode(p.code);
    setNameAr(p.name_ar);
    setNameEn(p.name_en);
    setDescriptionAr(p.description_ar || "");
    setDescriptionEn(p.description_en || "");
    setPriceMonthly(String(p.price_monthly));
    setPriceAnnual(String(p.price_annual));
    setCurrencyCode(p.currency_code);
    setMaxUsers(String(p.max_users));
    setMaxBranches(String(p.max_branches));
    setStorageMb(String(p.storage_mb));
    setTrialDays(String(p.trial_days));
    setInventoryEnabled(p.inventory_enabled);
    setAdvancedReports(p.advanced_reports);
    setIsActive(p.is_active);
    setSortOrder(String(p.sort));
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!code.trim() || !nameAr.trim()) {
        throw new Error(isRTL ? "الرمز والاسم بالعربية مطلوبان" : "Code and Arabic name are required");
      }

      const payload = {
        code: code.trim().toLowerCase(),
        name_ar: nameAr.trim(),
        name_en: nameEn.trim() || nameAr.trim(),
        description_ar: descriptionAr.trim() || null,
        description_en: descriptionEn.trim() || null,
        price_monthly: parseFloat(priceMonthly) || 0,
        price_annual: parseFloat(priceAnnual) || 0,
        currency_code: currencyCode,
        max_users: parseInt(maxUsers, 10) || 1,
        max_branches: parseInt(maxBranches, 10) || 1,
        storage_mb: parseInt(storageMb, 10) || 100,
        trial_days: parseInt(trialDays, 10) || 0,
        inventory_enabled: inventoryEnabled,
        advanced_reports: advancedReports,
        is_active: isActive,
        sort: parseInt(sortOrder, 10) || 0,
      };

      if (editingPlan) {
        const { error } = await supabase
          .from("subscription_plans")
          .update(payload)
          .eq("id", editingPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("subscription_plans")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform_plans"] });
      toast.success(
        editingPlan
          ? (isRTL ? "تم تحديث الخطة بنجاح" : "Plan updated successfully")
          : (isRTL ? "تم إنشاء الخطة بنجاح" : "Plan created successfully")
      );
      setDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل حفظ الخطة" : "Failed to save plan"));
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" />
            {isRTL ? "خطط الاشتراك وباقات الأسعار" : "Subscription Plans"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "تعريف وتسعير خطط الاشتراك وحدود الاستخدام والميزات المتاحة"
              : "Manage SaaS subscription tiers, limits, features and pricing models"}
          </p>
        </div>
        <Button onClick={openNew} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {isRTL ? "إضافة باقة جديدة" : "Add Plan"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans?.map((plan) => (
            <Card
              key={plan.id}
              className={`flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-md ${
                !plan.is_active ? "opacity-60 bg-muted/30" : ""
              }`}
            >
              <div>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-muted font-semibold">
                      {plan.code}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                        plan.is_active
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {plan.is_active ? (isRTL ? "نشطة" : "Active") : (isRTL ? "معطلة" : "Inactive")}
                    </span>
                  </div>
                  <CardTitle className="text-xl mt-3">{isRTL ? plan.name_ar : plan.name_en}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {isRTL ? plan.description_ar : plan.description_en}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Price */}
                  <div className="bg-primary/5 p-3 rounded-lg border border-primary/20 text-center">
                    <div className="text-2xl font-black text-primary font-mono">
                      ${Number(plan.price_monthly).toLocaleString()}
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        / {isRTL ? "شهرياً" : "mo"}
                      </span>
                    </div>
                    {plan.price_annual > 0 && (
                      <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                        ${Number(plan.price_annual).toLocaleString()} / {isRTL ? "سنوياً" : "yr"}
                      </div>
                    )}
                  </div>

                  {/* Limits Checklist */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-primary" />
                        {isRTL ? "المستخدمين:" : "Users limit:"}
                      </span>
                      <span className="font-semibold text-foreground">{plan.max_users}</span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5 text-primary" />
                        {isRTL ? "الفروع:" : "Branches limit:"}
                      </span>
                      <span className="font-semibold text-foreground">{plan.max_branches}</span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-primary" />
                        {isRTL ? "المساحة:" : "Storage:"}
                      </span>
                      <span className="font-semibold text-foreground">{plan.storage_mb} MB</span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-primary" />
                        {isRTL ? "إدارة المخزون:" : "Inventory:"}
                      </span>
                      <span>
                        {plan.inventory_enabled ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground/50" />
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
                        {isRTL ? "تقارير متقدمة:" : "Adv. Reports:"}
                      </span>
                      <span>
                        {plan.advanced_reports ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground/50" />
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </div>

              <div className="p-4 pt-0 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(plan)}
                  className="w-full mt-3 flex items-center justify-center gap-1.5 text-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  {isRTL ? "تعديل الباقة" : "Edit Plan"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Plan Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan
                ? (isRTL ? "تعديل باقة الاشتراك" : "Edit Subscription Plan")
                : (isRTL ? "إضافة باقة اشتراك جديدة" : "New Subscription Plan")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{isRTL ? "رمز الباقة (إنجليزي)" : "Plan Code"} *</Label>
                <Input
                  placeholder="starter"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={!!editingPlan}
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "الترتيب" : "Sort Order"}</Label>
                <Input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{isRTL ? "الاسم بالعربية" : "Name (Arabic)"} *</Label>
                <Input
                  placeholder="المبتدئة"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "الاسم بالإنجليزية" : "Name (English)"}</Label>
                <Input
                  placeholder="Starter"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{isRTL ? "السعر الشهري ($)" : "Monthly Price ($)"}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={priceMonthly}
                  onChange={(e) => setPriceMonthly(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "السعر السنوي ($)" : "Annual Price ($)"}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={priceAnnual}
                  onChange={(e) => setPriceAnnual(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>{isRTL ? "أقصى مستخدمين" : "Max Users"}</Label>
                <Input
                  type="number"
                  value={maxUsers}
                  onChange={(e) => setMaxUsers(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "أقصى فروع" : "Max Branches"}</Label>
                <Input
                  type="number"
                  value={maxBranches}
                  onChange={(e) => setMaxBranches(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{isRTL ? "المساحة (MB)" : "Storage (MB)"}</Label>
                <Input
                  type="number"
                  value={storageMb}
                  onChange={(e) => setStorageMb(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{isRTL ? "فترة التجربة المجانية (أيام)" : "Trial Days"}</Label>
              <Input
                type="number"
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inventoryEnabled}
                  onChange={(e) => setInventoryEnabled(e.target.checked)}
                  className="rounded border-input text-primary w-4 h-4"
                />
                <span className="text-sm">{isRTL ? "تفعيل وحدة المخزون" : "Enable Inventory"}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={advancedReports}
                  onChange={(e) => setAdvancedReports(e.target.checked)}
                  className="rounded border-input text-primary w-4 h-4"
                />
                <span className="text-sm">{isRTL ? "تفعيل التقارير المتقدمة" : "Advanced Reports"}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-input text-primary w-4 h-4"
                />
                <span className="text-sm">{isRTL ? "الخطة نشطة ومتاحة للاشتراك" : "Plan is Active"}</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !code.trim() || !nameAr.trim()}
            >
              {saveMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              {isRTL ? "حفظ الخطة" : "Save Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
