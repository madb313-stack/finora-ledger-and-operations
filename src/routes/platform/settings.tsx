import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Settings,
  Save,
  Loader2,
  Megaphone,
  Mail,
  Coins,
  ShieldCheck,
  Layers,
  Globe2,
} from "lucide-react";

export const Route = createFileRoute("/platform/settings")({
  component: PlatformSettingsPage,
});

interface PlatformSettings {
  id: boolean;
  self_registration: boolean;
  default_plan_code: string;
  billing_currency: string;
  support_email: string | null;
  announcement: string | null;
  updated_at: string;
}

function PlatformSettingsPage() {
  const { isRTL } = useTranslation();
  const queryClient = useQueryClient();

  const [selfRegistration, setSelfRegistration] = useState(true);
  const [defaultPlanCode, setDefaultPlanCode] = useState("trial");
  const [billingCurrency, setBillingCurrency] = useState("USD");
  const [supportEmail, setSupportEmail] = useState("");
  const [announcement, setAnnouncement] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["platform_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("id", true)
        .maybeSingle();

      if (error) throw error;
      return data as PlatformSettings | null;
    },
  });

  const { data: plans } = useQuery({
    queryKey: ["platform_plans_lookup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("code, name_ar, name_en")
        .eq("is_active", true)
        .order("sort");

      if (error) throw error;
      return data || [];
    },
  });

  const { data: currencies } = useQuery({
    queryKey: ["currencies_lookup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("currencies")
        .select("code, name_ar, name_en")
        .eq("is_active", true);

      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (settings) {
      setSelfRegistration(settings.self_registration);
      setDefaultPlanCode(settings.default_plan_code || "trial");
      setBillingCurrency(settings.billing_currency || "USD");
      setSupportEmail(settings.support_email || "");
      setAnnouncement(settings.announcement || "");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("platform_settings")
        .update({
          self_registration: selfRegistration,
          default_plan_code: defaultPlanCode,
          billing_currency: billingCurrency,
          support_email: supportEmail.trim() || null,
          announcement: announcement.trim() || null,
        })
        .eq("id", true);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform_settings"] });
      toast.success(isRTL ? "تم حفظ إعدادات المنصة بنجاح" : "Platform settings updated successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل حفظ الإعدادات" : "Failed to update platform settings"));
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            {isRTL ? "إعدادات المنصة العامة" : "Platform Configuration"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "التحكم في سياسات التسجيل الذاتي، باقة البداية الافتراضية، وعملة الفوترة المركزية"
              : "Global settings controlling self-service signups, default trial tier, and system announcements"}
          </p>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || isLoading}
          className="flex items-center gap-2"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isRTL ? "حفظ التغييرات" : "Save Changes"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Registration & Plans */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                {isRTL ? "سياسة التسجيل والباقات" : "Registration & Defaults"}
              </CardTitle>
              <CardDescription>
                {isRTL
                  ? "خيارات قبول العملاء الجدد والباقة التي تمنح لهم فور إنشاء حساب"
                  : "Onboarding policies for new business signups"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-muted/40 rounded-lg">
                <input
                  type="checkbox"
                  id="self_reg"
                  checked={selfRegistration}
                  onChange={(e) => setSelfRegistration(e.target.checked)}
                  className="mt-1 rounded border-input text-primary w-4 h-4 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <label htmlFor="self_reg" className="text-sm font-semibold cursor-pointer">
                    {isRTL ? "السماح بالتسجيل الذاتي للشركات الجديدة" : "Allow Self-Service Registration"}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {isRTL
                      ? "عند التفعيل، يمكن لأي زائر فتح حساب شركة جديد مباشرة من صفحة التسجيل."
                      : "When enabled, visitors can freely sign up and initialize new company accounts."}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary" />
                  {isRTL ? "الباقة الافتراضية عند التسجيل" : "Default Subscription Tier"}
                </Label>
                <select
                  value={defaultPlanCode}
                  onChange={(e) => setDefaultPlanCode(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {plans?.map((p) => (
                    <option key={p.code} value={p.code}>
                      {isRTL ? p.name_ar : p.name_en} ({p.code})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  {isRTL
                    ? "الباقة التي يتم تفعيلها تلقائياً للمنشأة الجديدة (عادة باقة التجربة المجانية trial)."
                    : "Tier provisioned automatically for newly registered organizations."}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-primary" />
                  {isRTL ? "عملة فوترة المنصة" : "Platform Billing Currency"}
                </Label>
                <select
                  value={billingCurrency}
                  onChange={(e) => setBillingCurrency(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {currencies?.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {isRTL ? c.name_ar : c.name_en}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Support & Announcements */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-primary" />
                {isRTL ? "الدعم والإعلانات العامة" : "Support & Broadcasts"}
              </CardTitle>
              <CardDescription>
                {isRTL
                  ? "معلومات التواصل وإعلانات النظام التي تظهر للمستخدمين"
                  : "Platform contact points and broadcast banners"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-primary" />
                  {isRTL ? "البريد الإلكتروني للدعم الفني" : "Support Email"}
                </Label>
                <Input
                  type="email"
                  placeholder="support@finora.sd"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-primary" />
                  {isRTL ? "رسالة الإعلان العام (تظهر أعلى النظام)" : "System Broadcast Announcement"}
                </Label>
                <textarea
                  rows={4}
                  placeholder={
                    isRTL
                      ? "اكتب هنا رسالة الصيانة أو التحديثات لتظهر لكافة المستأجرين..."
                      : "Broadcast message or maintenance alert visible to all tenant users..."
                  }
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  className="w-full p-3 rounded-md border border-input bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
