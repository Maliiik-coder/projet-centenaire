alter table public.meal_observations
  add column if not exists meal_structure jsonb;
