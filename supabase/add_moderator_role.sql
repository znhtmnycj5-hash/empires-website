-- Роль модератора для панели управления Clanwars.
-- Выполнить в Supabase Dashboard -> SQL Editor.

alter table public.empire_profiles
  add column if not exists is_moderator boolean not null default false;

create or replace function public.empire_prevent_admin_self_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and (old.is_admin is distinct from new.is_admin
          or old.is_moderator is distinct from new.is_moderator) then
    raise exception 'Only database administrators can change staff roles';
  end if;
  return new;
end;
$$;

-- Назначить модератора по точному нику (раскомментировать и заменить ник).
-- update public.empire_profiles
-- set is_moderator = true
-- where lower(display_name) = lower('НИКНЕЙМ');
