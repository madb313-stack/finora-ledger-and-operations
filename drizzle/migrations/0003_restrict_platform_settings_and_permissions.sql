
drop policy if exists platform_settings_select on public.platform_settings;
revoke select on public.platform_settings from anon;
create policy platform_settings_select on public.platform_settings for select to authenticated
  using (public.is_platform_admin());

create or replace function public.public_platform_info()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('self_registration', self_registration, 'announcement', announcement)
  from public.platform_settings limit 1
$$;
grant execute on function public.public_platform_info() to anon, authenticated;

drop policy if exists permissions_read on public.permissions;
create policy permissions_read on public.permissions for select to authenticated
  using (
    public.is_platform_admin()
    or exists (select 1 from public.tenant_memberships m where m.user_id = auth.uid() and m.status = 'active')
  );
