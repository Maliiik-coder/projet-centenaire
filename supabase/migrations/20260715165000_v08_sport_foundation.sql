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
