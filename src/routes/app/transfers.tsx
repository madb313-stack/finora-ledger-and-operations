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
import { ArrowLeftRight, Plus, Search, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/transfers")({
  component: TransfersPage,
});

function TransfersPage() {
  const { tenant, hasPerm } = useTenant();
  const { isRTL } = useTranslation();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [openDialog, setOpenDialog] = useState(false);

  // Form states
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  // Query Transfers
  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ["transfers", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("transfers")
        .select(`
          id, number, transfer_date, amount, to_amount, reference, notes, status,
          from_account:financial_accounts!from_account_id ( id, name, currency_code ),
          to_account:financial_accounts!to_account_id ( id, name, currency_code )
        `)
        .eq("tenant_id", tenant.id)
        .order("transfer_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Query Accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ["fa_for_transfers", tenant?.id],
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

  const fromAcc = accounts.find((a) => a.id === fromAccountId);
  const toAcc = accounts.find((a) => a.id === toAccountId);
  const isMultiCurrency = fromAcc && toAcc && fromAcc.currency_code !== toAcc.currency_code;

  // Mutation to Create Transfer
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");
      if (!fromAccountId || !toAccountId) throw new Error(isRTL ? "اختر الحسابين" : "Select both accounts");
      if (fromAccountId === toAccountId) throw new Error(isRTL ? "لا يمكن التحويل لنفس الحساب" : "Accounts must differ");
      if (!amount || parseFloat(amount) <= 0) throw new Error(isRTL ? "المبلغ غير صالح" : "Invalid amount");

      const payload: any = {
        tenant_id: tenant.id,
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        transfer_date: transferDate,
        amount: parseFloat(amount),
        to_amount: isMultiCurrency ? parseFloat(toAmount || amount) : parseFloat(amount),
        reference: reference || null,
        notes: notes || null,
      };

      const { data, error } = await supabase.rpc("create_transfer", { _p: payload });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم إجراء التحويل المالي وقيده في الدفاتر" : "Transfer executed successfully");
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["fa_balances"] });
      queryClient.invalidateQueries({ queryKey: ["financial_accounts"] });
      setOpenDialog(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل التحويل" : "Transfer failed"));
    },
  });

  const resetForm = () => {
    setAmount("");
    setToAmount("");
    setReference("");
    setNotes("");
  };

  const filtered = transfers.filter((t) => {
    const fromName = (t.from_account as any)?.name || "";
    const toName = (t.to_account as any)?.name || "";
    return (
      (t.number && t.number.toLowerCase().includes(search.toLowerCase())) ||
      fromName.toLowerCase().includes(search.toLowerCase()) ||
      toName.toLowerCase().includes(search.toLowerCase()) ||
      (t.reference && t.reference.toLowerCase().includes(search.toLowerCase()))
    );
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
            <ArrowLeftRight className="h-6 w-6 text-primary" />
            <span>{isRTL ? "التحويلات المالية بين الحسابات" : "Internal Fund Transfers"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "تحويل الأموال بين الخزائن والبنوك (إيداع نقدية، تغذية حساب بنكك، تحويل عملات)"
              : "Move funds between cash drawers and bank accounts"}
          </p>
        </div>

        {hasPerm("transactions.create") && (
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                <span>{isRTL ? "تحويل جديد" : "New Transfer"}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{isRTL ? "تحويل مالي بين الحسابات" : "Transfer Funds"}</DialogTitle>
                <DialogDescription>
                  {isRTL ? "نقل رصيد من خزينة أو بنك إلى حساب آخر" : "Transfer money between your treasury accounts"}
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
                  <Label>{isRTL ? "من الحساب (المحول منه) *" : "From Account *"}</Label>
                  <Select value={fromAccountId} onValueChange={setFromAccountId}>
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
                  <Label>{isRTL ? "إلى الحساب (المحول إليه) *" : "To Account *"}</Label>
                  <Select value={toAccountId} onValueChange={setToAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder={isRTL ? "اختر الحساب..." : "Select account..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id} disabled={a.id === fromAccountId}>
                          {a.name} ({a.currency_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="tr-amt">
                      {isRTL ? "المبلغ المحول *" : "Transfer Amount *"}
                      {fromAcc && <span className="text-xs text-muted-foreground ms-1">({fromAcc.currency_code})</span>}
                    </Label>
                    <Input
                      id="tr-amt"
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
                    <Label htmlFor="tr-date">{isRTL ? "تاريخ التحويل *" : "Date *"}</Label>
                    <Input
                      id="tr-date"
                      type="date"
                      value={transferDate}
                      onChange={(e) => setTransferDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {isMultiCurrency && (
                  <div className="space-y-2 p-3 rounded-lg bg-muted/40 border">
                    <Label htmlFor="tr-toamt">
                      {isRTL ? "المبلغ المستلم في الحساب الهدف *" : "Amount Received in Target Account *"}
                      <span className="text-xs font-bold text-primary ms-1">({toAcc.currency_code})</span>
                    </Label>
                    <Input
                      id="tr-toamt"
                      type="number"
                      min="0.01"
                      step="any"
                      placeholder="0.00"
                      value={toAmount}
                      onChange={(e) => setToAmount(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="tr-ref">{isRTL ? "رقم المرجع / الإشعار" : "Ref / Notice #"}</Label>
                  <Input
                    id="tr-ref"
                    placeholder={isRTL ? "رقم العملية المصرفية..." : "Bank transaction #"}
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tr-notes">{isRTL ? "ملاحظات" : "Notes"}</Label>
                  <Input
                    id="tr-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                    {isRTL ? "إلغاء" : "Cancel"}
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                    {isRTL ? "تنفيذ التحويل" : "Execute Transfer"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRTL ? "بحث برقم التحويل، الحساب، أو المرجع..." : "Search transfers..."}
              className="ps-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
                <tr className="border-b bg-muted/30 text-muted-foreground text-xs font-semibold">
                  <th className="text-start py-3 px-4">{isRTL ? "رقم التحويل" : "Transfer #"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "التاريخ" : "Date"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "من حساب" : "From Account"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "إلى حساب" : "To Account"}</th>
                  <th className="text-end py-3 px-4">{isRTL ? "المبلغ المحول" : "Amount Out"}</th>
                  <th className="text-end py-3 px-4">{isRTL ? "المبلغ المستلم" : "Amount In"}</th>
                  <th className="text-center py-3 px-4">{isRTL ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                      <span>{isRTL ? "جارٍ تحميل التحويلات..." : "Loading transfers..."}</span>
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((tr) => {
                    const fromA = tr.from_account as any;
                    const toA = tr.to_account as any;
                    return (
                      <tr key={tr.id} className="hover:bg-muted/40 transition">
                        <td className="py-3 px-4 font-mono font-medium text-xs">{tr.number}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{tr.transfer_date}</td>
                        <td className="py-3 px-4 font-medium text-destructive">
                          {fromA?.name || "—"}
                        </td>
                        <td className="py-3 px-4 font-medium text-emerald-600 dark:text-emerald-400">
                          {toA?.name || "—"}
                        </td>
                        <td className="py-3 px-4 text-end font-semibold">
                          {formatMoney(Number(tr.amount))} {fromA?.currency_code}
                        </td>
                        <td className="py-3 px-4 text-end font-semibold">
                          {formatMoney(Number(tr.to_amount))} {toA?.currency_code}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600">
                            {tr.status === "posted" ? (isRTL ? "مرحّل" : "Posted") : tr.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      {isRTL ? "لا توجد تحويلات مسجلة" : "No transfers recorded"}
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
