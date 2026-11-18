import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import {
  DEMO_CUSTOMERS,
  DEMO_PRODUCTS,
  DEMO_WAREHOUSES,
  DEMO_BRANCHES,
  type DemoSalesInvoice,
} from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Receipt, Plus, Trash2, ArrowLeft, ArrowRight, Loader2, Save, GitBranch, Warehouse, Building2, Package } from "lucide-react";

export const Route = createFileRoute("/app/sales-invoices_/new")({
  component: NewSalesInvoicePage,
});

interface InvoiceLineItem {
  id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_pct: number;
}

function NewSalesInvoicePage() {
  const { tenant, branches, currentBranch, hasPerm } = useTenant();
  const { isDemoMode } = useAuth();
  const { isRTL } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [customerId, setCustomerId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [currency, setCurrency] = useState(tenant?.base_currency || "SDG");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  const [items, setItems] = useState<InvoiceLineItem[]>([
    {
      id: "1",
      description: "",
      quantity: 1,
      unit_price: 0,
      discount_pct: 0,
    },
  ]);

  // Query Customers
  const { data: dbCustomers = [] } = useQuery({
    queryKey: ["customers_select", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("parties")
        .select("id, name, code, payment_terms_days")
        .eq("tenant_id", tenant.id)
        .eq("kind", "customer")
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
        .select("id, name, sku, sale_price, type")
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

  // Customers source (fallback to demo if empty)
  const customers = useMemo(() => {
    if (isDemoMode || dbCustomers.length === 0) {
      return DEMO_CUSTOMERS;
    }
    return dbCustomers;
  }, [isDemoMode, dbCustomers]);

  // Products source (fallback to demo if empty)
  const products = useMemo(() => {
    if (isDemoMode || dbProducts.length === 0) {
      return DEMO_PRODUCTS;
    }
    return dbProducts;
  }, [isDemoMode, dbProducts]);

  // Warehouses source (fallback to demo if empty)
  const warehouses = useMemo(() => {
    if (isDemoMode || dbWarehouses.length === 0) {
      return DEMO_WAREHOUSES;
    }
    return dbWarehouses;
  }, [isDemoMode, dbWarehouses]);

  // Branch list
  const branchList = useMemo(() => {
    if (branches && branches.length > 0) return branches;
    return DEMO_BRANCHES;
  }, [branches]);

  // Auto-init defaults
  useEffect(() => {
    if (!branchId && (currentBranch?.id || branchList[0]?.id)) {
      setBranchId(currentBranch?.id || branchList[0].id);
    }
    if (!customerId && customers.length > 0) {
      setCustomerId(customers[0].id);
    }
    if (!warehouseId && warehouses.length > 0) {
      setWarehouseId(warehouses[0].id);
    }
  }, [branchId, customerId, warehouseId, currentBranch, branchList, customers, warehouses]);

  const handleCustomerChange = (cid: string) => {
    setCustomerId(cid);
    const cust = customers.find((c: any) => c.id === cid);
    if (cust && Number(cust.payment_terms_days) > 0) {
      const d = new Date(invoiceDate);
      d.setDate(d.getDate() + Number(cust.payment_terms_days));
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
        unit_price: Number(prod.sale_price) || 0,
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

  // Calculations
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

  // Mutation to Save & optionally Post
  const saveMutation = useMutation({
    mutationFn: async ({ shouldPost }: { shouldPost: boolean }) => {
      if (!customerId) throw new Error(isRTL ? "يرجى اختيار العميل" : "Please select customer");
      if (items.some((it) => !it.description.trim() || Number(it.quantity) <= 0)) {
        throw new Error(isRTL ? "يرجى تعبئة تفاصيل جميع البنود والكميات" : "Fill all line items details");
      }

      // Demo mode save
      if (isDemoMode || !tenant?.id) {
        const cust = customers.find((c: any) => c.id === customerId);
        const br = branchList.find((b: any) => b.id === branchId) || branchList[0];
        const wh = warehouses.find((w: any) => w.id === warehouseId) || warehouses[0];

        const newDemoInv: DemoSalesInvoice = {
          id: `demo-inv-${Date.now()}`,
          number: shouldPost ? `INV-0000${Math.floor(Math.random() * 900) + 100}` : "",
          party_id: customerId,
          customer_name: cust?.name || "عميل تجريبي",
          customer_code: cust?.code || "C-DEMO",
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
          amount_credited: 0,
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
          const currentStored = localStorage.getItem("finora_custom_sales_invoices");
          const list: DemoSalesInvoice[] = currentStored ? JSON.parse(currentStored) : [];
          list.unshift(newDemoInv);
          localStorage.setItem("finora_custom_sales_invoices", JSON.stringify(list));
        }
        return newDemoInv.id;
      }

      // Live Supabase RPC
      const payload = {
        tenant_id: tenant.id,
        customer_id: customerId,
        branch_id: branchId || currentBranch?.id || null,
        warehouse_id: warehouseId || null,
        invoice_date: invoiceDate,
        due_date: dueDate,
        currency_code: currency,
        notes: notes || null,
        terms: terms || null,
        items: items.map((it) => ({
          product_id: it.product_id || null,
          description: it.description,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          discount_pct: Number(it.discount_pct) || 0,
        })),
      };

      const { data: invId, error: saveErr } = await supabase.rpc("save_sales_invoice", {
        _p: payload,
      });

      if (saveErr) throw saveErr;

      if (shouldPost && invId) {
        const { error: postErr } = await supabase.rpc("post_sales_invoice", { _id: invId });
        if (postErr) {
          toast.warning(
            isRTL
              ? `تم حفظ الفاتورة كمسودة، لكن تعذر الترحيل المباشر: ${postErr.message}`
              : `Saved as draft, but auto-post failed: ${postErr.message}`
          );
          return invId;
        }
      }

      return invId;
    },
    onSuccess: (_, { shouldPost }) => {
      toast.success(
        shouldPost
          ? isRTL ? "تم إنشاء الفاتورة وترحيلها وتوليد القيود بنجاح!" : "Invoice created and posted!"
          : isRTL ? "تم حفظ الفاتورة بنجاح كمسودة" : "Invoice saved as draft!"
      );
      queryClient.invalidateQueries({ queryKey: ["sales_invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_summary"] });
      navigate({ to: "/app/sales-invoices" });
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "حدث خطأ أثناء حفظ الفاتورة" : "Error saving invoice"));
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
          <Link to="/app/sales-invoices">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Receipt className="h-6 w-6 text-primary" />
              <span>{isRTL ? "فاتورة مبيعات جديدة" : "New Sales Invoice"}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {isRTL ? "إدخال بيانات الفاتورة والعميل والبنود المباعة والمستودع" : "Fill invoice information, items and dispatch branch"}
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

          {hasPerm("sales.post") && (
            <Button
              onClick={() => saveMutation.mutate({ shouldPost: true })}
              disabled={saveMutation.isPending}
              className="gap-2 shadow-md flex-1 sm:flex-none font-semibold"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-1" />}
              <span>{isRTL ? "حفظ وترحيل الآن" : "Save & Post"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Invoice Card */}
      <Card className="shadow-sm border">
        <CardContent className="p-6 space-y-6">
          {/* Metadata Row 1: Branch, Customer, Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Branch */}
            <div className="space-y-2">
              <Label htmlFor="inv-branch" className="flex items-center gap-1.5 font-medium">
                <GitBranch className="h-3.5 w-3.5 text-primary" />
                <span>{isRTL ? "الفرع المصدر *" : "Branch *"}</span>
              </Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger id="inv-branch">
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

            {/* Customer */}
            <div className="space-y-2">
              <Label htmlFor="inv-cust" className="flex items-center gap-1.5 font-medium">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span>{isRTL ? "العميل *" : "Customer *"}</span>
              </Label>
              <Select value={customerId} onValueChange={handleCustomerChange}>
                <SelectTrigger id="inv-cust">
                  <SelectValue placeholder={isRTL ? "اختر العميل" : "Select customer"} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.code ? `(${c.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Warehouse */}
            <div className="space-y-2">
              <Label htmlFor="inv-wh" className="flex items-center gap-1.5 font-medium">
                <Warehouse className="h-3.5 w-3.5 text-primary" />
                <span>{isRTL ? "مستودع الصرف" : "Warehouse"}</span>
              </Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger id="inv-wh">
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

            {/* Currency */}
            <div className="space-y-2">
              <Label htmlFor="inv-cur">{isRTL ? "عملة الفاتورة" : "Currency"}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="inv-cur">
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
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div className="space-y-2">
              <Label htmlFor="inv-date">{isRTL ? "تاريخ الفاتورة *" : "Invoice Date *"}</Label>
              <Input
                id="inv-date"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inv-due">{isRTL ? "تاريخ الاستحقاق *" : "Due Date *"}</Label>
              <Input
                id="inv-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
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
                  <th className="py-3 px-3 text-start w-36">{isRTL ? "سعر الوحدة" : "Unit Price"}</th>
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
                                <div className="flex items-center gap-1.5">
                                  <span>{p.name}</span>
                                  {p.sale_price && (
                                    <span className="text-[10px] text-muted-foreground">
                                      ({formatMoney(Number(p.sale_price))} SDG)
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2.5 px-3">
                        <Input
                          className="h-9 text-xs"
                          placeholder={isRTL ? "وصف البند المباع..." : "Description..."}
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
            <span>{isRTL ? "إضافة سطر بند جديد" : "Add Line"}</span>
          </Button>

          {/* Totals & Notes Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inv-notes">{isRTL ? "ملاحظات الفاتورة" : "Invoice Notes"}</Label>
                <Input
                  id="inv-notes"
                  placeholder={isRTL ? "تظهر أسفل الفاتورة للعميل (مثال: الشحن مجاني)..." : "Public notes on invoice..."}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inv-terms">{isRTL ? "شروط البيع والتسليم" : "Terms & Conditions"}</Label>
                <Input
                  id="inv-terms"
                  placeholder={isRTL ? "مثال: البضاعة المباعة لا ترد ولا تستبدل بعد 3 أيام..." : "Payment and delivery terms..."}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                />
              </div>
            </div>

            {/* Calculations Box */}
            <div className="bg-muted/30 p-5 rounded-xl space-y-3 self-start border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{isRTL ? "المجموع الفرعي" : "Subtotal"}:</span>
                <span className="font-semibold font-mono">{formatMoney(subtotal)} {currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{isRTL ? "إجمالي الخصم" : "Discount"}:</span>
                <span className="font-semibold text-destructive font-mono">-{formatMoney(discountTotal)} {currency}</span>
              </div>
              <div className="border-t pt-2.5 flex justify-between text-lg font-bold text-foreground">
                <span>{isRTL ? "الإجمالي النهائي المستحق" : "Total Due"}:</span>
                <span className="text-primary font-mono">{formatMoney(total)} {currency}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
