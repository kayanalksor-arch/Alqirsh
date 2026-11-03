insert into public.app_settings (contact_phone)
select '01090886364 - 01158455997'
where not exists (select 1 from public.app_settings);
