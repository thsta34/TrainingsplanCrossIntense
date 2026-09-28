-- Run once in the Supabase SQL Editor for project tnhwyrapdsqoklenzwjn.
-- The script is idempotent and can safely be executed again.

create table if not exists public.training_app_settings (
  key text primary key,
  value jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.training_app_settings enable row level security;

grant select on table public.training_app_settings to anon, authenticated;
grant insert, update, delete on table public.training_app_settings to authenticated;

drop policy if exists "Allow public read registration setting" on public.training_app_settings;
create policy "Allow public read registration setting"
on public.training_app_settings
for select
to anon, authenticated
using (key = 'registration_enabled');

drop policy if exists "Allow registration admin write settings" on public.training_app_settings;
create policy "Allow registration admin write settings"
on public.training_app_settings
for all
to authenticated
using (auth.jwt() ->> 'email' = 'thstaehli@gmail.com')
with check (auth.jwt() ->> 'email' = 'thstaehli@gmail.com');

insert into public.training_app_settings (key, value)
values ('registration_enabled', 'false'::jsonb)
on conflict (key) do nothing;

notify pgrst, 'reload schema';
