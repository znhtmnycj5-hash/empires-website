-- EMPIRE — initial Supabase schema
-- Run this file once in Supabase SQL Editor.
-- Safe for the current demo: it creates the database foundation without
-- removing or changing the existing localStorage data.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text,
  motto text,
  avatar_url text,
  status text not null default 'offline' check (status in ('online','offline')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user','moderator','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.regiments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  faction text not null check (faction in (
    'Французская империя',
    'Австрийская Империя',
    'Пруссия',
    'Российская империя',
    'Рейнский Союз',
    'Британская Империя'
  )),
  commander_id uuid references public.profiles(id) on delete set null,
  logo_url text,
  description text,
  rating integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.regiment_members (
  regiment_id uuid not null references public.regiments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'soldier' check (member_role in ('commander','officer','soldier')),
  joined_at timestamptz not null default now(),
  primary key (regiment_id, user_id)
);

create index if not exists idx_regiment_members_user on public.regiment_members(user_id);
create index if not exists idx_regiments_commander on public.regiments(commander_id);

-- Automatically create a profile + basic role when a new Auth user registers.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username',''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists regiments_set_updated_at on public.regiments;
create trigger regiments_set_updated_at
before update on public.regiments
for each row execute procedure public.set_updated_at();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.regiments enable row level security;
alter table public.regiment_members enable row level security;

-- Profiles: everyone can read public profiles; users can edit only their own.
drop policy if exists profiles_select_public on public.profiles;
create policy profiles_select_public on public.profiles
for select using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

-- Roles are readable by the owning user only from the browser.
drop policy if exists roles_select_own on public.user_roles;
create policy roles_select_own on public.user_roles
for select using (auth.uid() = user_id);

-- Regiments are public to read. Creation is restricted to authenticated users.
drop policy if exists regiments_select_public on public.regiments;
create policy regiments_select_public on public.regiments
for select using (true);

drop policy if exists regiments_insert_authenticated on public.regiments;
create policy regiments_insert_authenticated on public.regiments
for insert to authenticated with check (auth.uid() = commander_id);

-- Membership is public to read; authenticated users may request their own membership row.
drop policy if exists regiment_members_select_public on public.regiment_members;
create policy regiment_members_select_public on public.regiment_members
for select using (true);

drop policy if exists regiment_members_insert_self on public.regiment_members;
create policy regiment_members_insert_self on public.regiment_members
for insert to authenticated with check (auth.uid() = user_id);

-- Storage bucket for avatars; create the bucket in Storage UI or uncomment the
-- following insert if your project permits direct storage catalog inserts.
-- insert into storage.buckets (id, name, public) values ('avatars','avatars',true)
-- on conflict (id) do nothing;
