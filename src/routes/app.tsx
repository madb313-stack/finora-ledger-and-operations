import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";
import { AppShell } from "@/components/layout/AppShell";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading: authLoading } = useAuth();
  const { tenants, loading: tenantLoading } = useTenant();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" });
      return;
    }

    if (!authLoading && !tenantLoading && user && tenants.length === 0) {
      navigate({ to: "/register" });
    }
  }, [user, tenants, authLoading, tenantLoading, navigate]);

  if (authLoading || tenantLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-sm font-medium">جارٍ تحميل بيانات المنشأة...</p>
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
