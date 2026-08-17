create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.email,
    case when lower(new.email) = 'ca.markode@gmail.com' then 'admin' else 'member' end
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = case when public.profiles.full_name is null or public.profiles.full_name = '' then excluded.full_name else public.profiles.full_name end,
        role = case when lower(excluded.email) = 'ca.markode@gmail.com' then 'admin' else public.profiles.role end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_sync_profile on auth.users;
create trigger on_auth_user_created_sync_profile
  after insert on auth.users
  for each row execute procedure public.sync_profile_from_auth_user();

-- Backfill existing Auth users without creating duplicate profile rows.
insert into public.profiles (id, full_name, email, role)
select
  id,
  coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', ''),
  email,
  case when lower(email) = 'ca.markode@gmail.com' then 'admin' else 'member' end
from auth.users
on conflict (id) do update
  set email = excluded.email,
      role = case when lower(excluded.email) = 'ca.markode@gmail.com' then 'admin' else public.profiles.role end;
