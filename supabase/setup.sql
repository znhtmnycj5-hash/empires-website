-- EMPIRE: Supabase setup for real user accounts and shared comments
-- Run this entire file once in Supabase Dashboard -> SQL Editor -> New query.

create extension if not exists pgcrypto;

create table if not exists public.empire_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  regiment text not null default '',
  avatar_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists empire_profiles_display_name_unique
  on public.empire_profiles (lower(display_name));

create or replace function public.empire_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wanted_name text;
begin
  wanted_name := trim(coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Игрок'));
  if wanted_name = '' then wanted_name := 'Игрок'; end if;

  insert into public.empire_profiles (id, display_name)
  values (new.id, wanted_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists empire_auth_user_created on auth.users;
create trigger empire_auth_user_created
  after insert on auth.users
  for each row execute procedure public.empire_handle_new_user();

create table if not exists public.empire_comments (
  id uuid primary key default gen_random_uuid(),
  context_type text not null check (context_type in ('battle','campaign','regiment_news','site_news')),
  context_id text not null,
  parent_id uuid references public.empire_comments(id) on delete cascade,
  author_id uuid not null references public.empire_profiles(id) on delete cascade,
  author_name text not null,
  author_regiment text not null default '',
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists empire_comments_context_created_idx
  on public.empire_comments (context_type, context_id, created_at);
create index if not exists empire_comments_parent_idx
  on public.empire_comments (parent_id);

create or replace function public.empire_stamp_comment_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row public.empire_profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if tg_op = 'INSERT' then
    new.author_id := auth.uid();
  elsif old.author_id <> auth.uid() then
    raise exception 'You can only edit your own comments';
  end if;

  select * into profile_row
  from public.empire_profiles
  where id = auth.uid();

  if not found then
    raise exception 'User profile not found';
  end if;

  new.author_name := profile_row.display_name;
  new.author_regiment := profile_row.regiment;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists empire_comments_stamp_author on public.empire_comments;
create trigger empire_comments_stamp_author
  before insert or update on public.empire_comments
  for each row execute procedure public.empire_stamp_comment_author();

alter table public.empire_profiles enable row level security;
alter table public.empire_comments enable row level security;

drop policy if exists "Profiles are publicly readable" on public.empire_profiles;
create policy "Profiles are publicly readable"
  on public.empire_profiles for select
  using (true);

drop policy if exists "Users can create their own profile" on public.empire_profiles;
create policy "Users can create their own profile"
  on public.empire_profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.empire_profiles;
create policy "Users can update their own profile"
  on public.empire_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Comments are publicly readable" on public.empire_comments;
create policy "Comments are publicly readable"
  on public.empire_comments for select
  using (true);

drop policy if exists "Authenticated users can add comments" on public.empire_comments;
create policy "Authenticated users can add comments"
  on public.empire_comments for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "Authors can edit their own comments" on public.empire_comments;
create policy "Authors can edit their own comments"
  on public.empire_comments for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "Authors can delete their own comments" on public.empire_comments;
create policy "Authors can delete their own comments"
  on public.empire_comments for delete
  to authenticated
  using (auth.uid() = author_id);

-- Public read is required to display uploaded comment media on the public site.
-- Upload, replacement and deletion are restricted to the authenticated user's own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comment-media',
  'comment-media',
  true,
  52428800,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/webm','audio/ogg','audio/mp4','audio/mpeg']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Comment media is publicly readable" on storage.objects;
create policy "Comment media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'comment-media');

drop policy if exists "Users upload their own comment media" on storage.objects;
create policy "Users upload their own comment media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'comment-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update their own comment media" on storage.objects;
create policy "Users update their own comment media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'comment-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'comment-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete their own comment media" on storage.objects;
create policy "Users delete their own comment media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'comment-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
