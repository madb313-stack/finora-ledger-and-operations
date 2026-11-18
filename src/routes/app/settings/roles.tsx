import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ShieldCheck,
  Shield,
  Plus,
  Loader2,
  Lock,
  Check,
  Save,
  CheckSquare,
  Square,
} from "lucide-react";

export const Route = createFileRoute("/app/settings/roles")({
  component: RolesSettingsPage,
});

interface TenantRole {
  id: string;
  tenant_id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  description: string | null;
  is_system: boolean;
}

interface Permission {
  code: string;
  module: string;
  name_ar: string;
  name_en: string;
  sort: number;
}

interface RolePerm {
  role_id: string;
  permission_code: string;
}

function RolesSettingsPage() {
  const { tenant, hasPerm } = useTenant();
  const { isRTL } = useTranslation();
  const queryClient = useQueryClient();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [newRoleDialogOpen, setNewRoleDialogOpen] = useState(false);

  // New role form state
  const [code, setCode] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [description, setDescription] = useState("");

  const canManage = hasPerm("roles.manage");

  // Load roles
  const { data: roles, isLoading: loadingRoles } = useQuery({
    queryKey: ["tenant_roles", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("tenant_roles")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("is_system", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as TenantRole[];
    },
    enabled: !!tenant?.id,
  });

  // Load all permissions reference
  const { data: allPermissions, isLoading: loadingPerms } = useQuery({
    queryKey: ["permissions_reference"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions")
        .select("*")
        .order("sort", { ascending: true });

      if (error) throw error;
      return (data || []) as Permission[];
    },
  });

  // Select initial role
  const activeRole = useMemo(() => {
    if (!roles || roles.length === 0) return null;
    if (selectedRoleId) {
      return roles.find((r) => r.id === selectedRoleId) || roles[0];
    }
    return roles[0];
  }, [roles, selectedRoleId]);

  // Load role permissions for current role
  const { data: currentRolePerms, isLoading: loadingRolePerms } = useQuery({
    queryKey: ["role_permissions", tenant?.id, activeRole?.id],
    queryFn: async () => {
      if (!tenant?.id || !activeRole?.id) return new Set<string>();
      const { data, error } = await supabase
        .from("tenant_role_permissions")
        .select("permission_code")
        .eq("tenant_id", tenant.id)
        .eq("role_id", activeRole.id);

      if (error) throw error;
      return new Set((data || []).map((x) => x.permission_code));
    },
    enabled: !!tenant?.id && !!activeRole?.id,
  });

  // Local state for permissions toggle
  const [localPerms, setLocalPerms] = useState<Set<string> | null>(null);

  // Sync local perms when query loads
  const permissionsSet = useMemo(() => {
    if (localPerms !== null) return localPerms;
    return currentRolePerms || new Set<string>();
  }, [localPerms, currentRolePerms]);

  // Reset local perms on role change
  const handleSelectRole = (roleId: string) => {
    setSelectedRoleId(roleId);
    setLocalPerms(null);
  };

  const togglePermission = (permCode: string) => {
    if (!canManage || activeRole?.code === "owner") return;
    const next = new Set(permissionsSet);
    if (next.has(permCode)) {
      next.delete(permCode);
    } else {
      next.add(permCode);
    }
    setLocalPerms(next);
  };

  // Group permissions by module
  const groupedPermissions = useMemo(() => {
    if (!allPermissions) return {};
    const groups: Record<string, Permission[]> = {};
    for (const p of allPermissions) {
      if (!groups[p.module]) groups[p.module] = [];
      groups[p.module].push(p);
    }
    return groups;
  }, [allPermissions]);

  const moduleTitles: Record<string, { ar: string; en: string }> = {
    general: { ar: "عام ولوحة التحكم", en: "General & Dashboard" },
    accounting: { ar: "المحاسبة والقيود", en: "Accounting & Ledger" },
    finance: { ar: "المالية والنقدية", en: "Finance & Cash" },
    sales: { ar: "المبيعات والعملاء", en: "Sales & Customers" },
    purchases: { ar: "المشتريات والموردين", en: "Purchases & Suppliers" },
    inventory: { ar: "المخزون والمستودعات", en: "Inventory & Warehouses" },
    reports: { ar: "التقارير المالية", en: "Reports" },
    admin: { ar: "إدارة النظام والإعدادات", en: "Administration & Settings" },
  };

  // Save permissions mutation
  const savePermsMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id || !activeRole?.id) return;
      if (activeRole.code === "owner") {
        throw new Error(isRTL ? "لا يمكن تعديل صلاحيات المالك، يمتلك كافة الصلاحيات دائماً" : "Owner permissions cannot be altered");
      }

      // Delete existing
      await supabase
        .from("tenant_role_permissions")
        .delete()
        .eq("tenant_id", tenant.id)
        .eq("role_id", activeRole.id);

      // Insert new
      const toInsert = Array.from(permissionsSet).map((pCode) => ({
        tenant_id: tenant.id,
        role_id: activeRole.id,
        permission_code: pCode,
      }));

      if (toInsert.length > 0) {
        const { error } = await supabase
          .from("tenant_role_permissions")
          .insert(toInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["role_permissions", tenant?.id, activeRole?.id],
      });
      setLocalPerms(null);
      toast.success(isRTL ? "تم حفظ صلاحيات الدور بنجاح" : "Role permissions updated successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل حفظ الصلاحيات" : "Failed to update permissions"));
    },
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");
      if (!code.trim() || !nameAr.trim()) {
        throw new Error(isRTL ? "الرمز والاسم بالعربية مطلوبان" : "Code and Arabic name are required");
      }

      const { data, error } = await supabase
        .from("tenant_roles")
        .insert({
          tenant_id: tenant.id,
          code: code.trim().toLowerCase(),
          name_ar: nameAr.trim(),
          name_en: nameEn.trim() || null,
          description: description.trim() || null,
          is_system: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tenant_roles", tenant?.id] });
      toast.success(isRTL ? "تم إنشاء الدور بنجاح" : "Role created successfully");
      setNewRoleDialogOpen(false);
      setCode("");
      setNameAr("");
      setNameEn("");
      setDescription("");
      if (data?.id) setSelectedRoleId(data.id);
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل إنشاء الدور" : "Failed to create role"));
    },
  });

  const isOwner = activeRole?.code === "owner";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            {isRTL ? "الأدوار والصلاحيات" : "Roles & Permissions Matrix"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "تعيين الصلاحيات الدقيقة لكل دور وظيفي في الشركة"
              : "Configure granular permissions and access levels for company roles"}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setNewRoleDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {isRTL ? "إضافة دور مخصص" : "Add Custom Role"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Roles List Sidebar */}
        <div className="md:col-span-4 space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{isRTL ? "الأدوار الوظيفية" : "Defined Roles"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-2">
              {loadingRoles ? (
                <div className="flex justify-center p-6">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                roles?.map((r) => {
                  const isSelected = activeRole?.id === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => handleSelectRole(r.id)}
                      className={`w-full text-start p-3 rounded-lg border transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-card hover:bg-muted/50 border-transparent"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-sm flex items-center gap-2">
                          <span>{isRTL ? r.name_ar : r.name_en || r.name_ar}</span>
                          {r.is_system && (
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                                isSelected
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {isRTL ? "نظامي" : "System"}
                            </span>
                          )}
                        </div>
                        {r.description && (
                          <p
                            className={`text-xs line-clamp-1 ${
                              isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                            }`}
                          >
                            {r.description}
                          </p>
                        )}
                      </div>
                      <Shield className={`w-4 h-4 shrink-0 ${isSelected ? "text-primary-foreground" : "text-muted-foreground"}`} />
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Permissions Matrix */}
        <div className="md:col-span-8 space-y-4">
          {activeRole && (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">
                      {isRTL ? activeRole.name_ar : activeRole.name_en || activeRole.name_ar}
                    </CardTitle>
                    {isOwner && (
                      <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
                        <Lock className="w-3 h-3" />
                        {isRTL ? "كامل الصلاحيات غير قابل للتعديل" : "Full Access (Locked)"}
                      </span>
                    )}
                  </div>
                  <CardDescription className="mt-1">
                    {activeRole.description || (isRTL ? "صلاحيات الدور الوظيفي" : "Role permissions checklist")}
                  </CardDescription>
                </div>

                {canManage && !isOwner && (
                  <Button
                    onClick={() => savePermsMutation.mutate()}
                    disabled={savePermsMutation.isPending}
                    className="flex items-center gap-2 shrink-0"
                  >
                    {savePermsMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {isRTL ? "حفظ التغييرات" : "Save Changes"}
                  </Button>
                )}
              </CardHeader>

              <CardContent className="pt-6 space-y-6">
                {loadingPerms || loadingRolePerms ? (
                  <div className="flex justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  Object.entries(groupedPermissions).map(([moduleKey, perms]) => {
                    const title = moduleTitles[moduleKey] || { ar: moduleKey, en: moduleKey };
                    return (
                      <div key={moduleKey} className="space-y-3">
                        <h4 className="text-sm font-semibold text-primary border-b pb-1.5 flex items-center justify-between">
                          <span>{isRTL ? title.ar : title.en}</span>
                          <span className="text-xs text-muted-foreground font-normal">
                            ({perms.length} {isRTL ? "صلاحيات" : "permissions"})
                          </span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {perms.map((p) => {
                            const isChecked = isOwner || permissionsSet.has(p.code);
                            return (
                              <div
                                key={p.code}
                                onClick={() => !isOwner && togglePermission(p.code)}
                                className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-sm transition-colors ${
                                  isOwner ? "opacity-80 cursor-default" : "cursor-pointer hover:bg-muted/40"
                                } ${isChecked ? "bg-primary/5 border-primary/30" : "bg-card border-border"}`}
                              >
                                <div className="mt-0.5 shrink-0">
                                  {isChecked ? (
                                    <CheckSquare className="w-4 h-4 text-primary" />
                                  ) : (
                                    <Square className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="space-y-0.5">
                                  <div className="font-medium text-xs">
                                    {isRTL ? p.name_ar : p.name_en}
                                  </div>
                                  <div className="font-mono text-[10px] text-muted-foreground">
                                    {p.code}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Role Dialog */}
      <Dialog open={newRoleDialogOpen} onOpenChange={setNewRoleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isRTL ? "إضافة دور وظيفي مخصص" : "Create Custom Role"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{isRTL ? "رمز الدور (بالإنجليزية)" : "Role Code (English)"} *</Label>
              <Input
                placeholder="e.g. storekeeper"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <Label>{isRTL ? "الاسم بالعربية" : "Name (Arabic)"} *</Label>
              <Input
                placeholder="أمين المستودع"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{isRTL ? "الاسم بالإنجليزية" : "Name (English)"}</Label>
              <Input
                placeholder="Storekeeper"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{isRTL ? "الوصف" : "Description"}</Label>
              <Input
                placeholder={isRTL ? "مسؤول عن حركة واستلام المواد" : "Responsible for warehouse operations"}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewRoleDialogOpen(false)}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={() => createRoleMutation.mutate()}
              disabled={createRoleMutation.isPending || !code.trim() || !nameAr.trim()}
            >
              {createRoleMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              {isRTL ? "إنشاء الدور" : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
