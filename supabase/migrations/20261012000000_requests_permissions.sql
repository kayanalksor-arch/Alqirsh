-- Keep the existing platform-manager policy intact while honoring the
-- dedicated request permissions for authenticated users.
create policy requests_permission_read
  on public.requests
  for select
  to authenticated
  using (
    public.has_section_permission('properties.requests.view')
    or public.has_section_permission('properties.requests.manage')
  );

create policy requests_permission_insert
  on public.requests
  for insert
  to authenticated
  with check (
    public.has_section_permission('properties.requests.manage')
    and created_by = auth.uid()
  );

create policy requests_permission_update
  on public.requests
  for update
  to authenticated
  using (public.has_section_permission('properties.requests.manage'))
  with check (public.has_section_permission('properties.requests.manage'));

create policy requests_permission_delete
  on public.requests
  for delete
  to authenticated
  using (public.has_section_permission('properties.requests.manage'));
