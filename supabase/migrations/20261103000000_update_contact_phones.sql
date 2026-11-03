update public.app_settings
set contact_phone = '01090886364 - 01158455997',
    updated_at = now()
where contact_phone is distinct from '01090886364 - 01158455997';

alter table public.app_settings
  alter column contact_phone set default '01090886364 - 01158455997';
