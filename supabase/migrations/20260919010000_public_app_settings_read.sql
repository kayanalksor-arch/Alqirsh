-- Platform identity and contact information is intentionally public content.
-- Managers retain the existing write policy from the core access migration.
drop policy if exists public_app_settings_read on public.app_settings;
create policy public_app_settings_read on public.app_settings
  for select to anon, authenticated using (true);
