-- DESTRUCTIVE: run only after reviewing supabase/cleanup-test-data.sql preview.
begin;

-- Remove test comments even when posted by one of the two retained accounts.
delete from public.empire_comments
where (context_type='battle' and context_id in ('battle-001', 'battle-002', 'battle-003', 'battle-004', 'battle-005', 'battle-006', 'battle-007', 'battle-008', 'battle-009', 'battle-010', 'battle-011', 'battle-012'))
   or (context_type='site_news' and context_id in ('site-news-test-01', 'site-news-test-02', 'site-news-test-03', 'site-news-test-04', 'site-news-test-05', 'site-news-test-06', 'site-news-test-07', 'site-news-test-08', 'site-news-test-09', 'site-news-test-10'))
   or (context_type='campaign' and context_id in ('campaign-001','campaign-test-01','campaign-test-02','campaign-test-03'))
   or (context_type='regiment_news' and context_id in ('95th Rifles', '84e Régiment', 'Preobrazhensky', '7th Hussars', '13e Léger', '33e Ligne', '92nd Gordon Highlanders', 'Semenovsky', 'King''s German Legion', '6e Hussards', 'Royal Scots', 'Баварский Полк', 'Totenkopf', 'Mangust'));

-- Remove demo regiment records; related memberships/applications cascade.
delete from public.empire_regiments
where name in ('95th Rifles', '84e Régiment', 'Preobrazhensky', '7th Hussars', '13e Léger', '33e Ligne', '92nd Gordon Highlanders', 'Semenovsky', 'King''s German Legion', '6e Hussards', 'Royal Scots', 'Баварский Полк', 'Totenkopf', 'Mangust');

-- Keep exactly the two approved accounts. Profiles and dependent records cascade
-- because empire_profiles.id references auth.users(id) ON DELETE CASCADE.
delete from auth.users u
where not exists (
  select 1
  from public.empire_profiles p
  where p.id=u.id
    and (
      lower(trim(p.display_name))='commander'
      or lower(trim(p.display_name))='kalash'
      or (lower(trim(p.display_name))='kalashnikov' and not exists (
        select 1 from public.empire_profiles kp where lower(trim(kp.display_name))='kalash'
      ))
    )
);

commit;

-- VERIFY: only the two approved accounts should remain.
select p.display_name, p.regiment, p.is_admin, p.created_at
from public.empire_profiles p
order by lower(p.display_name);
