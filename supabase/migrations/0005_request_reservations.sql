begin;

alter policy requests_insert on public.requests with check (
  asker_id = (select auth.uid()) and status = 'open' and deadline > now()
  and exists (
    select 1 from public.profiles p
    join public.private_profiles i on i.user_id = p.id
    where p.id = requests.asker_id and p.consent
  )
);

create index requests_reserved_by_asker_idx on public.requests (asker_id)
  where status in ('open', 'matched');

create function helploop_private.check_request_reservations() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  asker uuid;
  headroom bigint;
begin
  -- Check the entire statement, including all rows of a bulk insert.
  for asker in
    select distinct asker_id from inserted_requests
    where status in ('open', 'matched')
    order by asker_id
  loop
    -- A non-key write serializes this asker's reservations without conflicting
    -- with foreign-key checks. At repeatable read a competing writer must retry.
    update public.profiles set entry_year = entry_year where id = asker;

    -- A separate query sees reservations committed while waiting for the lock
    -- at read committed. Balance and reservations use the same snapshot.
    select
      coalesce((select sum(l.delta) from public.ledger l where l.user_id = asker), 0)
      - coalesce((select sum(r.minutes) from public.requests r
        where r.asker_id = asker and r.status in ('open', 'matched')), 0)
    into headroom;

    if headroom < -public.overdraft_limit() then
      raise exception 'Not enough available credit for this request'
        using errcode = '23514';
    end if;
  end loop;
  return null;
end $$;
revoke all on function helploop_private.check_request_reservations() from public, anon, authenticated;

create trigger requests_check_reservations
after insert on public.requests
referencing new table as inserted_requests
for each statement execute function helploop_private.check_request_reservations();

-- Keep the RPC signature and original matching rules. Check both participants
-- so open requests created before this migration cannot bypass onboarding.
create or replace function public.accept_request(p_request uuid, p_scheduled_at timestamptz, p_place text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  helper uuid := auth.uid();
  r public.requests;
  sid uuid;
begin
  if not exists (
    select 1 from public.profiles p
    join public.private_profiles i on i.user_id = p.id
    where p.id = helper and p.consent
  ) then
    raise exception 'Complete onboarding before accepting a request' using errcode = '42501';
  end if;

  select * into r from public.requests where id = p_request for update;
  if r.id is null or r.status <> 'open' then raise exception 'This request is no longer open'; end if;
  if r.asker_id = helper then raise exception 'You cannot take your own request'; end if;
  if r.deadline <= now() then raise exception 'This request has passed its deadline'; end if;
  if not exists (
    select 1 from public.profiles p
    join public.private_profiles i on i.user_id = p.id
    where p.id = r.asker_id and p.consent
  ) then
    raise exception 'This request is no longer available';
  end if;

  update public.requests set status = 'matched' where id = r.id;
  insert into public.sessions (request_id, helper_id, asker_id, minutes, scheduled_at, place)
    values (r.id, helper, r.asker_id, r.minutes, p_scheduled_at, coalesce(nullif(p_place, ''), r.place))
    returning id into sid;
  insert into public.events (user_id, type, ref_id) values (helper, 'request_accepted', sid);
  return sid;
end $$;

commit;
