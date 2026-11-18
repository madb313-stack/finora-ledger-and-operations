import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Printer, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/reports/cash-flow")({
  component: CashFlowPage,
});

function CashFlowPage() {
  const { tenant } = useTenant();
  const { isRTL } = useTranslation();

  const [fromDate, setFromDate] = useState(() => `${new Date().getFullYear()}-01-01`);
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);

  const { data: report, isLoading } = useQuery({
    queryKey: ["cash_flow_report", tenant?.id, fromDate, toDate],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data, error } = await supabase.rpc("report_cash_flow", {
        _tenant: tenant.id,
        _from: fromDate,
        _to: toDate,
      });
      if (error) throw error;
      return data as any;
    },
    enabled: !!tenant?.id,
  });

  const items = (report?.items as any[]) || [];
  const operating = items.filter((i) => i.category === "operating");
  const investing = items.filter((i) => i.category === "investing");
  const financing = items.filter((i) => i.category === "financing");

  const opTotal = operating.reduce((acc, i) => acc + Number(i.amount || 0), 0);
  const invTotal = investing.reduce((acc, i) => acc + Number(i.amount || 0), 0);
  const finTotal = financing.reduce((acc, i) => acc + Number(i.amount || 0), 0);
  const netChange = opTotal + invTotal + finTotal;

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
            <DollarSign className="h-6 w-6 text-primary" />
            <span>{isRTL ? "قائمة التدفقات النقدية (Cash Flow Statement)" : "Cash Flow Statement"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "تحليل حركة المقبوضات والمدفوعات النقدية والبنكية خلال الفترة التشغيلية والاستثمارية"
              : "Analysis of cash inflows and outflows across operating, investing, and financing activities"}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          <span>{isRTL ? "طباعة التقرير" : "Print Report"}</span>
        </Button>
      </div>

      {/* Date Filter */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">{isRTL ? "من تاريخ" : "From Date"}</Label>
            <Input
              type="date"
              className="h-9 text-xs"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{isRTL ? "إلى تاريخ" : "To Date"}</Label>
            <Input
              type="date"
              className="h-9 text-xs"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {/* Opening Cash Box */}
        <div className="p-4 rounded-xl border bg-card flex justify-between items-center text-sm">
          <span className="font-semibold text-muted-foreground">
            {isRTL ? "رصيد النقدية في بداية الفترة (افتتاحي):" : "Opening Cash Balance:"}
          </span>
          <span className="font-mono font-bold text-base text-foreground">
            {formatMoney(Number(report?.opening_cash || 0))} {tenant?.base_currency}
          </span>
        </div>

        {/* Operating Activities */}
        <Card className="shadow-sm">
          <CardHeader className="bg-emerald-500/5 border-b pb-3">
            <CardTitle className="text-base font-bold text-emerald-700 dark:text-emerald-400">
              {isRTL ? "1. التدفقات النقدية من الأنشطة التشغيلية" : "1. Cash Flows from Operating Activities"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {operating.length > 0 ? (
                  operating.map((i, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="py-2.5 px-4 font-medium">
                        <span className="font-mono text-xs text-muted-foreground me-2">[{i.code}]</span>
                        {isRTL ? i.name_ar : i.name_en || i.name_ar}
                      </td>
                      <td className="py-2.5 px-4 text-end font-mono font-semibold">
                        {formatMoney(Number(i.amount))} {tenant?.base_currency}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="py-4 px-4 text-muted-foreground text-center text-xs">
                      {isRTL ? "لا توجد تدفقات تشغيلية" : "No operating movements"}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="border-t bg-muted/20 font-bold text-xs">
                <tr>
                  <td className="py-2.5 px-4">{isRTL ? "صافي التدفقات التشغيلية" : "Net Operating Cash Flow"}</td>
                  <td className="py-2.5 px-4 text-end font-mono">
                    {formatMoney(opTotal)} {tenant?.base_currency}
                  </td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>

        {/* Closing Cash Box */}
        <div className="p-4 rounded-xl border bg-primary/10 border-primary/30 flex justify-between items-center text-base font-bold">
          <span>{isRTL ? "رصيد النقدية في نهاية الفترة (ختامي):" : "Closing Cash Balance:"}</span>
          <span className="font-mono font-black text-xl text-primary">
            {formatMoney(Number(report?.closing_cash || 0))} {tenant?.base_currency}
          </span>
        </div>
      </div>
    </div>
  );
}
