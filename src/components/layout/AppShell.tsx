import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenant";
import { useTranslation } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Receipt,
  Users,
  FileX,
  ShoppingCart,
  Truck,
  Landmark,
  Wallet,
  CreditCard,
  ArrowLeftRight,
  Package,
  Warehouse,
  ClipboardList,
  FolderTree,
  BookOpen,
  Calendar,
  Scale,
  TrendingUp,
  PieChart,
  DollarSign,
  Clock,
  FileSpreadsheet,
  Building2,
  GitBranch,
  Coins,
  UserPlus,
  ShieldCheck,
  History,
  ShieldAlert,
  Globe,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Plus,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, signOut } = useAuth();
  const { tenant, tenants, setSelectedTenantId, role, isPlatformAdmin } = useTenant();
  const { locale, setLocale, isRTL } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const navGroups = [
    {
      title: isRTL ? "عام" : "General",
      items: [
        { href: "/app/dashboard", label: isRTL ? "لوحة التحكم" : "Dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: isRTL ? "المبيعات والعملاء" : "Sales & Customers",
      items: [
        { href: "/app/sales-invoices", label: isRTL ? "فواتير المبيعات" : "Sales Invoices", icon: Receipt },
        { href: "/app/customers", label: isRTL ? "العملاء" : "Customers", icon: Users },
        { href: "/app/credit-notes", label: isRTL ? "إشعارات دائنة" : "Credit Notes", icon: FileX },
      ],
    },
    {
      title: isRTL ? "المشتريات والموردين" : "Purchases & Suppliers",
      items: [
        { href: "/app/purchase-invoices", label: isRTL ? "فواتير المشتريات" : "Purchase Invoices", icon: ShoppingCart },
        { href: "/app/suppliers", label: isRTL ? "الموردين" : "Suppliers", icon: Truck },
      ],
    },
    {
      title: isRTL ? "الخزينة والبنوك" : "Treasury & Banking",
      items: [
        { href: "/app/financial-accounts", label: isRTL ? "الحسابات المالية" : "Accounts & Banks", icon: Landmark },
        { href: "/app/cash-transactions", label: isRTL ? "سندات الصرف والقبض" : "Income & Expenses", icon: Wallet },
        { href: "/app/payments", label: isRTL ? "سداد الفواتير" : "Payments", icon: CreditCard },
        { href: "/app/transfers", label: isRTL ? "التحويلات المالية" : "Transfers", icon: ArrowLeftRight },
      ],
    },
    {
      title: isRTL ? "المخزون والمستودعات" : "Inventory & Warehouses",
      items: [
        { href: "/app/products", label: isRTL ? "المنتجات والأصناف" : "Products", icon: Package },
        { href: "/app/warehouses", label: isRTL ? "المستودعات" : "Warehouses", icon: Warehouse },
        { href: "/app/stock-documents", label: isRTL ? "حركات وسندات المخزون" : "Stock Documents", icon: ClipboardList },
      ],
    },
    {
      title: isRTL ? "المحاسبة العامة" : "General Ledger",
      items: [
        { href: "/app/accounts", label: isRTL ? "شجرة الحسابات" : "Chart of Accounts", icon: FolderTree },
        { href: "/app/journal-entries", label: isRTL ? "قيود اليومية" : "Journal Entries", icon: BookOpen },
        { href: "/app/fiscal-years", label: isRTL ? "الفترات والسنوات المالية" : "Fiscal Years", icon: Calendar },
      ],
    },
    {
      title: isRTL ? "التقارير المالية" : "Financial Reports",
      items: [
        { href: "/app/reports/trial-balance", label: isRTL ? "ميزان المراجعة" : "Trial Balance", icon: Scale },
        { href: "/app/reports/income-statement", label: isRTL ? "قائمة الدخل" : "Income Statement", icon: TrendingUp },
        { href: "/app/reports/balance-sheet", label: isRTL ? "الميزانية العمومية" : "Balance Sheet", icon: PieChart },
        { href: "/app/reports/cash-flow", label: isRTL ? "قائمة التدفقات النقدية" : "Cash Flow", icon: DollarSign },
        { href: "/app/reports/aging", label: isRTL ? "تقادم الديون" : "Aging Report", icon: Clock },
        { href: "/app/reports/account-ledger", label: isRTL ? "دفتر الأستاذ" : "General Ledger", icon: FileSpreadsheet },
      ],
    },
    {
      title: isRTL ? "إعدادات المنشأة" : "Company Settings",
      items: [
        { href: "/app/settings/company", label: isRTL ? "بيانات الشركة" : "Company Profile", icon: Building2 },
        { href: "/app/settings/branches", label: isRTL ? "الفروع" : "Branches", icon: GitBranch },
        { href: "/app/settings/currencies", label: isRTL ? "العملات والصرف" : "Currencies", icon: Coins },
        { href: "/app/settings/team", label: isRTL ? "فريق العمل" : "Team Members", icon: UserPlus },
        { href: "/app/settings/roles", label: isRTL ? "الأدوار والصلاحيات" : "Roles & Permissions", icon: ShieldCheck },
        { href: "/app/settings/audit-log", label: isRTL ? "سجل التدقيق" : "Audit Log", icon: History },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col antialiased">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b bg-card/90 backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <Link to="/app/dashboard" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg shadow-md shadow-primary/20">
              F
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-lg tracking-wider text-foreground">FINORA</span>
              <span className="text-[10px] block text-muted-foreground font-medium -mt-1">
                {isRTL ? "إدارة العمليات والحسابات" : "Ledger & Operations"}
              </span>
            </div>
          </Link>

          {/* Company Switcher Dropdown */}
          <div className="ms-4 border-s ps-4 hidden md:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2 font-medium max-w-[220px]">
                  <Building2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{tenant?.name || (isRTL ? "اختر شركة" : "Select Company")}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-64">
                <DropdownMenuLabel>{isRTL ? "شركاتك ومؤسساتك" : "Your Companies"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {tenants.map((c) => (
                  <DropdownMenuItem
                    key={c.tenant_id}
                    onClick={() => setSelectedTenantId(c.tenant_id)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-medium truncate">{c.name}</span>
                    <span className="text-[11px] text-muted-foreground uppercase px-1.5 py-0.5 rounded bg-muted">
                      {c.base_currency}
                    </span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/register" })} className="gap-2 text-primary font-medium cursor-pointer">
                  <Plus className="h-4 w-4" />
                  <span>{isRTL ? "إضافة شركة جديدة" : "Add New Company"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            className="flex items-center gap-1 text-xs font-medium h-9 px-2.5"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{locale === "ar" ? "English" : "العربية"}</span>
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-full"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Platform Admin Link if SuperAdmin */}
          {isPlatformAdmin && (
            <Link to="/platform/companies">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-amber-500 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isRTL ? "لوحة المنصة" : "Platform"}</span>
              </Button>
            </Link>
          )}

          {/* User profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 gap-2 ps-2 pe-3 rounded-full hover:bg-muted">
                <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs uppercase">
                  {user?.email?.charAt(0) || "U"}
                </div>
                <span className="text-xs font-medium max-w-[100px] truncate hidden md:inline">
                  {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
                </span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold">{user?.user_metadata?.full_name || "مستخدم فيكورا"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  {role && (
                    <span className="inline-block mt-1 text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded w-fit">
                      {isRTL ? role.name_ar : role.name_en || role.code}
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/app/settings/company" })}>
                {isRTL ? "إعدادات الشركة" : "Company Settings"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/app/settings/team" })}>
                {isRTL ? "إدارة المستخدمين" : "User Management"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="h-4 w-4 me-2" />
                <span>{isRTL ? "تسجيل الخروج" : "Sign Out"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar for Desktop & Mobile drawer */}
        <aside
          className={`
            fixed md:static inset-y-0 start-0 z-30 w-64 bg-card border-e flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0
            ${mobileOpen ? "translate-x-0 top-16" : isRTL ? "translate-x-full" : "-translate-x-full"}
            md:top-0
          `}
        >
          {/* Scrollable Navigation Menu */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {navGroups.map((group, idx) => (
              <div key={idx} className="space-y-1.5">
                <h4 className="px-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  {group.title}
                </h4>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = location.pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`
                          flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                          ${
                            active
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                          }
                        `}
                      >
                        <Icon className={`h-4 w-4 ${active ? "text-primary-foreground" : "text-muted-foreground"}`} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer with Active Currency & Plan */}
          <div className="p-4 border-t bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
            <div>
              <span className="font-semibold text-foreground block">{tenant?.name || "FINORA"}</span>
              <span>{tenant?.base_currency} · SDG</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
              Active
            </span>
          </div>
        </aside>

        {/* Mobile backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-muted/10">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
