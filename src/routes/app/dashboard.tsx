import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Receipt,
  Users,
  CreditCard,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  AlertCircle,
  Package,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const Route = createFileRoute("/app/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { tenant } = useTenant();
  const { isRTL } = useTranslation();

  const [dateRange] = useState(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
    const to = now.toISOString().split("T")[0];
    return { from, to };
  });

  // Query Dashboard Summary RPC
  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard_summary", tenant?.id, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data, error } = await supabase.rpc("dashboard_summary", {
        _tenant: tenant.id,
        _from: dateRange.from,
        _to: dateRange.to,
      });
      if (error) throw error;
      return data as any;
    },
    enabled: !!tenant?.id,
  });

  // Query Recent Journal Entries
  const { data: recentEntries } = useQuery({
    queryKey: ["recent_entries", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("journal_entries")
        .select("id, number, entry_date, description, total_debit, status, source_type")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  const currencySymbol = tenant?.base_currency || "SDG";

  const formatMoney = (val?: number) => {
    const num = val || 0;
    return new Intl.NumberFormat(isRTL ? "ar-SD" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const chartData = summary?.monthly?.map((m: any) => ({
    name: m.month,
    إيرادات: Number(m.revenue || 0),
    مصروفات: Number(m.expenses || 0),
    مبيعات: Number(m.sales || 0),
  })) || [
    { name: "2026-01", إيرادات: 0, مصروفات: 0 },
    { name: "2026-02", إيرادات: 0, مصروفات: 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isRTL ? `لوحة التحكم · ${tenant?.name || ""}` : `Dashboard · ${tenant?.name || ""}`}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "نظرة عامة على السيولة النقدية، المبيعات، الأرباح، والالتزامات المالية"
              : "Overview of cash liquidity, revenue, net profit, and liabilities"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/app/sales-invoices_.new">
            <Button className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              <span>{isRTL ? "فاتورة مبيعات جديدة" : "New Sales Invoice"}</span>
            </Button>
          </Link>
          <Link to="/app/cash-transactions">
            <Button variant="outline" className="gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <span>{isRTL ? "سند قبض / صرف" : "New Transaction"}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cash Balance */}
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {isRTL ? "السيولة النقدية والبنوك" : "Cash & Bank Balance"}
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? "..." : formatMoney(summary?.cash)} {currencySymbol}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span>{isRTL ? "إجمالي الأرصدة المتاحة" : "Available in accounts"}</span>
            </p>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {isRTL ? "صافي الربح للفترة" : "Net Profit"}
            </CardTitle>
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                (summary?.net_profit || 0) >= 0
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              }`}
            >
              {(summary?.net_profit || 0) >= 0 ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                (summary?.net_profit || 0) >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {isLoading ? "..." : formatMoney(summary?.net_profit)} {currencySymbol}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isRTL ? "الإيرادات ناقص المصروفات" : "Revenue minus Expenses"}
            </p>
          </CardContent>
        </Card>

        {/* Receivables (AR) */}
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {isRTL ? "مستحقات العملاء (ذمم مدينة)" : "Accounts Receivable"}
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? "..." : formatMoney(summary?.receivables)} {currencySymbol}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isRTL
                ? `${summary?.outstanding?.count || 0} فواتير مبيعات معلقة`
                : `${summary?.outstanding?.count || 0} unpaid invoices`}
            </p>
          </CardContent>
        </Card>

        {/* Payables (AP) */}
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {isRTL ? "مستحقات الموردين (ذمم دائنة)" : "Accounts Payable"}
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? "..." : formatMoney(summary?.payables)} {currencySymbol}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isRTL ? "فواتير المشتريات المستحقة للدفع" : "Bills waiting payment"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart & Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              {isRTL ? "حركة الإيرادات والمصروفات الشهرية" : "Monthly Revenue & Expenses"}
            </CardTitle>
            <CardDescription>
              {isRTL ? "مقارنة الأداء المالي خلال السنة الحالية" : "Financial comparison across months"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" tickLine={false} />
                  <YAxis className="text-xs" tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "0.5rem",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="إيرادات"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRev)"
                  />
                  <Area
                    type="monotone"
                    dataKey="مصروفات"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorExp)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Operations / Actions */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              {isRTL ? "الوصول السريع للعمليات" : "Quick Operations"}
            </CardTitle>
            <CardDescription>
              {isRTL ? "إنجاز المهام اليومية بضغطة زر" : "Perform daily financial tasks"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/app/sales-invoices_.new" className="block">
              <div className="flex items-center justify-between p-3 rounded-xl border hover:border-primary hover:bg-muted/40 transition cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm block">
                      {isRTL ? "إنشاء فاتورة مبيعات" : "Create Invoice"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {isRTL ? "بيع نقدي أو آجل" : "Cash or credit sale"}
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
              </div>
            </Link>

            <Link to="/app/customers" className="block">
              <div className="flex items-center justify-between p-3 rounded-xl border hover:border-primary hover:bg-muted/40 transition cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm block">
                      {isRTL ? "إضافة عميل جديد" : "Add Customer"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {isRTL ? "تسجيل عميل وحد الائتمان" : "Register client"}
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
              </div>
            </Link>

            <Link to="/app/journal-entries_.new" className="block">
              <div className="flex items-center justify-between p-3 rounded-xl border hover:border-primary hover:bg-muted/40 transition cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm block">
                      {isRTL ? "تسجيل قيد يومية" : "New Journal Entry"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {isRTL ? "تسوية أو قيد محاسبي" : "Manual double entry"}
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
              </div>
            </Link>

            <Link to="/app/products" className="block">
              <div className="flex items-center justify-between p-3 rounded-xl border hover:border-primary hover:bg-muted/40 transition cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm block">
                      {isRTL ? "إدارة المخزون والأصناف" : "Inventory & Products"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {isRTL ? "المنتجات وتكلفة WAC" : "Items & average cost"}
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions Table */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">
              {isRTL ? "أحدث القيود المحاسبية والحركات" : "Recent Journal Transactions"}
            </CardTitle>
            <CardDescription>
              {isRTL ? "آخر العمليات المالية المسجلة في دفتر الأستاذ" : "Latest ledger postings"}
            </CardDescription>
          </div>
          <Link to="/app/journal-entries">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              <span>{isRTL ? "عرض الكل" : "View All"}</span>
              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs font-semibold">
                  <th className="text-start py-3 px-2">{isRTL ? "رقم القيد" : "Entry #"}</th>
                  <th className="text-start py-3 px-2">{isRTL ? "التاريخ" : "Date"}</th>
                  <th className="text-start py-3 px-2">{isRTL ? "البيان / الوصف" : "Description"}</th>
                  <th className="text-start py-3 px-2">{isRTL ? "المصدر" : "Source"}</th>
                  <th className="text-end py-3 px-2">{isRTL ? "المبلغ" : "Amount"}</th>
                  <th className="text-center py-3 px-2">{isRTL ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentEntries && recentEntries.length > 0 ? (
                  recentEntries.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/40 transition">
                      <td className="py-3 px-2 font-mono font-medium">{row.number || "—"}</td>
                      <td className="py-3 px-2 text-muted-foreground">{row.entry_date}</td>
                      <td className="py-3 px-2 font-medium max-w-xs truncate">{row.description || "—"}</td>
                      <td className="py-3 px-2 text-xs">
                        <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {row.source_type}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-end font-semibold">
                        {formatMoney(Number(row.total_debit))} {currencySymbol}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            row.status === "posted"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : row.status === "draft"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-red-500/10 text-red-600 dark:text-red-400"
                          }`}
                        >
                          {row.status === "posted"
                            ? isRTL ? "مرحّل" : "Posted"
                            : row.status === "draft"
                            ? isRTL ? "مسودة" : "Draft"
                            : isRTL ? "معكوس" : "Reversed"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      {isRTL ? "لا توجد قيود مسجلة بعد" : "No entries recorded yet"}
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

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
