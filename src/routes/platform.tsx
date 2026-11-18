import { createFileRoute, Outlet, useNavigate, Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  Building2,
  CreditCard,
  Layers,
  Settings,
  History,
  ArrowRight,
  ArrowLeft,
  Moon,
  Sun,
  Globe,
  Loader2,
  LogOut,
} from "lucide-react";

export const Route = createFileRoute("/platform")({
  component: PlatformLayout,
});

function PlatformLayout() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isRTL, language, setLanguage } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkAdmin() {
      if (authLoading) return;
      if (!user) {
        navigate({ to: "/login" });
        return;
      }

      try {
        const { data, error } = await supabase.rpc("is_platform_admin");
        if (error) throw error;
        if (active) {
          setIsAdmin(Boolean(data));
          setChecking(false);
        }
      } catch (err) {
        // Fallback check direct table
        try {
          const { data } = await supabase
            .from("platform_admins")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (active) {
            setIsAdmin(Boolean(data));
            setChecking(false);
          }
        } catch {
          if (active) {
            setIsAdmin(false);
            setChecking(false);
          }
        }
      }
    }

    checkAdmin();
    return () => {
      active = false;
    };
  }, [user, authLoading, navigate]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-sm font-medium">
          {isRTL ? "جارٍ التحقق من صلاحيات إدارة المنصة..." : "Verifying platform permissions..."}
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">
          {isRTL ? "غير مصرح لك بالدخول" : "Unauthorized Access"}
        </h2>
        <p className="text-muted-foreground max-w-md mb-6 text-sm">
          {isRTL
            ? "هذه المنطقة مخصصة لمديري منصة FINORA فقط. ليس لحسابك صلاحيات الوصول لإدارة المنصة العامة."
            : "This administrative area is restricted to FINORA platform super-administrators."}
        </p>
        <Button onClick={() => navigate({ to: "/app" })}>
          {isRTL ? "العودة للوحة تحكم الشركة" : "Return to Company Dashboard"}
        </Button>
      </div>
    );
  }

  const navLinks = [
    {
      to: "/platform/companies",
      label: isRTL ? "الشركات والمستأجرين" : "Tenants",
      icon: Building2,
    },
    {
      to: "/platform/plans",
      label: isRTL ? "خطط الاشتراك" : "Plans",
      icon: Layers,
    },
    {
      to: "/platform/subscriptions",
      label: isRTL ? "الاشتراكات" : "Subscriptions",
      icon: CreditCard,
    },
    {
      to: "/platform/settings",
      label: isRTL ? "إعدادات المنصة" : "Platform Settings",
      icon: Settings,
    },
    {
      to: "/platform/audit-log",
      label: isRTL ? "سجل تدقيق المنصة" : "Audit Log",
      icon: History,
    },
  ];

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" dir={isRTL ? "rtl" : "ltr"}>
      {/* Platform Top Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                  FINORA
                </span>
                <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                  {isRTL ? "إدارة المنصة" : "Platform Admin"}
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((item) => {
                const isActive = location.pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Action Tools */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
                className="h-8 px-2 gap-1 text-xs"
                title={language === "ar" ? "English" : "العربية"}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{language === "ar" ? "EN" : "عربي"}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
                className="h-8 w-8 p-0"
                title="Toggle Theme"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: "/app" })}
                className="h-8 gap-1.5 text-xs hidden sm:flex"
              >
                <BackIcon className="w-3.5 h-3.5" />
                <span>{isRTL ? "الرجوع للتطبيق" : "Back to App"}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                title={isRTL ? "تسجيل الخروج" : "Sign Out"}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Mobile Navigation bar */}
          <div className="flex md:hidden overflow-x-auto py-2 gap-1 border-t border-border">
            {navLinks.map((item) => {
              const isActive = location.pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
