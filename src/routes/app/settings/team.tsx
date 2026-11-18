import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { DEMO_USERS } from "@/lib/demo-data";
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
  UserPlus,
  Users,
  Shield,
  Mail,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Edit2,
  Building2,
} from "lucide-react";

export const Route = createFileRoute("/app/settings/team")({
  component: TeamSettingsPage,
});

interface Member {
  id: string;
  tenant_id: string;
  user_id: string;
  role_id: string;
  status: "active" | "disabled";
  default_branch_id: string | null;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  };
  role?: {
    id: string;
    code: string;
    name_ar: string;
    name_en: string | null;
  };
  branch?: {
    id: string;
    code: string;
    name: string;
  };
}

interface Invitation {
  id: string;
  tenant_id: string;
  email: string;
  role_id: string;
  status: "pending" | "accepted" | "revoked";
  created_at: string;
  role?: {
    name_ar: string;
    name_en: string | null;
  };
}

function TeamSettingsPage() {
  const { tenant, hasPerm } = useTenant();
  const { user: currentUser, isDemoMode } = useAuth();
  const { isRTL } = useTranslation();
  const queryClient = useQueryClient();

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editRoleId, setEditRoleId] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "disabled">("active");
  const [editBranchId, setEditBranchId] = useState<string>("");

  const canManage = hasPerm("users.manage");

  // Load roles
  const { data: roles } = useQuery({
    queryKey: ["tenant_roles", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("tenant_roles")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("is_system", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Load branches
  const { data: branches } = useQuery({
    queryKey: ["branches", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("branches")
        .select("id, code, name")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Load members with profiles & roles
  const { data: dbMembers, isLoading: loadingMembers } = useQuery({
    queryKey: ["tenant_members", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("tenant_memberships")
        .select(`
          id,
          tenant_id,
          user_id,
          role_id,
          status,
          default_branch_id,
          created_at,
          profile:profiles(full_name, email, phone),
          role:tenant_roles(id, code, name_ar, name_en),
          branch:branches(id, code, name)
        `)
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as Member[];
    },
    enabled: !!tenant?.id && !isDemoMode,
  });

  const members = useMemo(() => {
    if (isDemoMode || (!loadingMembers && (!dbMembers || dbMembers.length === 0))) {
      return DEMO_USERS.map((u) => ({
        id: u.id,
        tenant_id: tenant?.id || "demo",
        user_id: u.id,
        role_id: "role-" + u.role,
        status: "active" as const,
        default_branch_id: null,
        created_at: new Date().toISOString(),
        profile: {
          full_name: u.name,
          email: u.email,
          phone: "+249 912 345678",
        },
        role: {
          id: "role-" + u.role,
          code: u.role,
          name_ar: u.role_title_ar,
          name_en: u.role,
        },
        branch: {
          id: "branch-hq",
          code: "HQ",
          name: u.branch_name,
        },
      })) as Member[];
    }
    return dbMembers || [];
  }, [isDemoMode, dbMembers, loadingMembers, tenant?.id]);

  // Load pending invitations
  const { data: invitations, isLoading: loadingInvites } = useQuery({
    queryKey: ["tenant_invitations", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("tenant_invitations")
        .select(`
          id,
          tenant_id,
          email,
          role_id,
          status,
          created_at,
          role:tenant_roles(name_ar, name_en)
        `)
        .eq("tenant_id", tenant.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Invitation[];
    },
    enabled: !!tenant?.id,
  });

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");
      if (!inviteEmail || !inviteRoleId) {
        throw new Error(isRTL ? "يرجى إدخال البريد الإلكتروني واختيار الدور" : "Email and role are required");
      }

      const { data, error } = await supabase.rpc("invite_member", {
        _tenant: tenant.id,
        _email: inviteEmail.trim().toLowerCase(),
        _role: inviteRoleId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant_invitations", tenant?.id] });
      toast.success(isRTL ? "تم إرسال دعوة الانضمام بنجاح" : "Invitation sent successfully");
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRoleId("");
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل إرسال الدعوة" : "Failed to send invitation"));
    },
  });

  // Revoke invitation mutation
  const revokeMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase.rpc("revoke_invitation", {
        _id: inviteId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant_invitations", tenant?.id] });
      toast.success(isRTL ? "تم إلغاء الدعوة بنجاح" : "Invitation revoked");
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل إلغاء الدعوة" : "Failed to revoke"));
    },
  });

  // Edit member mutation
  const updateMemberMutation = useMutation({
    mutationFn: async () => {
      if (!editingMember) return;
      const { error } = await supabase.rpc("update_member", {
        _membership: editingMember.id,
        _role: editRoleId,
        _status: editStatus,
        _branch: editBranchId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant_members", tenant?.id] });
      toast.success(isRTL ? "تم تحديث بيانات العضو بنجاح" : "Member updated successfully");
      setEditDialogOpen(false);
      setEditingMember(null);
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل تحديث العضو" : "Failed to update member"));
    },
  });

  const openEdit = (member: Member) => {
    setEditingMember(member);
    setEditRoleId(member.role_id);
    setEditStatus(member.status);
    setEditBranchId(member.default_branch_id || "");
    setEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            {isRTL ? "فريق العمل والمستخدمين" : "Team & User Access"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "إدارة حسابات مستخدمي الشركة ودعوة أعضاء الفريق وتعيين الأدوار"
              : "Manage company team members, pending invites, and assign operational roles"}
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              if (roles && roles.length > 0 && !inviteRoleId) {
                setInviteRoleId(roles[0].id);
              }
              setInviteDialogOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            {isRTL ? "دعوة عضو جديد" : "Invite Member"}
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{isRTL ? "الأعضاء الحاليين" : "Active Members"}</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span>{loadingMembers ? <Loader2 className="w-5 h-5 animate-spin" /> : members?.length || 0}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {isRTL ? "المستخدمون الذين لديهم صلاحية تسجيل الدخول" : "Users currently authorized to access this tenant"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{isRTL ? "الدعوات المعلقة" : "Pending Invitations"}</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <span>{loadingInvites ? <Loader2 className="w-5 h-5 animate-spin" /> : invitations?.length || 0}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {isRTL ? "دعوات بانتظار قبول المستخدم" : "Invitations awaiting user acceptance"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{isRTL ? "قائمة الأعضاء" : "Members Directory"}</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingMembers ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : members?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isRTL ? "لا يوجد أعضاء مسجلين" : "No members found"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-start">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground text-xs uppercase">
                    <th className="py-2.5 px-4 text-start">{isRTL ? "المستخدم" : "User"}</th>
                    <th className="py-2.5 px-4 text-start">{isRTL ? "الدور" : "Role"}</th>
                    <th className="py-2.5 px-4 text-start">{isRTL ? "الفرع الافتراضي" : "Branch"}</th>
                    <th className="py-2.5 px-4 text-start">{isRTL ? "الحالة" : "Status"}</th>
                    {canManage && <th className="py-2.5 px-4 text-end">{isRTL ? "الإجراءات" : "Actions"}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {members?.map((m) => {
                    const isSelf = currentUser?.id === m.user_id;
                    return (
                      <tr key={m.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-sm">
                            {m.profile?.full_name || (isRTL ? "مستخدم جديد" : "User")}
                            {isSelf && (
                              <span className="text-[11px] font-normal bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-2">
                                {isRTL ? "أنت" : "You"}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono" dir="ltr">
                            {m.profile?.email || ""}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground font-medium">
                            <Shield className="w-3 h-3 text-primary" />
                            {isRTL ? m.role?.name_ar : m.role?.name_en || m.role?.name_ar}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {m.branch ? (
                            <span className="inline-flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5" />
                              {m.branch.name}
                            </span>
                          ) : (
                            <span className="italic">{isRTL ? "كافة الفروع" : "All Branches"}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                              m.status === "active"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                            }`}
                          >
                            {m.status === "active" ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                {isRTL ? "نشط" : "Active"}
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" />
                                {isRTL ? "معطل" : "Disabled"}
                              </>
                            )}
                          </span>
                        </td>
                        {canManage && (
                          <td className="py-3 px-4 text-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(m)}
                              className="h-8 px-2 text-xs"
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-1" />
                              {isRTL ? "تعديل" : "Edit"}
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations Table */}
      {invitations && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="w-5 h-5 text-amber-500" />
              {isRTL ? "الدعوات المعلقة" : "Pending Invitations"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-start">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground text-xs uppercase">
                    <th className="py-2.5 px-4 text-start">{isRTL ? "البريد الإلكتروني" : "Email"}</th>
                    <th className="py-2.5 px-4 text-start">{isRTL ? "الدور المقترح" : "Role"}</th>
                    <th className="py-2.5 px-4 text-start">{isRTL ? "تاريخ الدعوة" : "Invited On"}</th>
                    {canManage && <th className="py-2.5 px-4 text-end">{isRTL ? "إلغاء" : "Revoke"}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-4 font-mono text-xs" dir="ltr">
                        {inv.email}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-medium">
                        {isRTL ? inv.role?.name_ar : inv.role?.name_en || inv.role?.name_ar}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-muted-foreground">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </td>
                      {canManage && (
                        <td className="py-2.5 px-4 text-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => revokeMutation.mutate(inv.id)}
                            disabled={revokeMutation.isPending}
                            className="text-destructive hover:bg-destructive/10 h-8 px-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Member Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isRTL ? "دعوة عضو جديد لفريق العمل" : "Invite Team Member"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{isRTL ? "البريد الإلكتروني" : "Email Address"} *</Label>
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <Label>{isRTL ? "الدور والصلاحيات" : "Role"} *</Label>
              <select
                value={inviteRoleId}
                onChange={(e) => setInviteRoleId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">{isRTL ? "اختر الدور..." : "Select role..."}</option>
                {roles?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {isRTL ? r.name_ar : r.name_en || r.name_ar}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={inviteMutation.isPending || !inviteEmail || !inviteRoleId}
            >
              {inviteMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              {isRTL ? "إرسال الدعوة" : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isRTL ? "تعديل صلاحيات العضو" : "Edit Member Access"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{isRTL ? "الدور الوظيفي" : "Role"}</Label>
              <select
                value={editRoleId}
                onChange={(e) => setEditRoleId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {roles?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {isRTL ? r.name_ar : r.name_en || r.name_ar}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>{isRTL ? "الفرع الافتراضي" : "Default Branch"}</Label>
              <select
                value={editBranchId}
                onChange={(e) => setEditBranchId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">{isRTL ? "كافة الفروع (غير محدد)" : "All Branches (Unrestricted)"}</option>
                {branches?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>{isRTL ? "حالة الحساب" : "Account Status"}</Label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="active">{isRTL ? "نشط - مسموح بالدخول" : "Active - Allowed"}</option>
                <option value="disabled">{isRTL ? "معطل - إيقاف الدخول مؤقتاً" : "Disabled - Blocked"}</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={() => updateMemberMutation.mutate()}
              disabled={updateMemberMutation.isPending}
            >
              {updateMemberMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              {isRTL ? "تحديث" : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
