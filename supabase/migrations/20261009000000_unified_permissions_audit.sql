-- Unified section permissions and immutable application audit log.
create table if not exists public.section_permissions(
 user_id uuid primary key references public.profiles(id) on delete cascade,
 properties_sale_view boolean not null default false, properties_sale_create boolean not null default false, properties_sale_update boolean not null default false, properties_sale_delete boolean not null default false, properties_sale_status boolean not null default false,
 properties_rent_view boolean not null default false, properties_rent_create boolean not null default false, properties_rent_update boolean not null default false, properties_rent_delete boolean not null default false, properties_rent_status boolean not null default false,
 properties_images_manage boolean not null default false, properties_requests_view boolean not null default false, properties_requests_manage boolean not null default false,
 properties_management_view boolean not null default false, properties_management_manage boolean not null default false,
 cars_sale_view boolean not null default false, cars_sale_create boolean not null default false, cars_sale_update boolean not null default false, cars_sale_delete boolean not null default false,
 cars_rent_view boolean not null default false, cars_rent_create boolean not null default false, cars_rent_update boolean not null default false, cars_rent_delete boolean not null default false, cars_images_manage boolean not null default false,
 bookings_view boolean not null default false, bookings_create boolean not null default false, bookings_update boolean not null default false, bookings_cancel boolean not null default false, bookings_customer_details boolean not null default false,
 users_permissions_manage boolean not null default false, activity_logs_view boolean not null default false,
 updated_at timestamptz not null default now(), updated_by uuid references public.profiles(id) on delete set null
);
alter table public.section_permissions enable row level security;
drop policy if exists section_permissions_admin_all on public.section_permissions;
create policy section_permissions_admin_all on public.section_permissions for all to authenticated using(exists(select 1 from public.profiles where id=auth.uid() and role='admin')) with check(exists(select 1 from public.profiles where id=auth.uid() and role='admin'));
drop policy if exists section_permissions_self_read on public.section_permissions;
create policy section_permissions_self_read on public.section_permissions for select to authenticated using(user_id=auth.uid());

-- Preserve access previously granted by legacy vehicle permissions and the
-- property_manager role while keeping the new sections independent.
insert into public.section_permissions(user_id,cars_sale_view,cars_sale_create,cars_sale_update,cars_sale_delete,cars_rent_view,cars_rent_create,cars_rent_update,cars_rent_delete,cars_images_manage,bookings_view,bookings_create,bookings_update,bookings_cancel)
select user_id,can_access_sale and can_view_vehicles,can_access_sale and can_add_vehicles,can_access_sale and can_edit_vehicles,can_access_sale and can_delete_vehicles,
 can_access_rent and can_view_vehicles,can_access_rent and can_add_vehicles,can_access_rent and can_edit_vehicles,can_access_rent and can_delete_vehicles,can_manage_images,
 can_view_bookings,can_create_bookings,can_edit_bookings,can_cancel_bookings from public.vehicle_permissions on conflict(user_id) do nothing;
insert into public.section_permissions(user_id,properties_sale_view,properties_sale_create,properties_sale_update,properties_sale_delete,properties_sale_status,properties_rent_view,properties_rent_create,properties_rent_update,properties_rent_delete,properties_rent_status,properties_images_manage,properties_management_view,properties_management_manage)
select id,true,true,true,true,true,true,true,true,true,true,true,true,true from public.profiles where role='property_manager' on conflict(user_id) do nothing;

create or replace function public.has_section_permission(permission_name text)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='active') or (exists(select 1 from public.profiles where id=auth.uid() and status='active') and coalesce((select case permission_name
 when 'properties.sale.view' then properties_sale_view when 'properties.sale.create' then properties_sale_create when 'properties.sale.update' then properties_sale_update when 'properties.sale.delete' then properties_sale_delete when 'properties.sale.status' then properties_sale_status
 when 'properties.rent.view' then properties_rent_view when 'properties.rent.create' then properties_rent_create when 'properties.rent.update' then properties_rent_update when 'properties.rent.delete' then properties_rent_delete when 'properties.rent.status' then properties_rent_status
 when 'properties.images.manage' then properties_images_manage when 'properties.requests.view' then properties_requests_view when 'properties.requests.manage' then properties_requests_manage when 'properties.management.view' then properties_management_view when 'properties.management.manage' then properties_management_manage
 when 'cars.sale.view' then cars_sale_view when 'cars.sale.create' then cars_sale_create when 'cars.sale.update' then cars_sale_update when 'cars.sale.delete' then cars_sale_delete
 when 'cars.rent.view' then cars_rent_view when 'cars.rent.create' then cars_rent_create when 'cars.rent.update' then cars_rent_update when 'cars.rent.delete' then cars_rent_delete when 'cars.images.manage' then cars_images_manage
 when 'bookings.view' then bookings_view when 'bookings.create' then bookings_create when 'bookings.update' then bookings_update when 'bookings.cancel' then bookings_cancel when 'bookings.customer_details' then bookings_customer_details when 'users.permissions.manage' then users_permissions_manage when 'activity_logs.view' then activity_logs_view else false end from public.section_permissions where user_id=auth.uid()),false))
$$;
revoke all on function public.has_section_permission(text) from public;
grant execute on function public.has_section_permission(text) to authenticated;

create or replace function public.is_platform_manager() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='active');
$$;
revoke all on function public.is_platform_manager() from public;
grant execute on function public.is_platform_manager() to authenticated;

create table if not exists public.activity_logs(
 id bigint generated always as identity primary key, actor_id uuid references public.profiles(id) on delete set null,
 actor_name text, actor_email text, section text not null, action text not null, entity_id text, entity_label text,
 description text not null, outcome text not null default 'success' check(outcome in ('success','failure','denied')),
 sensitive boolean not null default false, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists activity_logs_created_idx on public.activity_logs(created_at desc,id desc);
create index if not exists activity_logs_actor_idx on public.activity_logs(actor_id,created_at desc);
create index if not exists activity_logs_section_action_idx on public.activity_logs(section,action,created_at desc);
alter table public.activity_logs enable row level security;
drop policy if exists activity_logs_read_admin on public.activity_logs;
create policy activity_logs_read_admin on public.activity_logs for select to authenticated using(public.has_section_permission('activity_logs.view'));
drop policy if exists activity_logs_insert_never_client on public.activity_logs;
create policy activity_logs_insert_never_client on public.activity_logs for insert to authenticated with check(false);
drop policy if exists activity_logs_update_never on public.activity_logs;
create policy activity_logs_update_never on public.activity_logs for update to authenticated using(false) with check(false);
drop policy if exists activity_logs_delete_never on public.activity_logs;
create policy activity_logs_delete_never on public.activity_logs for delete to authenticated using(false);

create or replace function public.activity_log_summary(p_since timestamptz default null,p_until timestamptz default null)
returns table(total bigint,successful bigint,failed bigint,active_users bigint,sensitive bigint)
language plpgsql security invoker set search_path=public as $$
begin
 if not public.has_section_permission('activity_logs.view') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
 return query select count(*),count(*) filter(where outcome='success'),count(*) filter(where outcome<>'success'),count(distinct actor_id),count(*) filter(where sensitive)
 from public.activity_logs where (p_since is null or created_at>=p_since) and (p_until is null or created_at<=p_until);
end $$;
revoke all on function public.activity_log_summary(timestamptz,timestamptz) from public;
grant execute on function public.activity_log_summary(timestamptz,timestamptz) to authenticated;

create or replace function public.write_activity_log(p_actor uuid,p_section text,p_action text,p_entity_id text,p_label text,p_description text,p_sensitive boolean default false,p_details jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare p public.profiles;
begin
 if p_actor is distinct from auth.uid() and not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
 select * into p from public.profiles where id=p_actor;
 insert into public.activity_logs(actor_id,actor_name,actor_email,section,action,entity_id,entity_label,description,sensitive,details)
 values(p_actor,p.full_name,p.email,p_section,p_action,p_entity_id,left(p_label,200),left(p_description,500),p_sensitive,coalesce(p_details,'{}'::jsonb));
end $$;
revoke all on function public.write_activity_log(uuid,text,text,text,text,text,boolean,jsonb) from public;

create or replace function public.audit_vehicle_mutation() returns trigger language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); op text;
begin
 op:=case when tg_op='INSERT' then 'create' when tg_op='DELETE' then 'delete' else 'update' end;
 perform public.write_activity_log(actor,'cars',op,coalesce(new.id,old.id)::text,coalesce(new.title,old.title), 'Vehicle '||op, false, '{}'::jsonb);
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
drop trigger if exists audit_vehicle_mutation_trigger on public.vehicle_listings;
create trigger audit_vehicle_mutation_trigger after insert or update or delete on public.vehicle_listings for each row execute function public.audit_vehicle_mutation();

create or replace function public.audit_booking_mutation() returns trigger language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); op text;
begin
 op:=case when tg_op='INSERT' then 'create' when new.status='cancelled' and old.status is distinct from new.status then 'cancel' else 'update' end;
 perform public.write_activity_log(actor,'bookings',op,coalesce(new.id,old.id)::text,coalesce(new.vehicle_id,old.vehicle_id)::text, 'Booking '||op, true, jsonb_build_object('status',coalesce(new.status,old.status)));
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
drop trigger if exists audit_booking_mutation_trigger on public.vehicle_bookings;
create trigger audit_booking_mutation_trigger after insert or update or delete on public.vehicle_bookings for each row execute function public.audit_booking_mutation();

create or replace function public.audit_profile_mutation() returns trigger language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid();
begin
 if actor is null then return new; end if;
 if tg_op='INSERT' then perform public.write_activity_log(actor,'users','create',new.id::text,new.full_name,'User created',true,'{}'::jsonb);
 elsif old.role is distinct from new.role or old.status is distinct from new.status then perform public.write_activity_log(actor,'users','update',new.id::text,new.full_name,'User role or status changed',true,jsonb_build_object('role_changed',old.role is distinct from new.role,'status_changed',old.status is distinct from new.status)); end if;
 return new;
end $$;
drop trigger if exists audit_profile_mutation_trigger on public.profiles;
create trigger audit_profile_mutation_trigger after insert or update of role,status on public.profiles for each row execute function public.audit_profile_mutation();

create or replace function public.audit_permission_mutation() returns trigger language plpgsql security definer set search_path=public as $$
begin
 perform public.write_activity_log(auth.uid(),'permissions','update',new.user_id::text,new.user_id::text,'User section permissions changed',true,'{}'::jsonb);
 return new;
end $$;
drop trigger if exists audit_section_permissions_trigger on public.section_permissions;
create trigger audit_section_permissions_trigger after insert or update on public.section_permissions for each row execute function public.audit_permission_mutation();

create or replace function public.audit_property_mutation() returns trigger language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); op text; kind text;
begin
 kind:=case when tg_table_name='sale_offers' then 'properties.sale' else 'properties.rent' end;
 op:=case when tg_op='INSERT' then 'create' when tg_op='DELETE' then 'delete' when new.status is distinct from old.status then 'status' else 'update' end;
 perform public.write_activity_log(actor,kind,op,coalesce(new.id,old.id)::text,coalesce(new.title,old.title),'Property listing '||op,false,'{}'::jsonb);
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
drop trigger if exists audit_sale_offer_trigger on public.sale_offers;
create trigger audit_sale_offer_trigger after insert or update or delete on public.sale_offers for each row execute function public.audit_property_mutation();
drop trigger if exists audit_rental_offer_trigger on public.rental_offers;
create trigger audit_rental_offer_trigger after insert or update or delete on public.rental_offers for each row execute function public.audit_property_mutation();

create or replace function public.audit_media_mutation() returns trigger language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); op text; identity text; section_name text;
begin
 op:=case when tg_op='INSERT' then 'image_add' when tg_op='DELETE' then 'image_delete' else 'image_update' end;
 if tg_table_name='vehicle_images' then identity:=coalesce(new.vehicle_id,old.vehicle_id)::text;section_name:='cars';
 else identity:=coalesce(new.property_id,old.property_id)::text;section_name:='properties';end if;
 perform public.write_activity_log(actor,section_name,op,identity,identity,'Listing media changed',false,'{}'::jsonb);
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
drop trigger if exists audit_vehicle_images_trigger on public.vehicle_images;
create trigger audit_vehicle_images_trigger after insert or update or delete on public.vehicle_images for each row execute function public.audit_media_mutation();
drop trigger if exists audit_property_images_trigger on public.property_images;
create trigger audit_property_images_trigger after insert or update or delete on public.property_images for each row execute function public.audit_media_mutation();

create or replace function public.audit_settings_mutation() returns trigger language plpgsql security definer set search_path=public as $$
begin
 perform public.write_activity_log(auth.uid(),'settings',case when tg_op='INSERT' then 'create' else 'update' end,coalesce(new.id,old.id)::text,coalesce(new.app_name,old.app_name),'Platform settings changed',true,'{}'::jsonb);
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
drop trigger if exists audit_app_settings_trigger on public.app_settings;
create trigger audit_app_settings_trigger after insert or update or delete on public.app_settings for each row execute function public.audit_settings_mutation();

-- Tighten listing RLS: preserve public reads, replace the old broad manager policy.
do $$ declare t text;begin foreach t in array array['sale_offers','rental_offers'] loop
 execute format('drop policy if exists manager_listing_access on public.%I',t);
 execute format('drop policy if exists public_active_listings on public.%I',t);
end loop;end $$;
create policy public_sale_offers_read on public.sale_offers for select to anon,authenticated using(status<>'archived');
create policy sale_offer_permission_insert on public.sale_offers for insert to authenticated with check(public.has_section_permission('properties.sale.create'));
create policy sale_offer_permission_update on public.sale_offers for update to authenticated using(public.has_section_permission('properties.sale.update')) with check(public.has_section_permission('properties.sale.update'));
create policy sale_offer_permission_delete on public.sale_offers for delete to authenticated using(public.has_section_permission('properties.sale.delete'));
create policy public_rental_offers_read on public.rental_offers for select to anon,authenticated using(status<>'archived');
create policy rental_offer_permission_insert on public.rental_offers for insert to authenticated with check(public.has_section_permission('properties.rent.create'));
create policy rental_offer_permission_update on public.rental_offers for update to authenticated using(public.has_section_permission('properties.rent.update')) with check(public.has_section_permission('properties.rent.update'));
create policy rental_offer_permission_delete on public.rental_offers for delete to authenticated using(public.has_section_permission('properties.rent.delete'));
drop policy if exists vehicle_listings_manager_access on public.vehicle_listings;
drop policy if exists vehicle_listings_granular_read on public.vehicle_listings;
drop policy if exists vehicle_listings_granular_insert on public.vehicle_listings;
drop policy if exists vehicle_listings_granular_update on public.vehicle_listings;
drop policy if exists vehicle_listings_granular_delete on public.vehicle_listings;
create policy vehicle_permission_insert on public.vehicle_listings for insert to authenticated with check((listing_type='sale' and public.has_section_permission('cars.sale.create')) or (listing_type='rent' and public.has_section_permission('cars.rent.create')));
create policy vehicle_permission_update on public.vehicle_listings for update to authenticated using((listing_type='sale' and public.has_section_permission('cars.sale.update')) or (listing_type='rent' and public.has_section_permission('cars.rent.update'))) with check((listing_type='sale' and public.has_section_permission('cars.sale.update')) or (listing_type='rent' and public.has_section_permission('cars.rent.update')));
create policy vehicle_permission_delete on public.vehicle_listings for delete to authenticated using((listing_type='sale' and public.has_section_permission('cars.sale.delete')) or (listing_type='rent' and public.has_section_permission('cars.rent.delete')));
drop policy if exists vehicle_images_manager_write on public.vehicle_images;
create policy vehicle_images_permission_write on public.vehicle_images for all to authenticated using(public.has_section_permission('cars.images.manage')) with check(public.has_section_permission('cars.images.manage'));

create or replace function public.guard_listing_status_permission() returns trigger language plpgsql set search_path=public as $$
declare key text;
begin
 if new.status is distinct from old.status then
  if tg_table_name='sale_offers' then key:='properties.sale.status';elsif tg_table_name='rental_offers' then key:='properties.rent.status';elsif new.listing_type='sale' then key:='cars.sale.update';else key:='cars.rent.update';end if;
  if not public.has_section_permission(key) then raise exception 'NOT_AUTHORIZED' using errcode='42501';end if;
 end if;
 return new;
end $$;
drop trigger if exists sale_offer_status_permission on public.sale_offers;
create trigger sale_offer_status_permission before update of status on public.sale_offers for each row execute function public.guard_listing_status_permission();
drop trigger if exists rental_offer_status_permission on public.rental_offers;
create trigger rental_offer_status_permission before update of status on public.rental_offers for each row execute function public.guard_listing_status_permission();
drop trigger if exists vehicle_status_permission on public.vehicle_listings;
create trigger vehicle_status_permission before update of status on public.vehicle_listings for each row execute function public.guard_listing_status_permission();

drop policy if exists manager_listing_images on public.property_images;
drop policy if exists manager_listing_images_write on storage.objects;
drop policy if exists manager_listing_images_update on storage.objects;
drop policy if exists manager_listing_images_delete on storage.objects;
create policy property_images_permission_write on public.property_images for all to authenticated
 using(public.has_section_permission('properties.images.manage')) with check(public.has_section_permission('properties.images.manage'));
create policy section_media_insert on storage.objects for insert to authenticated with check(bucket_id='listing-images' and ((name like 'vehicles/%' and public.has_section_permission('cars.images.manage')) or (name like 'properties/sale/%' and public.has_section_permission('properties.images.manage')) or (name like 'properties/rental/%' and public.has_section_permission('properties.images.manage'))));
create policy section_media_update on storage.objects for update to authenticated using(bucket_id='listing-images' and ((name like 'vehicles/%' and public.has_section_permission('cars.images.manage')) or (name like 'properties/%' and public.has_section_permission('properties.images.manage')))) with check(bucket_id='listing-images' and ((name like 'vehicles/%' and public.has_section_permission('cars.images.manage')) or (name like 'properties/%' and public.has_section_permission('properties.images.manage'))));
create policy section_media_delete on storage.objects for delete to authenticated using(bucket_id='listing-images' and ((name like 'vehicles/%' and public.has_section_permission('cars.images.manage')) or (name like 'properties/%' and public.has_section_permission('properties.images.manage'))));

-- Replace role-only access for internal property-management records.
do $$ declare t text;begin foreach t in array array['property_owners','managed_properties','managed_tenants','managed_units','lease_contracts','rent_payments','maintenance_requests','property_management_settings'] loop
 execute format('drop policy if exists property_management_access on public.%I',t);
 execute format('drop policy if exists property_management_read on public.%I',t);
 execute format('drop policy if exists property_management_insert on public.%I',t);
 execute format('drop policy if exists property_management_update on public.%I',t);
 execute format('drop policy if exists property_management_delete on public.%I',t);
 execute format('create policy property_management_read on public.%I for select to authenticated using(public.has_section_permission(''properties.management.view''))',t);
 execute format('create policy property_management_insert on public.%I for insert to authenticated with check(public.has_section_permission(''properties.management.manage''))',t);
 execute format('create policy property_management_update on public.%I for update to authenticated using(public.has_section_permission(''properties.management.manage'')) with check(public.has_section_permission(''properties.management.manage''))',t);
 execute format('create policy property_management_delete on public.%I for delete to authenticated using(public.has_section_permission(''properties.management.manage''))',t);
end loop;end $$;

-- Rebind rental booking policies and RPC authorization to the unified model.
drop policy if exists vehicle_bookings_read on public.vehicle_bookings;
create policy vehicle_bookings_read on public.vehicle_bookings for select to authenticated using(public.has_section_permission('bookings.view') and public.has_section_permission('cars.rent.view'));
drop policy if exists vehicle_bookings_update on public.vehicle_bookings;
create policy vehicle_bookings_update on public.vehicle_bookings for update to authenticated using((public.has_section_permission('bookings.update') or public.has_section_permission('bookings.cancel')) and public.has_section_permission('cars.rent.view')) with check((public.has_section_permission('bookings.update') or public.has_section_permission('bookings.cancel')) and public.has_section_permission('cars.rent.view'));
create or replace function public.enforce_vehicle_booking_permissions() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if tg_op='INSERT' and not public.has_section_permission('bookings.create') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
 if tg_op='UPDATE' then
  if new.status='cancelled' and old.status<>'cancelled' and not public.has_section_permission('bookings.cancel') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
  if new.status is distinct from old.status and new.status<>'cancelled' and not public.has_section_permission('bookings.update') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
  if (new.starts_at,new.ends_at,new.customer_name,new.customer_phone,new.notes,new.deposit_amount) is distinct from (old.starts_at,old.ends_at,old.customer_name,old.customer_phone,old.notes,old.deposit_amount) and not public.has_section_permission('bookings.update') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
  if new.vehicle_id is distinct from old.vehicle_id or new.daily_rate is distinct from old.daily_rate or new.total_amount is distinct from old.total_amount then raise exception 'BOOKING_PRICE_OR_VEHICLE_IMMUTABLE' using errcode='42501'; end if;
 end if;
 return new;
end $$;

create or replace function public.create_vehicle_booking(p_vehicle_id uuid,p_customer_name text,p_customer_phone text,p_starts_at timestamptz,p_ends_at timestamptz,p_deposit numeric default 0,p_notes text default null)
returns public.vehicle_bookings language plpgsql security definer set search_path=public as $$
declare v public.vehicle_listings; d numeric; amount numeric; result public.vehicle_bookings;
begin
 if not public.has_section_permission('bookings.create') or not public.has_section_permission('cars.rent.view') then raise exception 'NOT_AUTHORIZED' using errcode='42501'; end if;
 if p_ends_at<=p_starts_at or nullif(trim(p_customer_name),'') is null or nullif(trim(p_customer_phone),'') is null or coalesce(p_deposit,0)<0 then raise exception 'INVALID_BOOKING' using errcode='22023'; end if;
 select * into v from public.vehicle_listings where id=p_vehicle_id and listing_type='rent' for update;
 if not found or v.status in ('archived','temporarily_unavailable','unavailable','withdrawn') then raise exception 'VEHICLE_UNAVAILABLE' using errcode='22023'; end if;
 d:=coalesce(v.daily_price,v.weekly_price/7,v.monthly_price/30);
 if d is null then raise exception 'VEHICLE_HAS_NO_RENTAL_RATE' using errcode='22023'; end if;
 amount:=ceil(extract(epoch from (p_ends_at-p_starts_at))/86400.0)*d;
 if coalesce(p_deposit,0)>amount then raise exception 'DEPOSIT_EXCEEDS_TOTAL' using errcode='22023'; end if;
 insert into public.vehicle_bookings(vehicle_id,customer_name,customer_phone,starts_at,ends_at,daily_rate,total_amount,deposit_amount,notes,created_by)
 values(p_vehicle_id,trim(p_customer_name),trim(p_customer_phone),p_starts_at,p_ends_at,d,amount,coalesce(p_deposit,0),nullif(trim(p_notes),''),auth.uid()) returning * into result;
 return result;
end $$;
revoke all on function public.create_vehicle_booking(uuid,text,text,timestamptz,timestamptz,numeric,text) from public;
grant execute on function public.create_vehicle_booking(uuid,text,text,timestamptz,timestamptz,numeric,text) to authenticated;

create or replace function public.audit_internal_property_mutation() returns trigger language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); op text; entity text; label text;
begin
 op:=case when tg_op='INSERT' then 'create' when tg_op='DELETE' then 'delete' else 'update' end;
 entity:=case when tg_op='DELETE' then old.id::text else new.id::text end;
 label:=tg_table_name||' '||entity;
 perform public.write_activity_log(actor,'properties.management',op,entity,label,'Internal property management record '||op,true,'{}'::jsonb);
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
do $$ declare t text;begin foreach t in array array['property_owners','managed_properties','managed_tenants','managed_units','lease_contracts','rent_payments','maintenance_requests','property_management_settings'] loop
 execute format('drop trigger if exists audit_internal_property_trigger on public.%I',t);
 execute format('create trigger audit_internal_property_trigger after insert or update or delete on public.%I for each row execute function public.audit_internal_property_mutation()',t);
end loop;end $$;

