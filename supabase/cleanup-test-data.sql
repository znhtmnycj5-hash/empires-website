-- Clanwars cleanup: keep only Commander and Kalash accounts.
-- Review the preview SELECT first. This script permanently deletes all other
-- Supabase Auth accounts and their profile-linked data (comments, messages,
-- visits, regiment membership and applications).

-- PREVIEW: accounts that will be removed
select u.id, p.display_name, u.email, u.created_at
from auth.users u
left join public.empire_profiles p on p.id=u.id
where p.id is null
   or lower(trim(p.display_name)) <> 'commander'
   and not (
     lower(trim(p.display_name))='kalash'
     or (lower(trim(p.display_name))='kalashnikov' and not exists (
       select 1 from public.empire_profiles kp where lower(trim(kp.display_name))='kalash'
     ))
   )
order by u.created_at;

-- PREVIEW: seeded regiments that will be removed (1st Regiment is preserved)
select id, name from public.empire_regiments
where name in ('95th Rifles', '84e Régiment', 'Preobrazhensky', '7th Hussars', '13e Léger', '33e Ligne', '92nd Gordon Highlanders', 'Semenovsky', 'King''s German Legion', '6e Hussards', 'Royal Scots', 'Баварский Полк', 'Totenkopf', 'Mangust')
order by name;

-- This file is preview-only. No records are deleted here.
-- After checking the result, run supabase/cleanup-test-data-apply.sql.
