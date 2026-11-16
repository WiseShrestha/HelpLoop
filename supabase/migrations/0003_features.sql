-- C3: contracts for F1-F7. Apply only after human review; 0001/0002 stay unchanged.
begin;

alter table public.courses add column kind text not null default 'course'
  check (kind in ('course', 'language', 'skill'));
insert into public.courses (code, name_ko, name_en, kind) values
  ('korean', '한국어 회화', 'Korean conversation', 'language'),
  ('english', '영어 회화', 'English conversation', 'language'),
  ('python', 'Python', 'Python', 'skill'),
  ('latex', 'LaTeX', 'LaTeX', 'skill'),
  ('cad', 'CAD', 'CAD', 'skill'),
  ('research-lab', '연구실·URP 준비', 'Getting into a research lab', 'skill'),
  ('cv', '이력서·자기소개서', 'CVs and applications', 'skill'),
  ('major-advice', '전공 선택 상담', 'Choosing a major', 'skill')
on conflict (code) do nothing;

create table public.course_topics (
  course_code text references public.courses not null,
  tag text not null check (char_length(tag) between 1 and 60),
  label_ko text not null,
  label_en text not null,
  primary key (course_code, tag)
);
alter table public.course_topics enable row level security;
revoke all on public.course_topics from public, anon, authenticated;
grant select, insert, update, delete on public.course_topics to authenticated;
grant all on public.course_topics to service_role;
create policy topics_read on public.course_topics for select to authenticated using (true);
create policy topics_admin on public.course_topics for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

alter table public.requests
  add column topic_tag text,
  add column is_anonymous boolean not null default false,
  add foreign key (course_code, topic_tag) references public.course_topics (course_code, tag);
create index requests_topic_week_idx on public.requests (created_at, course_code, topic_tag)
  where topic_tag is not null and status <> 'cancelled';

drop policy requests_read on public.requests;
create policy requests_read on public.requests for select to authenticated using (
  asker_id = (select auth.uid()) or (select public.is_admin()) or exists (
    select 1 from public.sessions s where s.request_id = requests.id
      and s.helper_id = (select auth.uid()) and s.status <> 'cancelled'
  )
);
create view public.request_board with (security_invoker = false, security_barrier = true) as
  select r.id,
    case when not r.is_anonymous or r.asker_id = auth.uid() then r.asker_id else null::uuid end as asker_id,
    r.course_code, r.topic, r.details, r.minutes, r.deadline, r.place, r.status, r.created_at,
    r.topic_tag, r.is_anonymous
  from public.requests r
  where auth.uid() is not null and (r.status = 'open' or r.asker_id = auth.uid());
revoke all on public.request_board from public, anon, authenticated;
grant select on public.request_board to authenticated, service_role;
-- A masked view cannot be streamed. B3 polls it every 15 seconds while visible.
alter publication supabase_realtime drop table public.requests;

create table public.loop_bonuses (
  loop_key text not null,
  user_id uuid not null references public.profiles on delete cascade,
  week_start date not null,
  tickets numeric(6,2) not null check (tickets = 1),
  members uuid[] not null,
  session_ids uuid[] not null,
  created_at timestamptz not null default now(),
  primary key (loop_key, user_id),
  check (cardinality(members) between 3 and 5 and user_id = any(members)
    and array_position(members, null) is null),
  check (cardinality(session_ids) = cardinality(members) and array_position(session_ids, null) is null)
);
create index loop_bonuses_week_idx on public.loop_bonuses (week_start, user_id);
create index loop_bonuses_members_idx on public.loop_bonuses using gin (members);
alter table public.loop_bonuses enable row level security;
revoke all on public.loop_bonuses from public, anon, authenticated;
grant select on public.loop_bonuses to authenticated;
grant all on public.loop_bonuses to service_role;
create policy loops_read on public.loop_bonuses for select to authenticated using (
  user_id = (select auth.uid()) or (select auth.uid()) = any(members) or (select public.is_admin())
);

create or replace view public.week_tickets with (security_invoker = false, security_barrier = true) as
  select a.user_id, p.display_name, a.week_start,
    (least(sum(a.base_tickets), 10) + least(sum(a.loop_tickets), 2))::numeric(6,2) as tickets
  from (
    select helper_id as user_id, week_start, tickets as base_tickets, 0::numeric as loop_tickets
      from public.ticket_awards
    union all
    select user_id, week_start, 0::numeric, tickets from public.loop_bonuses
  ) a join public.profiles p on p.id = a.user_id
  group by a.user_id, p.display_name, a.week_start;
revoke all on public.week_tickets from public, anon, authenticated;
grant select on public.week_tickets to authenticated, service_role;

create view public.stuck_map with (security_invoker = false, security_barrier = true) as
  select course_code, topic_tag,
    date_trunc('week', created_at at time zone 'Asia/Seoul')::date as week_start,
    count(*)::int as requests
  from public.requests
  where topic_tag is not null and status <> 'cancelled'
    and created_at >= ((date_trunc('week', now() at time zone 'Asia/Seoul') - interval '7 weeks') at time zone 'Asia/Seoul')
    and created_at < ((date_trunc('week', now() at time zone 'Asia/Seoul') + interval '1 week') at time zone 'Asia/Seoul')
  group by course_code, topic_tag, date_trunc('week', created_at at time zone 'Asia/Seoul')::date
  having count(*) >= 3 and count(distinct asker_id) >= 3;
revoke all on public.stuck_map from public, anon, authenticated;
grant select on public.stuck_map to anon, authenticated, service_role;

create table public.open_tables (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles on delete cascade,
  course_code text references public.courses,
  note text check (char_length(note) <= 120),
  place text not null check (char_length(trim(place)) between 1 and 60),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  max_people int not null default 6 check (max_people between 2 and 12),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at <= starts_at + interval '6 hours')
);
create index open_tables_ends_idx on public.open_tables (ends_at);
create table public.open_table_joins (
  table_id uuid not null references public.open_tables on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (table_id, user_id)
);
create index open_table_joins_user_idx on public.open_table_joins (user_id);
alter table public.open_tables enable row level security;
alter table public.open_table_joins enable row level security;
revoke all on public.open_tables, public.open_table_joins from public, anon, authenticated;
grant select, insert, delete on public.open_tables to authenticated;
grant update (ends_at) on public.open_tables to authenticated;
grant select, insert, delete on public.open_table_joins to authenticated;
grant all on public.open_tables, public.open_table_joins to service_role;
create policy tables_read on public.open_tables for select to authenticated using (true);
create policy tables_insert on public.open_tables for insert to authenticated with check (host_id = (select auth.uid()));
create policy tables_end on public.open_tables for update to authenticated
  using (host_id = (select auth.uid())) with check (host_id = (select auth.uid()));
create policy tables_delete on public.open_tables for delete to authenticated using (host_id = (select auth.uid()));
create policy joins_read on public.open_table_joins for select to authenticated using (true);
create policy joins_insert on public.open_table_joins for insert to authenticated with check (user_id = (select auth.uid()));
create policy joins_delete on public.open_table_joins for delete to authenticated using (user_id = (select auth.uid()));

create schema if not exists helploop_private;
revoke all on schema helploop_private from public, anon, authenticated;
create function helploop_private.enforce_open_table_capacity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare t public.open_tables;
begin
  -- Updating the parent serializes joins, including at stronger isolation levels.
  update public.open_tables set ends_at = ends_at where id = new.table_id returning * into t;
  if t.id is null or t.ends_at <= clock_timestamp() then
    raise exception 'This study table has ended or no longer exists';
  end if;
  -- The host reserves one place even without an explicit join row.
  if new.user_id <> t.host_id and 1 + (select count(*) from public.open_table_joins
      where table_id = t.id and user_id <> t.host_id) >= t.max_people then
    raise exception 'This study table is full';
  end if;
  return new;
end $$;
revoke all on function helploop_private.enforce_open_table_capacity() from public, anon, authenticated;
create trigger table_capacity before insert on public.open_table_joins
  for each row execute function helploop_private.enforce_open_table_capacity();
alter publication supabase_realtime add table public.open_tables, public.open_table_joins;

alter table public.perks add column department text;
alter table public.profiles add column public_record boolean not null default false;
create view public.helper_course_stats with (security_invoker = false, security_barrier = true) as
  select p.id as user_id, r.course_code,
    count(s.id)::int as sessions, count(distinct s.asker_id)::int as people_helped,
    coalesce(sum(s.minutes), 0)::int as minutes, round(avg(s.rating), 2) as avg_rating,
    min(s.completed_at) as first_at, max(s.completed_at) as last_at
  from public.profiles p
  join public.sessions s on s.helper_id = p.id and s.status = 'completed'
  join public.requests r on r.id = s.request_id
  where p.public_record or p.id = auth.uid() or current_user = 'service_role'
    or exists (select 1 from public.profiles admin where admin.id = auth.uid() and admin.is_admin)
  group by p.id, r.course_code;
revoke all on public.helper_course_stats from public, anon, authenticated;
grant select on public.helper_course_stats to anon, authenticated, service_role;

commit;
