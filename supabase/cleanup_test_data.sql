-- Clanwars: удаление тестовых данных.
-- Перед запуском сначала выполните supabase/cleanup_preview.sql и проверьте список аккаунтов.
-- Сохраняются только аккаунты Commander и Kalash, а также полк 1st Regiment.
-- Операция необратима. Выполняйте целиком в Supabase SQL Editor.

begin;

-- Удаляем все аккаунты, кроме двух явно сохранённых.
-- Каскадно удалятся их профили, комментарии, членство, заявки,
-- личные сообщения, сообщения мини-чата и посещения профилей.
delete from auth.users u
where not exists (
  select 1
  from public.empire_profiles p
  where p.id = u.id
    and lower(trim(p.display_name)) in ('commander', 'kalash')
)
and lower(trim(coalesce(
  (select p.display_name from public.empire_profiles p where p.id = u.id),
  u.raw_user_meta_data->>'display_name',
  split_part(u.email, '@', 1),
  ''
))) not in ('commander', 'kalash');

-- Убираем тестовые обсуждения сражений, кампаний и демонстрационных новостей.
delete from public.empire_comments
where context_type in ('battle', 'campaign', 'site_news');

-- Удаляем демонстрационные полки, оставляя действующий 1st Regiment.
-- Связанные членства и заявки удалятся каскадно.
delete from public.empire_regiments
where lower(trim(name)) <> lower('1st Regiment');

-- Удаляем возможные оставшиеся заявки на создание полков от тестовых аккаунтов.
delete from public.empire_regiment_creation_requests r
where not exists (
  select 1 from public.empire_profiles p
  where p.id = r.user_id
    and lower(trim(p.display_name)) in ('commander', 'kalash')
);

commit;

-- Проверка результата.
select p.display_name, p.regiment, p.is_admin
from public.empire_profiles p
order by lower(p.display_name);

select name, faction
from public.empire_regiments
order by name;

select context_type, count(*) as remaining_comments
from public.empire_comments
group by context_type
order by context_type;
