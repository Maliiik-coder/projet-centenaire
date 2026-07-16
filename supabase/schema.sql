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
  initial_behavior_assessment jsonb,
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
  meal_structure jsonb,
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

create table if not exists public.sport_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  goals text[] not null default '{}',
  preferred_activities text[] not null default '{}',
  desired_frequency text not null,
  usual_duration_minutes int not null,
  available_locations text[] not null default '{}',
  questionnaire_completed boolean not null default false,
  walk_run_readiness jsonb not null default '{}'::jsonb,
  swim_readiness jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sport_user_equipment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  equipment_type text not null,
  details jsonb,
  available boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.sport_user_limitations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  limitation_kind text not null,
  body_zone text,
  description text,
  active boolean not null default true,
  declared_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.sport_user_capabilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  dimension text not null,
  level int not null check (level >= 0 and level <= 4),
  source text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.sport_exercises (
  id text primary key,
  activity text not null,
  movement_pattern text not null,
  capability_dimension text not null,
  name text not null,
  short_description text not null,
  primary_cue text not null,
  required_equipment text[] not null default '{}',
  target_zones text[] not null default '{}',
  caution_zones text[] not null default '{}',
  difficulty int not null check (difficulty >= 0 and difficulty <= 4),
  effort_seconds_min int not null,
  effort_seconds_max int not null,
  active boolean not null default true,
  validation_status text not null default 'draft_unreviewed',
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sport_exercise_variants (
  id text primary key,
  exercise_id text references public.sport_exercises(id) on delete cascade not null,
  name text not null,
  difficulty int not null check (difficulty >= 0 and difficulty <= 4),
  required_equipment text[] not null default '{}',
  easier_variant_id text,
  harder_variant_id text,
  guidance text not null,
  primary_cue text not null,
  effort_seconds_min int not null,
  effort_seconds_max int not null,
  active boolean not null default true
);

create table if not exists public.sport_exercise_media (
  id text primary key,
  exercise_id text references public.sport_exercises(id) on delete cascade not null,
  variant_id text references public.sport_exercise_variants(id) on delete set null,
  media_kind text not null,
  storage_path text,
  alt_text text not null,
  source text not null,
  license text not null,
  placeholder boolean not null default true,
  validation_status text not null default 'draft_unreviewed'
);

create table if not exists public.sport_workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  activity text not null,
  requested_duration_minutes int not null,
  planned_duration_seconds int not null,
  performed_duration_seconds int,
  status text not null,
  scheduled_at timestamptz not null default now(),
  generation_engine_version text not null,
  planned_difficulty int not null check (planned_difficulty >= 0 and planned_difficulty <= 4),
  general_reason text not null,
  reasons jsonb not null default '[]'::jsonb,
  generation_input_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sport_workout_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  session_id uuid references public.sport_workout_sessions(id) on delete cascade not null,
  step_order int not null,
  step_type text not null,
  exercise_id text references public.sport_exercises(id) on delete set null,
  variant_id text references public.sport_exercise_variants(id) on delete set null,
  title text not null,
  instruction text not null,
  duration_seconds int,
  distance_meters int,
  pool_lengths int,
  skippable boolean not null default true,
  next_preparation text
);

create table if not exists public.sport_workout_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  session_id uuid references public.sport_workout_sessions(id) on delete cascade not null,
  difficulty text not null,
  completion text not null,
  body_signal text not null,
  affected_zone text,
  comment text,
  created_at timestamptz not null default now()
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

create unique index if not exists sport_user_equipment_user_type_idx
  on public.sport_user_equipment (user_id, equipment_type);

create unique index if not exists sport_user_capabilities_user_dimension_idx
  on public.sport_user_capabilities (user_id, dimension);

create index if not exists sport_user_limitations_user_active_idx
  on public.sport_user_limitations (user_id, active);

create unique index if not exists sport_workout_steps_session_order_idx
  on public.sport_workout_steps (session_id, step_order);

create index if not exists sport_workout_sessions_user_scheduled_idx
  on public.sport_workout_sessions (user_id, scheduled_at desc);

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

drop trigger if exists sport_profiles_set_updated_at on public.sport_profiles;
create trigger sport_profiles_set_updated_at
before update on public.sport_profiles
for each row execute function public.set_updated_at();

drop trigger if exists sport_exercises_set_updated_at on public.sport_exercises;
create trigger sport_exercises_set_updated_at
before update on public.sport_exercises
for each row execute function public.set_updated_at();

drop trigger if exists sport_workout_sessions_set_updated_at on public.sport_workout_sessions;
create trigger sport_workout_sessions_set_updated_at
before update on public.sport_workout_sessions
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.weight_entries enable row level security;
alter table public.meal_observations enable row level security;
alter table public.meal_observation_tags enable row level security;
alter table public.tobacco_events enable row level security;
alter table public.weekly_reports enable row level security;
alter table public.sport_profiles enable row level security;
alter table public.sport_user_equipment enable row level security;
alter table public.sport_user_limitations enable row level security;
alter table public.sport_user_capabilities enable row level security;
alter table public.sport_exercises enable row level security;
alter table public.sport_exercise_variants enable row level security;
alter table public.sport_exercise_media enable row level security;
alter table public.sport_workout_sessions enable row level security;
alter table public.sport_workout_steps enable row level security;
alter table public.sport_workout_feedback enable row level security;

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

drop policy if exists sport_exercises_select_catalog on public.sport_exercises;
create policy sport_exercises_select_catalog on public.sport_exercises
for select to anon, authenticated using (true);

drop policy if exists sport_exercise_variants_select_catalog on public.sport_exercise_variants;
create policy sport_exercise_variants_select_catalog on public.sport_exercise_variants
for select to anon, authenticated using (true);

drop policy if exists sport_exercise_media_select_catalog on public.sport_exercise_media;
create policy sport_exercise_media_select_catalog on public.sport_exercise_media
for select to anon, authenticated using (true);

drop policy if exists sport_profiles_select_own on public.sport_profiles;
create policy sport_profiles_select_own on public.sport_profiles
for select using (user_id = auth.uid());

drop policy if exists sport_profiles_insert_own on public.sport_profiles;
create policy sport_profiles_insert_own on public.sport_profiles
for insert with check (user_id = auth.uid());

drop policy if exists sport_profiles_update_own on public.sport_profiles;
create policy sport_profiles_update_own on public.sport_profiles
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists sport_profiles_delete_own on public.sport_profiles;
create policy sport_profiles_delete_own on public.sport_profiles
for delete using (user_id = auth.uid());

drop policy if exists sport_user_equipment_select_own on public.sport_user_equipment;
create policy sport_user_equipment_select_own on public.sport_user_equipment
for select using (user_id = auth.uid());

drop policy if exists sport_user_equipment_insert_own on public.sport_user_equipment;
create policy sport_user_equipment_insert_own on public.sport_user_equipment
for insert with check (user_id = auth.uid());

drop policy if exists sport_user_equipment_update_own on public.sport_user_equipment;
create policy sport_user_equipment_update_own on public.sport_user_equipment
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists sport_user_equipment_delete_own on public.sport_user_equipment;
create policy sport_user_equipment_delete_own on public.sport_user_equipment
for delete using (user_id = auth.uid());

drop policy if exists sport_user_limitations_select_own on public.sport_user_limitations;
create policy sport_user_limitations_select_own on public.sport_user_limitations
for select using (user_id = auth.uid());

drop policy if exists sport_user_limitations_insert_own on public.sport_user_limitations;
create policy sport_user_limitations_insert_own on public.sport_user_limitations
for insert with check (user_id = auth.uid());

drop policy if exists sport_user_limitations_update_own on public.sport_user_limitations;
create policy sport_user_limitations_update_own on public.sport_user_limitations
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists sport_user_limitations_delete_own on public.sport_user_limitations;
create policy sport_user_limitations_delete_own on public.sport_user_limitations
for delete using (user_id = auth.uid());

drop policy if exists sport_user_capabilities_select_own on public.sport_user_capabilities;
create policy sport_user_capabilities_select_own on public.sport_user_capabilities
for select using (user_id = auth.uid());

drop policy if exists sport_user_capabilities_insert_own on public.sport_user_capabilities;
create policy sport_user_capabilities_insert_own on public.sport_user_capabilities
for insert with check (user_id = auth.uid());

drop policy if exists sport_user_capabilities_update_own on public.sport_user_capabilities;
create policy sport_user_capabilities_update_own on public.sport_user_capabilities
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists sport_user_capabilities_delete_own on public.sport_user_capabilities;
create policy sport_user_capabilities_delete_own on public.sport_user_capabilities
for delete using (user_id = auth.uid());

drop policy if exists sport_workout_sessions_select_own on public.sport_workout_sessions;
create policy sport_workout_sessions_select_own on public.sport_workout_sessions
for select using (user_id = auth.uid());

drop policy if exists sport_workout_sessions_insert_own on public.sport_workout_sessions;
create policy sport_workout_sessions_insert_own on public.sport_workout_sessions
for insert with check (user_id = auth.uid());

drop policy if exists sport_workout_sessions_update_own on public.sport_workout_sessions;
create policy sport_workout_sessions_update_own on public.sport_workout_sessions
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists sport_workout_sessions_delete_own on public.sport_workout_sessions;
create policy sport_workout_sessions_delete_own on public.sport_workout_sessions
for delete using (user_id = auth.uid());

drop policy if exists sport_workout_steps_select_own on public.sport_workout_steps;
create policy sport_workout_steps_select_own on public.sport_workout_steps
for select using (user_id = auth.uid());

drop policy if exists sport_workout_steps_insert_own on public.sport_workout_steps;
create policy sport_workout_steps_insert_own on public.sport_workout_steps
for insert with check (user_id = auth.uid());

drop policy if exists sport_workout_steps_update_own on public.sport_workout_steps;
create policy sport_workout_steps_update_own on public.sport_workout_steps
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists sport_workout_steps_delete_own on public.sport_workout_steps;
create policy sport_workout_steps_delete_own on public.sport_workout_steps
for delete using (user_id = auth.uid());

drop policy if exists sport_workout_feedback_select_own on public.sport_workout_feedback;
create policy sport_workout_feedback_select_own on public.sport_workout_feedback
for select using (user_id = auth.uid());

drop policy if exists sport_workout_feedback_insert_own on public.sport_workout_feedback;
create policy sport_workout_feedback_insert_own on public.sport_workout_feedback
for insert with check (user_id = auth.uid());

drop policy if exists sport_workout_feedback_update_own on public.sport_workout_feedback;
create policy sport_workout_feedback_update_own on public.sport_workout_feedback
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists sport_workout_feedback_delete_own on public.sport_workout_feedback;
create policy sport_workout_feedback_delete_own on public.sport_workout_feedback
for delete using (user_id = auth.uid());
