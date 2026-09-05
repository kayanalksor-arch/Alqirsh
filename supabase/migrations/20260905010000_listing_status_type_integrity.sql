-- Keep lifecycle states consistent with the listing type.
alter table public.sale_offers drop constraint if exists sale_offers_status_check;
alter table public.rental_offers drop constraint if exists rental_offers_status_check;

update public.sale_offers
set status = case when status in ('rented', 'withdrawn') then 'unavailable' else coalesce(status, 'pending_review') end;
update public.rental_offers
set status = case when status in ('sold', 'withdrawn') then 'unavailable' else coalesce(status, 'pending_review') end;

alter table public.sale_offers add constraint sale_offers_status_check check (
  status in ('available','reserved','sold','pending_review','temporarily_unavailable','unavailable','archived')
);
alter table public.rental_offers add constraint rental_offers_status_check check (
  status in ('available','reserved','rented','pending_review','temporarily_unavailable','unavailable','archived')
);