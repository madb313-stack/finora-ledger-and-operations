import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Warehouse, Plus, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/warehouses")({
  component: WarehousesPage,
});

function WarehousesPage() {
  const { tenant, hasPerm } = useTenant();
  const { isRTL } = useTranslation();
  const queryClient = useQueryClient();

  const [openDialog, setOpenDialog] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  // Query Warehouses
  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ["warehouses_list", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("code");
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Query item count in each warehouse
  const { data: stockLevels = [] } = useQuery({
    queryKey: ["warehouse_stock_levels", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("stock_levels")
        .select("warehouse_id, quantity")
        .eq("tenant_id", tenant.id);
      if (error) return [];
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  const countMap = new Map<string, number>();
  stockLevels.forEach((s) => {
    const cur = countMap.get(s.warehouse_id) || 0;
    countMap.set(s.warehouse_id, cur + (Number(s.quantity) > 0 ? 1 : 0));
  });

  // Create Warehouse Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");
      if (!name) throw new Error(isRTL ? "اسم المستودع مطلوب" : "Warehouse name required");

      const generatedCode = code.trim() || `WH-${warehouses.length + 1}`;

      const { data, error } = await supabase
        .from("warehouses")
        .insert({
          tenant_id: tenant.id,
          code: generatedCode,
          name,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم إنشاء المستودع بنجاح" : "Warehouse created");
      queryClient.invalidateQueries({ queryKey: ["warehouses_list"] });
      setOpenDialog(false);
      setName("");
      setCode("");
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل إنشاء المستودع" : "Failed to create warehouse"));
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Warehouse className="h-6 w-6 text-primary" />
            <span>{isRTL ? "المستودعات والمخازن" : "Warehouses & Storage Locations"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "إدارة مواقع التخزين، فروع التوزيع، ومتابعة الأرصدة المخزنية في كل مستودع"
              : "Manage storage warehouses and multi-location inventory levels"}
          </p>
        </div>

        {hasPerm("inventory.manage") && (
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                <span>{isRTL ? "إضافة مستودع جديد" : "Add Warehouse"}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{isRTL ? "إضافة مستودع جديد" : "New Warehouse"}</DialogTitle>
                <DialogDescription>
                  {isRTL ? "أدخل كود واسم المستودع الجديد" : "Enter warehouse code and name"}
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
                  <Label htmlFor="wh-code">{isRTL ? "كود المستودع" : "Warehouse Code"}</Label>
                  <Input
                    id="wh-code"
                    placeholder="WH-01"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wh-name">{isRTL ? "اسم المستودع *" : "Warehouse Name *"}</Label>
                  <Input
                    id="wh-name"
                    placeholder={isRTL ? "مثال: المستودع الرئيسي - السوق العربي" : "e.g. Main Warehouse"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                    {isRTL ? "إلغاء" : "Cancel"}
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                    {isRTL ? "حفظ المستودع" : "Save Warehouse"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Warehouses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
            <span>{isRTL ? "جارٍ تحميل المستودعات..." : "Loading warehouses..."}</span>
          </div>
        ) : warehouses.length > 0 ? (
          warehouses.map((wh) => {
            const activeItemsCount = countMap.get(wh.id) || 0;
            return (
              <Card key={wh.id} className="shadow-sm hover:shadow-md transition">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Warehouse className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">{wh.name}</CardTitle>
                      <CardDescription className="text-xs font-mono">{wh.code}</CardDescription>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                    {wh.is_active ? (isRTL ? "نشط" : "Active") : isRTL ? "موقف" : "Inactive"}
                  </span>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{isRTL ? "الأصناف المتوفرة به:" : "Stock items:"}</span>
                    <span className="font-bold text-foreground">{activeItemsCount} {isRTL ? "صنف" : "items"}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-2xl border">
            <Warehouse className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="font-semibold">{isRTL ? "لا توجد مستودعات مضافة" : "No warehouses"}</h3>
          </div>
        )}
      </div>
    </div>
  );
}
