insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

alter table public.property_images enable row level security;

drop policy if exists public_active_listing_images on public.property_images;
drop policy if exists manager_listing_images on public.property_images;
create policy public_active_listing_images on public.property_images
  for select to anon, authenticated
  using (
    (property_type = 'sale' and exists (select 1 from public.sale_offers where id = property_id and status = 'active'))
    or (property_type = 'rental' and exists (select 1 from public.rental_offers where id = property_id and status = 'active'))
  );
create policy manager_listing_images on public.property_images
  for all to authenticated
  using (public.is_platform_manager())
  with check (public.is_platform_manager());

drop policy if exists public_listing_images_read on storage.objects;
drop policy if exists manager_listing_images_write on storage.objects;
create policy public_listing_images_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'listing-images');
create policy manager_listing_images_write on storage.objects
  for all to authenticated
  using (bucket_id = 'listing-images' and public.is_platform_manager())
  with check (bucket_id = 'listing-images' and public.is_platform_manager());
