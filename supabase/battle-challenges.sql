-- Система вызовов на полковые сражения
create table if not exists public.empire_battle_challenges (
  id uuid primary key default gen_random_uuid(),
  challenger_regiment_id uuid not null references public.empire_regiments(id) on delete cascade,
  target_regiment_id uuid not null references public.empire_regiments(id) on delete cascade,
  challenger_id uuid not null references public.empire_profiles(id) on delete cascade,
  battle_type text not null,
  player_count integer not null check(player_count between 1 and 200),
  allies_allowed boolean not null default false,
  ally_limit integer not null default 0 check(ally_limit between 0 and 200),
  scheduled_at timestamptz not null,
  server text not null default '',
  password text not null default '',
  status text not null default 'pending' check(status in ('pending','accepted','rejected','cancelled')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.empire_profiles(id) on delete set null,
  check(challenger_regiment_id <> target_regiment_id)
);
create index if not exists empire_battle_challenges_target_idx
 on public.empire_battle_challenges(target_regiment_id,status,created_at desc);
create index if not exists empire_battle_challenges_challenger_idx
 on public.empire_battle_challenges(challenger_regiment_id,created_at desc);
alter table public.empire_battle_challenges enable row level security;

drop policy if exists "Battle challenges visible to involved commanders" on public.empire_battle_challenges;
create policy "Battle challenges visible to involved commanders"
on public.empire_battle_challenges for select to authenticated
using (
 exists(select 1 from public.empire_regiments r where r.id=challenger_regiment_id and r.commander_id=auth.uid())
 or exists(select 1 from public.empire_regiments r where r.id=target_regiment_id and r.commander_id=auth.uid())
);

create or replace function public.empire_create_battle_challenge(
 p_target_regiment_id uuid, p_battle_type text, p_player_count integer,
 p_allies_allowed boolean, p_ally_limit integer, p_scheduled_at timestamptz,
 p_server text, p_password text
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare v_source uuid; v_id uuid;
begin
 if auth.uid() is null then raise exception 'Сначала войдите в аккаунт'; end if;
 select id into v_source from public.empire_regiments where commander_id=auth.uid();
 if v_source is null then raise exception 'Только командир полка может бросить вызов'; end if;
 if v_source=p_target_regiment_id then raise exception 'Нельзя вызвать собственный полк'; end if;
 if not exists(select 1 from public.empire_regiments where id=p_target_regiment_id) then raise exception 'Полк-цель не найден'; end if;
 if p_battle_type not in ('Линейное сражение','Осадное сражение','Кавалерийское сражение','Другое') then raise exception 'Неверный тип сражения'; end if;
 if p_player_count not between 1 and 200 or p_ally_limit not between 0 and 200 then raise exception 'Неверный размер состава'; end if;
 if p_scheduled_at <= now() then raise exception 'Укажите дату и время в будущем'; end if;
 insert into public.empire_battle_challenges(challenger_regiment_id,target_regiment_id,challenger_id,battle_type,player_count,allies_allowed,ally_limit,scheduled_at,server,password)
 values(v_source,p_target_regiment_id,auth.uid(),p_battle_type,p_player_count,coalesce(p_allies_allowed,false),case when p_allies_allowed then p_ally_limit else 0 end,p_scheduled_at,coalesce(p_server,''),coalesce(p_password,''))
 returning id into v_id;
 return v_id;
end $$;
revoke all on function public.empire_create_battle_challenge(uuid,text,integer,boolean,integer,timestamptz,text,text) from public,anon;
grant execute on function public.empire_create_battle_challenge(uuid,text,integer,boolean,integer,timestamptz,text,text) to authenticated;

create or replace function public.empire_review_battle_challenge(p_challenge_id uuid,p_decision text)
returns void language plpgsql security definer set search_path=''
as $$
declare c public.empire_battle_challenges%rowtype;
begin
 if auth.uid() is null then raise exception 'Требуется авторизация'; end if;
 select * into c from public.empire_battle_challenges where id=p_challenge_id for update;
 if not found then raise exception 'Вызов не найден'; end if;
 if not exists(select 1 from public.empire_regiments where id=c.target_regiment_id and commander_id=auth.uid()) then raise exception 'Только командир вызванного полка может ответить'; end if;
 if c.status<>'pending' then raise exception 'Этот вызов уже обработан'; end if;
 if p_decision not in ('accepted','rejected') then raise exception 'Неверное решение'; end if;
 update public.empire_battle_challenges set status=p_decision,reviewed_at=now(),reviewed_by=auth.uid() where id=c.id;
end $$;
revoke all on function public.empire_review_battle_challenge(uuid,text) from public,anon;
grant execute on function public.empire_review_battle_challenge(uuid,text) to authenticated;

-- Принятые сражения доступны для публичного списка без серверного пароля.
drop view if exists public.empire_public_battles;
create view public.empire_public_battles as
select
  id,
  challenger_regiment_id,
  target_regiment_id,
  battle_type,
  player_count,
  allies_allowed,
  ally_limit,
  scheduled_at,
  server,
  status,
  created_at
from public.empire_battle_challenges
where status='accepted';

grant select on public.empire_public_battles to anon, authenticated;

-- Участники обоих полков могут открыть принятое сражение и получить сервер/пароль.
drop policy if exists "Battle challenges visible to involved members" on public.empire_battle_challenges;
create policy "Battle challenges visible to involved members"
on public.empire_battle_challenges for select to authenticated
using (
  exists(
    select 1 from public.empire_regiment_members m
    where m.regiment_id=challenger_regiment_id
      and m.user_id=auth.uid()
      and m.left_at is null
  )
  or exists(
    select 1 from public.empire_regiment_members m
    where m.regiment_id=target_regiment_id
      and m.user_id=auth.uid()
      and m.left_at is null
  )
);
