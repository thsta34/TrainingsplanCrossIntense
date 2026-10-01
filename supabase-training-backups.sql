-- Serverseitige Sicherungen fuer public.training_app_states
-- Einmal im Supabase SQL Editor als Projekt-Owner ausfuehren.
-- Das Skript ist wiederholt ausfuehrbar.

create table if not exists public.training_app_state_backups (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  data jsonb not null,
  source_updated_at timestamptz,
  backed_up_at timestamptz not null default now(),
  backup_reason text not null
    check (backup_reason in ('initial', 'before-update', 'before-delete', 'nightly'))
);

create index if not exists training_app_state_backups_user_time_idx
  on public.training_app_state_backups (user_id, backed_up_at desc);

alter table public.training_app_state_backups enable row level security;

-- Die App darf Sicherungen weder lesen noch veraendern. Zugriff erfolgt nur
-- ueber den Supabase SQL Editor bzw. serverseitige Funktionen.
revoke all on table public.training_app_state_backups from anon, authenticated;
revoke all on sequence public.training_app_state_backups_id_seq from anon, authenticated;

create or replace function public.backup_training_app_state_before_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    insert into public.training_app_state_backups
      (user_id, data, source_updated_at, backup_reason)
    values
      (old.user_id, old.data::jsonb, old.updated_at, 'before-delete');
    return old;
  end if;

  if old.data is distinct from new.data then
    insert into public.training_app_state_backups
      (user_id, data, source_updated_at, backup_reason)
    values
      (old.user_id, old.data::jsonb, old.updated_at, 'before-update');
  end if;

  return new;
end;
$$;

revoke all on function public.backup_training_app_state_before_change()
  from public, anon, authenticated;

drop trigger if exists backup_training_app_state_before_change
  on public.training_app_states;

create trigger backup_training_app_state_before_change
before update or delete on public.training_app_states
for each row
execute function public.backup_training_app_state_before_change();

-- Beim ersten Ausfuehren sofort jeden vorhandenen Benutzerstand sichern.
insert into public.training_app_state_backups
  (user_id, data, source_updated_at, backup_reason)
select
  states.user_id,
  states.data::jsonb,
  states.updated_at,
  'initial'
from public.training_app_states as states
where not exists (
  select 1
  from public.training_app_state_backups as backups
  where backups.user_id = states.user_id
    and backups.backup_reason = 'initial'
);

create or replace function public.run_training_state_backup_maintenance()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.training_app_state_backups
    (user_id, data, source_updated_at, backup_reason)
  select
    user_id,
    data::jsonb,
    updated_at,
    'nightly'
  from public.training_app_states;

  -- Aenderungsversionen und Nachtsicherungen 365 Tage aufbewahren.
  delete from public.training_app_state_backups
  where backed_up_at < now() - interval '365 days';
end;
$$;

revoke all on function public.run_training_state_backup_maintenance()
  from public, anon, authenticated;

-- Geschuetzte Wiederherstellung. Nur im SQL Editor als Projekt-Owner aufrufen.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.restore_training_app_state_backup(p_backup_id bigint)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  selected_backup public.training_app_state_backups%rowtype;
begin
  select *
  into selected_backup
  from public.training_app_state_backups
  where id = p_backup_id;

  if not found then
    raise exception 'Backup % wurde nicht gefunden', p_backup_id;
  end if;

  update public.training_app_states
  set data = selected_backup.data,
      updated_at = now()
  where user_id = selected_backup.user_id;

  if not found then
    raise exception 'Kein aktueller State fuer User % gefunden', selected_backup.user_id;
  end if;

  return selected_backup.user_id;
end;
$$;

revoke all on function private.restore_training_app_state_backup(bigint)
  from public, anon, authenticated;

-- Supabase Cron (pg_cron) aktivieren und taeglich um 02:30 UTC ausfuehren.
-- Das entspricht 03:30 Uhr Winterzeit bzw. 04:30 Uhr Sommerzeit in der Schweiz.
create extension if not exists pg_cron;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'nightly-training-state-backup'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'nightly-training-state-backup',
    '30 2 * * *',
    'select public.run_training_state_backup_maintenance();'
  );
end;
$$;

-- Kontrolle nach dem Setup:
select id, user_id, backup_reason, source_updated_at, backed_up_at
from public.training_app_state_backups
order by backed_up_at desc
limit 20;

select jobid, jobname, schedule, command, active
from cron.job
where jobname = 'nightly-training-state-backup';

-- Wiederherstellung (ID vorher mit der Kontrollabfrage pruefen):
-- select private.restore_training_app_state_backup(123);
