import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Receipt, Plus, Search, CheckCircle2, Ban, Loader2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/app/sales-invoices")({
  component: SalesInvoicesPage,
});

function SalesInvoicesPage() {
  const { tenant, hasPerm } = useTenant();
  const { isRTL } = useTranslation();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");

  // Query Invoices
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["sales_invoices", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("sales_invoices")
        .select(`
          id, number, invoice_date, due_date, currency_code, status, subtotal, discount_total, tax_total, total, amount_paid, amount_credited, notes,
          parties ( id, name, code )
        `)
        .eq("tenant_id", tenant.id)
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Post Invoice Mutation
  const postMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("post_sales_invoice", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم ترحيل الفاتورة وتوليد القيد المحاسبي بنجاح" : "Invoice posted successfully");
      queryClient.invalidateQueries({ queryKey: ["sales_invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_summary"] });
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل ترحيل الفاتورة" : "Failed to post invoice"));
    },
  });

  // Void Invoice Mutation
  const voidMutation = useMutation({
    mutationFn: async () => {
      if (!selectedInvoiceId || !voidReason) throw new Error("Missing reason or invoice");
      const { error } = await supabase.rpc("void_sales_invoice", {
        _id: selectedInvoiceId,
        _reason: voidReason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم إلغاء الفاتورة وعكس القيد المحاسبي" : "Invoice voided successfully");
      queryClient.invalidateQueries({ queryKey: ["sales_invoices"] });
      setVoidDialogOpen(false);
      setVoidReason("");
      setSelectedInvoiceId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل إلغاء الفاتورة" : "Failed to void invoice"));
    },
  });

  const filtered = invoices.filter((inv) => {
    const partyName = (inv.parties as any)?.name || "";
    const matchesSearch =
      (inv.number && inv.number.toLowerCase().includes(search.toLowerCase())) ||
      partyName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatMoney = (val?: number) => {
    return new Intl.NumberFormat(isRTL ? "ar-SD" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "posted":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">{isRTL ? "مرحّلة" : "Posted"}</span>;
      case "paid":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{isRTL ? "مدفوعة بالكامل" : "Paid"}</span>;
      case "partially_paid":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">{isRTL ? "مدفوعة جزئياً" : "Partially Paid"}</span>;
      case "draft":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400">{isRTL ? "مسودة" : "Draft"}</span>;
      case "void":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400">{isRTL ? "ملغاة" : "Void"}</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            <span>{isRTL ? "فواتير المبيعات" : "Sales Invoices"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "إنشاء وترحيل فواتير المبيعات، ومتابعة سداد العملاء والمخزون"
              : "Create, post, and track sales invoices and customer payments"}
          </p>
        </div>

        <Link to="/app/sales-invoices_.new">
          <Button className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            <span>{isRTL ? "فاتورة مبيعات جديدة" : "New Sales Invoice"}</span>
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRTL ? "بحث برقم الفاتورة أو اسم العميل..." : "Search by invoice # or customer..."}
              className="ps-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {["all", "draft", "posted", "partially_paid", "paid", "void"].map((st) => (
              <Button
                key={st}
                variant={statusFilter === st ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(st)}
                className="text-xs h-8 capitalize shrink-0"
              >
                {st === "all"
                  ? isRTL ? "الكل" : "All"
                  : st === "draft"
                  ? isRTL ? "مسودات" : "Draft"
                  : st === "posted"
                  ? isRTL ? "مرحّلة" : "Posted"
                  : st === "partially_paid"
                  ? isRTL ? "جزئي" : "Partial"
                  : st === "paid"
                  ? isRTL ? "مدفوعة" : "Paid"
                  : isRTL ? "ملغاة" : "Void"}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground text-xs font-semibold">
                  <th className="text-start py-3 px-4">{isRTL ? "رقم الفاتورة" : "Invoice #"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "العميل" : "Customer"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "تاريخ الإصدار" : "Date"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "الاستحقاق" : "Due Date"}</th>
                  <th className="text-end py-3 px-4">{isRTL ? "الإجمالي" : "Total"}</th>
                  <th className="text-end py-3 px-4">{isRTL ? "المدفوع" : "Paid"}</th>
                  <th className="text-center py-3 px-4">{isRTL ? "الحالة" : "Status"}</th>
                  <th className="text-center py-3 px-4">{isRTL ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                      <span>{isRTL ? "جارٍ تحميل الفواتير..." : "Loading invoices..."}</span>
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((inv) => {
                    const party = inv.parties as any;
                    return (
                      <tr key={inv.id} className="hover:bg-muted/40 transition">
                        <td className="py-3 px-4 font-mono font-medium text-xs text-foreground">
                          {inv.number || "— (مسودة)"}
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {party?.name || "—"}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{inv.invoice_date}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{inv.due_date}</td>
                        <td className="py-3 px-4 text-end font-bold text-foreground">
                          {formatMoney(Number(inv.total))} {inv.currency_code}
                        </td>
                        <td className="py-3 px-4 text-end text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          {formatMoney(Number(inv.amount_paid))} {inv.currency_code}
                        </td>
                        <td className="py-3 px-4 text-center">{getStatusBadge(inv.status)}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {inv.status === "draft" && hasPerm("sales.post") && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
                                onClick={() => postMutation.mutate(inv.id)}
                                disabled={postMutation.isPending}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>{isRTL ? "ترحيل" : "Post"}</span>
                              </Button>
                            )}

                            {inv.status === "posted" && Number(inv.amount_paid) === 0 && hasPerm("sales.post") && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setSelectedInvoiceId(inv.id);
                                  setVoidDialogOpen(true);
                                }}
                              >
                                <Ban className="h-3 w-3 me-1" />
                                <span>{isRTL ? "إلغاء" : "Void"}</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      {isRTL ? "لا توجد فواتير مبيعات مطابقة" : "No sales invoices found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Void Reason Dialog */}
      <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRTL ? "إلغاء فاتورة المبيعات" : "Void Sales Invoice"}</DialogTitle>
            <DialogDescription>
              {isRTL
                ? "سيتم إلغاء الفاتورة وعكس القيود المحاسبية وحركة المخزون الناتجة عنها بالكامل."
                : "This will reverse all journal entries and stock movements associated with this invoice."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="v-reason">{isRTL ? "سبب الإلغاء *" : "Void Reason *"}</Label>
            <Input
              id="v-reason"
              placeholder={isRTL ? "أدخل سبب إلغاء الفاتورة..." : "Enter reason for voiding..."}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidDialogOpen(false)}>
              {isRTL ? "رجوع" : "Cancel"}
            </Button>
            <Button
              variant="destructive"
              disabled={!voidReason || voidMutation.isPending}
              onClick={() => voidMutation.mutate()}
            >
              {voidMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {isRTL ? "تأكيد الإلغاء" : "Confirm Void"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
