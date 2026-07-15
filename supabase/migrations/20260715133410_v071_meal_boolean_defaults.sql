alter table public.meal_observations
  alter column starter_taken set default false,
  alter column dessert_taken set default false;

update public.meal_observations
set
  starter_taken = coalesce(starter_taken, false),
  dessert_taken = coalesce(dessert_taken, false)
where starter_taken is null
   or dessert_taken is null;
