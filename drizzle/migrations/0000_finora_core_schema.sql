
-- ================= REFERENCE =================
create table public.currencies (
  code text primary key check (code ~ '^[A-Z]{3}$'),
  name_ar text not null, name_en text not null, symbol text not null,
  decimals smallint not null default 2 check (decimals between 0 and 4),
  is_active boolean not null default true
);
grant select on public.currencies to anon, authenticated;
grant all on public.currencies to service_role;
alter table public.currencies enable row level security;
create policy "currencies_read" on public.currencies for select using (true);

insert into public.currencies(code,name_ar,name_en,symbol,decimals) values
('SDG','الجنيه السوداني','Sudanese Pound','ج.س',2),
('USD','الدولار الأمريكي','US Dollar','$',2),
('EUR','اليورو','Euro','€',2),
('SAR','الريال السعودي','Saudi Riyal','ر.س',2),
('AED','الدرهم الإماراتي','UAE Dirham','د.إ',2),
('EGP','الجنيه المصري','Egyptian Pound','ج.م',2),
('GBP','الجنيه الإسترليني','British Pound','£',2),
('QAR','الريال القطري','Qatari Riyal','ر.ق',2),
('KWD','الدينار الكويتي','Kuwaiti Dinar','د.ك',3),
('CNY','اليوان الصيني','Chinese Yuan','¥',2),
('ETB','البر الإثيوبي','Ethiopian Birr','Br',2);

create table public.permissions (
  code text primary key, module text not null,
  name_ar text not null, name_en text not null, sort int not null default 0
);
grant select on public.permissions to authenticated;
grant all on public.permissions to service_role;
alter table public.permissions enable row level security;
create policy "permissions_read" on public.permissions for select to authenticated using (true);

insert into public.permissions(code,module,name_ar,name_en,sort) values
('dashboard.view','general','عرض لوحة التحكم','View dashboard',1),
('accounts.view','accounting','عرض دليل الحسابات','View chart of accounts',10),
('accounts.manage','accounting','إدارة دليل الحسابات والتصنيفات','Manage chart of accounts',11),
('journal.view','accounting','عرض القيود اليومية','View journal entries',12),
('journal.create','accounting','إنشاء قيود يومية','Create journal entries',13),
('journal.edit_draft','accounting','تعديل القيود المسودة','Edit draft entries',14),
('journal.post','accounting','ترحيل القيود','Post journal entries',15),
('journal.reverse','accounting','عكس القيود المرحّلة','Reverse posted entries',16),
('periods.manage','accounting','إدارة السنوات والفترات المالية','Manage fiscal years & periods',17),
('currencies.manage','accounting','إدارة العملات وأسعار الصرف','Manage currencies & rates',18),
('reports.view','reports','عرض التقارير المالية','View financial reports',20),
('reports.export','reports','تصدير التقارير','Export reports',21),
('cash.view','finance','عرض النقدية والبنوك','View cash & banks',30),
('cash.manage','finance','إدارة حسابات النقدية والبنوك','Manage cash & bank accounts',31),
('transactions.create','finance','تسجيل الإيرادات والمصروفات والتحويلات','Record income, expenses & transfers',32),
('transactions.approve','finance','اعتماد المصروفات وإلغاء العمليات','Approve expenses & void transactions',33),
('payments.record','finance','تسجيل المقبوضات والمدفوعات','Record payments',34),
('customers.manage','sales','إدارة العملاء','Manage customers',40),
('sales.view','sales','عرض المبيعات','View sales',41),
('sales.create','sales','إنشاء فواتير المبيعات','Create invoices',42),
('sales.approve','sales','اعتماد فواتير المبيعات','Approve invoices',43),
('sales.post','sales','ترحيل وإلغاء فواتير المبيعات','Post & void invoices',44),
('suppliers.manage','purchases','إدارة الموردين','Manage suppliers',50),
('purchases.view','purchases','عرض المشتريات','View purchases',51),
('purchases.create','purchases','إنشاء فواتير المشتريات','Create bills',52),
('purchases.approve','purchases','اعتماد فواتير المشتريات','Approve bills',53),
('purchases.post','purchases','ترحيل وإلغاء فواتير المشتريات','Post & void bills',54),
('inventory.view','inventory','عرض المخزون','View inventory',60),
('inventory.manage','inventory','إدارة المخزون والأصناف','Manage inventory',61),
('branches.manage','admin','إدارة الفروع','Manage branches',70),
('users.manage','admin','إدارة المستخدمين','Manage users',71),
('roles.manage','admin','إدارة الأدوار والصلاحيات','Manage roles & permissions',72),
('settings.manage','admin','إدارة إعدادات الشركة','Manage company settings',73),
('audit.view','admin','عرض سجل التدقيق','View audit logs',74);

-- ================= PLATFORM =================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, email text, phone text,
  preferred_locale text not null default 'ar' check (preferred_locale in ('ar','en')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.platform_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null check (role in ('super_admin','support','finance')),
  created_by uuid, created_at timestamptz not null default now()
);
create table public.platform_settings (
  id boolean primary key default true check (id),
  self_registration boolean not null default true,
  default_plan_code text not null default 'trial',
  billing_currency text not null default 'USD' references public.currencies(code),
  support_email text, announcement text,
  updated_at timestamptz not null default now()
);
insert into public.platform_settings default values;

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ar text not null, name_en text not null,
  description_ar text, description_en text,
  price_monthly numeric(14,2) not null default 0 check (price_monthly >= 0),
  price_annual numeric(14,2) not null default 0 check (price_annual >= 0),
  currency_code text not null default 'USD' references public.currencies(code),
  max_users int not null default 3 check (max_users > 0),
  max_branches int not null default 1 check (max_branches > 0),
  storage_mb int not null default 500 check (storage_mb >= 0),
  inventory_enabled boolean not null default false,
  advanced_reports boolean not null default false,
  trial_days int not null default 0 check (trial_days >= 0),
  is_active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
insert into public.subscription_plans(code,name_ar,name_en,description_ar,description_en,price_monthly,price_annual,max_users,max_branches,storage_mb,inventory_enabled,advanced_reports,trial_days,sort) values
('trial','تجربة مجانية','Free Trial','تجربة كاملة لمدة 30 يوماً','Full 30-day trial',0,0,3,1,500,true,true,30,1),
('starter','المبتدئة','Starter','للأعمال الصغيرة','For small businesses',15,150,3,1,1000,false,false,0,2),
('business','الأعمال','Business','للشركات المتوسطة مع المخزون','For growing companies with inventory',40,400,10,3,5000,true,true,0,3),
('enterprise','المؤسسات','Enterprise','للمؤسسات متعددة الفروع','For multi-branch organizations',100,1000,50,20,20000,true,true,0,4);

-- ================= TENANTS =================
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) >= 2),
  legal_name text, business_type text, tax_number text, commercial_register text,
  phone text, email text, address text, city text,
  country_code text not null default 'SD',
  base_currency text not null default 'SDG' references public.currencies(code),
  timezone text not null default 'Africa/Khartoum',
  default_locale text not null default 'ar' check (default_locale in ('ar','en')),
  fiscal_year_start_month smallint not null default 1 check (fiscal_year_start_month between 1 and 12),
  status text not null default 'active' check (status in ('active','suspended')),
  suspended_reason text,
  inventory_enabled boolean not null default false,
  allow_negative_stock boolean not null default false,
  require_sales_approval boolean not null default false,
  require_purchase_approval boolean not null default false,
  require_expense_approval boolean not null default false,
  onboarding_completed boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  plan_id uuid not null references public.subscription_plans(id),
  status text not null check (status in ('trial','active','past_due','suspended','cancelled','expired')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly','annual')),
  started_at date not null default current_date,
  current_period_end date, trial_ends_at date,
  is_current boolean not null default true,
  notes text, created_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index subscriptions_current_uidx on public.subscriptions(tenant_id) where is_current;

create table public.subscription_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  subscription_id uuid not null references public.subscriptions(id),
  number text not null unique,
  amount numeric(14,2) not null check (amount >= 0),
  currency_code text not null references public.currencies(code),
  period_start date not null, period_end date not null,
  issue_date date not null default current_date, due_date date not null,
  status text not null default 'unpaid' check (status in ('unpaid','paid','void','failed')),
  notes text, created_by uuid, created_at timestamptz not null default now()
);
create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  invoice_id uuid not null references public.subscription_invoices(id),
  amount numeric(14,2) not null check (amount > 0),
  currency_code text not null references public.currencies(code),
  method text not null default 'bank_transfer',
  reference text, paid_at date not null default current_date,
  status text not null default 'succeeded' check (status in ('succeeded','failed')),
  notes text, recorded_by uuid, created_at timestamptz not null default now()
);

create table public.tenant_roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null, name_ar text not null, name_en text,
  description text, is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique(tenant_id, code)
);
create table public.tenant_role_permissions (
  role_id uuid not null references public.tenant_roles(id) on delete cascade,
  permission_code text not null references public.permissions(code),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  primary key (role_id, permission_code)
);
create table public.branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  code text not null, name text not null, address text, phone text,
  is_main boolean not null default false, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(tenant_id, code)
);
create table public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.tenant_roles(id),
  status text not null default 'active' check (status in ('active','disabled')),
  default_branch_id uuid references public.branches(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(tenant_id, user_id)
);
create table public.tenant_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role_id uuid not null references public.tenant_roles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  invited_by uuid, created_at timestamptz not null default now(), accepted_at timestamptz
);
create unique index tenant_invitations_pending_uidx on public.tenant_invitations(tenant_id, lower(email)) where status='pending';

-- ================= ACCOUNTING =================
create table public.fiscal_years (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  name text not null, start_date date not null, end_date date not null,
  status text not null default 'open' check (status in ('open','closed')),
  closing_entry_id uuid, closed_at timestamptz, closed_by uuid,
  created_at timestamptz not null default now(),
  check (end_date > start_date), unique(tenant_id, name)
);
create table public.accounting_periods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  fiscal_year_id uuid not null references public.fiscal_years(id),
  name text not null, start_date date not null, end_date date not null,
  status text not null default 'open' check (status in ('open','closed')),
  closed_at timestamptz, closed_by uuid,
  check (end_date >= start_date), unique(fiscal_year_id, start_date)
);
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  code text not null check (length(btrim(code)) > 0),
  name_ar text not null check (length(btrim(name_ar)) > 0), name_en text,
  type text not null check (type in ('asset','liability','equity','revenue','expense')),
  subtype text,
  parent_id uuid references public.accounts(id),
  is_group boolean not null default false,
  is_system boolean not null default false,
  is_active boolean not null default true,
  currency_code text references public.currencies(code),
  cash_flow_category text not null default 'operating' check (cash_flow_category in ('operating','investing','financing','cash')),
  description text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(tenant_id, code)
);
create table public.cost_centers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  code text not null, name text not null, is_active boolean not null default true,
  created_at timestamptz not null default now(), unique(tenant_id, code)
);
create table public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  currency_code text not null references public.currencies(code),
  rate_date date not null, rate numeric(20,8) not null check (rate > 0),
  created_by uuid default auth.uid(), created_at timestamptz not null default now(),
  unique(tenant_id, currency_code, rate_date)
);
create table public.numbering_sequences (
  tenant_id uuid not null references public.tenants(id),
  key text not null, prefix text not null, next_value bigint not null default 1 check (next_value > 0),
  padding int not null default 6 check (padding between 1 and 12),
  primary key (tenant_id, key)
);

create table public.parties (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  kind text not null check (kind in ('customer','supplier')),
  code text not null, name text not null check (length(btrim(name)) >= 2),
  contact_person text, phone text, email text, address text, city text, tax_number text,
  credit_limit numeric(20,2) not null default 0 check (credit_limit >= 0),
  payment_terms_days int not null default 0 check (payment_terms_days >= 0),
  notes text, is_active boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(tenant_id, kind, code)
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  number text,
  entry_date date not null,
  description text not null default '',
  source_type text not null default 'manual' check (source_type in ('manual','opening','sales_invoice','purchase_invoice','payment','transfer','income','expense','credit_note','inventory','closing','reversal')),
  source_id uuid,
  status text not null default 'draft' check (status in ('draft','posted','reversed')),
  branch_id uuid references public.branches(id),
  period_id uuid references public.accounting_periods(id),
  total_debit numeric(20,2) not null default 0,
  total_credit numeric(20,2) not null default 0,
  reversal_of uuid references public.journal_entries(id),
  reversed_by uuid references public.journal_entries(id),
  created_by uuid, approved_by uuid, posted_by uuid, posted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(tenant_id, number),
  check (status = 'draft' or total_debit = total_credit)
);
create unique index journal_entries_source_uidx on public.journal_entries(tenant_id, source_type, source_id) where source_id is not null and source_type <> 'manual';
create index journal_entries_tenant_date_idx on public.journal_entries(tenant_id, entry_date);

create table public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  entry_id uuid not null references public.journal_entries(id),
  line_no int not null,
  account_id uuid not null references public.accounts(id),
  description text,
  debit numeric(20,2) not null default 0,
  credit numeric(20,2) not null default 0,
  currency_code text references public.currencies(code),
  fx_rate numeric(20,8) not null default 1,
  fc_amount numeric(20,2),
  party_id uuid references public.parties(id),
  cost_center_id uuid references public.cost_centers(id),
  branch_id uuid references public.branches(id),
  created_at timestamptz not null default now(),
  check (debit >= 0 and credit >= 0),
  check (not (debit > 0 and credit > 0))
);
create index journal_lines_entry_idx on public.journal_lines(entry_id);
create index journal_lines_account_idx on public.journal_lines(account_id);
create index journal_lines_party_idx on public.journal_lines(party_id);
create index journal_lines_tenant_idx on public.journal_lines(tenant_id);

-- ================= FINANCE =================
create table public.tax_rates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  name text not null, rate numeric(7,4) not null check (rate >= 0 and rate <= 100),
  applies_to text not null default 'both' check (applies_to in ('sales','purchases','both')),
  is_active boolean not null default true, created_at timestamptz not null default now()
);
create table public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  kind text not null check (kind in ('cash','bank')),
  name text not null,
  account_id uuid not null unique references public.accounts(id),
  currency_code text not null references public.currencies(code),
  bank_name text, account_number text, iban text,
  branch_id uuid references public.branches(id),
  is_active boolean not null default true,
  created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  kind text not null check (kind in ('income','expense')),
  name_ar text not null, name_en text,
  account_id uuid not null references public.accounts(id),
  is_active boolean not null default true, created_at timestamptz not null default now()
);

-- ================= INVENTORY =================
create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  name text not null, created_at timestamptz not null default now()
);
create table public.units (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  name text not null, symbol text, created_at timestamptz not null default now()
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  sku text not null, name text not null, description text,
  type text not null default 'stock' check (type in ('stock','service')),
  category_id uuid references public.product_categories(id) on delete set null,
  unit_id uuid references public.units(id) on delete set null,
  sale_price numeric(20,4) not null default 0 check (sale_price >= 0),
  purchase_price numeric(20,4) not null default 0 check (purchase_price >= 0),
  avg_cost numeric(20,6) not null default 0,
  reorder_level numeric(18,4) not null default 0 check (reorder_level >= 0),
  tax_rate_id uuid references public.tax_rates(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(tenant_id, sku)
);
create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  code text not null, name text not null,
  branch_id uuid references public.branches(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(), unique(tenant_id, code)
);
create table public.stock_levels (
  tenant_id uuid not null references public.tenants(id),
  product_id uuid not null references public.products(id),
  warehouse_id uuid not null references public.warehouses(id),
  quantity numeric(18,4) not null default 0,
  primary key (product_id, warehouse_id)
);
create table public.stock_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  number text not null,
  doc_type text not null check (doc_type in ('receipt','issue','transfer','adjustment','count')),
  doc_date date not null,
  warehouse_id uuid not null references public.warehouses(id),
  to_warehouse_id uuid references public.warehouses(id),
  counter_account_id uuid references public.accounts(id),
  notes text, total_value numeric(20,2) not null default 0,
  journal_entry_id uuid references public.journal_entries(id),
  created_by uuid, created_at timestamptz not null default now(),
  unique(tenant_id, number)
);
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  product_id uuid not null references public.products(id),
  warehouse_id uuid not null references public.warehouses(id),
  movement_date date not null,
  movement_type text not null check (movement_type in ('receipt','issue','sale','purchase','transfer_in','transfer_out','adjustment','sale_void','purchase_void')),
  quantity numeric(18,4) not null check (quantity <> 0),
  unit_cost numeric(20,6) not null default 0,
  total_cost numeric(20,2) not null default 0,
  balance_after numeric(18,4) not null default 0,
  avg_cost_after numeric(20,6) not null default 0,
  source_type text not null, source_id uuid not null,
  notes text, created_by uuid, created_at timestamptz not null default now()
);
create index stock_movements_product_idx on public.stock_movements(product_id, movement_date);

-- ================= SALES & PURCHASES =================
create table public.sales_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  number text,
  kind text not null default 'standard' check (kind in ('standard','opening')),
  customer_id uuid not null references public.parties(id),
  branch_id uuid references public.branches(id),
  warehouse_id uuid references public.warehouses(id),
  invoice_date date not null, due_date date not null,
  currency_code text not null references public.currencies(code),
  exchange_rate numeric(20,8) not null default 1 check (exchange_rate > 0),
  status text not null default 'draft' check (status in ('draft','approved','posted','partially_paid','paid','void')),
  subtotal numeric(20,2) not null default 0, discount_total numeric(20,2) not null default 0,
  tax_total numeric(20,2) not null default 0, total numeric(20,2) not null default 0,
  amount_paid numeric(20,2) not null default 0, amount_credited numeric(20,2) not null default 0,
  notes text, terms text,
  journal_entry_id uuid references public.journal_entries(id),
  created_by uuid, approved_by uuid, approved_at timestamptz, posted_by uuid, posted_at timestamptz,
  voided_by uuid, voided_at timestamptz, void_reason text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(tenant_id, number),
  check (due_date >= invoice_date),
  check (amount_paid >= 0 and amount_credited >= 0 and amount_paid + amount_credited <= total)
);
create index sales_invoices_customer_idx on public.sales_invoices(customer_id);
create table public.sales_invoice_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  invoice_id uuid not null references public.sales_invoices(id) on delete cascade,
  line_no int not null,
  product_id uuid references public.products(id),
  description text not null,
  quantity numeric(18,4) not null check (quantity > 0),
  unit_price numeric(20,4) not null check (unit_price >= 0),
  discount_pct numeric(7,4) not null default 0 check (discount_pct between 0 and 100),
  tax_rate_id uuid references public.tax_rates(id),
  tax_rate numeric(7,4) not null default 0,
  line_subtotal numeric(20,2) not null default 0, line_discount numeric(20,2) not null default 0,
  line_tax numeric(20,2) not null default 0, line_total numeric(20,2) not null default 0,
  account_id uuid references public.accounts(id),
  unit_cost numeric(20,6)
);
create table public.purchase_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  number text,
  kind text not null default 'standard' check (kind in ('standard','opening')),
  supplier_id uuid not null references public.parties(id),
  supplier_reference text,
  branch_id uuid references public.branches(id),
  warehouse_id uuid references public.warehouses(id),
  invoice_date date not null, due_date date not null,
  currency_code text not null references public.currencies(code),
  exchange_rate numeric(20,8) not null default 1 check (exchange_rate > 0),
  status text not null default 'draft' check (status in ('draft','approved','posted','partially_paid','paid','void')),
  subtotal numeric(20,2) not null default 0, discount_total numeric(20,2) not null default 0,
  tax_total numeric(20,2) not null default 0, total numeric(20,2) not null default 0,
  amount_paid numeric(20,2) not null default 0, amount_credited numeric(20,2) not null default 0,
  notes text,
  journal_entry_id uuid references public.journal_entries(id),
  created_by uuid, approved_by uuid, approved_at timestamptz, posted_by uuid, posted_at timestamptz,
  voided_by uuid, voided_at timestamptz, void_reason text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(tenant_id, number),
  check (due_date >= invoice_date),
  check (amount_paid >= 0 and amount_credited >= 0 and amount_paid + amount_credited <= total)
);
create index purchase_invoices_supplier_idx on public.purchase_invoices(supplier_id);
create table public.purchase_invoice_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  invoice_id uuid not null references public.purchase_invoices(id) on delete cascade,
  line_no int not null,
  product_id uuid references public.products(id),
  description text not null,
  quantity numeric(18,4) not null check (quantity > 0),
  unit_price numeric(20,4) not null check (unit_price >= 0),
  discount_pct numeric(7,4) not null default 0 check (discount_pct between 0 and 100),
  tax_rate_id uuid references public.tax_rates(id),
  tax_rate numeric(7,4) not null default 0,
  line_subtotal numeric(20,2) not null default 0, line_discount numeric(20,2) not null default 0,
  line_tax numeric(20,2) not null default 0, line_total numeric(20,2) not null default 0,
  account_id uuid references public.accounts(id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  number text not null,
  direction text not null check (direction in ('in','out')),
  party_id uuid not null references public.parties(id),
  financial_account_id uuid not null references public.financial_accounts(id),
  payment_date date not null,
  amount numeric(20,2) not null check (amount > 0),
  currency_code text not null references public.currencies(code),
  exchange_rate numeric(20,8) not null default 1 check (exchange_rate > 0),
  method text not null default 'cash' check (method in ('cash','bank_transfer','cheque','card','mobile_money','other')),
  reference text, notes text,
  status text not null default 'posted' check (status in ('posted','void')),
  journal_entry_id uuid references public.journal_entries(id),
  created_by uuid, created_at timestamptz not null default now(),
  voided_by uuid, voided_at timestamptz,
  unique(tenant_id, number)
);
create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  payment_id uuid not null references public.payments(id),
  sales_invoice_id uuid references public.sales_invoices(id),
  purchase_invoice_id uuid references public.purchase_invoices(id),
  amount numeric(20,2) not null check (amount > 0),
  check (num_nonnulls(sales_invoice_id, purchase_invoice_id) = 1)
);
create table public.credit_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  number text not null,
  kind text not null check (kind in ('sales','purchase')),
  party_id uuid not null references public.parties(id),
  sales_invoice_id uuid references public.sales_invoices(id),
  purchase_invoice_id uuid references public.purchase_invoices(id),
  note_date date not null,
  currency_code text not null references public.currencies(code),
  exchange_rate numeric(20,8) not null default 1,
  amount numeric(20,2) not null check (amount > 0),
  tax_amount numeric(20,2) not null default 0 check (tax_amount >= 0),
  total numeric(20,2) not null,
  reason text not null,
  status text not null default 'posted' check (status in ('posted','void')),
  journal_entry_id uuid references public.journal_entries(id),
  created_by uuid, created_at timestamptz not null default now(),
  unique(tenant_id, number)
);
create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  number text not null,
  from_account_id uuid not null references public.financial_accounts(id),
  to_account_id uuid not null references public.financial_accounts(id),
  transfer_date date not null,
  amount numeric(20,2) not null check (amount > 0),
  to_amount numeric(20,2) not null check (to_amount > 0),
  from_rate numeric(20,8) not null default 1, to_rate numeric(20,8) not null default 1,
  reference text, notes text,
  status text not null default 'posted' check (status in ('posted','void')),
  journal_entry_id uuid references public.journal_entries(id),
  created_by uuid, created_at timestamptz not null default now(),
  unique(tenant_id, number),
  check (from_account_id <> to_account_id)
);
create table public.cash_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  number text not null,
  kind text not null check (kind in ('income','expense')),
  transaction_date date not null,
  category_id uuid not null references public.categories(id),
  financial_account_id uuid not null references public.financial_accounts(id),
  party_id uuid references public.parties(id),
  branch_id uuid references public.branches(id),
  cost_center_id uuid references public.cost_centers(id),
  amount numeric(20,2) not null check (amount > 0),
  tax_rate_id uuid references public.tax_rates(id),
  tax_amount numeric(20,2) not null default 0,
  total numeric(20,2) not null,
  currency_code text not null references public.currencies(code),
  exchange_rate numeric(20,8) not null default 1,
  payment_method text not null default 'cash',
  reference text, description text,
  status text not null check (status in ('pending_approval','posted','rejected','void')),
  approval_note text,
  journal_entry_id uuid references public.journal_entries(id),
  created_by uuid, approved_by uuid, approved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(tenant_id, number)
);
create table public.bank_reconciliations (
  line_id uuid primary key references public.journal_lines(id),
  tenant_id uuid not null references public.tenants(id),
  financial_account_id uuid not null references public.financial_accounts(id),
  statement_date date,
  reconciled_by uuid default auth.uid(), reconciled_at timestamptz not null default now()
);

-- ================= SYSTEM =================
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  entity_type text not null, entity_id uuid not null,
  file_path text not null, file_name text not null, mime_type text,
  size_bytes bigint not null default 0 check (size_bytes >= 0 and size_bytes <= 10485760),
  uploaded_by uuid default auth.uid(), created_at timestamptz not null default now()
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, body text, link text, read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  entity_type text not null, entity_id uuid not null,
  requested_by uuid, status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by uuid, decided_at timestamptz, comment text,
  created_at timestamptz not null default now()
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('platform','tenant')),
  tenant_id uuid,
  actor_id uuid, actor_email text,
  action text not null, entity_type text not null, entity_id text,
  before jsonb, after jsonb, ip text, user_agent text,
  created_at timestamptz not null default now()
);
create index audit_logs_tenant_idx on public.audit_logs(tenant_id, created_at desc);
create index audit_logs_scope_idx on public.audit_logs(scope, created_at desc);

-- tenant indexes
create index on public.branches(tenant_id);
create index on public.tenant_memberships(user_id);
create index on public.accounts(tenant_id);
create index on public.parties(tenant_id, kind);
create index on public.sales_invoices(tenant_id, invoice_date);
create index on public.purchase_invoices(tenant_id, invoice_date);
create index on public.payments(tenant_id, payment_date);
create index on public.cash_transactions(tenant_id, transaction_date);
create index on public.products(tenant_id);

-- ================= HELPER FUNCTIONS =================
create or replace function public.is_platform_admin(_uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.platform_admins where user_id = _uid)
$$;
create or replace function public.has_platform_role(_roles text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.platform_admins where user_id = auth.uid() and role = any(_roles))
$$;
create or replace function public.is_member(_tenant uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.tenant_memberships where tenant_id = _tenant and user_id = auth.uid() and status = 'active')
$$;
create or replace function public.has_perm(_tenant uuid, _perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.tenant_memberships m join public.tenant_roles r on r.id = m.role_id
    where m.tenant_id = _tenant and m.user_id = auth.uid() and m.status = 'active'
      and (r.code = 'owner' or exists(select 1 from public.tenant_role_permissions rp where rp.role_id = r.id and rp.permission_code = _perm))
  )
$$;
create or replace function public.tenant_operational(_tenant uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.tenants t where t.id = _tenant and t.status = 'active')
     and exists(select 1 from public.subscriptions s where s.tenant_id = _tenant and s.is_current
        and (s.status in ('active','past_due') or (s.status = 'trial' and (s.trial_ends_at is null or s.trial_ends_at >= current_date))))
$$;
create or replace function public.can_write(_tenant uuid, _perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_perm(_tenant, _perm) and public.tenant_operational(_tenant)
$$;
create or replace function public.shares_tenant(_other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.tenant_memberships a join public.tenant_memberships b on a.tenant_id = b.tenant_id
                where a.user_id = auth.uid() and b.user_id = _other)
$$;

create or replace function public._require(_tenant uuid, _perm text)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول أولاً' using errcode = '28000'; end if;
  if not public.has_perm(_tenant, _perm) then
    raise exception 'ليس لديك صلاحية لتنفيذ هذا الإجراء (%)', _perm using errcode = '42501';
  end if;
  if not public.tenant_operational(_tenant) then
    raise exception 'الشركة موقوفة أو انتهى اشتراكها، العمليات المالية غير متاحة' using errcode = '42501';
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;

create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = public as $$
declare _new jsonb; _old jsonb; _tenant uuid; _id text; _hdr json; _scope text; _rec jsonb;
begin
  if tg_op <> 'INSERT' then _old := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then _new := to_jsonb(new); end if;
  if tg_op = 'UPDATE' and (_old - 'updated_at') = (_new - 'updated_at') then return new; end if;
  _rec := coalesce(_new, _old);
  if tg_table_name = 'tenants' then _tenant := (_rec->>'id')::uuid; else _tenant := nullif(_rec->>'tenant_id','')::uuid; end if;
  _id := coalesce(_rec->>'id', _rec->>'user_id', _rec->>'role_id');
  _scope := case when tg_table_name in ('subscription_plans','platform_admins','platform_settings','subscriptions','subscription_invoices','subscription_payments') then 'platform' else 'tenant' end;
  begin _hdr := nullif(current_setting('request.headers', true),'')::json; exception when others then _hdr := null; end;
  insert into public.audit_logs(scope, tenant_id, actor_id, actor_email, action, entity_type, entity_id, before, after, ip, user_agent)
  values (_scope, _tenant, auth.uid(), (select email from public.profiles where id = auth.uid()), lower(tg_op), tg_table_name, _id, _old, _new,
          nullif(split_part(coalesce(_hdr->>'x-forwarded-for', _hdr->>'cf-connecting-ip', ''), ',', 1), ''), _hdr->>'user-agent');
  return coalesce(new, old);
end $$;

create or replace function public.log_action(_scope text, _tenant uuid, _action text, _entity_type text, _entity_id text, _details jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
declare _hdr json;
begin
  begin _hdr := nullif(current_setting('request.headers', true),'')::json; exception when others then _hdr := null; end;
  insert into public.audit_logs(scope, tenant_id, actor_id, actor_email, action, entity_type, entity_id, after, ip, user_agent)
  values (_scope, _tenant, auth.uid(), (select email from public.profiles where id = auth.uid()), _action, _entity_type, _entity_id, _details,
          nullif(split_part(coalesce(_hdr->>'x-forwarded-for', _hdr->>'cf-connecting-ip', ''), ',', 1), ''), _hdr->>'user-agent');
end $$;
revoke execute on function public.log_action(text,uuid,text,text,text,jsonb) from public, anon, authenticated;

-- profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ================= GRANTS & RLS =================
-- direct-write tables
grant select, insert, update, delete on
  public.tenant_roles, public.tenant_role_permissions, public.branches, public.accounts, public.cost_centers,
  public.exchange_rates, public.parties, public.tax_rates, public.categories, public.product_categories,
  public.units, public.products, public.warehouses, public.bank_reconciliations, public.attachments,
  public.subscription_plans
to authenticated;
grant select, update on public.profiles, public.tenants, public.financial_accounts, public.numbering_sequences, public.notifications, public.platform_settings to authenticated;
-- read-only (written via functions)
grant select on
  public.platform_admins, public.subscriptions, public.subscription_invoices, public.subscription_payments,
  public.tenant_memberships, public.tenant_invitations, public.fiscal_years, public.accounting_periods,
  public.journal_entries, public.journal_lines, public.stock_levels, public.stock_documents, public.stock_movements,
  public.sales_invoices, public.sales_invoice_items, public.purchase_invoices, public.purchase_invoice_items,
  public.payments, public.payment_allocations, public.credit_notes, public.transfers, public.cash_transactions,
  public.approval_requests, public.audit_logs
to authenticated;
grant select on public.subscription_plans, public.platform_settings to anon;
grant all on all tables in schema public to service_role;

do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename not in ('currencies','permissions') loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_tenant(id) or public.is_platform_admin());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- platform
create policy platform_admins_select on public.platform_admins for select to authenticated using (public.is_platform_admin() or user_id = auth.uid());
create policy platform_settings_select on public.platform_settings for select using (true);
create policy platform_settings_update on public.platform_settings for update to authenticated using (public.has_platform_role(array['super_admin'])) with check (public.has_platform_role(array['super_admin']));
create policy plans_select on public.subscription_plans for select using (is_active or public.is_platform_admin());
create policy plans_insert on public.subscription_plans for insert to authenticated with check (public.has_platform_role(array['super_admin','finance']));
create policy plans_update on public.subscription_plans for update to authenticated using (public.has_platform_role(array['super_admin','finance'])) with check (public.has_platform_role(array['super_admin','finance']));
create policy plans_delete on public.subscription_plans for delete to authenticated using (public.has_platform_role(array['super_admin']));
create policy subs_select on public.subscriptions for select to authenticated using (public.is_member(tenant_id) or public.is_platform_admin());
create policy subinv_select on public.subscription_invoices for select to authenticated using (public.is_member(tenant_id) or public.is_platform_admin());
create policy subpay_select on public.subscription_payments for select to authenticated using (public.is_member(tenant_id) or public.is_platform_admin());
-- tenants
create policy tenants_select on public.tenants for select to authenticated using (public.is_member(id) or public.is_platform_admin());
create policy tenants_update on public.tenants for update to authenticated using (public.can_write(id, 'settings.manage')) with check (public.can_write(id, 'settings.manage'));
create policy roles_select on public.tenant_roles for select to authenticated using (public.is_member(tenant_id) or public.is_platform_admin());
create policy roles_insert on public.tenant_roles for insert to authenticated with check (public.can_write(tenant_id, 'roles.manage'));
create policy roles_update on public.tenant_roles for update to authenticated using (public.can_write(tenant_id, 'roles.manage')) with check (public.can_write(tenant_id, 'roles.manage'));
create policy roles_delete on public.tenant_roles for delete to authenticated using (public.can_write(tenant_id, 'roles.manage') and not is_system);
create policy roleperm_select on public.tenant_role_permissions for select to authenticated using (public.is_member(tenant_id));
create policy roleperm_insert on public.tenant_role_permissions for insert to authenticated with check (public.can_write(tenant_id, 'roles.manage'));
create policy roleperm_delete on public.tenant_role_permissions for delete to authenticated using (public.can_write(tenant_id, 'roles.manage'));
create policy members_select on public.tenant_memberships for select to authenticated using (public.is_member(tenant_id) or user_id = auth.uid() or public.is_platform_admin());
create policy invites_select on public.tenant_invitations for select to authenticated using (public.has_perm(tenant_id, 'users.manage') or lower(email) = lower(coalesce(auth.jwt()->>'email','')));
create policy notif_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notif_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy numbering_select on public.numbering_sequences for select to authenticated using (public.is_member(tenant_id));
create policy numbering_update on public.numbering_sequences for update to authenticated using (public.can_write(tenant_id, 'settings.manage')) with check (public.can_write(tenant_id, 'settings.manage'));
create policy fa_update on public.financial_accounts for update to authenticated using (public.can_write(tenant_id, 'cash.manage')) with check (public.can_write(tenant_id, 'cash.manage'));
create policy audit_select on public.audit_logs for select to authenticated
  using ((scope = 'tenant' and public.has_perm(tenant_id, 'audit.view')) or (scope = 'platform' and public.is_platform_admin()));
create policy journal_select on public.journal_entries for select to authenticated
  using (public.has_perm(tenant_id, 'journal.view') or public.has_perm(tenant_id, 'reports.view') or public.has_perm(tenant_id, 'cash.view'));
create policy journal_lines_select on public.journal_lines for select to authenticated
  using (public.has_perm(tenant_id, 'journal.view') or public.has_perm(tenant_id, 'reports.view') or public.has_perm(tenant_id, 'cash.view'));
create policy attachments_insert on public.attachments for insert to authenticated with check (public.is_member(tenant_id) and public.tenant_operational(tenant_id) and uploaded_by = auth.uid());
create policy attachments_delete on public.attachments for delete to authenticated using (public.is_member(tenant_id) and (uploaded_by = auth.uid() or public.has_perm(tenant_id, 'settings.manage')));
create policy recon_insert on public.bank_reconciliations for insert to authenticated with check (public.can_write(tenant_id, 'cash.manage'));
create policy recon_delete on public.bank_reconciliations for delete to authenticated using (public.can_write(tenant_id, 'cash.manage'));
create policy parties_insert on public.parties for insert to authenticated with check (public.can_write(tenant_id, case when kind = 'customer' then 'customers.manage' else 'suppliers.manage' end));
create policy parties_update on public.parties for update to authenticated using (public.can_write(tenant_id, case when kind = 'customer' then 'customers.manage' else 'suppliers.manage' end)) with check (public.can_write(tenant_id, case when kind = 'customer' then 'customers.manage' else 'suppliers.manage' end));

-- generic member-select for tenant tables
do $$ declare t text; begin
  foreach t in array array['branches','fiscal_years','accounting_periods','accounts','cost_centers','exchange_rates','parties','tax_rates',
    'financial_accounts','categories','product_categories','units','products','warehouses','stock_levels','stock_documents','stock_movements',
    'sales_invoices','sales_invoice_items','purchase_invoices','purchase_invoice_items','payments','payment_allocations','credit_notes',
    'transfers','cash_transactions','bank_reconciliations','attachments','approval_requests'] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.is_member(tenant_id))', t || '_member_select', t);
  end loop;
end $$;

-- generic permission-write for master data
do $$ declare r record; begin
  for r in select * from (values
    ('branches','branches.manage'),('accounts','accounts.manage'),('cost_centers','accounts.manage'),('categories','accounts.manage'),
    ('exchange_rates','currencies.manage'),('tax_rates','settings.manage'),
    ('product_categories','inventory.manage'),('units','inventory.manage'),('products','inventory.manage'),('warehouses','inventory.manage')
  ) as v(tbl, perm) loop
    execute format('create policy %I on public.%I for insert to authenticated with check (public.can_write(tenant_id, %L))', r.tbl || '_ins', r.tbl, r.perm);
    execute format('create policy %I on public.%I for update to authenticated using (public.can_write(tenant_id, %L)) with check (public.can_write(tenant_id, %L))', r.tbl || '_upd', r.tbl, r.perm, r.perm);
    execute format('create policy %I on public.%I for delete to authenticated using (public.can_write(tenant_id, %L))', r.tbl || '_del', r.tbl, r.perm);
  end loop;
end $$;

-- updated_at triggers
do $$ declare t text; begin
  foreach t in array array['profiles','subscription_plans','tenants','subscriptions','branches','tenant_memberships','accounts','parties',
    'journal_entries','financial_accounts','products','sales_invoices','purchase_invoices','cash_transactions'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_at', t);
  end loop;
end $$;

-- audit triggers
do $$ declare t text; begin
  foreach t in array array['tenants','tenant_memberships','tenant_roles','tenant_invitations','branches','accounts','cost_centers','exchange_rates',
    'fiscal_years','accounting_periods','journal_entries','parties','tax_rates','financial_accounts','categories','products','warehouses',
    'stock_documents','sales_invoices','purchase_invoices','payments','credit_notes','transfers','cash_transactions','numbering_sequences',
    'subscription_plans','platform_admins','platform_settings','subscriptions','subscription_invoices','subscription_payments'] loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_row()', t || '_audit', t);
  end loop;
end $$;
