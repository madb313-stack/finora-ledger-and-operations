import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Printer, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/reports/aging")({
  component: AgingReportPage,
});

function AgingReportPage() {
  const { tenant } = useTenant();
  const { isRTL } = useTranslation();

  const [kind, setKind] = useState<"receivable" | "payable">("receivable");
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().split("T")[0]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["aging_report", tenant?.id, kind, asOfDate],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase.rpc("report_aging", {
        _tenant: tenant.id,
        _kind: kind,
        _as_of: asOfDate,
      });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!tenant?.id,
  });

  const formatMoney = (val?: number) => {
    return new Intl.NumberFormat(isRTL ? "ar-SD" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            <span>{isRTL ? "تقرير تقادم الديون (Aging Report)" : "Aging Report"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "تحليل فترات تأخير استحقاق فواتير العملاء أو مستحقات الموردين حسب الفئات الزمنية"
              : "Aging breakdown of receivables or payables (Current, 1-30, 31-60, 61-90, 90+ days)"}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          <span>{isRTL ? "طباعة التقرير" : "Print Report"}</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="flex items-center gap-1.5">
            <Button
              variant={kind === "receivable" ? "default" : "outline"}
              size="sm"
              onClick={() => setKind("receivable")}
              className="text-xs h-9"
            >
              {isRTL ? "ذمم مدينة (تقادم ديون العملاء)" : "Receivables (Customers)"}
            </Button>
            <Button
              variant={kind === "payable" ? "default" : "outline"}
              size="sm"
              onClick={() => setKind("payable")}
              className="text-xs h-9"
            >
              {isRTL ? "ذمم دائنة (تقادم مستحقات الموردين)" : "Payables (Suppliers)"}
            </Button>
          </div>

          <div className="space-y-1.5 ms-auto">
            <Label className="text-xs">{isRTL ? "كما في تاريخ" : "As of Date"}</Label>
            <Input
              type="date"
              className="h-9 text-xs"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground text-xs font-semibold">
                  <th className="py-3 px-4 text-start">{isRTL ? "الطرف" : "Party"}</th>
                  <th className="py-3 px-4 text-end">{isRTL ? "جارية (غير مستحقة)" : "Current"}</th>
                  <th className="py-3 px-4 text-end">{isRTL ? "1 - 30 يوم" : "1-30 Days"}</th>
                  <th className="py-3 px-4 text-end">{isRTL ? "31 - 60 يوم" : "31-60 Days"}</th>
                  <th className="py-3 px-4 text-end">{isRTL ? "61 - 90 يوم" : "61-90 Days"}</th>
                  <th className="py-3 px-4 text-end">{isRTL ? "+90 يوم" : "+90 Days"}</th>
                  <th className="py-3 px-4 text-end">{isRTL ? "إجمالي الرصيد" : "Total"}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                      <span>{isRTL ? "جارٍ إعداد تقرير الأعمار..." : "Loading aging report..."}</span>
                    </td>
                  </tr>
                ) : rows.length > 0 ? (
                  rows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="py-2.5 px-4 font-semibold text-foreground">{r.party_name}</td>
                      <td className="py-2.5 px-4 text-end font-mono text-xs">{formatMoney(Number(r.b_current))}</td>
                      <td className="py-2.5 px-4 text-end font-mono text-xs">{formatMoney(Number(r.b_30))}</td>
                      <td className="py-2.5 px-4 text-end font-mono text-xs">{formatMoney(Number(r.b_60))}</td>
                      <td className="py-2.5 px-4 text-end font-mono text-xs text-amber-600 dark:text-amber-400">
                        {formatMoney(Number(r.b_90))}
                      </td>
                      <td className="py-2.5 px-4 text-end font-mono text-xs text-destructive font-bold">
                        {formatMoney(Number(r.b_over))}
                      </td>
                      <td className="py-2.5 px-4 text-end font-mono font-bold text-foreground">
                        {formatMoney(Number(r.total))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      {isRTL ? "لا توجد ذمم أو فواتير معلقة" : "No open balances"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
