alter table public.profiles
  add column if not exists dark_mode boolean default false;

update public.profiles
set dark_mode = false
where dark_mode is null;
