-- C4: close the request-edit overdraft bypass and tighten the reviewed contracts.
begin;

-- Table-level grants override a column whitelist, so revoke both forms first.
revoke update on public.requests from public, anon, authenticated;
revoke update (id, asker_id, course_code, topic, details, minutes, deadline, place,
  created_at, topic_tag, is_anonymous) on public.requests from public, anon, authenticated;
grant update (status) on public.requests to authenticated;
grant select, insert, update, delete on public.requests to service_role;
-- requests_cancel still limits this to the owner's open -> open/cancelled transition.

-- Defaults are not protection: prevent clients backdating a request at insertion too.
revoke insert on public.requests from public, anon, authenticated;
revoke insert (created_at) on public.requests from public, anon, authenticated;
grant insert (id, asker_id, course_code, topic, details, minutes, deadline, place,
  status, topic_tag, is_anonymous) on public.requests to authenticated;

-- Reference labels contain no student data; public Stuck Map selectors need them.
grant select on public.courses, public.course_topics to anon;
create policy courses_public_labels on public.courses for select to anon using (true);
create policy topics_public_labels on public.course_topics for select to anon using (true);
-- Keep the overall helper directory signed-in-only, including under hosted defaults.
revoke all on public.helper_stats from public, anon;
revoke select (user_id, display_name, entry_year, department, sessions_helped, people_helped,
  minutes_helped, avg_rating) on public.helper_stats from public, anon;
grant select on public.helper_stats to authenticated, service_role;

create function helploop_private.uuid_array_is_distinct(items uuid[]) returns boolean
language sql immutable strict parallel safe set search_path = '' as $$
  select cardinality(items) = (select count(distinct value) from unnest(items) as e(value))
$$;
revoke all on function helploop_private.uuid_array_is_distinct(uuid[]) from public, anon, authenticated;
grant usage on schema helploop_private to service_role;
grant execute on function helploop_private.uuid_array_is_distinct(uuid[]) to service_role;
alter table public.loop_bonuses
  add constraint loop_members_distinct check (helploop_private.uuid_array_is_distinct(members)),
  add constraint loop_sessions_distinct check (helploop_private.uuid_array_is_distinct(session_ids)),
  add constraint loop_week_monday check (extract(isodow from week_start) = 1);
alter table public.ticket_awards
  add constraint ticket_week_monday check (extract(isodow from week_start) = 1);

commit;
