-- Отдельные полномочия главного администратора Clanwars.
-- Главный администратор определяется по точному нику Commander при первом выполнении.
create table if not exists public.empire_admin_action_log (\n  id bigint generated always as identity primary key,\n  actor_id uuid, actor_name text not null, target_id uuid, target_name text not null,\n  action text not null, created_at timestamptz not null default now()\n);\n\ncreate table if not exists public.empire_super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.empire_super_admins enable row level security;
revoke all on public.empire_super_admins from anon, authenticated;

do $$
declare
  matches_count integer;
  commander_id uuid;
begin
  select count(*), (array_agg(id))[1] into matches_count, commander_id
  from public.empire_profiles
  where lower(btrim(display_name)) = lower('Commander');
  if matches_count <> 1 then
    raise exception 'Для главного администратора должен существовать ровно один профиль с ником Commander. Найдено: %', matches_count;
  end if;
  insert into public.empire_super_admins(user_id)
  values(commander_id) on conflict(user_id) do nothing;
  update public.empire_profiles set is_admin=true, is_moderator=false where id=commander_id;
end $$;

create or replace function public.empire_master_is_chief()
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(select 1 from public.empire_super_admins s where s.user_id=auth.uid());
$$;
revoke all on function public.empire_master_is_chief() from public, anon;
grant execute on function public.empire_master_is_chief() to authenticated;

create or replace function public.empire_master_list_staff()
returns table(id uuid, display_name text, is_admin boolean, is_moderator boolean, created_at timestamptz)
language plpgsql
security definer
set search_path=''
as $$
begin
  if not exists(select 1 from public.empire_super_admins s where s.user_id=auth.uid()) then
    raise exception 'Доступ только главному администратору';
  end if;
  return query
    select p.id,p.display_name,coalesce(p.is_admin,false),coalesce(p.is_moderator,false),p.created_at
    from public.empire_profiles p
    where coalesce(p.is_admin,false)=true or coalesce(p.is_moderator,false)=true
    order by p.is_admin desc,p.is_moderator desc,p.display_name;
end;
$$;
revoke all on function public.empire_master_list_staff() from public, anon;
grant execute on function public.empire_master_list_staff() to authenticated;

create or replace function public.empire_master_manage_staff(p_target_id uuid,p_action text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  target_name text;
  target_is_admin boolean;
  target_is_moderator boolean;
  actor_name text;
begin
  if auth.uid() is null or not exists(select 1 from public.empire_super_admins s where s.user_id=auth.uid()) then
    raise exception 'Только главный администратор может управлять должностями';
  end if;
  if p_target_id is null or p_target_id=auth.uid() then
    raise exception 'Нельзя изменить собственную учётную запись';
  end if;
  if exists(select 1 from public.empire_super_admins s where s.user_id=p_target_id) then
    raise exception 'Нельзя изменить права главного администратора';
  end if;
  select display_name,coalesce(is_admin,false),coalesce(is_moderator,false)
    into target_name,target_is_admin,target_is_moderator
    from public.empire_profiles where id=p_target_id for update;
  if target_name is null then raise exception 'Пользователь не найден'; end if;

  if p_action='remove_admin' then
    if not target_is_admin then raise exception 'Пользователь не является администратором'; end if;
    if (select count(*) from public.empire_profiles where is_admin=true)<=1 then
      raise exception 'Нельзя снять последнего администратора';
    end if;
    update public.empire_profiles set is_admin=false where id=p_target_id;
    p_action := 'Снят с должности администратора';
  elsif p_action='remove_moderator' then
    if not target_is_moderator then raise exception 'Пользователь не является модератором'; end if;
    update public.empire_profiles set is_moderator=false where id=p_target_id;
    p_action := 'Снят с должности модератора';
  elsif p_action='make_admin' then
    update public.empire_profiles set is_admin=true,is_moderator=false where id=p_target_id;
    p_action := 'Назначен администратором главным администратором';
  elsif p_action='make_moderator' then
    update public.empire_profiles set is_admin=false,is_moderator=true where id=p_target_id;
    p_action := 'Назначен модератором главным администратором';
  else
    raise exception 'Неизвестное действие';
  end if;

  select display_name into actor_name from public.empire_profiles where id=auth.uid();
  insert into public.empire_admin_action_log(actor_id,actor_name,target_id,target_name,action)
  values(auth.uid(),coalesce(actor_name,'Commander'),p_target_id,target_name,p_action);
  return jsonb_build_object('ok',true,'target',target_name,'action',p_action);
end;
$$;
revoke all on function public.empire_master_manage_staff(uuid,text) from public, anon;
grant execute on function public.empire_master_manage_staff(uuid,text) to authenticated;

-- Обычные администраторы не могут назначать/снимать должности администрации.
-- Они сохраняют возможность удалять обычные аккаунты из своей панели.
create or replace function public.empire_admin_manage_user(p_target_id uuid,p_action text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  actor_name text;
  target_name text;
  target_admin boolean;
  target_moderator boolean;
  actor_is_master boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select display_name into actor_name from public.empire_profiles where id=auth.uid() and is_admin=true;
  if actor_name is null then raise exception 'Only administrators can manage users'; end if;
  actor_is_master := exists(select 1 from public.empire_super_admins s where s.user_id=auth.uid());
  if p_target_id is null then raise exception 'Target user is required'; end if;
  if p_target_id=auth.uid() then raise exception 'You cannot change or delete your own account here'; end if;
  if exists(select 1 from public.empire_super_admins s where s.user_id=p_target_id) then
    raise exception 'Учётная запись главного администратора защищена';
  end if;

  select display_name,coalesce(is_admin,false),coalesce(is_moderator,false)
    into target_name,target_admin,target_moderator
    from public.empire_profiles where id=p_target_id for update;
  if target_name is null then raise exception 'User not found'; end if;

  if p_action in ('admin','moderator') and not actor_is_master then
    raise exception 'Назначать администраторов и модераторов может только главный администратор';
  end if;
  if (target_admin or target_moderator) and not actor_is_master then
    raise exception 'Управлять действующими администраторами и модераторами может только главный администратор';
  end if;

  if p_action='admin' then
    update public.empire_profiles set is_admin=true,is_moderator=false where id=p_target_id;
    insert into public.empire_admin_action_log(actor_id,actor_name,target_id,target_name,action)
    values(auth.uid(),actor_name,p_target_id,target_name,'Назначен администратором');
  elsif p_action='moderator' then
    update public.empire_profiles set is_admin=false,is_moderator=true where id=p_target_id;
    insert into public.empire_admin_action_log(actor_id,actor_name,target_id,target_name,action)
    values(auth.uid(),actor_name,p_target_id,target_name,'Назначен модератором');
  elsif p_action='delete' then
    if target_admin and (select count(*) from public.empire_profiles where is_admin=true)<=1 then
      raise exception 'Нельзя удалить последнего администратора';
    end if;
    insert into public.empire_admin_action_log(actor_id,actor_name,target_id,target_name,action)
    values(auth.uid(),actor_name,p_target_id,target_name,'Удалён с сайта');
    delete from auth.users where id=p_target_id;
  else
    raise exception 'Unknown action';
  end if;
  return jsonb_build_object('ok',true,'action',p_action);
end;
$$;
revoke execute on function public.empire_admin_manage_user(uuid,text) from public,anon;
grant execute on function public.empire_admin_manage_user(uuid,text) to authenticated;
