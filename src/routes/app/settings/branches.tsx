import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { DEMO_BRANCHES } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  GitBranch,
  Plus,
  Loader2,
  Building2,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  Edit2,
} from "lucide-react";

export const Route = createFileRoute("/app/settings/branches")({
  component: BranchesSettingsPage,
});

interface Branch {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_main: boolean;
  is_active: boolean;
  created_at: string;
}

function BranchesSettingsPage() {
  const { tenant, hasPerm } = useTenant();
  const { isDemoMode } = useAuth();
  const { isRTL } = useTranslation();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [isMain, setIsMain] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const canManage = hasPerm("branches.manage");

  const { data: dbBranches, isLoading } = useQuery({
    queryKey: ["branches", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("is_main", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as Branch[];
    },
    enabled: !!tenant?.id && !isDemoMode,
  });

  const branches = useMemo(() => {
    if (isDemoMode || (!isLoading && (!dbBranches || dbBranches.length === 0))) {
      return DEMO_BRANCHES.map((b) => ({
        id: b.id,
        tenant_id: tenant?.id || "demo",
        code: b.code,
        name: b.name,
        address: b.address,
        phone: b.phone,
        is_main: b.is_main,
        is_active: true,
        created_at: new Date().toISOString(),
      })) as Branch[];
    }
    return dbBranches || [];
  }, [isDemoMode, dbBranches, isLoading, tenant?.id]);

  const openNew = () => {
    setEditingBranch(null);
    setCode("");
    setName("");
    setAddress("");
    setPhone("");
    setIsMain(branches?.length === 0);
    setIsActive(true);
    setDialogOpen(true);
  };

  const openEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setCode(branch.code);
    setName(branch.name);
    setAddress(branch.address || "");
    setPhone(branch.phone || "");
    setIsMain(branch.is_main);
    setIsActive(branch.is_active);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");
      if (!code.trim() || !name.trim()) {
        throw new Error(isRTL ? "يرجى إدخال رمز واسم الفرع" : "Code and name are required");
      }

      if (isMain) {
        // If this branch is set to main, unset others
        await supabase
          .from("branches")
          .update({ is_main: false })
          .eq("tenant_id", tenant.id);
      }

      if (editingBranch) {
        const { error } = await supabase
          .from("branches")
          .update({
            code: code.trim(),
            name: name.trim(),
            address: address.trim() || null,
            phone: phone.trim() || null,
            is_main: isMain,
            is_active: isActive,
          })
          .eq("id", editingBranch.id)
          .eq("tenant_id", tenant.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("branches").insert({
          tenant_id: tenant.id,
          code: code.trim(),
          name: name.trim(),
          address: address.trim() || null,
          phone: phone.trim() || null,
          is_main: isMain,
          is_active: isActive,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches", tenant?.id] });
      toast.success(
        editingBranch
          ? (isRTL ? "تم تحديث الفرع بنجاح" : "Branch updated successfully")
          : (isRTL ? "تمت إضافة الفرع بنجاح" : "Branch added successfully")
      );
      setDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل حفظ الفرع" : "Failed to save branch"));
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-primary" />
            {isRTL ? "إدارة الفروع ومواقع العمل" : "Branches & Locations"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "إدارة الفروع والمكاتب والمستودعات التابعة للشركة"
              : "Manage company branches, physical offices and operation hubs"}
          </p>
        </div>
        {canManage && (
          <Button onClick={openNew} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {isRTL ? "إضافة فرع جديد" : "Add Branch"}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : branches?.length === 0 ? (
        <Card className="text-center p-12">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold">
            {isRTL ? "لا توجد فروع مسجلة حتى الآن" : "No branches found"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {isRTL
              ? "قم بإضافة الفرع الرئيسي لبدء ربط المعاملات والمستودعات به"
              : "Add the main branch to start associating transactions and warehouses"}
          </p>
          {canManage && (
            <Button onClick={openNew}>
              <Plus className="w-4 h-4 mr-2" />
              {isRTL ? "إضافة الفرع الرئيسي" : "Add Main Branch"}
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches?.map((branch) => (
            <Card key={branch.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
              {branch.is_main && (
                <div className="absolute top-0 end-0 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-bl-lg">
                  {isRTL ? "الفرع الرئيسي" : "Main Branch"}
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs bg-muted px-2 py-0.5 rounded font-medium">
                    {branch.code}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                      branch.is_active
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                    }`}
                  >
                    {branch.is_active ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        {isRTL ? "نشط" : "Active"}
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" />
                        {isRTL ? "معطل" : "Inactive"}
                      </>
                    )}
                  </span>
                </div>
                <CardTitle className="text-lg mt-2">{branch.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground pb-4">
                {branch.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />
                    <span>{branch.address}</span>
                  </div>
                )}
                {branch.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span dir="ltr">{branch.phone}</span>
                  </div>
                )}
                {canManage && (
                  <div className="pt-3 border-t flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(branch)}
                      className="flex items-center gap-1 text-xs"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      {isRTL ? "تعديل" : "Edit"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBranch
                ? (isRTL ? "تعديل بيانات الفرع" : "Edit Branch")
                : (isRTL ? "إضافة فرع جديد" : "Add New Branch")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 space-y-1.5">
                <Label>{isRTL ? "الرمز" : "Code"} *</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="BR-01"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>{isRTL ? "اسم الفرع" : "Branch Name"} *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isRTL ? "فرع الخرطوم الرئيسي" : "Main Branch"}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{isRTL ? "العنوان" : "Address"}</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={isRTL ? "شارع الجمهورية، الخرطوم" : "Main Street, Khartoum"}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{isRTL ? "رقم الهاتف" : "Phone"}</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+249..."
                dir="ltr"
              />
            </div>

            <div className="space-y-3 pt-2 border-t">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMain}
                  onChange={(e) => setIsMain(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                />
                <span className="text-sm font-medium">
                  {isRTL ? "تعيين كفرع رئيسي للشركة" : "Set as primary company branch"}
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                />
                <span className="text-sm font-medium">
                  {isRTL ? "الفرع نشط ومتاح للمعاملات" : "Branch is active"}
                </span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !code.trim() || !name.trim()}
            >
              {saveMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              {isRTL ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
