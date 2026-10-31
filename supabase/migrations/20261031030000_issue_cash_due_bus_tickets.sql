-- Confirmed cash-on-boarding bookings get a scannable ticket immediately.
-- The scanner still blocks boarding until payment is collected and recorded.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create or replace function public.issue_bus_tickets(p_booking_id uuid)
returns table(ticket_id uuid, passenger_name text, seat_label text, qr_token text, ticket_status text)
language plpgsql security definer set search_path = pg_catalog, extensions, public as $$
declare
  b public.bus_bookings;
  bs record;
  ticket_record public.bus_tickets;
  raw_token text;
  issued_count integer := 0;
begin
  select * into b from public.bus_bookings where id = p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND' using errcode = '42501'; end if;
  if b.customer_id <> auth.uid() and not (
    public.has_section_permission('bus.tickets.issue')
    or public.has_section_permission('bus.receipts.review')
    or public.has_section_permission('bus.cash.collect')
    or public.has_section_permission('bus.bookings.manage')
  ) then raise exception 'NOT_AUTHORIZED' using errcode = '42501'; end if;
  if b.status <> 'confirmed' or not (
    b.payment_status = 'paid'
    or (b.payment_method = 'cash_on_boarding' and b.payment_status = 'cash_due')
  ) then raise exception 'BOOKING_NOT_TICKET_ELIGIBLE' using errcode = '22023'; end if;

  for bs in
    select s.passenger_name, s.seat_id, s.seat_label
    from public.bus_booking_seats s
    where s.booking_id = b.id and s.status in ('confirmed', 'boarded')
    order by s.seat_label
  loop
    select * into ticket_record from public.bus_tickets tk
    where tk.booking_id = b.id and tk.seat_id = bs.seat_id for update;
    if not found then
      raw_token := encode(gen_random_bytes(32), 'hex');
      insert into public.bus_tickets(booking_id, passenger_name, seat_id, seat_label, qr_secret_hash, qr_token)
      values(b.id, bs.passenger_name, bs.seat_id, bs.seat_label, digest(raw_token, 'sha256'), raw_token)
      returning * into ticket_record;
    elsif ticket_record.qr_token is null then
      raw_token := encode(gen_random_bytes(32), 'hex');
      update public.bus_tickets set qr_token = raw_token, qr_secret_hash = digest(raw_token, 'sha256')
      where id = ticket_record.id returning * into ticket_record;
    else
      raw_token := ticket_record.qr_token;
      if ticket_record.qr_secret_hash is distinct from digest(raw_token, 'sha256') then
        update public.bus_tickets set qr_secret_hash = digest(raw_token, 'sha256')
        where id = ticket_record.id returning * into ticket_record;
      end if;
    end if;
    return query select ticket_record.id, ticket_record.passenger_name, ticket_record.seat_label, raw_token, ticket_record.status;
    issued_count := issued_count + 1;
  end loop;
  if issued_count = 0 then raise exception 'BOOKING_HAS_NO_ACTIVE_SEATS' using errcode = '22023'; end if;
end;
$$;

revoke all on function public.issue_bus_tickets(uuid) from public;
grant execute on function public.issue_bus_tickets(uuid) to authenticated;

-- The scanner hashes QR tokens with pgcrypto too; include its extension schema
-- in its locked search path so validation succeeds in Supabase deployments.
alter function public.scan_and_board_bus_ticket(text, uuid, uuid)
  set search_path = pg_catalog, extensions, public;

create or replace function public.get_bus_customer_tickets(p_booking_id uuid)
returns table(ticket_id uuid, passenger_name text, seat_label text, ticket_status text, qr_token text)
language plpgsql security definer set search_path = public as $$
declare b public.bus_bookings; result_row record;
begin
  select * into b from public.bus_bookings where id = p_booking_id and customer_id = auth.uid();
  if not found then raise exception 'BOOKING_NOT_FOUND' using errcode = '42501'; end if;
  if b.status <> 'confirmed' or not (
    b.payment_status = 'paid'
    or (b.payment_method = 'cash_on_boarding' and b.payment_status = 'cash_due')
  ) then return; end if;
  for result_row in select * from public.issue_bus_tickets(p_booking_id) loop
    return query select result_row.ticket_id, result_row.passenger_name, result_row.seat_label,
      result_row.ticket_status, result_row.qr_token;
  end loop;
end;
$$;

revoke all on function public.get_bus_customer_tickets(uuid) from public;
grant execute on function public.get_bus_customer_tickets(uuid) to authenticated;

create or replace function public.confirm_bus_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare b public.bus_bookings;
begin
  if not public.has_section_permission('bus.bookings.manage') then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;
  select * into b from public.bus_bookings where id = p_booking_id for update;
  if not found or b.status <> 'pending' then raise exception 'BOOKING_NOT_PENDING' using errcode = '22023'; end if;
  if b.payment_method = 'bank_transfer' and b.payment_status <> 'paid' then
    raise exception 'PAYMENT_NOT_CONFIRMED' using errcode = '22023';
  end if;
  if b.payment_method = 'cash_on_boarding' and b.payment_status <> 'cash_due' then
    raise exception 'CASH_STATE_INVALID' using errcode = '22023';
  end if;
  if b.hold_expires_at <= now() then raise exception 'SEAT_HOLD_EXPIRED' using errcode = '22023'; end if;

  update public.bus_bookings set status = 'confirmed', hold_expires_at = 'infinity', updated_at = now() where id = b.id;
  update public.bus_booking_seats set status = 'confirmed' where booking_id = b.id and status = 'held';
  perform 1 from public.issue_bus_tickets(b.id);
  insert into public.bus_audit_log(actor_id, action, entity_type, entity_id, booking_id, trip_id, after_data)
  values(auth.uid(), 'booking_confirmed', 'booking', b.booking_code, b.id, b.trip_id,
    jsonb_build_object('payment_status', b.payment_status, 'tickets_issued', true));
end;
$$;

revoke all on function public.confirm_bus_booking(uuid) from public;
grant execute on function public.confirm_bus_booking(uuid) to authenticated;
