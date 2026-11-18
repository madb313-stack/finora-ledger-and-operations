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
import { PieChart, Printer, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/reports/balance-sheet")({
  component: BalanceSheetPage,
});

function BalanceSheetPage() {
  const { tenant } = useTenant();
  const { isRTL } = useTranslation();

  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().split("T")[0]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["balance_sheet", tenant?.id, asOfDate],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase.rpc("report_trial_balance", {
        _tenant: tenant.id,
        _from: "2000-01-01",
        _to: asOfDate,
      });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!tenant?.id,
  });

  const assets = rows.filter((r) => r.type === "asset");
  const liabilities = rows.filter((r) => r.type === "liability");
  const equities = rows.filter((r) => r.type === "equity");

  // Also include current year net income into equity
  const revenues = rows.filter((r) => r.type === "revenue");
  const expenses = rows.filter((r) => r.type === "expense");
  const currentNetIncome =
    revenues.reduce((acc, r) => acc + (Number(r.credit || 0) - Number(r.debit || 0)), 0) -
    expenses.reduce((acc, r) => acc + (Number(r.debit || 0) - Number(r.credit || 0)), 0);

  const totalAssets = assets.reduce((acc, r) => acc + Number(r.closing || 0), 0);
  const totalLiabilities = liabilities.reduce((acc, r) => acc + -Number(r.closing || 0), 0);
  const totalEquities = equities.reduce((acc, r) => acc + -Number(r.closing || 0), 0) + currentNetIncome;

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
            <PieChart className="h-6 w-6 text-primary" />
            <span>{isRTL ? "الميزانية العمومية (المركز المالي)" : "Balance Sheet (Financial Position)"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "تقرير الأصول والخصوم وحقوق الملكية للتحقق من معادلة المركز المالي (الأصول = الخصوم + الملكية)"
              : "Financial position showing Assets, Liabilities, and Shareholders' Equity"}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          <span>{isRTL ? "طباعة الميزانية" : "Print Statement"}</span>
        </Button>
      </div>

      {/* Date Filter */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex gap-4 items-end max-w-xs">
          <div className="space-y-1.5 w-full">
            <Label className="text-xs">{isRTL ? "كما في تاريخ (حتى تاريخ)" : "As of Date"}</Label>
            <Input
              type="date"
              className="h-9 text-xs"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets Side */}
        <Card className="shadow-sm h-fit">
          <CardHeader className="bg-blue-500/5 border-b pb-3">
            <CardTitle className="text-base font-bold text-blue-700 dark:text-blue-400">
              {isRTL ? "الأصول والموجودات (Assets)" : "Assets"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={2} className="py-6 text-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                    </td>
                  </tr>
                ) : assets.length > 0 ? (
                  assets.map((r) => (
                    <tr key={r.account_id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-4 font-medium text-foreground">
                        <span className="font-mono text-xs text-muted-foreground me-2">[{r.code}]</span>
                        {isRTL ? r.name_ar : r.name_en || r.name_ar}
                      </td>
                      <td className="py-2.5 px-4 text-end font-mono font-semibold">
                        {formatMoney(Number(r.closing))} {tenant?.base_currency}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="py-4 px-4 text-muted-foreground text-center text-xs">
                      {isRTL ? "لا توجد أصول مسجلة" : "No assets recorded"}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="border-t bg-muted/20 font-bold text-sm">
                <tr>
                  <td className="py-3 px-4">{isRTL ? "إجمالي الأصول" : "Total Assets"}</td>
                  <td className="py-3 px-4 text-end text-primary font-mono font-bold">
                    {formatMoney(totalAssets)} {tenant?.base_currency}
                  </td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>

        {/* Liabilities & Equity Side */}
        <div className="space-y-6">
          {/* Liabilities */}
          <Card className="shadow-sm">
            <CardHeader className="bg-amber-500/5 border-b pb-3">
              <CardTitle className="text-base font-bold text-amber-700 dark:text-amber-400">
                {isRTL ? "الخصوم والالتزامات (Liabilities)" : "Liabilities"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  {liabilities.map((r) => (
                    <tr key={r.account_id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-4 font-medium text-foreground">
                        <span className="font-mono text-xs text-muted-foreground me-2">[{r.code}]</span>
                        {isRTL ? r.name_ar : r.name_en || r.name_ar}
                      </td>
                      <td className="py-2.5 px-4 text-end font-mono font-semibold">
                        {formatMoney(-Number(r.closing))} {tenant?.base_currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-muted/20 font-bold text-sm">
                  <tr>
                    <td className="py-2.5 px-4">{isRTL ? "إجمالي الخصوم" : "Total Liabilities"}</td>
                    <td className="py-2.5 px-4 text-end font-mono">
                      {formatMoney(totalLiabilities)} {tenant?.base_currency}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Equity */}
          <Card className="shadow-sm">
            <CardHeader className="bg-purple-500/5 border-b pb-3">
              <CardTitle className="text-base font-bold text-purple-700 dark:text-purple-400">
                {isRTL ? "حقوق الملكية (Equity)" : "Equity"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  {equities.map((r) => (
                    <tr key={r.account_id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-4 font-medium text-foreground">
                        <span className="font-mono text-xs text-muted-foreground me-2">[{r.code}]</span>
                        {isRTL ? r.name_ar : r.name_en || r.name_ar}
                      </td>
                      <td className="py-2.5 px-4 text-end font-mono font-semibold">
                        {formatMoney(-Number(r.closing))} {tenant?.base_currency}
                      </td>
                    </tr>
                  ))}
                  <tr className="hover:bg-muted/30">
                    <td className="py-2.5 px-4 font-medium text-foreground">
                      {isRTL ? "أرباح / (خسائر) العام الحالي" : "Current Year Earnings"}
                    </td>
                    <td className="py-2.5 px-4 text-end font-mono font-semibold">
                      {formatMoney(currentNetIncome)} {tenant?.base_currency}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="border-t bg-muted/20 font-bold text-sm">
                  <tr>
                    <td className="py-2.5 px-4">{isRTL ? "إجمالي حقوق الملكية" : "Total Equity"}</td>
                    <td className="py-2.5 px-4 text-end font-mono">
                      {formatMoney(totalEquities)} {tenant?.base_currency}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Balance Check */}
          <div className="p-4 rounded-xl border bg-muted/40 flex justify-between items-center text-sm font-bold">
            <span>{isRTL ? "إجمالي الخصوم وحقوق الملكية" : "Total Liabilities & Equity"}:</span>
            <span className="text-primary font-mono text-base font-black">
              {formatMoney(totalLiabilities + totalEquities)} {tenant?.base_currency}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
