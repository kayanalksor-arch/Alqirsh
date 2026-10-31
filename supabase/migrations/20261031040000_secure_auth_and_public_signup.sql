-- Public Auth users are ordinary members by default. Authentication alone never
-- assigns an administrative role or section permission.
create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    'member'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = case
          when public.profiles.full_name is null or public.profiles.full_name = '' then excluded.full_name
          else public.profiles.full_name
        end,
        phone = coalesce(public.profiles.phone, excluded.phone);
  return new;
end;
$$;

-- Keep the existing user/profile model and add the missing user directory fields.
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists last_sign_in_at timestamptz;

create or replace function public.is_platform_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active' and role = 'admin'
  );
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active' and role = 'admin'
  );
$$;
revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

create or replace function public.can_manage_properties()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin() or public.has_section_permission('properties.management.manage');
$$;
revoke all on function public.can_manage_properties() from public;
grant execute on function public.can_manage_properties() to authenticated;

-- Property managers may read the user directory where needed, but only active
-- platform admins may change accounts or roles.
drop policy if exists profiles_manager_manage on public.profiles;
drop policy if exists profiles_admin_manage on public.profiles;
create policy profiles_admin_manage on public.profiles for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists section_permissions_admin_all on public.section_permissions;
create policy section_permissions_admin_all on public.section_permissions for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Authenticated users may update only their own last-login timestamp through
-- this narrowly-scoped function; they cannot change profile roles or permissions.
create or replace function public.record_my_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare p public.profiles;
begin
  update public.profiles set last_sign_in_at = now() where id = auth.uid() and status = 'active' returning * into p;
  if not found then return; end if;
  if p.role = 'admin' or exists (
    select 1 from public.section_permissions sp
    where sp.user_id = p.id
      and (to_jsonb(sp) - 'user_id' - 'updated_at' - 'updated_by')::text like '%true%'
  ) then
    insert into public.activity_logs(actor_id,actor_name,actor_email,section,action,entity_id,entity_label,description,sensitive,details)
    values(p.id,p.full_name,p.email,'authentication','login',p.id::text,p.full_name,'Administrative user signed in',true,'{}'::jsonb);
  end if;
end;
$$;
revoke all on function public.record_my_login() from public;
grant execute on function public.record_my_login() to authenticated;

create or replace function public.record_my_logout()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = auth.uid() and status = 'active';
  if not found then return; end if;
  if p.role = 'admin' or exists (
    select 1 from public.section_permissions sp
    where sp.user_id = p.id
      and (to_jsonb(sp) - 'user_id' - 'updated_at' - 'updated_by')::text like '%true%'
  ) then
    insert into public.activity_logs(actor_id,actor_name,actor_email,section,action,entity_id,entity_label,description,sensitive,details)
    values(p.id,p.full_name,p.email,'authentication','logout',p.id::text,p.full_name,'Administrative user signed out',true,'{}'::jsonb);
  end if;
end;
$$;
revoke all on function public.record_my_logout() from public;
grant execute on function public.record_my_logout() to authenticated;

create or replace function public.record_denied_admin_access(p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare actor uuid := auth.uid(); p public.profiles; recent_count integer;
begin
  if actor is null or p_path is null or length(p_path) > 200 or p_path !~ '^/(dashboard|api/dashboard)(/[A-Za-z0-9_/-]*)?$' then return; end if;
  select * into p from public.profiles where id = actor;
  if not found then return; end if;
  select count(*) into recent_count from public.activity_logs
    where actor_id = p.id and section = 'authorization' and outcome = 'denied'
      and created_at > now() - interval '1 minute';
  if recent_count >= 10 then return; end if;
  insert into public.activity_logs(actor_id,actor_name,actor_email,section,action,entity_id,entity_label,description,outcome,sensitive,details)
  values(p.id,p.full_name,p.email,'authorization','denied',p.id::text,'Protected route','Rejected access to a protected route','denied',true,jsonb_build_object('path',p_path));
end;
$$;
revoke all on function public.record_denied_admin_access(text) from public;
grant execute on function public.record_denied_admin_access(text) to authenticated;
