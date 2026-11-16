-- Удаление старых демонстрационных полков Clanwars.
-- Выполнить ОДИН РАЗ в Supabase SQL Editor, если эти тестовые полки
-- ещё присутствуют в базе. Реальные полки с другими названиями не затрагиваются.

begin;

update public.empire_profiles
set regiment = null
where lower(trim(coalesce(regiment,''))) in (
  '1st regiment','95th rifles','84e régiment','preobrazhensky',
  '7th hussars','13e léger','33e ligne','92nd gordon highlanders',
  'semenovsky','king''s german legion','6e hussards','royal scots',
  'баварский полк','totenkopf','mangust'
);

delete from public.empire_comments
where context_type = 'regiment_news'
  and lower(trim(context_id)) in (
    '1st regiment','95th rifles','84e régiment','preobrazhensky',
    '7th hussars','13e léger','33e ligne','92nd gordon highlanders',
    'semenovsky','king''s german legion','6e hussards','royal scots',
    'баварский полк','totenkopf','mangust'
  );

delete from public.empire_regiments
where lower(trim(name)) in (
  '1st regiment','95th rifles','84e régiment','preobrazhensky',
  '7th hussars','13e léger','33e ligne','92nd gordon highlanders',
  'semenovsky','king''s german legion','6e hussards','royal scots',
  'баварский полк','totenkopf','mangust'
);

commit;

select name,faction from public.empire_regiments order by lower(name);
