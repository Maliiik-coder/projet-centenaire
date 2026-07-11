alter table public.meal_observations
  add column if not exists observed_date date;

alter table public.meal_observations
  add column if not exists observed_time text;

update public.meal_observations
set
  observed_date = coalesce(observed_date, observed_at::date),
  observed_time = coalesce(observed_time, to_char(observed_at at time zone 'UTC', 'HH24:MI'))
where observed_date is null
   or observed_time is null;

with ranked_weights as (
  select
    id,
    row_number() over (
      partition by user_id, entry_date
      order by created_at desc, id desc
    ) as rank
  from public.weight_entries
)
delete from public.weight_entries
using ranked_weights
where public.weight_entries.id = ranked_weights.id
  and ranked_weights.rank > 1;

drop index if exists public.weight_entries_user_created_at_idx;

create unique index if not exists weight_entries_user_entry_date_idx
  on public.weight_entries (user_id, entry_date);

with ranked_explicit_none as (
  select
    id,
    row_number() over (
      partition by user_id, event_date
      order by created_at desc, id desc
    ) as rank
  from public.tobacco_events
  where event_type = 'aucun'
)
delete from public.tobacco_events
using ranked_explicit_none
where public.tobacco_events.id = ranked_explicit_none.id
  and ranked_explicit_none.rank > 1;

create unique index if not exists tobacco_events_one_explicit_none_per_day_idx
  on public.tobacco_events (user_id, event_date)
  where event_type = 'aucun';
