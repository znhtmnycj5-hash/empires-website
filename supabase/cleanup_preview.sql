-- Clanwars: предварительная проверка очистки тестовых данных.
-- Только SELECT: ничего не удаляет.

-- Все аккаунты. Сохраняются только Commander и Kalash.
select
  u.id,
  coalesce(p.display_name, u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)) as account_name,
  u.email,
  p.regiment,
  p.is_admin,
  u.created_at
from auth.users u
left join public.empire_profiles p on p.id = u.id
order by u.created_at;

-- Полки, которые будут удалены (сохраняется только 1st Regiment).
select id, name, faction, commander_id
from public.empire_regiments
where lower(trim(name)) <> lower('1st Regiment')
order by name;

-- Комментарии, которые будут очищены по типам контента.
select context_type, count(*) as comments_to_delete
from public.empire_comments
where context_type in ('battle', 'campaign', 'site_news')
group by context_type
order by context_type;

-- Число оставшихся комментариев к новостям полков (не затрагиваются этим SQL).
select count(*) as regiment_news_comments_kept
from public.empire_comments
where context_type = 'regiment_news';
