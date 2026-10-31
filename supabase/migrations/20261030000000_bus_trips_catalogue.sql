-- Public, read-only catalogue for future bus departures. Booking and payment
-- data will be introduced separately with transactional server-side workflows.
create table if not exists public.bus_trips (
  id uuid primary key default gen_random_uuid(),
  origin text not null check (length(trim(origin)) between 2 and 120),
  destination text not null check (length(trim(destination)) between 2 and 120),
  departure_at timestamptz not null,
  arrival_at timestamptz,
  price numeric(12,2) not null check (price >= 0),
  capacity integer not null check (capacity > 0),
  bus_name text not null check (length(trim(bus_name)) between 1 and 120),
  bus_image_url text,
  services text[] not null default '{}',
  description text,
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden', 'cancelled', 'completed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (arrival_at is null or arrival_at > departure_at),
  check (origin <> destination)
);

create index if not exists bus_trips_public_schedule_idx
  on public.bus_trips (departure_at)
  where status = 'published';

alter table public.bus_trips enable row level security;

drop policy if exists bus_trips_public_published_read on public.bus_trips;
create policy bus_trips_public_published_read
  on public.bus_trips for select to anon, authenticated
  using (status = 'published');

drop policy if exists bus_trips_staff_read on public.bus_trips;
create policy bus_trips_staff_read
  on public.bus_trips for select to authenticated
  using (public.has_section_permission('bus.trips.view') or public.has_section_permission('bus.trips.manage'));

drop policy if exists bus_trips_staff_insert on public.bus_trips;
create policy bus_trips_staff_insert
  on public.bus_trips for insert to authenticated
  with check (public.has_section_permission('bus.trips.manage') and created_by = auth.uid());

drop policy if exists bus_trips_staff_update on public.bus_trips;
create policy bus_trips_staff_update
  on public.bus_trips for update to authenticated
  using (public.has_section_permission('bus.trips.manage'))
  with check (public.has_section_permission('bus.trips.manage'));

comment on table public.bus_trips is 'Published read-only bus trip catalogue. Booking and financial records are intentionally separate.';
