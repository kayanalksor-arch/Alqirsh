-- A listing gallery has a deliberate upper bound to keep public cards fast.
create or replace function public.enforce_listing_image_limit()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if (select count(*) from public.property_images where property_type = new.property_type and property_id = new.property_id) >= 6 then
    raise exception 'A listing can contain at most 6 images';
  end if;
  return new;
end; $$;
drop trigger if exists listing_image_limit on public.property_images;
create trigger listing_image_limit before insert on public.property_images
for each row execute function public.enforce_listing_image_limit();
