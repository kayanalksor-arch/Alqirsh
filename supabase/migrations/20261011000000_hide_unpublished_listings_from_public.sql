-- Keep public catalogues limited to published records while preserving scoped staff reads.
drop policy if exists public_active_listings on public.sale_offers;
drop policy if exists public_sale_offers_read on public.sale_offers;
create policy public_sale_offers_read on public.sale_offers
  for select to anon, authenticated using (status not in ('archived', 'pending_review'));
drop policy if exists sale_offer_permission_read on public.sale_offers;
create policy sale_offer_permission_read on public.sale_offers
  for select to authenticated using (public.has_section_permission('properties.sale.view'));

drop policy if exists public_active_listings on public.rental_offers;
drop policy if exists public_rental_offers_read on public.rental_offers;
create policy public_rental_offers_read on public.rental_offers
  for select to anon, authenticated using (status not in ('archived', 'pending_review'));
drop policy if exists rental_offer_permission_read on public.rental_offers;
create policy rental_offer_permission_read on public.rental_offers
  for select to authenticated using (public.has_section_permission('properties.rent.view'));

drop policy if exists public_active_listing_images on public.property_images;
create policy public_active_listing_images on public.property_images
  for select to anon, authenticated using (
    (property_type = 'sale' and exists (
      select 1 from public.sale_offers where id = property_id and status not in ('archived', 'pending_review')
    )) or
    (property_type = 'rental' and exists (
      select 1 from public.rental_offers where id = property_id and status not in ('archived', 'pending_review')
    ))
  );
drop policy if exists property_images_permission_read on public.property_images;
create policy property_images_permission_read on public.property_images
  for select to authenticated using (
    (property_type = 'sale' and public.has_section_permission('properties.sale.view')) or
    (property_type = 'rental' and public.has_section_permission('properties.rent.view'))
  );

drop policy if exists vehicle_listings_public_select on public.vehicle_listings;
create policy vehicle_listings_public_select on public.vehicle_listings
  for select to anon, authenticated using (status not in ('archived', 'pending_review'));
drop policy if exists vehicle_permission_read on public.vehicle_listings;
create policy vehicle_permission_read on public.vehicle_listings
  for select to authenticated using (
    (listing_type = 'sale' and public.has_section_permission('cars.sale.view')) or
    (listing_type = 'rent' and public.has_section_permission('cars.rent.view'))
  );

drop policy if exists vehicle_images_public_read on public.vehicle_images;
create policy vehicle_images_public_read on public.vehicle_images for select to anon, authenticated
  using (exists (
    select 1 from public.vehicle_listings v
    where v.id = vehicle_id and v.status not in ('archived', 'pending_review')
  ));
drop policy if exists vehicle_images_permission_read on public.vehicle_images;
create policy vehicle_images_permission_read on public.vehicle_images for select to authenticated
  using (exists (
    select 1 from public.vehicle_listings v where v.id = vehicle_id and (
      (v.listing_type = 'sale' and public.has_section_permission('cars.sale.view')) or
      (v.listing_type = 'rent' and public.has_section_permission('cars.rent.view'))
    )
  ));
