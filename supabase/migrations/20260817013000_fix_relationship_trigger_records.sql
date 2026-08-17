-- Each trigger row has a different record shape; use dedicated functions.
create or replace function public.validate_lease_contract_relationship()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if not exists (select 1 from public.managed_units u where u.id = new.unit_id and u.property_id = new.property_id) then
    raise exception 'The selected unit does not belong to the selected property';
  end if;
  return new;
end; $$;
create or replace function public.validate_rent_payment_relationship()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if not exists (select 1 from public.lease_contracts c where c.id = new.contract_id and c.tenant_id = new.tenant_id and c.unit_id = new.unit_id) then
    raise exception 'The payment tenant and unit must match its contract';
  end if;
  return new;
end; $$;
create or replace function public.validate_maintenance_relationship()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.unit_id is not null and not exists (select 1 from public.managed_units u where u.id = new.unit_id and u.property_id = new.property_id) then
    raise exception 'The selected unit does not belong to the selected property';
  end if;
  return new;
end; $$;
drop trigger if exists lease_contract_relationship_integrity on public.lease_contracts;
create trigger lease_contract_relationship_integrity before insert or update on public.lease_contracts for each row execute function public.validate_lease_contract_relationship();
drop trigger if exists rent_payment_relationship_integrity on public.rent_payments;
create trigger rent_payment_relationship_integrity before insert or update on public.rent_payments for each row execute function public.validate_rent_payment_relationship();
drop trigger if exists maintenance_relationship_integrity on public.maintenance_requests;
create trigger maintenance_relationship_integrity before insert or update on public.maintenance_requests for each row execute function public.validate_maintenance_relationship();
