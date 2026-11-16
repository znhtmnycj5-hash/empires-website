-- ClanWars: personal notification system
-- Run this file after the main Supabase setup.sql and battle/rating SQL files.

create table if not exists public.empire_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.empire_profiles(id) on delete cascade,
  type text not null check (type in (
    'private_message',
    'battle',
    'profile_rating',
    'regiment_created',
    'regiment_application',
    'regiment_member_left'
  )),
  title text not null,
  body text not null default '',
  link text not null default '',
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists empire_notifications_recipient_created_idx
  on public.empire_notifications(recipient_id, created_at desc);
create index if not exists empire_notifications_unread_idx
  on public.empire_notifications(recipient_id, read_at, created_at desc);

alter table public.empire_notifications enable row level security;

drop policy if exists "Users can read their own notifications" on public.empire_notifications;
create policy "Users can read their own notifications"
on public.empire_notifications for select to authenticated
using (auth.uid()=recipient_id);

drop policy if exists "Users can mark their own notifications read" on public.empire_notifications;
create policy "Users can mark their own notifications read"
on public.empire_notifications for update to authenticated
using (auth.uid()=recipient_id)
with check (auth.uid()=recipient_id);

create or replace function public.empire_add_notification(
  p_recipient_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_link text
)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  if p_recipient_id is null or p_recipient_id=auth.uid() then
    -- Self-notifications are intentionally allowed only for system-created events,
    -- so this function does not reject them.
    null;
  end if;

  insert into public.empire_notifications(recipient_id,type,title,body,link)
  values(p_recipient_id,p_type,p_title,coalesce(p_body,''),coalesce(p_link,''));
end;
$$;

revoke all on function public.empire_add_notification(uuid,text,text,text,text) from public,anon,authenticated;

-- New private message.
create or replace function public.empire_notify_private_message()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare sender_name text;
begin
  select display_name into sender_name
  from public.empire_profiles where id=new.sender_id;

  perform public.empire_add_notification(
    new.recipient_id,
    'private_message',
    'Новое сообщение',
    coalesce(sender_name,'Пользователь') || ' отправил вам сообщение.',
    'profile.html?user=' || coalesce((select display_name from public.empire_profiles where id=new.sender_id),'')
  );
  return new;
end;
$$;

drop trigger if exists empire_notify_private_message_trigger on public.empire_private_messages;
create trigger empire_notify_private_message_trigger
after insert on public.empire_private_messages
for each row execute procedure public.empire_notify_private_message();

-- New profile rating (+1 / -1).
create or replace function public.empire_notify_profile_rating()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare voter_name text; target_name text;
begin
  if tg_op='UPDATE' and old.value is not distinct from new.value then
    return new;
  end if;

  select display_name into voter_name from public.empire_profiles where id=new.voter_id;
  select display_name into target_name from public.empire_profiles where id=new.target_user_id;

  perform public.empire_add_notification(
    new.target_user_id,
    'profile_rating',
    'Изменение рейтинга профиля',
    coalesce(voter_name,'Пользователь') || ' поставил вам ' ||
      case when new.value>0 then '+1' else '−1' end || ' рейтинга.',
    'profile.html?user=' || coalesce(target_name,'')
  );
  return new;
end;
$$;

drop trigger if exists empire_notify_profile_rating_trigger on public.empire_user_ratings;
create trigger empire_notify_profile_rating_trigger
after insert or update on public.empire_user_ratings
for each row execute procedure public.empire_notify_profile_rating();

-- Accepted battle: notify active members of both participating regiments.
create or replace function public.empire_notify_accepted_battle()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  left_name text;
  right_name text;
  link text;
begin
  if not (old.status is distinct from new.status and new.status='accepted') then
    return new;
  end if;

  select name into left_name from public.empire_regiments where id=new.challenger_regiment_id;
  select name into right_name from public.empire_regiments where id=new.target_regiment_id;
  link := 'battle.html?id=' || new.id::text;

  insert into public.empire_notifications(recipient_id,type,title,body,link)
  select distinct m.user_id,
    'battle',
    'Предстоящее сражение',
    'Сражение ' || coalesce(left_name,'Полк') || ' — ' || coalesce(right_name,'Полк') ||
      ' принято. ' || to_char(new.scheduled_at at time zone 'Europe/Amsterdam','DD.MM.YYYY HH24:MI'),
    link
  from public.empire_regiment_members m
  where m.left_at is null
    and m.regiment_id in (new.challenger_regiment_id,new.target_regiment_id);

  return new;
end;
$$;

drop trigger if exists empire_notify_accepted_battle_trigger on public.empire_battle_challenges;
create trigger empire_notify_accepted_battle_trigger
after update on public.empire_battle_challenges
for each row execute procedure public.empire_notify_accepted_battle();

-- A new join application: notify the regiment commander and officers.
create or replace function public.empire_notify_regiment_application()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  applicant_name text;
  regiment_name text;
begin
  if new.status<>'pending' then return new; end if;

  select display_name into applicant_name from public.empire_profiles where id=new.user_id;
  select name into regiment_name from public.empire_regiments where id=new.regiment_id;

  insert into public.empire_notifications(recipient_id,type,title,body,link)
  select distinct m.user_id,
    'regiment_application',
    'Новая заявка в полк',
    coalesce(applicant_name,'Пользователь') || ' подал заявку на вступление в полк «' ||
      coalesce(regiment_name,'') || '».',
    'regiment.html?name=' || coalesce(regiment_name,'')
  from public.empire_regiment_members m
  where m.regiment_id=new.regiment_id
    and m.left_at is null
    and m.role in ('commander','officer');

  return new;
end;
$$;

drop trigger if exists empire_notify_regiment_application_trigger on public.empire_regiment_applications;
create trigger empire_notify_regiment_application_trigger
after insert on public.empire_regiment_applications
for each row execute procedure public.empire_notify_regiment_application();

-- A member leaving a regiment: notify commander and officers.
create or replace function public.empire_notify_member_left()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  leaver_name text;
  regiment_name text;
begin
  if old.left_at is not null or new.left_at is null then return new; end if;

  select display_name into leaver_name from public.empire_profiles where id=new.user_id;
  select name into regiment_name from public.empire_regiments where id=new.regiment_id;

  insert into public.empire_notifications(recipient_id,type,title,body,link)
  select distinct m.user_id,
    'regiment_member_left',
    'Участник покинул полк',
    coalesce(leaver_name,'Пользователь') || ' вышел из полка «' ||
      coalesce(regiment_name,'') || '».',
    'regiment.html?name=' || coalesce(regiment_name,'')
  from public.empire_regiment_members m
  where m.regiment_id=new.regiment_id
    and m.left_at is null
    and m.role in ('commander','officer')
    and m.user_id<>new.user_id;

  return new;
end;
$$;

drop trigger if exists empire_notify_member_left_trigger on public.empire_regiment_members;
create trigger empire_notify_member_left_trigger
after update on public.empire_regiment_members
for each row execute procedure public.empire_notify_member_left();

-- Approved regiment creation request.
create or replace function public.empire_notify_regiment_created()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if old.status is distinct from new.status and new.status='approved' then
    perform public.empire_add_notification(
      new.user_id,
      'regiment_created',
      'Полк создан',
      'Ваша заявка на создание полка «' || new.name || '» принята. Полк создан.',
      'regiment.html?name=' || new.name
    );
  end if;
  return new;
end;
$$;

drop trigger if exists empire_notify_regiment_created_trigger on public.empire_regiment_creation_requests;
create trigger empire_notify_regiment_created_trigger
after update on public.empire_regiment_creation_requests
for each row execute procedure public.empire_notify_regiment_created();

grant select, update on public.empire_notifications to authenticated;


-- ============================================
-- SUPABASE REALTIME
-- ============================================

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'empire_notifications'
  ) then
    alter publication supabase_realtime
      add table public.empire_notifications;
  end if;
end
$$;
