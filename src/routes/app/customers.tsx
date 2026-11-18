import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { DEMO_CUSTOMERS } from "@/lib/demo-data";
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
import { Users, Plus, Search, Phone, Mail, MapPin, Loader2, ArrowRight, FileText } from "lucide-react";

export const Route = createFileRoute("/app/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  const { tenant } = useTenant();
  const { isDemoMode } = useAuth();
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
  const [creditLimit, setCreditLimit] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");

  // Query Customers list
  const { data: dbCustomers = [], isLoading } = useQuery({
    queryKey: ["customers", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("parties")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("kind", "customer")
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id && !isDemoMode,
  });

  const customers = useMemo(() => {
    if (isDemoMode || (!isLoading && dbCustomers.length === 0)) {
      return DEMO_CUSTOMERS;
    }
    return dbCustomers;
  }, [isDemoMode, dbCustomers, isLoading]);

  // Query Balances
  const { data: balances = [] } = useQuery({
    queryKey: ["customer_balances", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase.rpc("party_balances", {
        _tenant: tenant.id,
        _kind: "customer",
      });
      if (error) return [];
      return (data as any[]) || [];
    },
    enabled: !!tenant?.id,
  });

  const balanceMap = new Map(balances.map((b: any) => [b.party_id, b]));

  // Mutation to Create Customer
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");
      const payload: any = {
        tenant_id: tenant.id,
        kind: "customer",
        name,
        contact_person: contactPerson || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        city: city || null,
        tax_number: taxNumber || null,
        credit_limit: creditLimit ? parseFloat(creditLimit) : 0,
      };

      if (openingBalance && parseFloat(openingBalance) > 0) {
        payload.opening_balance = parseFloat(openingBalance);
      }

      const { data, error } = await supabase.rpc("create_party", { _p: payload });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تمت إضافة العميل بنجاح" : "Customer added successfully");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer_balances"] });
      setOpenDialog(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل إضافة العميل" : "Failed to add customer"));
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
    setCreditLimit("");
    setOpeningBalance("");
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search)) ||
      (c.code && c.code.toLowerCase().includes(search.toLowerCase()))
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
            <Users className="h-6 w-6 text-primary" />
            <span>{isRTL ? "دليل العملاء" : "Customers Directory"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "إدارة بيانات العملاء، الحدود الائتمانية، وأرصدة الديون المستحقة"
              : "Manage customer profiles, credit limits, and outstanding balances"}
          </p>
        </div>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              <span>{isRTL ? "إضافة عميل جديد" : "Add Customer"}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isRTL ? "تسجيل عميل جديد" : "Register New Customer"}</DialogTitle>
              <DialogDescription>
                {isRTL
                  ? "أدخل تفاصيل العميل والرصيد الافتتاحي إن وجد"
                  : "Enter customer information and opening balance"}
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
                <Label htmlFor="c-name">{isRTL ? "اسم العميل / الشركة *" : "Customer Name *"}</Label>
                <Input
                  id="c-name"
                  placeholder={isRTL ? "مثال: شركة النيل للتجارة" : "e.g. Nile Trading Co."}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="c-contact">{isRTL ? "الشخص المسؤول" : "Contact Person"}</Label>
                  <Input
                    id="c-contact"
                    placeholder={isRTL ? "محمد علي" : "John Doe"}
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-phone">{isRTL ? "رقم الهاتف" : "Phone"}</Label>
                  <Input
                    id="c-phone"
                    dir="ltr"
                    placeholder="+249..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="c-email">{isRTL ? "البريد الإلكتروني" : "Email"}</Label>
                  <Input
                    id="c-email"
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-city">{isRTL ? "المدينة" : "City"}</Label>
                  <Input
                    id="c-city"
                    placeholder={isRTL ? "الخرطوم / بحري" : "Khartoum"}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="c-address">{isRTL ? "العنوان بالتفصيل" : "Address"}</Label>
                <Input
                  id="c-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="c-credit">{isRTL ? "سقف الائتمان" : "Credit Limit"}</Label>
                  <Input
                    id="c-credit"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-ob">{isRTL ? "رصيد افتتاحي (مدين)" : "Opening Balance"}</Label>
                  <Input
                    id="c-ob"
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
                  {isRTL ? "حفظ العميل" : "Save Customer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRTL ? "بحث بالاسم، رقم الهاتف أو الكود..." : "Search by name, phone or code..."}
              className="ps-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground text-xs font-semibold">
                  <th className="text-start py-3 px-4">{isRTL ? "الكود" : "Code"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "اسم العميل" : "Customer Name"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "بيانات الاتصال" : "Contact"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "المدينة" : "City"}</th>
                  <th className="text-end py-3 px-4">{isRTL ? "الرصيد المستحق" : "Balance Due"}</th>
                  <th className="text-end py-3 px-4">{isRTL ? "سقف الائتمان" : "Credit Limit"}</th>
                  <th className="text-center py-3 px-4">{isRTL ? "فواتير معلقة" : "Open Invoices"}</th>
                  <th className="text-center py-3 px-4">{isRTL ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                      <span>{isRTL ? "جارٍ تحميل العملاء..." : "Loading customers..."}</span>
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((c) => {
                    const b = balanceMap.get(c.id);
                    const balAmount = Number(b?.balance || 0);
                    return (
                      <tr key={c.id} className="hover:bg-muted/40 transition">
                        <td className="py-3 px-4 font-mono font-medium text-xs">{c.code}</td>
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {c.name}
                          {c.contact_person && (
                            <span className="block text-xs font-normal text-muted-foreground">
                              {c.contact_person}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {c.phone && (
                            <div className="flex items-center gap-1.5" dir="ltr">
                              <Phone className="h-3 w-3" />
                              <span>{c.phone}</span>
                            </div>
                          )}
                          {c.email && (
                            <div className="flex items-center gap-1.5" dir="ltr">
                              <Mail className="h-3 w-3" />
                              <span>{c.email}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs">{c.city || "—"}</td>
                        <td className="py-3 px-4 text-end font-bold">
                          <span className={balAmount > 0 ? "text-purple-600 dark:text-purple-400" : "text-foreground"}>
                            {formatMoney(balAmount)} {tenant?.base_currency}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-end text-xs text-muted-foreground">
                          {c.credit_limit > 0 ? `${formatMoney(c.credit_limit)} ${tenant?.base_currency}` : "—"}
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
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      {isRTL ? "لم يتم العثور على أي عملاء" : "No customers found"}
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
