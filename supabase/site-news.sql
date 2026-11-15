-- Site news: shared storage for all devices
create table if not exists public.empire_site_news (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  author_id uuid not null references public.empire_profiles(id) on delete cascade,
  title text not null,
  body text not null,
  image_url text not null default '',
  role_label text not null default 'Участник',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.empire_site_news enable row level security;

drop policy if exists "Site news is publicly readable" on public.empire_site_news;
create policy "Site news is publicly readable"
  on public.empire_site_news for select
  using (true);

drop policy if exists "Site news officers can publish" on public.empire_site_news;
create policy "Site news officers can publish"
  on public.empire_site_news for insert to authenticated
  with check (
    author_id = auth.uid()
    and (
      exists (
        select 1 from public.empire_regiments r
        where r.commander_id = auth.uid()
      )
      or exists (
        select 1 from public.empire_regiment_members m
        where m.user_id = auth.uid()
          and m.left_at is null
          and m.role in ('commander','officer')
      )
    )
  );

drop policy if exists "Site news authors can update" on public.empire_site_news;
create policy "Site news authors can update"
  on public.empire_site_news for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists "Site news authors can delete" on public.empire_site_news;
create policy "Site news authors can delete"
  on public.empire_site_news for delete to authenticated
  using (author_id = auth.uid());

create index if not exists empire_site_news_created_at_idx
  on public.empire_site_news(created_at desc);
