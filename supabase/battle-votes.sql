-- Голосование за победителя сражения
create table if not exists public.empire_battle_votes (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.empire_battle_challenges(id) on delete cascade,
  user_id uuid not null references public.empire_profiles(id) on delete cascade,
  voted_regiment_id uuid not null references public.empire_regiments(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(battle_id,user_id)
);

create index if not exists empire_battle_votes_battle_idx
  on public.empire_battle_votes(battle_id,created_at);

alter table public.empire_battle_votes enable row level security;

drop policy if exists "Battle votes readable by authenticated users" on public.empire_battle_votes;
create policy "Battle votes readable by authenticated users"
on public.empire_battle_votes for select to authenticated
using (true);

create or replace function public.empire_vote_battle(
  p_battle_id uuid,
  p_voted_regiment_id uuid
) returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  b public.empire_battle_challenges%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Сначала войдите в аккаунт';
  end if;

  select * into b
  from public.empire_battle_challenges
  where id=p_battle_id
  for update;

  if not found then
    raise exception 'Сражение не найдено';
  end if;

  if b.status<>'accepted' then
    raise exception 'Голосование доступно только для назначенного сражения';
  end if;

  if b.scheduled_at<=now() then
    raise exception 'Голосование уже завершено: сражение началось';
  end if;

  if p_voted_regiment_id<>b.challenger_regiment_id
     and p_voted_regiment_id<>b.target_regiment_id then
    raise exception 'Можно голосовать только за один из двух полков';
  end if;

  if exists(
    select 1 from public.empire_battle_votes
    where battle_id=p_battle_id and user_id=auth.uid()
  ) then
    raise exception 'Вы уже проголосовали в этом сражении';
  end if;

  insert into public.empire_battle_votes(battle_id,user_id,voted_regiment_id)
  values(p_battle_id,auth.uid(),p_voted_regiment_id);
end
$$;

revoke all on function public.empire_vote_battle(uuid,uuid) from public,anon;
grant execute on function public.empire_vote_battle(uuid,uuid) to authenticated;

drop view if exists public.empire_public_battle_votes;
create view public.empire_public_battle_votes
with (security_invoker=false)
as
select
  v.battle_id,
  v.user_id,
  v.voted_regiment_id,
  p.display_name,
  v.created_at
from public.empire_battle_votes v
join public.empire_profiles p on p.id=v.user_id;

grant select on public.empire_public_battle_votes to anon,authenticated;
