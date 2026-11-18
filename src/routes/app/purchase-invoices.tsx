import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { DEMO_PURCHASE_INVOICES, type DemoPurchaseInvoice } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ShoppingCart,
  Plus,
  Search,
  CheckCircle2,
  Loader2,
  Eye,
  Printer,
  Trash2,
  DollarSign,
  Clock,
  CheckCircle,
  FileText,
  Building2,
  GitBranch,
} from "lucide-react";

export const Route = createFileRoute("/app/purchase-invoices")({
  component: PurchaseInvoicesPage,
});

function PurchaseInvoicesPage() {
  const { tenant, branches, hasPerm } = useTenant();
  const { isDemoMode } = useAuth();
  const { isRTL } = useTranslation();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [activeBill, setActiveBill] = useState<any | null>(null);

  const [localDemoBills, setLocalDemoBills] = useState<DemoPurchaseInvoice[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("finora_custom_purchase_invoices");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return DEMO_PURCHASE_INVOICES;
        }
      }
    }
    return DEMO_PURCHASE_INVOICES;
  });

  // Query Purchase Invoices from Supabase
  const { data: dbInvoices = [], isLoading } = useQuery({
    queryKey: ["purchase_invoices", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("purchase_invoices")
        .select(`
          id, number, supplier_reference, invoice_date, due_date, currency_code, status, subtotal, discount_total, tax_total, total, amount_paid, amount_credited, notes,
          parties:supplier_id ( id, name, code, phone, tax_number ),
          branches:branch_id ( id, name, code ),
          warehouses:warehouse_id ( id, name, code ),
          purchase_invoice_items (
            id, line_no, description, quantity, unit_price, discount_pct, line_total,
            products:product_id ( id, name, sku )
          )
        `)
        .eq("tenant_id", tenant.id)
        .order("invoice_date", { ascending: false });

      if (error) {
        const { data: simpleData, error: simpleErr } = await supabase
          .from("purchase_invoices")
          .select(`
            id, number, supplier_reference, invoice_date, due_date, currency_code, status, subtotal, discount_total, tax_total, total, amount_paid, amount_credited, notes,
            parties ( id, name, code )
          `)
          .eq("tenant_id", tenant.id)
          .order("invoice_date", { ascending: false });

        if (simpleErr) throw simpleErr;
        return simpleData || [];
      }
      return data || [];
    },
    enabled: !!tenant?.id && !isDemoMode,
  });

  // Merge demo bills
  const allBills = useMemo(() => {
    if (isDemoMode || (dbInvoices.length === 0 && !isLoading)) {
      return localDemoBills;
    }
    return dbInvoices;
  }, [isDemoMode, dbInvoices, isLoading, localDemoBills]);

  // Post Mutation
  const postMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        const updated = localDemoBills.map((b) =>
          b.id === id ? { ...b, status: "posted" as const, number: b.number || `BILL-0000${Math.floor(Math.random() * 900) + 100}` } : b
        );
        setLocalDemoBills(updated);
        if (typeof window !== "undefined") {
          localStorage.setItem("finora_custom_purchase_invoices", JSON.stringify(updated));
        }
        return;
      }
      const { error } = await supabase.rpc("post_purchase_invoice", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم ترحيل فاتورة المشتريات وإثبات الاستحقاق وتحديث المخزون بنجاح" : "Purchase bill posted successfully");
      queryClient.invalidateQueries({ queryKey: ["purchase_invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_summary"] });
      if (activeBill) {
        setActiveBill((prev: any) => (prev ? { ...prev, status: "posted" } : null));
      }
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل ترحيل الفاتورة" : "Failed to post bill"));
    },
  });

  // Delete Draft Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        const updated = localDemoBills.filter((b) => b.id !== id);
        setLocalDemoBills(updated);
        if (typeof window !== "undefined") {
          localStorage.setItem("finora_custom_purchase_invoices", JSON.stringify(updated));
        }
        return;
      }
      const { error } = await supabase.rpc("delete_purchase_invoice", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم حذف مسودة الفاتورة بنجاح" : "Draft bill deleted");
      queryClient.invalidateQueries({ queryKey: ["purchase_invoices"] });
      setViewDialogOpen(false);
      setActiveBill(null);
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل حذف الفاتورة" : "Failed to delete bill"));
    },
  });

  const filtered = useMemo(() => {
    return allBills.filter((inv: any) => {
      const party = inv.parties || inv.party || {};
      const partyName = inv.supplier_name || party.name || "";
      const num = inv.number || "";
      const ref = inv.supplier_reference || "";

      const matchesSearch =
        !search.trim() ||
        num.toLowerCase().includes(search.toLowerCase()) ||
        ref.toLowerCase().includes(search.toLowerCase()) ||
        partyName.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" || inv.status === statusFilter;

      const matchesBranch =
        branchFilter === "all" ||
        inv.branch_id === branchFilter ||
        (inv.branches && inv.branches.id === branchFilter);

      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [allBills, search, statusFilter, branchFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalPurchases = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;
    let draftsCount = 0;

    allBills.forEach((b: any) => {
      if (b.status !== "void") {
        const tot = Number(b.total) || 0;
        const paid = Number(b.amount_paid) || 0;
        totalPurchases += tot;
        totalPaid += paid;
        if (b.status === "posted" || b.status === "partially_paid") {
          totalUnpaid += Math.max(0, tot - paid);
        }
        if (b.status === "draft") {
          draftsCount++;
        }
      }
    });

    return { totalPurchases, totalPaid, totalUnpaid, draftsCount };
  }, [allBills]);

  const formatMoney = (val?: number) => {
    return new Intl.NumberFormat(isRTL ? "ar-SD" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "posted":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">{isRTL ? "مرحّلة" : "Posted"}</span>;
      case "paid":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">{isRTL ? "مدفوعة بالكامل" : "Paid"}</span>;
      case "partially_paid":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">{isRTL ? "مدفوعة جزئياً" : "Partially Paid"}</span>;
      case "draft":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">{isRTL ? "مسودة" : "Draft"}</span>;
      case "void":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">{isRTL ? "ملغاة" : "Void"}</span>;
      default:
        return <span className="text-xs">{status}</span>;
    }
  };

  const openBillDetails = (bill: any) => {
    setActiveBill(bill);
    setViewDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <span>{isRTL ? "فواتير المشتريات" : "Purchase Bills"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "تسجيل مشتريات البضائع والخدمات وتحديث متوسط التكلفة وحركات المخزون والموردين"
              : "Record purchases, update inventory WAC cost, and manage supplier payables"}
          </p>
        </div>

        <Link to="/app/purchase-invoices/new">
          <Button className="gap-2 shadow-sm font-semibold">
            <Plus className="h-4 w-4" />
            <span>{isRTL ? "فاتورة مشتريات جديدة" : "New Purchase Bill"}</span>
          </Button>
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{isRTL ? "إجمالي المشتريات" : "Total Purchases"}</p>
              <h3 className="text-lg font-bold text-foreground mt-1">
                {formatMoney(metrics.totalPurchases)} <span className="text-xs font-normal text-muted-foreground">SDG</span>
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{isRTL ? "مستحقات للموردين" : "Payables"}</p>
              <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">
                {formatMoney(metrics.totalUnpaid)} <span className="text-xs font-normal text-muted-foreground">SDG</span>
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{isRTL ? "المبالغ المسددة" : "Paid to Suppliers"}</p>
              <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatMoney(metrics.totalPaid)} <span className="text-xs font-normal text-muted-foreground">SDG</span>
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{isRTL ? "مسودات المشتريات" : "Draft Bills"}</p>
              <h3 className="text-lg font-bold text-foreground mt-1">
                {metrics.draftsCount} <span className="text-xs font-normal text-muted-foreground">{isRTL ? "فاتورة" : "bills"}</span>
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isRTL ? "بحث برقم الفاتورة، مرجع المورد أو اسمه..." : "Search bills..."}
                className="ps-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {branches.length > 1 && (
              <select
                aria-label={isRTL ? "تصفية حسب الفرع" : "Filter by branch"}
                className="h-10 px-3 py-1 rounded-md border border-input bg-background text-xs w-full sm:w-48"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="all">{isRTL ? "كافة الفروع" : "All Branches"}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
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

      {/* Purchase Invoices Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground text-xs font-semibold">
                  <th className="text-start py-3 px-4">{isRTL ? "رقم الفاتورة" : "Bill #"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "مرجع المورد" : "Supplier Ref"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "المورد" : "Supplier"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "الفرع" : "Branch"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "تاريخ الفاتورة" : "Date"}</th>
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
                    <td colSpan={10} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                      <span>{isRTL ? "جارٍ تحميل فواتير المشتريات..." : "Loading bills..."}</span>
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((inv: any) => {
                    const party = inv.parties || inv.party || {};
                    const supplierName = inv.supplier_name || party.name || "—";
                    const branchName = inv.branch_name || inv.branches?.name || "الفرع الرئيسي";

                    return (
                      <tr key={inv.id} className="hover:bg-muted/40 transition">
                        <td className="py-3 px-4 font-mono font-medium text-xs text-foreground">
                          <button
                            type="button"
                            onClick={() => openBillDetails(inv)}
                            className="font-bold text-primary hover:underline"
                          >
                            {inv.number || "— (مسودة)"}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                          {inv.supplier_reference || "—"}
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">
                          <div className="flex flex-col">
                            <span>{supplierName}</span>
                            {party.code && (
                              <span className="text-[11px] text-muted-foreground font-mono">{party.code}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <GitBranch className="h-3 w-3 text-muted-foreground" />
                            {branchName}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{inv.invoice_date}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{inv.due_date}</td>
                        <td className="py-3 px-4 text-end font-bold text-foreground">
                          {formatMoney(Number(inv.total))} {inv.currency_code || "SDG"}
                        </td>
                        <td className="py-3 px-4 text-end text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatMoney(Number(inv.amount_paid))} {inv.currency_code || "SDG"}
                        </td>
                        <td className="py-3 px-4 text-center">{getStatusBadge(inv.status)}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* View Button */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => openBillDetails(inv)}
                              title={isRTL ? "عرض تفاصيل الفاتورة" : "View Bill"}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>

                            {/* Post Button for draft */}
                            {inv.status === "draft" && hasPerm("purchases.post") && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 border-blue-500/30 text-blue-600 hover:bg-blue-500/10 px-2"
                                onClick={() => postMutation.mutate(inv.id)}
                                disabled={postMutation.isPending}
                                title={isRTL ? "ترحيل الفاتورة وإدخال المخزن" : "Post Bill"}
                              >
                                {postMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3 w-3" />
                                )}
                                <span>{isRTL ? "ترحيل" : "Post"}</span>
                              </Button>
                            )}

                            {/* Delete Draft Button */}
                            {inv.status === "draft" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                                onClick={() => deleteMutation.mutate(inv.id)}
                                disabled={deleteMutation.isPending}
                                title={isRTL ? "حذف المسودة" : "Delete Draft"}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-muted-foreground">
                      <div className="max-w-md mx-auto space-y-3">
                        <ShoppingCart className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                        <h4 className="font-bold text-foreground">
                          {isRTL ? "لا توجد فواتير مشتريات مطابقة" : "No purchase bills found"}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {isRTL
                            ? "يمكنك تسجيل فاتورة مشتريات جديدة الآن لتغذية أرصدة المخازن"
                            : "Create purchase bills to replenish warehouse stock"}
                        </p>
                        <div className="pt-2 flex justify-center gap-2">
                          <Link to="/app/purchase-invoices/new">
                            <Button size="sm" className="gap-1.5">
                              <Plus className="h-3.5 w-3.5" />
                              <span>{isRTL ? "فاتورة مشتريات جديدة" : "New Bill"}</span>
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bill Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {activeBill && (
            <div className="space-y-6 print:p-6">
              {/* Bill Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl shadow">
                    F
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{tenant?.name || "شركة النيل للتجارة والاستثمار"}</h2>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? "فاتورة توريد ومشتريات تجارية" : "Purchase Bill Voucher"}
                    </p>
                  </div>
                </div>

                <div className="text-start sm:text-end space-y-1">
                  <div className="flex items-center sm:justify-end gap-2">
                    <span className="font-mono font-bold text-base text-primary">
                      {activeBill.number || "مسودة (Draft)"}
                    </span>
                    {getStatusBadge(activeBill.status)}
                  </div>
                  {activeBill.supplier_reference && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {isRTL ? "مرجع المورد:" : "Ref:"} {activeBill.supplier_reference}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? "تاريخ الفاتورة:" : "Date:"} {activeBill.invoice_date}
                  </p>
                </div>
              </div>

              {/* Supplier & Warehouse Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 text-xs">
                <div>
                  <h4 className="font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    <span>{isRTL ? "بيانات المورد:" : "Supplier Details:"}</span>
                  </h4>
                  <p className="font-semibold text-foreground text-sm">
                    {activeBill.supplier_name || activeBill.parties?.name || "مورد عام"}
                  </p>
                  {activeBill.parties?.phone && (
                    <p className="text-muted-foreground mt-0.5">{activeBill.parties.phone}</p>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                    <GitBranch className="h-3.5 w-3.5 text-primary" />
                    <span>{isRTL ? "المستودع المستلم:" : "Receiving Warehouse:"}</span>
                  </h4>
                  <p className="font-medium text-foreground">
                    {activeBill.warehouse_name || activeBill.warehouses?.name || "المستودع الرئيسي"}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                      <th className="py-2.5 px-3 text-start w-10">#</th>
                      <th className="py-2.5 px-3 text-start">{isRTL ? "الصنف / البيان" : "Item"}</th>
                      <th className="py-2.5 px-3 text-center w-20">{isRTL ? "الكمية" : "Qty"}</th>
                      <th className="py-2.5 px-3 text-end w-28">{isRTL ? "سعر الشراء" : "Cost Price"}</th>
                      <th className="py-2.5 px-3 text-end w-32">{isRTL ? "المجموع" : "Total"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(activeBill.items || activeBill.purchase_invoice_items || []).map((it: any, idx: number) => {
                      const desc = it.description || it.product_name || it.products?.name || "بند مشتريات";
                      const qty = Number(it.quantity) || 1;
                      const price = Number(it.unit_price) || 0;
                      const lineTot = Number(it.line_total) || qty * price;

                      return (
                        <tr key={it.id || idx}>
                          <td className="py-2.5 px-3 text-muted-foreground font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-medium text-foreground">{desc}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-semibold">{qty}</td>
                          <td className="py-2.5 px-3 text-end font-mono">{formatMoney(price)}</td>
                          <td className="py-2.5 px-3 text-end font-mono font-bold text-foreground">
                            {formatMoney(lineTot)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="space-y-2 text-xs text-muted-foreground max-w-sm">
                  {activeBill.notes && (
                    <p>
                      <strong className="text-foreground">{isRTL ? "ملاحظات:" : "Notes:"}</strong> {activeBill.notes}
                    </p>
                  )}
                </div>

                <div className="w-full sm:w-64 p-3.5 rounded-xl bg-muted/40 space-y-2 text-xs">
                  <div className="flex justify-between font-bold text-sm text-foreground">
                    <span>{isRTL ? "إجمالي الفاتورة:" : "Total Bill:"}</span>
                    <span className="text-primary">{formatMoney(Number(activeBill.total))} SDG</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>{isRTL ? "المسدد للمورد:" : "Paid:"}</span>
                    <span>{formatMoney(Number(activeBill.amount_paid))} SDG</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t pt-4">
                <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 text-xs">
                  <Printer className="h-4 w-4" />
                  <span>{isRTL ? "طباعة" : "Print"}</span>
                </Button>

                <div className="flex items-center gap-2">
                  {activeBill.status === "draft" && hasPerm("purchases.post") && (
                    <Button
                      size="sm"
                      onClick={() => postMutation.mutate(activeBill.id)}
                      disabled={postMutation.isPending}
                      className="gap-1.5 text-xs font-semibold shadow-sm"
                    >
                      {postMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      <span>{isRTL ? "ترحيل الفاتورة الآن" : "Post Bill"}</span>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>
                    {isRTL ? "إغلاق" : "Close"}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
