create table public.partners (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  logo_url text,
  website text,
  description text,
  category text,
  status text default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.partners enable row level security;

create policy "Anyone can view active partners"
  on public.partners for select
  using (status = 'active');

create policy "Admins can manage partners"
  on public.partners for all
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
