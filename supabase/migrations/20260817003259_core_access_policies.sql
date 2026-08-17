-- Secure the existing public listing and dashboard tables without exposing a
-- service role key to the browser. This migration is additive and preserves data.
alter table public.profiles
  add column if not exists role text not null default 'member'
  check (role in ('admin', 'property_manager', 'member'));

create or replace function public.is_platform_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'property_manager')
  );
$$;

revoke all on function public.is_platform_manager() from public;
grant execute on function public.is_platform_manager() to authenticated;

-- Server-side bootstrap only; no client code uses the email for authorization.
update public.profiles set role = 'admin' where lower(email) = 'ca.markode@gmail.com';

alter table public.profiles enable row level security;
alter table public.sale_offers enable row level security;
alter table public.rental_offers enable row level security;
alter table public.requests enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists profiles_self_read on public.profiles;
drop policy if exists profiles_manager_read on public.profiles;
drop policy if exists profiles_manager_manage on public.profiles;
create policy profiles_self_read on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_manager_read on public.profiles for select to authenticated using (public.is_platform_manager());
create policy profiles_manager_manage on public.profiles for all to authenticated using (public.is_platform_manager()) with check (public.is_platform_manager());

do $$
declare table_name text;
begin
  foreach table_name in array array['sale_offers', 'rental_offers'] loop
    execute format('drop policy if exists public_active_listings on public.%I', table_name);
    execute format('drop policy if exists manager_listing_access on public.%I', table_name);
    execute format('create policy public_active_listings on public.%I for select to anon, authenticated using (status = ''active'')', table_name);
    execute format('create policy manager_listing_access on public.%I for all to authenticated using (public.is_platform_manager()) with check (public.is_platform_manager())', table_name);
  end loop;
end;
$$;

drop policy if exists manager_requests_access on public.requests;
create policy manager_requests_access on public.requests for all to authenticated using (public.is_platform_manager()) with check (public.is_platform_manager());

drop policy if exists manager_settings_access on public.app_settings;
create policy manager_settings_access on public.app_settings for all to authenticated using (public.is_platform_manager()) with check (public.is_platform_manager());
