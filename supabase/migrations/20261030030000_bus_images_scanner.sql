alter table public.buses add column if not exists image_path text;
alter table public.bus_trips add column if not exists bus_image_path text;
alter table public.bus_tickets add column if not exists bus_name text;
alter table public.bus_tickets add column if not exists boarding_trip_id uuid references public.bus_trips(id);
update public.bus_tickets tk set bus_name=bt.bus_name from public.bus_bookings bk join public.bus_trips bt on bt.id=bk.trip_id where tk.booking_id=bk.id and tk.bus_name is null;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('bus-images','bus-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists bus_images_public_read on storage.objects;
create policy bus_images_public_read on storage.objects for select to anon,authenticated using (bucket_id='bus-images');
drop policy if exists bus_images_manager_insert on storage.objects;
create policy bus_images_manager_insert on storage.objects for insert to authenticated with check (bucket_id='bus-images' and public.has_section_permission('bus.fleet.manage') and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists bus_images_manager_update on storage.objects;
create policy bus_images_manager_update on storage.objects for update to authenticated using (bucket_id='bus-images' and public.has_section_permission('bus.fleet.manage')) with check (bucket_id='bus-images' and public.has_section_permission('bus.fleet.manage'));
drop policy if exists bus_images_manager_delete on storage.objects;
create policy bus_images_manager_delete on storage.objects for delete to authenticated using (bucket_id='bus-images' and public.has_section_permission('bus.fleet.manage'));

drop function if exists public.create_bus_with_seats(text,text,text,text,text,text,integer,text[],text);
create function public.create_bus_with_seats(
 p_name text,p_bus_number text,p_plate_number text,p_bus_type text,p_manufacturer text,p_model text,p_capacity integer,p_services text[],p_image_path text
) returns uuid language plpgsql security definer set search_path=public as $$
declare bus_id uuid; i integer; row_no integer; pos integer;
begin
 if not public.has_section_permission('bus.fleet.manage') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
 if length(trim(p_name)) not between 1 and 120 or length(trim(p_bus_number)) not between 1 and 40 or length(trim(p_bus_type)) not between 1 and 60 or p_capacity not between 4 and 100 then raise exception 'INVALID_BUS' using errcode='22023'; end if;
 if coalesce(cardinality(p_services),0)>15 then raise exception 'TOO_MANY_BUS_SERVICES' using errcode='22023'; end if;
 if p_image_path is not null and p_image_path !~ ('^'||auth.uid()::text||'/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$') then raise exception 'INVALID_BUS_IMAGE_PATH' using errcode='22023'; end if;
 insert into public.buses(name,bus_number,plate_number,bus_type,manufacturer,model,services,image_path,created_by)
 values(trim(p_name),trim(p_bus_number),nullif(trim(p_plate_number),''),trim(p_bus_type),nullif(trim(p_manufacturer),''),nullif(trim(p_model),''),coalesce(p_services,'{}'),p_image_path,auth.uid()) returning id into bus_id;
 for i in 1..p_capacity loop row_no:=((i-1)/4)+1; pos:=((i-1)%4)+1; insert into public.bus_seats(bus_id,seat_label,row_number,position) values(bus_id,row_no::text||chr(64+pos),row_no,pos); end loop;
 insert into public.bus_audit_log(actor_id,action,entity_type,entity_id,after_data) values(auth.uid(),'bus_created','bus',bus_id::text,jsonb_build_object('name',trim(p_name),'bus_number',trim(p_bus_number),'capacity',p_capacity,'image_path',p_image_path));
 return bus_id;
end $$;
revoke all on function public.create_bus_with_seats(text,text,text,text,text,text,integer,text[],text) from public;
grant execute on function public.create_bus_with_seats(text,text,text,text,text,text,integer,text[],text) to authenticated;

create or replace function public.update_bus_image(p_bus_id uuid,p_image_path text)
returns void language plpgsql security definer set search_path=public as $$
declare old_path text;
begin
 if not public.has_section_permission('bus.fleet.manage') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
 if p_image_path is not null and p_image_path !~ ('^'||auth.uid()::text||'/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$') then raise exception 'INVALID_BUS_IMAGE_PATH' using errcode='22023'; end if;
 select image_path into old_path from public.buses where id=p_bus_id for update;
 if not found then raise exception 'BUS_NOT_FOUND' using errcode='22023'; end if;
 update public.buses set image_path=p_image_path,updated_at=now() where id=p_bus_id;
 update public.bus_trips set bus_image_path=p_image_path,updated_at=now() where bus_id=p_bus_id;
 insert into public.bus_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data) values(auth.uid(),'bus_image_updated','bus',p_bus_id::text,jsonb_build_object('image_path',old_path),jsonb_build_object('image_path',p_image_path));
end $$;
revoke all on function public.update_bus_image(uuid,text) from public;
grant execute on function public.update_bus_image(uuid,text) to authenticated;

drop function if exists public.scan_and_board_bus_ticket(text,uuid);
drop function if exists public.scan_and_board_bus_ticket(text);
create or replace function public.scan_and_board_bus_ticket(p_qr_token text,p_expected_trip_id uuid,p_ticket_id uuid default null)
returns table(result text,ticket_id uuid,booking_code text,passenger_name text,seat_label text,trip_origin text,trip_destination text,departure_at timestamptz,payment_status text,boarded_at timestamptz,bus_name text,boarded_by_name text)
language plpgsql security definer set search_path=public as $$
declare tk public.bus_tickets; bk public.bus_bookings; tr public.bus_trips; bus_record public.buses; scanner_name text;
begin
 if not public.has_section_permission('bus.qr.scan') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
 if p_ticket_id is not null then select * into tk from public.bus_tickets where id=p_ticket_id for update;
 else select * into tk from public.bus_tickets where qr_secret_hash=digest(p_qr_token,'sha256') for update; end if;
 if not found then
  insert into public.bus_audit_log(actor_id,action,entity_type,after_data,reason) values(auth.uid(),'ticket_scan_rejected','ticket_scan',jsonb_build_object('expected_trip_id',p_expected_trip_id),'ticket_not_found');
  return query select 'invalid',null::uuid,null::text,null::text,null::text,null::text,null::text,null::timestamptz,null::text,null::timestamptz,null::text,null::text; return;
 end if;
 select * into bk from public.bus_bookings where id=tk.booking_id; select * into tr from public.bus_trips where id=bk.trip_id; select * into bus_record from public.buses where id=tr.bus_id; select full_name into scanner_name from public.profiles where id=auth.uid();
 if p_expected_trip_id is not null and p_expected_trip_id<>bk.trip_id then
  insert into public.bus_audit_log(actor_id,action,entity_type,entity_id,booking_id,trip_id,reason) values(auth.uid(),'ticket_scan_rejected','ticket',tk.id::text,bk.id,bk.trip_id,'wrong_trip');
  return query select 'wrong_trip',tk.id,bk.booking_code,tk.passenger_name,tk.seat_label,tr.origin,tr.destination,tr.departure_at,bk.payment_status,tk.boarded_at,coalesce(tk.bus_name,bus_record.name),null::text; return;
 end if;
 if tk.status='boarded' then
  insert into public.bus_audit_log(actor_id,action,entity_type,entity_id,booking_id,trip_id,reason) values(auth.uid(),'ticket_scan_rejected','ticket',tk.id::text,bk.id,bk.trip_id,'already_boarded');
  return query select 'already_boarded',tk.id,bk.booking_code,tk.passenger_name,tk.seat_label,tr.origin,tr.destination,tr.departure_at,bk.payment_status,tk.boarded_at,coalesce(tk.bus_name,bus_record.name),(select p.full_name from public.profiles p where p.id=tk.boarded_by); return;
 end if;
 if tk.status<>'valid' then
  insert into public.bus_audit_log(actor_id,action,entity_type,entity_id,booking_id,trip_id,reason) values(auth.uid(),'ticket_scan_rejected','ticket',tk.id::text,bk.id,bk.trip_id,tk.status);
  return query select case when tk.status='refunded' then 'refunded' else 'cancelled' end,tk.id,bk.booking_code,tk.passenger_name,tk.seat_label,tr.origin,tr.destination,tr.departure_at,bk.payment_status,tk.boarded_at,coalesce(tk.bus_name,bus_record.name),null::text; return;
 end if;
 if bk.status<>'confirmed' then
  insert into public.bus_audit_log(actor_id,action,entity_type,entity_id,booking_id,trip_id,reason) values(auth.uid(),'ticket_scan_rejected','ticket',tk.id::text,bk.id,bk.trip_id,'booking_not_confirmed');
  return query select 'unapproved',tk.id,bk.booking_code,tk.passenger_name,tk.seat_label,tr.origin,tr.destination,tr.departure_at,bk.payment_status,null::timestamptz,coalesce(tk.bus_name,bus_record.name),null::text; return;
 end if;
 if bk.payment_status<>'paid' then
  insert into public.bus_audit_log(actor_id,action,entity_type,entity_id,booking_id,trip_id,reason) values(auth.uid(),'ticket_scan_rejected','ticket',tk.id::text,bk.id,bk.trip_id,'payment_not_satisfied');
  return query select 'payment_due',tk.id,bk.booking_code,tk.passenger_name,tk.seat_label,tr.origin,tr.destination,tr.departure_at,bk.payment_status,null::timestamptz,coalesce(tk.bus_name,bus_record.name),null::text; return;
 end if;
 update public.bus_tickets set status='boarded',boarded_at=now(),boarded_by=auth.uid(),boarding_trip_id=bk.trip_id where id=tk.id;
 update public.bus_booking_seats set status='boarded' where booking_id=bk.id and seat_id=tk.seat_id and status='confirmed';
 insert into public.bus_audit_log(actor_id,action,entity_type,entity_id,booking_id,trip_id,after_data) values(auth.uid(),'passenger_boarded','ticket',tk.id::text,bk.id,bk.trip_id,jsonb_build_object('seat',tk.seat_label,'scanner',scanner_name));
 return query select 'valid',tk.id,bk.booking_code,tk.passenger_name,tk.seat_label,tr.origin,tr.destination,tr.departure_at,bk.payment_status,now(),coalesce(tk.bus_name,bus_record.name),scanner_name;
end $$;
revoke all on function public.scan_and_board_bus_ticket(text,uuid,uuid) from public;
grant execute on function public.scan_and_board_bus_ticket(text,uuid,uuid) to authenticated;

create or replace function public.get_bus_trip_boarding_stats(p_trip_id uuid)
returns table(boarded_count bigint,remaining_count bigint,recent_scans jsonb)
language plpgsql security definer set search_path=public as $$
begin
 if not public.has_section_permission('bus.qr.scan') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
 return query select
  count(*) filter(where tk.status='boarded'),
  count(*) filter(where tk.status='valid'),
  coalesce((select jsonb_agg(jsonb_build_object('at',a.created_at,'result',coalesce(a.reason,'accepted'),'ticket_id',a.entity_id,'passenger',tk2.passenger_name,'seat',tk2.seat_label) order by a.created_at desc) from (select created_at,reason,entity_id from public.bus_audit_log where actor_id=auth.uid() and action in ('passenger_boarded','ticket_scan_rejected') and trip_id=p_trip_id order by created_at desc limit 10) a left join public.bus_tickets tk2 on tk2.id::text=a.entity_id),'[]'::jsonb)
 from public.bus_tickets tk join public.bus_bookings bk on bk.id=tk.booking_id where bk.trip_id=p_trip_id and bk.status='confirmed' and bk.payment_status='paid';
end $$;
revoke all on function public.get_bus_trip_boarding_stats(uuid) from public;
grant execute on function public.get_bus_trip_boarding_stats(uuid) to authenticated;
