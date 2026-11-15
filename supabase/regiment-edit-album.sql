-- Regiment editing and shared screenshot albums.
create table if not exists public.empire_regiment_album (
  id uuid primary key default gen_random_uuid(),
  regiment_id uuid not null references public.empire_regiments(id) on delete cascade,
  storage_path text not null,
  image_url text not null,
  title text not null default '',
  uploaded_by uuid not null references public.empire_profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists empire_regiment_album_regiment_idx
  on public.empire_regiment_album(regiment_id, created_at desc);
alter table public.empire_regiment_album enable row level security;
drop policy if exists "Regiment album is publicly readable" on public.empire_regiment_album;
create policy "Regiment album is publicly readable"
  on public.empire_regiment_album for select using (true);
drop policy if exists "Officers and commanders add regiment album images" on public.empire_regiment_album;
create policy "Officers and commanders add regiment album images"
  on public.empire_regiment_album for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and (
      exists (
        select 1 from public.empire_regiment_members m
        where m.regiment_id = empire_regiment_album.regiment_id
          and m.user_id = auth.uid() and m.left_at is null
          and m.role in ('commander','officer')
      ) or exists (
        select 1 from public.empire_regiments r
        where r.id=empire_regiment_album.regiment_id and r.commander_id=auth.uid()
      )
    )
  );
drop policy if exists "Officers and commanders delete regiment album images" on public.empire_regiment_album;
create policy "Officers and commanders delete regiment album images"
  on public.empire_regiment_album for delete to authenticated
  using (
    exists (
      select 1 from public.empire_regiment_members m
      where m.regiment_id = empire_regiment_album.regiment_id
        and m.user_id = auth.uid() and m.left_at is null
        and m.role in ('commander','officer')
    ) or exists (
      select 1 from public.empire_regiments r
      where r.id=empire_regiment_album.regiment_id and r.commander_id=auth.uid()
    )
  );

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('regiment-media','regiment-media',true,8388608,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict(id) do update set public=true,file_size_limit=8388608,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Regiment media is publicly readable" on storage.objects;
create policy "Regiment media is publicly readable" on storage.objects for select using(bucket_id='regiment-media');
drop policy if exists "Regiment officers upload media" on storage.objects;
create policy "Regiment officers upload media" on storage.objects for insert to authenticated
with check (
  bucket_id='regiment-media'
  and exists (
    select 1 from public.empire_regiment_members m
    where m.regiment_id::text=(storage.foldername(name))[1]
      and m.user_id=auth.uid() and m.left_at is null
      and m.role in ('commander','officer')
  ) or exists (
    select 1 from public.empire_regiments r
    where r.id::text=(storage.foldername(name))[1] and r.commander_id=auth.uid()
  )
);
drop policy if exists "Regiment officers delete media" on storage.objects;
create policy "Regiment officers delete media" on storage.objects for delete to authenticated
using (
  bucket_id='regiment-media'
  and exists (
    select 1 from public.empire_regiment_members m
    where m.regiment_id::text=(storage.foldername(name))[1]
      and m.user_id=auth.uid() and m.left_at is null
      and m.role in ('commander','officer')
  )
);

create or replace function public.empire_update_regiment(
  p_regiment_id uuid, p_name text, p_faction text, p_logo_url text
) returns void
language plpgsql security definer set search_path=public
as $$
declare v_old_name text;
begin
  if auth.uid() is null then raise exception 'Требуется авторизация'; end if;
  if not exists (
    select 1 from public.empire_regiments r
    where r.id=p_regiment_id and (
      r.commander_id=auth.uid() or exists (
        select 1 from public.empire_regiment_members m
        where m.regiment_id=r.id and m.user_id=auth.uid()
          and m.left_at is null and m.role='commander'
      )
    )
  ) then raise exception 'Редактировать полк может только его командир'; end if;
  if length(trim(coalesce(p_name,'')))<2 or length(trim(p_name))>60 then
    raise exception 'Название должно содержать от 2 до 60 символов';
  end if;
  if p_faction not in ('Австрийская Империя','Французская Империя','Российская Империя','Британская Империя','Пруссия','Рейнский Союз') then
    raise exception 'Недопустимая фракция';
  end if;
  select name into v_old_name from public.empire_regiments where id=p_regiment_id;
  if exists(select 1 from public.empire_regiments where lower(name)=lower(trim(p_name)) and id<>p_regiment_id) then
    raise exception 'Полк с таким названием уже существует';
  end if;
  update public.empire_regiments
  set name=trim(p_name), faction=p_faction, logo_url=coalesce(nullif(trim(p_logo_url),''),logo_url)
  where id=p_regiment_id;
  update public.empire_profiles set regiment=trim(p_name)
  where regiment=v_old_name;
end;
$$;
revoke all on function public.empire_update_regiment(uuid,text,text,text) from public;
grant execute on function public.empire_update_regiment(uuid,text,text,text) to authenticated;
