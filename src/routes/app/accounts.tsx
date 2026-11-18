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
import { FolderTree, Plus, Search, Folder, FileCode, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/accounts")({
  component: AccountsPage,
});

function AccountsPage() {
  const { tenant, hasPerm } = useTenant();
  const { isRTL } = useTranslation();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [openDialog, setOpenDialog] = useState(false);

  // Form states
  const [code, setCode] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [type, setType] = useState<"asset" | "liability" | "equity" | "revenue" | "expense">("expense");
  const [parentId, setParentId] = useState("");
  const [isGroup, setIsGroup] = useState(false);

  // Query Accounts
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["accounts_tree", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("code", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Create Account Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");
      if (!code || !nameAr) throw new Error(isRTL ? "الكود والاسم مطلوبان" : "Code and Arabic name required");

      const { data, error } = await supabase
        .from("accounts")
        .insert({
          tenant_id: tenant.id,
          code,
          name_ar: nameAr,
          name_en: nameEn || null,
          type,
          parent_id: parentId || null,
          is_group: isGroup,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تمت إضافة الحساب إلى شجرة الحسابات" : "Account added to chart of accounts");
      queryClient.invalidateQueries({ queryKey: ["accounts_tree"] });
      setOpenDialog(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل إضافة الحساب" : "Failed to add account"));
    },
  });

  const resetForm = () => {
    setCode("");
    setNameAr("");
    setNameEn("");
    setParentId("");
    setIsGroup(false);
  };

  const typesList = [
    { key: "all", label: isRTL ? "كافة الحسابات" : "All" },
    { key: "asset", label: isRTL ? "1. الأصول" : "1. Assets" },
    { key: "liability", label: isRTL ? "2. الخصوم والالتزامات" : "2. Liabilities" },
    { key: "equity", label: isRTL ? "3. حقوق الملكية" : "3. Equity" },
    { key: "revenue", label: isRTL ? "4. الإيرادات" : "4. Revenue" },
    { key: "expense", label: isRTL ? "5. المصروفات" : "5. Expenses" },
  ];

  const filtered = accounts.filter((a) => {
    const matchesTab = activeTab === "all" || a.type === activeTab;
    const matchesSearch =
      a.code.includes(search) ||
      a.name_ar.includes(search) ||
      (a.name_en && a.name_en.toLowerCase().includes(search.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FolderTree className="h-6 w-6 text-primary" />
            <span>{isRTL ? "شجرة ودليل الحسابات (Chart of Accounts)" : "Chart of Accounts"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "الهيكل المحاسبي الشامل للمؤسسة وفق معايير القيد المزدوج والتقارير المالية"
              : "Standard double-entry chart of accounts for financial reporting"}
          </p>
        </div>

        {hasPerm("accounts.manage") && (
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                <span>{isRTL ? "إضافة حساب جديد" : "Add Account"}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{isRTL ? "إضافة حساب جديد لدليل الحسابات" : "New Ledger Account"}</DialogTitle>
                <DialogDescription>
                  {isRTL ? "حدد كود ونوع الحساب وما إذا كان حساباً رئيسياً أو فرعياً" : "Fill account details"}
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
                    <Label htmlFor="acc-code">{isRTL ? "رقم / كود الحساب *" : "Account Code *"}</Label>
                    <Input
                      id="acc-code"
                      placeholder="1101"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{isRTL ? "النوع الرئيسي *" : "Account Type *"}</Label>
                    <Select value={type} onValueChange={(v: any) => setType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asset">{isRTL ? "أصول (Asset)" : "Asset"}</SelectItem>
                        <SelectItem value="liability">{isRTL ? "خصوم (Liability)" : "Liability"}</SelectItem>
                        <SelectItem value="equity">{isRTL ? "حقوق ملكية (Equity)" : "Equity"}</SelectItem>
                        <SelectItem value="revenue">{isRTL ? "إيرادات (Revenue)" : "Revenue"}</SelectItem>
                        <SelectItem value="expense">{isRTL ? "مصروفات (Expense)" : "Expense"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="acc-name-ar">{isRTL ? "اسم الحساب (بالعربية) *" : "Arabic Name *"}</Label>
                  <Input
                    id="acc-name-ar"
                    placeholder={isRTL ? "مثال: مصروفات الكهرباء والمياه" : "Name in Arabic"}
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="acc-name-en">{isRTL ? "الاسم (بالإنجليزية)" : "English Name"}</Label>
                  <Input
                    id="acc-name-en"
                    placeholder="e.g. Electricity & Water Expense"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{isRTL ? "الحساب الأب (الرئيسي)" : "Parent Account"}</Label>
                  <Select value={parentId} onValueChange={setParentId}>
                    <SelectTrigger>
                      <SelectValue placeholder={isRTL ? "بدون (حساب رئيسي أعلى)" : "None (Root)"} />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter((a) => a.is_group && a.type === type)
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} - {isRTL ? a.name_ar : a.name_en || a.name_ar}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="acc-group"
                    checked={isGroup}
                    onChange={(e) => setIsGroup(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="acc-group" className="text-sm font-medium cursor-pointer">
                    {isRTL ? "هذا الحساب رئيسي تجميعي (يحتوي حسابات فرعية)" : "Group account (holds sub-accounts)"}
                  </Label>
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                    {isRTL ? "إلغاء" : "Cancel"}
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                    {isRTL ? "حفظ الحساب" : "Save Account"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tabs and Search */}
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-1.5 border-b pb-3">
            {typesList.map((t) => (
              <Button
                key={t.key}
                variant={activeTab === t.key ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(t.key)}
                className="text-xs h-8"
              >
                {t.label}
              </Button>
            ))}
          </div>

          <div className="relative max-w-md">
            <Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRTL ? "بحث بالكود أو اسم الحساب..." : "Search by code or name..."}
              className="ps-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Accounts List / Hierarchy */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground text-xs font-semibold">
                  <th className="text-start py-3 px-4 w-32">{isRTL ? "كود الحساب" : "Code"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "اسم الحساب" : "Account Name"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "النوع" : "Type"}</th>
                  <th className="text-center py-3 px-4 w-32">{isRTL ? "طبيعة الحساب" : "Kind"}</th>
                  <th className="text-center py-3 px-4 w-28">{isRTL ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                      <span>{isRTL ? "جارٍ تحميل شجرة الحسابات..." : "Loading chart of accounts..."}</span>
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((acc) => (
                    <tr key={acc.id} className="hover:bg-muted/40 transition">
                      <td className="py-2.5 px-4 font-mono font-bold text-xs text-foreground">
                        {acc.code}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {acc.is_group ? (
                            <Folder className="h-4 w-4 text-amber-500 fill-amber-500/20 shrink-0" />
                          ) : (
                            <FileCode className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className={acc.is_group ? "font-bold text-foreground" : "text-muted-foreground"}>
                            {isRTL ? acc.name_ar : acc.name_en || acc.name_ar}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-xs capitalize text-muted-foreground">
                        {acc.type}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            acc.is_group
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {acc.is_group ? (isRTL ? "تجميعي" : "Group") : isRTL ? "فرعي تشغيلي" : "Posting"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                          {acc.is_active ? (isRTL ? "نشط" : "Active") : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      {isRTL ? "لا توجد حسابات مطابقة" : "No accounts found"}
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
