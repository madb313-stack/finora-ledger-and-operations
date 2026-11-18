import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { DEMO_PRODUCTS } from "@/lib/demo-data";
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
import { Package, Plus, Search, Tag, Loader2, Boxes } from "lucide-react";

export const Route = createFileRoute("/app/products")({
  component: ProductsPage,
});

function ProductsPage() {
  const { tenant, hasPerm } = useTenant();
  const { isDemoMode } = useAuth();
  const { isRTL } = useTranslation();
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState<"all" | "stock" | "service">("all");
  const [search, setSearch] = useState("");
  const [openDialog, setOpenDialog] = useState(false);

  // Form states
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<"stock" | "service">("stock");
  const [salePrice, setSalePrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [description, setDescription] = useState("");

  // Query Products
  const { data: dbProducts = [], isLoading } = useQuery({
    queryKey: ["products_list", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id && !isDemoMode,
  });

  const products = useMemo(() => {
    if (isDemoMode || (!isLoading && dbProducts.length === 0)) {
      return DEMO_PRODUCTS;
    }
    return dbProducts;
  }, [isDemoMode, dbProducts, isLoading]);

  // Query Stock Quantities (sum across warehouses)
  const { data: stockLevels = [] } = useQuery({
    queryKey: ["stock_levels_summary", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("stock_levels")
        .select("product_id, quantity")
        .eq("tenant_id", tenant.id);
      if (error) return [];
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  const stockMap = new Map<string, number>();
  stockLevels.forEach((s) => {
    const cur = stockMap.get(s.product_id) || 0;
    stockMap.set(s.product_id, cur + Number(s.quantity));
  });

  // Create Product Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");
      if (!name) throw new Error(isRTL ? "اسم الصنف مطلوب" : "Product name required");

      const generatedSku = sku.trim() || `SKU-${Date.now().toString().slice(-6)}`;

      const { data, error } = await supabase
        .from("products")
        .insert({
          tenant_id: tenant.id,
          sku: generatedSku,
          name,
          type,
          sale_price: salePrice ? parseFloat(salePrice) : 0,
          purchase_price: purchasePrice ? parseFloat(purchasePrice) : 0,
          avg_cost: purchasePrice ? parseFloat(purchasePrice) : 0,
          reorder_level: reorderLevel ? parseFloat(reorderLevel) : 0,
          description: description || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تمت إضافة الصنف بنجاح" : "Product created successfully");
      queryClient.invalidateQueries({ queryKey: ["products_list"] });
      setOpenDialog(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل إضافة الصنف" : "Failed to add product"));
    },
  });

  const resetForm = () => {
    setSku("");
    setName("");
    setSalePrice("");
    setPurchasePrice("");
    setReorderLevel("");
    setDescription("");
  };

  const filtered = products.filter((p) => {
    const matchesType = typeFilter === "all" || p.type === typeFilter;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
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
            <Package className="h-6 w-6 text-primary" />
            <span>{isRTL ? "دليل الأصناف والمنتجات" : "Product & Service Catalog"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "إدارة المنتجات المخزنية، أسعار البيع والتكلفة، ومتوسط التكلفة المرجح (WAC)"
              : "Manage inventory products, service items, and weighted average costs"}
          </p>
        </div>

        {hasPerm("inventory.manage") && (
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                <span>{isRTL ? "إضافة صنف جديد" : "Add Product"}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{isRTL ? "إضافة صنف أو خدمة جديدة" : "New Item"}</DialogTitle>
                <DialogDescription>
                  {isRTL ? "حدد كود الصنف وأسعار البيع والشراء" : "Fill product info and pricing"}
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
                    <Label htmlFor="p-sku">{isRTL ? "الرمز / الباركود (SKU)" : "SKU / Barcode"}</Label>
                    <Input
                      id="p-sku"
                      placeholder="SKU-001"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{isRTL ? "نوع الصنف *" : "Item Type *"}</Label>
                    <Select value={type} onValueChange={(v: any) => setType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stock">{isRTL ? "مخزني (سلعة)" : "Stock Item"}</SelectItem>
                        <SelectItem value="service">{isRTL ? "خدمي (خدمة)" : "Service"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="p-name">{isRTL ? "اسم الصنف *" : "Product Name *"}</Label>
                  <Input
                    id="p-name"
                    placeholder={isRTL ? "مثال: جلابية كويتي فاخر مقاس 58" : "e.g. Deluxe Jalabiya size 58"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="p-sprice">{isRTL ? "سعر البيع الافتراضي" : "Sale Price"}</Label>
                    <Input
                      id="p-sprice"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="p-pprice">{isRTL ? "سعر الشراء / التكلفة" : "Cost Price"}</Label>
                    <Input
                      id="p-pprice"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                    />
                  </div>
                </div>

                {type === "stock" && (
                  <div className="space-y-2">
                    <Label htmlFor="p-reorder">{isRTL ? "حد إعادة الطلب (تنبيه النواقص)" : "Reorder Level"}</Label>
                    <Input
                      id="p-reorder"
                      type="number"
                      min="0"
                      placeholder="5"
                      value={reorderLevel}
                      onChange={(e) => setReorderLevel(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="p-desc">{isRTL ? "الوصف" : "Description"}</Label>
                  <Input
                    id="p-desc"
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
                    {isRTL ? "حفظ الصنف" : "Save Product"}
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
              placeholder={isRTL ? "بحث بالاسم أو الكود (SKU)..." : "Search products..."}
              className="ps-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Button
              variant={typeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("all")}
              className="text-xs h-8"
            >
              {isRTL ? "الكل" : "All"}
            </Button>
            <Button
              variant={typeFilter === "stock" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("stock")}
              className="text-xs h-8 gap-1"
            >
              <Boxes className="h-3.5 w-3.5 text-primary" />
              <span>{isRTL ? "أصناف مخزنية" : "Stock"}</span>
            </Button>
            <Button
              variant={typeFilter === "service" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("service")}
              className="text-xs h-8 gap-1"
            >
              <Tag className="h-3.5 w-3.5 text-primary" />
              <span>{isRTL ? "خدمات" : "Services"}</span>
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
                  <th className="text-start py-3 px-4">{isRTL ? "الكود (SKU)" : "SKU"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "اسم الصنف" : "Product Name"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "النوع" : "Type"}</th>
                  <th className="text-end py-3 px-4">{isRTL ? "سعر البيع" : "Sale Price"}</th>
                  <th className="text-end py-3 px-4">{isRTL ? "متوسط التكلفة (WAC)" : "Avg Cost (WAC)"}</th>
                  <th className="text-center py-3 px-4">{isRTL ? "الرصيد المخزني" : "Stock On Hand"}</th>
                  <th className="text-center py-3 px-4">{isRTL ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                      <span>{isRTL ? "جارٍ تحميل الأصناف..." : "Loading products..."}</span>
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((p) => {
                    const currentStock = stockMap.get(p.id) || 0;
                    const isLowStock = p.type === "stock" && p.reorder_level > 0 && currentStock <= p.reorder_level;
                    return (
                      <tr key={p.id} className="hover:bg-muted/40 transition">
                        <td className="py-3 px-4 font-mono font-medium text-xs">{p.sku}</td>
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {p.name}
                          {p.description && (
                            <span className="block text-xs font-normal text-muted-foreground">{p.description}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              p.type === "stock"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                            }`}
                          >
                            {p.type === "stock" ? (isRTL ? "سلعة مخزنية" : "Stock") : isRTL ? "خدمة" : "Service"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-end font-semibold text-foreground">
                          {formatMoney(Number(p.sale_price))} {tenant?.base_currency}
                        </td>
                        <td className="py-3 px-4 text-end text-xs text-muted-foreground font-mono">
                          {p.type === "stock" ? `${formatMoney(Number(p.avg_cost))} ${tenant?.base_currency}` : "—"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {p.type === "stock" ? (
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                isLowStock
                                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {currentStock}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                            {p.is_active ? (isRTL ? "نشط" : "Active") : isRTL ? "موقف" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      {isRTL ? "لا توجد أصناف مسجلة" : "No products found"}
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
