import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import {
  DEMO_SUPPLIERS,
  DEMO_PRODUCTS,
  DEMO_WAREHOUSES,
  DEMO_BRANCHES,
  type DemoPurchaseInvoice,
} from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ShoppingCart, Plus, Trash2, ArrowLeft, Loader2, Save, GitBranch, Warehouse, Building2 } from "lucide-react";

export const Route = createFileRoute("/app/purchase-invoices_/new")({
  component: NewPurchaseInvoicePage,
});

interface InvoiceLineItem {
  id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_pct: number;
}

function NewPurchaseInvoicePage() {
  const { tenant, branches, currentBranch, hasPerm } = useTenant();
  const { isDemoMode } = useAuth();
  const { isRTL } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [supplierId, setSupplierId] = useState("");
  const [supplierRef, setSupplierRef] = useState("");
  const [branchId, setBranchId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [currency, setCurrency] = useState(tenant?.base_currency || "SDG");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<InvoiceLineItem[]>([
    {
      id: "1",
      description: "",
      quantity: 1,
      unit_price: 0,
      discount_pct: 0,
    },
  ]);

  // Query Suppliers
  const { data: dbSuppliers = [] } = useQuery({
    queryKey: ["suppliers_select", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("parties")
        .select("id, name, code, payment_terms_days")
        .eq("tenant_id", tenant.id)
        .eq("kind", "supplier")
        .eq("is_active", true)
        .order("name");
      if (error) return [];
      return data || [];
    },
    enabled: !!tenant?.id && !isDemoMode,
  });

  // Query Products
  const { data: dbProducts = [] } = useQuery({
    queryKey: ["products_select", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, purchase_price, type")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true)
        .order("name");
      if (error) return [];
      return data || [];
    },
    enabled: !!tenant?.id && !isDemoMode,
  });

  // Query Warehouses
  const { data: dbWarehouses = [] } = useQuery({
    queryKey: ["warehouses_select", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("warehouses")
        .select("id, name, code, branch_id")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true);
      if (error) return [];
      return data || [];
    },
    enabled: !!tenant?.id && !isDemoMode,
  });

  const suppliers = useMemo(() => {
    if (isDemoMode || dbSuppliers.length === 0) return DEMO_SUPPLIERS;
    return dbSuppliers;
  }, [isDemoMode, dbSuppliers]);

  const products = useMemo(() => {
    if (isDemoMode || dbProducts.length === 0) return DEMO_PRODUCTS;
    return dbProducts;
  }, [isDemoMode, dbProducts]);

  const warehouses = useMemo(() => {
    if (isDemoMode || dbWarehouses.length === 0) return DEMO_WAREHOUSES;
    return dbWarehouses;
  }, [isDemoMode, dbWarehouses]);

  const branchList = useMemo(() => {
    if (branches && branches.length > 0) return branches;
    return DEMO_BRANCHES;
  }, [branches]);

  useEffect(() => {
    if (!branchId && (currentBranch?.id || branchList[0]?.id)) {
      setBranchId(currentBranch?.id || branchList[0].id);
    }
    if (!supplierId && suppliers.length > 0) {
      setSupplierId(suppliers[0].id);
    }
    if (!warehouseId && warehouses.length > 0) {
      setWarehouseId(warehouses[0].id);
    }
  }, [branchId, supplierId, warehouseId, currentBranch, branchList, suppliers, warehouses]);

  const handleSupplierChange = (sid: string) => {
    setSupplierId(sid);
    const sup = suppliers.find((s: any) => s.id === sid);
    if (sup && Number(sup.payment_terms_days) > 0) {
      const d = new Date(invoiceDate);
      d.setDate(d.getDate() + Number(sup.payment_terms_days));
      setDueDate(d.toISOString().split("T")[0]);
    }
  };

  const handleProductSelect = (index: number, pid: string) => {
    const prod = products.find((p: any) => p.id === pid);
    if (!prod) return;

    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        product_id: prod.id,
        description: prod.name,
        unit_price: Number(prod.purchase_price) || 0,
        quantity: copy[index].quantity > 0 ? copy[index].quantity : 1,
      };
      return copy;
    });
  };

  const updateItem = (index: number, field: keyof InvoiceLineItem, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        description: "",
        quantity: 1,
        unit_price: 0,
        discount_pct: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return items.reduce((acc, it) => {
      const qty = Number(it.quantity) || 0;
      const prc = Number(it.unit_price) || 0;
      return acc + qty * prc;
    }, 0);
  };

  const calculateDiscount = () => {
    return items.reduce((acc, it) => {
      const qty = Number(it.quantity) || 0;
      const prc = Number(it.unit_price) || 0;
      const d = Number(it.discount_pct) || 0;
      return acc + qty * prc * (d / 100);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const discountTotal = calculateDiscount();
  const total = Math.max(0, subtotal - discountTotal);

  const saveMutation = useMutation({
    mutationFn: async ({ shouldPost }: { shouldPost: boolean }) => {
      if (!supplierId) throw new Error(isRTL ? "يرجى اختيار المورد" : "Please select supplier");
      if (items.some((it) => !it.description.trim() || Number(it.quantity) <= 0)) {
        throw new Error(isRTL ? "يرجى ملء جميع البنود والكميات" : "Fill all line items details");
      }

      // Demo mode
      if (isDemoMode || !tenant?.id) {
        const sup = suppliers.find((s: any) => s.id === supplierId);
        const br = branchList.find((b: any) => b.id === branchId) || branchList[0];
        const wh = warehouses.find((w: any) => w.id === warehouseId) || warehouses[0];

        const newDemoBill: DemoPurchaseInvoice = {
          id: `demo-bill-${Date.now()}`,
          number: shouldPost ? `BILL-0000${Math.floor(Math.random() * 900) + 100}` : "",
          supplier_reference: supplierRef || `REF-${Math.floor(Math.random() * 9000) + 1000}`,
          party_id: supplierId,
          supplier_name: sup?.name || "مورد تجريبي",
          supplier_code: sup?.code || "S-DEMO",
          branch_id: branchId || br.id,
          branch_name: br.name,
          warehouse_id: warehouseId || wh.id,
          warehouse_name: wh.name,
          invoice_date: invoiceDate,
          due_date: dueDate,
          currency_code: currency,
          status: shouldPost ? "posted" : "draft",
          subtotal,
          discount_total: discountTotal,
          tax_total: 0,
          total,
          amount_paid: 0,
          notes: notes || "",
          items: items.map((it, idx) => ({
            id: String(idx + 1),
            product_id: it.product_id || "",
            product_name: it.description,
            description: it.description,
            quantity: Number(it.quantity),
            unit_price: Number(it.unit_price),
            discount_pct: Number(it.discount_pct) || 0,
            line_total: Number(it.quantity) * Number(it.unit_price) * (1 - (Number(it.discount_pct) || 0) / 100),
          })),
        };

        if (typeof window !== "undefined") {
          const currentStored = localStorage.getItem("finora_custom_purchase_invoices");
          const list: DemoPurchaseInvoice[] = currentStored ? JSON.parse(currentStored) : [];
          list.unshift(newDemoBill);
          localStorage.setItem("finora_custom_purchase_invoices", JSON.stringify(list));
        }
        return newDemoBill.id;
      }

      const payload = {
        tenant_id: tenant.id,
        supplier_id: supplierId,
        supplier_reference: supplierRef || null,
        branch_id: branchId || currentBranch?.id || null,
        warehouse_id: warehouseId || null,
        invoice_date: invoiceDate,
        due_date: dueDate,
        currency_code: currency,
        notes: notes || null,
        items: items.map((it) => ({
          product_id: it.product_id || null,
          description: it.description,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          discount_pct: Number(it.discount_pct) || 0,
        })),
      };

      const { data: invId, error: saveErr } = await supabase.rpc("save_purchase_invoice", {
        _p: payload,
      });

      if (saveErr) throw saveErr;

      if (shouldPost && invId) {
        const { error: postErr } = await supabase.rpc("post_purchase_invoice", { _id: invId });
        if (postErr) {
          toast.warning(
            isRTL
              ? `تم حفظ الفاتورة كمسودة، لكن تعذر الترحيل المباشر: ${postErr.message}`
              : `Saved as draft, but post failed: ${postErr.message}`
          );
          return invId;
        }
      }

      return invId;
    },
    onSuccess: (_, { shouldPost }) => {
      toast.success(
        shouldPost
          ? isRTL ? "تم إنشاء الفاتورة وترحيلها وإدخال البضاعة للمخزن بنجاح!" : "Purchase bill posted!"
          : isRTL ? "تم حفظ الفاتورة كمسودة" : "Bill saved as draft!"
      );
      queryClient.invalidateQueries({ queryKey: ["purchase_invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_summary"] });
      navigate({ to: "/app/purchase-invoices" });
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "حدث خطأ أثناء حفظ الفاتورة" : "Error saving bill"));
    },
  });

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat(isRTL ? "ar-SD" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/app/purchase-invoices">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-primary" />
              <span>{isRTL ? "فاتورة مشتريات جديدة" : "New Purchase Bill"}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {isRTL ? "إدخال فاتورة توريد من المورد وتحديث أرصدة المستودعات" : "Record vendor invoice and replenish inventory"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => saveMutation.mutate({ shouldPost: false })}
            disabled={saveMutation.isPending}
            className="gap-2 flex-1 sm:flex-none"
          >
            <Save className="h-4 w-4" />
            <span>{isRTL ? "حفظ كمسودة" : "Save Draft"}</span>
          </Button>

          {hasPerm("purchases.post") && (
            <Button
              onClick={() => saveMutation.mutate({ shouldPost: true })}
              disabled={saveMutation.isPending}
              className="gap-2 shadow-md flex-1 sm:flex-none font-semibold"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-1" />}
              <span>{isRTL ? "حفظ وترحيل للمخزن" : "Save & Post"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Form Card */}
      <Card className="shadow-sm border">
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pur-branch" className="flex items-center gap-1.5 font-medium">
                <GitBranch className="h-3.5 w-3.5 text-primary" />
                <span>{isRTL ? "الفرع المستلم *" : "Branch *"}</span>
              </Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger id="pur-branch">
                  <SelectValue placeholder={isRTL ? "اختر الفرع" : "Select branch"} />
                </SelectTrigger>
                <SelectContent>
                  {branchList.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pur-sup" className="flex items-center gap-1.5 font-medium">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span>{isRTL ? "المورد *" : "Supplier *"}</span>
              </Label>
              <Select value={supplierId} onValueChange={handleSupplierChange}>
                <SelectTrigger id="pur-sup">
                  <SelectValue placeholder={isRTL ? "اختر المورد" : "Select supplier"} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pur-ref">{isRTL ? "مرجع فاتورة المورد" : "Vendor Invoice Ref"}</Label>
              <Input
                id="pur-ref"
                placeholder={isRTL ? "مثال: INV-9812..." : "Vendor ref..."}
                value={supplierRef}
                onChange={(e) => setSupplierRef(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pur-wh" className="flex items-center gap-1.5 font-medium">
                <Warehouse className="h-3.5 w-3.5 text-primary" />
                <span>{isRTL ? "مستودع الاستلام *" : "Receiving Warehouse *"}</span>
              </Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger id="pur-wh">
                  <SelectValue placeholder={isRTL ? "اختر المستودع" : "Select warehouse"} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl">
            <div className="space-y-2">
              <Label htmlFor="pur-date">{isRTL ? "تاريخ الفاتورة *" : "Date *"}</Label>
              <Input
                id="pur-date"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pur-due">{isRTL ? "تاريخ الاستحقاق *" : "Due Date *"}</Label>
              <Input
                id="pur-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pur-cur">{isRTL ? "العملة" : "Currency"}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="pur-cur">
                  <SelectValue placeholder="SDG" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SDG">SDG (الجنيه السوداني)</SelectItem>
                  <SelectItem value="USD">USD (الدولار الأمريكي)</SelectItem>
                  <SelectItem value="SAR">SAR (الريال السعودي)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items Table */}
          <div className="border rounded-xl overflow-hidden mt-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground text-xs font-semibold">
                  <th className="py-3 px-3 text-start w-12">#</th>
                  <th className="py-3 px-3 text-start w-64">{isRTL ? "الصنف / المنتج" : "Item"}</th>
                  <th className="py-3 px-3 text-start">{isRTL ? "البيان / الوصف" : "Description"}</th>
                  <th className="py-3 px-3 text-start w-28">{isRTL ? "الكمية" : "Qty"}</th>
                  <th className="py-3 px-3 text-start w-36">{isRTL ? "سعر الشراء" : "Cost Price"}</th>
                  <th className="py-3 px-3 text-start w-24">{isRTL ? "خصم %" : "Disc %"}</th>
                  <th className="py-3 px-3 text-end w-36">{isRTL ? "المجموع" : "Subtotal"}</th>
                  <th className="py-3 px-3 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item, idx) => {
                  const lineTotal =
                    (Number(item.quantity) || 0) *
                    (Number(item.unit_price) || 0) *
                    (1 - (Number(item.discount_pct) || 0) / 100);

                  return (
                    <tr key={item.id} className="hover:bg-muted/20">
                      <td className="py-2.5 px-3 text-xs text-muted-foreground font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <Select
                          value={item.product_id || ""}
                          onValueChange={(val) => handleProductSelect(idx, val)}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder={isRTL ? "اختر صنفاً..." : "Pick item..."} />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p: any) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2.5 px-3">
                        <Input
                          className="h-9 text-xs"
                          placeholder={isRTL ? "وصف البند المشترى..." : "Description..."}
                          value={item.description}
                          onChange={(e) => updateItem(idx, "description", e.target.value)}
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <Input
                          type="number"
                          min="0.01"
                          step="any"
                          className="h-9 text-xs font-mono"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          className="h-9 text-xs font-mono"
                          value={item.unit_price}
                          onChange={(e) => updateItem(idx, "unit_price", e.target.value)}
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          className="h-9 text-xs font-mono"
                          value={item.discount_pct}
                          onChange={(e) => updateItem(idx, "discount_pct", e.target.value)}
                        />
                      </td>
                      <td className="py-2.5 px-3 text-end font-bold text-xs text-foreground font-mono">
                        {formatMoney(lineTotal)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => removeItem(idx)}
                          disabled={items.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1.5 text-xs">
            <Plus className="h-4 w-4" />
            <span>{isRTL ? "إضافة سطر جديد" : "Add Line"}</span>
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="pur-notes">{isRTL ? "ملاحظات الفاتورة" : "Notes"}</Label>
              <Input
                id="pur-notes"
                placeholder={isRTL ? "ملاحظات وتفاصيل التوريد..." : "Delivery notes..."}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="bg-muted/30 p-5 rounded-xl space-y-3 self-start border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{isRTL ? "المجموع الفرعي" : "Subtotal"}:</span>
                <span className="font-semibold font-mono">{formatMoney(subtotal)} {currency}</span>
              </div>
              <div className="border-t pt-2.5 flex justify-between text-lg font-bold text-foreground">
                <span>{isRTL ? "إجمالي الفاتورة" : "Total Bill"}:</span>
                <span className="text-primary font-mono">{formatMoney(total)} {currency}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
