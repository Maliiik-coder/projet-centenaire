alter table public.profiles
  add column if not exists show_active_mission boolean default true;

update public.profiles
set show_active_mission = true
where show_active_mission is null;
