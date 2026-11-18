import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Calendar, Plus, Lock, Unlock, Loader2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/app/fiscal-years")({
  component: FiscalYearsPage,
});

function FiscalYearsPage() {
  const { tenant, hasPerm } = useTenant();
  const { isRTL } = useTranslation();
  const queryClient = useQueryClient();

  const [openDialog, setOpenDialog] = useState(false);
  const [startDate, setStartDate] = useState(() => `${new Date().getFullYear() + 1}-01-01`);

  // Query Fiscal Years with Periods
  const { data: fiscalYears = [], isLoading } = useQuery({
    queryKey: ["fiscal_years_list", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("fiscal_years")
        .select(`
          id, name, start_date, end_date, status, closed_at,
          accounting_periods ( id, name, start_date, end_date, status, closed_at )
        `)
        .eq("tenant_id", tenant.id)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Create Fiscal Year Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");
      const { data, error } = await supabase.rpc("create_fiscal_year", {
        _tenant: tenant.id,
        _start: startDate,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم إنشاء السنة المالية وفتراتها الشهرية" : "Fiscal year created");
      queryClient.invalidateQueries({ queryKey: ["fiscal_years_list"] });
      setOpenDialog(false);
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل إنشاء السنة المالية" : "Failed to create fiscal year"));
    },
  });

  // Toggle Period Status
  const periodMutation = useMutation({
    mutationFn: async ({ periodId, newStatus }: { periodId: string; newStatus: "open" | "closed" }) => {
      const { error } = await supabase.rpc("set_period_status", {
        _period: periodId,
        _status: newStatus,
      });
      if (error) throw error;
    },
    onSuccess: (_, { newStatus }) => {
      toast.success(
        newStatus === "closed"
          ? isRTL ? "تم إغلاق الفترة المالية" : "Period closed"
          : isRTL ? "تم فتح الفترة المالية" : "Period reopened"
      );
      queryClient.invalidateQueries({ queryKey: ["fiscal_years_list"] });
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل تعديل حالة الفترة" : "Failed to update period"));
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <span>{isRTL ? "السنوات والفترات المالية" : "Fiscal Years & Accounting Periods"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "إدارة الفترات المحاسبية الشهرية، إغلاق الفترات، وإقفال الحسابات الختامية"
              : "Manage monthly accounting periods and fiscal year closure"}
          </p>
        </div>

        {hasPerm("periods.manage") && (
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                <span>{isRTL ? "إنشاء سنة مالية جديدة" : "New Fiscal Year"}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{isRTL ? "إنشاء سنة مالية جديدة" : "New Fiscal Year"}</DialogTitle>
                <DialogDescription>
                  {isRTL
                    ? "سيتم إنشاء 12 فترة محاسبية شهرية تلقائياً للسنة المحددة"
                    : "Automatically generates 12 monthly accounting periods"}
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate();
                }}
                className="space-y-4 py-2"
              >
                <div className="space-y-2">
                  <Label htmlFor="fy-date">{isRTL ? "تاريخ بداية السنة المالية *" : "Start Date *"}</Label>
                  <Input
                    id="fy-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                    {isRTL ? "إلغاء" : "Cancel"}
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                    {isRTL ? "إنشاء السنة والفترات" : "Create Fiscal Year"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Fiscal Years List */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
            <span>{isRTL ? "جارٍ تحميل السنوات المالية..." : "Loading fiscal years..."}</span>
          </div>
        ) : fiscalYears.length > 0 ? (
          fiscalYears.map((fy) => {
            const periods = (fy.accounting_periods as any[]) || [];
            return (
              <Card key={fy.id} className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-3 bg-muted/20 border-b">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">{fy.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {fy.start_date} {isRTL ? "إلى" : "to"} {fy.end_date}
                      </CardDescription>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      fy.status === "open"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {fy.status === "open" ? (isRTL ? "مفتوحة" : "Open") : isRTL ? "مقفلة" : "Closed"}
                  </span>
                </CardHeader>
                <CardContent className="p-4">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    {isRTL ? "الفترات المحاسبية الشهرية" : "Monthly Accounting Periods"}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {periods.map((p) => {
                      const isOpen = p.status === "open";
                      return (
                        <div
                          key={p.id}
                          className="p-3 rounded-xl border flex items-center justify-between hover:bg-muted/40 transition"
                        >
                          <div>
                            <span className="font-semibold text-xs block text-foreground">{p.name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {p.start_date.slice(5)} {isRTL ? "إلى" : "to"} {p.end_date.slice(5)}
                            </span>
                          </div>
                          {hasPerm("periods.manage") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 rounded-lg ${
                                isOpen ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10" : "text-muted-foreground hover:bg-muted"
                              }`}
                              onClick={() =>
                                periodMutation.mutate({
                                  periodId: p.id,
                                  newStatus: isOpen ? "closed" : "open",
                                })
                              }
                              title={isOpen ? (isRTL ? "إغلاق الفترة" : "Close period") : isRTL ? "فتح الفترة" : "Open period"}
                            >
                              {isOpen ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="py-12 text-center text-muted-foreground bg-card rounded-2xl border">
            <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="font-semibold">{isRTL ? "لا توجد سنوات مالية" : "No fiscal years"}</h3>
          </div>
        )}
      </div>
    </div>
  );
}
