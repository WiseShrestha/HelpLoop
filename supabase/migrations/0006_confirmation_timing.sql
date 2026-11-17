begin;

create or replace function public.confirm_session(p_session uuid, p_rating int default null, p_covered text default null)
returns public.session_status language plpgsql security definer set search_path = '' as $$
declare
  participant uuid := auth.uid();
  s public.sessions;
  confirmed_at timestamptz;
begin
  select * into s from public.sessions where id = p_session for update;
  if s.id is null or s.status <> 'scheduled' then raise exception 'This session cannot be confirmed'; end if;

  if participant is null or participant not in (s.helper_id, s.asker_id) then
    raise exception 'You are not in this session';
  end if;

  -- A caller can choose the scheduled time. Use the server's acceptance
  -- timestamp as the earliest possible start for an on-the-spot session.
  confirmed_at := clock_timestamp();
  if confirmed_at < greatest(s.scheduled_at, s.created_at) + make_interval(mins => s.minutes) then
    raise exception 'You can confirm after the session could have ended';
  end if;

  if participant = s.helper_id then
    if coalesce(trim(p_covered), '') = '' then raise exception 'Say briefly what you covered'; end if;
    update public.sessions set helper_confirmed_at = confirmed_at, covered = p_covered where id = s.id;
  else
    if p_rating is null or p_rating not between 1 and 5 then raise exception 'Rate the session from 1 to 5'; end if;
    update public.sessions set asker_confirmed_at = confirmed_at, rating = p_rating where id = s.id;
  end if;
  insert into public.events (user_id, type, ref_id) values (participant, 'session_confirmed', s.id);

  select * into s from public.sessions where id = p_session;
  if s.helper_confirmed_at is not null and s.asker_confirmed_at is not null then
    update public.sessions set status = 'completed', completed_at = confirmed_at where id = s.id;
    update public.requests set status = 'completed' where id = s.request_id;
    insert into public.ledger (user_id, delta, reason, session_id) values
      (s.helper_id, s.minutes, 'session_earned', s.id),
      (s.asker_id, -s.minutes, 'session_spent', s.id);
    insert into public.events (user_id, type, ref_id) values (participant, 'session_completed', s.id);
    return 'completed';
  end if;
  return 'scheduled';
end $$;

commit;
