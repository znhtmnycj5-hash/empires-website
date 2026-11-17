-- Clanwars Forum
-- Run this once in Supabase SQL Editor.
-- The forum page uses icon/i6.png for topics and icon/i5.png for discussions.

alter table public.empire_profiles
  add column if not exists is_moderator boolean not null default false;

create table if not exists public.empire_forum_topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  icon_url text not null default 'icon/i6.png',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.empire_forum_discussions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.empire_forum_topics(id) on delete cascade,
  title text not null,
  description text not null default '',
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null default 'Пользователь',
  views bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_comment_at timestamptz
);

create index if not exists empire_forum_discussions_topic_idx
  on public.empire_forum_discussions(topic_id, updated_at desc);

create index if not exists empire_forum_discussions_views_idx
  on public.empire_forum_discussions(views);

alter table public.empire_forum_topics enable row level security;
alter table public.empire_forum_discussions enable row level security;

drop policy if exists "Forum topics are public" on public.empire_forum_topics;
create policy "Forum topics are public"
  on public.empire_forum_topics
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Forum topics staff can create" on public.empire_forum_topics;
create policy "Forum topics staff can create"
  on public.empire_forum_topics
  for insert
  to authenticated
  with check ((select private.is_forum_staff()));

drop policy if exists "Forum topics staff can update" on public.empire_forum_topics;
create policy "Forum topics staff can update"
  on public.empire_forum_topics
  for update
  to authenticated
  using ((select private.is_forum_staff()))
  with check ((select private.is_forum_staff()));

drop policy if exists "Forum topics staff can delete" on public.empire_forum_topics;
create policy "Forum topics staff can delete"
  on public.empire_forum_topics
  for delete
  to authenticated
  using ((select private.is_forum_staff()));

drop policy if exists "Forum discussions are public" on public.empire_forum_discussions;
create policy "Forum discussions are public"
  on public.empire_forum_discussions
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated users can create discussions" on public.empire_forum_discussions;
create policy "Authenticated users can create discussions"
  on public.empire_forum_discussions
  for insert
  to authenticated
  with check ((select auth.uid()) = author_id);

drop policy if exists "Authors can update discussions" on public.empire_forum_discussions;
create policy "Authors can update discussions"
  on public.empire_forum_discussions
  for update
  to authenticated
  using ((select auth.uid()) = author_id or (select private.is_forum_staff()))
  with check ((select auth.uid()) = author_id or (select private.is_forum_staff()));

create schema if not exists private;

create or replace function private.is_forum_staff()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.empire_profiles p
    where p.id = (select auth.uid())
      and (coalesce(p.is_admin, false) or coalesce(p.is_moderator, false))
  );
$$;

revoke execute on function private.is_forum_staff() from public;
grant execute on function private.is_forum_staff() to authenticated;


create or replace function public.increment_forum_discussion_views(p_discussion_id uuid)
returns bigint
language sql
security definer
set search_path = ''
as $$
  update public.empire_forum_discussions
     set views = views + 1
   where id = p_discussion_id
  returning views;
$$;

revoke execute on function public.increment_forum_discussion_views(uuid) from public;
grant execute on function public.increment_forum_discussion_views(uuid) to anon, authenticated;

-- Initial forum structure requested for Clanwars.
insert into public.empire_forum_topics (id,title,description,icon_url)
values
  ('10000000-0000-0000-0000-000000000001','Модификации для Napoleonic Wars','Обсуждение модификаций для Napoleonic Wars.','icon/i6.png'),
  ('10000000-0000-0000-0000-000000000002','Карты для Napoleonic Wars','Обсуждение карт, сценариев и интересных мест для сражений.','icon/i6.png')
on conflict (id) do nothing;

insert into public.empire_forum_discussions (id,topic_id,title,description,author_name)
values
  ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Первая модификация','Обсуждение первой модификации.','Clanwars'),
  ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Вторая','Обсуждение второй модификации.','Clanwars'),
  ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','Карта первая','Обсуждение первой карты.','Clanwars'),
  ('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','Карта вторая','Обсуждение второй карты.','Clanwars')
on conflict (id) do nothing;
