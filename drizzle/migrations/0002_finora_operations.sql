
-- ================= STOCK ENGINE (Weighted Average Cost) =================
create or replace function public._stock_move(_t uuid, _product uuid, _wh uuid, _qty numeric, _unit_cost numeric, _date date, _mtype text, _src_type text, _src_id uuid, _notes text)
returns numeric language plpgsql security definer set search_path = public as $$
declare _p record; _onhand numeric; _wh_qty numeric; _cost numeric; _new_avg numeric; _total numeric; _neg boolean;
begin
  select * into _p from public.products where id = _product and tenant_id = _t for update;
  if _p.id is null then raise exception 'الصنف غير موجود'; end if;
  if _p.type <> 'stock' then raise exception 'الصنف "%" خدمي ولا يتأثر بالمخزون', _p.name; end if;
  if not exists(select 1 from public.warehouses where id = _wh and tenant_id = _t) then raise exception 'المستودع غير موجود'; end if;
  select coalesce(sum(quantity), 0) into _onhand from public.stock_levels where product_id = _product;
  select quantity into _wh_qty from public.stock_levels where product_id = _product and warehouse_id = _wh;
  _wh_qty := coalesce(_wh_qty, 0);
  if _qty > 0 then
    _cost := coalesce(_unit_cost, _p.avg_cost);
    if _cost < 0 then raise exception 'تكلفة الوحدة لا يمكن أن تكون سالبة'; end if;
    if _onhand <= 0 then _new_avg := _cost; else _new_avg := (_onhand * _p.avg_cost + _qty * _cost) / (_onhand + _qty); end if;
  else
    select allow_negative_stock into _neg from public.tenants where id = _t;
    if not coalesce(_neg, false) and _wh_qty + _qty < 0 then
      raise exception 'الكمية المتاحة من الصنف "%" في المستودع غير كافية (المتاح: %، المطلوب: %)', _p.name, _wh_qty, abs(_qty);
    end if;
    _cost := coalesce(_unit_cost, _p.avg_cost);
    if _unit_cost is not null and _onhand + _qty > 0 then
      _new_avg := greatest((_onhand * _p.avg_cost - abs(_qty) * _cost) / (_onhand + _qty), 0);
    else
      _new_avg := _p.avg_cost;
    end if;
  end if;
  _total := round(abs(_qty) * _cost, 2);
  insert into public.stock_levels(tenant_id, product_id, warehouse_id, quantity) values (_t, _product, _wh, _qty)
  on conflict (product_id, warehouse_id) do update set quantity = public.stock_levels.quantity + excluded.quantity;
  update public.products set avg_cost = round(_new_avg, 6) where id = _product;
  insert into public.stock_movements(tenant_id, product_id, warehouse_id, movement_date, movement_type, quantity, unit_cost, total_cost, balance_after, avg_cost_after, source_type, source_id, notes, created_by)
  values (_t, _product, _wh, _date, _mtype, _qty, _cost, _total, _onhand + _qty, round(_new_avg, 6), _src_type, _src_id, _notes, auth.uid());
  return _total;
end $$;

-- ================= PARTIES =================
create or replace function public.create_party(_p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare _t uuid := (_p->>'tenant_id')::uuid; _kind text := _p->>'kind'; _id uuid; _ob numeric; _obd date; _inv uuid; _base text; _num text; _je uuid; _code text;
begin
  if _kind not in ('customer','supplier') then raise exception 'نوع الطرف غير صالح'; end if;
  perform public._require(_t, case when _kind = 'customer' then 'customers.manage' else 'suppliers.manage' end);
  if coalesce(btrim(_p->>'name'), '') = '' then raise exception 'الاسم مطلوب'; end if;
  _code := nullif(btrim(coalesce(_p->>'code','')), '');
  if _code is null then _code := public._next_number(_t, _kind); end if;
  insert into public.parties(tenant_id, kind, code, name, contact_person, phone, email, address, city, tax_number, credit_limit, payment_terms_days, notes)
  values (_t, _kind, _code, btrim(_p->>'name'), _p->>'contact_person', _p->>'phone', _p->>'email', _p->>'address', _p->>'city', _p->>'tax_number',
          coalesce(nullif(_p->>'credit_limit','')::numeric, 0), coalesce(nullif(_p->>'payment_terms_days','')::int, 0), _p->>'notes')
  returning id into _id;
  _ob := round(coalesce(nullif(_p->>'opening_balance','')::numeric, 0), 2);
  if _ob < 0 then raise exception 'الرصيد الافتتاحي لا يمكن أن يكون سالباً'; end if;
  if _ob > 0 then
    _obd := coalesce(nullif(_p->>'opening_date','')::date, current_date);
    select base_currency into _base from public.tenants where id = _t;
    _num := public._next_number(_t, 'opening');
    if _kind = 'customer' then
      insert into public.sales_invoices(tenant_id, number, kind, customer_id, invoice_date, due_date, currency_code, exchange_rate, status, subtotal, total, notes, created_by, posted_by, posted_at)
      values (_t, _num, 'opening', _id, _obd, _obd, _base, 1, 'posted', _ob, _ob, 'رصيد افتتاحي', auth.uid(), auth.uid(), now()) returning id into _inv;
      _je := public._create_entry(_t, _obd, 'رصيد افتتاحي للعميل ' || btrim(_p->>'name'), 'opening', _inv, null, jsonb_build_array(
        jsonb_build_object('account_id', public._acct(_t,'receivable'), 'debit', _ob, 'party_id', _id, 'fc_amount', _ob, 'currency_code', _base),
        jsonb_build_object('account_id', public._acct(_t,'opening_equity'), 'credit', _ob)));
      update public.sales_invoices set journal_entry_id = _je where id = _inv;
    else
      insert into public.purchase_invoices(tenant_id, number, kind, supplier_id, invoice_date, due_date, currency_code, exchange_rate, status, subtotal, total, notes, created_by, posted_by, posted_at)
      values (_t, _num, 'opening', _id, _obd, _obd, _base, 1, 'posted', _ob, _ob, 'رصيد افتتاحي', auth.uid(), auth.uid(), now()) returning id into _inv;
      _je := public._create_entry(_t, _obd, 'رصيد افتتاحي للمورد ' || btrim(_p->>'name'), 'opening', _inv, null, jsonb_build_array(
        jsonb_build_object('account_id', public._acct(_t,'opening_equity'), 'debit', _ob),
        jsonb_build_object('account_id', public._acct(_t,'payable'), 'credit', _ob, 'party_id', _id, 'fc_amount', _ob, 'currency_code', _base)));
      update public.purchase_invoices set journal_entry_id = _je where id = _inv;
    end if;
  end if;
  return _id;
end $$;

create or replace function public.party_balances(_tenant uuid, _kind text)
returns table(party_id uuid, balance numeric, open_invoices bigint)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_member(_tenant) then raise exception 'غير مصرح' using errcode = '42501'; end if;
  if _kind = 'customer' then
    return query select p.id, coalesce(sum(round((i.total - i.amount_paid - i.amount_credited) * i.exchange_rate, 2)), 0)::numeric, count(i.id)
      from public.parties p left join public.sales_invoices i on i.customer_id = p.id and i.status in ('posted','partially_paid')
      where p.tenant_id = _tenant and p.kind = 'customer' group by p.id;
  else
    return query select p.id, coalesce(sum(round((i.total - i.amount_paid - i.amount_credited) * i.exchange_rate, 2)), 0)::numeric, count(i.id)
      from public.parties p left join public.purchase_invoices i on i.supplier_id = p.id and i.status in ('posted','partially_paid')
      where p.tenant_id = _tenant and p.kind = 'supplier' group by p.id;
  end if;
end $$;

-- ================= FINANCIAL ACCOUNTS =================
create or replace function public.create_financial_account(_p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare _t uuid := (_p->>'tenant_id')::uuid; _kind text := _p->>'kind'; _parent record; _code text; _n int; _acc uuid; _id uuid;
        _cur text; _ob numeric; _obd date; _fx numeric;
begin
  perform public._require(_t, 'cash.manage');
  if _kind not in ('cash','bank') then raise exception 'نوع الحساب غير صالح'; end if;
  if coalesce(btrim(_p->>'name'),'') = '' then raise exception 'اسم الحساب مطلوب'; end if;
  _cur := coalesce(nullif(_p->>'currency_code',''), (select base_currency from public.tenants where id = _t));
  select * into _parent from public.accounts where tenant_id = _t and subtype = case when _kind = 'cash' then 'cash_group' else 'bank_group' end limit 1;
  if _parent.id is null then raise exception 'لم يتم العثور على الحساب الرئيسي للنقدية/البنوك'; end if;
  select count(*) + 1 into _n from public.accounts where parent_id = _parent.id;
  loop
    _code := _parent.code || lpad(_n::text, 2, '0');
    exit when not exists(select 1 from public.accounts where tenant_id = _t and code = _code);
    _n := _n + 1;
  end loop;
  perform set_config('finora.seeding', 'on', true);
  insert into public.accounts(tenant_id, code, name_ar, name_en, type, subtype, parent_id, currency_code, cash_flow_category)
  values (_t, _code, btrim(_p->>'name'), btrim(_p->>'name'), 'asset', _kind, _parent.id, _cur, 'cash') returning id into _acc;
  perform set_config('finora.seeding', 'off', true);
  insert into public.financial_accounts(tenant_id, kind, name, account_id, currency_code, bank_name, account_number, iban, branch_id, created_by)
  values (_t, _kind, btrim(_p->>'name'), _acc, _cur, _p->>'bank_name', _p->>'account_number', _p->>'iban', nullif(_p->>'branch_id','')::uuid, auth.uid())
  returning id into _id;
  _ob := round(coalesce(nullif(_p->>'opening_balance','')::numeric, 0), 2);
  if _ob < 0 then raise exception 'الرصيد الافتتاحي لا يمكن أن يكون سالباً'; end if;
  if _ob > 0 then
    _obd := coalesce(nullif(_p->>'opening_date','')::date, current_date);
    _fx := public.get_exchange_rate(_t, _cur, _obd);
    perform public._create_entry(_t, _obd, 'رصيد افتتاحي - ' || btrim(_p->>'name'), 'opening', _id, nullif(_p->>'branch_id','')::uuid, jsonb_build_array(
      jsonb_build_object('account_id', _acc, 'debit', round(_ob * _fx, 2), 'fc_amount', _ob, 'currency_code', _cur, 'fx_rate', _fx),
      jsonb_build_object('account_id', public._acct(_t, 'opening_equity'), 'credit', round(_ob * _fx, 2))));
  end if;
  return _id;
end $$;

-- ================= SALES INVOICES =================
create or replace function public.save_sales_invoice(_p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare _t uuid := (_p->>'tenant_id')::uuid; _id uuid := nullif(_p->>'id','')::uuid; _st text; _it jsonb; _i int := 0;
  _q numeric; _price numeric; _pct numeric; _sub numeric; _disc numeric; _tax numeric; _rate numeric; _acc uuid; _prod record; _taxr record;
  _date date := nullif(_p->>'invoice_date','')::date; _due date; _cur text; _fx numeric; _cust record; _desc text;
  _tsub numeric := 0; _tdisc numeric := 0; _ttax numeric := 0; _branch uuid := nullif(_p->>'branch_id','')::uuid; _wh uuid := nullif(_p->>'warehouse_id','')::uuid;
begin
  perform public._require(_t, 'sales.create');
  select * into _cust from public.parties where id = nullif(_p->>'customer_id','')::uuid and tenant_id = _t and kind = 'customer';
  if _cust.id is null then raise exception 'يجب اختيار العميل'; end if;
  if not _cust.is_active then raise exception 'العميل موقوف'; end if;
  if _date is null then raise exception 'تاريخ الفاتورة مطلوب'; end if;
  _due := coalesce(nullif(_p->>'due_date','')::date, _date + _cust.payment_terms_days);
  if _due < _date then raise exception 'تاريخ الاستحقاق يجب أن يكون بعد تاريخ الفاتورة'; end if;
  _cur := coalesce(nullif(_p->>'currency_code',''), (select base_currency from public.tenants where id = _t));
  _fx := public.get_exchange_rate(_t, _cur, _date);
  if _branch is not null and not exists(select 1 from public.branches where id = _branch and tenant_id = _t) then raise exception 'الفرع غير صالح'; end if;
  if _wh is not null and not exists(select 1 from public.warehouses where id = _wh and tenant_id = _t) then raise exception 'المستودع غير صالح'; end if;
  if jsonb_array_length(coalesce(_p->'items', '[]'::jsonb)) = 0 then raise exception 'يجب إضافة بند واحد على الأقل'; end if;
  if _id is null then
    insert into public.sales_invoices(tenant_id, customer_id, branch_id, warehouse_id, invoice_date, due_date, currency_code, exchange_rate, notes, terms, created_by)
    values (_t, _cust.id, _branch, _wh, _date, _due, _cur, _fx, _p->>'notes', _p->>'terms', auth.uid()) returning id into _id;
  else
    select status into _st from public.sales_invoices where id = _id and tenant_id = _t for update;
    if _st is null then raise exception 'الفاتورة غير موجودة'; end if;
    if _st <> 'draft' then raise exception 'لا يمكن تعديل الفاتورة بعد اعتمادها أو ترحيلها'; end if;
    update public.sales_invoices set customer_id = _cust.id, branch_id = _branch, warehouse_id = _wh, invoice_date = _date, due_date = _due,
      currency_code = _cur, exchange_rate = _fx, notes = _p->>'notes', terms = _p->>'terms' where id = _id;
    delete from public.sales_invoice_items where invoice_id = _id;
  end if;
  for _it in select * from jsonb_array_elements(_p->'items') loop
    _i := _i + 1;
    _q := nullif(_it->>'quantity','')::numeric; _price := coalesce(nullif(_it->>'unit_price','')::numeric, 0); _pct := coalesce(nullif(_it->>'discount_pct','')::numeric, 0);
    if _q is null or _q <= 0 then raise exception 'الكمية في السطر % يجب أن تكون أكبر من صفر', _i; end if;
    if _price < 0 then raise exception 'السعر في السطر % لا يمكن أن يكون سالباً', _i; end if;
    if _pct < 0 or _pct > 100 then raise exception 'نسبة الخصم في السطر % غير صالحة', _i; end if;
    select * into _prod from public.products where id = nullif(_it->>'product_id','')::uuid and tenant_id = _t;
    if nullif(_it->>'product_id','') is not null and _prod.id is null then raise exception 'الصنف في السطر % غير موجود', _i; end if;
    select * into _taxr from public.tax_rates where id = nullif(_it->>'tax_rate_id','')::uuid and tenant_id = _t and is_active and applies_to in ('sales','both');
    if nullif(_it->>'tax_rate_id','') is not null and _taxr.id is null then raise exception 'الضريبة في السطر % غير صالحة', _i; end if;
    _rate := coalesce(_taxr.rate, 0);
    _sub := round(_q * _price, 2); _disc := round(_sub * _pct / 100, 2); _tax := round((_sub - _disc) * _rate / 100, 2);
    _acc := nullif(_it->>'account_id','')::uuid;
    if _acc is not null then
      if not exists(select 1 from public.accounts where id = _acc and tenant_id = _t and type = 'revenue' and not is_group and is_active) then raise exception 'حساب الإيراد في السطر % غير صالح', _i; end if;
    else
      _acc := case when _prod.type = 'service' then public._acct(_t, 'service_revenue') else public._acct(_t, 'sales') end;
    end if;
    _desc := coalesce(nullif(btrim(_it->>'description'),''), _prod.name);
    if _desc is null then raise exception 'الوصف مطلوب في السطر %', _i; end if;
    insert into public.sales_invoice_items(tenant_id, invoice_id, line_no, product_id, description, quantity, unit_price, discount_pct, tax_rate_id, tax_rate, line_subtotal, line_discount, line_tax, line_total, account_id)
    values (_t, _id, _i, _prod.id, _desc, _q, _price, _pct, _taxr.id, _rate, _sub, _disc, _tax, _sub - _disc + _tax, _acc);
    _tsub := _tsub + _sub; _tdisc := _tdisc + _disc; _ttax := _ttax + _tax;
  end loop;
  update public.sales_invoices set subtotal = _tsub, discount_total = _tdisc, tax_total = _ttax, total = _tsub - _tdisc + _ttax where id = _id;
  return _id;
end $$;

create or replace function public.approve_sales_invoice(_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare _inv record;
begin
  select * into _inv from public.sales_invoices where id = _id for update;
  if _inv.id is null then raise exception 'الفاتورة غير موجودة'; end if;
  perform public._require(_inv.tenant_id, 'sales.approve');
  if _inv.status <> 'draft' then raise exception 'يمكن اعتماد الفواتير المسودة فقط'; end if;
  update public.sales_invoices set status = 'approved', approved_by = auth.uid(), approved_at = now() where id = _id;
end $$;

create or replace function public.delete_sales_invoice(_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare _inv record;
begin
  select * into _inv from public.sales_invoices where id = _id for update;
  if _inv.id is null then raise exception 'الفاتورة غير موجودة'; end if;
  perform public._require(_inv.tenant_id, 'sales.create');
  if _inv.status not in ('draft','approved') then raise exception 'لا يمكن حذف فاتورة مُرحّلة؛ استخدم الإلغاء'; end if;
  delete from public.sales_invoices where id = _id;
end $$;

create or replace function public.post_sales_invoice(_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare _inv record; _t uuid; _ten record; _cust record; _lines jsonb := '[]'::jsonb; _r record; _b numeric; _sum numeric := 0; _ar numeric;
  _cogs numeric := 0; _wh uuid; _cost numeric; _je uuid; _num text; _first uuid; _outstanding numeric;
begin
  select * into _inv from public.sales_invoices where id = _id for update;
  if _inv.id is null then raise exception 'الفاتورة غير موجودة'; end if;
  _t := _inv.tenant_id;
  perform public._require(_t, 'sales.post');
  select * into _ten from public.tenants where id = _t;
  if _inv.status not in ('draft','approved') then raise exception 'الفاتورة مُرحّلة مسبقاً'; end if;
  if _inv.status = 'draft' and _ten.require_sales_approval then raise exception 'الفاتورة تتطلب الاعتماد قبل الترحيل'; end if;
  if _inv.total <= 0 then raise exception 'لا يمكن ترحيل فاتورة بقيمة صفرية'; end if;
  select * into _cust from public.parties where id = _inv.customer_id;
  if _cust.credit_limit > 0 then
    select coalesce(sum(round((total - amount_paid - amount_credited) * exchange_rate, 2)), 0) into _outstanding from public.sales_invoices
     where customer_id = _cust.id and status in ('posted','partially_paid');
    if _outstanding + round(_inv.total * _inv.exchange_rate, 2) > _cust.credit_limit then
      raise exception 'تتجاوز الفاتورة الحد الائتماني للعميل (الحد: %، المستحق الحالي: %)', _cust.credit_limit, _outstanding;
    end if;
  end if;
  _num := public._next_number(_t, 'sales_invoice');
  _ar := round(_inv.total * _inv.exchange_rate, 2);
  for _r in select account_id, sum(line_subtotal - line_discount) net from public.sales_invoice_items where invoice_id = _id group by account_id loop
    _b := round(_r.net * _inv.exchange_rate, 2);
    _first := coalesce(_first, _r.account_id);
    _lines := _lines || jsonb_build_array(jsonb_build_object('account_id', _r.account_id, 'credit', _b, 'description', 'إيراد ' || _num, 'currency_code', _inv.currency_code, 'fx_rate', _inv.exchange_rate, 'fc_amount', _r.net));
    _sum := _sum + _b;
  end loop;
  if _inv.tax_total > 0 then
    _b := round(_inv.tax_total * _inv.exchange_rate, 2);
    _lines := _lines || jsonb_build_array(jsonb_build_object('account_id', public._acct(_t, 'tax_payable'), 'credit', _b, 'description', 'ضريبة ' || _num, 'currency_code', _inv.currency_code, 'fx_rate', _inv.exchange_rate, 'fc_amount', _inv.tax_total));
    _sum := _sum + _b;
  end if;
  if _ar <> _sum then _lines := _lines || jsonb_build_array(jsonb_build_object('account_id', _first, 'credit', _ar - _sum, 'description', 'فرق تقريب')); end if;
  _lines := jsonb_build_array(jsonb_build_object('account_id', public._acct(_t, 'receivable'), 'debit', _ar, 'party_id', _inv.customer_id, 'description', 'فاتورة ' || _num, 'currency_code', _inv.currency_code, 'fx_rate', _inv.exchange_rate, 'fc_amount', _inv.total)) || _lines;
  if _ten.inventory_enabled then
    for _r in select it.* from public.sales_invoice_items it join public.products p on p.id = it.product_id where it.invoice_id = _id and p.type = 'stock' loop
      _wh := coalesce(_inv.warehouse_id, (select id from public.warehouses where tenant_id = _t and is_active order by code limit 1));
      if _wh is null then raise exception 'يجب تحديد المستودع للأصناف المخزنية'; end if;
      _cost := public._stock_move(_t, _r.product_id, _wh, -_r.quantity, null, _inv.invoice_date, 'sale', 'sales_invoice', _id, _num);
      update public.sales_invoice_items set unit_cost = round(_cost / _r.quantity, 6) where id = _r.id;
      _cogs := _cogs + _cost;
    end loop;
    if _cogs > 0 then
      _lines := _lines || jsonb_build_array(
        jsonb_build_object('account_id', public._acct(_t, 'cogs'), 'debit', _cogs, 'description', 'تكلفة مبيعات ' || _num),
        jsonb_build_object('account_id', public._acct(_t, 'inventory'), 'credit', _cogs, 'description', 'صرف مخزون ' || _num));
    end if;
  end if;
  _je := public._create_entry(_t, _inv.invoice_date, 'فاتورة مبيعات ' || _num || ' - ' || _cust.name, 'sales_invoice', _id, _inv.branch_id, _lines);
  update public.sales_invoices set number = _num, status = 'posted', journal_entry_id = _je, posted_by = auth.uid(), posted_at = now(), warehouse_id = coalesce(warehouse_id, _wh) where id = _id;
  perform public.log_action('tenant', _t, 'invoice_posted', 'sales_invoices', _id::text, jsonb_build_object('number', _num, 'total', _inv.total));
end $$;

create or replace function public.void_sales_invoice(_id uuid, _reason text) returns void
language plpgsql security definer set search_path = public as $$
declare _inv record; _r record;
begin
  select * into _inv from public.sales_invoices where id = _id for update;
  if _inv.id is null then raise exception 'الفاتورة غير موجودة'; end if;
  perform public._require(_inv.tenant_id, 'sales.post');
  if _inv.kind <> 'standard' then raise exception 'لا يمكن إلغاء رصيد افتتاحي من هنا'; end if;
  if _inv.status <> 'posted' then raise exception 'يمكن إلغاء الفواتير المرحّلة غير المسددة فقط'; end if;
  if _inv.amount_paid > 0 or _inv.amount_credited > 0 then raise exception 'لا يمكن إلغاء فاتورة عليها مدفوعات أو إشعارات دائنة؛ ألغِها أولاً'; end if;
  if coalesce(btrim(_reason),'') = '' then raise exception 'سبب الإلغاء مطلوب'; end if;
  perform public._reverse_entry(_inv.journal_entry_id, current_date, 'إلغاء فاتورة ' || _inv.number || ': ' || _reason);
  for _r in select it.* from public.sales_invoice_items it join public.products p on p.id = it.product_id where it.invoice_id = _id and p.type = 'stock' and it.unit_cost is not null loop
    perform public._stock_move(_inv.tenant_id, _r.product_id, _inv.warehouse_id, _r.quantity, _r.unit_cost, current_date, 'sale_void', 'sales_invoice', _id, 'إلغاء ' || _inv.number);
  end loop;
  update public.sales_invoices set status = 'void', voided_by = auth.uid(), voided_at = now(), void_reason = _reason where id = _id;
  perform public.log_action('tenant', _inv.tenant_id, 'invoice_voided', 'sales_invoices', _id::text, jsonb_build_object('number', _inv.number, 'reason', _reason));
end $$;

-- ================= PURCHASE INVOICES =================
create or replace function public.save_purchase_invoice(_p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare _t uuid := (_p->>'tenant_id')::uuid; _id uuid := nullif(_p->>'id','')::uuid; _st text; _it jsonb; _i int := 0;
  _q numeric; _price numeric; _pct numeric; _sub numeric; _disc numeric; _tax numeric; _rate numeric; _acc uuid; _prod record; _taxr record;
  _date date := nullif(_p->>'invoice_date','')::date; _due date; _cur text; _fx numeric; _sup record; _desc text; _inv_on boolean;
  _tsub numeric := 0; _tdisc numeric := 0; _ttax numeric := 0; _branch uuid := nullif(_p->>'branch_id','')::uuid; _wh uuid := nullif(_p->>'warehouse_id','')::uuid;
begin
  perform public._require(_t, 'purchases.create');
  select inventory_enabled into _inv_on from public.tenants where id = _t;
  select * into _sup from public.parties where id = nullif(_p->>'supplier_id','')::uuid and tenant_id = _t and kind = 'supplier';
  if _sup.id is null then raise exception 'يجب اختيار المورد'; end if;
  if _date is null then raise exception 'تاريخ الفاتورة مطلوب'; end if;
  _due := coalesce(nullif(_p->>'due_date','')::date, _date + _sup.payment_terms_days);
  if _due < _date then raise exception 'تاريخ الاستحقاق يجب أن يكون بعد تاريخ الفاتورة'; end if;
  _cur := coalesce(nullif(_p->>'currency_code',''), (select base_currency from public.tenants where id = _t));
  _fx := public.get_exchange_rate(_t, _cur, _date);
  if _branch is not null and not exists(select 1 from public.branches where id = _branch and tenant_id = _t) then raise exception 'الفرع غير صالح'; end if;
  if _wh is not null and not exists(select 1 from public.warehouses where id = _wh and tenant_id = _t) then raise exception 'المستودع غير صالح'; end if;
  if jsonb_array_length(coalesce(_p->'items', '[]'::jsonb)) = 0 then raise exception 'يجب إضافة بند واحد على الأقل'; end if;
  if _id is null then
    insert into public.purchase_invoices(tenant_id, supplier_id, supplier_reference, branch_id, warehouse_id, invoice_date, due_date, currency_code, exchange_rate, notes, created_by)
    values (_t, _sup.id, _p->>'supplier_reference', _branch, _wh, _date, _due, _cur, _fx, _p->>'notes', auth.uid()) returning id into _id;
  else
    select status into _st from public.purchase_invoices where id = _id and tenant_id = _t for update;
    if _st is null then raise exception 'الفاتورة غير موجودة'; end if;
    if _st <> 'draft' then raise exception 'لا يمكن تعديل الفاتورة بعد اعتمادها أو ترحيلها'; end if;
    update public.purchase_invoices set supplier_id = _sup.id, supplier_reference = _p->>'supplier_reference', branch_id = _branch, warehouse_id = _wh,
      invoice_date = _date, due_date = _due, currency_code = _cur, exchange_rate = _fx, notes = _p->>'notes' where id = _id;
    delete from public.purchase_invoice_items where invoice_id = _id;
  end if;
  for _it in select * from jsonb_array_elements(_p->'items') loop
    _i := _i + 1;
    _q := nullif(_it->>'quantity','')::numeric; _price := coalesce(nullif(_it->>'unit_price','')::numeric, 0); _pct := coalesce(nullif(_it->>'discount_pct','')::numeric, 0);
    if _q is null or _q <= 0 then raise exception 'الكمية في السطر % يجب أن تكون أكبر من صفر', _i; end if;
    if _price < 0 then raise exception 'السعر في السطر % لا يمكن أن يكون سالباً', _i; end if;
    if _pct < 0 or _pct > 100 then raise exception 'نسبة الخصم في السطر % غير صالحة', _i; end if;
    select * into _prod from public.products where id = nullif(_it->>'product_id','')::uuid and tenant_id = _t;
    if nullif(_it->>'product_id','') is not null and _prod.id is null then raise exception 'الصنف في السطر % غير موجود', _i; end if;
    select * into _taxr from public.tax_rates where id = nullif(_it->>'tax_rate_id','')::uuid and tenant_id = _t and is_active and applies_to in ('purchases','both');
    if nullif(_it->>'tax_rate_id','') is not null and _taxr.id is null then raise exception 'الضريبة في السطر % غير صالحة', _i; end if;
    _rate := coalesce(_taxr.rate, 0);
    _sub := round(_q * _price, 2); _disc := round(_sub * _pct / 100, 2); _tax := round((_sub - _disc) * _rate / 100, 2);
    if _prod.type = 'stock' and _inv_on then
      _acc := public._acct(_t, 'inventory');
    else
      _acc := nullif(_it->>'account_id','')::uuid;
      if _acc is not null then
        if not exists(select 1 from public.accounts where id = _acc and tenant_id = _t and type in ('expense','asset') and not is_group and is_active and coalesce(subtype,'') not in ('cash','bank','receivable')) then
          raise exception 'الحساب في السطر % غير صالح', _i;
        end if;
      else
        _acc := public._acct(_t, 'purchases');
      end if;
    end if;
    _desc := coalesce(nullif(btrim(_it->>'description'),''), _prod.name);
    if _desc is null then raise exception 'الوصف مطلوب في السطر %', _i; end if;
    insert into public.purchase_invoice_items(tenant_id, invoice_id, line_no, product_id, description, quantity, unit_price, discount_pct, tax_rate_id, tax_rate, line_subtotal, line_discount, line_tax, line_total, account_id)
    values (_t, _id, _i, _prod.id, _desc, _q, _price, _pct, _taxr.id, _rate, _sub, _disc, _tax, _sub - _disc + _tax, _acc);
    _tsub := _tsub + _sub; _tdisc := _tdisc + _disc; _ttax := _ttax + _tax;
  end loop;
  update public.purchase_invoices set subtotal = _tsub, discount_total = _tdisc, tax_total = _ttax, total = _tsub - _tdisc + _ttax where id = _id;
  return _id;
end $$;

create or replace function public.approve_purchase_invoice(_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare _inv record;
begin
  select * into _inv from public.purchase_invoices where id = _id for update;
  if _inv.id is null then raise exception 'الفاتورة غير موجودة'; end if;
  perform public._require(_inv.tenant_id, 'purchases.approve');
  if _inv.status <> 'draft' then raise exception 'يمكن اعتماد الفواتير المسودة فقط'; end if;
  update public.purchase_invoices set status = 'approved', approved_by = auth.uid(), approved_at = now() where id = _id;
end $$;

create or replace function public.delete_purchase_invoice(_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare _inv record;
begin
  select * into _inv from public.purchase_invoices where id = _id for update;
  if _inv.id is null then raise exception 'الفاتورة غير موجودة'; end if;
  perform public._require(_inv.tenant_id, 'purchases.create');
  if _inv.status not in ('draft','approved') then raise exception 'لا يمكن حذف فاتورة مُرحّلة؛ استخدم الإلغاء'; end if;
  delete from public.purchase_invoices where id = _id;
end $$;

create or replace function public.post_purchase_invoice(_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare _inv record; _t uuid; _ten record; _sup record; _lines jsonb := '[]'::jsonb; _r record; _b numeric; _sum numeric := 0; _ap numeric;
  _wh uuid; _je uuid; _num text; _first uuid; _inv_acc uuid;
begin
  select * into _inv from public.purchase_invoices where id = _id for update;
  if _inv.id is null then raise exception 'الفاتورة غير موجودة'; end if;
  _t := _inv.tenant_id;
  perform public._require(_t, 'purchases.post');
  select * into _ten from public.tenants where id = _t;
  if _inv.status not in ('draft','approved') then raise exception 'الفاتورة مُرحّلة مسبقاً'; end if;
  if _inv.status = 'draft' and _ten.require_purchase_approval then raise exception 'الفاتورة تتطلب الاعتماد قبل الترحيل'; end if;
  if _inv.total <= 0 then raise exception 'لا يمكن ترحيل فاتورة بقيمة صفرية'; end if;
  select * into _sup from public.parties where id = _inv.supplier_id;
  _num := public._next_number(_t, 'purchase_invoice');
  _ap := round(_inv.total * _inv.exchange_rate, 2);
  for _r in select account_id, sum(line_subtotal - line_discount) net from public.purchase_invoice_items where invoice_id = _id group by account_id loop
    _b := round(_r.net * _inv.exchange_rate, 2);
    _first := coalesce(_first, _r.account_id);
    _lines := _lines || jsonb_build_array(jsonb_build_object('account_id', _r.account_id, 'debit', _b, 'description', 'مشتريات ' || _num, 'currency_code', _inv.currency_code, 'fx_rate', _inv.exchange_rate, 'fc_amount', _r.net));
    _sum := _sum + _b;
  end loop;
  if _inv.tax_total > 0 then
    _b := round(_inv.tax_total * _inv.exchange_rate, 2);
    _lines := _lines || jsonb_build_array(jsonb_build_object('account_id', public._acct(_t, 'tax_receivable'), 'debit', _b, 'description', 'ضريبة مدخلات ' || _num));
    _sum := _sum + _b;
  end if;
  if _ap <> _sum then _lines := _lines || jsonb_build_array(jsonb_build_object('account_id', _first, 'debit', _ap - _sum, 'description', 'فرق تقريب')); end if;
  _lines := _lines || jsonb_build_array(jsonb_build_object('account_id', public._acct(_t, 'payable'), 'credit', _ap, 'party_id', _inv.supplier_id, 'description', 'فاتورة مورد ' || _num, 'currency_code', _inv.currency_code, 'fx_rate', _inv.exchange_rate, 'fc_amount', _inv.total));
  if _ten.inventory_enabled then
    _inv_acc := public._acct(_t, 'inventory');
    for _r in select it.* from public.purchase_invoice_items it join public.products p on p.id = it.product_id where it.invoice_id = _id and p.type = 'stock' loop
      if _r.account_id <> _inv_acc then raise exception 'الصنف المخزني "%" يجب أن يُسجّل على حساب المخزون؛ أعد حفظ الفاتورة', _r.description; end if;
      _wh := coalesce(_inv.warehouse_id, (select id from public.warehouses where tenant_id = _t and is_active order by code limit 1));
      if _wh is null then raise exception 'يجب تحديد المستودع للأصناف المخزنية'; end if;
      perform public._stock_move(_t, _r.product_id, _wh, _r.quantity, round((_r.line_subtotal - _r.line_discount) * _inv.exchange_rate / _r.quantity, 6), _inv.invoice_date, 'purchase', 'purchase_invoice', _id, _num);
    end loop;
  end if;
  _je := public._create_entry(_t, _inv.invoice_date, 'فاتورة مشتريات ' || _num || ' - ' || _sup.name, 'purchase_invoice', _id, _inv.branch_id, _lines);
  update public.purchase_invoices set number = _num, status = 'posted', journal_entry_id = _je, posted_by = auth.uid(), posted_at = now(), warehouse_id = coalesce(warehouse_id, _wh) where id = _id;
  perform public.log_action('tenant', _t, 'bill_posted', 'purchase_invoices', _id::text, jsonb_build_object('number', _num, 'total', _inv.total));
end $$;

create or replace function public.void_purchase_invoice(_id uuid, _reason text) returns void
language plpgsql security definer set search_path = public as $$
declare _inv record; _r record;
begin
  select * into _inv from public.purchase_invoices where id = _id for update;
  if _inv.id is null then raise exception 'الفاتورة غير موجودة'; end if;
  perform public._require(_inv.tenant_id, 'purchases.post');
  if _inv.kind <> 'standard' then raise exception 'لا يمكن إلغاء رصيد افتتاحي من هنا'; end if;
  if _inv.status <> 'posted' then raise exception 'يمكن إلغاء الفواتير المرحّلة غير المسددة فقط'; end if;
  if _inv.amount_paid > 0 or _inv.amount_credited > 0 then raise exception 'لا يمكن إلغاء فاتورة عليها مدفوعات أو إشعارات'; end if;
  if coalesce(btrim(_reason),'') = '' then raise exception 'سبب الإلغاء مطلوب'; end if;
  for _r in select m.* from public.stock_movements m where m.source_type = 'purchase_invoice' and m.source_id = _id and m.movement_type = 'purchase' loop
    perform public._stock_move(_inv.tenant_id, _r.product_id, _r.warehouse_id, -_r.quantity, _r.unit_cost, current_date, 'purchase_void', 'purchase_invoice', _id, 'إلغاء ' || _inv.number);
  end loop;
  perform public._reverse_entry(_inv.journal_entry_id, current_date, 'إلغاء فاتورة ' || _inv.number || ': ' || _reason);
  update public.purchase_invoices set status = 'void', voided_by = auth.uid(), voided_at = now(), void_reason = _reason where id = _id;
  perform public.log_action('tenant', _inv.tenant_id, 'bill_voided', 'purchase_invoices', _id::text, jsonb_build_object('number', _inv.number, 'reason', _reason));
end $$;

-- ================= PAYMENTS =================
create or replace function public.record_payment(_p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare _t uuid := (_p->>'tenant_id')::uuid; _dir text := _p->>'direction'; _party record; _fa record; _amt numeric; _date date; _fx numeric;
  _a jsonb; _aamt numeric; _sum numeric := 0; _ctrl_base numeric := 0; _cash_base numeric; _id uuid; _num text; _lines jsonb; _diff numeric; _je uuid;
  _inv_id uuid; _itotal numeric; _ipaid numeric; _icred numeric; _irate numeric; _icur text; _ist text; _inum text;
begin
  perform public._require(_t, 'payments.record');
  if _dir not in ('in','out') then raise exception 'اتجاه الدفعة غير صالح'; end if;
  select * into _party from public.parties where id = nullif(_p->>'party_id','')::uuid and tenant_id = _t and kind = case when _dir = 'in' then 'customer' else 'supplier' end;
  if _party.id is null then raise exception 'الطرف غير موجود'; end if;
  select * into _fa from public.financial_accounts where id = nullif(_p->>'financial_account_id','')::uuid and tenant_id = _t and is_active;
  if _fa.id is null then raise exception 'يجب اختيار حساب نقدي أو بنكي صالح'; end if;
  _amt := round(nullif(_p->>'amount','')::numeric, 2);
  if _amt is null or _amt <= 0 then raise exception 'مبلغ الدفعة يجب أن يكون أكبر من صفر'; end if;
  _date := coalesce(nullif(_p->>'payment_date','')::date, current_date);
  _fx := public.get_exchange_rate(_t, _fa.currency_code, _date);
  if jsonb_array_length(coalesce(_p->'allocations','[]'::jsonb)) = 0 then raise exception 'يجب تخصيص الدفعة على فاتورة واحدة على الأقل'; end if;
  if _dir = 'out' and _fa.kind = 'cash' and public._fa_balance(_fa.id) < _amt then raise exception 'رصيد الخزينة غير كافٍ (المتاح: %)', public._fa_balance(_fa.id); end if;
  _num := public._next_number(_t, case when _dir = 'in' then 'receipt' else 'disbursement' end);
  insert into public.payments(tenant_id, number, direction, party_id, financial_account_id, payment_date, amount, currency_code, exchange_rate, method, reference, notes, created_by)
  values (_t, _num, _dir, _party.id, _fa.id, _date, _amt, _fa.currency_code, _fx, coalesce(nullif(_p->>'method',''), 'cash'), _p->>'reference', _p->>'notes', auth.uid())
  returning id into _id;
  for _a in select * from jsonb_array_elements(_p->'allocations') loop
    _aamt := round(nullif(_a->>'amount','')::numeric, 2);
    if _aamt is null or _aamt <= 0 then continue; end if;
    _inv_id := (_a->>'invoice_id')::uuid;
    if _dir = 'in' then
      select id, total, amount_paid, amount_credited, exchange_rate, currency_code, status, number into _inv_id, _itotal, _ipaid, _icred, _irate, _icur, _ist, _inum
      from public.sales_invoices where id = _inv_id and tenant_id = _t and customer_id = _party.id for update;
    else
      select id, total, amount_paid, amount_credited, exchange_rate, currency_code, status, number into _inv_id, _itotal, _ipaid, _icred, _irate, _icur, _ist, _inum
      from public.purchase_invoices where id = _inv_id and tenant_id = _t and supplier_id = _party.id for update;
    end if;
    if _inv_id is null then raise exception 'الفاتورة المخصصة غير موجودة لهذا الطرف'; end if;
    if _ist not in ('posted','partially_paid') then raise exception 'الفاتورة % غير مستحقة للسداد', _inum; end if;
    if _icur <> _fa.currency_code then raise exception 'عملة الفاتورة % (%) تختلف عن عملة الحساب (%)', _inum, _icur, _fa.currency_code; end if;
    if _aamt > _itotal - _ipaid - _icred then raise exception 'المبلغ المخصص (%) يتجاوز الرصيد المستحق للفاتورة % (%)', _aamt, _inum, _itotal - _ipaid - _icred; end if;
    _ctrl_base := _ctrl_base + round((_ipaid + _icred + _aamt) * _irate, 2) - round((_ipaid + _icred) * _irate, 2);
    if _dir = 'in' then
      update public.sales_invoices set amount_paid = amount_paid + _aamt, status = case when amount_paid + _aamt + amount_credited >= total then 'paid' else 'partially_paid' end where id = _inv_id;
      insert into public.payment_allocations(tenant_id, payment_id, sales_invoice_id, amount) values (_t, _id, _inv_id, _aamt);
    else
      update public.purchase_invoices set amount_paid = amount_paid + _aamt, status = case when amount_paid + _aamt + amount_credited >= total then 'paid' else 'partially_paid' end where id = _inv_id;
      insert into public.payment_allocations(tenant_id, payment_id, purchase_invoice_id, amount) values (_t, _id, _inv_id, _aamt);
    end if;
    _sum := _sum + _aamt;
  end loop;
  if _sum <> _amt then raise exception 'مجموع المبالغ المخصصة (%) يجب أن يساوي مبلغ الدفعة (%)', _sum, _amt; end if;
  _cash_base := round(_amt * _fx, 2);
  if _dir = 'in' then
    _lines := jsonb_build_array(
      jsonb_build_object('account_id', _fa.account_id, 'debit', _cash_base, 'currency_code', _fa.currency_code, 'fx_rate', _fx, 'fc_amount', _amt, 'description', 'سند قبض ' || _num),
      jsonb_build_object('account_id', public._acct(_t, 'receivable'), 'credit', _ctrl_base, 'party_id', _party.id, 'currency_code', _fa.currency_code, 'fc_amount', _amt, 'description', 'تحصيل من ' || _party.name));
    _diff := _cash_base - _ctrl_base;
  else
    _lines := jsonb_build_array(
      jsonb_build_object('account_id', public._acct(_t, 'payable'), 'debit', _ctrl_base, 'party_id', _party.id, 'currency_code', _fa.currency_code, 'fc_amount', _amt, 'description', 'سداد إلى ' || _party.name),
      jsonb_build_object('account_id', _fa.account_id, 'credit', _cash_base, 'currency_code', _fa.currency_code, 'fx_rate', _fx, 'fc_amount', _amt, 'description', 'سند صرف ' || _num));
    _diff := _ctrl_base - _cash_base;
  end if;
  if _diff > 0 then _lines := _lines || jsonb_build_array(jsonb_build_object('account_id', public._acct(_t, 'fx_gain'), 'credit', _diff, 'description', 'أرباح فروق عملة محققة'));
  elsif _diff < 0 then _lines := _lines || jsonb_build_array(jsonb_build_object('account_id', public._acct(_t, 'fx_loss'), 'debit', -_diff, 'description', 'خسائر فروق عملة محققة'));
  end if;
  _je := public._create_entry(_t, _date, case when _dir = 'in' then 'سند قبض ' else 'سند صرف ' end || _num || ' - ' || _party.name, 'payment', _id, nullif(_p->>'branch_id','')::uuid, _lines);
  update public.payments set journal_entry_id = _je where id = _id;
  return _id;
end $$;

create or replace function public.void_payment(_id uuid, _reason text) returns void
language plpgsql security definer set search_path = public as $$
declare _pay record; _a record;
begin
  select * into _pay from public.payments where id = _id for update;
  if _pay.id is null then raise exception 'الدفعة غير موجودة'; end if;
  perform public._require(_pay.tenant_id, 'payments.record');
  if _pay.status <> 'posted' then raise exception 'الدفعة ملغاة مسبقاً'; end if;
  if coalesce(btrim(_reason),'') = '' then raise exception 'سبب الإلغاء مطلوب'; end if;
  perform public._reverse_entry(_pay.journal_entry_id, current_date, 'إلغاء ' || _pay.number || ': ' || _reason);
  for _a in select * from public.payment_allocations where payment_id = _id loop
    if _a.sales_invoice_id is not null then
      update public.sales_invoices set amount_paid = amount_paid - _a.amount,
        status = case when amount_paid - _a.amount + amount_credited <= 0 then 'posted' else 'partially_paid' end where id = _a.sales_invoice_id;
    else
      update public.purchase_invoices set amount_paid = amount_paid - _a.amount,
        status = case when amount_paid - _a.amount + amount_credited <= 0 then 'posted' else 'partially_paid' end where id = _a.purchase_invoice_id;
    end if;
  end loop;
  update public.payments set status = 'void', voided_by = auth.uid(), voided_at = now(), notes = coalesce(notes || ' | ', '') || 'ملغاة: ' || _reason where id = _id;
  perform public.log_action('tenant', _pay.tenant_id, 'payment_voided', 'payments', _id::text, jsonb_build_object('number', _pay.number, 'reason', _reason));
end $$;

-- ================= CREDIT NOTES =================
create or replace function public.create_credit_note(_p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare _t uuid := (_p->>'tenant_id')::uuid; _kind text := _p->>'kind'; _amt numeric; _taxa numeric; _tot numeric; _date date;
  _inv_id uuid; _party uuid; _itotal numeric; _ipaid numeric; _icred numeric; _irate numeric; _icur text; _ist text; _inum text;
  _tot_base numeric; _tax_base numeric; _id uuid; _num text; _lines jsonb; _je uuid;
begin
  if _kind not in ('sales','purchase') then raise exception 'نوع الإشعار غير صالح'; end if;
  perform public._require(_t, case when _kind = 'sales' then 'sales.post' else 'purchases.post' end);
  _amt := round(coalesce(nullif(_p->>'amount','')::numeric, 0), 2); _taxa := round(coalesce(nullif(_p->>'tax_amount','')::numeric, 0), 2);
  if _amt <= 0 then raise exception 'المبلغ يجب أن يكون أكبر من صفر'; end if;
  if _taxa < 0 then raise exception 'مبلغ الضريبة غير صالح'; end if;
  if coalesce(btrim(_p->>'reason'),'') = '' then raise exception 'سبب الإشعار مطلوب'; end if;
  _tot := _amt + _taxa; _date := coalesce(nullif(_p->>'note_date','')::date, current_date);
  if _kind = 'sales' then
    select id, customer_id, total, amount_paid, amount_credited, exchange_rate, currency_code, status, number into _inv_id, _party, _itotal, _ipaid, _icred, _irate, _icur, _ist, _inum
    from public.sales_invoices where id = (_p->>'invoice_id')::uuid and tenant_id = _t and kind = 'standard' for update;
  else
    select id, supplier_id, total, amount_paid, amount_credited, exchange_rate, currency_code, status, number into _inv_id, _party, _itotal, _ipaid, _icred, _irate, _icur, _ist, _inum
    from public.purchase_invoices where id = (_p->>'invoice_id')::uuid and tenant_id = _t and kind = 'standard' for update;
  end if;
  if _inv_id is null then raise exception 'الفاتورة غير موجودة'; end if;
  if _ist not in ('posted','partially_paid') then raise exception 'يمكن إصدار إشعار على فاتورة مرحّلة غير مسددة بالكامل فقط'; end if;
  if _tot > _itotal - _ipaid - _icred then raise exception 'قيمة الإشعار (%) تتجاوز الرصيد المستحق للفاتورة (%)', _tot, _itotal - _ipaid - _icred; end if;
  _tot_base := round((_ipaid + _icred + _tot) * _irate, 2) - round((_ipaid + _icred) * _irate, 2);
  _tax_base := least(round(_taxa * _irate, 2), _tot_base);
  _num := public._next_number(_t, case when _kind = 'sales' then 'credit_note_sales' else 'credit_note_purchase' end);
  insert into public.credit_notes(tenant_id, number, kind, party_id, sales_invoice_id, purchase_invoice_id, note_date, currency_code, exchange_rate, amount, tax_amount, total, reason, created_by)
  values (_t, _num, _kind, _party, case when _kind = 'sales' then _inv_id end, case when _kind = 'purchase' then _inv_id end, _date, _icur, _irate, _amt, _taxa, _tot, btrim(_p->>'reason'), auth.uid())
  returning id into _id;
  if _kind = 'sales' then
    _lines := jsonb_build_array(
      jsonb_build_object('account_id', public._acct(_t, 'sales_returns'), 'debit', _tot_base - _tax_base, 'description', 'مردودات ' || _num),
      jsonb_build_object('account_id', public._acct(_t, 'tax_payable'), 'debit', _tax_base, 'description', 'ضريبة ' || _num),
      jsonb_build_object('account_id', public._acct(_t, 'receivable'), 'credit', _tot_base, 'party_id', _party, 'currency_code', _icur, 'fc_amount', _tot, 'description', 'إشعار دائن ' || _num));
    update public.sales_invoices set amount_credited = amount_credited + _tot, status = case when amount_paid + amount_credited + _tot >= total then 'paid' else 'partially_paid' end where id = _inv_id;
  else
    _lines := jsonb_build_array(
      jsonb_build_object('account_id', public._acct(_t, 'payable'), 'debit', _tot_base, 'party_id', _party, 'currency_code', _icur, 'fc_amount', _tot, 'description', 'إشعار مدين ' || _num),
      jsonb_build_object('account_id', public._acct(_t, 'purchase_returns'), 'credit', _tot_base - _tax_base, 'description', 'مردودات مشتريات ' || _num),
      jsonb_build_object('account_id', public._acct(_t, 'tax_receivable'), 'credit', _tax_base, 'description', 'ضريبة ' || _num));
    update public.purchase_invoices set amount_credited = amount_credited + _tot, status = case when amount_paid + amount_credited + _tot >= total then 'paid' else 'partially_paid' end where id = _inv_id;
  end if;
  _je := public._create_entry(_t, _date, case when _kind = 'sales' then 'إشعار دائن ' else 'إشعار مدين ' end || _num || ' على الفاتورة ' || _inum, 'credit_note', _id, null, _lines);
  update public.credit_notes set journal_entry_id = _je where id = _id;
  return _id;
end $$;

create or replace function public.void_credit_note(_id uuid, _reason text) returns void
language plpgsql security definer set search_path = public as $$
declare _cn record;
begin
  select * into _cn from public.credit_notes where id = _id for update;
  if _cn.id is null then raise exception 'الإشعار غير موجود'; end if;
  perform public._require(_cn.tenant_id, case when _cn.kind = 'sales' then 'sales.post' else 'purchases.post' end);
  if _cn.status <> 'posted' then raise exception 'الإشعار ملغى مسبقاً'; end if;
  perform public._reverse_entry(_cn.journal_entry_id, current_date, 'إلغاء ' || _cn.number || ': ' || coalesce(_reason,''));
  if _cn.kind = 'sales' then
    update public.sales_invoices set amount_credited = amount_credited - _cn.total, status = case when amount_paid + amount_credited - _cn.total <= 0 then 'posted' else 'partially_paid' end where id = _cn.sales_invoice_id;
  else
    update public.purchase_invoices set amount_credited = amount_credited - _cn.total, status = case when amount_paid + amount_credited - _cn.total <= 0 then 'posted' else 'partially_paid' end where id = _cn.purchase_invoice_id;
  end if;
  update public.credit_notes set status = 'void' where id = _id;
end $$;

-- ================= TRANSFERS =================
create or replace function public.create_transfer(_p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare _t uuid := (_p->>'tenant_id')::uuid; _from record; _to record; _amt numeric; _toamt numeric; _date date; _fr numeric; _tr numeric;
  _bf numeric; _bt numeric; _id uuid; _num text; _lines jsonb; _diff numeric; _je uuid;
begin
  perform public._require(_t, 'transactions.create');
  select * into _from from public.financial_accounts where id = nullif(_p->>'from_account_id','')::uuid and tenant_id = _t and is_active;
  select * into _to from public.financial_accounts where id = nullif(_p->>'to_account_id','')::uuid and tenant_id = _t and is_active;
  if _from.id is null or _to.id is null then raise exception 'يجب اختيار حسابي التحويل'; end if;
  if _from.id = _to.id then raise exception 'لا يمكن التحويل إلى نفس الحساب'; end if;
  _amt := round(nullif(_p->>'amount','')::numeric, 2);
  if _amt is null or _amt <= 0 then raise exception 'مبلغ التحويل يجب أن يكون أكبر من صفر'; end if;
  if _from.currency_code = _to.currency_code then _toamt := _amt;
  else
    _toamt := round(nullif(_p->>'to_amount','')::numeric, 2);
    if _toamt is null or _toamt <= 0 then raise exception 'يجب إدخال المبلغ المستلم بعملة الحساب المحوّل إليه'; end if;
  end if;
  _date := coalesce(nullif(_p->>'transfer_date','')::date, current_date);
  if _from.kind = 'cash' and public._fa_balance(_from.id) < _amt then raise exception 'رصيد الحساب المحوّل منه غير كافٍ (المتاح: %)', public._fa_balance(_from.id); end if;
  _fr := public.get_exchange_rate(_t, _from.currency_code, _date); _tr := public.get_exchange_rate(_t, _to.currency_code, _date);
  _bf := round(_amt * _fr, 2); _bt := round(_toamt * _tr, 2);
  _num := public._next_number(_t, 'transfer');
  insert into public.transfers(tenant_id, number, from_account_id, to_account_id, transfer_date, amount, to_amount, from_rate, to_rate, reference, notes, created_by)
  values (_t, _num, _from.id, _to.id, _date, _amt, _toamt, _fr, _tr, _p->>'reference', _p->>'notes', auth.uid()) returning id into _id;
  _lines := jsonb_build_array(
    jsonb_build_object('account_id', _to.account_id, 'debit', _bt, 'currency_code', _to.currency_code, 'fx_rate', _tr, 'fc_amount', _toamt, 'description', 'تحويل وارد ' || _num),
    jsonb_build_object('account_id', _from.account_id, 'credit', _bf, 'currency_code', _from.currency_code, 'fx_rate', _fr, 'fc_amount', _amt, 'description', 'تحويل صادر ' || _num));
  _diff := _bf - _bt;
  if _diff > 0 then _lines := _lines || jsonb_build_array(jsonb_build_object('account_id', public._acct(_t, 'fx_loss'), 'debit', _diff, 'description', 'فرق عملة تحويل'));
  elsif _diff < 0 then _lines := _lines || jsonb_build_array(jsonb_build_object('account_id', public._acct(_t, 'fx_gain'), 'credit', -_diff, 'description', 'فرق عملة تحويل'));
  end if;
  _je := public._create_entry(_t, _date, 'تحويل ' || _num || ' من ' || _from.name || ' إلى ' || _to.name, 'transfer', _id, null, _lines);
  update public.transfers set journal_entry_id = _je where id = _id;
  return _id;
end $$;

create or replace function public.void_transfer(_id uuid, _reason text) returns void
language plpgsql security definer set search_path = public as $$
declare _tr record;
begin
  select * into _tr from public.transfers where id = _id for update;
  if _tr.id is null then raise exception 'التحويل غير موجود'; end if;
  perform public._require(_tr.tenant_id, 'transactions.approve');
  if _tr.status <> 'posted' then raise exception 'التحويل ملغى مسبقاً'; end if;
  if coalesce(btrim(_reason),'') = '' then raise exception 'سبب الإلغاء مطلوب'; end if;
  perform public._reverse_entry(_tr.journal_entry_id, current_date, 'إلغاء ' || _tr.number || ': ' || _reason);
  update public.transfers set status = 'void', notes = coalesce(notes || ' | ', '') || 'ملغى: ' || _reason where id = _id;
end $$;

-- ================= INCOME & EXPENSES =================
create or replace function public._post_cash_transaction(_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare _c record; _fa record; _cat record; _base numeric; _tax_base numeric; _lines jsonb; _je uuid;
begin
  select * into _c from public.cash_transactions where id = _id for update;
  select * into _fa from public.financial_accounts where id = _c.financial_account_id;
  select * into _cat from public.categories where id = _c.category_id;
  if _c.kind = 'expense' and _fa.kind = 'cash' and public._fa_balance(_fa.id) < _c.total then raise exception 'رصيد الخزينة غير كافٍ (المتاح: %)', public._fa_balance(_fa.id); end if;
  _base := round(_c.total * _c.exchange_rate, 2); _tax_base := round(_c.tax_amount * _c.exchange_rate, 2);
  if _c.kind = 'income' then
    _lines := jsonb_build_array(
      jsonb_build_object('account_id', _fa.account_id, 'debit', _base, 'currency_code', _c.currency_code, 'fx_rate', _c.exchange_rate, 'fc_amount', _c.total, 'description', coalesce(_c.description, _cat.name_ar)),
      jsonb_build_object('account_id', _cat.account_id, 'credit', _base - _tax_base, 'party_id', _c.party_id, 'cost_center_id', _c.cost_center_id, 'description', _cat.name_ar),
      jsonb_build_object('account_id', public._acct(_c.tenant_id, 'tax_payable'), 'credit', _tax_base, 'description', 'ضريبة'));
  else
    _lines := jsonb_build_array(
      jsonb_build_object('account_id', _cat.account_id, 'debit', _base - _tax_base, 'party_id', _c.party_id, 'cost_center_id', _c.cost_center_id, 'description', coalesce(_c.description, _cat.name_ar)),
      jsonb_build_object('account_id', public._acct(_c.tenant_id, 'tax_receivable'), 'debit', _tax_base, 'description', 'ضريبة مدخلات'),
      jsonb_build_object('account_id', _fa.account_id, 'credit', _base, 'currency_code', _c.currency_code, 'fx_rate', _c.exchange_rate, 'fc_amount', _c.total, 'description', _cat.name_ar));
  end if;
  _je := public._create_entry(_c.tenant_id, _c.transaction_date, case when _c.kind = 'income' then 'إيراد ' else 'مصروف ' end || _c.number || ' - ' || _cat.name_ar, _c.kind, _id, _c.branch_id, _lines);
  update public.cash_transactions set status = 'posted', journal_entry_id = _je where id = _id;
end $$;

create or replace function public.create_cash_transaction(_p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare _t uuid := (_p->>'tenant_id')::uuid; _kind text := _p->>'kind'; _cat record; _fa record; _amt numeric; _taxr record; _tax numeric; _date date; _fx numeric;
  _id uuid; _num text; _needs boolean; _ten record;
begin
  perform public._require(_t, 'transactions.create');
  if _kind not in ('income','expense') then raise exception 'نوع العملية غير صالح'; end if;
  select * into _ten from public.tenants where id = _t;
  select * into _cat from public.categories where id = nullif(_p->>'category_id','')::uuid and tenant_id = _t and kind = _kind and is_active;
  if _cat.id is null then raise exception 'يجب اختيار التصنيف'; end if;
  select * into _fa from public.financial_accounts where id = nullif(_p->>'financial_account_id','')::uuid and tenant_id = _t and is_active;
  if _fa.id is null then raise exception 'يجب اختيار الحساب النقدي أو البنكي'; end if;
  _amt := round(nullif(_p->>'amount','')::numeric, 2);
  if _amt is null or _amt <= 0 then raise exception 'المبلغ يجب أن يكون أكبر من صفر'; end if;
  select * into _taxr from public.tax_rates where id = nullif(_p->>'tax_rate_id','')::uuid and tenant_id = _t and is_active;
  _tax := round(_amt * coalesce(_taxr.rate, 0) / 100, 2);
  _date := coalesce(nullif(_p->>'transaction_date','')::date, current_date);
  _fx := public.get_exchange_rate(_t, _fa.currency_code, _date);
  if nullif(_p->>'party_id','') is not null and not exists(select 1 from public.parties where id = (_p->>'party_id')::uuid and tenant_id = _t) then raise exception 'الطرف غير صالح'; end if;
  if nullif(_p->>'cost_center_id','') is not null and not exists(select 1 from public.cost_centers where id = (_p->>'cost_center_id')::uuid and tenant_id = _t) then raise exception 'مركز التكلفة غير صالح'; end if;
  _num := public._next_number(_t, _kind);
  _needs := _kind = 'expense' and _ten.require_expense_approval and not public.has_perm(_t, 'transactions.approve');
  insert into public.cash_transactions(tenant_id, number, kind, transaction_date, category_id, financial_account_id, party_id, branch_id, cost_center_id, amount, tax_rate_id, tax_amount, total,
    currency_code, exchange_rate, payment_method, reference, description, status, created_by)
  values (_t, _num, _kind, _date, _cat.id, _fa.id, nullif(_p->>'party_id','')::uuid, nullif(_p->>'branch_id','')::uuid, nullif(_p->>'cost_center_id','')::uuid, _amt, _taxr.id, _tax, _amt + _tax,
    _fa.currency_code, _fx, coalesce(nullif(_p->>'payment_method',''), 'cash'), _p->>'reference', _p->>'description', case when _needs then 'pending_approval' else 'posted' end, auth.uid())
  returning id into _id;
  if _needs then
    insert into public.approval_requests(tenant_id, entity_type, entity_id, requested_by) values (_t, 'cash_transactions', _id, auth.uid());
    insert into public.notifications(tenant_id, user_id, title, body, link)
    select _t, m.user_id, 'طلب اعتماد مصروف ' || _num, _cat.name_ar || ' - ' || (_amt + _tax)::text || ' ' || _fa.currency_code, '/app/expenses'
    from public.tenant_memberships m join public.tenant_roles r on r.id = m.role_id
    where m.tenant_id = _t and m.status = 'active' and m.user_id <> auth.uid()
      and (r.code = 'owner' or exists(select 1 from public.tenant_role_permissions rp where rp.role_id = r.id and rp.permission_code = 'transactions.approve'));
  else
    perform public._post_cash_transaction(_id);
  end if;
  return _id;
end $$;

create or replace function public.decide_cash_transaction(_id uuid, _approve boolean, _note text) returns void
language plpgsql security definer set search_path = public as $$
declare _c record;
begin
  select * into _c from public.cash_transactions where id = _id for update;
  if _c.id is null then raise exception 'العملية غير موجودة'; end if;
  perform public._require(_c.tenant_id, 'transactions.approve');
  if _c.status <> 'pending_approval' then raise exception 'العملية ليست بانتظار الاعتماد'; end if;
  update public.cash_transactions set approved_by = auth.uid(), approved_at = now(), approval_note = _note where id = _id;
  if _approve then perform public._post_cash_transaction(_id);
  else update public.cash_transactions set status = 'rejected' where id = _id; end if;
  update public.approval_requests set status = case when _approve then 'approved' else 'rejected' end, decided_by = auth.uid(), decided_at = now(), comment = _note
   where entity_type = 'cash_transactions' and entity_id = _id and status = 'pending';
  if _c.created_by is not null then
    insert into public.notifications(tenant_id, user_id, title, body, link)
    values (_c.tenant_id, _c.created_by, case when _approve then 'تم اعتماد المصروف ' else 'تم رفض المصروف ' end || _c.number, _note, '/app/expenses');
  end if;
  perform public.log_action('tenant', _c.tenant_id, case when _approve then 'expense_approved' else 'expense_rejected' end, 'cash_transactions', _id::text, jsonb_build_object('note', _note));
end $$;

create or replace function public.void_cash_transaction(_id uuid, _reason text) returns void
language plpgsql security definer set search_path = public as $$
declare _c record;
begin
  select * into _c from public.cash_transactions where id = _id for update;
  if _c.id is null then raise exception 'العملية غير موجودة'; end if;
  perform public._require(_c.tenant_id, 'transactions.approve');
  if _c.status <> 'posted' then raise exception 'يمكن إلغاء العمليات المرحّلة فقط'; end if;
  if coalesce(btrim(_reason),'') = '' then raise exception 'سبب الإلغاء مطلوب'; end if;
  perform public._reverse_entry(_c.journal_entry_id, current_date, 'إلغاء ' || _c.number || ': ' || _reason);
  update public.cash_transactions set status = 'void', approval_note = coalesce(approval_note || ' | ', '') || 'ملغاة: ' || _reason where id = _id;
end $$;

-- ================= INVENTORY DOCUMENTS =================
create or replace function public.create_stock_document(_p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare _t uuid := (_p->>'tenant_id')::uuid; _type text := _p->>'doc_type'; _wh uuid := nullif(_p->>'warehouse_id','')::uuid; _to uuid := nullif(_p->>'to_warehouse_id','')::uuid;
  _date date := coalesce(nullif(_p->>'doc_date','')::date, current_date); _counter uuid := nullif(_p->>'counter_account_id','')::uuid;
  _it jsonb; _q numeric; _c numeric; _value numeric := 0; _id uuid; _num text; _cur numeric; _prod uuid; _je uuid; _inv_acc uuid; _mt text;
begin
  perform public._require(_t, 'inventory.manage');
  if not (select inventory_enabled from public.tenants where id = _t) then raise exception 'وحدة المخزون غير مفعلة لهذه الشركة'; end if;
  if _type not in ('receipt','issue','transfer','adjustment','count') then raise exception 'نوع المستند غير صالح'; end if;
  if not exists(select 1 from public.warehouses where id = _wh and tenant_id = _t) then raise exception 'يجب اختيار المستودع'; end if;
  if _type = 'transfer' then
    if _to is null or _to = _wh or not exists(select 1 from public.warehouses where id = _to and tenant_id = _t) then raise exception 'يجب اختيار مستودع وجهة مختلف'; end if;
  end if;
  if _counter is not null and not exists(select 1 from public.accounts where id = _counter and tenant_id = _t and not is_group and is_active) then raise exception 'الحساب المقابل غير صالح'; end if;
  if jsonb_array_length(coalesce(_p->'items','[]'::jsonb)) = 0 then raise exception 'يجب إضافة صنف واحد على الأقل'; end if;
  _num := public._next_number(_t, 'stock');
  insert into public.stock_documents(tenant_id, number, doc_type, doc_date, warehouse_id, to_warehouse_id, counter_account_id, notes, created_by)
  values (_t, _num, _type, _date, _wh, _to, _counter, _p->>'notes', auth.uid()) returning id into _id;
  for _it in select * from jsonb_array_elements(_p->'items') loop
    _prod := nullif(_it->>'product_id','')::uuid;
    _q := nullif(_it->>'quantity','')::numeric;
    if _type = 'count' then
      _q := nullif(_it->>'counted_quantity','')::numeric;
      if _q is null or _q < 0 then raise exception 'الكمية المجرودة غير صالحة'; end if;
      select coalesce((select quantity from public.stock_levels where product_id = _prod and warehouse_id = _wh), 0) into _cur;
      _q := _q - _cur;
      if _q = 0 then continue; end if;
    elsif _type = 'adjustment' then
      if _q is null or _q = 0 then raise exception 'كمية التسوية يجب ألا تكون صفراً'; end if;
    else
      if _q is null or _q <= 0 then raise exception 'الكمية يجب أن تكون أكبر من صفر'; end if;
    end if;
    if _type = 'receipt' then
      _c := public._stock_move(_t, _prod, _wh, _q, coalesce(nullif(_it->>'unit_cost','')::numeric, (select purchase_price from public.products where id = _prod)), _date, 'receipt', 'stock_document', _id, _num);
      _value := _value + _c;
    elsif _type = 'issue' then
      _c := public._stock_move(_t, _prod, _wh, -_q, null, _date, 'issue', 'stock_document', _id, _num);
      _value := _value + _c;
    elsif _type = 'transfer' then
      _c := public._stock_move(_t, _prod, _wh, -_q, null, _date, 'transfer_out', 'stock_document', _id, _num);
      perform public._stock_move(_t, _prod, _to, _q, _c / _q, _date, 'transfer_in', 'stock_document', _id, _num);
    else
      _mt := 'adjustment';
      if _q > 0 then
        _c := public._stock_move(_t, _prod, _wh, _q, nullif(_it->>'unit_cost','')::numeric, _date, _mt, 'stock_document', _id, _num);
        _value := _value + _c;
      else
        _c := public._stock_move(_t, _prod, _wh, _q, null, _date, _mt, 'stock_document', _id, _num);
        _value := _value - _c;
      end if;
    end if;
  end loop;
  if _type <> 'transfer' and _value <> 0 then
    _inv_acc := public._acct(_t, 'inventory');
    if _type = 'receipt' then _counter := coalesce(_counter, public._acct(_t, 'opening_equity'));
    else _counter := coalesce(_counter, public._acct(_t, 'inventory_adjustment')); end if;
    if _type = 'issue' then _value := -_value; end if;
    _je := public._create_entry(_t, _date, 'مستند مخزون ' || _num, 'inventory', _id, null, jsonb_build_array(
      jsonb_build_object('account_id', _inv_acc, 'debit', _value, 'description', 'مخزون ' || _num),
      jsonb_build_object('account_id', _counter, 'credit', _value, 'description', 'مقابل مخزون ' || _num)));
  end if;
  update public.stock_documents set total_value = abs(_value), journal_entry_id = _je, counter_account_id = _counter where id = _id;
  return _id;
end $$;

-- ================= TEAM =================
create or replace function public._max_users(_t uuid) returns int
language sql stable security definer set search_path = public as $$
  select p.max_users from public.subscriptions s join public.subscription_plans p on p.id = s.plan_id where s.tenant_id = _t and s.is_current
$$;

create or replace function public.invite_member(_tenant uuid, _email text, _role uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare _id uuid; _r record; _email_l text := lower(btrim(_email)); _uid uuid; _max int;
begin
  perform public._require(_tenant, 'users.manage');
  select * into _r from public.tenant_roles where id = _role and tenant_id = _tenant;
  if _r.id is null then raise exception 'الدور غير صالح'; end if;
  if _r.code = 'owner' and not exists(select 1 from public.tenant_memberships m join public.tenant_roles x on x.id = m.role_id where m.tenant_id = _tenant and m.user_id = auth.uid() and x.code = 'owner') then
    raise exception 'فقط المالك يمكنه دعوة مالك آخر';
  end if;
  if _email_l !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'البريد الإلكتروني غير صالح'; end if;
  select id into _uid from public.profiles where lower(email) = _email_l;
  if _uid is not null and exists(select 1 from public.tenant_memberships where tenant_id = _tenant and user_id = _uid and status = 'active') then
    raise exception 'المستخدم عضو في الشركة بالفعل';
  end if;
  _max := public._max_users(_tenant);
  if _max is not null and (select count(*) from public.tenant_memberships where tenant_id = _tenant and status = 'active')
                         + (select count(*) from public.tenant_invitations where tenant_id = _tenant and status = 'pending') >= _max then
    raise exception 'تم بلوغ الحد الأقصى لعدد المستخدمين في خطة الاشتراك (%)', _max;
  end if;
  insert into public.tenant_invitations(tenant_id, email, role_id, invited_by) values (_tenant, _email_l, _role, auth.uid()) returning id into _id;
  if _uid is not null then
    insert into public.notifications(tenant_id, user_id, title, body, link)
    values (_tenant, _uid, 'دعوة للانضمام إلى ' || (select name from public.tenants where id = _tenant), 'تمت دعوتك بدور ' || _r.name_ar, '/select-company');
  end if;
  return _id;
end $$;

create or replace function public.my_invitations() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'tenant_id', t.id, 'tenant_name', t.name, 'role_name_ar', r.name_ar, 'role_name_en', r.name_en, 'created_at', i.created_at) order by i.created_at desc), '[]'::jsonb)
  from public.tenant_invitations i join public.tenants t on t.id = i.tenant_id join public.tenant_roles r on r.id = i.role_id
  where i.status = 'pending' and lower(i.email) = lower((select email from auth.users where id = auth.uid()))
$$;

create or replace function public.accept_invitation(_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare _i record; _email text; _max int; _branch uuid;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  select email into _email from auth.users where id = auth.uid();
  select * into _i from public.tenant_invitations where id = _id and status = 'pending' for update;
  if _i.id is null or lower(_i.email) <> lower(_email) then raise exception 'الدعوة غير موجودة أو غير مخصصة لك'; end if;
  _max := public._max_users(_i.tenant_id);
  if _max is not null and (select count(*) from public.tenant_memberships where tenant_id = _i.tenant_id and status = 'active') >= _max then
    raise exception 'تم بلوغ الحد الأقصى لعدد المستخدمين في خطة اشتراك الشركة';
  end if;
  select id into _branch from public.branches where tenant_id = _i.tenant_id and is_main limit 1;
  insert into public.tenant_memberships(tenant_id, user_id, role_id, default_branch_id) values (_i.tenant_id, auth.uid(), _i.role_id, _branch)
  on conflict (tenant_id, user_id) do update set role_id = excluded.role_id, status = 'active';
  update public.tenant_invitations set status = 'accepted', accepted_at = now() where id = _id;
  return _i.tenant_id;
end $$;

create or replace function public.revoke_invitation(_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare _i record;
begin
  select * into _i from public.tenant_invitations where id = _id;
  if _i.id is null then raise exception 'الدعوة غير موجودة'; end if;
  perform public._require(_i.tenant_id, 'users.manage');
  update public.tenant_invitations set status = 'revoked' where id = _id and status = 'pending';
end $$;

create or replace function public.update_member(_membership uuid, _role uuid, _status text, _branch uuid) returns void
language plpgsql security definer set search_path = public as $$
declare _m record; _old_code text; _new_code text; _caller_owner boolean;
begin
  select * into _m from public.tenant_memberships where id = _membership for update;
  if _m.id is null then raise exception 'العضوية غير موجودة'; end if;
  perform public._require(_m.tenant_id, 'users.manage');
  if _status not in ('active','disabled') then raise exception 'حالة غير صالحة'; end if;
  if _m.user_id = auth.uid() and (_status <> 'active' or _role <> _m.role_id) then raise exception 'لا يمكنك تغيير دورك أو إيقاف حسابك بنفسك'; end if;
  select code into _old_code from public.tenant_roles where id = _m.role_id;
  select code into _new_code from public.tenant_roles where id = _role and tenant_id = _m.tenant_id;
  if _new_code is null then raise exception 'الدور غير صالح'; end if;
  _caller_owner := exists(select 1 from public.tenant_memberships m join public.tenant_roles r on r.id = m.role_id where m.tenant_id = _m.tenant_id and m.user_id = auth.uid() and r.code = 'owner');
  if (_new_code = 'owner' or _old_code = 'owner') and not _caller_owner and (_new_code <> _old_code or _status <> _m.status) then
    raise exception 'فقط المالك يمكنه تعديل عضوية المالك';
  end if;
  if _old_code = 'owner' and (_new_code <> 'owner' or _status <> 'active') and
     (select count(*) from public.tenant_memberships m join public.tenant_roles r on r.id = m.role_id where m.tenant_id = _m.tenant_id and r.code = 'owner' and m.status = 'active') <= 1 then
    raise exception 'يجب أن يبقى مالك نشط واحد على الأقل للشركة';
  end if;
  if _branch is not null and not exists(select 1 from public.branches where id = _branch and tenant_id = _m.tenant_id) then raise exception 'الفرع غير صالح'; end if;
  update public.tenant_memberships set role_id = _role, status = _status, default_branch_id = _branch where id = _membership;
  perform public.log_action('tenant', _m.tenant_id, 'member_updated', 'tenant_memberships', _membership::text, jsonb_build_object('role', _new_code, 'status', _status));
end $$;

revoke execute on function public._stock_move(uuid,uuid,uuid,numeric,numeric,date,text,text,uuid,text) from public, anon, authenticated;
revoke execute on function public._post_cash_transaction(uuid) from public, anon, authenticated;
revoke execute on function public._max_users(uuid) from public, anon, authenticated;
