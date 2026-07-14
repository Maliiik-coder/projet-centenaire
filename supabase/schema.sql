create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  first_name text,
  age int,
  height_cm int,
  start_weight_kg numeric,
  goal_weight_kg numeric,
  start_date date,
  smoking_enabled boolean default false,
  smoking_status text,
  smoking_goal text,
  initial_friction text default 'unknown',
  show_active_mission boolean default true,
  dark_mode boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  entry_date date not null,
  weight_kg numeric not null,
  created_at timestamptz default now()
);

create table if not exists public.meal_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  observed_at timestamptz not null,
  observed_date date,
  observed_time text,
  meal_type text,
  raw_text text,
  quantity_served text,
  serving_pattern text,
  hunger_before text,
  fullness_after text,
  stop_reason text,
  post_meal_snacking text,
  starter_taken boolean default false,
  starter_text text,
  dessert_taken boolean default false,
  dessert_text text,
  snack_trigger text,
  snack_context text,
  clarifications jsonb default '[]'::jsonb,
  questionnaire_version text,
  main_signal text,
  immediate_constat text,
  immediate_reading text,
  immediate_next_action text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.meal_observation_tags (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid references public.meal_observations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade not null,
  tag text not null
);

create table if not exists public.tobacco_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  event_date date not null,
  event_type text not null,
  trigger text,
  note text,
  created_at timestamptz default now()
);

create table if not exists public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  week_start date not null,
  meals_count int default 0,
  main_friction text,
  proof_level text,
  priority text,
  generated_text text,
  created_at timestamptz default now()
);

create unique index if not exists weight_entries_user_entry_date_idx
  on public.weight_entries (user_id, entry_date);

create unique index if not exists meal_observations_user_created_at_idx
  on public.meal_observations (user_id, created_at);

create unique index if not exists meal_observation_tags_unique_idx
  on public.meal_observation_tags (observation_id, tag);

create unique index if not exists tobacco_events_user_created_at_idx
  on public.tobacco_events (user_id, created_at);

create unique index if not exists tobacco_events_one_explicit_none_per_day_idx
  on public.tobacco_events (user_id, event_date)
  where event_type = 'aucun';

create unique index if not exists weekly_reports_user_week_idx
  on public.weekly_reports (user_id, week_start);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists meal_observations_set_updated_at on public.meal_observations;
create trigger meal_observations_set_updated_at
before update on public.meal_observations
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.weight_entries enable row level security;
alter table public.meal_observations enable row level security;
alter table public.meal_observation_tags enable row level security;
alter table public.tobacco_events enable row level security;
alter table public.weekly_reports enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select using (user_id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
for insert with check (user_id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles
for delete using (user_id = auth.uid());

drop policy if exists weight_entries_select_own on public.weight_entries;
create policy weight_entries_select_own on public.weight_entries
for select using (user_id = auth.uid());

drop policy if exists weight_entries_insert_own on public.weight_entries;
create policy weight_entries_insert_own on public.weight_entries
for insert with check (user_id = auth.uid());

drop policy if exists weight_entries_update_own on public.weight_entries;
create policy weight_entries_update_own on public.weight_entries
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists weight_entries_delete_own on public.weight_entries;
create policy weight_entries_delete_own on public.weight_entries
for delete using (user_id = auth.uid());

drop policy if exists meal_observations_select_own on public.meal_observations;
create policy meal_observations_select_own on public.meal_observations
for select using (user_id = auth.uid());

drop policy if exists meal_observations_insert_own on public.meal_observations;
create policy meal_observations_insert_own on public.meal_observations
for insert with check (user_id = auth.uid());

drop policy if exists meal_observations_update_own on public.meal_observations;
create policy meal_observations_update_own on public.meal_observations
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists meal_observations_delete_own on public.meal_observations;
create policy meal_observations_delete_own on public.meal_observations
for delete using (user_id = auth.uid());

drop policy if exists meal_observation_tags_select_own on public.meal_observation_tags;
create policy meal_observation_tags_select_own on public.meal_observation_tags
for select using (user_id = auth.uid());

drop policy if exists meal_observation_tags_insert_own on public.meal_observation_tags;
create policy meal_observation_tags_insert_own on public.meal_observation_tags
for insert with check (user_id = auth.uid());

drop policy if exists meal_observation_tags_update_own on public.meal_observation_tags;
create policy meal_observation_tags_update_own on public.meal_observation_tags
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists meal_observation_tags_delete_own on public.meal_observation_tags;
create policy meal_observation_tags_delete_own on public.meal_observation_tags
for delete using (user_id = auth.uid());

drop policy if exists tobacco_events_select_own on public.tobacco_events;
create policy tobacco_events_select_own on public.tobacco_events
for select using (user_id = auth.uid());

drop policy if exists tobacco_events_insert_own on public.tobacco_events;
create policy tobacco_events_insert_own on public.tobacco_events
for insert with check (user_id = auth.uid());

drop policy if exists tobacco_events_update_own on public.tobacco_events;
create policy tobacco_events_update_own on public.tobacco_events
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists tobacco_events_delete_own on public.tobacco_events;
create policy tobacco_events_delete_own on public.tobacco_events
for delete using (user_id = auth.uid());

drop policy if exists weekly_reports_select_own on public.weekly_reports;
create policy weekly_reports_select_own on public.weekly_reports
for select using (user_id = auth.uid());

drop policy if exists weekly_reports_insert_own on public.weekly_reports;
create policy weekly_reports_insert_own on public.weekly_reports
for insert with check (user_id = auth.uid());

drop policy if exists weekly_reports_update_own on public.weekly_reports;
create policy weekly_reports_update_own on public.weekly_reports
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists weekly_reports_delete_own on public.weekly_reports;
create policy weekly_reports_delete_own on public.weekly_reports
for delete using (user_id = auth.uid());
