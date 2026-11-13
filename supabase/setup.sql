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


-- Public profile avatars. Email addresses are intentionally not stored in empire_profiles.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars','profile-avatars',true,5242880,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Profile avatars are publicly readable" on storage.objects;
create policy "Profile avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'profile-avatars');

drop policy if exists "Users upload their own profile avatar" on storage.objects;
create policy "Users upload their own profile avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users update their own profile avatar" on storage.objects;
create policy "Users update their own profile avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete their own profile avatar" on storage.objects;
create policy "Users delete their own profile avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);


-- ============================================================
-- EMPIRE community features: profiles, presence, regiments,
-- applications, service history and private messages.
-- Run this section after the original setup above.
-- ============================================================

alter table public.empire_profiles
  add column if not exists last_seen_at timestamptz;

create table if not exists public.empire_regiments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  faction text not null default '',
  logo_url text not null default '',
  commander_id uuid references public.empire_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.empire_regiment_members (
  id uuid primary key default gen_random_uuid(),
  regiment_id uuid not null references public.empire_regiments(id) on delete cascade,
  user_id uuid not null references public.empire_profiles(id) on delete cascade,
  role text not null default 'soldier' check (role in ('commander','officer','soldier')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists empire_active_regiment_member_unique
  on public.empire_regiment_members(user_id)
  where left_at is null;
create index if not exists empire_regiment_members_regiment_idx
  on public.empire_regiment_members(regiment_id, left_at);
create index if not exists empire_regiment_members_user_idx
  on public.empire_regiment_members(user_id, joined_at);

create table if not exists public.empire_regiment_applications (
  id uuid primary key default gen_random_uuid(),
  regiment_id uuid not null references public.empire_regiments(id) on delete cascade,
  user_id uuid not null references public.empire_profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.empire_profiles(id) on delete set null
);
create unique index if not exists empire_regiment_pending_application_unique
  on public.empire_regiment_applications(regiment_id,user_id)
  where status='pending';
create index if not exists empire_regiment_applications_regiment_idx
  on public.empire_regiment_applications(regiment_id,status,created_at);

create table if not exists public.empire_private_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.empire_profiles(id) on delete cascade,
  recipient_id uuid not null references public.empire_profiles(id) on delete cascade,
  content text not null check (length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists empire_private_messages_pair_idx
  on public.empire_private_messages(sender_id,recipient_id,created_at);
create index if not exists empire_private_messages_recipient_idx
  on public.empire_private_messages(recipient_id,created_at);

-- Seed the 15 existing EMPIRE regiments into the shared database.
insert into public.empire_regiments(name,faction,logo_url)
values
 ('1st Regiment','Французская Империя','assets/1st.jpg'),
 ('95th Rifles','Британская Империя','assets/95.webp'),
 ('84e Régiment','Французская Империя','assets/84e.png'),
 ('Preobrazhensky','Российская Империя','assets/preobraz.webp'),
 ('7th Hussars','Британская Империя','assets/hussars.png'),
 ('13e Léger','Французская Империя','assets/1st.jpg'),
 ('33e Ligne','Британская Империя','assets/95.webp'),
 ('92nd Gordon Highlanders','Британская Империя','assets/84e.png'),
 ('Semenovsky','Российская Империя','assets/preobraz.webp'),
 ('King''s German Legion','Британская Империя','assets/kgr.png'),
 ('6e Hussards','Французская Империя','assets/1st.jpg'),
 ('Royal Scots','Британская Империя','assets/95.webp'),
 ('Баварский Полк','Рейнский Союз','assets/Bav.jpg'),
 ('Totenkopf','Пруссия','assets/avatar-prussia.png'),
 ('Mangust','Австрийская Империя','assets/mangust.webp')
on conflict(name) do update
set faction=excluded.faction, logo_url=excluded.logo_url;

-- Existing profile.regiment values become the initial service history.
insert into public.empire_regiment_members(regiment_id,user_id,role,joined_at)
select r.id,p.id,
       case when r.commander_id=p.id then 'commander' else 'soldier' end,
       coalesce(p.created_at,now())
from public.empire_profiles p
join public.empire_regiments r on lower(r.name)=lower(trim(p.regiment))
where trim(coalesce(p.regiment,'')) <> ''
  and not exists (
    select 1 from public.empire_regiment_members m
    where m.regiment_id=r.id and m.user_id=p.id and m.left_at is null
  );

-- Known test commanders from the existing site data.
update public.empire_regiments r
set commander_id=p.id
from public.empire_profiles p
where lower(p.display_name)=lower(
  case r.name
    when '1st Regiment' then 'Ankord'
    when '95th Rifles' then 'Richard Hawthorne'
    when '84e Régiment' then 'Pierre Delacroix'
    when 'Preobrazhensky' then 'Алексей Воронцов'
    when '7th Hussars' then 'William Harrington'
    when '13e Léger' then 'Étienne Morel'
    when '33e Ligne' then 'Thomas Clarke'
    when '92nd Gordon Highlanders' then 'Alexander MacLeod'
    when 'Semenovsky' then 'Николай Орлов'
    when 'King''s German Legion' then 'Friedrich von Keller'
    when '6e Hussards' then 'Louis Beaumont'
    when 'Royal Scots' then 'James Campbell'
    when 'Баварский Полк' then 'Maximilian von Bayern'
    when 'Totenkopf' then 'Friedrich Adler'
    when 'Mangust' then 'Johann von Habsburg'
  end
)
where r.commander_id is null;

alter table public.empire_regiments enable row level security;
alter table public.empire_regiment_members enable row level security;
alter table public.empire_regiment_applications enable row level security;
alter table public.empire_private_messages enable row level security;

drop policy if exists "Regiments are publicly readable" on public.empire_regiments;
create policy "Regiments are publicly readable"
on public.empire_regiments for select using (true);

drop policy if exists "Members are publicly readable" on public.empire_regiment_members;
create policy "Members are publicly readable"
on public.empire_regiment_members for select using (true);

drop policy if exists "Users can join as themselves" on public.empire_regiment_members;
create policy "Users can join as themselves"
on public.empire_regiment_members for insert to authenticated
with check (auth.uid() = user_id and left_at is null);

drop policy if exists "Users can leave their own membership" on public.empire_regiment_members;
create policy "Users can leave their own membership"
on public.empire_regiment_members for update to authenticated
using (auth.uid() = user_id and left_at is null)
with check (auth.uid() = user_id);

drop policy if exists "Applications are publicly readable" on public.empire_regiment_applications;
create policy "Applications are publicly readable"
on public.empire_regiment_applications for select to authenticated using (true);

drop policy if exists "Users can submit their own applications" on public.empire_regiment_applications;
create policy "Users can submit their own applications"
on public.empire_regiment_applications for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Commanders can review applications" on public.empire_regiment_applications;
create policy "Commanders can review applications"
on public.empire_regiment_applications for update to authenticated
using (
  exists (
    select 1 from public.empire_regiments r
    where r.id=empire_regiment_applications.regiment_id
      and r.commander_id=auth.uid()
  )
)
with check (
  exists (
    select 1 from public.empire_regiments r
    where r.id=empire_regiment_applications.regiment_id
      and r.commander_id=auth.uid()
  )
);

drop policy if exists "Private messages are readable by participants" on public.empire_private_messages;
create policy "Private messages are readable by participants"
on public.empire_private_messages for select to authenticated
using (auth.uid()=sender_id or auth.uid()=recipient_id);

drop policy if exists "Users can send private messages" on public.empire_private_messages;
create policy "Users can send private messages"
on public.empire_private_messages for insert to authenticated
with check (auth.uid()=sender_id);

drop policy if exists "Users can update own presence" on public.empire_profiles;
create policy "Users can update own presence"
on public.empire_profiles for update to authenticated
using (auth.uid()=id)
with check (auth.uid()=id);

-- Keep profile.regiment synchronized with active membership.
create or replace function public.empire_sync_profile_regiment()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_name text;
begin
  if tg_op='DELETE' then
    if old.left_at is null then
      update public.empire_profiles set regiment='',updated_at=now() where id=old.user_id;
    end if;
    return old;
  end if;

  if new.left_at is null then
    select r.name into v_name from public.empire_regiments r where r.id=new.regiment_id;
    update public.empire_profiles set regiment=coalesce(v_name,''),updated_at=now() where id=new.user_id;
  elsif tg_op='UPDATE' and old.left_at is null and new.left_at is not null then
    update public.empire_profiles set regiment='',updated_at=now() where id=new.user_id;
  end if;
  return new;
end;
$$;
drop trigger if exists empire_sync_profile_regiment_trigger on public.empire_regiment_members;
create trigger empire_sync_profile_regiment_trigger
after insert or update or delete on public.empire_regiment_members
for each row execute procedure public.empire_sync_profile_regiment();

-- One secure operation handles commander review and membership creation.
create or replace function public.empire_review_regiment_application(
  p_application_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  a public.empire_regiment_applications%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into a from public.empire_regiment_applications where id=p_application_id for update;
  if not found then raise exception 'Application not found'; end if;
  if not exists(select 1 from public.empire_regiments r where r.id=a.regiment_id and r.commander_id=auth.uid()) then
    raise exception 'Only the regiment commander can review applications';
  end if;
  if p_decision not in ('accepted','rejected') then raise exception 'Invalid decision'; end if;

  update public.empire_regiment_applications
  set status=p_decision,reviewed_at=now(),reviewed_by=auth.uid()
  where id=a.id;

  if p_decision='accepted' then
    update public.empire_regiment_members set left_at=now()
    where user_id=a.user_id and left_at is null;

    insert into public.empire_regiment_members(regiment_id,user_id,role,joined_at)
    values(a.regiment_id,a.user_id,'soldier',now());
  end if;

  return jsonb_build_object('ok',true,'status',p_decision);
end;
$$;
revoke execute on function public.empire_review_regiment_application(uuid,text) from public,anon;
grant execute on function public.empire_review_regiment_application(uuid,text) to authenticated;

-- Delete the current account, including its profile avatar objects.
create or replace function public.empire_delete_my_account()
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  delete from storage.objects
  where bucket_id='profile-avatars'
    and (storage.foldername(name))[1]=auth.uid()::text;
  delete from auth.users where id=auth.uid();
end;
$$;
revoke execute on function public.empire_delete_my_account() from public,anon;
grant execute on function public.empire_delete_my_account() to authenticated;
