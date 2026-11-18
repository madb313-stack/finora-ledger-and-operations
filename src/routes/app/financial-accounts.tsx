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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Landmark, Wallet, Plus, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/financial-accounts")({
  component: FinancialAccountsPage,
});

function FinancialAccountsPage() {
  const { tenant, hasPerm } = useTenant();
  const { isRTL } = useTranslation();
  const queryClient = useQueryClient();

  const [openDialog, setOpenDialog] = useState(false);
  const [kind, setKind] = useState<"cash" | "bank">("bank");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState(tenant?.base_currency || "SDG");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [iban, setIban] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");

  // Query Financial Accounts
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["financial_accounts", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("financial_accounts")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Query Balances
  const { data: balances = [] } = useQuery({
    queryKey: ["fa_balances", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase.rpc("financial_account_balances", {
        _tenant: tenant.id,
      });
      if (error) return [];
      return (data as any[]) || [];
    },
    enabled: !!tenant?.id,
  });

  const balanceMap = new Map(balances.map((b: any) => [b.financial_account_id, b]));

  // Mutation to Create Financial Account
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");
      const payload: any = {
        tenant_id: tenant.id,
        kind,
        name,
        currency_code: currency,
        bank_name: kind === "bank" ? bankName : null,
        account_number: kind === "bank" ? accountNumber : null,
        iban: kind === "bank" ? iban : null,
      };

      if (openingBalance && parseFloat(openingBalance) > 0) {
        payload.opening_balance = parseFloat(openingBalance);
      }

      const { data, error } = await supabase.rpc("create_financial_account", { _p: payload });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم إنشاء الحساب المالي بنجاح" : "Financial account created");
      queryClient.invalidateQueries({ queryKey: ["financial_accounts"] });
      queryClient.invalidateQueries({ queryKey: ["fa_balances"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_summary"] });
      setOpenDialog(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل إنشاء الحساب" : "Failed to create account"));
    },
  });

  const resetForm = () => {
    setName("");
    setBankName("");
    setAccountNumber("");
    setIban("");
    setOpeningBalance("");
  };

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
            <Landmark className="h-6 w-6 text-primary" />
            <span>{isRTL ? "الحسابات المالية (الخزائن والبنوك)" : "Treasury & Bank Accounts"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "إدارة حسابات النقدية، بطاقات الدفع، البنوك (مثل بنكك)، ومتابعة السيولة"
              : "Manage cash boxes, bank accounts, mobile money (e.g. Bankak), and balances"}
          </p>
        </div>

        {hasPerm("cash.manage") && (
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                <span>{isRTL ? "إضافة حساب مالي جديد" : "Add Account"}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{isRTL ? "إنشاء حساب مالي جديد" : "New Financial Account"}</DialogTitle>
                <DialogDescription>
                  {isRTL
                    ? "اختر نوع الحساب (خزينة نقدية أو حساب بنكي) وأدخل بياناته"
                    : "Choose account type (Cash box or Bank account)"}
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
                    <Label>{isRTL ? "نوع الحساب *" : "Account Type *"}</Label>
                    <Select value={kind} onValueChange={(v: any) => setKind(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank">{isRTL ? "حساب بنكي / بنكك" : "Bank Account"}</SelectItem>
                        <SelectItem value="cash">{isRTL ? "خزينة نقدية / كاش" : "Cash Box"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{isRTL ? "العملة" : "Currency"}</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue />
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

                <div className="space-y-2">
                  <Label htmlFor="fa-name">{isRTL ? "اسم الحساب *" : "Account Name *"}</Label>
                  <Input
                    id="fa-name"
                    placeholder={
                      kind === "bank"
                        ? isRTL ? "مثال: بنك الخرطوم (بنكك)" : "e.g. Bank of Khartoum"
                        : isRTL ? "مثال: الخزينة الرئيسية" : "e.g. Main Cash Drawer"
                    }
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                {kind === "bank" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="fa-bname">{isRTL ? "اسم البنك" : "Bank Name"}</Label>
                      <Input
                        id="fa-bname"
                        placeholder={isRTL ? "بنك الخرطوم / فيصل" : "Bank Name"}
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fa-acc">{isRTL ? "رقم الحساب" : "Account Number"}</Label>
                      <Input
                        id="fa-acc"
                        dir="ltr"
                        placeholder="1234567"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="fa-ob">{isRTL ? "الرصيد الافتتاحي" : "Opening Balance"}</Label>
                  <Input
                    id="fa-ob"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                  />
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

      {/* Accounts Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
            <span>{isRTL ? "جارٍ تحميل الحسابات المالية..." : "Loading accounts..."}</span>
          </div>
        ) : accounts.length > 0 ? (
          accounts.map((acc) => {
            const b = balanceMap.get(acc.id);
            const balanceAmount = Number(b?.balance || 0);
            return (
              <Card key={acc.id} className="shadow-sm hover:shadow-md transition">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                        acc.kind === "bank"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {acc.kind === "bank" ? <Landmark className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">{acc.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {acc.kind === "bank" ? acc.bank_name || (isRTL ? "حساب مصرفي" : "Bank") : isRTL ? "خزينة نقدية" : "Cash"}
                      </CardDescription>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-muted">
                    {acc.currency_code}
                  </span>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {formatMoney(balanceAmount)} {acc.currency_code}
                  </div>
                  {acc.account_number && (
                    <p className="text-xs text-muted-foreground mt-2 font-mono" dir="ltr">
                      Acc: {acc.account_number}
                    </p>
                  )}
                  {b?.last_activity && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {isRTL ? "آخر حركة:" : "Last activity:"} {b.last_activity}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-2xl border">
            <Landmark className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="font-semibold">{isRTL ? "لا توجد حسابات مالية مضافة" : "No accounts created yet"}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {isRTL ? "أضف خزينة أو حساباً بنكياً لتسجيل المقبوضات والمدفوعات" : "Create cash box or bank account"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
