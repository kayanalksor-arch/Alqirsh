-- Internal property-management module.  This migration is additive: it does
-- not alter or migrate public sale/rental listing data.
alter table public.profiles
  add column if not exists role text not null default 'member'
  check (role in ('admin', 'property_manager', 'member'));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.can_manage_properties()
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

revoke all on function public.can_manage_properties() from public;
grant execute on function public.can_manage_properties() to authenticated;

-- Existing administrator bootstrap. This stays server-side and is never used
-- in browser authorization logic.
update public.profiles
set role = 'admin'
where lower(email) = 'ca.markode@gmail.com';

create table if not exists public.property_owners (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) >= 2),
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.managed_properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.property_owners(id) on delete restrict,
  name text not null check (char_length(trim(name)) >= 2),
  property_type text not null,
  address text,
  area_name text,
  description text,
  status text not null default 'active' check (status in ('active', 'under_management', 'suspended', 'inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.managed_tenants (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) >= 2),
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.managed_units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.managed_properties(id) on delete cascade,
  unit_number text not null,
  unit_type text,
  floor text,
  area numeric(12, 2) check (area is null or area >= 0),
  monthly_rent numeric(14, 2) check (monthly_rent is null or monthly_rent >= 0),
  status text not null default 'available' check (status in ('available', 'rented', 'vacant', 'maintenance', 'unavailable')),
  tenant_id uuid references public.managed_tenants(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id, unit_number)
);

create table if not exists public.lease_contracts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.managed_properties(id) on delete restrict,
  unit_id uuid not null references public.managed_units(id) on delete restrict,
  owner_id uuid not null references public.property_owners(id) on delete restrict,
  tenant_id uuid not null references public.managed_tenants(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  monthly_rent numeric(14, 2) not null check (monthly_rent >= 0),
  deposit_amount numeric(14, 2) check (deposit_amount is null or deposit_amount >= 0),
  status text not null default 'active' check (status in ('active', 'expiring_soon', 'expired', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.rent_payments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.lease_contracts(id) on delete restrict,
  tenant_id uuid not null references public.managed_tenants(id) on delete restrict,
  unit_id uuid not null references public.managed_units(id) on delete restrict,
  amount numeric(14, 2) not null check (amount >= 0),
  due_date date not null,
  paid_date date,
  status text not null default 'due' check (status in ('paid', 'due', 'overdue', 'partial')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.managed_properties(id) on delete restrict,
  unit_id uuid references public.managed_units(id) on delete set null,
  tenant_id uuid references public.managed_tenants(id) on delete set null,
  description text not null check (char_length(trim(description)) >= 3),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'new' check (status in ('new', 'in_progress', 'completed', 'cancelled')),
  cost numeric(14, 2) check (cost is null or cost >= 0),
  requested_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.property_management_settings (
  id boolean primary key default true check (id),
  currency text not null default 'EGP',
  grace_period_days integer not null default 0 check (grace_period_days >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists managed_properties_owner_id_idx on public.managed_properties(owner_id);
create index if not exists managed_units_property_id_idx on public.managed_units(property_id);
create index if not exists managed_units_tenant_id_idx on public.managed_units(tenant_id);
create index if not exists lease_contracts_unit_id_idx on public.lease_contracts(unit_id);
create index if not exists lease_contracts_status_idx on public.lease_contracts(status);
create index if not exists rent_payments_status_due_date_idx on public.rent_payments(status, due_date);
create index if not exists maintenance_requests_status_idx on public.maintenance_requests(status);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'property_owners', 'managed_properties', 'managed_tenants', 'managed_units',
    'lease_contracts', 'rent_payments', 'maintenance_requests', 'property_management_settings'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists property_management_access on public.%I', table_name);
    execute format(
      'create policy property_management_access on public.%I for all to authenticated using (public.can_manage_properties()) with check (public.can_manage_properties())',
      table_name
    );
    execute format('drop trigger if exists %I on public.%I', table_name || '_set_updated_at', table_name);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', table_name || '_set_updated_at', table_name);
  end loop;
end;
$$;
