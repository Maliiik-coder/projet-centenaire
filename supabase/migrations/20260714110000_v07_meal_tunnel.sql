alter table public.meal_observations
  add column if not exists serving_pattern text;

alter table public.meal_observations
  add column if not exists starter_taken boolean;

alter table public.meal_observations
  add column if not exists starter_text text;

alter table public.meal_observations
  add column if not exists dessert_taken boolean;

alter table public.meal_observations
  add column if not exists dessert_text text;

alter table public.meal_observations
  add column if not exists snack_trigger text;

alter table public.meal_observations
  add column if not exists snack_context text;

alter table public.meal_observations
  add column if not exists clarifications jsonb default '[]'::jsonb;

alter table public.meal_observations
  add column if not exists questionnaire_version text;

update public.meal_observations
set
  serving_pattern = case
    when serving_pattern is not null then serving_pattern
    when quantity_served = 'two-plates' then 'once'
    when quantity_served = 'three-plus-plates' then 'multiple'
    else 'none'
  end,
  starter_taken = coalesce(starter_taken, false),
  dessert_taken = coalesce(dessert_taken, false),
  clarifications = coalesce(clarifications, '[]'::jsonb),
  questionnaire_version = coalesce(questionnaire_version, 'legacy');
