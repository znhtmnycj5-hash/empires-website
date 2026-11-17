-- Управление пользователями и журнал действий администраторов Clanwars
create table if not exists public.empire_admin_action_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_name text not null,
  target_id uuid,
  target_name text not null,
  action text not null,
  created_at timestamptz not null default now()
);
alter table public.empire_admin_action_log enable row level security;
grant select on public.empire_admin_action_log to authenticated;
drop policy if exists "Admins can read admin action log" on public.empire_admin_action_log;
create policy "Admins can read admin action log"
on public.empire_admin_action_log for select to authenticated
using (exists(select 1 from public.empire_profiles p where p.id=auth.uid() and (p.is_admin=true or p.is_moderator=true)));

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
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select display_name into actor_name from public.empire_profiles where id=auth.uid() and is_admin=true;
  if actor_name is null then raise exception 'Only administrators can manage users'; end if;
  if p_target_id is null then raise exception 'Target user is required'; end if;
  if p_target_id=auth.uid() then raise exception 'You cannot change or delete your own account here'; end if;

  select display_name,coalesce(is_admin,false) into target_name,target_admin
  from public.empire_profiles where id=p_target_id for update;
  if target_name is null then raise exception 'User not found'; end if;

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

-- Общая запись прочих действий модераторов и администраторов панели.
create or replace function public.empire_admin_log_action(p_target_name text,p_action text)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare actor_name text;
begin
  select display_name into actor_name from public.empire_profiles
  where id=auth.uid() and (is_admin=true or is_moderator=true);
  if actor_name is null then raise exception 'Only staff can write the action log'; end if;
  insert into public.empire_admin_action_log(actor_id,actor_name,target_name,action)
  values(auth.uid(),actor_name,left(coalesce(p_target_name,'—'),160),left(coalesce(p_action,'Действие'),300));
end;
$$;
revoke execute on function public.empire_admin_log_action(text,text) from public,anon;
grant execute on function public.empire_admin_log_action(text,text) to authenticated;
