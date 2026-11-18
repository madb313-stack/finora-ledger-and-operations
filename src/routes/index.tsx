import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const { user, loading: authLoading } = useAuth();
  const { tenant, tenants, isPlatformAdmin, loading: tenantLoading } = useTenant();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || tenantLoading) return;

    if (!user) {
      navigate({ to: "/login" });
      return;
    }

    if (tenant || tenants.length > 0) {
      navigate({ to: "/app/dashboard" });
      return;
    }

    if (isPlatformAdmin) {
      navigate({ to: "/platform/companies" });
      return;
    }

    // Authenticated but no company yet
    navigate({ to: "/register" });
  }, [user, tenant, tenants, isPlatformAdmin, authLoading, tenantLoading, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-2xl shadow-xl shadow-primary/20 animate-pulse">
          F
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>جارٍ توجيهك إلى النظام...</span>
        </div>
      </div>
    </div>
  );
}
