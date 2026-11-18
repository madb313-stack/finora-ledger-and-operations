import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
} from "@/components/ui/dialog";
import {
  History,
  Search,
  Eye,
  Loader2,
  User,
  Activity,
  Layers,
} from "lucide-react";

export const Route = createFileRoute("/platform/audit-log")({
  component: PlatformAuditLogPage,
});

interface AuditLogEntry {
  id: string;
  scope: string;
  tenant_id: string | null;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before: any;
  after: any;
  created_at: string;
}

function PlatformAuditLogPage() {
  const { isRTL } = useTranslation();

  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<string>("ALL");
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const { data: logs, isLoading } = useQuery({
    queryKey: ["platform_audit_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(250);

      if (error) throw error;
      return (data || []) as AuditLogEntry[];
    },
  });

  const filteredLogs = logs?.filter((item) => {
    if (scopeFilter !== "ALL" && item.scope !== scopeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchAction = item.action.toLowerCase().includes(q);
      const matchActor = item.actor_email?.toLowerCase().includes(q);
      const matchEntity = item.entity_type.toLowerCase().includes(q);
      const matchId = item.entity_id?.toLowerCase().includes(q);
      return matchAction || matchActor || matchEntity || matchId;
    }
    return true;
  });

  const getActionBadgeColor = (action: string) => {
    if (action.includes("create") || action.includes("insert") || action.includes("register")) {
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
    }
    if (action.includes("update") || action.includes("edit") || action.includes("modify")) {
      return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
    }
    if (action.includes("suspend") || action.includes("delete") || action.includes("void")) {
      return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
    }
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="w-6 h-6 text-primary" />
            {isRTL ? "سجل التدقيق الشامل للمنصة" : "Platform Audit Log"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL
              ? "مراقبة كافة الأحداث الإدارية المركزية وحركات الاشتراكات وتعديلات الخطط"
              : "Comprehensive audit records covering platform-level modifications, plans, and tenant events"}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute start-3 top-3 text-muted-foreground" />
              <Input
                placeholder={isRTL ? "بحث بالإجراء، البريد، الكيان..." : "Search action, actor, entity..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
            <div className="w-full sm:w-48">
              <select
                value={scopeFilter}
                onChange={(e) => setScopeFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="ALL">{isRTL ? "كافة النطاقات" : "All Scopes"}</option>
                <option value="platform">{isRTL ? "نطاق المنصة (Platform)" : "Platform Scope"}</option>
                <option value="tenant">{isRTL ? "نطاق الشركات (Tenant)" : "Tenant Scope"}</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredLogs?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {isRTL ? "لا توجد سجلات تدقيق مطابقة" : "No audit entries found"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-start">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground text-xs uppercase">
                    <th className="py-2.5 px-4 text-start">{isRTL ? "التاريخ والوقت" : "Timestamp"}</th>
                    <th className="py-2.5 px-4 text-start">{isRTL ? "النطاق" : "Scope"}</th>
                    <th className="py-2.5 px-4 text-start">{isRTL ? "المستخدم" : "Actor"}</th>
                    <th className="py-2.5 px-4 text-start">{isRTL ? "الإجراء" : "Action"}</th>
                    <th className="py-2.5 px-4 text-start">{isRTL ? "نوع الكيان" : "Entity Type"}</th>
                    <th className="py-2.5 px-4 text-end">{isRTL ? "التفاصيل" : "Details"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLogs?.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            log.scope === "platform"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          }`}
                        >
                          {log.scope}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <span dir="ltr">{log.actor_email || (isRTL ? "نظام آلي" : "System")}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-block font-mono text-xs px-2 py-0.5 rounded-full font-medium ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">
                        {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)}...)` : ""}
                      </td>
                      <td className="py-2.5 px-4 text-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEntry(log)}
                          className="h-7 px-2 text-xs"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          {isRTL ? "عرض" : "Inspect"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inspect Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              {isRTL ? "بيانات سجل التدقيق" : "Audit Record Data"}
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg text-xs">
                <div>
                  <span className="text-muted-foreground block">{isRTL ? "النطاق:" : "Scope:"}</span>
                  <span className="font-semibold uppercase">{selectedEntry.scope}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{isRTL ? "الإجراء:" : "Action:"}</span>
                  <span className="font-semibold font-mono">{selectedEntry.action}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{isRTL ? "المستخدم:" : "Actor:"}</span>
                  <span className="font-semibold" dir="ltr">{selectedEntry.actor_email || "System"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{isRTL ? "الكيان:" : "Entity:"}</span>
                  <span className="font-semibold font-mono">{selectedEntry.entity_type} ({selectedEntry.entity_id || "-"})</span>
                </div>
              </div>

              {selectedEntry.before && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    {isRTL ? "الحالة السابقة (Before):" : "Before State:"}
                  </Label>
                  <pre
                    className="p-3 bg-card border rounded-md text-xs font-mono overflow-x-auto max-h-48"
                    dir="ltr"
                  >
                    {JSON.stringify(selectedEntry.before, null, 2)}
                  </pre>
                </div>
              )}

              {selectedEntry.after && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    {isRTL ? "الحالة اللاحقة (After):" : "After State:"}
                  </Label>
                  <pre
                    className="p-3 bg-card border rounded-md text-xs font-mono overflow-x-auto max-h-48"
                    dir="ltr"
                  >
                    {JSON.stringify(selectedEntry.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
