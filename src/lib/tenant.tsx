import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";
import { DEMO_COMPANY, DEMO_BRANCHES, type DemoBranch } from "./demo-data";

export interface CompanySummary {
  tenant_id: string;
  name: string;
  status: string;
  base_currency: string;
  role_code: string;
  role_name_ar: string;
  role_name_en: string;
  membership_status: string;
  subscription_status: string;
  plan_name_ar: string;
  plan_name_en: string;
  trial_ends_at: string | null;
  operational: boolean;
}

export interface BranchItem {
  id: string;
  code: string;
  name: string;
  city?: string;
  address?: string;
  phone?: string;
  is_main: boolean;
}

export interface TenantDetails {
  id: string;
  name: string;
  legal_name?: string | null;
  business_type?: string | null;
  tax_number?: string | null;
  commercial_register?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  country_code: string;
  base_currency: string;
  timezone: string;
  default_locale: string;
  fiscal_year_start_month: number;
  status: string;
  inventory_enabled: boolean;
  allow_negative_stock: boolean;
  require_sales_approval: boolean;
  require_purchase_approval: boolean;
  require_expense_approval: boolean;
  onboarding_completed: boolean;
}

interface TenantContextValue {
  tenant: TenantDetails | null;
  tenants: CompanySummary[];
  selectedTenantId: string | null;
  setSelectedTenantId: (id: string) => void;
  branches: BranchItem[];
  currentBranch: BranchItem | null;
  setCurrentBranch: (branch: BranchItem) => void;
  role: { id: string; code: string; name_ar: string; name_en: string } | null;
  membership: { id: string; default_branch_id: string | null } | null;
  permissions: string[];
  hasPerm: (perm: string) => boolean;
  isPlatformAdmin: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user, isDemoMode } = useAuth();
  const [tenants, setTenants] = useState<CompanySummary[]>([]);
  const [selectedTenantId, setSelectedTenantIdState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("finora_selected_tenant_id");
    }
    return null;
  });
  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [currentBranch, setCurrentBranchState] = useState<BranchItem | null>(null);
  const [role, setRole] = useState<{ id: string; code: string; name_ar: string; name_en: string } | null>(null);
  const [membership, setMembership] = useState<{ id: string; default_branch_id: string | null } | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const setCurrentBranch = (b: BranchItem) => {
    setCurrentBranchState(b);
    if (typeof window !== "undefined") {
      localStorage.setItem("finora_selected_branch_id", b.id);
    }
  };

  // Check if platform admin
  const checkPlatformAdmin = useCallback(async () => {
    if (isDemoMode) {
      setIsPlatformAdmin(true);
      return;
    }
    if (!user) {
      setIsPlatformAdmin(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("platform_admins")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        setIsPlatformAdmin(true);
      } else {
        setIsPlatformAdmin(false);
      }
    } catch {
      setIsPlatformAdmin(false);
    }
  }, [user, isDemoMode]);

  // Load companies
  const fetchCompanies = useCallback(async () => {
    if (isDemoMode) {
      const demoSummary: CompanySummary = {
        tenant_id: DEMO_COMPANY.id,
        name: DEMO_COMPANY.name,
        status: "active",
        base_currency: "SDG",
        role_code: "owner",
        role_name_ar: "المالك والمدير العام",
        role_name_en: "Owner & General Manager",
        membership_status: "active",
        subscription_status: "active",
        plan_name_ar: "خطة الشركات المتكاملة",
        plan_name_en: "Enterprise Plan",
        trial_ends_at: null,
        operational: true,
      };
      setTenants([demoSummary]);
      setSelectedTenantIdState(DEMO_COMPANY.id);
      setTenant(DEMO_COMPANY as unknown as TenantDetails);
      setBranches(DEMO_BRANCHES);
      setCurrentBranchState(DEMO_BRANCHES[0]);
      setRole({
        id: "role-owner",
        code: "owner",
        name_ar: "المالك والمدير العام",
        name_en: "Owner & General Manager",
      });
      setMembership({
        id: "mem-owner",
        default_branch_id: DEMO_BRANCHES[0].id,
      });
      setPermissions(["*"]);
      setLoading(false);
      return;
    }

    if (!user) {
      setTenants([]);
      setTenant(null);
      setBranches([]);
      setCurrentBranchState(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("my_companies");
      if (error) {
        console.error("Error fetching companies:", error);
        setTenants([]);
      } else {
        const list = (data as unknown as CompanySummary[]) || [];
        setTenants(list);

        let activeId = selectedTenantId;
        if (!activeId || !list.some((c) => c.tenant_id === activeId)) {
          activeId = list.length > 0 ? list[0].tenant_id : null;
        }

        if (activeId) {
          setSelectedTenantIdState(activeId);
          localStorage.setItem("finora_selected_tenant_id", activeId);
          await loadTenantContext(activeId);
        } else {
          setTenant(null);
          setRole(null);
          setBranches([]);
          setCurrentBranchState(null);
          setPermissions([]);
        }
      }
    } catch (err) {
      console.error("Failed to load companies:", err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedTenantId, isDemoMode]);

  const loadTenantContext = async (tenantId: string) => {
    try {
      const { data, error } = await supabase.rpc("my_tenant_context", { _tenant: tenantId });
      if (error) {
        console.error("Error loading tenant context:", error);
        return;
      }

      const res = data as any;
      if (res) {
        setTenant(res.tenant as TenantDetails);
        setRole(res.role || null);
        setMembership(res.membership || null);
        setPermissions((res.permissions as string[]) || []);

        const brList: BranchItem[] = res.branches || [];
        setBranches(brList);

        const savedBranchId = typeof window !== "undefined" ? localStorage.getItem("finora_selected_branch_id") : null;
        const activeBranch = brList.find((b) => b.id === savedBranchId) ||
          brList.find((b) => b.id === res.membership?.default_branch_id) ||
          brList[0] || null;
        setCurrentBranchState(activeBranch);
      }
    } catch (err) {
      console.error("Error invoking my_tenant_context:", err);
    }
  };

  const setSelectedTenantId = (id: string) => {
    setSelectedTenantIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("finora_selected_tenant_id", id);
    }
    loadTenantContext(id);
  };

  useEffect(() => {
    checkPlatformAdmin();
    fetchCompanies();
  }, [user, isDemoMode]);

  const hasPerm = useCallback(
    (perm: string): boolean => {
      if (isDemoMode) return true;
      if (role?.code === "owner") return true;
      return permissions.includes(perm);
    },
    [role, permissions, isDemoMode]
  );

  return (
    <TenantContext.Provider
      value={{
        tenant,
        tenants,
        selectedTenantId,
        setSelectedTenantId,
        branches,
        currentBranch,
        setCurrentBranch,
        role,
        membership,
        permissions,
        hasPerm,
        isPlatformAdmin,
        loading,
        refetch: fetchCompanies,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}
