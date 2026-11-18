import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Globe, Moon, Sun, Lock, Mail, ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { signIn } = useAuth();
  const { t, locale, setLocale, isRTL } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [resending, setResending] = useState(false);

  const handleResendConfirmation = async () => {
    if (!email.trim()) return;
    try {
      setResending(true);
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(
          isRTL
            ? "تمت إعادة إرسال رابط التفعيل بنجاح! راجع بريدك الآن (وافحص مجلد Spam)."
            : "Confirmation link sent! Check your email inbox and spam folder."
        );
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to resend confirmation");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(isRTL ? "يرجى إدخال البريد الإلكتروني وكلمة المرور" : "Please fill in email and password");
      return;
    }

    try {
      setLoading(true);
      const { error } = await signIn(email.trim(), password);
      if (error) {
        if (error.message.includes("Email not confirmed")) {
          setShowResendConfirmation(true);
          toast.error(
            isRTL
              ? "يرجى تأكيد بريدك الإلكتروني عبر الرابط المرسل إلى بريدك أولاً."
              : "Please confirm your email address via the link sent to your inbox first."
          );
        } else if (error.message.includes("Invalid login credentials")) {
          toast.error(
            isRTL
              ? "بيانات الدخول غير صحيحة. يرجى التأكد من البريد الإلكتروني وكلمة المرور."
              : "Invalid email or password. Please check your credentials."
          );
        } else {
          toast.error(error.message || (isRTL ? "فشل تسجيل الدخول. تحقق من البيانات." : "Login failed"));
        }
      } else {
        toast.success(isRTL ? "تم تسجيل الدخول بنجاح" : "Signed in successfully");
        navigate({ to: "/app/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message || (isRTL ? "حدث خطأ غير متوقع" : "An unexpected error occurred"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/40 to-background overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top action controls (Locale & Theme) */}
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

      {/* Main card */}
      <Card className="w-full max-w-md shadow-2xl border-border/60 bg-card/90 backdrop-blur-md">
        <CardHeader className="space-y-1 text-center pb-6">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2">
            <Building2 className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {isRTL ? "تسجيل الدخول إلى فيكورا" : "Sign in to FINORA"}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {isRTL
              ? "أدخل بيانات حسابك للوصول إلى لوحة الإدارة المالية"
              : "Enter your credentials to access the financial platform"}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{isRTL ? "البريد الإلكتروني" : "Email Address"}</Label>
              <div className="relative">
                <Mail className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  placeholder="admin@example.com"
                  className="ps-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{isRTL ? "كلمة المرور" : "Password"}</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {isRTL ? "نسيت كلمة المرور؟" : "Forgot password?"}
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  dir="ltr"
                  className="ps-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {showResendConfirmation && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
                <p className="text-amber-800 dark:text-amber-300 font-medium">
                  {isRTL
                    ? "حسابك بانتظار تفعيل البريد. يرجى فحص صندوق الوارد ومجلد الرسائل غير المرغوب فيها (Spam)."
                    : "Your account requires email confirmation. Please check your inbox and spam folder."}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResendConfirmation}
                  disabled={resending}
                  className="w-full h-8 text-xs font-semibold border-amber-500/40 hover:bg-amber-500/20"
                >
                  {resending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  ) : (
                    <Mail className="w-3.5 h-3.5 mr-1" />
                  )}
                  {isRTL ? "إعادة إرسال رابط التفعيل إلى بريدي" : "Resend Confirmation Email"}
                </Button>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button type="submit" className="w-full font-semibold shadow-md" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                  {isRTL ? "جارٍ تسجيل الدخول..." : "Signing in..."}
                </>
              ) : (
                <>
                  <span>{isRTL ? "تسجيل الدخول" : "Sign in"}</span>
                  <ArrowRight className="h-4 w-4 ms-2 rtl:rotate-180" />
                </>
              )}
            </Button>

            <div className="text-center text-xs text-muted-foreground">
              <span>{isRTL ? "ليس لديك حساب شركة بعد؟ " : "Don't have a company account yet? "}</span>
              <Link to="/register" className="text-primary font-bold hover:underline">
                {isRTL ? "أنشئ شركتك الآن مجاناً" : "Create your company now"}
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
