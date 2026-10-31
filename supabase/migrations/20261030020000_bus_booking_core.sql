-- Transactional bus booking core. Customer and payment data is never exposed
-- through the public trip catalogue.
create table if not exists public.buses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bus_number text not null unique,
  plate_number text unique,
  bus_type text not null,
  manufacturer text,
  model text,
  manufacture_year integer check (manufacture_year between 1950 and 2100),
  image_url text,
  description text,
  services text[] not null default '{}',
  status text not null default 'active' check (status in ('active','maintenance','stopped','inactive')),
  admin_notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bus_seats (
  id uuid primary key default gen_random_uuid(),
  bus_id uuid not null references public.buses(id) on delete restrict,
  seat_label text not null,
  row_number integer not null check (row_number > 0),
  position integer not null check (position > 0),
  seat_type text not null default 'standard' check (seat_type in ('standard','accessible','premium','unavailable')),
  unique (bus_id, seat_label), unique (bus_id, row_number, position)
);

alter table public.bus_trips add column if not exists bus_id uuid references public.buses(id) on delete restrict;
alter table public.bus_trips add column if not exists trip_code text unique;
alter table public.bus_trips add column if not exists origin_station text;
alter table public.bus_trips add column if not exists destination_station text;
alter table public.bus_trips add column if not exists bus_type text;
alter table public.bus_trips add column if not exists instructions text;

create table if not exists public.bus_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
  trip_id uuid not null references public.bus_trips(id) on delete restrict,
  customer_id uuid not null references auth.users(id) on delete restrict,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  passenger_count integer not null check (passenger_count between 1 and 8),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  payment_method text not null check (payment_method in ('bank_transfer','cash_on_boarding')),
  payment_status text not null default 'awaiting_receipt' check (payment_status in ('awaiting_receipt','receipt_submitted','under_review','paid','cash_due','partially_refunded','refunded','rejected')),
  status text not null default 'pending' check (status in ('pending','confirmed','rejected','cancelled','completed')),
  hold_expires_at timestamptz not null,
  cancellation_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bus_booking_seats (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bus_bookings(id) on delete restrict,
  trip_id uuid not null references public.bus_trips(id) on delete restrict,
  seat_id uuid not null references public.bus_seats(id) on delete restrict,
  seat_label text not null,
  passenger_name text not null,
  status text not null default 'held' check (status in ('held','confirmed','boarded','released')),
  hold_expires_at timestamptz not null,
  unique (trip_id, seat_id, booking_id)
);
create unique index if not exists bus_booking_seats_active_unique
  on public.bus_booking_seats(trip_id,seat_id) where status in ('held','confirmed','boarded');
create index if not exists bus_bookings_customer_idx on public.bus_bookings(customer_id,created_at desc);
create index if not exists bus_bookings_trip_idx on public.bus_bookings(trip_id,status,payment_status);

create table if not exists public.bus_payment_receipts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bus_bookings(id) on delete restrict,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),
  file_size bigint not null check (file_size between 1 and 8388608),
  transfer_reference text,
  transferred_at timestamptz,
  review_status text not null default 'pending' check (review_status in ('pending','accepted','rejected','replacement_requested')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.bus_tickets (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bus_bookings(id) on delete restrict,
  passenger_name text not null,
  seat_id uuid not null references public.bus_seats(id) on delete restrict,
  seat_label text not null,
  qr_secret_hash bytea not null unique,
  status text not null default 'valid' check (status in ('valid','cancelled','refunded','boarded')),
  issued_at timestamptz not null default now(),
  boarded_at timestamptz,
  boarded_by uuid references auth.users(id) on delete set null,
  unique (booking_id,seat_id)
);

create table if not exists public.bus_cash_collections (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bus_bookings(id) on delete restrict,
  ticket_id uuid references public.bus_tickets(id) on delete restrict,
  collected_by uuid not null references auth.users(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  reference_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,14)),
  collected_at timestamptz not null default now(),
  notes text
);
create unique index if not exists bus_cash_collection_ticket_once on public.bus_cash_collections(ticket_id) where ticket_id is not null;

create table if not exists public.bus_operating_expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.bus_trips(id) on delete restrict,
  category text not null check (category in ('fuel','maintenance','tolls','wages','road','other')),
  amount numeric(12,2) not null check (amount > 0),
  description text not null,
  incurred_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.bus_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  booking_id uuid references public.bus_bookings(id) on delete set null,
  trip_id uuid references public.bus_trips(id) on delete set null,
  before_data jsonb,
  after_data jsonb,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.buses enable row level security;
alter table public.bus_seats enable row level security;
alter table public.bus_bookings enable row level security;
alter table public.bus_booking_seats enable row level security;
alter table public.bus_payment_receipts enable row level security;
alter table public.bus_tickets enable row level security;
alter table public.bus_cash_collections enable row level security;
alter table public.bus_operating_expenses enable row level security;
alter table public.bus_audit_log enable row level security;

create policy buses_staff_read on public.buses for select to authenticated using (public.has_section_permission('bus.fleet.view') or public.has_section_permission('bus.fleet.manage') or public.has_section_permission('bus.trips.manage'));
create policy buses_staff_manage on public.buses for all to authenticated using (public.has_section_permission('bus.fleet.manage')) with check (public.has_section_permission('bus.fleet.manage'));
create policy bus_seats_staff_read on public.bus_seats for select to authenticated using (public.has_section_permission('bus.fleet.view') or public.has_section_permission('bus.fleet.manage') or public.has_section_permission('bus.trips.manage'));
create policy bus_seats_staff_manage on public.bus_seats for all to authenticated using (public.has_section_permission('bus.fleet.manage')) with check (public.has_section_permission('bus.fleet.manage'));
create policy bus_bookings_owner_read on public.bus_bookings for select to authenticated using (customer_id=auth.uid() or public.has_section_permission('bus.bookings.view'));
create policy bus_bookings_staff_update on public.bus_bookings for update to authenticated using (public.has_section_permission('bus.bookings.manage')) with check (public.has_section_permission('bus.bookings.manage'));
create policy bus_booking_seats_owner_read on public.bus_booking_seats for select to authenticated using (exists(select 1 from public.bus_bookings b where b.id=booking_id and b.customer_id=auth.uid()) or public.has_section_permission('bus.bookings.view'));
create policy bus_receipts_owner_read on public.bus_payment_receipts for select to authenticated using (exists(select 1 from public.bus_bookings b where b.id=booking_id and b.customer_id=auth.uid()) or public.has_section_permission('bus.receipts.review'));
create policy bus_receipts_review_update on public.bus_payment_receipts for update to authenticated using (public.has_section_permission('bus.receipts.review')) with check (public.has_section_permission('bus.receipts.review'));
create policy bus_tickets_owner_read on public.bus_tickets for select to authenticated using (exists(select 1 from public.bus_bookings b where b.id=booking_id and b.customer_id=auth.uid()) or public.has_section_permission('bus.bookings.view'));
create policy bus_cash_read on public.bus_cash_collections for select to authenticated using (public.has_section_permission('bus.finance.view'));
create policy bus_expenses_read on public.bus_operating_expenses for select to authenticated using (public.has_section_permission('bus.finance.view') or public.has_section_permission('bus.expenses.manage'));
create policy bus_expenses_insert on public.bus_operating_expenses for insert to authenticated with check (public.has_section_permission('bus.expenses.manage') and created_by=auth.uid());
create policy bus_audit_read on public.bus_audit_log for select to authenticated using (public.has_section_permission('bus.audit.view'));
create policy bus_audit_no_client_mutation on public.bus_audit_log for all to authenticated using (false) with check (false);

grant select on public.bus_trips to anon, authenticated;
grant select, insert, update on public.buses, public.bus_seats, public.bus_trips to authenticated;
grant select on public.bus_bookings, public.bus_booking_seats, public.bus_payment_receipts, public.bus_tickets, public.bus_cash_collections, public.bus_operating_expenses, public.bus_audit_log to authenticated;
grant insert on public.bus_operating_expenses to authenticated;

-- Do not expose ticket QR credentials or finance rows through direct table reads.
revoke all on public.bus_tickets from anon, authenticated;
grant select (id, booking_id, passenger_name, seat_id, seat_label, status, issued_at, boarded_at, boarded_by)
  on public.bus_tickets to authenticated;
revoke all on public.bus_cash_collections, public.bus_operating_expenses from anon, authenticated;
grant select on public.bus_cash_collections, public.bus_operating_expenses to authenticated;

create or replace function public.get_public_trip_seats(p_trip_id uuid)
returns table(seat_id uuid, seat_label text, seat_type text, is_available boolean)
language sql stable security definer set search_path=public as $$
  select s.id,s.seat_label,s.seat_type,
    not exists(select 1 from public.bus_booking_seats bs where bs.trip_id=p_trip_id and bs.seat_id=s.id and (bs.status in ('confirmed','boarded') or (bs.status='held' and bs.hold_expires_at>now()))) as is_available
  from public.bus_trips t join public.bus_seats s on s.bus_id=t.bus_id
  where t.id=p_trip_id and t.status='published' and t.departure_at>now() and s.seat_type<>'unavailable'
  order by s.row_number,s.position;
$$;
revoke all on function public.get_public_trip_seats(uuid) from public;
grant execute on function public.get_public_trip_seats(uuid) to anon, authenticated;

create or replace function public.create_bus_with_seats(
  p_name text,p_bus_number text,p_plate_number text,p_bus_type text,p_manufacturer text,p_model text,p_capacity integer,p_services text[],p_image_url text
) returns uuid language plpgsql security definer set search_path=public as $$
declare bus_id uuid; i integer; row_no integer; pos integer;
begin
  if not public.has_section_permission('bus.fleet.manage') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
  if length(trim(p_name)) not between 1 and 120 or length(trim(p_bus_number)) not between 1 and 40 or length(trim(p_bus_type)) not between 1 and 60 or p_capacity not between 4 and 100 then raise exception 'INVALID_BUS' using errcode='22023'; end if;
  if coalesce(cardinality(p_services),0)>15 then raise exception 'TOO_MANY_BUS_SERVICES' using errcode='22023'; end if;
  insert into public.buses(name,bus_number,plate_number,bus_type,manufacturer,model,services,image_url,created_by)
  values(trim(p_name),trim(p_bus_number),nullif(trim(p_plate_number),''),trim(p_bus_type),nullif(trim(p_manufacturer),''),nullif(trim(p_model),''),coalesce(p_services,'{}'),nullif(trim(p_image_url),''),auth.uid()) returning id into bus_id;
  for i in 1..p_capacity loop
    row_no:=((i-1)/4)+1; pos:=((i-1)%4)+1;
    insert into public.bus_seats(bus_id,seat_label,row_number,position) values(bus_id,row_no::text||chr(64+pos),row_no,pos);
  end loop;
  insert into public.bus_audit_log(actor_id,action,entity_type,entity_id,after_data)
  values(auth.uid(),'bus_created','bus',bus_id::text,jsonb_build_object('name',trim(p_name),'bus_number',trim(p_bus_number),'capacity',p_capacity));
  return bus_id;
end $$;
revoke all on function public.create_bus_with_seats(text,text,text,text,text,text,integer,text[],text) from public;
grant execute on function public.create_bus_with_seats(text,text,text,text,text,text,integer,text[],text) to authenticated;

create or replace function public.validate_bus_trip_publish() returns trigger language plpgsql set search_path=public as $$
begin
  if new.status='published' then
    if new.bus_id is null or not exists(select 1 from public.buses b where b.id=new.bus_id and b.status='active') then raise exception 'ACTIVE_BUS_REQUIRED' using errcode='22023'; end if;
    if not exists(select 1 from public.bus_seats s where s.bus_id=new.bus_id and s.seat_type<>'unavailable') then raise exception 'VALID_SEAT_LAYOUT_REQUIRED' using errcode='22023'; end if;
    if new.price<0 or new.departure_at<=now() or length(trim(new.origin))<2 or length(trim(new.destination))<2 or new.origin=new.destination then raise exception 'INVALID_TRIP' using errcode='22023'; end if;
  end if;
  new.updated_at:=now();
  return new;
end $$;
drop trigger if exists validate_bus_trip_publish on public.bus_trips;
create trigger validate_bus_trip_publish before insert or update on public.bus_trips for each row execute function public.validate_bus_trip_publish();

create or replace function public.create_bus_booking(
  p_trip_id uuid,p_seat_ids uuid[],p_customer_name text,p_customer_phone text,p_customer_email text,
  p_passenger_names text[],p_payment_method text
) returns table(booking_id uuid,booking_code text,total_amount numeric,hold_expires_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare t public.bus_trips; seat_count integer; exp timestamptz; b public.bus_bookings;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if coalesce(array_length(p_seat_ids,1),0)<1 or array_length(p_seat_ids,1)>8 or cardinality(p_seat_ids)<>(select count(distinct x) from unnest(p_seat_ids) x) then raise exception 'INVALID_SEATS' using errcode='22023'; end if;
  if array_length(p_passenger_names,1)<>array_length(p_seat_ids,1) or exists(select 1 from unnest(p_passenger_names) n where length(trim(n))<2 or length(n)>120) then raise exception 'INVALID_PASSENGERS' using errcode='22023'; end if;
  if length(trim(coalesce(p_customer_name,'')))<2 or length(trim(coalesce(p_customer_phone,'')))<7 or p_payment_method not in ('bank_transfer','cash_on_boarding') then raise exception 'INVALID_CUSTOMER_OR_PAYMENT' using errcode='22023'; end if;
  select * into t from public.bus_trips where id=p_trip_id for update;
  if not found or t.status<>'published' or t.departure_at<=now() then raise exception 'TRIP_UNAVAILABLE' using errcode='22023'; end if;
  if t.bus_id is null or not exists(select 1 from public.buses where id=t.bus_id and status='active') then raise exception 'BUS_UNAVAILABLE' using errcode='22023'; end if;
  if (select count(*) from public.bus_seats where id=any(p_seat_ids) and bus_id=t.bus_id and seat_type<>'unavailable')<>array_length(p_seat_ids,1) then raise exception 'SEAT_NOT_IN_TRIP' using errcode='22023'; end if;
  update public.bus_booking_seats set status='released' where trip_id=t.id and status='held' and hold_expires_at<=now();
  if exists(select 1 from public.bus_booking_seats where trip_id=t.id and seat_id=any(p_seat_ids) and status in ('confirmed','boarded','held')) then raise exception 'SEAT_UNAVAILABLE' using errcode='23505'; end if;
  exp:=now()+interval '10 minutes';
  insert into public.bus_bookings(trip_id,customer_id,customer_name,customer_phone,customer_email,passenger_count,total_amount,payment_method,payment_status,hold_expires_at)
  values(t.id,auth.uid(),trim(p_customer_name),trim(p_customer_phone),nullif(trim(p_customer_email),''),array_length(p_seat_ids,1),t.price*array_length(p_seat_ids,1),p_payment_method,case when p_payment_method='cash_on_boarding' then 'cash_due' else 'awaiting_receipt' end,exp) returning * into b;
  insert into public.bus_booking_seats(booking_id,trip_id,seat_id,seat_label,passenger_name,status,hold_expires_at)
  select b.id,t.id,s.id,s.seat_label,trim(p_passenger_names[x.ordinality]),case when p_payment_method='cash_on_boarding' then 'confirmed' else 'held' end,exp
  from unnest(p_seat_ids) with ordinality x(seat_id,ordinality) join public.bus_seats s on s.id=x.seat_id and s.bus_id=t.bus_id;
  insert into public.bus_audit_log(actor_id,action,entity_type,entity_id,booking_id,trip_id,after_data)
  values(auth.uid(),'booking_created','booking',b.booking_code,b.id,t.id,jsonb_build_object('seats',p_seat_ids,'amount',b.total_amount,'payment_method',p_payment_method));
  return query select b.id,b.booking_code,b.total_amount,b.hold_expires_at;
end $$;
revoke all on function public.create_bus_booking(uuid,uuid[],text,text,text,text[],text) from public;
grant execute on function public.create_bus_booking(uuid,uuid[],text,text,text,text[],text) to authenticated;

create or replace function public.release_bus_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare b public.bus_bookings;
begin
  if not public.has_section_permission('bus.bookings.manage') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
  select * into b from public.bus_bookings where id=p_booking_id for update;
  if not found or b.status<>'pending' then raise exception 'ONLY_PENDING_BOOKINGS_CAN_BE_RELEASED' using errcode='22023'; end if;
  update public.bus_bookings set status='cancelled',updated_at=now() where id=b.id;
  update public.bus_booking_seats set status='released' where booking_id=b.id and status in ('held','confirmed');
  update public.bus_tickets set status='cancelled' where booking_id=b.id and status='valid';
  insert into public.bus_audit_log(actor_id,action,entity_type,entity_id,booking_id,trip_id)
  values(auth.uid(),'booking_released','booking',b.booking_code,b.id,b.trip_id);
end $$;
revoke all on function public.release_bus_booking(uuid) from public;
grant execute on function public.release_bus_booking(uuid) to authenticated;

create or replace function public.confirm_bus_transfer(p_receipt_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare r public.bus_payment_receipts; b public.bus_bookings;
begin
  if not public.has_section_permission('bus.receipts.review') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
  select * into r from public.bus_payment_receipts where id=p_receipt_id for update;
  if not found or r.review_status not in ('pending','replacement_requested') then raise exception 'RECEIPT_NOT_PENDING' using errcode='22023'; end if;
  select * into b from public.bus_bookings where id=r.booking_id for update;
  if b.status not in ('pending','confirmed') or b.payment_method<>'bank_transfer' or (b.status='pending' and b.hold_expires_at<=now()) then raise exception 'BOOKING_NOT_REVIEWABLE' using errcode='22023'; end if;
  update public.bus_payment_receipts set review_status='accepted',reviewed_by=auth.uid(),reviewed_at=now() where id=r.id;
  update public.bus_bookings set payment_status='paid',updated_at=now() where id=b.id;
  insert into public.bus_audit_log(actor_id,action,entity_type,entity_id,booking_id,trip_id,after_data)
  values(auth.uid(),'transfer_confirmed','payment_receipt',r.id::text,b.id,b.trip_id,jsonb_build_object('storage_path',r.storage_path));
end $$;
revoke all on function public.confirm_bus_transfer(uuid) from public;
grant execute on function public.confirm_bus_transfer(uuid) to authenticated;

create or replace function public.collect_bus_cash(p_booking_id uuid,p_amount numeric)
returns text language plpgsql security definer set search_path=public as $$
declare b public.bus_bookings; ref text;
begin
  if not public.has_section_permission('bus.cash.collect') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
  select * into b from public.bus_bookings where id=p_booking_id for update;
  if not found or b.status<>'confirmed' or b.payment_method<>'cash_on_boarding' or b.payment_status<>'cash_due' then raise exception 'CASH_NOT_DUE' using errcode='22023'; end if;
  if p_amount<>b.total_amount then raise exception 'COLLECTION_AMOUNT_MISMATCH' using errcode='22023'; end if;
  insert into public.bus_cash_collections(booking_id,collected_by,amount) values(b.id,auth.uid(),p_amount) returning reference_code into ref;
  update public.bus_bookings set payment_status='paid',updated_at=now() where id=b.id;

  insert into public.bus_audit_log(actor_id,action,entity_type,entity_id,booking_id,trip_id,after_data)
  values(auth.uid(),'cash_collected','cash_collection',ref,b.id,b.trip_id,jsonb_build_object('amount',p_amount));
  return ref;
end $$;
revoke all on function public.collect_bus_cash(uuid,numeric) from public;
grant execute on function public.collect_bus_cash(uuid,numeric) to authenticated;

alter table public.bus_tickets add column if not exists qr_token text unique;
alter table public.bus_tickets alter column qr_secret_hash drop not null;

create or replace function public.issue_bus_tickets(p_booking_id uuid)
returns table(ticket_id uuid,passenger_name text,seat_label text,qr_token text,ticket_status text) language plpgsql security definer set search_path=public as $$
declare b public.bus_bookings; bs record; raw_token text;
begin
  select * into b from public.bus_bookings where id=p_booking_id and customer_id=auth.uid();
  if not found and not public.has_section_permission('bus.tickets.issue') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
  if not found then select * into b from public.bus_bookings where id=p_booking_id; end if;
  if not found or b.status<>'confirmed' or (b.payment_method='bank_transfer' and b.payment_status<>'paid') then raise exception 'BOOKING_NOT_TICKET_ELIGIBLE' using errcode='22023'; end if;
  for bs in select s.id,s.passenger_name,s.seat_id,s.seat_label,s.status from public.bus_booking_seats s where s.booking_id=b.id and s.status in ('confirmed','boarded') order by s.seat_label loop
    select tk.id,tk.passenger_name,tk.seat_label,tk.status,tk.qr_token into ticket_id,passenger_name,seat_label,ticket_status,raw_token from public.bus_tickets tk where tk.booking_id=b.id and tk.seat_id=bs.seat_id;
    if ticket_id is not null then
      return query select ticket_id,passenger_name,seat_label,raw_token,ticket_status;
      continue;
    end if;
    raw_token:=encode(gen_random_bytes(32),'hex');
    insert into public.bus_tickets(booking_id,passenger_name,seat_id,seat_label,qr_secret_hash,qr_token)
    values(b.id,bs.passenger_name,bs.seat_id,bs.seat_label,digest(raw_token,'sha256'),raw_token)
    on conflict (booking_id,seat_id) do nothing;
    select tk.id,tk.passenger_name,tk.seat_label,tk.status into ticket_id,passenger_name,seat_label,ticket_status from public.bus_tickets tk where tk.booking_id=b.id and tk.seat_id=bs.seat_id;
    return query select ticket_id,passenger_name,seat_label,raw_token,ticket_status;
  end loop;
end $$;
revoke all on function public.issue_bus_tickets(uuid) from public;
grant execute on function public.issue_bus_tickets(uuid) to authenticated;

create or replace function public.get_bus_customer_tickets(p_booking_id uuid)
returns table(ticket_id uuid,passenger_name text,seat_label text,ticket_status text,qr_token text)
language plpgsql security definer set search_path=public as $$
declare b public.bus_bookings; result_row record;
begin
  select * into b from public.bus_bookings where id=p_booking_id and customer_id=auth.uid();
  if not found then raise exception 'BOOKING_NOT_FOUND' using errcode='42501'; end if;
  if b.status<>'confirmed' or b.payment_status<>'paid' then return; end if;
  for result_row in select * from public.issue_bus_tickets(p_booking_id) loop
    return query select result_row.ticket_id,result_row.passenger_name,result_row.seat_label,result_row.ticket_status,result_row.qr_token;
  end loop;
end $$;
revoke all on function public.get_bus_customer_tickets(uuid) from public;
grant execute on function public.get_bus_customer_tickets(uuid) to authenticated;

create or replace function public.confirm_bus_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare b public.bus_bookings;
begin
  if not public.has_section_permission('bus.bookings.manage') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
  select * into b from public.bus_bookings where id=p_booking_id for update;
  if not found or b.status<>'pending' then raise exception 'BOOKING_NOT_PENDING' using errcode='22023'; end if;
  if b.payment_method='bank_transfer' and b.payment_status<>'paid' then raise exception 'PAYMENT_NOT_CONFIRMED' using errcode='22023'; end if;
  if b.payment_method='cash_on_boarding' and b.payment_status<>'cash_due' then raise exception 'CASH_STATE_INVALID' using errcode='22023'; end if;
  if b.hold_expires_at<=now() then raise exception 'SEAT_HOLD_EXPIRED' using errcode='22023'; end if;
  update public.bus_bookings set status='confirmed',hold_expires_at='infinity',updated_at=now() where id=b.id;
  update public.bus_booking_seats set status='confirmed' where booking_id=b.id and status='held';
  insert into public.bus_audit_log(actor_id,action,entity_type,entity_id,booking_id,trip_id,after_data)
  values(auth.uid(),'booking_confirmed','booking',b.booking_code,b.id,b.trip_id,jsonb_build_object('payment_status',b.payment_status));
end $$;

create or replace function public.scan_and_board_bus_ticket(p_qr_token text)
returns table(result text,ticket_id uuid,booking_code text,passenger_name text,seat_label text,trip_origin text,trip_destination text,departure_at timestamptz,payment_status text,boarded_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare tk public.bus_tickets; bk public.bus_bookings; tr public.bus_trips;
begin
  if not public.has_section_permission('bus.qr.scan') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
  select * into tk from public.bus_tickets where qr_secret_hash=digest(p_qr_token,'sha256') for update;
  if not found then return query select 'invalid',null::uuid,null::text,null::text,null::text,null::text,null::text,null::timestamptz,null::text,null::timestamptz; return; end if;
  select * into bk from public.bus_bookings where id=tk.booking_id;
  select * into tr from public.bus_trips where id=bk.trip_id;
  if tk.status='boarded' then return query select 'already_boarded',tk.id,bk.booking_code,tk.passenger_name,tk.seat_label,tr.origin,tr.destination,tr.departure_at,bk.payment_status,tk.boarded_at; return; end if;
  if tk.status<>'valid' or bk.status<>'confirmed' then return query select 'invalid',tk.id,bk.booking_code,tk.passenger_name,tk.seat_label,tr.origin,tr.destination,tr.departure_at,bk.payment_status,tk.boarded_at; return; end if;
  if bk.payment_status<>'paid' then return query select 'payment_due',tk.id,bk.booking_code,tk.passenger_name,tk.seat_label,tr.origin,tr.destination,tr.departure_at,bk.payment_status,null::timestamptz; return; end if;
  update public.bus_tickets set status='boarded',boarded_at=now(),boarded_by=auth.uid() where id=tk.id;
  update public.bus_booking_seats set status='boarded' where booking_id=bk.id and seat_id=tk.seat_id and status='confirmed';
  insert into public.bus_audit_log(actor_id,action,entity_type,entity_id,booking_id,trip_id)
  values(auth.uid(),'passenger_boarded','ticket',tk.id::text,bk.id,bk.trip_id);
  return query select 'valid',tk.id,bk.booking_code,tk.passenger_name,tk.seat_label,tr.origin,tr.destination,tr.departure_at,bk.payment_status,now();
end $$;
revoke all on function public.scan_and_board_bus_ticket(text) from public;
grant execute on function public.scan_and_board_bus_ticket(text) to authenticated;

create or replace function public.upload_bus_payment_receipt(p_booking_id uuid,p_storage_path text,p_mime_type text,p_file_size bigint,p_reference text default null,p_transferred_at timestamptz default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare b public.bus_bookings; receipt_id uuid;
begin
  select * into b from public.bus_bookings where id=p_booking_id and customer_id=auth.uid() for update;
  if not found or b.status<>'pending' or b.payment_method<>'bank_transfer' then raise exception 'BOOKING_NOT_RECEIPT_ELIGIBLE' using errcode='42501'; end if;
  if p_storage_path !~ ('^'||auth.uid()::text||'/'||p_booking_id::text||'/[^/]+$') or p_file_size not between 1 and 8388608 or p_mime_type not in ('image/jpeg','image/png','image/webp','application/pdf') then raise exception 'INVALID_RECEIPT' using errcode='22023'; end if;
  insert into public.bus_payment_receipts(booking_id,storage_path,mime_type,file_size,transfer_reference,transferred_at)
  values(b.id,p_storage_path,p_mime_type,p_file_size,nullif(trim(p_reference),''),p_transferred_at) returning id into receipt_id;
  update public.bus_bookings set payment_status='receipt_submitted',updated_at=now() where id=b.id;
  return receipt_id;
end $$;
revoke all on function public.upload_bus_payment_receipt(uuid,text,text,bigint,text,timestamptz) from public;
grant execute on function public.upload_bus_payment_receipt(uuid,text,text,bigint,text,timestamptz) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('bus-payment-receipts','bus-payment-receipts',false,8388608,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public=false,file_size_limit=8388608,allowed_mime_types=excluded.allowed_mime_types;
create policy bus_receipts_storage_customer_insert on storage.objects for insert to authenticated
with check (bucket_id='bus-payment-receipts' and (storage.foldername(name))[1]=auth.uid()::text);
create policy bus_receipts_storage_private_read on storage.objects for select to authenticated
using (bucket_id='bus-payment-receipts' and ((storage.foldername(name))[1]=auth.uid()::text or public.has_section_permission('bus.receipts.review')));

create policy bus_receipts_storage_customer_delete on storage.objects for delete to authenticated
using (bucket_id='bus-payment-receipts' and (storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.bus_payment_receipts r where r.storage_path=name));

create or replace function public.reject_bus_receipt(p_receipt_id uuid,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare r public.bus_payment_receipts; b public.bus_bookings;
begin
  if not public.has_section_permission('bus.receipts.review') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
  select * into r from public.bus_payment_receipts where id=p_receipt_id for update;
  if not found or r.review_status<>'pending' then raise exception 'RECEIPT_NOT_PENDING' using errcode='22023'; end if;
  select * into b from public.bus_bookings where id=r.booking_id for update;
  if b.status not in ('pending','confirmed') or b.payment_method<>'bank_transfer' then raise exception 'BOOKING_NOT_REVIEWABLE' using errcode='22023'; end if;
  if b.hold_expires_at<=now() and b.status='pending' then
    update public.bus_bookings set status='cancelled',payment_status='rejected',updated_at=now() where id=b.id;
    update public.bus_booking_seats set status='released' where booking_id=b.id and status='held';
  elsif b.status='confirmed' then
    update public.bus_payment_receipts set review_status='replacement_requested',reviewed_by=auth.uid(),reviewed_at=now() where id=r.id;
  else
    update public.bus_payment_receipts set review_status='replacement_requested',reviewed_by=auth.uid(),reviewed_at=now() where id=r.id;
    update public.bus_bookings set payment_status='rejected',updated_at=now() where id=b.id;
  end if;
  insert into public.bus_audit_log(actor_id,action,entity_type,entity_id,booking_id,trip_id,reason)
  values(auth.uid(),'transfer_rejected','payment_receipt',r.id::text,b.id,b.trip_id,nullif(trim(p_reason),''));
end $$;
revoke all on function public.reject_bus_receipt(uuid,text) from public;
grant execute on function public.reject_bus_receipt(uuid,text) to authenticated;

comment on table public.bus_bookings is 'Private bus bookings. Seats are atomically held by create_bus_booking.';
comment on table public.bus_payment_receipts is 'Private transfer proofs; upload is not payment confirmation.';
comment on table public.bus_audit_log is 'Append-only audit records for bus operations.';
