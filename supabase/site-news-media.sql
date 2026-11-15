-- Storage for images uploaded to site news.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values (
  'site-news-media',
  'site-news-media',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict(id) do update set
  public=true,
  file_size_limit=8388608,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Site news media is publicly readable" on storage.objects;
create policy "Site news media is publicly readable"
  on storage.objects for select
  using (bucket_id='site-news-media');

drop policy if exists "Site news officers upload media" on storage.objects;
create policy "Site news officers upload media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id='site-news-media'
    and (
      exists (
        select 1
        from public.empire_regiments r
        where r.commander_id=auth.uid()
      )
      or exists (
        select 1
        from public.empire_regiment_members m
        where m.user_id=auth.uid()
          and m.left_at is null
          and m.role in ('commander','officer')
      )
    )
  );

drop policy if exists "Site news officers delete media" on storage.objects;
create policy "Site news officers delete media"
  on storage.objects for delete to authenticated
  using (
    bucket_id='site-news-media'
    and (
      exists (
        select 1
        from public.empire_regiments r
        where r.commander_id=auth.uid()
      )
      or exists (
        select 1
        from public.empire_regiment_members m
        where m.user_id=auth.uid()
          and m.left_at is null
          and m.role in ('commander','officer')
      )
    )
  );
