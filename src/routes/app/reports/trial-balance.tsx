import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Scale, Printer, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/reports/trial-balance")({
  component: TrialBalancePage,
});

function TrialBalancePage() {
  const { tenant } = useTenant();
  const { isRTL } = useTranslation();

  const [fromDate, setFromDate] = useState(() => `${new Date().getFullYear()}-01-01`);
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["trial_balance", tenant?.id, fromDate, toDate],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase.rpc("report_trial_balance", {
        _tenant: tenant.id,
        _from: fromDate,
        _to: toDate,
      });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!tenant?.id,
  });

  const totalDebit = rows.reduce((acc, r) => acc + Number(r.debit || 0), 0);
  const totalCredit = rows.reduce((acc, r) => acc + Number(r.credit || 0), 0);

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
            <Scale className="h-6 w-6 text-primary" />
            <span>{isRTL ? "ميزان المراجعة (Trial Balance)" : "Trial Balance"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "تقرير أرصدة وحركات الحسابات المدينة والدائنة للتحقق من التوازن المحاسبي"
              : "Summary of debit and credit movements and balances for all accounts"}
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

      {/* Report Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground text-xs font-semibold">
                  <th className="py-3 px-4 text-start">{isRTL ? "الكود" : "Code"}</th>
                  <th className="py-3 px-4 text-start">{isRTL ? "اسم الحساب" : "Account Name"}</th>
                  <th className="py-3 px-4 text-start">{isRTL ? "النوع" : "Type"}</th>
                  <th className="py-3 px-4 text-end">{isRTL ? "الرصيد الافتتاحي" : "Opening"}</th>
                  <th className="py-3 px-4 text-end">{isRTL ? "حركات مدين" : "Debit"}</th>
                  <th className="py-3 px-4 text-end">{isRTL ? "حركات دائن" : "Credit"}</th>
                  <th className="py-3 px-4 text-end">{isRTL ? "الرصيد الختامي" : "Closing"}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                      <span>{isRTL ? "جارٍ إعداد ميزان المراجعة..." : "Generating report..."}</span>
                    </td>
                  </tr>
                ) : rows.length > 0 ? (
                  rows.map((r) => (
                    <tr key={r.account_id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-4 font-mono font-bold text-xs">{r.code}</td>
                      <td className="py-2.5 px-4 font-medium text-foreground">
                        {isRTL ? r.name_ar : r.name_en || r.name_ar}
                      </td>
                      <td className="py-2.5 px-4 text-xs capitalize text-muted-foreground">{r.type}</td>
                      <td className="py-2.5 px-4 text-end font-mono text-xs text-muted-foreground">
                        {formatMoney(Number(r.opening))}
                      </td>
                      <td className="py-2.5 px-4 text-end font-mono font-semibold">
                        {Number(r.debit) > 0 ? formatMoney(Number(r.debit)) : "—"}
                      </td>
                      <td className="py-2.5 px-4 text-end font-mono font-semibold">
                        {Number(r.credit) > 0 ? formatMoney(Number(r.credit)) : "—"}
                      </td>
                      <td className="py-2.5 px-4 text-end font-mono font-bold text-foreground">
                        {formatMoney(Number(r.closing))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      {isRTL ? "لا توجد حركات في الفترة المحددة" : "No movements in selected period"}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="border-t bg-muted/30 font-bold text-xs">
                <tr>
                  <td colSpan={4} className="py-3.5 px-4 text-start font-bold">
                    {isRTL ? "إجمالي الحركات المتوازنة" : "Balanced Movement Totals"}
                  </td>
                  <td className="py-3.5 px-4 text-end font-mono font-bold text-primary">
                    {formatMoney(totalDebit)}
                  </td>
                  <td className="py-3.5 px-4 text-end font-mono font-bold text-primary">
                    {formatMoney(totalCredit)}
                  </td>
                  <td className="py-3.5 px-4 text-end font-mono font-bold">
                    {formatMoney(totalDebit - totalCredit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
