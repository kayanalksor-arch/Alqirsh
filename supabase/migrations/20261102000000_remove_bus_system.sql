begin;

-- Stop if bus data changed after the verified private backup was created.
do $$
declare
  expected record;
  actual_count bigint;
begin
  for expected in
    select * from (values
      ('public.buses', 1::bigint),
      ('public.bus_seats', 40::bigint),
      ('public.bus_trips', 1::bigint),
      ('public.bus_bookings', 4::bigint),
      ('public.bus_booking_seats', 5::bigint),
      ('public.bus_tickets', 5::bigint),
      ('public.bus_payment_receipts', 2::bigint),
      ('public.bus_cash_collections', 0::bigint),
      ('public.bus_operating_expenses', 0::bigint),
      ('public.bus_audit_log', 10::bigint)
    ) as t(table_name, row_count)
  loop
    if to_regclass(expected.table_name) is null then
      raise exception 'Expected bus table is missing: %', expected.table_name;
    end if;
    execute format('select count(*) from %s', expected.table_name) into actual_count;
    if actual_count <> expected.row_count then
      raise exception 'Backup guard failed for %: expected %, found %', expected.table_name, expected.row_count, actual_count;
    end if;
  end loop;

  if exists (
    select 1 from storage.objects
    where bucket_id in ('bus-images', 'bus-payment-receipts')
  ) then
    raise exception 'Bus storage objects appeared after backup; refusing cleanup.';
  end if;
end $$;

create or replace function public.has_section_permission(permission_name text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  ) or (
    exists (select 1 from public.profiles where id = auth.uid() and status = 'active')
    and coalesce((
      select case permission_name
        when 'properties.sale.view' then properties_sale_view
        when 'properties.sale.create' then properties_sale_create
        when 'properties.sale.update' then properties_sale_update
        when 'properties.sale.delete' then properties_sale_delete
        when 'properties.sale.status' then properties_sale_status
        when 'properties.rent.view' then properties_rent_view
        when 'properties.rent.create' then properties_rent_create
        when 'properties.rent.update' then properties_rent_update
        when 'properties.rent.delete' then properties_rent_delete
        when 'properties.rent.status' then properties_rent_status
        when 'properties.images.manage' then properties_images_manage
        when 'properties.requests.view' then properties_requests_view
        when 'properties.requests.manage' then properties_requests_manage
        when 'properties.management.view' then properties_management_view
        when 'properties.management.manage' then properties_management_manage
        when 'cars.sale.view' then cars_sale_view
        when 'cars.sale.create' then cars_sale_create
        when 'cars.sale.update' then cars_sale_update
        when 'cars.sale.delete' then cars_sale_delete
        when 'cars.rent.view' then cars_rent_view
        when 'cars.rent.create' then cars_rent_create
        when 'cars.rent.update' then cars_rent_update
        when 'cars.rent.delete' then cars_rent_delete
        when 'cars.images.manage' then cars_images_manage
        when 'bookings.view' then bookings_view
        when 'bookings.create' then bookings_create
        when 'bookings.update' then bookings_update
        when 'bookings.cancel' then bookings_cancel
        when 'bookings.customer_details' then bookings_customer_details
        when 'users.permissions.manage' then users_permissions_manage
        when 'activity_logs.view' then activity_logs_view
        else false
      end
      from public.section_permissions where user_id = auth.uid()
    ), false)
  );
$$;

revoke all on function public.has_section_permission(text) from public;
grant execute on function public.has_section_permission(text) to authenticated;

drop policy if exists bus_images_public_read on storage.objects;
drop policy if exists bus_images_manager_insert on storage.objects;
drop policy if exists bus_images_manager_update on storage.objects;
drop policy if exists bus_images_manager_delete on storage.objects;
drop policy if exists bus_receipts_storage_customer_insert on storage.objects;
drop policy if exists bus_receipts_storage_private_read on storage.objects;
drop policy if exists bus_receipts_storage_customer_delete on storage.objects;

drop trigger if exists validate_bus_trip_publish on public.bus_trips;

drop function if exists public.collect_bus_cash(uuid, numeric);
drop function if exists public.confirm_bus_booking(uuid);
drop function if exists public.confirm_bus_transfer(uuid);
drop function if exists public.create_bus_booking(uuid, uuid[], text, text, text, text[], text);
drop function if exists public.create_bus_with_seats(text, text, text, text, text, text, integer, text);
drop function if exists public.create_bus_with_seats(text, text, text, text, text, text, integer, text[], text);
drop function if exists public.get_bus_customer_tickets(uuid);
drop function if exists public.get_bus_trip_boarding_stats(uuid);
drop function if exists public.issue_bus_tickets(uuid);
drop function if exists public.reject_bus_receipt(uuid, text);
drop function if exists public.release_bus_booking(uuid);
drop function if exists public.scan_and_board_bus_ticket(text, uuid, uuid);
drop function if exists public.update_bus_image(uuid, text);
drop function if exists public.upload_bus_payment_receipt(uuid, text, text, bigint, text, timestamptz);
drop function if exists public.validate_bus_trip_publish();
drop function if exists public.get_public_trip_seat_layout(uuid);
drop function if exists public.get_public_trip_seats(uuid);

drop table if exists public.bus_cash_collections;
drop table if exists public.bus_payment_receipts;
drop table if exists public.bus_tickets;
drop table if exists public.bus_booking_seats;
drop table if exists public.bus_audit_log;
drop table if exists public.bus_operating_expenses;
drop table if exists public.bus_bookings;
drop table if exists public.bus_trips;
drop table if exists public.bus_seats;
drop table if exists public.buses;

alter table public.section_permissions
  drop column if exists bus_fleet_view,
  drop column if exists bus_fleet_manage,
  drop column if exists bus_trips_view,
  drop column if exists bus_trips_manage,
  drop column if exists bus_bookings_view,
  drop column if exists bus_bookings_manage,
  drop column if exists bus_receipts_review,
  drop column if exists bus_tickets_issue,
  drop column if exists bus_qr_scan,
  drop column if exists bus_boarding_record,
  drop column if exists bus_cash_collect,
  drop column if exists bus_finance_view,
  drop column if exists bus_expenses_manage,
  drop column if exists bus_refunds_manage,
  drop column if exists bus_audit_view,
  drop column if exists bus_reports_export;

commit;
