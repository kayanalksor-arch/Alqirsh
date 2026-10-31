alter table public.section_permissions
  add column if not exists bus_fleet_view boolean not null default false,
  add column if not exists bus_fleet_manage boolean not null default false,
  add column if not exists bus_trips_view boolean not null default false,
  add column if not exists bus_trips_manage boolean not null default false,
  add column if not exists bus_bookings_view boolean not null default false,
  add column if not exists bus_bookings_manage boolean not null default false,
  add column if not exists bus_receipts_review boolean not null default false,
  add column if not exists bus_tickets_issue boolean not null default false,
  add column if not exists bus_qr_scan boolean not null default false,
  add column if not exists bus_boarding_record boolean not null default false,
  add column if not exists bus_cash_collect boolean not null default false,
  add column if not exists bus_finance_view boolean not null default false,
  add column if not exists bus_expenses_manage boolean not null default false,
  add column if not exists bus_refunds_manage boolean not null default false,
  add column if not exists bus_audit_view boolean not null default false,
  add column if not exists bus_reports_export boolean not null default false;

create or replace function public.has_section_permission(permission_name text)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='active') or
 (exists(select 1 from public.profiles where id=auth.uid() and status='active') and coalesce((
   select case permission_name
     when 'properties.sale.view' then properties_sale_view when 'properties.sale.create' then properties_sale_create when 'properties.sale.update' then properties_sale_update when 'properties.sale.delete' then properties_sale_delete when 'properties.sale.status' then properties_sale_status
     when 'properties.rent.view' then properties_rent_view when 'properties.rent.create' then properties_rent_create when 'properties.rent.update' then properties_rent_update when 'properties.rent.delete' then properties_rent_delete when 'properties.rent.status' then properties_rent_status
     when 'properties.images.manage' then properties_images_manage when 'properties.requests.view' then properties_requests_view when 'properties.requests.manage' then properties_requests_manage when 'properties.management.view' then properties_management_view when 'properties.management.manage' then properties_management_manage
     when 'cars.sale.view' then cars_sale_view when 'cars.sale.create' then cars_sale_create when 'cars.sale.update' then cars_sale_update when 'cars.sale.delete' then cars_sale_delete
     when 'cars.rent.view' then cars_rent_view when 'cars.rent.create' then cars_rent_create when 'cars.rent.update' then cars_rent_update when 'cars.rent.delete' then cars_rent_delete when 'cars.images.manage' then cars_images_manage
     when 'bookings.view' then bookings_view when 'bookings.create' then bookings_create when 'bookings.update' then bookings_update when 'bookings.cancel' then bookings_cancel when 'bookings.customer_details' then bookings_customer_details when 'users.permissions.manage' then users_permissions_manage when 'activity_logs.view' then activity_logs_view
     when 'bus.fleet.view' then bus_fleet_view when 'bus.fleet.manage' then bus_fleet_manage when 'bus.trips.view' then bus_trips_view when 'bus.trips.manage' then bus_trips_manage when 'bus.bookings.view' then bus_bookings_view when 'bus.bookings.manage' then bus_bookings_manage when 'bus.receipts.review' then bus_receipts_review when 'bus.tickets.issue' then bus_tickets_issue when 'bus.qr.scan' then bus_qr_scan when 'bus.boarding.record' then bus_boarding_record when 'bus.cash.collect' then bus_cash_collect when 'bus.finance.view' then bus_finance_view when 'bus.expenses.manage' then bus_expenses_manage when 'bus.refunds.manage' then bus_refunds_manage when 'bus.audit.view' then bus_audit_view when 'bus.reports.export' then bus_reports_export
     else false
   end from public.section_permissions where user_id=auth.uid()
 ), false));
$$;

revoke all on function public.has_section_permission(text) from public;
grant execute on function public.has_section_permission(text) to authenticated;
