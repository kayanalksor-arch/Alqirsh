create or replace function public.get_public_trip_seat_layout(p_trip_id uuid)
returns table(
  seat_id uuid,
  seat_label text,
  seat_type text,
  row_number integer,
  seat_position integer,
  is_available boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.seat_label,
    s.seat_type,
    s.row_number,
    s.position,
    not exists (
      select 1
      from public.bus_booking_seats bs
      where bs.trip_id = p_trip_id
        and bs.seat_id = s.id
        and (
          bs.status in ('confirmed', 'boarded')
          or (bs.status = 'held' and bs.hold_expires_at > now())
        )
    ) as is_available
  from public.bus_trips t
  join public.bus_seats s on s.bus_id = t.bus_id
  where t.id = p_trip_id
    and t.status = 'published'
    and t.departure_at > now()
    and s.seat_type <> 'unavailable'
  order by s.row_number, s.position;
$$;

revoke all on function public.get_public_trip_seat_layout(uuid) from public;
grant execute on function public.get_public_trip_seat_layout(uuid) to anon, authenticated;

-- Keep services as part of the published trip snapshot so customer booking
-- details show the bus amenities selected when the trip was created.
alter table public.bus_trips add column if not exists services text[] not null default '{}';

update public.bus_trips as trip
set services = bus.services
from public.buses as bus
where trip.bus_id = bus.id and trip.services = '{}'::text[] and cardinality(bus.services) > 0;

-- Existing issued tickets can predate the stored raw QR token. Backfill their
-- token once so the customer page can render a scannable code.
create or replace function public.issue_bus_tickets(p_booking_id uuid)
returns table(ticket_id uuid, passenger_name text, seat_label text, qr_token text, ticket_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bus_bookings;
  bs record;
  ticket_record public.bus_tickets;
  raw_token text;
  issued_count integer := 0;
begin
  select * into b from public.bus_bookings where id = p_booking_id for update;
  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = '42501';
  end if;
  if b.customer_id <> auth.uid() and not (
    public.has_section_permission('bus.tickets.issue')
    or public.has_section_permission('bus.receipts.review')
    or public.has_section_permission('bus.cash.collect')
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;
  if b.status <> 'confirmed' or b.payment_status <> 'paid' then
    raise exception 'BOOKING_NOT_TICKET_ELIGIBLE' using errcode = '22023';
  end if;

  for bs in
    select s.passenger_name, s.seat_id, s.seat_label
    from public.bus_booking_seats s
    where s.booking_id = b.id and s.status in ('confirmed', 'boarded')
    order by s.seat_label
  loop
    select * into ticket_record
    from public.bus_tickets tk
    where tk.booking_id = b.id and tk.seat_id = bs.seat_id
    for update;

    if not found then
      raw_token := encode(gen_random_bytes(32), 'hex');
      insert into public.bus_tickets(booking_id, passenger_name, seat_id, seat_label, qr_secret_hash, qr_token)
      values(b.id, bs.passenger_name, bs.seat_id, bs.seat_label, digest(raw_token, 'sha256'), raw_token)
      returning * into ticket_record;
    elsif ticket_record.qr_token is null then
      raw_token := encode(gen_random_bytes(32), 'hex');
      update public.bus_tickets
      set qr_token = raw_token, qr_secret_hash = digest(raw_token, 'sha256')
      where id = ticket_record.id
      returning * into ticket_record;
    else
      raw_token := ticket_record.qr_token;
      if ticket_record.qr_secret_hash is distinct from digest(raw_token, 'sha256') then
        update public.bus_tickets
        set qr_secret_hash = digest(raw_token, 'sha256')
        where id = ticket_record.id
        returning * into ticket_record;
      end if;
    end if;
    return query select ticket_record.id, ticket_record.passenger_name, ticket_record.seat_label, raw_token, ticket_record.status;
    issued_count := issued_count + 1;
  end loop;
  if issued_count = 0 then
    raise exception 'BOOKING_HAS_NO_ACTIVE_SEATS' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.issue_bus_tickets(uuid) from public;
grant execute on function public.issue_bus_tickets(uuid) to authenticated;

-- Issue the customer's ticket QR as soon as the transfer is approved and the
-- booking is confirmed. Cash bookings remain ineligible until collection.
create or replace function public.confirm_bus_transfer(p_receipt_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.bus_payment_receipts;
  b public.bus_bookings;
begin
  if not public.has_section_permission('bus.receipts.review') then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;
  select * into r from public.bus_payment_receipts where id = p_receipt_id for update;
  if not found or r.review_status not in ('pending', 'replacement_requested') then
    raise exception 'RECEIPT_NOT_PENDING' using errcode = '22023';
  end if;
  select * into b from public.bus_bookings where id = r.booking_id for update;
  if not found or b.status not in ('pending', 'confirmed') or b.payment_method <> 'bank_transfer'
    or (b.status = 'pending' and b.hold_expires_at <= now()) then
    raise exception 'BOOKING_NOT_REVIEWABLE' using errcode = '22023';
  end if;
  if b.status = 'pending' then
    update public.bus_bookings set status = 'confirmed', payment_status = 'paid', hold_expires_at = 'infinity', updated_at = now() where id = b.id;
    update public.bus_booking_seats set status = 'confirmed' where booking_id = b.id and status = 'held';
  else
    update public.bus_bookings set payment_status = 'paid', updated_at = now() where id = b.id;
  end if;

  update public.bus_payment_receipts
    set review_status = 'accepted', reviewed_by = auth.uid(), reviewed_at = now()
    where id = r.id;
  perform 1 from public.issue_bus_tickets(b.id);
  insert into public.bus_audit_log(actor_id, action, entity_type, entity_id, booking_id, trip_id, after_data)
  values(auth.uid(), 'transfer_confirmed', 'payment_receipt', r.id::text, b.id, b.trip_id,
    jsonb_build_object('storage_path', r.storage_path, 'tickets_issued', true));
end;
$$;

revoke all on function public.confirm_bus_transfer(uuid) from public;
grant execute on function public.confirm_bus_transfer(uuid) to authenticated;

create or replace function public.collect_bus_cash(p_booking_id uuid, p_amount numeric)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bus_bookings;
  ref text;
begin
  if not public.has_section_permission('bus.cash.collect') then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;
  select * into b from public.bus_bookings where id = p_booking_id for update;
  if not found or b.status <> 'confirmed' or b.payment_method <> 'cash_on_boarding' or b.payment_status <> 'cash_due' then
    raise exception 'CASH_NOT_DUE' using errcode = '22023';
  end if;
  if p_amount <> b.total_amount then
    raise exception 'COLLECTION_AMOUNT_MISMATCH' using errcode = '22023';
  end if;
  insert into public.bus_cash_collections(booking_id, collected_by, amount)
  values(b.id, auth.uid(), p_amount) returning reference_code into ref;
  update public.bus_bookings set payment_status = 'paid', updated_at = now() where id = b.id;
  perform 1 from public.issue_bus_tickets(b.id);
  insert into public.bus_audit_log(actor_id, action, entity_type, entity_id, booking_id, trip_id, after_data)
  values(auth.uid(), 'cash_collected', 'cash_collection', ref, b.id, b.trip_id,
    jsonb_build_object('amount', p_amount, 'tickets_issued', true));
  return ref;
end;
$$;

revoke all on function public.collect_bus_cash(uuid, numeric) from public;
grant execute on function public.collect_bus_cash(uuid, numeric) to authenticated;
