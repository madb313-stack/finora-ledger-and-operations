
-- ================= GUARDS =================
create or replace function public.tenants_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare _plan_inv boolean;
begin
  if not public.is_platform_admin() then
    new.status := old.status; new.suspended_reason := old.suspended_reason;
  end if;
  new.created_by := old.created_by;
  if new.base_currency <> old.base_currency and exists(select 1 from public.journal_entries where tenant_id = new.id and status <> 'draft') then
    raise exception 'لا يمكن تغيير العملة الأساسية بعد ترحيل قيود محاسبية';
  end if;
  if new.inventory_enabled and not old.inventory_enabled then
    select p.inventory_enabled into _plan_inv from public.subscriptions s join public.subscription_plans p on p.id = s.plan_id where s.tenant_id = new.id and s.is_current;
    if coalesce(_plan_inv, false) = false then raise exception 'خطة الاشتراك الحالية لا تتضمن وحدة المخزون'; end if;
  end if;
  return new;
end $$;
create trigger tenants_guard before update on public.tenants for each row execute function public.tenants_guard();

create or replace function public.journal_entries_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then raise exception 'لا يمكن حذف قيد مُرحّل؛ استخدم القيد العكسي'; end if;
    return old;
  end if;
  if old.status = 'reversed' then raise exception 'القيد معكوس ولا يمكن تعديله'; end if;
  if old.status = 'posted' then
    if new.status = 'reversed' and new.reversed_by is not null and new.entry_date = old.entry_date
       and new.total_debit = old.total_debit and new.total_credit = old.total_credit
       and new.number is not distinct from old.number and new.tenant_id = old.tenant_id then
      return new;
    end if;
    raise exception 'القيود المرحّلة غير قابلة للتعديل؛ صحّح الخطأ بقيد عكسي';
  end if;
  return new;
end $$;
create trigger journal_entries_guard before update or delete on public.journal_entries for each row execute function public.journal_entries_guard();

create or replace function public.journal_lines_guard() returns trigger language plpgsql set search_path = public as $$
declare _st text; _t uuid;
begin
  select status, tenant_id into _st, _t from public.journal_entries where id = coalesce(new.entry_id, old.entry_id);
  if _st is distinct from 'draft' then raise exception 'لا يمكن تعديل أسطر قيد مُرحّل'; end if;
  if tg_op = 'DELETE' then return old; end if;
  if new.tenant_id <> _t then raise exception 'سطر القيد لا ينتمي لنفس الشركة'; end if;
  if not exists(select 1 from public.accounts a where a.id = new.account_id and a.tenant_id = new.tenant_id) then
    raise exception 'الحساب لا ينتمي لهذه الشركة';
  end if;
  if new.party_id is not null and not exists(select 1 from public.parties p where p.id = new.party_id and p.tenant_id = new.tenant_id) then
    raise exception 'الطرف لا ينتمي لهذه الشركة';
  end if;
  return new;
end $$;
create trigger journal_lines_guard before insert or update or delete on public.journal_lines for each row execute function public.journal_lines_guard();

create or replace function public.accounts_guard() returns trigger language plpgsql set search_path = public as $$
declare _p record; _seed boolean := coalesce(current_setting('finora.seeding', true), '') = 'on';
begin
  if tg_op = 'DELETE' then
    if old.is_system then raise exception 'لا يمكن حذف حساب نظامي'; end if;
    if exists(select 1 from public.journal_lines where account_id = old.id) then raise exception 'لا يمكن حذف حساب عليه حركات؛ يمكنك إيقافه بدلاً من ذلك'; end if;
    if exists(select 1 from public.accounts where parent_id = old.id) then raise exception 'لا يمكن حذف حساب له حسابات فرعية'; end if;
    return old;
  end if;
  if new.parent_id is not null then
    select * into _p from public.accounts where id = new.parent_id;
    if _p.id is null or _p.tenant_id <> new.tenant_id or not _p.is_group then raise exception 'الحساب الأب يجب أن يكون حساباً تجميعياً في نفس الشركة'; end if;
    if _p.type <> new.type then raise exception 'نوع الحساب يجب أن يطابق نوع الحساب الأب'; end if;
    if tg_op = 'UPDATE' and new.parent_id = new.id then raise exception 'لا يمكن جعل الحساب أباً لنفسه'; end if;
  end if;
  if tg_op = 'INSERT' then
    if not _seed then
      new.is_system := false;
      if new.subtype in ('receivable','payable','inventory','tax_receivable','tax_payable','retained_earnings','opening_equity','sales','service_revenue',
                         'sales_returns','fx_gain','fx_loss','cogs','purchases','purchase_returns','inventory_adjustment','cash_group','bank_group','cash','bank') then
        raise exception 'هذا النوع الفرعي محجوز لحسابات النظام';
      end if;
    end if;
    return new;
  end if;
  new.is_system := old.is_system;
  if old.is_system and (new.type <> old.type or new.subtype is distinct from old.subtype or new.is_group <> old.is_group or new.code <> old.code) then
    raise exception 'لا يمكن تغيير الرمز أو النوع لحساب نظامي';
  end if;
  if not _seed and new.subtype is distinct from old.subtype then raise exception 'لا يمكن تغيير النوع الفرعي للحساب'; end if;
  if (new.is_group <> old.is_group or new.type <> old.type) and exists(select 1 from public.journal_lines where account_id = new.id) then
    raise exception 'لا يمكن تغيير نوع حساب عليه حركات';
  end if;
  return new;
end $$;
create trigger accounts_guard before insert or update or delete on public.accounts for each row execute function public.accounts_guard();

create or replace function public.roles_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.is_system then raise exception 'لا يمكن حذف دور نظامي'; end if;
    if exists(select 1 from public.tenant_memberships where role_id = old.id) then raise exception 'لا يمكن حذف دور مسند لمستخدمين'; end if;
    return old;
  end if;
  if tg_op = 'INSERT' then
    if coalesce(current_setting('finora.seeding', true), '') <> 'on' then new.is_system := false; end if;
    return new;
  end if;
  if old.is_system then new.code := old.code; end if;
  new.is_system := old.is_system;
  return new;
end $$;
create trigger roles_guard before insert or update or delete on public.tenant_roles for each row execute function public.roles_guard();

create or replace function public.role_perms_guard() returns trigger language plpgsql set search_path = public as $$
declare _r record;
begin
  select * into _r from public.tenant_roles where id = coalesce(new.role_id, old.role_id);
  if _r.code = 'owner' and coalesce(current_setting('finora.seeding', true), '') <> 'on' then raise exception 'صلاحيات دور المالك ثابتة'; end if;
  if tg_op = 'INSERT' and new.tenant_id <> _r.tenant_id then raise exception 'الدور لا ينتمي لهذه الشركة'; end if;
  return coalesce(new, old);
end $$;
create trigger role_perms_guard before insert or delete on public.tenant_role_permissions for each row execute function public.role_perms_guard();

create or replace function public.branches_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare _max int;
begin
  select p.max_branches into _max from public.subscriptions s join public.subscription_plans p on p.id = s.plan_id where s.tenant_id = new.tenant_id and s.is_current;
  if _max is not null and (select count(*) from public.branches where tenant_id = new.tenant_id) >= _max then
    raise exception 'تم بلوغ الحد الأقصى لعدد الفروع في خطة الاشتراك (%)', _max;
  end if;
  return new;
end $$;
create trigger branches_guard before insert on public.branches for each row execute function public.branches_guard();

create or replace function public.exchange_rates_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if exists(select 1 from public.tenants where id = new.tenant_id and base_currency = new.currency_code) then
    raise exception 'لا حاجة لسعر صرف للعملة الأساسية';
  end if;
  return new;
end $$;
create trigger exchange_rates_guard before insert or update on public.exchange_rates for each row execute function public.exchange_rates_guard();

-- ================= CORE HELPERS =================
create or replace function public._next_number(_tenant uuid, _key text) returns text
language plpgsql security definer set search_path = public as $$
declare _prefix text; _n bigint; _pad int;
begin
  insert into public.numbering_sequences(tenant_id, key, prefix) values (_tenant, _key,
    case _key when 'journal' then 'JV-' when 'sales_invoice' then 'INV-' when 'purchase_invoice' then 'BILL-'
      when 'receipt' then 'RCT-' when 'disbursement' then 'PAY-' when 'transfer' then 'TRF-' when 'income' then 'INC-'
      when 'expense' then 'EXP-' when 'credit_note_sales' then 'CN-' when 'credit_note_purchase' then 'DN-'
      when 'stock' then 'STK-' when 'customer' then 'C-' when 'supplier' then 'S-' when 'opening' then 'OB-' else upper(_key) || '-' end)
  on conflict (tenant_id, key) do nothing;
  update public.numbering_sequences set next_value = next_value + 1 where tenant_id = _tenant and key = _key
  returning prefix, next_value - 1, padding into _prefix, _n, _pad;
  return _prefix || lpad(_n::text, _pad, '0');
end $$;

create or replace function public.get_exchange_rate(_tenant uuid, _currency text, _date date) returns numeric
language plpgsql stable security definer set search_path = public as $$
declare _base text; _r numeric;
begin
  if not public.is_member(_tenant) then raise exception 'غير مصرح' using errcode = '42501'; end if;
  select base_currency into _base from public.tenants where id = _tenant;
  if _currency is null or _currency = _base then return 1; end if;
  select rate into _r from public.exchange_rates where tenant_id = _tenant and currency_code = _currency and rate_date <= _date order by rate_date desc limit 1;
  if _r is null then raise exception 'لا يوجد سعر صرف مسجل للعملة % حتى تاريخ %. أضف سعر الصرف من الإعدادات', _currency, _date; end if;
  return _r;
end $$;

create or replace function public._acct(_tenant uuid, _subtype text) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare _id uuid;
begin
  select id into _id from public.accounts where tenant_id = _tenant and subtype = _subtype and not is_group and is_active order by code limit 1;
  if _id is null then raise exception 'لم يتم العثور على حساب النظام المطلوب (%) في دليل الحسابات', _subtype; end if;
  return _id;
end $$;

create or replace function public._period_for(_tenant uuid, _date date) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare _p record;
begin
  select p.id, p.status into _p from public.accounting_periods p where p.tenant_id = _tenant and _date between p.start_date and p.end_date limit 1;
  if _p.id is null then raise exception 'لا توجد فترة محاسبية مفتوحة تغطي التاريخ %. أنشئ السنة المالية أولاً', _date; end if;
  if _p.status = 'closed' then raise exception 'الفترة المحاسبية الخاصة بتاريخ % مغلقة ولا تقبل الترحيل', _date; end if;
  return _p.id;
end $$;

create or replace function public._post_entry(_entry uuid) returns void
language plpgsql security definer set search_path = public as $$
declare e record; _d numeric; _c numeric; _n int; _bad int;
begin
  select * into e from public.journal_entries where id = _entry for update;
  if e.id is null then raise exception 'القيد غير موجود'; end if;
  if e.status <> 'draft' then raise exception 'القيد مُرحّل مسبقاً ولا يمكن ترحيله مرة أخرى'; end if;
  select coalesce(sum(debit),0), coalesce(sum(credit),0), count(*) into _d, _c, _n from public.journal_lines where entry_id = _entry;
  if _n < 2 then raise exception 'يجب أن يحتوي القيد على سطرين على الأقل'; end if;
  if _d <> _c then raise exception 'القيد غير متوازن: مجموع المدين (%) لا يساوي مجموع الدائن (%)', _d, _c; end if;
  if _d = 0 then raise exception 'لا يمكن ترحيل قيد بقيمة صفرية'; end if;
  select count(*) into _bad from public.journal_lines l join public.accounts a on a.id = l.account_id
   where l.entry_id = _entry and (a.is_group or not a.is_active or a.tenant_id <> e.tenant_id);
  if _bad > 0 then raise exception 'لا يمكن الترحيل على حسابات تجميعية أو موقوفة'; end if;
  update public.journal_entries set status = 'posted', period_id = public._period_for(e.tenant_id, e.entry_date),
    number = coalesce(number, public._next_number(e.tenant_id, 'journal')),
    total_debit = _d, total_credit = _c, posted_by = auth.uid(), posted_at = now()
  where id = _entry;
end $$;

-- lines: [{account_id, debit, credit, description, party_id, cost_center_id, currency_code, fx_rate, fc_amount}]
create or replace function public._insert_lines(_tenant uuid, _entry uuid, _branch uuid, _lines jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare _l jsonb; _i int := 0; _v numeric;
begin
  for _l in select * from jsonb_array_elements(coalesce(_lines, '[]'::jsonb)) loop
    _v := round(coalesce(nullif(_l->>'debit','')::numeric, 0) - coalesce(nullif(_l->>'credit','')::numeric, 0), 2);
    if _v = 0 then continue; end if;
    _i := _i + 1;
    insert into public.journal_lines(tenant_id, entry_id, line_no, account_id, description, debit, credit, currency_code, fx_rate, fc_amount, party_id, cost_center_id, branch_id)
    values (_tenant, _entry, _i, (_l->>'account_id')::uuid, nullif(_l->>'description',''), greatest(_v, 0), greatest(-_v, 0),
            nullif(_l->>'currency_code',''), coalesce(nullif(_l->>'fx_rate','')::numeric, 1), abs(nullif(_l->>'fc_amount','')::numeric),
            nullif(_l->>'party_id','')::uuid, nullif(_l->>'cost_center_id','')::uuid, _branch);
  end loop;
  return _i;
end $$;

create or replace function public._create_entry(_tenant uuid, _date date, _desc text, _source_type text, _source_id uuid, _branch uuid, _lines jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare _id uuid;
begin
  insert into public.journal_entries(tenant_id, entry_date, description, source_type, source_id, branch_id, created_by)
  values (_tenant, _date, coalesce(_desc, ''), _source_type, _source_id, _branch, auth.uid()) returning id into _id;
  perform public._insert_lines(_tenant, _id, _branch, _lines);
  perform public._post_entry(_id);
  return _id;
end $$;

create or replace function public._reverse_entry(_entry uuid, _date date, _reason text) returns uuid
language plpgsql security definer set search_path = public as $$
declare e record; _new uuid;
begin
  select * into e from public.journal_entries where id = _entry for update;
  if e.id is null then raise exception 'القيد غير موجود'; end if;
  if e.status <> 'posted' then raise exception 'يمكن عكس القيود المرحّلة فقط'; end if;
  insert into public.journal_entries(tenant_id, entry_date, description, source_type, source_id, branch_id, reversal_of, created_by)
  values (e.tenant_id, coalesce(_date, current_date), 'عكس القيد ' || coalesce(e.number,'') || coalesce(' - ' || nullif(_reason,''), ''), 'reversal', e.id, e.branch_id, e.id, auth.uid())
  returning id into _new;
  insert into public.journal_lines(tenant_id, entry_id, line_no, account_id, description, debit, credit, currency_code, fx_rate, fc_amount, party_id, cost_center_id, branch_id)
  select tenant_id, _new, line_no, account_id, description, credit, debit, currency_code, fx_rate, fc_amount, party_id, cost_center_id, branch_id
  from public.journal_lines where entry_id = e.id;
  perform public._post_entry(_new);
  update public.journal_entries set status = 'reversed', reversed_by = _new where id = e.id;
  return _new;
end $$;

-- ================= FISCAL YEARS =================
create or replace function public._create_fiscal_year(_tenant uuid, _start date) returns uuid
language plpgsql security definer set search_path = public as $$
declare _id uuid; _end date := (_start + interval '1 year' - interval '1 day')::date; _m date;
begin
  if exists(select 1 from public.fiscal_years where tenant_id = _tenant and daterange(start_date, end_date, '[]') && daterange(_start, _end, '[]')) then
    raise exception 'تتداخل السنة المالية مع سنة مالية موجودة';
  end if;
  insert into public.fiscal_years(tenant_id, name, start_date, end_date)
  values (_tenant, case when extract(month from _start) = 1 then to_char(_start, 'YYYY') else to_char(_start, 'YYYY') || '/' || to_char(_end, 'YYYY') end, _start, _end)
  returning id into _id;
  _m := _start;
  while _m <= _end loop
    insert into public.accounting_periods(tenant_id, fiscal_year_id, name, start_date, end_date)
    values (_tenant, _id, to_char(_m, 'YYYY-MM'), _m, least((_m + interval '1 month' - interval '1 day')::date, _end));
    _m := (_m + interval '1 month')::date;
  end loop;
  return _id;
end $$;

create or replace function public.create_fiscal_year(_tenant uuid, _start date) returns uuid
language plpgsql security definer set search_path = public as $$
declare _id uuid;
begin
  perform public._require(_tenant, 'periods.manage');
  _id := public._create_fiscal_year(_tenant, _start);
  return _id;
end $$;

create or replace function public.set_period_status(_period uuid, _status text) returns void
language plpgsql security definer set search_path = public as $$
declare p record;
begin
  select ap.*, fy.status fy_status into p from public.accounting_periods ap join public.fiscal_years fy on fy.id = ap.fiscal_year_id where ap.id = _period;
  if p.id is null then raise exception 'الفترة غير موجودة'; end if;
  perform public._require(p.tenant_id, 'periods.manage');
  if _status not in ('open','closed') then raise exception 'حالة غير صالحة'; end if;
  if p.fy_status = 'closed' then raise exception 'السنة المالية مغلقة'; end if;
  update public.accounting_periods set status = _status, closed_at = case when _status = 'closed' then now() end, closed_by = case when _status = 'closed' then auth.uid() end where id = _period;
  perform public.log_action('tenant', p.tenant_id, case when _status = 'closed' then 'period_closed' else 'period_reopened' end, 'accounting_periods', _period::text, jsonb_build_object('name', p.name));
end $$;

create or replace function public.close_fiscal_year(_fy uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare fy record; _lines jsonb; _total numeric; _entry uuid;
begin
  select * into fy from public.fiscal_years where id = _fy for update;
  if fy.id is null then raise exception 'السنة المالية غير موجودة'; end if;
  perform public._require(fy.tenant_id, 'periods.manage');
  if fy.status = 'closed' then raise exception 'السنة المالية مغلقة مسبقاً'; end if;
  if exists(select 1 from public.journal_entries where tenant_id = fy.tenant_id and status = 'draft' and entry_date between fy.start_date and fy.end_date) then
    raise exception 'توجد قيود مسودة ضمن السنة المالية؛ رحّلها أو احذفها قبل الإقفال';
  end if;
  with b as (
    select l.account_id, sum(l.debit - l.credit) bal from public.journal_lines l
    join public.journal_entries e on e.id = l.entry_id join public.accounts a on a.id = l.account_id
    where e.tenant_id = fy.tenant_id and e.status in ('posted','reversed') and e.entry_date between fy.start_date and fy.end_date
      and a.type in ('revenue','expense') and e.source_type <> 'closing'
    group by l.account_id having sum(l.debit - l.credit) <> 0)
  select coalesce(jsonb_agg(jsonb_build_object('account_id', account_id, 'debit', case when bal < 0 then -bal else 0 end, 'credit', case when bal > 0 then bal else 0 end, 'description', 'إقفال')), '[]'::jsonb),
         coalesce(sum(bal), 0)
  into _lines, _total from b;
  if jsonb_array_length(_lines) > 0 then
    _lines := _lines || jsonb_build_array(jsonb_build_object('account_id', public._acct(fy.tenant_id, 'retained_earnings'), 'debit', _total, 'description', 'ترحيل صافي الربح/الخسارة للأرباح المحتجزة'));
    _entry := public._create_entry(fy.tenant_id, fy.end_date, 'قيد إقفال السنة المالية ' || fy.name, 'closing', fy.id, null, _lines);
  end if;
  update public.accounting_periods set status = 'closed', closed_at = now(), closed_by = auth.uid() where fiscal_year_id = _fy;
  update public.fiscal_years set status = 'closed', closed_at = now(), closed_by = auth.uid(), closing_entry_id = _entry where id = _fy;
  perform public.log_action('tenant', fy.tenant_id, 'fiscal_year_closed', 'fiscal_years', _fy::text, jsonb_build_object('name', fy.name, 'closing_entry', _entry));
  return _entry;
end $$;

-- ================= TENANT SETUP =================
create or replace function public._setup_tenant(_tenant uuid, _owner uuid, _fy_start date) returns void
language plpgsql security definer set search_path = public as $$
declare _owner_role uuid; _branch uuid; _cash uuid; _base text;
begin
  perform set_config('finora.seeding', 'on', true);
  select base_currency into _base from public.tenants where id = _tenant;

  insert into public.tenant_roles(tenant_id, code, name_ar, name_en, is_system) values
    (_tenant,'owner','مالك الشركة','Company Owner',true),
    (_tenant,'admin','مدير النظام','Company Administrator',true),
    (_tenant,'accountant','محاسب','Accountant',true),
    (_tenant,'finance_manager','المدير المالي','Finance Manager',true),
    (_tenant,'sales_manager','مدير المبيعات','Sales Manager',true),
    (_tenant,'sales_employee','موظف مبيعات','Sales Employee',true),
    (_tenant,'purchasing_manager','مدير المشتريات','Purchasing Manager',true),
    (_tenant,'inventory_manager','مدير المخزون','Inventory Manager',true),
    (_tenant,'auditor','مدقق حسابات','Auditor',true),
    (_tenant,'read_only','مستخدم للعرض فقط','Read Only User',true);

  insert into public.tenant_role_permissions(role_id, permission_code, tenant_id)
  select r.id, m.perm, _tenant from public.tenant_roles r
  join (
    select 'owner' rc, code perm from public.permissions
    union all select 'admin', code from public.permissions
    union all select 'accountant', unnest(array['dashboard.view','accounts.view','accounts.manage','journal.view','journal.create','journal.edit_draft','journal.post','journal.reverse','currencies.manage','reports.view','reports.export','cash.view','transactions.create','payments.record','customers.manage','suppliers.manage','sales.view','sales.create','sales.post','purchases.view','purchases.create','purchases.post','inventory.view'])
    union all select 'finance_manager', unnest(array['dashboard.view','accounts.view','accounts.manage','journal.view','journal.create','journal.edit_draft','journal.post','journal.reverse','periods.manage','currencies.manage','reports.view','reports.export','cash.view','cash.manage','transactions.create','transactions.approve','payments.record','customers.manage','suppliers.manage','sales.view','sales.create','sales.approve','sales.post','purchases.view','purchases.create','purchases.approve','purchases.post','inventory.view','audit.view'])
    union all select 'sales_manager', unnest(array['dashboard.view','customers.manage','sales.view','sales.create','sales.approve','sales.post','payments.record','reports.view','inventory.view','cash.view'])
    union all select 'sales_employee', unnest(array['dashboard.view','customers.manage','sales.view','sales.create','inventory.view'])
    union all select 'purchasing_manager', unnest(array['dashboard.view','suppliers.manage','purchases.view','purchases.create','purchases.approve','purchases.post','payments.record','inventory.view','reports.view','cash.view'])
    union all select 'inventory_manager', unnest(array['dashboard.view','inventory.view','inventory.manage','reports.view','sales.view','purchases.view'])
    union all select 'auditor', unnest(array['dashboard.view','accounts.view','journal.view','reports.view','reports.export','cash.view','sales.view','purchases.view','inventory.view','audit.view'])
    union all select 'read_only', unnest(array['dashboard.view','accounts.view','journal.view','reports.view','cash.view','sales.view','purchases.view','inventory.view'])
  ) m on m.rc = r.code
  where r.tenant_id = _tenant;

  select id into _owner_role from public.tenant_roles where tenant_id = _tenant and code = 'owner';
  insert into public.branches(tenant_id, code, name, is_main) values (_tenant, 'HQ', 'الفرع الرئيسي', true) returning id into _branch;
  insert into public.tenant_memberships(tenant_id, user_id, role_id, default_branch_id) values (_tenant, _owner, _owner_role, _branch);

  -- chart of accounts
  insert into public.accounts(tenant_id, code, name_ar, name_en, type, subtype, is_group, is_system, cash_flow_category)
  select _tenant, v.code, v.ar, v.en, v.typ, v.sub, v.grp, (v.grp or v.sub is not null), v.cf from (values
    ('1',null,'الأصول','Assets','asset',null,true,'operating'),
    ('11','1','الأصول المتداولة','Current Assets','asset',null,true,'operating'),
    ('1110','11','النقدية بالصندوق','Cash on Hand','asset','cash_group',true,'cash'),
    ('1120','11','النقدية بالبنوك','Cash at Banks','asset','bank_group',true,'cash'),
    ('1130','11','الذمم المدينة - العملاء','Accounts Receivable','asset','receivable',false,'operating'),
    ('1140','11','المخزون','Inventory','asset','inventory',false,'operating'),
    ('1150','11','ضريبة القيمة المضافة - مدخلات','VAT Input','asset','tax_receivable',false,'operating'),
    ('1160','11','مصروفات مدفوعة مقدماً','Prepaid Expenses','asset',null,false,'operating'),
    ('1170','11','سلف وعُهد الموظفين','Employee Advances','asset',null,false,'operating'),
    ('12','1','الأصول الثابتة','Fixed Assets','asset',null,true,'investing'),
    ('1210','12','الأراضي والمباني','Land & Buildings','asset',null,false,'investing'),
    ('1220','12','الأثاث والتجهيزات','Furniture & Fixtures','asset',null,false,'investing'),
    ('1230','12','السيارات ووسائل النقل','Vehicles','asset',null,false,'investing'),
    ('1240','12','الأجهزة والمعدات','Equipment & Computers','asset',null,false,'investing'),
    ('1290','12','مجمع الإهلاك','Accumulated Depreciation','asset',null,false,'operating'),
    ('2',null,'الخصوم','Liabilities','liability',null,true,'operating'),
    ('21','2','الخصوم المتداولة','Current Liabilities','liability',null,true,'operating'),
    ('2110','21','الذمم الدائنة - الموردون','Accounts Payable','liability','payable',false,'operating'),
    ('2120','21','ضريبة القيمة المضافة - مخرجات','VAT Output','liability','tax_payable',false,'operating'),
    ('2130','21','رواتب وأجور مستحقة','Accrued Salaries','liability',null,false,'operating'),
    ('2140','21','مصروفات مستحقة','Accrued Expenses','liability',null,false,'operating'),
    ('2150','21','دفعات مقدمة من العملاء','Customer Advances','liability',null,false,'operating'),
    ('22','2','الخصوم طويلة الأجل','Long-term Liabilities','liability',null,true,'financing'),
    ('2210','22','قروض طويلة الأجل','Long-term Loans','liability',null,false,'financing'),
    ('3',null,'حقوق الملكية','Equity','equity',null,true,'financing'),
    ('3100','3','رأس المال','Capital','equity',null,false,'financing'),
    ('3200','3','الأرباح المحتجزة','Retained Earnings','equity','retained_earnings',false,'financing'),
    ('3300','3','جاري المالك / الشركاء','Owner Drawings','equity',null,false,'financing'),
    ('3900','3','أرصدة افتتاحية','Opening Balance Equity','equity','opening_equity',false,'financing'),
    ('4',null,'الإيرادات','Revenue','revenue',null,true,'operating'),
    ('4100','4','إيرادات المبيعات','Sales Revenue','revenue','sales',false,'operating'),
    ('4200','4','إيرادات الخدمات','Service Revenue','revenue','service_revenue',false,'operating'),
    ('4300','4','مردودات ومسموحات المبيعات','Sales Returns & Allowances','revenue','sales_returns',false,'operating'),
    ('4800','4','أرباح فروق العملة','Foreign Exchange Gain','revenue','fx_gain',false,'operating'),
    ('4900','4','إيرادات أخرى','Other Income','revenue',null,false,'operating'),
    ('5',null,'المصروفات','Expenses','expense',null,true,'operating'),
    ('51','5','تكلفة المبيعات','Cost of Sales','expense',null,true,'operating'),
    ('5110','51','تكلفة البضاعة المباعة','Cost of Goods Sold','expense','cogs',false,'operating'),
    ('5120','51','المشتريات','Purchases','expense','purchases',false,'operating'),
    ('5130','51','مردودات ومسموحات المشتريات','Purchase Returns & Allowances','expense','purchase_returns',false,'operating'),
    ('5140','51','تسويات المخزون','Inventory Adjustments','expense','inventory_adjustment',false,'operating'),
    ('52','5','المصروفات التشغيلية والإدارية','Operating Expenses','expense',null,true,'operating'),
    ('5210','52','الرواتب والأجور','Salaries & Wages','expense',null,false,'operating'),
    ('5220','52','الإيجارات','Rent','expense',null,false,'operating'),
    ('5230','52','الكهرباء والمياه','Electricity & Water','expense',null,false,'operating'),
    ('5240','52','الاتصالات والإنترنت','Telecom & Internet','expense',null,false,'operating'),
    ('5250','52','الوقود والمواصلات','Fuel & Transport','expense',null,false,'operating'),
    ('5260','52','الصيانة والإصلاحات','Repairs & Maintenance','expense',null,false,'operating'),
    ('5270','52','القرطاسية والمطبوعات','Stationery & Printing','expense',null,false,'operating'),
    ('5280','52','الدعاية والإعلان','Marketing & Advertising','expense',null,false,'operating'),
    ('5290','52','الرسوم الحكومية والتراخيص','Government Fees & Licenses','expense',null,false,'operating'),
    ('5300','52','العمولات والرسوم البنكية','Bank Charges & Commissions','expense',null,false,'operating'),
    ('5310','52','مصروف الإهلاك','Depreciation Expense','expense',null,false,'operating'),
    ('5320','52','الضيافة والنظافة','Hospitality & Cleaning','expense',null,false,'operating'),
    ('5390','52','مصروفات متنوعة','Miscellaneous Expenses','expense',null,false,'operating'),
    ('5800','5','خسائر فروق العملة','Foreign Exchange Loss','expense','fx_loss',false,'operating')
  ) as v(code, parent, ar, en, typ, sub, grp, cf);
  update public.accounts a set parent_id = p.id
  from (values ('11','1'),('1110','11'),('1120','11'),('1130','11'),('1140','11'),('1150','11'),('1160','11'),('1170','11'),
               ('12','1'),('1210','12'),('1220','12'),('1230','12'),('1240','12'),('1290','12'),
               ('21','2'),('2110','21'),('2120','21'),('2130','21'),('2140','21'),('2150','21'),('22','2'),('2210','22'),
               ('3100','3'),('3200','3'),('3300','3'),('3900','3'),
               ('4100','4'),('4200','4'),('4300','4'),('4800','4'),('4900','4'),
               ('51','5'),('5110','51'),('5120','51'),('5130','51'),('5140','51'),('52','5'),
               ('5210','52'),('5220','52'),('5230','52'),('5240','52'),('5250','52'),('5260','52'),('5270','52'),('5280','52'),
               ('5290','52'),('5300','52'),('5310','52'),('5320','52'),('5390','52'),('5800','5')) as m(child, parent)
  join public.accounts p on p.tenant_id = _tenant and p.code = m.parent
  where a.tenant_id = _tenant and a.code = m.child;

  -- main cash box
  insert into public.accounts(tenant_id, code, name_ar, name_en, type, subtype, parent_id, is_system, cash_flow_category)
  select _tenant, '111001', 'الخزينة الرئيسية', 'Main Cash Box', 'asset', 'cash', id, false, 'cash' from public.accounts where tenant_id = _tenant and code = '1110'
  returning id into _cash;
  insert into public.financial_accounts(tenant_id, kind, name, account_id, currency_code, branch_id, created_by)
  values (_tenant, 'cash', 'الخزينة الرئيسية', _cash, _base, _branch, _owner);

  -- fiscal year
  perform public._create_fiscal_year(_tenant, _fy_start);

  -- categories
  insert into public.categories(tenant_id, kind, name_ar, name_en, account_id)
  select _tenant, v.k, v.ar, v.en, a.id from (values
    ('expense','رواتب وأجور','Salaries','5210'),('expense','إيجار','Rent','5220'),('expense','كهرباء ومياه','Utilities','5230'),
    ('expense','اتصالات وإنترنت','Telecom','5240'),('expense','وقود ومواصلات','Fuel & Transport','5250'),('expense','صيانة','Maintenance','5260'),
    ('expense','قرطاسية','Stationery','5270'),('expense','دعاية وإعلان','Marketing','5280'),('expense','رسوم حكومية','Government Fees','5290'),
    ('expense','رسوم بنكية','Bank Charges','5300'),('expense','ضيافة ونظافة','Hospitality','5320'),('expense','مصروفات متنوعة','Miscellaneous','5390'),
    ('income','مبيعات نقدية','Cash Sales','4100'),('income','إيرادات خدمات','Service Income','4200'),('income','إيرادات أخرى','Other Income','4900')
  ) as v(k, ar, en, code) join public.accounts a on a.tenant_id = _tenant and a.code = v.code;

  insert into public.tax_rates(tenant_id, name, rate, applies_to) values (_tenant, 'ضريبة القيمة المضافة 17%', 17, 'both');
  insert into public.units(tenant_id, name, symbol) values (_tenant,'قطعة','pc'),(_tenant,'كرتونة','ctn'),(_tenant,'كيلوجرام','kg'),(_tenant,'لتر','L'),(_tenant,'متر','m'),(_tenant,'ساعة','hr');
  insert into public.warehouses(tenant_id, code, name, branch_id) values (_tenant, 'WH-01', 'المستودع الرئيسي', _branch);
  perform set_config('finora.seeding', 'off', true);
end $$;

create or replace function public._create_company(_p jsonb, _owner uuid, _plan_id uuid, _status text, _cycle text, _period_end date) returns uuid
language plpgsql security definer set search_path = public as $$
declare _t uuid; _plan record; _m int; _fy date; _today date := (now() at time zone 'Africa/Khartoum')::date;
begin
  if _owner is null then raise exception 'يجب تحديد مالك الشركة'; end if;
  if not exists(select 1 from public.profiles where id = _owner) then raise exception 'المستخدم المالك غير موجود'; end if;
  select * into _plan from public.subscription_plans where id = _plan_id;
  if _plan.id is null then raise exception 'خطة الاشتراك غير موجودة'; end if;
  if coalesce(btrim(_p->>'name'), '') = '' then raise exception 'اسم الشركة مطلوب'; end if;
  _m := coalesce(nullif(_p->>'fiscal_year_start_month','')::int, 1);
  _fy := make_date(case when extract(month from _today) >= _m then extract(year from _today)::int else extract(year from _today)::int - 1 end, _m, 1);
  insert into public.tenants(name, legal_name, business_type, tax_number, commercial_register, phone, email, address, city, country_code, base_currency, timezone, default_locale, fiscal_year_start_month, inventory_enabled, created_by)
  values (btrim(_p->>'name'), _p->>'legal_name', _p->>'business_type', _p->>'tax_number', _p->>'commercial_register', _p->>'phone', _p->>'email', _p->>'address', _p->>'city',
          coalesce(nullif(_p->>'country_code',''), 'SD'), coalesce(nullif(_p->>'base_currency',''), 'SDG'), coalesce(nullif(_p->>'timezone',''), 'Africa/Khartoum'),
          coalesce(nullif(_p->>'default_locale',''), 'ar'), _m, coalesce((_p->>'inventory_enabled')::boolean, false) and _plan.inventory_enabled, auth.uid())
  returning id into _t;
  perform public._setup_tenant(_t, _owner, _fy);
  insert into public.subscriptions(tenant_id, plan_id, status, billing_cycle, started_at, current_period_end, trial_ends_at, created_by)
  values (_t, _plan.id, _status, coalesce(_cycle, 'monthly'), _today,
          case when _status = 'trial' then null else coalesce(_period_end, (_today + case when _cycle = 'annual' then interval '1 year' else interval '1 month' end)::date) end,
          case when _status = 'trial' then _today + greatest(_plan.trial_days, 1) end, auth.uid());
  perform public.log_action('tenant', _t, 'company_created', 'tenants', _t::text, jsonb_build_object('name', _p->>'name', 'plan', _plan.code));
  return _t;
end $$;

create or replace function public.register_company(_p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare _s record; _plan uuid;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول أولاً'; end if;
  select * into _s from public.platform_settings limit 1;
  if not _s.self_registration then raise exception 'التسجيل الذاتي للشركات متوقف حالياً؛ تواصل مع إدارة المنصة'; end if;
  if (select count(*) from public.tenants where created_by = auth.uid()) >= 5 then raise exception 'بلغت الحد الأقصى لعدد الشركات التي يمكنك إنشاؤها'; end if;
  select id into _plan from public.subscription_plans where code = _s.default_plan_code and is_active;
  if _plan is null then select id into _plan from public.subscription_plans where is_active order by sort limit 1; end if;
  return public._create_company(_p, auth.uid(), _plan, 'trial', 'monthly', null);
end $$;

-- ================= CONTEXT =================
create or replace function public.my_companies() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'tenant_id', t.id, 'name', t.name, 'status', t.status, 'base_currency', t.base_currency,
    'role_code', r.code, 'role_name_ar', r.name_ar, 'role_name_en', r.name_en, 'membership_status', m.status,
    'subscription_status', s.status, 'plan_name_ar', pl.name_ar, 'plan_name_en', pl.name_en, 'trial_ends_at', s.trial_ends_at,
    'operational', public.tenant_operational(t.id)) order by t.name), '[]'::jsonb)
  from public.tenant_memberships m
  join public.tenants t on t.id = m.tenant_id
  join public.tenant_roles r on r.id = m.role_id
  left join public.subscriptions s on s.tenant_id = t.id and s.is_current
  left join public.subscription_plans pl on pl.id = s.plan_id
  where m.user_id = auth.uid()
$$;

create or replace function public.my_tenant_context(_tenant uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare _res jsonb;
begin
  if not public.is_member(_tenant) then raise exception 'لا تملك عضوية نشطة في هذه الشركة' using errcode = '42501'; end if;
  select jsonb_build_object(
    'tenant', to_jsonb(t),
    'role', jsonb_build_object('id', r.id, 'code', r.code, 'name_ar', r.name_ar, 'name_en', r.name_en),
    'membership', jsonb_build_object('id', m.id, 'default_branch_id', m.default_branch_id),
    'permissions', case when r.code = 'owner' then (select jsonb_agg(code) from public.permissions)
                   else (select coalesce(jsonb_agg(permission_code), '[]'::jsonb) from public.tenant_role_permissions where role_id = r.id) end,
    'subscription', (select to_jsonb(s) || jsonb_build_object('plan', to_jsonb(p)) from public.subscriptions s join public.subscription_plans p on p.id = s.plan_id where s.tenant_id = _tenant and s.is_current),
    'operational', public.tenant_operational(_tenant),
    'branches', (select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'code', b.code, 'name', b.name, 'is_main', b.is_main) order by b.is_main desc, b.code), '[]'::jsonb) from public.branches b where b.tenant_id = _tenant and b.is_active)
  ) into _res
  from public.tenant_memberships m join public.tenants t on t.id = m.tenant_id join public.tenant_roles r on r.id = m.role_id
  where m.tenant_id = _tenant and m.user_id = auth.uid();
  return _res;
end $$;

-- ================= MANUAL JOURNAL =================
create or replace function public.save_journal_entry(_p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare _t uuid := (_p->>'tenant_id')::uuid; _id uuid := nullif(_p->>'id','')::uuid; e record; _src text;
begin
  _src := case when coalesce((_p->>'is_opening')::boolean, false) then 'opening' else 'manual' end;
  if _p->>'entry_date' is null then raise exception 'تاريخ القيد مطلوب'; end if;
  if _id is null then
    perform public._require(_t, 'journal.create');
    insert into public.journal_entries(tenant_id, entry_date, description, source_type, branch_id, created_by)
    values (_t, (_p->>'entry_date')::date, coalesce(_p->>'description',''), _src, nullif(_p->>'branch_id','')::uuid, auth.uid()) returning id into _id;
  else
    perform public._require(_t, 'journal.edit_draft');
    select * into e from public.journal_entries where id = _id and tenant_id = _t for update;
    if e.id is null then raise exception 'القيد غير موجود'; end if;
    if e.status <> 'draft' then raise exception 'لا يمكن تعديل قيد مُرحّل'; end if;
    if e.source_type not in ('manual','opening') then raise exception 'هذا القيد صادر عن مستند ولا يمكن تعديله يدوياً'; end if;
    update public.journal_entries set entry_date = (_p->>'entry_date')::date, description = coalesce(_p->>'description',''), source_type = _src, branch_id = nullif(_p->>'branch_id','')::uuid where id = _id;
    delete from public.journal_lines where entry_id = _id;
  end if;
  perform public._insert_lines(_t, _id, nullif(_p->>'branch_id','')::uuid, _p->'lines');
  update public.journal_entries set total_debit = (select coalesce(sum(debit),0) from public.journal_lines where entry_id = _id),
    total_credit = (select coalesce(sum(credit),0) from public.journal_lines where entry_id = _id) where id = _id;
  if coalesce((_p->>'post')::boolean, false) then perform public.post_journal_entry(_id); end if;
  return _id;
end $$;

create or replace function public.post_journal_entry(_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare e record;
begin
  select * into e from public.journal_entries where id = _id;
  if e.id is null then raise exception 'القيد غير موجود'; end if;
  perform public._require(e.tenant_id, 'journal.post');
  if e.source_type not in ('manual','opening') then raise exception 'قيود المستندات تُرحّل من المستند نفسه'; end if;
  perform public._post_entry(_id);
  perform public.log_action('tenant', e.tenant_id, 'journal_posted', 'journal_entries', _id::text, jsonb_build_object('total', e.total_debit));
end $$;

create or replace function public.delete_journal_draft(_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare e record;
begin
  select * into e from public.journal_entries where id = _id;
  if e.id is null then raise exception 'القيد غير موجود'; end if;
  perform public._require(e.tenant_id, 'journal.edit_draft');
  if e.status <> 'draft' then raise exception 'لا يمكن حذف قيد مُرحّل'; end if;
  delete from public.journal_lines where entry_id = _id;
  delete from public.journal_entries where id = _id;
end $$;

create or replace function public.reverse_journal_entry(_id uuid, _date date, _reason text) returns uuid
language plpgsql security definer set search_path = public as $$
declare e record; _new uuid;
begin
  select * into e from public.journal_entries where id = _id;
  if e.id is null then raise exception 'القيد غير موجود'; end if;
  perform public._require(e.tenant_id, 'journal.reverse');
  if e.source_type not in ('manual','opening') then raise exception 'هذا القيد صادر عن مستند؛ ألغِ المستند الأصلي لعكس قيده'; end if;
  if coalesce(btrim(_reason),'') = '' then raise exception 'سبب العكس مطلوب'; end if;
  _new := public._reverse_entry(_id, coalesce(_date, current_date), _reason);
  perform public.log_action('tenant', e.tenant_id, 'journal_reversed', 'journal_entries', _id::text, jsonb_build_object('reversal_entry', _new, 'reason', _reason));
  return _new;
end $$;

-- ================= REPORTS =================
create or replace function public._can_report(_tenant uuid) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.has_perm(_tenant, 'reports.view') or public.has_perm(_tenant, 'journal.view')) then
    raise exception 'ليس لديك صلاحية عرض التقارير' using errcode = '42501';
  end if;
end $$;

create or replace function public.report_trial_balance(_tenant uuid, _from date, _to date, _branch uuid default null, _exclude_closing boolean default false)
returns table(account_id uuid, code text, name_ar text, name_en text, type text, subtype text, parent_id uuid, cash_flow_category text, opening numeric, debit numeric, credit numeric, closing numeric)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  perform public._can_report(_tenant);
  return query
  select a.id, a.code, a.name_ar, a.name_en, a.type, a.subtype, a.parent_id, a.cash_flow_category,
    coalesce(sum(l.debit - l.credit) filter (where e.entry_date < _from), 0)::numeric,
    coalesce(sum(l.debit) filter (where e.entry_date between _from and _to), 0)::numeric,
    coalesce(sum(l.credit) filter (where e.entry_date between _from and _to), 0)::numeric,
    coalesce(sum(l.debit - l.credit) filter (where e.entry_date <= _to), 0)::numeric
  from public.accounts a
  left join public.journal_lines l on l.account_id = a.id
  left join public.journal_entries e on e.id = l.entry_id and e.status in ('posted','reversed')
       and (_branch is null or e.branch_id = _branch) and (not _exclude_closing or e.source_type <> 'closing')
  where a.tenant_id = _tenant and not a.is_group
  group by a.id
  order by a.code;
end $$;

create or replace function public.report_account_ledger(_tenant uuid, _account uuid, _from date, _to date, _branch uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare _open numeric; _lines jsonb; _acc jsonb;
begin
  if not (public.has_perm(_tenant,'reports.view') or public.has_perm(_tenant,'journal.view') or public.has_perm(_tenant,'cash.view')) then
    raise exception 'ليس لديك صلاحية عرض التقارير' using errcode = '42501';
  end if;
  select to_jsonb(a) into _acc from (select id, code, name_ar, name_en, type, subtype, currency_code from public.accounts where id = _account and tenant_id = _tenant) a;
  if _acc is null then raise exception 'الحساب غير موجود'; end if;
  select coalesce(sum(l.debit - l.credit), 0) into _open from public.journal_lines l join public.journal_entries e on e.id = l.entry_id
   where l.account_id = _account and e.status in ('posted','reversed') and e.entry_date < _from and (_branch is null or e.branch_id = _branch);
  select coalesce(jsonb_agg(to_jsonb(x) order by x.entry_date, x.posted_at, x.line_no), '[]'::jsonb) into _lines from (
    select l.id line_id, e.id entry_id, e.number, e.entry_date, e.posted_at, e.description, e.source_type, e.source_id, l.line_no,
           l.description line_description, l.debit, l.credit, l.fc_amount, l.currency_code, p.name party_name,
           exists(select 1 from public.bank_reconciliations br where br.line_id = l.id) reconciled
    from public.journal_lines l join public.journal_entries e on e.id = l.entry_id left join public.parties p on p.id = l.party_id
    where l.account_id = _account and e.status in ('posted','reversed') and e.entry_date between _from and _to and (_branch is null or e.branch_id = _branch)) x;
  return jsonb_build_object('account', _acc, 'opening', _open, 'lines', _lines);
end $$;

create or replace function public.report_party_statement(_tenant uuid, _party uuid, _from date, _to date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare _open numeric; _lines jsonb; _p jsonb; _kind text;
begin
  select kind into _kind from public.parties where id = _party and tenant_id = _tenant;
  if _kind is null then raise exception 'الطرف غير موجود'; end if;
  if not (public.has_perm(_tenant,'reports.view') or public.has_perm(_tenant, case when _kind = 'customer' then 'sales.view' else 'purchases.view' end)) then
    raise exception 'ليس لديك صلاحية عرض كشف الحساب' using errcode = '42501';
  end if;
  select to_jsonb(p) into _p from public.parties p where id = _party;
  select coalesce(sum(l.debit - l.credit), 0) into _open from public.journal_lines l join public.journal_entries e on e.id = l.entry_id join public.accounts a on a.id = l.account_id
   where l.party_id = _party and a.subtype in ('receivable','payable') and e.status in ('posted','reversed') and e.entry_date < _from;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.entry_date, x.posted_at), '[]'::jsonb) into _lines from (
    select e.id entry_id, e.number, e.entry_date, e.posted_at, e.description, e.source_type, e.source_id, l.debit, l.credit, l.fc_amount, l.currency_code
    from public.journal_lines l join public.journal_entries e on e.id = l.entry_id join public.accounts a on a.id = l.account_id
    where l.party_id = _party and a.subtype in ('receivable','payable') and e.status in ('posted','reversed') and e.entry_date between _from and _to) x;
  return jsonb_build_object('party', _p, 'opening', _open, 'lines', _lines);
end $$;

create or replace function public.report_cash_flow(_tenant uuid, _from date, _to date, _branch uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare _open numeric; _close numeric; _items jsonb;
begin
  perform public._can_report(_tenant);
  select coalesce(sum(l.debit - l.credit) filter (where e.entry_date < _from), 0), coalesce(sum(l.debit - l.credit) filter (where e.entry_date <= _to), 0)
  into _open, _close
  from public.journal_lines l join public.journal_entries e on e.id = l.entry_id join public.accounts a on a.id = l.account_id
  where e.tenant_id = _tenant and e.status in ('posted','reversed') and a.subtype in ('cash','bank') and (_branch is null or e.branch_id = _branch);
  with ents as (
    select e.id from public.journal_entries e
    where e.tenant_id = _tenant and e.status in ('posted','reversed') and e.entry_date between _from and _to and (_branch is null or e.branch_id = _branch)
      and exists(select 1 from public.journal_lines l join public.accounts a on a.id = l.account_id where l.entry_id = e.id and a.subtype in ('cash','bank'))),
  nonc as (
    select l.account_id, sum(l.credit - l.debit) amt from public.journal_lines l join ents on ents.id = l.entry_id join public.accounts a on a.id = l.account_id
    where a.subtype is distinct from 'cash' and a.subtype is distinct from 'bank' group by l.account_id having sum(l.credit - l.debit) <> 0)
  select coalesce(jsonb_agg(jsonb_build_object('account_id', a.id, 'code', a.code, 'name_ar', a.name_ar, 'name_en', a.name_en, 'type', a.type,
           'category', case when a.cash_flow_category = 'cash' then 'operating' else a.cash_flow_category end, 'amount', n.amt) order by a.code), '[]'::jsonb)
  into _items from nonc n join public.accounts a on a.id = n.account_id;
  return jsonb_build_object('opening_cash', _open, 'closing_cash', _close, 'items', _items);
end $$;

create or replace function public._aging_rows(_tenant uuid, _kind text, _as_of date)
returns table(party_id uuid, party_name text, b_current numeric, b_30 numeric, b_60 numeric, b_90 numeric, b_over numeric, total numeric)
language sql stable security definer set search_path = public as $$
  with docs as (
    select customer_id pid, due_date, round((total - amount_paid - amount_credited) * exchange_rate, 2) amt
    from public.sales_invoices where _kind = 'receivable' and tenant_id = _tenant and status in ('posted','partially_paid') and invoice_date <= _as_of
    union all
    select supplier_id, due_date, round((total - amount_paid - amount_credited) * exchange_rate, 2)
    from public.purchase_invoices where _kind = 'payable' and tenant_id = _tenant and status in ('posted','partially_paid') and invoice_date <= _as_of)
  select p.id, p.name,
    coalesce(sum(d.amt) filter (where _as_of - d.due_date <= 0), 0),
    coalesce(sum(d.amt) filter (where _as_of - d.due_date between 1 and 30), 0),
    coalesce(sum(d.amt) filter (where _as_of - d.due_date between 31 and 60), 0),
    coalesce(sum(d.amt) filter (where _as_of - d.due_date between 61 and 90), 0),
    coalesce(sum(d.amt) filter (where _as_of - d.due_date > 90), 0),
    coalesce(sum(d.amt), 0)
  from docs d join public.parties p on p.id = d.pid
  group by p.id, p.name having sum(d.amt) <> 0 order by sum(d.amt) desc
$$;

create or replace function public.report_aging(_tenant uuid, _kind text, _as_of date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.has_perm(_tenant,'reports.view') or public.has_perm(_tenant, case when _kind = 'receivable' then 'sales.view' else 'purchases.view' end)) then
    raise exception 'ليس لديك صلاحية عرض التقرير' using errcode = '42501';
  end if;
  return (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public._aging_rows(_tenant, _kind, _as_of) r);
end $$;

create or replace function public.financial_account_balances(_tenant uuid)
returns table(financial_account_id uuid, balance numeric, balance_base numeric, last_activity date)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not (public.has_perm(_tenant,'cash.view') or public.has_perm(_tenant,'payments.record') or public.has_perm(_tenant,'transactions.create') or public.has_perm(_tenant,'dashboard.view')) then
    raise exception 'ليس لديك صلاحية' using errcode = '42501';
  end if;
  return query
  select f.id,
    coalesce(sum(case when l.debit > 0 then coalesce(l.fc_amount, l.debit) else -coalesce(l.fc_amount, l.credit) end) filter (where e.id is not null), 0)::numeric,
    coalesce(sum(l.debit - l.credit) filter (where e.id is not null), 0)::numeric,
    max(e.entry_date)
  from public.financial_accounts f
  left join public.journal_lines l on l.account_id = f.account_id
  left join public.journal_entries e on e.id = l.entry_id and e.status in ('posted','reversed')
  where f.tenant_id = _tenant
  group by f.id;
end $$;

create or replace function public._fa_balance(_fa uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(case when l.debit > 0 then coalesce(l.fc_amount, l.debit) else -coalesce(l.fc_amount, l.credit) end), 0)
  from public.financial_accounts f join public.journal_lines l on l.account_id = f.account_id
  join public.journal_entries e on e.id = l.entry_id and e.status in ('posted','reversed')
  where f.id = _fa
$$;

create or replace function public.dashboard_summary(_tenant uuid, _from date, _to date, _branch uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare _cash numeric; _ar numeric; _ap numeric; _rev numeric; _exp numeric; _sales numeric; _inv boolean;
begin
  if not public.has_perm(_tenant, 'dashboard.view') then raise exception 'ليس لديك صلاحية عرض لوحة التحكم' using errcode = '42501'; end if;
  select inventory_enabled into _inv from public.tenants where id = _tenant;
  select coalesce(sum(l.debit - l.credit) filter (where a.subtype in ('cash','bank')), 0),
         coalesce(sum(l.debit - l.credit) filter (where a.subtype = 'receivable'), 0),
         coalesce(-sum(l.debit - l.credit) filter (where a.subtype = 'payable'), 0)
  into _cash, _ar, _ap
  from public.journal_lines l join public.journal_entries e on e.id = l.entry_id join public.accounts a on a.id = l.account_id
  where e.tenant_id = _tenant and e.status in ('posted','reversed') and e.entry_date <= _to and (_branch is null or e.branch_id = _branch);
  select coalesce(sum(l.credit - l.debit) filter (where a.type = 'revenue'), 0), coalesce(sum(l.debit - l.credit) filter (where a.type = 'expense'), 0)
  into _rev, _exp
  from public.journal_lines l join public.journal_entries e on e.id = l.entry_id join public.accounts a on a.id = l.account_id
  where e.tenant_id = _tenant and e.status in ('posted','reversed') and e.source_type <> 'closing' and e.entry_date between _from and _to and (_branch is null or e.branch_id = _branch);
  select coalesce(sum(round((subtotal - discount_total) * exchange_rate, 2)), 0) into _sales from public.sales_invoices
  where tenant_id = _tenant and kind = 'standard' and status in ('posted','partially_paid','paid') and invoice_date between _from and _to and (_branch is null or branch_id = _branch);

  return jsonb_build_object(
    'cash', _cash, 'receivables', _ar, 'payables', _ap, 'revenue', _rev, 'expenses', _exp, 'net_profit', _rev - _exp, 'sales', _sales,
    'outstanding', (select jsonb_build_object('count', count(*), 'amount', coalesce(sum(round((total - amount_paid - amount_credited) * exchange_rate, 2)), 0))
                    from public.sales_invoices where tenant_id = _tenant and status in ('posted','partially_paid') and (_branch is null or branch_id = _branch)),
    'overdue', (select jsonb_build_object('count', count(*), 'amount', coalesce(sum(round((total - amount_paid - amount_credited) * exchange_rate, 2)), 0))
                from public.sales_invoices where tenant_id = _tenant and status in ('posted','partially_paid') and due_date < current_date and (_branch is null or branch_id = _branch)),
    'monthly', (select coalesce(jsonb_agg(to_jsonb(m) order by m.month), '[]'::jsonb) from (
        select to_char(gs, 'YYYY-MM') as month,
          coalesce((select sum(l.credit - l.debit) from public.journal_lines l join public.journal_entries e on e.id = l.entry_id join public.accounts a on a.id = l.account_id
                    where e.tenant_id = _tenant and e.status in ('posted','reversed') and e.source_type <> 'closing' and a.type = 'revenue'
                      and e.entry_date >= gs::date and e.entry_date < (gs + interval '1 month')::date and (_branch is null or e.branch_id = _branch)), 0) as revenue,
          coalesce((select sum(l.debit - l.credit) from public.journal_lines l join public.journal_entries e on e.id = l.entry_id join public.accounts a on a.id = l.account_id
                    where e.tenant_id = _tenant and e.status in ('posted','reversed') and e.source_type <> 'closing' and a.type = 'expense'
                      and e.entry_date >= gs::date and e.entry_date < (gs + interval '1 month')::date and (_branch is null or e.branch_id = _branch)), 0) as expenses,
          coalesce((select sum(round((subtotal - discount_total) * exchange_rate, 2)) from public.sales_invoices
                    where tenant_id = _tenant and kind = 'standard' and status in ('posted','partially_paid','paid')
                      and invoice_date >= gs::date and invoice_date < (gs + interval '1 month')::date and (_branch is null or branch_id = _branch)), 0) as sales
        from generate_series(date_trunc('month', _to::timestamp) - interval '5 months', date_trunc('month', _to::timestamp), interval '1 month') gs) m),
    'expense_breakdown', (select coalesce(jsonb_agg(to_jsonb(x) order by x.amount desc), '[]'::jsonb) from (
        select a.id account_id, a.code, a.name_ar, a.name_en, sum(l.debit - l.credit) amount
        from public.journal_lines l join public.journal_entries e on e.id = l.entry_id join public.accounts a on a.id = l.account_id
        where e.tenant_id = _tenant and e.status in ('posted','reversed') and e.source_type <> 'closing' and a.type = 'expense' and e.entry_date between _from and _to and (_branch is null or e.branch_id = _branch)
        group by a.id having sum(l.debit - l.credit) > 0 order by 5 desc limit 8) x),
    'recent', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
        select id, number, entry_date, description, source_type, source_id, total_debit, status from public.journal_entries
        where tenant_id = _tenant and status <> 'draft' and (_branch is null or branch_id = _branch) order by posted_at desc nulls last limit 8) x),
    'upcoming_bills', (select coalesce(jsonb_agg(to_jsonb(x) order by x.due_date), '[]'::jsonb) from (
        select pi.id, pi.number, pi.due_date, p.name party_name, pi.total - pi.amount_paid - pi.amount_credited outstanding, pi.currency_code
        from public.purchase_invoices pi join public.parties p on p.id = pi.supplier_id
        where pi.tenant_id = _tenant and pi.status in ('posted','partially_paid') and pi.due_date <= current_date + 14 order by pi.due_date limit 8) x),
    'aging_receivable', (select jsonb_build_object('current', coalesce(sum(b_current),0), 'd30', coalesce(sum(b_30),0), 'd60', coalesce(sum(b_60),0), 'd90', coalesce(sum(b_90),0), 'over', coalesce(sum(b_over),0)) from public._aging_rows(_tenant, 'receivable', current_date)),
    'aging_payable', (select jsonb_build_object('current', coalesce(sum(b_current),0), 'd30', coalesce(sum(b_30),0), 'd60', coalesce(sum(b_60),0), 'd90', coalesce(sum(b_90),0), 'over', coalesce(sum(b_over),0)) from public._aging_rows(_tenant, 'payable', current_date)),
    'counts', jsonb_build_object(
      'customers', (select count(*) from public.parties where tenant_id = _tenant and kind = 'customer'),
      'suppliers', (select count(*) from public.parties where tenant_id = _tenant and kind = 'supplier'),
      'entries', (select count(*) from public.journal_entries where tenant_id = _tenant and status <> 'draft'),
      'draft_entries', (select count(*) from public.journal_entries where tenant_id = _tenant and status = 'draft'),
      'pending_expenses', (select count(*) from public.cash_transactions where tenant_id = _tenant and status = 'pending_approval'),
      'draft_invoices', (select count(*) from public.sales_invoices where tenant_id = _tenant and status in ('draft','approved')),
      'draft_bills', (select count(*) from public.purchase_invoices where tenant_id = _tenant and status in ('draft','approved')),
      'low_stock', case when _inv then (select count(*) from public.products p where p.tenant_id = _tenant and p.type = 'stock' and p.is_active and p.reorder_level > 0
                     and coalesce((select sum(quantity) from public.stock_levels s where s.product_id = p.id), 0) <= p.reorder_level) else 0 end,
      'members', (select count(*) from public.tenant_memberships where tenant_id = _tenant and status = 'active'),
      'invitations', (select count(*) from public.tenant_invitations where tenant_id = _tenant),
      'opening_entries', (select count(*) from public.journal_entries where tenant_id = _tenant and source_type = 'opening' and status <> 'draft'),
      'financial_accounts', (select count(*) from public.financial_accounts where tenant_id = _tenant))
  );
end $$;

-- internal functions should not be callable directly
revoke execute on function public._next_number(uuid,text) from public, anon, authenticated;
revoke execute on function public._acct(uuid,text) from public, anon, authenticated;
revoke execute on function public._post_entry(uuid) from public, anon, authenticated;
revoke execute on function public._insert_lines(uuid,uuid,uuid,jsonb) from public, anon, authenticated;
revoke execute on function public._create_entry(uuid,date,text,text,uuid,uuid,jsonb) from public, anon, authenticated;
revoke execute on function public._reverse_entry(uuid,date,text) from public, anon, authenticated;
revoke execute on function public._create_fiscal_year(uuid,date) from public, anon, authenticated;
revoke execute on function public._setup_tenant(uuid,uuid,date) from public, anon, authenticated;
revoke execute on function public._create_company(jsonb,uuid,uuid,text,text,date) from public, anon, authenticated;
revoke execute on function public._aging_rows(uuid,text,date) from public, anon, authenticated;
revoke execute on function public._fa_balance(uuid) from public, anon, authenticated;
revoke execute on function public._period_for(uuid,date) from public, anon, authenticated;
