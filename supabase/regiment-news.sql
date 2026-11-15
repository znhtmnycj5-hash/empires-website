-- Regiment news published by commanders and officers.
create table if not exists public.empire_regiment_news (
  id uuid primary key default gen_random_uuid(),
  regiment_id uuid not null references public.empire_regiments(id) on delete cascade,
  author_id uuid not null references public.empire_profiles(id) on delete cascade,
  title text not null,
  body text not null,
  image_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists empire_regiment_news_regiment_idx
  on public.empire_regiment_news(regiment_id, created_at desc);

alter table public.empire_regiment_news enable row level security;

drop policy if exists "Regiment news is publicly readable" on public.empire_regiment_news;
create policy "Regiment news is publicly readable"
  on public.empire_regiment_news for select using (true);

drop policy if exists "Commanders and officers publish regiment news" on public.empire_regiment_news;
create policy "Commanders and officers publish regiment news"
  on public.empire_regiment_news for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1
      from public.empire_regiment_members m
      where m.regiment_id = empire_regiment_news.regiment_id
        and m.user_id = auth.uid()
        and m.left_at is null
        and m.role in ('commander','officer')
    )
  );

drop policy if exists "Authors edit regiment news" on public.empire_regiment_news;
create policy "Authors edit regiment news"
  on public.empire_regiment_news for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists "Authors delete regiment news" on public.empire_regiment_news;
create policy "Authors delete regiment news"
  on public.empire_regiment_news for delete to authenticated
  using (author_id = auth.uid());

create or replace function public.empire_publish_regiment_news(
  p_regiment_id uuid,
  p_title text,
  p_body text,
  p_image_url text default ''
) returns uuid
language plpgsql security definer set search_path=public
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Требуется авторизация'; end if;
  if not exists (
    select 1 from public.empire_regiment_members m
    where m.regiment_id=p_regiment_id
      and m.user_id=auth.uid()
      and m.left_at is null
      and m.role in ('commander','officer')
  ) then
    raise exception 'Публиковать новости могут только командир и офицеры полка';
  end if;
  if length(trim(coalesce(p_title,'')))<2 or length(trim(p_title))>140 then
    raise exception 'Заголовок должен содержать от 2 до 140 символов';
  end if;
  if length(trim(coalesce(p_body,'')))<2 then
    raise exception 'Текст новости не может быть пустым';
  end if;
  insert into public.empire_regiment_news(regiment_id,author_id,title,body,image_url)
  values(p_regiment_id,auth.uid(),trim(p_title),trim(p_body),coalesce(trim(p_image_url),''))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.empire_publish_regiment_news(uuid,text,text,text) from public;
grant execute on function public.empire_publish_regiment_news(uuid,text,text,text) to authenticated;
