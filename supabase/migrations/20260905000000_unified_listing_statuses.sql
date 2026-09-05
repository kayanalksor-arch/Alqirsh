-- Unifies lifecycle states without losing existing listings. `sale_offers` and
-- `rental_offers` already encode the listing type in their table names.
do $$
begin
  alter table public.sale_offers drop constraint if exists sale_offers_status_check;
  alter table public.rental_offers drop constraint if exists rental_offers_status_check;
  alter table public.vehicle_listings drop constraint if exists vehicle_listings_status_check;
exception when undefined_table then null;
end $$;

update public.sale_offers set status = case status
  when 'active' then 'available' when 'inactive' then 'temporarily_unavailable'
  when 'draft' then 'pending_review' else coalesce(status, 'pending_review') end;
update public.rental_offers set status = case status
  when 'active' then 'available' when 'inactive' then 'temporarily_unavailable'
  when 'draft' then 'pending_review' else coalesce(status, 'pending_review') end;
update public.vehicle_listings set status = case status
  when 'active' then 'available' when 'inactive' then 'temporarily_unavailable'
  when 'draft' then 'pending_review' else coalesce(status, 'pending_review') end;

alter table public.sale_offers alter column status set default 'pending_review';
alter table public.rental_offers alter column status set default 'pending_review';
alter table public.vehicle_listings alter column status set default 'pending_review';

alter table public.sale_offers add constraint sale_offers_status_check check (status in ('available','reserved','sold','rented','pending_review','temporarily_unavailable','unavailable','archived'));
alter table public.rental_offers add constraint rental_offers_status_check check (status in ('available','reserved','sold','rented','pending_review','temporarily_unavailable','unavailable','archived'));
alter table public.vehicle_listings add constraint vehicle_listings_status_check check (status in ('available','reserved','sold','rented','pending_review','temporarily_unavailable','unavailable','archived','withdrawn'));

create table if not exists public.listing_status_history (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null,
  listing_kind text not null check (listing_kind in ('property_sale','property_rental','vehicle')),
  previous_status text,
  next_status text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists listing_status_history_listing_idx on public.listing_status_history(listing_kind, listing_id, created_at desc);
alter table public.listing_status_history enable row level security;
drop policy if exists listing_status_history_manager_read on public.listing_status_history;
create policy listing_status_history_manager_read on public.listing_status_history for select to authenticated using (public.is_platform_manager());

create or replace function public.record_listing_status_change() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into public.listing_status_history(listing_id, listing_kind, previous_status, next_status, changed_by)
    values (new.id, tg_argv[0], old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists sale_offers_status_audit on public.sale_offers;
create trigger sale_offers_status_audit after update of status on public.sale_offers for each row execute function public.record_listing_status_change('property_sale');
drop trigger if exists rental_offers_status_audit on public.rental_offers;
create trigger rental_offers_status_audit after update of status on public.rental_offers for each row execute function public.record_listing_status_change('property_rental');
drop trigger if exists vehicle_listings_status_audit on public.vehicle_listings;
create trigger vehicle_listings_status_audit after update of status on public.vehicle_listings for each row execute function public.record_listing_status_change('vehicle');

-- The public catalogue intentionally includes reserved listings, clearly marked.
drop policy if exists public_active_listings on public.sale_offers;
drop policy if exists public_active_listings on public.rental_offers;
create policy public_active_listings on public.sale_offers for select to anon, authenticated using (status in ('available', 'reserved'));
create policy public_active_listings on public.rental_offers for select to anon, authenticated using (status in ('available', 'reserved'));
drop policy if exists vehicle_listings_public_select on public.vehicle_listings;
create policy vehicle_listings_public_select on public.vehicle_listings for select to anon, authenticated using (status in ('available', 'reserved'));

drop policy if exists public_active_listing_images on public.property_images;
create policy public_active_listing_images on public.property_images for select to anon, authenticated using (
  (property_type = 'sale' and exists (select 1 from public.sale_offers where id = property_id and status in ('available', 'reserved')))
  or (property_type = 'rental' and exists (select 1 from public.rental_offers where id = property_id and status in ('available', 'reserved')))
);
