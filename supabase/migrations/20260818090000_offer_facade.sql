-- Add the facade field used by the dashboard offer forms.
alter table public.sale_offers
  add column if not exists facade text;

alter table public.rental_offers
  add column if not exists facade text;

comment on column public.sale_offers.facade is 'Optional property facade or orientation.';
comment on column public.rental_offers.facade is 'Optional property facade or orientation.';
