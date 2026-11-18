import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CreditCard, Plus, Search, ArrowUpRight, ArrowDownLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/payments")({
  component: PaymentsPage,
});

function PaymentsPage() {
  const { tenant, hasPerm } = useTenant();
  const { isRTL } = useTranslation();
  const queryClient = useQueryClient();

  const [dirFilter, setDirFilter] = useState<"all" | "in" | "out">("all");
  const [search, setSearch] = useState("");
  const [openDialog, setOpenDialog] = useState(false);

  // Form states
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [partyId, setPartyId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");

  // Query Payments
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("payments")
        .select(`
          id, number, direction, payment_date, amount, currency_code, method, reference, notes, status,
          parties ( id, name, code ),
          financial_accounts ( id, name )
        `)
        .eq("tenant_id", tenant.id)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Query Parties (customers if direction=in, suppliers if direction=out)
  const { data: parties = [] } = useQuery({
    queryKey: ["parties_for_payments", tenant?.id, direction],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("parties")
        .select("id, name, code")
        .eq("tenant_id", tenant.id)
        .eq("kind", direction === "in" ? "customer" : "supplier")
        .eq("is_active", true)
        .order("name");
      if (error) return [];
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Query Unpaid Invoices for selected party
  const { data: unpaidInvoices = [] } = useQuery({
    queryKey: ["unpaid_invoices", tenant?.id, direction, partyId],
    queryFn: async () => {
      if (!tenant?.id || !partyId) return [];
      if (direction === "in") {
        const { data, error } = await supabase
          .from("sales_invoices")
          .select("id, number, invoice_date, total, amount_paid, amount_credited, currency_code")
          .eq("tenant_id", tenant.id)
          .eq("customer_id", partyId)
          .in("status", ["posted", "partially_paid"]);
        if (error) return [];
        return data || [];
      } else {
        const { data, error } = await supabase
          .from("purchase_invoices")
          .select("id, number, invoice_date, total, amount_paid, amount_credited, currency_code")
          .eq("tenant_id", tenant.id)
          .eq("supplier_id", partyId)
          .in("status", ["posted", "partially_paid"]);
        if (error) return [];
        return data || [];
      }
    },
    enabled: !!tenant?.id && !!partyId,
  });

  // Query Accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ["fa_for_payments", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("financial_accounts")
        .select("id, name, currency_code")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true);
      if (error) return [];
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Create Payment Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");
      if (!partyId) throw new Error(isRTL ? "يرجى اختيار العميل أو المورد" : "Select party");
      if (!accountId) throw new Error(isRTL ? "يرجى اختيار الحساب المالي" : "Select account");
      if (!amount || parseFloat(amount) <= 0) throw new Error(isRTL ? "المبلغ غير صالح" : "Invalid amount");
      if (!selectedInvoiceId) throw new Error(isRTL ? "يرجى اختيار الفاتورة المراد سدادها" : "Select invoice to allocate");

      const numAmt = parseFloat(amount);
      const payload = {
        tenant_id: tenant.id,
        direction,
        party_id: partyId,
        financial_account_id: accountId,
        payment_date: payDate,
        amount: numAmt,
        method,
        reference: reference || null,
        notes: notes || null,
        allocations: [{ invoice_id: selectedInvoiceId, amount: numAmt }],
      };

      const { data, error } = await supabase.rpc("record_payment", { _p: payload });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(
        direction === "in"
          ? isRTL ? "تم تسجيل سند القبض وسداد الفاتورة بنجاح" : "Receipt recorded & invoice settled"
          : isRTL ? "تم تسجيل سند الصرف وسداد فاتورة المورد" : "Payment recorded"
      );
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["sales_invoices"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_invoices"] });
      queryClient.invalidateQueries({ queryKey: ["fa_balances"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_summary"] });
      setOpenDialog(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل تسجيل الدفعة" : "Failed to record payment"));
    },
  });

  const resetForm = () => {
    setAmount("");
    setReference("");
    setNotes("");
    setSelectedInvoiceId("");
  };

  const filtered = payments.filter((p) => {
    const matchesDir = dirFilter === "all" || p.direction === dirFilter;
    const partyName = (p.parties as any)?.name || "";
    const matchesSearch =
      (p.number && p.number.toLowerCase().includes(search.toLowerCase())) ||
      partyName.toLowerCase().includes(search.toLowerCase());
    return matchesDir && matchesSearch;
  });

  const formatMoney = (val?: number) => {
    return new Intl.NumberFormat(isRTL ? "ar-SD" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            <span>{isRTL ? "سداد الفواتير (مقبوضات ومدفوعات)" : "Invoice Payments"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "تسجيل سداد فواتير المبيعات من العملاء ودفع مستحقات الموردين"
              : "Record collections from customers and disbursements to suppliers"}
          </p>
        </div>

        {hasPerm("payments.record") && (
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                <span>{isRTL ? "تسجيل دفعة جديدة" : "Record Payment"}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isRTL ? "تسجيل عملية سداد" : "Record Payment"}</DialogTitle>
                <DialogDescription>
                  {isRTL ? "قبض من عميل أو دفع لمورد وربطها بالفاتورة" : "Settle customer or supplier invoice"}
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate();
                }}
                className="space-y-4 py-2"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{isRTL ? "نوع الحركة *" : "Direction *"}</Label>
                    <Select
                      value={direction}
                      onValueChange={(v: any) => {
                        setDirection(v);
                        setPartyId("");
                        setSelectedInvoiceId("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in">{isRTL ? "مقبوضات (من عميل)" : "Receipt (Customer)"}</SelectItem>
                        <SelectItem value="out">{isRTL ? "مدفوعات (إلى مورد)" : "Payment (Supplier)"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="p-date">{isRTL ? "التاريخ *" : "Date *"}</Label>
                    <Input
                      id="p-date"
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>
                    {direction === "in" ? (isRTL ? "العميل *" : "Customer *") : isRTL ? "المورد *" : "Supplier *"}
                  </Label>
                  <Select value={partyId} onValueChange={setPartyId}>
                    <SelectTrigger>
                      <SelectValue placeholder={isRTL ? "اختر الطرف..." : "Select party..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {parties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {partyId && (
                  <div className="space-y-2">
                    <Label>{isRTL ? "الفاتورة المراد سدادها *" : "Target Invoice *"}</Label>
                    <Select
                      value={selectedInvoiceId}
                      onValueChange={(id) => {
                        setSelectedInvoiceId(id);
                        const inv = unpaidInvoices.find((i) => i.id === id);
                        if (inv) {
                          const rem = Number(inv.total) - Number(inv.amount_paid) - Number(inv.amount_credited);
                          setAmount(String(rem));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isRTL ? "اختر الفاتورة..." : "Select invoice..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {unpaidInvoices.map((i) => {
                          const rem = Number(i.total) - Number(i.amount_paid) - Number(i.amount_credited);
                          return (
                            <SelectItem key={i.id} value={i.id}>
                              {i.number || "Inv"} · {isRTL ? "المتبقي:" : "Rem:"} {formatMoney(rem)} {i.currency_code}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {unpaidInvoices.length === 0 && (
                      <p className="text-xs text-amber-500">
                        {isRTL ? "لا توجد فواتير معلقة لهذا الطرف" : "No open invoices found"}
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="p-amt">{isRTL ? "المبلغ المسدد *" : "Amount *"}</Label>
                    <Input
                      id="p-amt"
                      type="number"
                      min="0.01"
                      step="any"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{isRTL ? "طريقة الدفع" : "Method"}</Label>
                    <Select value={method} onValueChange={setMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">{isRTL ? "نقداً (كاش)" : "Cash"}</SelectItem>
                        <SelectItem value="bank_transfer">{isRTL ? "تحويل بنكي / بنكك" : "Bank Transfer"}</SelectItem>
                        <SelectItem value="cheque">{isRTL ? "شيك" : "Cheque"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{isRTL ? "الحساب المستلم / المخصوم منه *" : "Financial Account *"}</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder={isRTL ? "اختر الخزينة أو البنك..." : "Select account..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} ({a.currency_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="p-ref">{isRTL ? "رقم الإشعار / المرجع" : "Ref Number"}</Label>
                  <Input
                    id="p-ref"
                    placeholder={isRTL ? "رقم إشعار بنكك..." : "e.g. Bank ref"}
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                    {isRTL ? "إلغاء" : "Cancel"}
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || !selectedInvoiceId}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                    {isRTL ? "تأكيد السداد" : "Record Payment"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filter and Search */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRTL ? "بحث برقم السند أو اسم العميل / المورد..." : "Search payments..."}
              className="ps-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Button
              variant={dirFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setDirFilter("all")}
              className="text-xs h-8"
            >
              {isRTL ? "الكل" : "All"}
            </Button>
            <Button
              variant={dirFilter === "in" ? "default" : "outline"}
              size="sm"
              onClick={() => setDirFilter("in")}
              className="text-xs h-8 gap-1"
            >
              <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
              <span>{isRTL ? "مقبوضات عملاء" : "Collections"}</span>
            </Button>
            <Button
              variant={dirFilter === "out" ? "default" : "outline"}
              size="sm"
              onClick={() => setDirFilter("out")}
              className="text-xs h-8 gap-1"
            >
              <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />
              <span>{isRTL ? "مدفوعات موردين" : "Disbursements"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground text-xs font-semibold">
                  <th className="text-start py-3 px-4">{isRTL ? "رقم السند" : "Payment #"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "التاريخ" : "Date"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "النوع" : "Type"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "الطرف (العميل / المورد)" : "Party"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "الحساب المالي" : "Account"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "طريقة الدفع" : "Method"}</th>
                  <th className="text-end py-3 px-4">{isRTL ? "المبلغ" : "Amount"}</th>
                  <th className="text-center py-3 px-4">{isRTL ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                      <span>{isRTL ? "جارٍ تحميل المدفوعات..." : "Loading payments..."}</span>
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((p) => {
                    const party = p.parties as any;
                    const acc = p.financial_accounts as any;
                    const isIn = p.direction === "in";
                    return (
                      <tr key={p.id} className="hover:bg-muted/40 transition">
                        <td className="py-3 px-4 font-mono font-medium text-xs">{p.number}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{p.payment_date}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              isIn
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-red-500/10 text-red-600 dark:text-red-400"
                            }`}
                          >
                            {isIn ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                            <span>{isIn ? (isRTL ? "قبض" : "Receipt") : isRTL ? "صرف" : "Disbursement"}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">{party?.name || "—"}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{acc?.name || "—"}</td>
                        <td className="py-3 px-4 text-xs">
                          <span className="capitalize">{p.method}</span>
                          {p.reference && <span className="block text-[11px] text-muted-foreground font-mono">Ref: {p.reference}</span>}
                        </td>
                        <td className="py-3 px-4 text-end font-bold">
                          <span className={isIn ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}>
                            {formatMoney(Number(p.amount))} {p.currency_code}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600">
                            {p.status === "posted" ? (isRTL ? "مرحّل" : "Posted") : p.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      {isRTL ? "لا توجد دفعات مسجلة" : "No payments found"}
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
