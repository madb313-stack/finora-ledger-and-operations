import { createFileRoute, Link } from "@tanstack/react-router";
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
import { toast } from "sonner";
import { Truck, Plus, Search, Phone, Mail, Loader2, FileText } from "lucide-react";

export const Route = createFileRoute("/app/suppliers")({
  component: SuppliersPage,
});

function SuppliersPage() {
  const { tenant } = useTenant();
  const { isRTL } = useTranslation();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [openDialog, setOpenDialog] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [paymentTermsDays, setPaymentTermsDays] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");

  // Query Suppliers list
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("parties")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("kind", "supplier")
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Query Balances
  const { data: balances = [] } = useQuery({
    queryKey: ["supplier_balances", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase.rpc("party_balances", {
        _tenant: tenant.id,
        _kind: "supplier",
      });
      if (error) return [];
      return (data as any[]) || [];
    },
    enabled: !!tenant?.id,
  });

  const balanceMap = new Map(balances.map((b: any) => [b.party_id, b]));

  // Mutation to Create Supplier
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");
      const payload: any = {
        tenant_id: tenant.id,
        kind: "supplier",
        name,
        contact_person: contactPerson || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        city: city || null,
        tax_number: taxNumber || null,
        payment_terms_days: paymentTermsDays ? parseInt(paymentTermsDays) : 0,
      };

      if (openingBalance && parseFloat(openingBalance) > 0) {
        payload.opening_balance = parseFloat(openingBalance);
      }

      const { data, error } = await supabase.rpc("create_party", { _p: payload });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تمت إضافة المورد بنجاح" : "Supplier added successfully");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier_balances"] });
      setOpenDialog(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل إضافة المورد" : "Failed to add supplier"));
    },
  });

  const resetForm = () => {
    setName("");
    setContactPerson("");
    setPhone("");
    setEmail("");
    setAddress("");
    setCity("");
    setTaxNumber("");
    setPaymentTermsDays("");
    setOpeningBalance("");
  };

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.phone && s.phone.includes(search)) ||
      (s.code && s.code.toLowerCase().includes(search.toLowerCase()))
  );

  const formatMoney = (val?: number) => {
    return new Intl.NumberFormat(isRTL ? "ar-SD" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            <span>{isRTL ? "دليل الموردين" : "Suppliers Directory"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "إدارة بيانات الموردين، شروط الدفع، وأرصدة المشتريات المستحقة"
              : "Manage supplier profiles, payment terms, and accounts payable"}
          </p>
        </div>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              <span>{isRTL ? "إضافة مورد جديد" : "Add Supplier"}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isRTL ? "تسجيل مورد جديد" : "Register New Supplier"}</DialogTitle>
              <DialogDescription>
                {isRTL
                  ? "أدخل بيانات المورد والرصيد الافتتاحي المستحق له إن وجد"
                  : "Enter supplier details and opening balance payable"}
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
                <Label htmlFor="s-name">{isRTL ? "اسم المورد / الشركة *" : "Supplier Name *"}</Label>
                <Input
                  id="s-name"
                  placeholder={isRTL ? "مثال: مصنع الأمل للأقمشة" : "e.g. Hope Textiles"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="s-contact">{isRTL ? "الشخص المسؤول" : "Contact Person"}</Label>
                  <Input
                    id="s-contact"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-phone">{isRTL ? "رقم الهاتف" : "Phone"}</Label>
                  <Input
                    id="s-phone"
                    dir="ltr"
                    placeholder="+249..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="s-email">{isRTL ? "البريد الإلكتروني" : "Email"}</Label>
                  <Input
                    id="s-email"
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-city">{isRTL ? "المدينة" : "City"}</Label>
                  <Input
                    id="s-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="s-address">{isRTL ? "العنوان" : "Address"}</Label>
                <Input
                  id="s-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="s-terms">{isRTL ? "فترة السداد (أيام)" : "Payment Terms (Days)"}</Label>
                  <Input
                    id="s-terms"
                    type="number"
                    min="0"
                    placeholder="30"
                    value={paymentTermsDays}
                    onChange={(e) => setPaymentTermsDays(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-ob">{isRTL ? "رصيد افتتاحي (دائن)" : "Opening Balance"}</Label>
                  <Input
                    id="s-ob"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                  {isRTL ? "إلغاء" : "Cancel"}
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                  {isRTL ? "حفظ المورد" : "Save Supplier"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRTL ? "بحث بالاسم، الهاتف أو الكود..." : "Search by name, phone or code..."}
              className="ps-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground text-xs font-semibold">
                  <th className="text-start py-3 px-4">{isRTL ? "الكود" : "Code"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "اسم المورد" : "Supplier Name"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "بيانات الاتصال" : "Contact"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "المدينة" : "City"}</th>
                  <th className="text-end py-3 px-4">{isRTL ? "المبلغ المستحق له" : "Payable Due"}</th>
                  <th className="text-center py-3 px-4">{isRTL ? "فواتير مفتوحة" : "Open Bills"}</th>
                  <th className="text-center py-3 px-4">{isRTL ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                      <span>{isRTL ? "جارٍ تحميل الموردين..." : "Loading suppliers..."}</span>
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((s) => {
                    const b = balanceMap.get(s.id);
                    const balAmount = Number(b?.balance || 0);
                    return (
                      <tr key={s.id} className="hover:bg-muted/40 transition">
                        <td className="py-3 px-4 font-mono font-medium text-xs">{s.code}</td>
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {s.name}
                          {s.contact_person && (
                            <span className="block text-xs font-normal text-muted-foreground">
                              {s.contact_person}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {s.phone && (
                            <div className="flex items-center gap-1.5" dir="ltr">
                              <Phone className="h-3 w-3" />
                              <span>{s.phone}</span>
                            </div>
                          )}
                          {s.email && (
                            <div className="flex items-center gap-1.5" dir="ltr">
                              <Mail className="h-3 w-3" />
                              <span>{s.email}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs">{s.city || "—"}</td>
                        <td className="py-3 px-4 text-end font-bold">
                          <span className={balAmount > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}>
                            {formatMoney(balAmount)} {tenant?.base_currency}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {b?.open_invoices && b.open_invoices > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              {b.open_invoices}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Link to="/app/reports/account-ledger">
                            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                              <FileText className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">{isRTL ? "كشف حساب" : "Statement"}</span>
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      {isRTL ? "لم يتم العثور على أي موردين" : "No suppliers found"}
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
