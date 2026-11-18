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
import { ClipboardList, Plus, Search, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/stock-documents")({
  component: StockDocumentsPage,
});

function StockDocumentsPage() {
  const { tenant, hasPerm } = useTenant();
  const { isRTL } = useTranslation();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [openDialog, setOpenDialog] = useState(false);

  // Form states
  const [docType, setDocType] = useState<"receipt" | "issue" | "transfer" | "adjustment">("receipt");
  const [warehouseId, setWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [docDate, setDocDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");

  // Query Stock Documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["stock_documents", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("stock_documents")
        .select(`
          id, number, doc_type, doc_date, total_value, notes,
          warehouse:warehouses!warehouse_id ( id, name, code ),
          to_warehouse:warehouses!to_warehouse_id ( id, name, code )
        `)
        .eq("tenant_id", tenant.id)
        .order("doc_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Query Warehouses
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses_for_docs", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("warehouses")
        .select("id, name, code")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true);
      if (error) return [];
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Query Products
  const { data: products = [] } = useQuery({
    queryKey: ["products_for_docs", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, avg_cost")
        .eq("tenant_id", tenant.id)
        .eq("type", "stock")
        .eq("is_active", true);
      if (error) return [];
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Create Stock Document Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");
      if (!warehouseId) throw new Error(isRTL ? "يرجى اختيار المستودع" : "Select warehouse");
      if (!productId) throw new Error(isRTL ? "يرجى اختيار الصنف" : "Select product");
      if (!quantity || parseFloat(quantity) <= 0) throw new Error(isRTL ? "أدخل كمية صالحة" : "Invalid qty");

      const payload = {
        tenant_id: tenant.id,
        doc_type: docType,
        warehouse_id: warehouseId,
        to_warehouse_id: docType === "transfer" ? toWarehouseId : null,
        doc_date: docDate,
        notes: notes || null,
        items: [
          {
            product_id: productId,
            quantity: parseFloat(quantity),
            unit_cost: unitCost ? parseFloat(unitCost) : undefined,
          },
        ],
      };

      const { data, error } = await supabase.rpc("create_stock_document", { _p: payload });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم إنشاء حركة المخزون وتحديث الأرصدة بنجاح" : "Stock movement recorded");
      queryClient.invalidateQueries({ queryKey: ["stock_documents"] });
      queryClient.invalidateQueries({ queryKey: ["products_list"] });
      queryClient.invalidateQueries({ queryKey: ["stock_levels_summary"] });
      setOpenDialog(false);
      setNotes("");
      setProductId("");
      setQuantity("1");
      setUnitCost("");
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل تسجيل حركة المخزون" : "Failed to record stock document"));
    },
  });

  const getDocTypeBadge = (t: string) => {
    switch (t) {
      case "receipt":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600">{isRTL ? "إدخال مخزني" : "Receipt"}</span>;
      case "issue":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 text-red-600">{isRTL ? "صرف مخزني" : "Issue"}</span>;
      case "transfer":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600">{isRTL ? "نقل بين مستودعين" : "Transfer"}</span>;
      case "adjustment":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600">{isRTL ? "تسوية جردية" : "Adjustment"}</span>;
      default:
        return <span>{t}</span>;
    }
  };

  const filtered = documents.filter((d) => {
    const whName = (d.warehouse as any)?.name || "";
    return (
      (d.number && d.number.toLowerCase().includes(search.toLowerCase())) ||
      whName.toLowerCase().includes(search.toLowerCase()) ||
      (d.notes && d.notes.toLowerCase().includes(search.toLowerCase()))
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
            <ClipboardList className="h-6 w-6 text-primary" />
            <span>{isRTL ? "حركات وسندات المخزون" : "Stock Documents"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "تسجيل الإدخال والإخراج، التحويل بين المستودعات، والتسويات الجردية"
              : "Manage inventory receipts, issues, transfers, and inventory adjustments"}
          </p>
        </div>

        {hasPerm("inventory.manage") && (
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                <span>{isRTL ? "إنشاء حركة مخزنية" : "New Movement"}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{isRTL ? "تسجيل حركة مخزنية جديدة" : "New Stock Document"}</DialogTitle>
                <DialogDescription>
                  {isRTL ? "إدخال بضاعة، صرف مواد، أو نقل بين الفروع" : "Receive, issue, or transfer inventory"}
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
                    <Label>{isRTL ? "نوع الحركة *" : "Movement Type *"}</Label>
                    <Select value={docType} onValueChange={(v: any) => setDocType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receipt">{isRTL ? "إدخال مخزني (إضافة)" : "Stock Receipt"}</SelectItem>
                        <SelectItem value="issue">{isRTL ? "صرف مخزني (إنقاص)" : "Stock Issue"}</SelectItem>
                        <SelectItem value="transfer">{isRTL ? "نقل بين مستودعين" : "Stock Transfer"}</SelectItem>
                        <SelectItem value="adjustment">{isRTL ? "تسوية جردية" : "Adjustment"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="doc-date">{isRTL ? "التاريخ *" : "Date *"}</Label>
                    <Input
                      id="doc-date"
                      type="date"
                      value={docDate}
                      onChange={(e) => setDocDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{isRTL ? "المستودع *" : "Warehouse *"}</Label>
                  <Select value={warehouseId} onValueChange={setWarehouseId}>
                    <SelectTrigger>
                      <SelectValue placeholder={isRTL ? "اختر المستودع..." : "Select warehouse..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name} ({w.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {docType === "transfer" && (
                  <div className="space-y-2">
                    <Label>{isRTL ? "إلى المستودع (الوجهة) *" : "To Warehouse *"}</Label>
                    <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                      <SelectTrigger>
                        <SelectValue placeholder={isRTL ? "اختر المستودع الهدف..." : "Select destination..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((w) => (
                          <SelectItem key={w.id} value={w.id} disabled={w.id === warehouseId}>
                            {w.name} ({w.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{isRTL ? "الصنف *" : "Product *"}</Label>
                  <Select
                    value={productId}
                    onValueChange={(pid) => {
                      setProductId(pid);
                      const pr = products.find((p) => p.id === pid);
                      if (pr && pr.avg_cost) setUnitCost(String(pr.avg_cost));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isRTL ? "اختر الصنف..." : "Select product..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="doc-qty">{isRTL ? "الكمية *" : "Quantity *"}</Label>
                    <Input
                      id="doc-qty"
                      type="number"
                      min="0.01"
                      step="any"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="doc-cost">{isRTL ? "سعر التكلفة للوحدة" : "Unit Cost"}</Label>
                    <Input
                      id="doc-cost"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={unitCost}
                      onChange={(e) => setUnitCost(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doc-notes">{isRTL ? "ملاحظات السند" : "Notes"}</Label>
                  <Input
                    id="doc-notes"
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
                    {isRTL ? "حفظ الحركة" : "Save Document"}
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
              placeholder={isRTL ? "بحث برقم السند أو المستودع..." : "Search documents..."}
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
                  <th className="text-start py-3 px-4">{isRTL ? "رقم السند" : "Doc #"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "التاريخ" : "Date"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "نوع السند" : "Type"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "المستودع" : "Warehouse"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "إلى مستودع" : "To Warehouse"}</th>
                  <th className="text-end py-3 px-4">{isRTL ? "إجمالي القيمة" : "Total Value"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "ملاحظات" : "Notes"}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                      <span>{isRTL ? "جارٍ تحميل سندات المخزون..." : "Loading documents..."}</span>
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((d) => {
                    const wh = d.warehouse as any;
                    const toWh = d.to_warehouse as any;
                    return (
                      <tr key={d.id} className="hover:bg-muted/40 transition">
                        <td className="py-3 px-4 font-mono font-medium text-xs">{d.number}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{d.doc_date}</td>
                        <td className="py-3 px-4">{getDocTypeBadge(d.doc_type)}</td>
                        <td className="py-3 px-4 font-medium text-foreground">{wh?.name || "—"}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{toWh?.name || "—"}</td>
                        <td className="py-3 px-4 text-end font-semibold">
                          {formatMoney(Number(d.total_value))} {tenant?.base_currency}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs truncate">{d.notes || "—"}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      {isRTL ? "لا توجد سندات مخزنية مسجلة" : "No stock documents recorded"}
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
