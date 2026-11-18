import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BookOpen, Plus, Trash2, ArrowLeft, Loader2, Save, CheckCircle2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/app/journal-entries_/new")({
  component: NewJournalEntryPage,
});

interface JournalLine {
  id: string;
  account_id: string;
  description: string;
  debit: string;
  credit: string;
}

function NewJournalEntryPage() {
  const { tenant, hasPerm } = useTenant();
  const { isRTL } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");

  const [lines, setLines] = useState<JournalLine[]>([
    { id: "1", account_id: "", description: "", debit: "", credit: "" },
    { id: "2", account_id: "", description: "", debit: "", credit: "" },
  ]);

  // Query Posting Accounts (is_group = false)
  const { data: accounts = [] } = useQuery({
    queryKey: ["posting_accounts", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("accounts")
        .select("id, code, name_ar, name_en, type")
        .eq("tenant_id", tenant.id)
        .eq("is_group", false)
        .eq("is_active", true)
        .order("code");
      if (error) return [];
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  const updateLine = (index: number, field: keyof JournalLine, val: string) => {
    setLines((prev) => {
      const copy = [...prev];
      if (field === "debit" && parseFloat(val) > 0) {
        copy[index] = { ...copy[index], debit: val, credit: "" };
      } else if (field === "credit" && parseFloat(val) > 0) {
        copy[index] = { ...copy[index], credit: val, debit: "" };
      } else {
        copy[index] = { ...copy[index], [field]: val };
      }
      return copy;
    });
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { id: String(Date.now()), account_id: "", description: "", debit: "", credit: "" },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const totalDebit = lines.reduce((acc, l) => acc + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((acc, l) => acc + (parseFloat(l.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.001 && totalDebit > 0;

  // Mutation to Save
  const saveMutation = useMutation({
    mutationFn: async ({ shouldPost }: { shouldPost: boolean }) => {
      if (!tenant?.id) throw new Error("No tenant");
      if (!description.trim()) throw new Error(isRTL ? "بيان القيد مطلوب" : "Description required");

      const validLines = lines.filter(
        (l) => l.account_id && ((parseFloat(l.debit) || 0) > 0 || (parseFloat(l.credit) || 0) > 0)
      );

      if (validLines.length < 2) {
        throw new Error(isRTL ? "يجب إدخال طرفين على الأقل للقيد" : "At least two lines required");
      }

      if (shouldPost && !isBalanced) {
        throw new Error(isRTL ? "لا يمكن ترحيل قيد غير متوازن" : "Debits and Credits must balance to post");
      }

      const payload = {
        tenant_id: tenant.id,
        entry_date: entryDate,
        description: description.trim(),
        post: shouldPost,
        lines: validLines.map((l) => ({
          account_id: l.account_id,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          description: l.description || description,
        })),
      };

      const { data, error } = await supabase.rpc("save_journal_entry", { _p: payload });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { shouldPost }) => {
      toast.success(
        shouldPost
          ? isRTL ? "تم إنشاء وترحيل القيد بنجاح" : "Journal entry posted!"
          : isRTL ? "تم حفظ القيد كمسودة" : "Draft saved!"
      );
      queryClient.invalidateQueries({ queryKey: ["journal_entries_list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_summary"] });
      navigate({ to: "/app/journal-entries" });
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل حفظ القيد" : "Error saving entry"));
    },
  });

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat(isRTL ? "ar-SD" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/app/journal-entries">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <span>{isRTL ? "إنشاء قيد يومية محاسبي" : "New Journal Entry"}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {isRTL ? "إثبات قيود التسوية والعمليات المالية المزدوجة" : "Double-entry general ledger posting"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => saveMutation.mutate({ shouldPost: false })}
            disabled={saveMutation.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            <span>{isRTL ? "حفظ كمسودة" : "Save Draft"}</span>
          </Button>

          {hasPerm("journal.post") && (
            <Button
              onClick={() => saveMutation.mutate({ shouldPost: true })}
              disabled={saveMutation.isPending || !isBalanced}
              className="gap-2 shadow-md"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-1" />}
              <span>{isRTL ? "ترحيل القيد" : "Post Entry"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Entry Card */}
      <Card className="shadow-sm">
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="je-date">{isRTL ? "تاريخ القيد *" : "Entry Date *"}</Label>
              <Input
                id="je-date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                required
              />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="je-desc">{isRTL ? "البيان / الوصف العام للقيد *" : "General Description *"}</Label>
              <Input
                id="je-desc"
                placeholder={isRTL ? "مثال: إثبات سداد إيجار المحل لشهر نوفمبر..." : "e.g. Rent payment for Nov..."}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Lines Table */}
          <div className="border rounded-xl overflow-hidden mt-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground text-xs font-semibold">
                  <th className="py-3 px-3 text-start w-12">#</th>
                  <th className="py-3 px-3 text-start w-72">{isRTL ? "الحساب الفرعي *" : "Account *"}</th>
                  <th className="py-3 px-3 text-start">{isRTL ? "البيان / شرح السطر" : "Line Description"}</th>
                  <th className="py-3 px-3 text-end w-36">{isRTL ? "مدين (Debit)" : "Debit"}</th>
                  <th className="py-3 px-3 text-end w-36">{isRTL ? "دائن (Credit)" : "Credit"}</th>
                  <th className="py-3 px-3 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lines.map((line, idx) => (
                  <tr key={line.id} className="hover:bg-muted/20">
                    <td className="py-2.5 px-3 text-xs text-muted-foreground font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <Select
                        value={line.account_id}
                        onValueChange={(val) => updateLine(idx, "account_id", val)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder={isRTL ? "اختر الحساب..." : "Select account..."} />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              <span className="font-mono text-xs me-2">[{a.code}]</span>
                              <span>{isRTL ? a.name_ar : a.name_en || a.name_ar}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2.5 px-3">
                      <Input
                        className="h-9 text-xs"
                        placeholder={isRTL ? "شرح للسطر (اختياري)..." : "Optional description..."}
                        value={line.description}
                        onChange={(e) => updateLine(idx, "description", e.target.value)}
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        className="h-9 text-xs text-end font-mono"
                        placeholder="0.00"
                        value={line.debit}
                        onChange={(e) => updateLine(idx, "debit", e.target.value)}
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        className="h-9 text-xs text-end font-mono"
                        placeholder="0.00"
                        value={line.credit}
                        onChange={(e) => updateLine(idx, "credit", e.target.value)}
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => removeLine(idx)}
                        disabled={lines.length <= 2}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-1.5 text-xs">
              <Plus className="h-4 w-4" />
              <span>{isRTL ? "إضافة سطر قيد جديد" : "Add Line"}</span>
            </Button>

            {/* Balance Indicator Box */}
            <div
              className={`flex items-center gap-3 px-4 py-2 rounded-xl border text-sm font-semibold ${
                isBalanced
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
              }`}
            >
              {isBalanced ? (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  <span>{isRTL ? "القيد متوازن تماماً (المدين = الدائن)" : "Entry is balanced"}</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5" />
                  <span>
                    {isRTL
                      ? `القيد غير متوازن · الفارق: ${formatMoney(difference)}`
                      : `Out of balance by: ${formatMoney(difference)}`}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Totals Summary */}
          <div className="grid grid-cols-2 max-w-xs ms-auto bg-muted/40 p-4 rounded-xl text-sm space-y-1">
            <div className="text-muted-foreground">{isRTL ? "إجمالي المدين:" : "Total Debit:"}</div>
            <div className="text-end font-mono font-bold">{formatMoney(totalDebit)}</div>
            <div className="text-muted-foreground">{isRTL ? "إجمالي الدائن:" : "Total Credit:"}</div>
            <div className="text-end font-mono font-bold">{formatMoney(totalCredit)}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
