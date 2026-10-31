create or replace function public.create_bus_with_seats(
 p_name text,p_bus_number text,p_plate_number text,p_bus_type text,p_manufacturer text,p_model text,p_capacity integer,p_services text[],p_image_path text
) returns uuid language plpgsql security definer set search_path=public as $$
declare bus_id uuid; i integer; row_no integer; seat_position integer;
begin
 if not public.has_section_permission('bus.fleet.manage') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
 if length(trim(p_name)) not between 1 and 120 or length(trim(p_bus_number)) not between 1 and 40 or length(trim(p_bus_type)) not between 1 and 60 or p_capacity not between 4 and 100 then raise exception 'INVALID_BUS' using errcode='22023'; end if;
 if coalesce(cardinality(p_services),0)>15 then raise exception 'TOO_MANY_BUS_SERVICES' using errcode='22023'; end if;
 if p_image_path is not null and p_image_path !~ ('^'||auth.uid()::text||'/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$') then raise exception 'INVALID_BUS_IMAGE_PATH' using errcode='22023'; end if;
 insert into public.buses(name,bus_number,plate_number,bus_type,manufacturer,model,services,image_path,created_by)
 values(trim(p_name),trim(p_bus_number),nullif(trim(p_plate_number),''),trim(p_bus_type),nullif(trim(p_manufacturer),''),nullif(trim(p_model),''),coalesce(p_services,'{}'),p_image_path,auth.uid()) returning id into bus_id;
 for i in 1..p_capacity loop
  row_no:=((i-1)/4)+1;
  seat_position:=((i-1)%4)+1;
  insert into public.bus_seats(bus_id,seat_label,row_number,position)
  values(bus_id,row_no::text||chr(64+seat_position),row_no,seat_position);
 end loop;
 insert into public.bus_audit_log(actor_id,action,entity_type,entity_id,after_data)
 values(auth.uid(),'bus_created','bus',bus_id::text,jsonb_build_object('name',trim(p_name),'bus_number',trim(p_bus_number),'capacity',p_capacity,'image_path',p_image_path));
 return bus_id;
end $$;
revoke all on function public.create_bus_with_seats(text,text,text,text,text,text,integer,text[],text) from public;
grant execute on function public.create_bus_with_seats(text,text,text,text,text,text,integer,text[],text) to authenticated;
