import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ShoppingCart, Plus, Trash2, ArrowLeft, Loader2, Save } from "lucide-react";

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
  const { tenant, hasPerm } = useTenant();
  const { isRTL } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [supplierId, setSupplierId] = useState("");
  const [supplierRef, setSupplierRef] = useState("");
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
  const { data: suppliers = [] } = useQuery({
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
    enabled: !!tenant?.id,
  });

  // Query Products
  const { data: products = [] } = useQuery({
    queryKey: ["products_select", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, purchase_price")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true)
        .order("name");
      if (error) return [];
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Query Warehouses
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses_select", tenant?.id],
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

  const handleSupplierChange = (sid: string) => {
    setSupplierId(sid);
    const sup = suppliers.find((s) => s.id === sid);
    if (sup && sup.payment_terms_days > 0) {
      const d = new Date(invoiceDate);
      d.setDate(d.getDate() + sup.payment_terms_days);
      setDueDate(d.toISOString().split("T")[0]);
    }
  };

  const handleProductSelect = (index: number, pid: string) => {
    const prod = products.find((p) => p.id === pid);
    if (!prod) return;

    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        product_id: prod.id,
        description: prod.name,
        unit_price: Number(prod.purchase_price) || 0,
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
      if (!tenant?.id) throw new Error("No tenant");
      if (!supplierId) throw new Error(isRTL ? "يرجى اختيار المورد" : "Please select supplier");
      if (items.some((it) => !it.description || it.quantity <= 0)) {
        throw new Error(isRTL ? "يرجى ملء جميع البنود والكميات" : "Fill all line items details");
      }

      const payload = {
        tenant_id: tenant.id,
        supplier_id: supplierId,
        supplier_reference: supplierRef || null,
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
        if (postErr) throw postErr;
      }

      return invId;
    },
    onSuccess: (_, { shouldPost }) => {
      toast.success(
        shouldPost
          ? isRTL ? "تم إنشاء الفاتورة وترحيلها وإدخال البضاعة للمخزن" : "Purchase bill posted!"
          : isRTL ? "تم حفظ الفاتورة كمسودة" : "Bill saved as draft!"
      );
      queryClient.invalidateQueries({ queryKey: ["purchase_invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_summary"] });
      navigate({ to: "/app/purchase-invoices" });
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل حفظ فاتورة المشتريات" : "Error saving bill"));
    },
  });

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat(isRTL ? "ar-SD" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
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
              {isRTL ? "تسجيل بضاعة مشتراة من مورد وتحديث تكلفة المخزون" : "Record inventory purchases"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => saveMutation.mutate({ shouldPost: false })}
            disabled={saveMutation.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            <span>{isRTL ? "حفظ كمسودة" : "Save Draft"}</span>
          </Button>

          {hasPerm("purchases.post") && (
            <Button
              onClick={() => saveMutation.mutate({ shouldPost: true })}
              disabled={saveMutation.isPending}
              className="gap-2 shadow-md"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-1" />}
              <span>{isRTL ? "حفظ وترحيل للمخزن" : "Save & Post"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Form */}
      <Card className="shadow-sm">
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pi-sup">{isRTL ? "المورد *" : "Supplier *"}</Label>
              <Select value={supplierId} onValueChange={handleSupplierChange}>
                <SelectTrigger id="pi-sup">
                  <SelectValue placeholder={isRTL ? "اختر المورد" : "Select supplier"} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pi-ref">{isRTL ? "رقم فاتورة المورد" : "Supplier Bill #"}</Label>
              <Input
                id="pi-ref"
                placeholder={isRTL ? "مثال: INV-9842" : "e.g. INV-9842"}
                value={supplierRef}
                onChange={(e) => setSupplierRef(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pi-date">{isRTL ? "تاريخ الفاتورة *" : "Date *"}</Label>
              <Input
                id="pi-date"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pi-due">{isRTL ? "تاريخ الاستحقاق *" : "Due Date *"}</Label>
              <Input
                id="pi-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <div className="space-y-2">
              <Label htmlFor="pi-cur">{isRTL ? "العملة" : "Currency"}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="pi-cur">
                  <SelectValue placeholder="SDG" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SDG">SDG (الجنيه السوداني)</SelectItem>
                  <SelectItem value="USD">USD (الدولار الأمريكي)</SelectItem>
                  <SelectItem value="SAR">SAR (الريال السعودي)</SelectItem>
                  <SelectItem value="AED">AED (الدرهم الإماراتي)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {warehouses.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="pi-wh">{isRTL ? "مستودع الاستلام" : "Target Warehouse"}</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger id="pi-wh">
                    <SelectValue placeholder={isRTL ? "اختر المستودع" : "Select warehouse"} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="border rounded-xl overflow-hidden mt-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground text-xs font-semibold">
                  <th className="py-3 px-3 text-start w-12">#</th>
                  <th className="py-3 px-3 text-start w-52">{isRTL ? "الصنف / المادة" : "Product"}</th>
                  <th className="py-3 px-3 text-start">{isRTL ? "البيان / الوصف" : "Description"}</th>
                  <th className="py-3 px-3 text-start w-24">{isRTL ? "الكمية" : "Qty"}</th>
                  <th className="py-3 px-3 text-start w-32">{isRTL ? "سعر الشراء" : "Cost"}</th>
                  <th className="py-3 px-3 text-start w-24">{isRTL ? "خصم %" : "Disc %"}</th>
                  <th className="py-3 px-3 text-end w-32">{isRTL ? "المجموع" : "Subtotal"}</th>
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
                            {products.map((p) => (
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
                          placeholder={isRTL ? "وصف البند..." : "Description..."}
                          value={item.description}
                          onChange={(e) => updateItem(idx, "description", e.target.value)}
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <Input
                          type="number"
                          min="1"
                          step="any"
                          className="h-9 text-xs"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          className="h-9 text-xs"
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
                          className="h-9 text-xs"
                          value={item.discount_pct}
                          onChange={(e) => updateItem(idx, "discount_pct", e.target.value)}
                        />
                      </td>
                      <td className="py-2.5 px-3 text-end font-bold text-xs text-foreground">
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

          {/* Totals & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="pi-notes">{isRTL ? "ملاحظات الفاتورة" : "Notes"}</Label>
              <Input
                id="pi-notes"
                placeholder={isRTL ? "ملاحظات إضافية على الفاتورة..." : "Additional notes..."}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="bg-muted/30 p-4 rounded-xl space-y-2.5 self-start">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{isRTL ? "المجموع الفرعي" : "Subtotal"}:</span>
                <span className="font-semibold">{formatMoney(subtotal)} {currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{isRTL ? "إجمالي الخصم" : "Discount"}:</span>
                <span className="font-semibold text-destructive">-{formatMoney(discountTotal)} {currency}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-base font-bold text-foreground">
                <span>{isRTL ? "الإجمالي المستحق للمورد" : "Total Payable"}:</span>
                <span className="text-primary">{formatMoney(total)} {currency}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
