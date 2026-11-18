import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";
import { useTranslation } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Globe, Moon, Sun, Lock, Mail, User, Phone, Coins, Loader2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const { signUp } = useAuth();
  const { refetch: refetchTenant } = useTenant();
  const { locale, setLocale, isRTL } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currency, setCurrency] = useState("SDG");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !companyName || !email || !password) {
      toast.error(isRTL ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill in all required fields");
      return;
    }

    if (password.length < 6) {
      toast.error(isRTL ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error(isRTL ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      // 1. Sign up user
      const { error: signUpError, user } = await signUp(email, password, fullName);
      if (signUpError) {
        toast.error(signUpError.message || (isRTL ? "فشل إنشاء الحساب" : "Failed to sign up"));
        setLoading(false);
        return;
      }

      // 2. Register Company via RPC
      const companyPayload = {
        name: companyName,
        phone: phone || null,
        base_currency: currency,
        country_code: "SD",
        timezone: "Africa/Khartoum",
        default_locale: locale,
        inventory_enabled: true,
      };

      const { data: tenantId, error: regError } = await supabase.rpc("register_company", {
        _p: companyPayload,
      });

      if (regError) {
        console.error("Error creating company:", regError);
        toast.error(regError.message || (isRTL ? "تم إنشاء الحساب ولكن تعذر إنشاء الشركة" : "Account created but failed to create company"));
      } else {
        toast.success(isRTL ? "تم إنشاء الحساب والشركة بنجاح!" : "Company created successfully!");
        if (typeof window !== "undefined" && tenantId) {
          localStorage.setItem("finora_selected_tenant_id", tenantId);
        }
        await refetchTenant();
        navigate({ to: "/app/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message || (isRTL ? "حدث خطأ غير متوقع" : "An unexpected error occurred"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/40 to-background overflow-hidden py-12">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top action controls */}
      <div className="absolute top-6 start-6 end-6 flex justify-between items-center max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black shadow-lg shadow-primary/20">
            F
          </div>
          <span className="font-bold text-xl tracking-wider text-foreground">FINORA</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            className="flex items-center gap-1.5 text-xs font-medium"
          >
            <Globe className="h-4 w-4" />
            <span>{locale === "ar" ? "English" : "العربية"}</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-full"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <Card className="w-full max-w-lg shadow-2xl border-border/60 bg-card/90 backdrop-blur-md mt-8">
        <CardHeader className="space-y-1 text-center pb-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2">
            <Building2 className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {isRTL ? "إنشاء حساب شركة جديدة" : "Register New Company"}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {isRTL
              ? "ابدأ تجربة مجانية شاملة لجميع العمليات المالية والمحاسبية"
              : "Start a full 30-day trial for complete financial and accounting management"}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{isRTL ? "الاسم الكامل *" : "Full Name *"}</Label>
                <div className="relative">
                  <User className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    className="ps-9"
                    placeholder={isRTL ? "مثال: أحمد محمد" : "e.g. John Doe"}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">{isRTL ? "اسم الشركة / النشاط *" : "Company Name *"}</Label>
                <div className="relative">
                  <Building2 className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="companyName"
                    className="ps-9"
                    placeholder={isRTL ? "مثال: مؤسسة الفجر التجارية" : "e.g. Acme Corp"}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">{isRTL ? "البريد الإلكتروني *" : "Email Address *"}</Label>
                <div className="relative">
                  <Mail className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    dir="ltr"
                    className="ps-9"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{isRTL ? "رقم الهاتف" : "Phone Number"}</Label>
                <div className="relative">
                  <Phone className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    dir="ltr"
                    className="ps-9"
                    placeholder="+249..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{isRTL ? "العملة الأساسية للنظام" : "Base Currency"}</Label>
              <div className="relative">
                <Coins className="absolute start-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                <Select value={currency} onValueChange={setCurrency} disabled={loading}>
                  <SelectTrigger className="ps-9">
                    <SelectValue placeholder={isRTL ? "اختر العملة" : "Select currency"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SDG">الجنيه السوداني (SDG)</SelectItem>
                    <SelectItem value="USD">الدولار الأمريكي (USD)</SelectItem>
                    <SelectItem value="SAR">الريال السعودي (SAR)</SelectItem>
                    <SelectItem value="AED">الدرهم الإماراتي (AED)</SelectItem>
                    <SelectItem value="EUR">اليورو (EUR)</SelectItem>
                    <SelectItem value="EGP">الجنيه المصري (EGP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">{isRTL ? "كلمة المرور *" : "Password *"}</Label>
                <div className="relative">
                  <Lock className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    dir="ltr"
                    className="ps-9"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{isRTL ? "تأكيد كلمة المرور *" : "Confirm Password *"}</Label>
                <div className="relative">
                  <Lock className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    dir="ltr"
                    className="ps-9"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button type="submit" className="w-full font-semibold shadow-md py-6 text-base" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin me-2" />
                  {isRTL ? "جارٍ إعداد شركتك ودليل الحسابات..." : "Setting up company & ledger..."}
                </>
              ) : (
                <>
                  <span>{isRTL ? "إنشاء حساب وبدء الاستخدام" : "Create Account & Start"}</span>
                  <ArrowRight className="h-5 w-5 ms-2 rtl:rotate-180" />
                </>
              )}
            </Button>

            <div className="text-center text-xs text-muted-foreground">
              <span>{isRTL ? "لديك حساب بالفعل؟ " : "Already have an account? "}</span>
              <Link to="/login" className="text-primary font-bold hover:underline">
                {isRTL ? "تسجيل الدخول" : "Sign in"}
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
