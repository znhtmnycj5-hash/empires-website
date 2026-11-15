-- Clanwars: удаление тестовых данных.
-- Сохраняются только аккаунты Commander и Kalash и полк 1st Regiment.
-- Перед запуском проверьте SELECT в cleanup_preview.sql.
-- Выполняйте весь скрипт целиком в Supabase SQL Editor.

begin;

-- Удаляем только комментарии к известным демонстрационным сражениям,
-- кампаниям и тестовым новостям. Другие комментарии не затрагиваются.
delete from public.empire_comments
where (context_type = 'battle'
       and context_id in (
         'battle-001','battle-002','battle-003','battle-004','battle-005','battle-006',
         'battle-007','battle-008','battle-009','battle-010','battle-011','battle-012'
       ))
   or (context_type = 'campaign'
       and context_id in ('campaign-001','campaign-test-01','campaign-test-02','campaign-test-03'))
   or (context_type = 'site_news'
       and context_id in (
         'site-news-001','site-news-002','site-news-003',
         'site-news-test-01','site-news-test-02','site-news-test-03','site-news-test-04',
         'site-news-test-05','site-news-test-06','site-news-test-07','site-news-test-08',
         'site-news-test-09','site-news-test-10'
       ));

-- Удаляем комментарии к новостям всех полков, кроме 1st Regiment.
delete from public.empire_comments c
using public.empire_regiments r
where c.context_type = 'regiment_news'
  and c.context_id = r.name
  and lower(trim(r.name)) <> '1st regiment';

-- Удаляем все полки, кроме 1st Regiment.
delete from public.empire_regiments
where lower(trim(name)) <> '1st regiment';

-- Удаляем все аккаунты, кроме профилей Commander и Kalash.
-- Связанные данные удалятся по внешним ключам с ON DELETE CASCADE.
delete from auth.users u
where not exists (
  select 1
  from public.empire_profiles p
  where p.id = u.id
    and lower(trim(p.display_name)) in ('commander','kalash')
);

-- Удаляем оставшиеся заявки на создание полка от других пользователей.
delete from public.empire_regiment_creation_requests r
where not exists (
  select 1
  from public.empire_profiles p
  where p.id = r.user_id
    and lower(trim(p.display_name)) in ('commander','kalash')
);

commit;

-- Контрольный результат: должны остаться только Commander, Kalash и 1st Regiment.
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
