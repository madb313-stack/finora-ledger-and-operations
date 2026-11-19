import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { BookOpen, Plus, Search, CheckCircle2, RotateCcw, Eye, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/journal-entries")({
  component: JournalEntriesPage,
});

function JournalEntriesPage() {
  const { tenant, hasPerm } = useTenant();
  const { isRTL } = useTranslation();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Query Entries
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["journal_entries_list", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Query lines for selected entry
  const { data: entryLines = [], isLoading: loadingLines } = useQuery({
    queryKey: ["entry_lines", selectedEntry?.id],
    queryFn: async () => {
      if (!selectedEntry?.id) return [];
      const { data, error } = await supabase
        .from("journal_lines")
        .select(`
          id, line_no, debit, credit, description, currency_code,
          accounts ( id, code, name_ar, name_en )
        `)
        .eq("entry_id", selectedEntry.id)
        .order("line_no");
      if (error) return [];
      return data || [];
    },
    enabled: !!selectedEntry?.id,
  });

  // Post Mutation
  const postMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("post_journal_entry", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم ترحيل القيد لدفتر الأستاذ" : "Entry posted to general ledger");
      queryClient.invalidateQueries({ queryKey: ["journal_entries_list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_summary"] });
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل ترحيل القيد" : "Failed to post entry"));
    },
  });

  // Reverse Mutation
  const reverseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("reverse_journal_entry", {
        _id: id,
        _date: new Date().toISOString().slice(0, 10),
        _reason: "عكس يدوي بواسطة المستخدم",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? "تم عكس القيد المحاسبي بنجاح" : "Entry reversed");
      queryClient.invalidateQueries({ queryKey: ["journal_entries_list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_summary"] });
    },
    onError: (err: any) => {
      toast.error(err.message || (isRTL ? "فشل عكس القيد" : "Failed to reverse entry"));
    },
  });

  const filtered = entries.filter((e) => {
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    const matchesSearch =
      (e.number && e.number.toLowerCase().includes(search.toLowerCase())) ||
      (e.description && e.description.toLowerCase().includes(search.toLowerCase())) ||
      (e.source_type && e.source_type.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const formatMoney = (val?: number) => {
    return new Intl.NumberFormat(isRTL ? "ar-SD" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "posted":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">{isRTL ? "مرحّل" : "Posted"}</span>;
      case "draft":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">{isRTL ? "مسودة" : "Draft"}</span>;
      case "reversed":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">{isRTL ? "معكوس" : "Reversed"}</span>;
      default:
        return <span>{st}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span>{isRTL ? "قيود اليومية العامة" : "Journal Entries"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "سجل القيود المحاسبية اليدوية والآلية الناتجة عن الفواتير والمقبوضات"
              : "Review, create, and reverse double-entry journal entries"}
          </p>
        </div>

        {hasPerm("journal.create") && (
          <Link to="/app/journal-entries/new">
            <Button className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              <span>{isRTL ? "إنشاء قيد يومية جديد" : "New Journal Entry"}</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Filter and Search */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRTL ? "بحث برقم القيد أو البيان..." : "Search journal entries..."}
              className="ps-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {["all", "draft", "posted", "reversed"].map((st) => (
              <Button
                key={st}
                variant={statusFilter === st ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(st)}
                className="text-xs h-8 capitalize"
              >
                {st === "all"
                  ? isRTL ? "الكل" : "All"
                  : st === "draft"
                  ? isRTL ? "مسودات" : "Draft"
                  : st === "posted"
                  ? isRTL ? "مرحّلة" : "Posted"
                  : isRTL ? "معكوسة" : "Reversed"}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground text-xs font-semibold">
                  <th className="text-start py-3 px-4">{isRTL ? "رقم القيد" : "Entry #"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "التاريخ" : "Date"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "البيان / الوصف" : "Description"}</th>
                  <th className="text-start py-3 px-4">{isRTL ? "المصدر" : "Source"}</th>
                  <th className="text-end py-3 px-4">{isRTL ? "إجمالي المدين" : "Debit"}</th>
                  <th className="text-end py-3 px-4">{isRTL ? "إجمالي الدائن" : "Credit"}</th>
                  <th className="text-center py-3 px-4">{isRTL ? "الحالة" : "Status"}</th>
                  <th className="text-center py-3 px-4">{isRTL ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                      <span>{isRTL ? "جارٍ تحميل القيود..." : "Loading entries..."}</span>
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((e) => (
                    <tr key={e.id} className="hover:bg-muted/40 transition">
                      <td className="py-3 px-4 font-mono font-medium text-xs text-foreground">
                        {e.number || "— (مسودة)"}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{e.entry_date}</td>
                      <td className="py-3 px-4 font-medium max-w-xs truncate">{e.description || "—"}</td>
                      <td className="py-3 px-4 text-xs">
                        <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                          {e.source_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-end font-semibold text-foreground">
                        {formatMoney(Number(e.total_debit))} {tenant?.base_currency}
                      </td>
                      <td className="py-3 px-4 text-end font-semibold text-foreground">
                        {formatMoney(Number(e.total_credit))} {tenant?.base_currency}
                      </td>
                      <td className="py-3 px-4 text-center">{getStatusBadge(e.status)}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedEntry(e);
                              setDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {e.status === "draft" && hasPerm("journal.post") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
                              onClick={() => postMutation.mutate(e.id)}
                              disabled={postMutation.isPending}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>{isRTL ? "ترحيل" : "Post"}</span>
                            </Button>
                          )}

                          {e.status === "posted" && hasPerm("journal.reverse") && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-purple-600 hover:bg-purple-500/10"
                              onClick={() => reverseMutation.mutate(e.id)}
                              disabled={reverseMutation.isPending}
                            >
                              <RotateCcw className="h-3 w-3 me-1" />
                              <span>{isRTL ? "عكس" : "Reverse"}</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      {isRTL ? "لا توجد قيود مطابقة" : "No journal entries found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Entry Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{isRTL ? `تفاصيل القيد رقم ${selectedEntry?.number || ""}` : `Entry Details ${selectedEntry?.number || ""}`}</span>
              {selectedEntry && getStatusBadge(selectedEntry.status)}
            </DialogTitle>
            <DialogDescription>
              {selectedEntry?.entry_date} · {selectedEntry?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="border rounded-xl overflow-hidden mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground text-xs font-semibold">
                  <th className="py-2.5 px-3 text-start">{isRTL ? "كود الحساب" : "Code"}</th>
                  <th className="py-2.5 px-3 text-start">{isRTL ? "اسم الحساب" : "Account Name"}</th>
                  <th className="py-2.5 px-3 text-start">{isRTL ? "البيان" : "Description"}</th>
                  <th className="py-2.5 px-3 text-end">{isRTL ? "مدين" : "Debit"}</th>
                  <th className="py-2.5 px-3 text-end">{isRTL ? "دائن" : "Credit"}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loadingLines ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                    </td>
                  </tr>
                ) : entryLines.length > 0 ? (
                  entryLines.map((l) => {
                    const acc = l.accounts as any;
                    return (
                      <tr key={l.id} className="hover:bg-muted/20">
                        <td className="py-2.5 px-3 font-mono text-xs font-semibold">{acc?.code}</td>
                        <td className="py-2.5 px-3 font-medium">{isRTL ? acc?.name_ar : acc?.name_en || acc?.name_ar}</td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground">{l.description || "—"}</td>
                        <td className="py-2.5 px-3 text-end font-mono font-semibold">
                          {Number(l.debit) > 0 ? formatMoney(Number(l.debit)) : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-end font-mono font-semibold">
                          {Number(l.credit) > 0 ? formatMoney(Number(l.credit)) : "—"}
                        </td>
                      </tr>
                    );
                  })
                ) : null}
              </tbody>
              <tfoot className="border-t bg-muted/30 font-bold text-xs">
                <tr>
                  <td colSpan={3} className="py-3 px-3 text-start">{isRTL ? "الإجمالي المتوازن" : "Total"}</td>
                  <td className="py-3 px-3 text-end text-primary font-mono font-bold">
                    {formatMoney(Number(selectedEntry?.total_debit))}
                  </td>
                  <td className="py-3 px-3 text-end text-primary font-mono font-bold">
                    {formatMoney(Number(selectedEntry?.total_credit))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
