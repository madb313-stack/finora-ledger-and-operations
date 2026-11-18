import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, ArrowRight, Loader2, KeyRound } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const { isRTL } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error(isRTL ? "يرجى إدخال البريد الإلكتروني" : "Please enter your email");
      return;
    }

    try {
      setLoading(true);
      const { error } = await resetPassword(email);
      if (error) {
        toast.error(error.message || (isRTL ? "فشل إرسال رابط الاستعادة" : "Failed to send reset link"));
      } else {
        setSubmitted(true);
        toast.success(isRTL ? "تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني" : "Reset link sent to your email");
      }
    } catch (err: any) {
      toast.error(err.message || (isRTL ? "حدث خطأ غير متوقع" : "An unexpected error occurred"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/40 to-background overflow-hidden">
      <Card className="w-full max-w-md shadow-2xl border-border/60 bg-card/90 backdrop-blur-md">
        <CardHeader className="space-y-1 text-center pb-6">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2">
            <KeyRound className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {isRTL ? "استعادة كلمة المرور" : "Reset Password"}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {isRTL
              ? "أدخل بريدك الإلكتروني المسجل وسنرسل لك رابطاً لتعيين كلمة مرور جديدة"
              : "Enter your registered email and we'll send you a password reset link"}
          </CardDescription>
        </CardHeader>

        {submitted ? (
          <CardContent className="space-y-4 text-center py-6">
            <div className="p-4 rounded-xl bg-primary/10 text-primary font-medium text-sm">
              {isRTL
                ? `تم إرسال تعليمات إعادة التعيين إلى ${email}. يرجى فحص صندوق الوارد.`
                : `Password reset instructions have been sent to ${email}. Please check your inbox.`}
            </div>
            <Link to="/login" className="inline-block mt-4 text-sm font-semibold text-primary hover:underline">
              {isRTL ? "العودة لتسجيل الدخول" : "Back to Sign In"}
            </Link>
          </CardContent>
        ) : (
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
                    className="ps-9"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-2">
              <Button type="submit" className="w-full font-semibold" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin me-2" />
                    {isRTL ? "جارٍ الإرسال..." : "Sending..."}
                  </>
                ) : (
                  <>
                    <span>{isRTL ? "إرسال رابط الاستعادة" : "Send Reset Link"}</span>
                    <ArrowRight className="h-4 w-4 ms-2 rtl:rotate-180" />
                  </>
                )}
              </Button>

              <div className="text-center text-xs">
                <Link to="/login" className="text-muted-foreground hover:text-foreground">
                  {isRTL ? "تذكرت كلمة المرور؟ تسجيل الدخول" : "Remembered password? Sign in"}
                </Link>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
