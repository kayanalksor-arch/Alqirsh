create or replace function public.create_bus_booking(
  p_trip_id uuid,
  p_seat_ids uuid[],
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_passenger_names text[],
  p_payment_method text
) returns table(
  booking_id uuid,
  booking_code text,
  total_amount numeric,
  hold_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.bus_trips;
  exp timestamptz;
  b public.bus_bookings;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if coalesce(array_length(p_seat_ids, 1), 0) < 1
    or array_length(p_seat_ids, 1) > 8
    or cardinality(p_seat_ids) <> (select count(distinct x) from unnest(p_seat_ids) x) then
    raise exception 'INVALID_SEATS' using errcode = '22023';
  end if;
  if array_length(p_passenger_names, 1) <> array_length(p_seat_ids, 1)
    or exists(select 1 from unnest(p_passenger_names) n where length(trim(n)) < 2 or length(n) > 120) then
    raise exception 'INVALID_PASSENGERS' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_customer_name, ''))) < 2
    or length(trim(coalesce(p_customer_phone, ''))) < 7
    or p_payment_method not in ('bank_transfer', 'cash_on_boarding') then
    raise exception 'INVALID_CUSTOMER_OR_PAYMENT' using errcode = '22023';
  end if;

  select * into t from public.bus_trips where id = p_trip_id for update;
  if not found or t.status <> 'published' or t.departure_at <= now() then
    raise exception 'TRIP_UNAVAILABLE' using errcode = '22023';
  end if;
  if t.bus_id is null or not exists(select 1 from public.buses where id = t.bus_id and status = 'active') then
    raise exception 'BUS_UNAVAILABLE' using errcode = '22023';
  end if;
  if (select count(*) from public.bus_seats where id = any(p_seat_ids) and bus_id = t.bus_id and seat_type <> 'unavailable') <> array_length(p_seat_ids, 1) then
    raise exception 'SEAT_NOT_IN_TRIP' using errcode = '22023';
  end if;

  update public.bus_booking_seats as booking_seat
  set status = 'released'
  where booking_seat.trip_id = t.id
    and booking_seat.status = 'held'
    and booking_seat.hold_expires_at <= now();

  if exists(
    select 1 from public.bus_booking_seats
    where trip_id = t.id and seat_id = any(p_seat_ids) and status in ('confirmed', 'boarded', 'held')
  ) then
    raise exception 'SEAT_UNAVAILABLE' using errcode = '23505';
  end if;

  exp := now() + interval '10 minutes';
  insert into public.bus_bookings(
    trip_id, customer_id, customer_name, customer_phone, customer_email,
    passenger_count, total_amount, payment_method, payment_status, hold_expires_at
  ) values (
    t.id, auth.uid(), trim(p_customer_name), trim(p_customer_phone), nullif(trim(p_customer_email), ''),
    array_length(p_seat_ids, 1), t.price * array_length(p_seat_ids, 1), p_payment_method,
    case when p_payment_method = 'cash_on_boarding' then 'cash_due' else 'awaiting_receipt' end, exp
  ) returning * into b;

  insert into public.bus_booking_seats(booking_id, trip_id, seat_id, seat_label, passenger_name, status, hold_expires_at)
  select b.id, t.id, s.id, s.seat_label, trim(p_passenger_names[x.ordinality]),
    case when p_payment_method = 'cash_on_boarding' then 'confirmed' else 'held' end, exp
  from unnest(p_seat_ids) with ordinality x(seat_id, ordinality)
  join public.bus_seats s on s.id = x.seat_id and s.bus_id = t.bus_id;

  insert into public.bus_audit_log(actor_id, action, entity_type, entity_id, booking_id, trip_id, after_data)
  values(auth.uid(), 'booking_created', 'booking', b.booking_code, b.id, t.id,
    jsonb_build_object('seats', p_seat_ids, 'amount', b.total_amount, 'payment_method', p_payment_method));

  return query select b.id, b.booking_code, b.total_amount, b.hold_expires_at;
end;
$$;

revoke all on function public.create_bus_booking(uuid, uuid[], text, text, text, text[], text) from public;
grant execute on function public.create_bus_booking(uuid, uuid[], text, text, text, text[], text) to authenticated;
