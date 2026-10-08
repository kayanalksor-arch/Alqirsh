-- Granular vehicle permissions and rental reservations. Existing vehicle rows and
-- image_url values are retained; the gallery is additive.
create table if not exists public.vehicle_permissions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  can_access_sale boolean not null default false,
  can_access_rent boolean not null default false,
  can_view_vehicles boolean not null default false,
  can_add_vehicles boolean not null default false,
  can_edit_vehicles boolean not null default false,
  can_delete_vehicles boolean not null default false,
  can_manage_images boolean not null default false,
  can_create_bookings boolean not null default false,
  can_view_bookings boolean not null default false,
  can_edit_bookings boolean not null default false,
  can_cancel_bookings boolean not null default false,
  can_view_customer_details boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.vehicle_permissions enable row level security;
drop policy if exists vehicle_permissions_admin_manage on public.vehicle_permissions;
create policy vehicle_permissions_admin_manage on public.vehicle_permissions for all to authenticated
  using (exists(select 1 from public.profiles where id=auth.uid() and role='admin'))
  with check (exists(select 1 from public.profiles where id=auth.uid() and role='admin'));

create or replace function public.has_vehicle_permission(permission_name text)
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select case permission_name
    when 'access_sale' then can_access_sale when 'access_rent' then can_access_rent
    when 'view' then can_view_vehicles when 'add' then can_add_vehicles
    when 'edit' then can_edit_vehicles when 'delete' then can_delete_vehicles
    when 'images' then can_manage_images when 'booking_create' then can_create_bookings
    when 'booking_view' then can_view_bookings when 'booking_edit' then can_edit_bookings
    when 'booking_cancel' then can_cancel_bookings when 'customer_details' then can_view_customer_details
    else false end from public.vehicle_permissions where user_id=auth.uid()), false)
  or exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;
revoke all on function public.has_vehicle_permission(text) from public;
grant execute on function public.has_vehicle_permission(text) to authenticated;

create table if not exists public.vehicle_images (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicle_listings(id) on delete cascade,
  storage_path text not null unique,
  public_url text not null,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists vehicle_images_vehicle_order_idx on public.vehicle_images(vehicle_id,sort_order);
alter table public.vehicle_images enable row level security;
drop policy if exists vehicle_images_public_read on public.vehicle_images;
create policy vehicle_images_public_read on public.vehicle_images for select to anon,authenticated
 using(exists(select 1 from public.vehicle_listings v where v.id=vehicle_id and v.status <> 'archived'));
drop policy if exists vehicle_images_manager_write on public.vehicle_images;
create policy vehicle_images_manager_write on public.vehicle_images for all to authenticated
 using(public.has_vehicle_permission('images') and exists(select 1 from public.vehicle_listings v where v.id=vehicle_id and v.listing_type='rent' and public.has_vehicle_permission('access_rent')))
 with check(public.has_vehicle_permission('images') and exists(select 1 from public.vehicle_listings v where v.id=vehicle_id and v.listing_type='rent' and public.has_vehicle_permission('access_rent')));

insert into public.vehicle_images(vehicle_id,storage_path,public_url,is_primary)
select id, substring(image_url from '/listing-images/(.*)$'), image_url, true from public.vehicle_listings
where image_url is not null and image_url like '%/listing-images/%'
on conflict(storage_path) do nothing;

create table if not exists public.vehicle_bookings (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicle_listings(id) on delete restrict,
  customer_name text not null,
  customer_phone text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  daily_rate numeric(14,2) not null check(daily_rate >= 0),
  total_amount numeric(14,2) not null check(total_amount >= 0),
  deposit_amount numeric(14,2) not null default 0 check(deposit_amount >= 0),
  notes text,
  status text not null default 'confirmed' check(status in ('confirmed','cancelled','completed')),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  cancelled_by uuid references public.profiles(id) on delete set null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_bookings_valid_period check(ends_at > starts_at),
  constraint vehicle_bookings_deposit_check check(deposit_amount <= total_amount)
);
create index if not exists vehicle_bookings_period_idx on public.vehicle_bookings(vehicle_id,starts_at,ends_at) where status <> 'cancelled';
alter table public.vehicle_bookings enable row level security;
drop policy if exists vehicle_bookings_read on public.vehicle_bookings;
create policy vehicle_bookings_read on public.vehicle_bookings for select to authenticated
 using(public.has_vehicle_permission('booking_view') and public.has_vehicle_permission('access_rent'));
drop policy if exists vehicle_bookings_insert on public.vehicle_bookings;
create policy vehicle_bookings_insert on public.vehicle_bookings for insert to authenticated
 with check(public.has_vehicle_permission('booking_create') and public.has_vehicle_permission('access_rent') and created_by=auth.uid());
drop policy if exists vehicle_bookings_update on public.vehicle_bookings;
create policy vehicle_bookings_update on public.vehicle_bookings for update to authenticated
using((public.has_vehicle_permission('booking_edit') or public.has_vehicle_permission('booking_cancel')) and public.has_vehicle_permission('access_rent'))
 with check((public.has_vehicle_permission('booking_edit') or public.has_vehicle_permission('booking_cancel')) and public.has_vehicle_permission('access_rent'));

create or replace function public.read_vehicle_booking(p_booking_id uuid)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare result jsonb;
begin
  if not public.has_vehicle_permission('booking_view') or not public.has_vehicle_permission('access_rent') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
  select jsonb_build_object('id',b.id,'vehicle_id',b.vehicle_id,'starts_at',b.starts_at,'ends_at',b.ends_at,'daily_rate',b.daily_rate,'total_amount',b.total_amount,'status',b.status,'created_at',b.created_at,
    'customer_name',case when public.has_vehicle_permission('customer_details') then b.customer_name else null end,
    'customer_phone',case when public.has_vehicle_permission('customer_details') then b.customer_phone else null end,
    'deposit_amount',case when public.has_vehicle_permission('customer_details') then b.deposit_amount else null end,
    'notes',case when public.has_vehicle_permission('customer_details') then b.notes else null end)
  into result from public.vehicle_bookings b where b.id=p_booking_id;
  return result;
end $$;
revoke all on function public.read_vehicle_booking(uuid) from public;
grant execute on function public.read_vehicle_booking(uuid) to authenticated;

create or replace function public.prevent_vehicle_booking_overlap()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.vehicle_id::text,0));
  if new.status <> 'cancelled' and exists(
    select 1 from public.vehicle_bookings b where b.vehicle_id=new.vehicle_id and b.id<>new.id
      and b.status<>'cancelled' and tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(new.starts_at,new.ends_at,'[)')
  ) then raise exception 'VEHICLE_BOOKING_CONFLICT' using errcode='23P01'; end if;
  return new;
end $$;
drop trigger if exists vehicle_booking_overlap_guard on public.vehicle_bookings;
create trigger vehicle_booking_overlap_guard before insert or update of vehicle_id,starts_at,ends_at,status on public.vehicle_bookings
for each row execute function public.prevent_vehicle_booking_overlap();

-- Serialize reservations by vehicle so concurrent inserts cannot pass a check together.
create or replace function public.create_vehicle_booking(p_vehicle_id uuid,p_customer_name text,p_customer_phone text,p_starts_at timestamptz,p_ends_at timestamptz,p_deposit numeric default 0,p_notes text default null)
returns public.vehicle_bookings language plpgsql security definer set search_path=public as $$
declare v public.vehicle_listings; d numeric; amount numeric; result public.vehicle_bookings;
begin
  if not public.has_vehicle_permission('booking_create') or not public.has_vehicle_permission('access_rent') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
  if p_ends_at<=p_starts_at or nullif(trim(p_customer_name),'') is null or nullif(trim(p_customer_phone),'') is null then raise exception 'INVALID_BOOKING' using errcode='22023'; end if;
  if not public.has_vehicle_permission('view') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
  select * into v from public.vehicle_listings where id=p_vehicle_id and listing_type='rent' for update;
  if not found or v.listing_type<>'rent' or v.status in ('archived','temporarily_unavailable','unavailable','withdrawn') then raise exception 'VEHICLE_UNAVAILABLE' using errcode='22023'; end if;
  d:=coalesce(v.daily_price,v.weekly_price/7,v.monthly_price/30);
  if d is null then raise exception 'VEHICLE_HAS_NO_RENTAL_RATE' using errcode='22023'; end if;
  amount:=ceil(extract(epoch from (p_ends_at-p_starts_at))/86400.0)*d;
  insert into public.vehicle_bookings(vehicle_id,customer_name,customer_phone,starts_at,ends_at,daily_rate,total_amount,deposit_amount,notes,created_by)
  values(p_vehicle_id,trim(p_customer_name),trim(p_customer_phone),p_starts_at,p_ends_at,d,amount,coalesce(p_deposit,0),nullif(trim(p_notes),''),auth.uid()) returning * into result;
  return result;
end $$;
revoke all on function public.create_vehicle_booking(uuid,text,text,timestamptz,timestamptz,numeric,text) from public;
grant execute on function public.create_vehicle_booking(uuid,text,text,timestamptz,timestamptz,numeric,text) to authenticated;

-- Direct table inserts would bypass trusted pricing; booking creation must use
-- the RPC above. The definer RPC checks the caller explicitly.
drop policy if exists vehicle_bookings_insert on public.vehicle_bookings;
create policy vehicle_bookings_insert on public.vehicle_bookings for insert to authenticated with check(false);

create or replace function public.enforce_vehicle_booking_permissions()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if tg_op='INSERT' and (not public.has_vehicle_permission('booking_create') or not public.has_vehicle_permission('access_rent')) then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
  if tg_op='UPDATE' then
    if new.vehicle_id is distinct from old.vehicle_id or new.daily_rate is distinct from old.daily_rate or new.total_amount is distinct from old.total_amount then raise exception 'BOOKING_PRICE_OR_VEHICLE_IMMUTABLE' using errcode='42501'; end if;
    if new.status='cancelled' and old.status<>'cancelled' and not public.has_vehicle_permission('booking_cancel') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
    if (new.starts_at,new.ends_at,new.customer_name,new.customer_phone,new.notes,new.deposit_amount) is distinct from (old.starts_at,old.ends_at,old.customer_name,old.customer_phone,old.notes,old.deposit_amount) and not public.has_vehicle_permission('booking_edit') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
  end if;
  return new;
end $$;
drop trigger if exists vehicle_booking_permission_guard on public.vehicle_bookings;
create trigger vehicle_booking_permission_guard before insert or update on public.vehicle_bookings for each row execute function public.enforce_vehicle_booking_permissions();

create or replace function public.get_vehicle_availability(p_vehicle_ids uuid[],p_from timestamptz,p_to timestamptz)
returns table(vehicle_id uuid,current_booking_end timestamptz,next_start timestamptz,next_end timestamptz)
language sql stable security invoker set search_path=public as $$
  select v.id,
    (select max(b.ends_at) from public.vehicle_bookings b where b.vehicle_id=v.id and b.status='confirmed' and b.starts_at<=now() and b.ends_at>now()),
    (select b.starts_at from public.vehicle_bookings b where b.vehicle_id=v.id and b.status='confirmed' and b.starts_at>now() order by b.starts_at limit 1),
    (select b.ends_at from public.vehicle_bookings b where b.vehicle_id=v.id and b.status='confirmed' and b.starts_at>now() order by b.starts_at limit 1)
  from public.vehicle_listings v where v.id=any(p_vehicle_ids) and v.listing_type='rent' and v.status<>'archived'
$$;
revoke all on function public.get_vehicle_availability(uuid[],timestamptz,timestamptz) from public;
grant execute on function public.get_vehicle_availability(uuid[],timestamptz,timestamptz) to anon,authenticated;

drop policy if exists vehicle_listings_manager_access on public.vehicle_listings;
drop policy if exists vehicle_listings_public_select on public.vehicle_listings;
drop policy if exists vehicle_listings_granular_read on public.vehicle_listings;
drop policy if exists vehicle_listings_granular_insert on public.vehicle_listings;
drop policy if exists vehicle_listings_granular_update on public.vehicle_listings;
drop policy if exists vehicle_listings_granular_delete on public.vehicle_listings;
create policy vehicle_listings_public_select on public.vehicle_listings for select to anon,authenticated using(status <> 'archived');
create policy vehicle_listings_granular_read on public.vehicle_listings for select to authenticated
 using((listing_type='rent' and public.has_vehicle_permission('access_rent') and public.has_vehicle_permission('view')) or (listing_type='sale' and public.has_vehicle_permission('access_sale') and public.has_vehicle_permission('view')) or public.is_platform_manager());
create policy vehicle_listings_granular_insert on public.vehicle_listings for insert to authenticated
 with check((listing_type='rent' and public.has_vehicle_permission('access_rent') and public.has_vehicle_permission('add')) or (listing_type='sale' and public.has_vehicle_permission('access_sale') and public.has_vehicle_permission('add')) or public.is_platform_manager());
create policy vehicle_listings_granular_update on public.vehicle_listings for update to authenticated
 using((listing_type='rent' and public.has_vehicle_permission('access_rent') and public.has_vehicle_permission('edit')) or (listing_type='sale' and public.has_vehicle_permission('access_sale') and public.has_vehicle_permission('edit')) or public.is_platform_manager())
 with check((listing_type='rent' and public.has_vehicle_permission('access_rent') and public.has_vehicle_permission('edit')) or (listing_type='sale' and public.has_vehicle_permission('access_sale') and public.has_vehicle_permission('edit')) or public.is_platform_manager());
create policy vehicle_listings_granular_delete on public.vehicle_listings for delete to authenticated
 using((listing_type='rent' and public.has_vehicle_permission('access_rent') and public.has_vehicle_permission('delete')) or (listing_type='sale' and public.has_vehicle_permission('access_sale') and public.has_vehicle_permission('delete')) or public.is_platform_manager());

drop policy if exists public_listing_images_read on storage.objects;
drop policy if exists manager_listing_images_update on storage.objects;
drop policy if exists manager_listing_images_delete on storage.objects;
create policy public_listing_images_read on storage.objects for select to anon,authenticated using(bucket_id='listing-images');
drop policy if exists manager_listing_images_write on storage.objects;
create policy manager_listing_images_write on storage.objects for insert to authenticated
 with check(bucket_id='listing-images' and ((name like 'vehicles/%' and public.has_vehicle_permission('images') and public.has_vehicle_permission('access_rent')) or public.is_platform_manager()));
create policy manager_listing_images_update on storage.objects for update to authenticated
 using(bucket_id='listing-images' and ((name like 'vehicles/%' and public.has_vehicle_permission('images') and public.has_vehicle_permission('access_rent')) or public.is_platform_manager()))
 with check(bucket_id='listing-images' and ((name like 'vehicles/%' and public.has_vehicle_permission('images') and public.has_vehicle_permission('access_rent')) or public.is_platform_manager()));
create policy manager_listing_images_delete on storage.objects for delete to authenticated
 using(bucket_id='listing-images' and ((name like 'vehicles/%' and public.has_vehicle_permission('images') and public.has_vehicle_permission('access_rent')) or public.is_platform_manager()));
