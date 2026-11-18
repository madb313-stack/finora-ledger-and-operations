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
import { Wallet, Plus, Search, ArrowUpRight, ArrowDownLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/cash-transactions")({
  component: CashTransactionsPage,
});

function CashTransactionsPage() {
  const { tenant, hasPerm } = useTenant();
  const { isRTL } = useTranslation();
  const queryClient = useQueryClient();

  const [kindFilter, setKindFilter] = useState<"all" | "income" | "expense">("all");
  const [search, setSearch] = useState("");
  const [openDialog, setOpenDialog] = useState(false);

  // Form states
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");

  // Query Transactions
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["cash_transactions", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("cash_transactions")
        .select(`
          id, number, kind, transaction_date, amount, total, currency_code, payment_method, reference, description, status,
          financial_accounts ( id, name ),
          categories ( id, name_ar, name_en )
        `)
        .eq("tenant_id", tenant.id)
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Query Financial Accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ["financial_accounts_select", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("financial_accounts")
        .select("id, name, kind, currency_code")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true);
      if (error) return [];
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Query Categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories_select", tenant?.id, kind],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("categories")
        .select("id, name_ar, name_en, kind")
        .eq("tenant_id", tenant.id)
        .eq("kind", kind)
        .eq("is_active", true);
      if (error) return [];
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Mutation to Create Transaction
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");
      if (!accountId) throw new Error(isRTL ? "يرجى اختيار الحساب المالي" : "Select financial account");
      if (!categoryId) throw new Error(isRTL ? "يرجى اختيار بند التصنيف" : "Select category");
      if (!amount || parseFloat(amount) <= 0) throw new Error(isRTL ? "أدخل مبلغاً صالحاً" : "Enter valid amount");

      const payload = {
        tenant_id: tenant.id,
        kind,
        financial_account_id: accountId,
        category_id: categoryId,
        amount: parseFloat(amount),
        transaction_date: txDate,
        payment_method: method,
        reference: reference || null,
        description: description || null,
      };

      const { data, error } = await supabase.rpc("create_cash_transaction", { _p: payload });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(
        kind === "income"
          ? isRTL ? "تم تسجيل سند القبض بنجاح" : "Income recorded"
          : isRTL ? "تم تسجيل سند الصرف بنجاح" : "Expense recorded"
      );
      queryClient.invalidateQueries({ queryKey: ["cash_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["fa_balances"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_summary"] });
      setOpenDialog(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل تسجيل السند" : "Failed to record transaction"));
    },
  });

  const resetForm = () => {
    setAmount("");
    setReference("");
    setDescription("");
  };

  const filtered = transactions.filter((t) => {
    const matchesKind = kindFilter === "all" || t.kind === kindFilter;
    const catName = (t.categories as any)?.name_ar || "";
    const accName = (t.financial_accounts as any)?.name || "";
    const matchesSearch =
      (t.number && t.number.toLowerCase().includes(search.toLowerCase())) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase())) ||
      catName.includes(search) ||
      accName.includes(search);
    return matchesKind && matchesSearch;
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
            <Wallet className="h-6 w-6 text-primary" />
            <span>{isRTL ? "سندات الصرف والقبض" : "Income & Expense Vouchers"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "تسجيل الإيرادات والمصروفات التشغيلية المباشرة وحركات النقدية"
              : "Record direct operational expenses and miscellaneous income"}
          </p>
        </div>

        {hasPerm("transactions.create") && (
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                <span>{isRTL ? "تسجيل سند جديد" : "New Voucher"}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{isRTL ? "تسجيل سند مالي جديد" : "New Cash Voucher"}</DialogTitle>
                <DialogDescription>
                  {isRTL ? "سند صرف لمصروف أو سند قبض لإيراد نقدي" : "Record expense or income transaction"}
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
                    <Label>{isRTL ? "نوع السند *" : "Voucher Type *"}</Label>
                    <Select value={kind} onValueChange={(v: any) => { setKind(v); setCategoryId(""); }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">{isRTL ? "سند صرف (مصروف)" : "Expense Voucher"}</SelectItem>
                        <SelectItem value="income">{isRTL ? "سند قبض (إيراد)" : "Income Voucher"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tx-date">{isRTL ? "التاريخ *" : "Date *"}</Label>
                    <Input
                      id="tx-date"
                      type="date"
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{isRTL ? "الحساب النقدي / البنكي *" : "Financial Account *"}</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder={isRTL ? "اختر الحساب..." : "Select account..."} />
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
                  <Label>{isRTL ? "بند التصنيف *" : "Category *"}</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder={isRTL ? "اختر التصنيف..." : "Select category..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {isRTL ? c.name_ar : c.name_en || c.name_ar}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="tx-amt">{isRTL ? "المبلغ *" : "Amount *"}</Label>
                    <Input
                      id="tx-amt"
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
                    <Label>{isRTL ? "طريقة الدفع" : "Payment Method"}</Label>
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
                  <Label htmlFor="tx-ref">{isRTL ? "رقم المرجع / الإيصال" : "Reference #"}</Label>
                  <Input
                    id="tx-ref"
                    placeholder={isRTL ? "رقم العملية في بنكك أو رقم الفاتورة..." : "e.g. Bankak ref"}
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tx-desc">{isRTL ? "البيان / الوصف" : "Description"}</Label>
                  <Input
                    id="tx-desc"
                    placeholder={isRTL ? "تفاصيل المصروف أو الإيراد..." : "Notes..."}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                    {isRTL ? "إلغاء" : "Cancel"}
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                    {isRTL ? "تسجيل السند" : "Save Voucher"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filter Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRTL ? "بحث برقم السند أو البيان..." : "Search vouchers..."}
              className="ps-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Button
              variant={kindFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setKindFilter("all")}
              className="text-xs h-8"
            >
              {isRTL ? "الكل" : "All"}
            </Button>
            <Button
              variant={kindFilter === "income" ? "default" : "outline"}
              size="sm"
              onClick={() => setKindFilter("income")}
              className="text-xs h-8 gap-1"
            >
              <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
              <span>{isRTL ? "سندات قبض (إيراد)" : "Income"}</span>
            </Button>
            <Button
              variant={kindFilter === "expense" ? "default" : "outline"}
              size="sm"
              onClick={() => setKindFilter("expense")}
              className="text-xs h-8 gap-1"
            >
              <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />
              <span>{isRTL ? "سندات صرف (مصروف)" : "Expense"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground text-xs font-semibold">
                  <th className="text-start py-3 px-4">{isRTL ? "رقم السند" : "Voucher #"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "التاريخ" : "Date"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "النوع" : "Kind"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "التصنيف" : "Category"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "الحساب المالي" : "Account"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "البيان / المرجع" : "Description / Ref"}</th>
                  <th className="text-end py-3 px-4">{isRTL ? "المبلغ" : "Amount"}</th>
                  <th className="text-center py-3 px-4">{isRTL ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                      <span>{isRTL ? "جارٍ تحميل السندات..." : "Loading vouchers..."}</span>
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((t) => {
                    const cat = t.categories as any;
                    const acc = t.financial_accounts as any;
                    const isIncome = t.kind === "income";
                    return (
                      <tr key={t.id} className="hover:bg-muted/40 transition">
                        <td className="py-3 px-4 font-mono font-medium text-xs">{t.number}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{t.transaction_date}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              isIncome
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-red-500/10 text-red-600 dark:text-red-400"
                            }`}
                          >
                            {isIncome ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                            <span>{isIncome ? (isRTL ? "قبض" : "Income") : isRTL ? "صرف" : "Expense"}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-xs">{cat ? (isRTL ? cat.name_ar : cat.name_en || cat.name_ar) : "—"}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{acc?.name || "—"}</td>
                        <td className="py-3 px-4 text-xs">
                          <div className="font-medium text-foreground">{t.description || "—"}</div>
                          {t.reference && <div className="text-[11px] text-muted-foreground font-mono">Ref: {t.reference}</div>}
                        </td>
                        <td className="py-3 px-4 text-end font-bold">
                          <span className={isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                            {isIncome ? "+" : "-"}{formatMoney(Number(t.total))} {t.currency_code}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600">
                            {t.status === "posted" ? (isRTL ? "مرحّل" : "Posted") : t.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      {isRTL ? "لا توجد سندات مسجلة" : "No vouchers recorded"}
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
