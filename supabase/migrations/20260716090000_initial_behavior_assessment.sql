alter table public.profiles
  add column if not exists initial_behavior_assessment jsonb;
