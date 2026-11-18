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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, Printer, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/reports/account-ledger")({
  component: AccountLedgerPage,
});

function AccountLedgerPage() {
  const { tenant } = useTenant();
  const { isRTL } = useTranslation();

  const [accountId, setAccountId] = useState("");
  const [fromDate, setFromDate] = useState(() => `${new Date().getFullYear()}-01-01`);
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Query Accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts_for_ledger", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("accounts")
        .select("id, code, name_ar, name_en")
        .eq("tenant_id", tenant.id)
        .eq("is_group", false)
        .order("code");
      if (error) return [];
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Query Ledger Report
  const { data: ledger, isLoading } = useQuery({
    queryKey: ["account_ledger_report", tenant?.id, accountId, fromDate, toDate],
    queryFn: async () => {
      if (!tenant?.id || !accountId) return null;
      const { data, error } = await supabase.rpc("report_account_ledger", {
        _tenant: tenant.id,
        _account: accountId,
        _from: fromDate,
        _to: toDate,
      });
      if (error) throw error;
      return data as any;
    },
    enabled: !!tenant?.id && !!accountId,
  });

  const lines = (ledger?.lines as any[]) || [];
  let running = Number(ledger?.opening || 0);

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
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            <span>{isRTL ? "دفتر الأستاذ العام وكشف الحساب" : "General Ledger & Statement"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "عرض تفصيلي لجميع العمليات والقيود المرحلة على أي حساب مالي محدد مع الرصيد التراكمي"
              : "Detailed ledger movement history and cumulative running balance"}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          <span>{isRTL ? "طباعة الكشف" : "Print Statement"}</span>
        </Button>
      </div>

      {/* Filter Card */}
      <Card className="shadow-sm">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">{isRTL ? "اختر الحساب المراد كشفه *" : "Account *"}</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder={isRTL ? "اختر الحساب..." : "Select account..."} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="font-mono text-xs me-2">[{a.code}]</span>
                    <span>{isRTL ? a.name_ar : a.name_en || a.name_ar}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

      {/* Statement Table */}
      {accountId && (
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground text-xs font-semibold">
                    <th className="py-3 px-4 text-start">{isRTL ? "التاريخ" : "Date"}</th>
                    <th className="py-3 px-4 text-start">{isRTL ? "رقم القيد" : "Entry #"}</th>
                    <th className="py-3 px-4 text-start">{isRTL ? "البيان / المصدر" : "Description"}</th>
                    <th className="py-3 px-4 text-start">{isRTL ? "الطرف" : "Party"}</th>
                    <th className="py-3 px-4 text-end">{isRTL ? "مدين" : "Debit"}</th>
                    <th className="py-3 px-4 text-end">{isRTL ? "دائن" : "Credit"}</th>
                    <th className="py-3 px-4 text-end">{isRTL ? "الرصيد التراكمي" : "Balance"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {/* Opening Balance Row */}
                  <tr className="bg-muted/10 font-medium">
                    <td className="py-2.5 px-4 text-xs text-muted-foreground">{fromDate}</td>
                    <td className="py-2.5 px-4 font-mono text-xs">—</td>
                    <td colSpan={2} className="py-2.5 px-4 text-xs font-bold text-muted-foreground">
                      {isRTL ? "رصيد منقول (افتتاحي)" : "Opening Balance Brought Forward"}
                    </td>
                    <td className="py-2.5 px-4 text-end font-mono">—</td>
                    <td className="py-2.5 px-4 text-end font-mono">—</td>
                    <td className="py-2.5 px-4 text-end font-mono font-bold text-foreground">
                      {formatMoney(Number(ledger?.opening || 0))}
                    </td>
                  </tr>

                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                        <span>{isRTL ? "جارٍ إعداد كشف الحساب..." : "Loading ledger..."}</span>
                      </td>
                    </tr>
                  ) : lines.length > 0 ? (
                    lines.map((l, idx) => {
                      const d = Number(l.debit || 0);
                      const c = Number(l.credit || 0);
                      running += d - c;
                      return (
                        <tr key={idx} className="hover:bg-muted/30">
                          <td className="py-2.5 px-4 text-xs text-muted-foreground">{l.entry_date}</td>
                          <td className="py-2.5 px-4 font-mono text-xs font-semibold text-foreground">
                            {l.number || "—"}
                          </td>
                          <td className="py-2.5 px-4 text-xs">
                            <span className="font-medium text-foreground block">{l.description || "—"}</span>
                            {l.line_description && (
                              <span className="text-[11px] text-muted-foreground">{l.line_description}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-xs font-medium text-muted-foreground">
                            {l.party_name || "—"}
                          </td>
                          <td className="py-2.5 px-4 text-end font-mono font-semibold">
                            {d > 0 ? formatMoney(d) : "—"}
                          </td>
                          <td className="py-2.5 px-4 text-end font-mono font-semibold">
                            {c > 0 ? formatMoney(c) : "—"}
                          </td>
                          <td className="py-2.5 px-4 text-end font-mono font-bold text-foreground">
                            {formatMoney(running)}
                          </td>
                        </tr>
                      );
                    })
                  ) : null}
                </tbody>
                <tfoot className="border-t bg-muted/30 font-bold text-sm">
                  <tr>
                    <td colSpan={6} className="py-3 px-4 text-start">
                      {isRTL ? "الرصيد الختامي في نهاية الفترة" : "Closing Balance"}
                    </td>
                    <td className="py-3 px-4 text-end font-mono text-primary font-black">
                      {formatMoney(running)} {tenant?.base_currency}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
