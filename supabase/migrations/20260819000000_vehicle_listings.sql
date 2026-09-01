create extension if not exists pgcrypto;

create table if not exists public.vehicle_listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  brand text,
  model text,
  variant text,
  year integer check (year between 1900 and 2100),
  listing_type text not null default 'sale' check (listing_type in ('sale', 'rent')),
  condition text default 'used',
  fuel_type text,
  transmission text,
  mileage integer check (mileage is null or mileage >= 0),
  color text,
  location text,
  description text,
  price numeric(14,2) check (price is null or price >= 0),
  daily_price numeric(14,2) check (daily_price is null or daily_price >= 0),
  weekly_price numeric(14,2) check (weekly_price is null or weekly_price >= 0),
  monthly_price numeric(14,2) check (monthly_price is null or monthly_price >= 0),
  status text not null default 'active' check (status in ('active', 'inactive', 'sold', 'archived')),
  contact_name text,
  contact_phone text,
  image_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vehicle_listings_listing_type_idx on public.vehicle_listings(listing_type);
create index if not exists vehicle_listings_status_idx on public.vehicle_listings(status);
create index if not exists vehicle_listings_brand_idx on public.vehicle_listings(brand);
create index if not exists vehicle_listings_location_idx on public.vehicle_listings(location);
create index if not exists vehicle_listings_price_idx on public.vehicle_listings(price);
create index if not exists vehicle_listings_created_at_idx on public.vehicle_listings(created_at desc);

alter table public.vehicle_listings enable row level security;

create policy vehicle_listings_public_select on public.vehicle_listings
  for select to anon, authenticated
  using (status = 'active');

create policy vehicle_listings_manager_access on public.vehicle_listings
  for all to authenticated
  using (public.is_platform_manager())
  with check (public.is_platform_manager());

create trigger vehicle_listings_set_updated_at
before update on public.vehicle_listings
for each row execute function public.set_updated_at();
