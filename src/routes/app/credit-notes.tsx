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
import { FileX, Plus, Search, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/credit-notes")({
  component: CreditNotesPage,
});

function CreditNotesPage() {
  const { tenant, hasPerm } = useTenant();
  const { isRTL } = useTranslation();
  const queryClient = useQueryClient();

  const [kindFilter, setKindFilter] = useState<"all" | "sales" | "purchase">("all");
  const [search, setSearch] = useState("");
  const [openDialog, setOpenDialog] = useState(false);

  // Form states
  const [kind, setKind] = useState<"sales" | "purchase">("sales");
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [noteDate, setNoteDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Query Credit Notes
  const { data: creditNotes = [], isLoading } = useQuery({
    queryKey: ["credit_notes", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("credit_notes")
        .select(`
          id, number, kind, note_date, amount, total, currency_code, reason, status,
          parties ( id, name, code )
        `)
        .eq("tenant_id", tenant.id)
        .order("note_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Query eligible posted invoices for credit note
  const { data: eligibleInvoices = [] } = useQuery({
    queryKey: ["eligible_invoices_for_cn", tenant?.id, kind],
    queryFn: async () => {
      if (!tenant?.id) return [];
      if (kind === "sales") {
        const { data } = await supabase
          .from("sales_invoices")
          .select("id, number, invoice_date, total, amount_paid, amount_credited, currency_code")
          .eq("tenant_id", tenant.id)
          .eq("kind", "standard")
          .in("status", ["posted", "partially_paid", "paid"]);
        return data || [];
      } else {
        const { data } = await supabase
          .from("purchase_invoices")
          .select("id, number, invoice_date, total, amount_paid, amount_credited, currency_code")
          .eq("tenant_id", tenant.id)
          .eq("kind", "standard")
          .in("status", ["posted", "partially_paid", "paid"]);
        return data || [];
      }
    },
    enabled: !!tenant?.id,
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");
      if (!invoiceId) throw new Error(isRTL ? "يرجى اختيار الفاتورة" : "Select invoice");
      if (!amount || parseFloat(amount) <= 0) throw new Error(isRTL ? "المبلغ غير صالح" : "Invalid amount");
      if (!reason) throw new Error(isRTL ? "سبب الإشعار مطلوب" : "Reason required");

      const payload = {
        tenant_id: tenant.id,
        kind,
        invoice_id: invoiceId,
        amount: parseFloat(amount),
        tax_amount: 0,
        reason,
        note_date: noteDate,
      };

      const { data, error } = await supabase.rpc("create_credit_note", { _p: payload });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم إنشاء الإشعار الدائن وترحيله للدفاتر" : "Credit note created & posted");
      queryClient.invalidateQueries({ queryKey: ["credit_notes"] });
      queryClient.invalidateQueries({ queryKey: ["sales_invoices"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_summary"] });
      setOpenDialog(false);
      setAmount("");
      setReason("");
      setInvoiceId("");
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل إنشاء الإشعار" : "Failed to create credit note"));
    },
  });

  const filtered = creditNotes.filter((cn) => {
    const matchesKind = kindFilter === "all" || cn.kind === kindFilter;
    const partyName = (cn.parties as any)?.name || "";
    const matchesSearch =
      (cn.number && cn.number.toLowerCase().includes(search.toLowerCase())) ||
      (cn.reason && cn.reason.toLowerCase().includes(search.toLowerCase())) ||
      partyName.toLowerCase().includes(search.toLowerCase());
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
            <FileX className="h-6 w-6 text-primary" />
            <span>{isRTL ? "الإشعارات الدائنة (مردودات وخصومات)" : "Credit Notes"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "تسجيل مردودات المبيعات والمشتريات وتخفيض مديونية العملاء والموردين"
              : "Record sales and purchase returns and adjustments"}
          </p>
        </div>

        {hasPerm("sales.post") && (
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                <span>{isRTL ? "إشعار دائن جديد" : "New Credit Note"}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{isRTL ? "إنشاء إشعار دائن جديد" : "New Credit Note"}</DialogTitle>
                <DialogDescription>
                  {isRTL ? "اختر الفاتورة المرتبطة وحدد قيمة الإشعار وسببه" : "Link to invoice and enter amount"}
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
                    <Label>{isRTL ? "نوع الإشعار *" : "Kind *"}</Label>
                    <Select
                      value={kind}
                      onValueChange={(v: any) => {
                        setKind(v);
                        setInvoiceId("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales">{isRTL ? "إشعار مبيعات (لعميل)" : "Sales (Customer)"}</SelectItem>
                        <SelectItem value="purchase">{isRTL ? "إشعار مشتريات (لمورد)" : "Purchase (Supplier)"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cn-date">{isRTL ? "التاريخ *" : "Date *"}</Label>
                    <Input
                      id="cn-date"
                      type="date"
                      value={noteDate}
                      onChange={(e) => setNoteDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{isRTL ? "الفاتورة الأصلية *" : "Original Invoice *"}</Label>
                  <Select value={invoiceId} onValueChange={setInvoiceId}>
                    <SelectTrigger>
                      <SelectValue placeholder={isRTL ? "اختر الفاتورة..." : "Select invoice..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleInvoices.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.number || "Invoice"} · {formatMoney(Number(inv.total))} {inv.currency_code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cn-amt">{isRTL ? "قيمة الإشعار *" : "Amount *"}</Label>
                  <Input
                    id="cn-amt"
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
                  <Label htmlFor="cn-reason">{isRTL ? "السبب / البيان *" : "Reason *"}</Label>
                  <Input
                    id="cn-reason"
                    placeholder={isRTL ? "مثال: مردودات بضاعة تالفة مقاس 58..." : "e.g. Returned damaged item"}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                    {isRTL ? "إلغاء" : "Cancel"}
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || !invoiceId}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                    {isRTL ? "حفظ وترحيل الإشعار" : "Post Credit Note"}
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
              placeholder={isRTL ? "بحث برقم الإشعار أو الطرف أو السبب..." : "Search credit notes..."}
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
              variant={kindFilter === "sales" ? "default" : "outline"}
              size="sm"
              onClick={() => setKindFilter("sales")}
              className="text-xs h-8"
            >
              {isRTL ? "إشعارات مبيعات" : "Sales Notes"}
            </Button>
            <Button
              variant={kindFilter === "purchase" ? "default" : "outline"}
              size="sm"
              onClick={() => setKindFilter("purchase")}
              className="text-xs h-8"
            >
              {isRTL ? "إشعارات مشتريات" : "Purchase Notes"}
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
                  <th className="text-start py-3 px-4">{isRTL ? "رقم الإشعار" : "Note #"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "التاريخ" : "Date"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "النوع" : "Kind"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "الطرف" : "Party"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "السبب" : "Reason"}</th>
                  <th className="text-end py-3 px-4">{isRTL ? "المبلغ" : "Amount"}</th>
                  <th className="text-center py-3 px-4">{isRTL ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                      <span>{isRTL ? "جارٍ تحميل الإشعارات..." : "Loading credit notes..."}</span>
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((cn) => {
                    const party = cn.parties as any;
                    return (
                      <tr key={cn.id} className="hover:bg-muted/40 transition">
                        <td className="py-3 px-4 font-mono font-medium text-xs">{cn.number}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{cn.note_date}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-muted">
                            {cn.kind === "sales" ? (isRTL ? "مبيعات" : "Sales") : isRTL ? "مشتريات" : "Purchase"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">{party?.name || "—"}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs truncate">{cn.reason}</td>
                        <td className="py-3 px-4 text-end font-bold text-foreground">
                          {formatMoney(Number(cn.total))} {cn.currency_code}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600">
                            {cn.status === "posted" ? (isRTL ? "مرحّل" : "Posted") : cn.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      {isRTL ? "لا توجد إشعارات دائنة مسجلة" : "No credit notes recorded"}
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
