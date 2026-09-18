-- Public catalogue: retain historical/review listings in the public UI,
-- while archived records remain private to platform managers.
drop policy if exists public_active_listings on public.sale_offers;
drop policy if exists public_active_listings on public.rental_offers;
create policy public_active_listings on public.sale_offers
  for select to anon, authenticated using (status <> 'archived');
create policy public_active_listings on public.rental_offers
  for select to anon, authenticated using (status <> 'archived');

drop policy if exists vehicle_listings_public_select on public.vehicle_listings;
create policy vehicle_listings_public_select on public.vehicle_listings
  for select to anon, authenticated using (status <> 'archived');

drop policy if exists public_active_listing_images on public.property_images;
create policy public_active_listing_images on public.property_images
  for select to anon, authenticated using (
    (property_type = 'sale' and exists (
      select 1 from public.sale_offers where id = property_id and status <> 'archived'
    ))
    or (property_type = 'rental' and exists (
      select 1 from public.rental_offers where id = property_id and status <> 'archived'
    ))
  );
