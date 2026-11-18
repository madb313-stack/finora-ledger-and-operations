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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Coins,
  TrendingUp,
  Plus,
  Loader2,
  Calendar,
  CheckCircle2,
  ArrowRightLeft,
} from "lucide-react";

export const Route = createFileRoute("/app/settings/currencies")({
  component: CurrenciesSettingsPage,
});

interface Currency {
  code: string;
  name_ar: string;
  name_en: string;
  symbol: string;
  decimals: number;
  is_active: boolean;
}

interface ExchangeRate {
  id: string;
  tenant_id: string;
  currency_code: string;
  rate_date: string;
  rate: number;
  created_at: string;
}

function CurrenciesSettingsPage() {
  const { tenant, hasPerm } = useTenant();
  const { isRTL } = useTranslation();
  const queryClient = useQueryClient();

  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [rateDate, setRateDate] = useState(new Date().toISOString().split("T")[0]);
  const [rateValue, setRateValue] = useState("");
  const [filterCurrency, setFilterCurrency] = useState<string>("ALL");

  const canManage = hasPerm("currencies.manage");
  const baseCurrency = tenant?.base_currency || "SDG";

  // Load supported currencies
  const { data: currencies, isLoading: loadingCurrencies } = useQuery({
    queryKey: ["currencies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("currencies")
        .select("*")
        .eq("is_active", true)
        .order("code");

      if (error) throw error;
      return (data || []) as Currency[];
    },
  });

  // Load latest exchange rates for tenant
  const { data: exchangeRates, isLoading: loadingRates } = useQuery({
    queryKey: ["exchange_rates", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("exchange_rates")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("rate_date", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as ExchangeRate[];
    },
    enabled: !!tenant?.id,
  });

  const saveRateMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");
      const numRate = parseFloat(rateValue);
      if (!numRate || numRate <= 0) {
        throw new Error(isRTL ? "يرجى إدخال سعر صرف صالح أكبر من الصفر" : "Valid positive exchange rate is required");
      }

      const { error } = await supabase.from("exchange_rates").upsert(
        {
          tenant_id: tenant.id,
          currency_code: selectedCurrency,
          rate_date: rateDate,
          rate: numRate,
        },
        { onConflict: "tenant_id,currency_code,rate_date" }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exchange_rates", tenant?.id] });
      toast.success(isRTL ? "تم تحديث سعر الصرف بنجاح" : "Exchange rate saved successfully");
      setRateDialogOpen(false);
      setRateValue("");
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل حفظ سعر الصرف" : "Failed to save rate"));
    },
  });

  const filteredRates = exchangeRates?.filter((r) => {
    if (filterCurrency === "ALL") return true;
    return r.currency_code === filterCurrency;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Coins className="w-6 h-6 text-primary" />
            {isRTL ? "العملات وأسعار الصرف" : "Currencies & Exchange Rates"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "إدارة العملات المدعومة وتحديث أسعار الصرف اليومية مقابل عملة الأساس"
              : "Manage operational currencies and daily exchange rates against the base currency"}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setRateDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {isRTL ? "تسجيل سعر صرف جديد" : "Record Exchange Rate"}
          </Button>
        )}
      </div>

      {/* Base currency & highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary font-semibold">
              {isRTL ? "العملة الأساسية للنظام" : "Base Currency"}
            </CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <span>{baseCurrency}</span>
              <span className="text-sm font-normal text-muted-foreground">
                ({currencies?.find((c) => c.code === baseCurrency)?.[isRTL ? "name_ar" : "name_en"] || baseCurrency})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {isRTL
                ? "يتم قيد كافة القيود المحاسبية وإعداد القوائم المالية بهذه العملة افتراضياً."
                : "All general ledger entries and reports are calculated in this primary currency."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{isRTL ? "العملات النشطة" : "Active Currencies"}</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {loadingCurrencies ? <Loader2 className="w-5 h-5 animate-spin" /> : currencies?.length || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {isRTL ? "العملات المتاحة للفواتير وحسابات الخزينة والبنوك" : "Currencies available for multi-currency transactions"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{isRTL ? "أسعار الصرف المسجلة" : "Logged Rates"}</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span>{loadingRates ? <Loader2 className="w-5 h-5 animate-spin" /> : exchangeRates?.length || 0}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {isRTL ? "سجلات تاريخية لتحويل العملات تلقائياً" : "Historical entries for automated revaluation"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Available Currencies List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            {isRTL ? "دليل العملات المعرفة" : "Available Currencies"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {currencies?.map((curr) => {
              const isBase = curr.code === baseCurrency;
              return (
                <div
                  key={curr.code}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    isBase ? "bg-primary/10 border-primary" : "bg-card hover:border-muted-foreground/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm font-mono">{curr.code}</span>
                    <span className="text-xs text-muted-foreground">{curr.symbol}</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {isRTL ? curr.name_ar : curr.name_en}
                  </div>
                  {isBase && (
                    <div className="mt-2 text-[10px] font-semibold text-primary">
                      {isRTL ? "العملة الأساس" : "Base"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Exchange Rates History */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg">{isRTL ? "سجل أسعار الصرف" : "Exchange Rates History"}</CardTitle>
            <CardDescription>
              {isRTL
                ? `أسعار الصرف اليومية للعملات الأجنبية مقابل ${baseCurrency}`
                : `Daily exchange rates of foreign currencies against 1 unit in ${baseCurrency}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">
              {isRTL ? "تصفية بالعملة:" : "Filter Currency:"}
            </Label>
            <select
              value={filterCurrency}
              onChange={(e) => setFilterCurrency(e.target.value)}
              className="h-9 px-3 py-1 rounded-md border border-input bg-background text-sm"
            >
              <option value="ALL">{isRTL ? "كافة العملات" : "All Currencies"}</option>
              {currencies
                ?.filter((c) => c.code !== baseCurrency)
                .map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {isRTL ? c.name_ar : c.name_en}
                  </option>
                ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loadingRates ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredRates?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isRTL ? "لا توجد أسعار صرف مسجلة لهذه العملة" : "No exchange rates recorded yet"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-start">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground text-xs uppercase">
                    <th className="py-2.5 px-4 text-start">{isRTL ? "التاريخ" : "Date"}</th>
                    <th className="py-2.5 px-4 text-start">{isRTL ? "العملة" : "Currency"}</th>
                    <th className="py-2.5 px-4 text-start">{isRTL ? "السعر" : "Rate"}</th>
                    <th className="py-2.5 px-4 text-start">{isRTL ? "المعادلة" : "Formula"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRates?.map((item) => {
                    const c = currencies?.find((x) => x.code === item.currency_code);
                    return (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="py-2.5 px-4 font-mono text-xs">{item.rate_date}</td>
                        <td className="py-2.5 px-4 font-semibold">
                          <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">
                            {item.currency_code}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {c ? (isRTL ? c.name_ar : c.name_en) : ""}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono font-medium">
                          {Number(item.rate).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4,
                          })}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-muted-foreground font-mono" dir="ltr">
                          1 {item.currency_code} = {Number(item.rate).toLocaleString()} {baseCurrency}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Exchange Rate Dialog */}
      <Dialog open={rateDialogOpen} onOpenChange={setRateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isRTL ? "تسجيل سعر صرف يومي" : "Record Daily Exchange Rate"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{isRTL ? "العملة الأجنبية" : "Currency"}</Label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {currencies
                  ?.filter((c) => c.code !== baseCurrency)
                  .map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {isRTL ? c.name_ar : c.name_en} ({c.symbol})
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>{isRTL ? "تاريخ السعر" : "Rate Date"}</Label>
              <Input
                type="date"
                value={rateDate}
                onChange={(e) => setRateDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                {isRTL
                  ? `سعر الصرف (1 ${selectedCurrency} = كم ${baseCurrency})`
                  : `Exchange Rate (1 ${selectedCurrency} = X ${baseCurrency})`}
              </Label>
              <Input
                type="number"
                step="0.0001"
                placeholder="e.g. 2500.00"
                value={rateValue}
                onChange={(e) => setRateValue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRateDialogOpen(false)}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={() => saveRateMutation.mutate()}
              disabled={saveRateMutation.isPending || !rateValue}
            >
              {saveRateMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              {isRTL ? "حفظ السعر" : "Save Rate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
