import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Save, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/settings/company")({
  component: CompanySettingsPage,
});

function CompanySettingsPage() {
  const { tenant, hasPerm, refetch } = useTenant();
  const { isRTL } = useTranslation();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [commercialRegister, setCommercialRegister] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  const [requireSalesApproval, setRequireSalesApproval] = useState(false);
  const [requirePurchaseApproval, setRequirePurchaseApproval] = useState(false);
  const [requireExpenseApproval, setRequireExpenseApproval] = useState(false);
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);

  useEffect(() => {
    if (tenant) {
      setName(tenant.name || "");
      setLegalName(tenant.legal_name || "");
      setBusinessType(tenant.business_type || "");
      setTaxNumber(tenant.tax_number || "");
      setCommercialRegister(tenant.commercial_register || "");
      setPhone(tenant.phone || "");
      setEmail(tenant.email || "");
      setAddress(tenant.address || "");
      setCity(tenant.city || "");
      setRequireSalesApproval(!!tenant.require_sales_approval);
      setRequirePurchaseApproval(!!tenant.require_purchase_approval);
      setRequireExpenseApproval(!!tenant.require_expense_approval);
      setAllowNegativeStock(!!tenant.allow_negative_stock);
    }
  }, [tenant]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");
      const { error } = await supabase
        .from("tenants")
        .update({
          name,
          legal_name: legalName || null,
          business_type: businessType || null,
          tax_number: taxNumber || null,
          commercial_register: commercialRegister || null,
          phone: phone || null,
          email: email || null,
          address: address || null,
          city: city || null,
          require_sales_approval: requireSalesApproval,
          require_purchase_approval: requirePurchaseApproval,
          require_expense_approval: requireExpenseApproval,
          allow_negative_stock: allowNegativeStock,
        })
        .eq("id", tenant.id);

      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success(isRTL ? "تم حفظ إعدادات الشركة بنجاح" : "Settings saved successfully");
      await refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل حفظ الإعدادات" : "Failed to update settings"));
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <span>{isRTL ? "بيانات وإعدادات المنشأة" : "Company Profile & Policy"}</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isRTL
            ? "تحديث الاسم التجاري، الرقم الضريبي، سياسات الاعتماد المالي، وإعدادات المخزون"
            : "Update organization legal details and internal approval workflows"}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateMutation.mutate();
        }}
        className="space-y-6"
      >
        {/* Profile Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">{isRTL ? "المعلومات القانونية والتجارية" : "Legal & General"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="t-name">{isRTL ? "اسم المنشأة التجاري *" : "Commercial Name *"}</Label>
                <Input
                  id="t-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="t-legal">{isRTL ? "الاسم القانوني المسجل" : "Legal Name"}</Label>
                <Input
                  id="t-legal"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="t-type">{isRTL ? "نوع النشاط التجاري" : "Business Type"}</Label>
                <Input
                  id="t-type"
                  placeholder={isRTL ? "تجارة عامة / أقمشة / توريدات" : "Retail / Trading"}
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="t-tax">{isRTL ? "الرقم الضريبي (TIN)" : "Tax Number (TIN)"}</Label>
                <Input
                  id="t-tax"
                  dir="ltr"
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="t-cr">{isRTL ? "رقم السجل التجاري" : "Commercial Register #"}</Label>
                <Input
                  id="t-cr"
                  dir="ltr"
                  value={commercialRegister}
                  onChange={(e) => setCommercialRegister(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="t-phone">{isRTL ? "رقم الهاتف الرسمي" : "Official Phone"}</Label>
                <Input
                  id="t-phone"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="t-email">{isRTL ? "البريد الإلكتروني" : "Official Email"}</Label>
                <Input
                  id="t-email"
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="t-city">{isRTL ? "المدينة" : "City"}</Label>
                <Input
                  id="t-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="t-addr">{isRTL ? "العنوان بالتفصيل" : "Address"}</Label>
                <Input
                  id="t-addr"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workflow & Policies Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">{isRTL ? "سياسات الاعتماد والعمليات" : "Approval Policies"}</CardTitle>
            <CardDescription>
              {isRTL ? "تفعيل أو تعطيل اشتراط الاعتماد المالي قبل ترحيل المستندات" : "Require approvals before postings"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="req-sales"
                checked={requireSalesApproval}
                onChange={(e) => setRequireSalesApproval(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="req-sales" className="text-sm cursor-pointer">
                {isRTL ? "اشتراط اعتماد فواتير المبيعات قبل ترحيلها" : "Require approval for Sales Invoices"}
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="req-purchases"
                checked={requirePurchaseApproval}
                onChange={(e) => setRequirePurchaseApproval(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="req-purchases" className="text-sm cursor-pointer">
                {isRTL ? "اشتراط اعتماد فواتير المشتريات قبل ترحيلها" : "Require approval for Purchase Bills"}
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="req-expense"
                checked={requireExpenseApproval}
                onChange={(e) => setRequireExpenseApproval(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="req-expense" className="text-sm cursor-pointer">
                {isRTL ? "اشتراط اعتماد سندات الصرف للمصروفات قبل الخصم من الخزينة" : "Require approval for Expense Vouchers"}
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="allow-neg"
                checked={allowNegativeStock}
                onChange={(e) => setAllowNegativeStock(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="allow-neg" className="text-sm cursor-pointer">
                {isRTL ? "السماح بالبيع بالسالب في المخزون (الرصيد السالب)" : "Allow negative stock balance"}
              </Label>
            </div>
          </CardContent>
        </Card>

        {hasPerm("settings.manage") && (
          <Button type="submit" className="gap-2 shadow-md" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{isRTL ? "حفظ كافة التغييرات" : "Save Changes"}</span>
          </Button>
        )}
      </form>
    </div>
  );
}
