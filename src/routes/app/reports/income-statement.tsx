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
import { TrendingUp, Printer, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/reports/income-statement")({
  component: IncomeStatementPage,
});

function IncomeStatementPage() {
  const { tenant } = useTenant();
  const { isRTL } = useTranslation();

  const [fromDate, setFromDate] = useState(() => `${new Date().getFullYear()}-01-01`);
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["income_statement", tenant?.id, fromDate, toDate],
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

  const revenues = rows.filter((r) => r.type === "revenue");
  const expenses = rows.filter((r) => r.type === "expense");

  // In trial balance: revenue balance is credit - debit
  const totalRevenue = revenues.reduce((acc, r) => acc + (Number(r.credit || 0) - Number(r.debit || 0)), 0);
  // Expense balance is debit - credit
  const totalExpense = expenses.reduce((acc, r) => acc + (Number(r.debit || 0) - Number(r.credit || 0)), 0);
  const netIncome = totalRevenue - totalExpense;

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
            <TrendingUp className="h-6 w-6 text-primary" />
            <span>{isRTL ? "قائمة الدخل (الأرباح والخسائر)" : "Income Statement (P&L)"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "تقرير مقارنة الإيرادات التشغيلية بالمصروفات لتحديد صافي الربح أو الخسارة"
              : "Financial statement showing revenues, expenses, and resulting net profit"}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          <span>{isRTL ? "طباعة القائمة" : "Print Statement"}</span>
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

      {/* Statement Cards */}
      <div className="space-y-6">
        {/* Revenues Section */}
        <Card className="shadow-sm">
          <CardHeader className="bg-emerald-500/5 border-b pb-3">
            <CardTitle className="text-base font-bold text-emerald-700 dark:text-emerald-400">
              {isRTL ? "1. الإيرادات التشغيلية والمبيعات" : "1. Revenues & Operating Income"}
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
                ) : revenues.length > 0 ? (
                  revenues.map((r) => {
                    const bal = Number(r.credit || 0) - Number(r.debit || 0);
                    return (
                      <tr key={r.account_id} className="hover:bg-muted/30">
                        <td className="py-2.5 px-4 font-medium text-foreground">
                          <span className="font-mono text-xs text-muted-foreground me-2">[{r.code}]</span>
                          {isRTL ? r.name_ar : r.name_en || r.name_ar}
                        </td>
                        <td className="py-2.5 px-4 text-end font-mono font-semibold">
                          {formatMoney(bal)} {tenant?.base_currency}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={2} className="py-4 px-4 text-muted-foreground text-center text-xs">
                      {isRTL ? "لا توجد إيرادات مسجلة في هذه الفترة" : "No revenues recorded"}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="border-t bg-muted/20 font-bold text-sm">
                <tr>
                  <td className="py-3 px-4">{isRTL ? "إجمالي الإيرادات" : "Total Revenue"}</td>
                  <td className="py-3 px-4 text-end text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatMoney(totalRevenue)} {tenant?.base_currency}
                  </td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>

        {/* Expenses Section */}
        <Card className="shadow-sm">
          <CardHeader className="bg-red-500/5 border-b pb-3">
            <CardTitle className="text-base font-bold text-red-700 dark:text-red-400">
              {isRTL ? "2. المصروفات التشغيلية والعمومية" : "2. Operating Expenses"}
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
                ) : expenses.length > 0 ? (
                  expenses.map((r) => {
                    const bal = Number(r.debit || 0) - Number(r.credit || 0);
                    return (
                      <tr key={r.account_id} className="hover:bg-muted/30">
                        <td className="py-2.5 px-4 font-medium text-foreground">
                          <span className="font-mono text-xs text-muted-foreground me-2">[{r.code}]</span>
                          {isRTL ? r.name_ar : r.name_en || r.name_ar}
                        </td>
                        <td className="py-2.5 px-4 text-end font-mono font-semibold">
                          {formatMoney(bal)} {tenant?.base_currency}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={2} className="py-4 px-4 text-muted-foreground text-center text-xs">
                      {isRTL ? "لا توجد مصروفات مسجلة في هذه الفترة" : "No expenses recorded"}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="border-t bg-muted/20 font-bold text-sm">
                <tr>
                  <td className="py-3 px-4">{isRTL ? "إجمالي المصروفات" : "Total Expenses"}</td>
                  <td className="py-3 px-4 text-end text-red-600 dark:text-red-400 font-mono">
                    {formatMoney(totalExpense)} {tenant?.base_currency}
                  </td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>

        {/* Net Profit Summary Box */}
        <Card className="shadow-md border-primary/30 bg-primary/5">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-foreground">
                {isRTL ? "صافي الدخل / الربح للفترة" : "Net Income / Profit for Period"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {isRTL ? "المحسوب وفق القيود المعتمدة والمرحّلة في دفتر الأستاذ" : "Calculated from posted entries"}
              </p>
            </div>
            <div
              className={`text-3xl font-black font-mono ${
                netIncome >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {formatMoney(netIncome)} {tenant?.base_currency}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
