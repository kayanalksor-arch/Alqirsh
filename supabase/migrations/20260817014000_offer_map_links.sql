-- Optional administrative map links. These are intentionally not selected by public pages.
alter table public.sale_offers
  add column if not exists map_url text;

alter table public.rental_offers
  add column if not exists map_url text;

comment on column public.sale_offers.map_url is 'Optional map URL for dashboard administration only.';
comment on column public.rental_offers.map_url is 'Optional map URL for dashboard administration only.';
