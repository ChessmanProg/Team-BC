alter table public.team_ic_logs
add column if not exists extension_minutes integer;

alter table public.team_ic_logs
add constraint team_ic_logs_extension_minutes_nonnegative
check (extension_minutes is null or extension_minutes >= 0);