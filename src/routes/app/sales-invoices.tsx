import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { DEMO_SALES_INVOICES, type DemoSalesInvoice } from "@/lib/demo-data";
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
import {
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  Ban,
  Loader2,
  Eye,
  Printer,
  Trash2,
  Building2,
  Sparkles,
  DollarSign,
  Clock,
  CheckCircle,
  FileText,
  CreditCard,
  GitBranch,
} from "lucide-react";

export const Route = createFileRoute("/app/sales-invoices")({
  component: SalesInvoicesPage,
});

function SalesInvoicesPage() {
  const { tenant, branches, currentBranch, hasPerm } = useTenant();
  const { isDemoMode } = useAuth();
  const { isRTL } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");

  // Dialogs
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<any | null>(null);

  const [localDemoInvoices, setLocalDemoInvoices] = useState<DemoSalesInvoice[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("finora_custom_sales_invoices");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return DEMO_SALES_INVOICES;
        }
      }
    }
    return DEMO_SALES_INVOICES;
  });

  // Query Invoices from Supabase
  const { data: dbInvoices = [], isLoading, error: queryError } = useQuery({
    queryKey: ["sales_invoices", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("sales_invoices")
        .select(`
          id, number, invoice_date, due_date, currency_code, status, subtotal, discount_total, tax_total, total, amount_paid, amount_credited, notes, terms,
          parties:customer_id ( id, name, code, phone, tax_number ),
          branches:branch_id ( id, name, code ),
          warehouses:warehouse_id ( id, name, code ),
          sales_invoice_items (
            id, line_no, description, quantity, unit_price, discount_pct, line_total,
            products:product_id ( id, name, sku )
          )
        `)
        .eq("tenant_id", tenant.id)
        .order("invoice_date", { ascending: false });

      if (error) {
        // Fallback query if nested joins fail
        const { data: simpleData, error: simpleErr } = await supabase
          .from("sales_invoices")
          .select(`
            id, number, invoice_date, due_date, currency_code, status, subtotal, discount_total, tax_total, total, amount_paid, amount_credited, notes,
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

  // Merge: if in demo mode or db is empty, display demo invoices
  const allInvoices = useMemo(() => {
    if (isDemoMode || (dbInvoices.length === 0 && !isLoading)) {
      return localDemoInvoices;
    }
    return dbInvoices;
  }, [isDemoMode, dbInvoices, isLoading, localDemoInvoices]);

  // Post Invoice Mutation
  const postMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        // Update in demo state
        const updated = localDemoInvoices.map((inv) =>
          inv.id === id ? { ...inv, status: "posted" as const, number: inv.number || `INV-0000${Math.floor(Math.random() * 900) + 100}` } : inv
        );
        setLocalDemoInvoices(updated);
        if (typeof window !== "undefined") {
          localStorage.setItem("finora_custom_sales_invoices", JSON.stringify(updated));
        }
        return;
      }
      const { error } = await supabase.rpc("post_sales_invoice", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم ترحيل الفاتورة وتوليد القيد المحاسبي وحركة المخزون بنجاح!" : "Invoice posted successfully!");
      queryClient.invalidateQueries({ queryKey: ["sales_invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_summary"] });
      if (activeInvoice) {
        setActiveInvoice((prev: any) => (prev ? { ...prev, status: "posted" } : null));
      }
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل ترحيل الفاتورة" : "Failed to post invoice"));
    },
  });

  // Void Invoice Mutation
  const voidMutation = useMutation({
    mutationFn: async () => {
      if (!selectedInvoiceId || !voidReason.trim()) throw new Error("Missing reason or invoice");
      if (isDemoMode) {
        const updated = localDemoInvoices.map((inv) =>
          inv.id === selectedInvoiceId ? { ...inv, status: "void" as const, notes: `${inv.notes || ""} [ملغاة: ${voidReason}]` } : inv
        );
        setLocalDemoInvoices(updated);
        if (typeof window !== "undefined") {
          localStorage.setItem("finora_custom_sales_invoices", JSON.stringify(updated));
        }
        return;
      }
      const { error } = await supabase.rpc("void_sales_invoice", {
        _id: selectedInvoiceId,
        _reason: voidReason.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم إلغاء الفاتورة وعكس القيود بنجاح" : "Invoice voided successfully");
      queryClient.invalidateQueries({ queryKey: ["sales_invoices"] });
      setVoidDialogOpen(false);
      setVoidReason("");
      setSelectedInvoiceId(null);
      if (activeInvoice) {
        setActiveInvoice((prev: any) => (prev ? { ...prev, status: "void" } : null));
      }
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل إلغاء الفاتورة" : "Failed to void invoice"));
    },
  });

  // Delete Draft Invoice Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        const updated = localDemoInvoices.filter((inv) => inv.id !== id);
        setLocalDemoInvoices(updated);
        if (typeof window !== "undefined") {
          localStorage.setItem("finora_custom_sales_invoices", JSON.stringify(updated));
        }
        return;
      }
      const { error } = await supabase.rpc("delete_sales_invoice", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم حذف مسودة الفاتورة بنجاح" : "Draft invoice deleted");
      queryClient.invalidateQueries({ queryKey: ["sales_invoices"] });
      setViewDialogOpen(false);
      setActiveInvoice(null);
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل حذف الفاتورة" : "Failed to delete invoice"));
    },
  });

  // Filter invoices
  const filtered = useMemo(() => {
    return allInvoices.filter((inv: any) => {
      const party = inv.parties || inv.party || {};
      const customerName = inv.customer_name || party.name || "";
      const invNum = inv.number || "";

      const matchesSearch =
        !search.trim() ||
        invNum.toLowerCase().includes(search.toLowerCase()) ||
        customerName.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" || inv.status === statusFilter;

      const matchesBranch =
        branchFilter === "all" ||
        inv.branch_id === branchFilter ||
        (inv.branches && inv.branches.id === branchFilter);

      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [allInvoices, search, statusFilter, branchFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalSales = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;
    let draftsCount = 0;

    allInvoices.forEach((inv: any) => {
      if (inv.status !== "void") {
        const tot = Number(inv.total) || 0;
        const paid = Number(inv.amount_paid) || 0;
        totalSales += tot;
        totalPaid += paid;
        if (inv.status === "posted" || inv.status === "partially_paid") {
          totalUnpaid += Math.max(0, tot - paid);
        }
        if (inv.status === "draft") {
          draftsCount++;
        }
      }
    });

    return { totalSales, totalPaid, totalUnpaid, draftsCount, totalCount: allInvoices.length };
  }, [allInvoices]);

  const formatMoney = (val?: number) => {
    return new Intl.NumberFormat(isRTL ? "ar-SD" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "posted":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            {isRTL ? "مرحّلة" : "Posted"}
          </span>
        );
      case "paid":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {isRTL ? "مدفوعة بالكامل" : "Paid"}
          </span>
        );
      case "partially_paid":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            {isRTL ? "مدفوعة جزئياً" : "Partially Paid"}
          </span>
        );
      case "draft":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            {isRTL ? "مسودة" : "Draft"}
          </span>
        );
      case "void":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            {isRTL ? "ملغاة" : "Void"}
          </span>
        );
      default:
        return <span className="text-xs">{status}</span>;
    }
  };

  const openInvoiceDetails = (invoice: any) => {
    setActiveInvoice(invoice);
    setViewDialogOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Receipt className="h-6 w-6" />
            </div>
            <span>{isRTL ? "فواتير المبيعات" : "Sales Invoices"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "إنشاء وترحيل فواتير المبيعات، ومتابعة سداد العملاء والمخزون في كافة الفروع"
              : "Create, post, and track sales invoices and customer balances across all branches"}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link to="/app/sales-invoices/new" className="w-full sm:w-auto">
            <Button className="gap-2 shadow-sm w-full sm:w-auto font-semibold">
              <Plus className="h-4 w-4" />
              <span>{isRTL ? "فاتورة مبيعات جديدة" : "New Sales Invoice"}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{isRTL ? "إجمالي المبيعات" : "Total Sales"}</p>
              <h3 className="text-lg font-bold text-foreground mt-1">
                {formatMoney(metrics.totalSales)} <span className="text-xs font-normal text-muted-foreground">SDG</span>
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
              <p className="text-xs font-medium text-muted-foreground">{isRTL ? "مستحقات غير محصلة" : "Uncollected"}</p>
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
              <p className="text-xs font-medium text-muted-foreground">{isRTL ? "المبالغ المحصلة" : "Collected"}</p>
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
              <p className="text-xs font-medium text-muted-foreground">{isRTL ? "مسودات بانتظار الترحيل" : "Drafts"}</p>
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
                placeholder={isRTL ? "بحث برقم الفاتورة أو اسم العميل..." : "Search by invoice # or customer..."}
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

      {/* Invoices Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground text-xs font-semibold">
                  <th className="text-start py-3 px-4">{isRTL ? "رقم الفاتورة" : "Invoice #"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "العميل" : "Customer"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "الفرع" : "Branch"}</th>
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
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                      <span>{isRTL ? "جارٍ تحميل الفواتير..." : "Loading invoices..."}</span>
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((inv: any) => {
                    const party = inv.parties || inv.party || {};
                    const customerName = inv.customer_name || party.name || "—";
                    const branchName = inv.branch_name || inv.branches?.name || "الفرع الرئيسي";

                    return (
                      <tr key={inv.id} className="hover:bg-muted/40 transition">
                        <td className="py-3 px-4 font-mono font-medium text-xs text-foreground">
                          <button
                            type="button"
                            onClick={() => openInvoiceDetails(inv)}
                            className="font-bold text-primary hover:underline flex items-center gap-1"
                          >
                            <span>{inv.number || "— (مسودة)"}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">
                          <div className="flex flex-col">
                            <span>{customerName}</span>
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
                              onClick={() => openInvoiceDetails(inv)}
                              title={isRTL ? "عرض وتفاصيل الفاتورة" : "View Invoice"}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>

                            {/* Post Button for draft */}
                            {inv.status === "draft" && hasPerm("sales.post") && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 border-blue-500/30 text-blue-600 hover:bg-blue-500/10 px-2"
                                onClick={() => postMutation.mutate(inv.id)}
                                disabled={postMutation.isPending}
                                title={isRTL ? "ترحيل الفاتورة وتوليد القيد" : "Post Invoice"}
                              >
                                {postMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3 w-3" />
                                )}
                                <span>{isRTL ? "ترحيل" : "Post"}</span>
                              </Button>
                            )}

                            {/* Record Payment Button for posted & partially paid */}
                            {(inv.status === "posted" || inv.status === "partially_paid") && (
                              <Link to="/app/payments">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 px-2"
                                  title={isRTL ? "سداد الفاتورة" : "Pay Invoice"}
                                >
                                  <CreditCard className="h-3 w-3" />
                                  <span>{isRTL ? "سداد" : "Pay"}</span>
                                </Button>
                              </Link>
                            )}

                            {/* Void Button */}
                            {inv.status === "posted" && Number(inv.amount_paid) === 0 && hasPerm("sales.post") && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setSelectedInvoiceId(inv.id);
                                  setVoidDialogOpen(true);
                                }}
                                title={isRTL ? "إلغاء الفاتورة" : "Void Invoice"}
                              >
                                <Ban className="h-3.5 w-3.5" />
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
                    <td colSpan={9} className="py-16 text-center text-muted-foreground">
                      <div className="max-w-md mx-auto space-y-3">
                        <Receipt className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                        <h4 className="font-bold text-foreground">
                          {isRTL ? "لا توجد فواتير مبيعات مطابقة" : "No sales invoices found"}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {isRTL
                            ? "يمكنك إنشاء فاتورة مبيعات جديدة الآن أو تجربة النظام بكامل البيانات"
                            : "Create your first sales invoice or use demo mode"}
                        </p>
                        <div className="pt-2 flex justify-center gap-2">
                          <Link to="/app/sales-invoices/new">
                            <Button size="sm" className="gap-1.5">
                              <Plus className="h-3.5 w-3.5" />
                              <span>{isRTL ? "إنشاء فاتورة جديدة" : "New Invoice"}</span>
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

      {/* Invoice Details & Print Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {activeInvoice && (
            <div className="space-y-6 print:p-6" id="printable-invoice">
              {/* Invoice Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl shadow">
                    F
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{tenant?.name || "شركة النيل للتجارة والاستثمار"}</h2>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? "فاتورة مبيعات ضريبية رسمية" : "Tax Sales Invoice"}
                    </p>
                    {tenant?.tax_number && (
                      <p className="text-[11px] text-muted-foreground">
                        {isRTL ? "الرقم الضريبي:" : "Tax ID:"} {tenant.tax_number}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-start sm:text-end space-y-1">
                  <div className="flex items-center sm:justify-end gap-2">
                    <span className="font-mono font-bold text-base text-primary">
                      {activeInvoice.number || "مسودة (Draft)"}
                    </span>
                    {getStatusBadge(activeInvoice.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? "تاريخ الإصدار:" : "Date:"} {activeInvoice.invoice_date}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? "تاريخ الاستحقاق:" : "Due Date:"} {activeInvoice.due_date}
                  </p>
                </div>
              </div>

              {/* Customer and Branch Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 text-xs">
                <div>
                  <h4 className="font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    <span>{isRTL ? "بيانات العميل:" : "Customer Details:"}</span>
                  </h4>
                  <p className="font-semibold text-foreground text-sm">
                    {activeInvoice.customer_name || activeInvoice.parties?.name || "عميل نقدي"}
                  </p>
                  {activeInvoice.parties?.phone && (
                    <p className="text-muted-foreground mt-0.5">{activeInvoice.parties.phone}</p>
                  )}
                  {activeInvoice.parties?.tax_number && (
                    <p className="text-muted-foreground">
                      {isRTL ? "الرقم الضريبي للعميل:" : "Tax ID:"} {activeInvoice.parties.tax_number}
                    </p>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                    <GitBranch className="h-3.5 w-3.5 text-primary" />
                    <span>{isRTL ? "فرع ومستودع الصرف:" : "Branch & Warehouse:"}</span>
                  </h4>
                  <p className="font-medium text-foreground">
                    {isRTL ? "الفرع:" : "Branch:"} {activeInvoice.branch_name || activeInvoice.branches?.name || "المركز الرئيسي"}
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    {isRTL ? "المستودع:" : "Warehouse:"} {activeInvoice.warehouse_name || activeInvoice.warehouses?.name || "المستودع المركزي"}
                  </p>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                      <th className="py-2.5 px-3 text-start w-10">#</th>
                      <th className="py-2.5 px-3 text-start">{isRTL ? "الصنف / البيان" : "Description"}</th>
                      <th className="py-2.5 px-3 text-center w-20">{isRTL ? "الكمية" : "Qty"}</th>
                      <th className="py-2.5 px-3 text-end w-28">{isRTL ? "سعر الوحدة" : "Unit Price"}</th>
                      <th className="py-2.5 px-3 text-end w-20">{isRTL ? "الخصم" : "Disc"}</th>
                      <th className="py-2.5 px-3 text-end w-32">{isRTL ? "المجموع" : "Total"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(activeInvoice.items || activeInvoice.sales_invoice_items || []).map((it: any, idx: number) => {
                      const desc = it.description || it.product_name || it.products?.name || "بند مبيعات";
                      const qty = Number(it.quantity) || 1;
                      const price = Number(it.unit_price) || 0;
                      const discPct = Number(it.discount_pct) || 0;
                      const lineTot = Number(it.line_total) || qty * price * (1 - discPct / 100);

                      return (
                        <tr key={it.id || idx}>
                          <td className="py-2.5 px-3 text-muted-foreground font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-medium text-foreground">{desc}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-semibold">{qty}</td>
                          <td className="py-2.5 px-3 text-end font-mono">{formatMoney(price)}</td>
                          <td className="py-2.5 px-3 text-end font-mono text-muted-foreground">
                            {discPct > 0 ? `${discPct}%` : "—"}
                          </td>
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
                  {activeInvoice.notes && (
                    <p>
                      <strong className="text-foreground">{isRTL ? "ملاحظات:" : "Notes:"}</strong> {activeInvoice.notes}
                    </p>
                  )}
                  {activeInvoice.terms && (
                    <p>
                      <strong className="text-foreground">{isRTL ? "الشروط:" : "Terms:"}</strong> {activeInvoice.terms}
                    </p>
                  )}
                </div>

                <div className="w-full sm:w-64 p-3.5 rounded-xl bg-muted/40 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isRTL ? "المجموع الفرعي:" : "Subtotal:"}</span>
                    <span className="font-semibold">{formatMoney(Number(activeInvoice.subtotal))} SDG</span>
                  </div>
                  {Number(activeInvoice.discount_total) > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>{isRTL ? "إجمالي الخصم:" : "Discount:"}</span>
                      <span>-{formatMoney(Number(activeInvoice.discount_total))} SDG</span>
                    </div>
                  )}
                  <div className="border-t pt-1.5 flex justify-between font-bold text-sm text-foreground">
                    <span>{isRTL ? "الإجمالي المستحق:" : "Total Due:"}</span>
                    <span className="text-primary">{formatMoney(Number(activeInvoice.total))} SDG</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>{isRTL ? "المبلغ المسدد:" : "Paid:"}</span>
                    <span>{formatMoney(Number(activeInvoice.amount_paid))} SDG</span>
                  </div>
                  {Number(activeInvoice.total) - Number(activeInvoice.amount_paid) > 0 && (
                    <div className="border-t pt-1.5 flex justify-between font-bold text-amber-600 dark:text-amber-400">
                      <span>{isRTL ? "المتبقي للسداد:" : "Remaining Balance:"}</span>
                      <span>{formatMoney(Number(activeInvoice.total) - Number(activeInvoice.amount_paid))} SDG</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
                    <Printer className="h-4 w-4" />
                    <span>{isRTL ? "طباعة الفاتورة" : "Print Invoice"}</span>
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {activeInvoice.status === "draft" && hasPerm("sales.post") && (
                    <Button
                      size="sm"
                      onClick={() => postMutation.mutate(activeInvoice.id)}
                      disabled={postMutation.isPending}
                      className="gap-1.5 text-xs font-semibold shadow-sm"
                    >
                      {postMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      <span>{isRTL ? "ترحيل الفاتورة الآن" : "Post Invoice"}</span>
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
