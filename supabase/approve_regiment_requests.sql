-- Надёжное принятие заявок на создание полка.
-- Запустить один раз в Supabase SQL Editor после обновления сайта.
create or replace function public.empire_admin_review_regiment_creation_request(
  p_request_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  req public.empire_regiment_creation_requests%rowtype;
  new_regiment_id uuid;
  existing_membership uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.empire_profiles p
    where p.id=auth.uid() and p.is_admin=true
  ) then raise exception 'Only administrators can review regiment requests'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;

  select * into req
  from public.empire_regiment_creation_requests
  where id=p_request_id
  for update;
  if not found then raise exception 'Request not found'; end if;
  if req.status <> 'pending' then raise exception 'Request has already been processed'; end if;

  if p_decision='approved' then
    if exists(select 1 from public.empire_regiments r where lower(trim(r.name))=lower(trim(req.name))) then
      raise exception 'A regiment with this name already exists';
    end if;
    if exists(select 1 from public.empire_regiment_members m where m.user_id=req.user_id and m.left_at is null) then
      raise exception 'The applicant already belongs to a regiment';
    end if;

    insert into public.empire_regiments(name,faction,logo_url,commander_id)
    values(trim(req.name),req.faction,req.logo,req.user_id)
    returning id into new_regiment_id;

    insert into public.empire_regiment_members(regiment_id,user_id,role,joined_at)
    values(new_regiment_id,req.user_id,'commander',now());
  end if;

  update public.empire_regiment_creation_requests
  set status=p_decision,processed_at=now()
  where id=req.id;

  return jsonb_build_object(
    'ok',true,
    'status',p_decision,
    'regiment_id',new_regiment_id
  );
end;
$$;
revoke execute on function public.empire_admin_review_regiment_creation_request(uuid,text) from public,anon;
grant execute on function public.empire_admin_review_regiment_creation_request(uuid,text) to authenticated;
