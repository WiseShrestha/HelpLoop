\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned
insert into auth.users values ('00000000-0000-0000-0000-00000000000a'),('00000000-0000-0000-0000-00000000000b'),('00000000-0000-0000-0000-00000000000c');
insert into courses values ('calc1','미적분학 I','Calculus I',true),('phys1','일반물리학 I','General Physics I',true);

-- A signs up
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into profiles (id, display_name, entry_year, help_courses, consent) values (auth.uid(), 'Asker', 2026, '{phys1}', true);
insert into private_profiles values (auth.uid(), 'Kim A', '20261001', 'a@kaist.ac.kr');
select 'A balance after sign-up = ' || my_balance();
select expect_error($$insert into ledger (user_id, delta, reason) values (auth.uid(), 999, 'admin')$$, 'user cannot mint credit');
select expect_error($$update profiles set is_admin = true where id = auth.uid()$$, 'user cannot make self admin');
select expect_error($$insert into private_profiles values ('00000000-0000-0000-0000-00000000000a','x','123','x@gmail.com')$$, 'bad student no / non-KAIST email rejected');
insert into requests (asker_id, course_code, topic, minutes, deadline, place) values (auth.uid(),'calc1','Taylor series',60, now()+interval '1 day','Library 2F');
insert into requests (asker_id, course_code, topic, minutes, deadline, place) values (auth.uid(),'calc1','Integrals',30, now()+interval '1 day','Library 2F');
select expect_error($$insert into requests (asker_id, course_code, topic, minutes, deadline, place) values (auth.uid(),'calc1','More',15, now()+interval '1 day','x')$$, 'overdraft limit (-30) enforced');
reset role;

-- B and C sign up
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into profiles (id, display_name, entry_year, department, help_courses, consent) values (auth.uid(), 'Helper', 2023, 'EE', '{calc1}', true);
reset role;
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
insert into profiles (id, display_name, entry_year, help_courses, consent) values (auth.uid(), 'Outsider', 2026, '{calc1}', true);
select 'C sees open requests = ' || count(*) from request_board where status = 'open';
select 'C sees private profiles of others = ' || count(*) from private_profiles;
reset role;

-- B accepts the Taylor request
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select 'B accepted, session made = ' || (accept_request((select id from request_board where topic='Taylor series'), now()+interval '2 hours', '') is not null);
reset role;
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select expect_error($$select accept_request((select id from request_board where topic='Taylor series'), now(), 'x')$$, 'second helper cannot take a matched request');
select 'C sees sessions it is not in = ' || count(*) from sessions;
select expect_error($$select confirm_session((select id from sessions limit 1), 5, null)$$, 'outsider cannot confirm');
reset role;
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select expect_error($$select accept_request((select id from requests where topic='Integrals'), now(), 'x')$$, 'asker cannot take own request');
select 'A confirms first (rating 5): status = ' || confirm_session((select id from sessions limit 1), 5, null);
reset role;
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select expect_error($$select confirm_session((select id from sessions limit 1), null, '')$$, 'helper must say what was covered');
select 'B confirms: status = ' || confirm_session((select id from sessions limit 1), null, 'Taylor expansion of e^x and error bound');
select 'B balance = ' || my_balance();
select expect_error($$select confirm_session((select id from sessions limit 1), null, 'again')$$, 'cannot confirm a completed session twice');
reset role;
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select 'A balance = ' || my_balance();
select 'A sees own ledger rows = ' || count(*) from ledger;
select 'A sees events (not admin) = ' || count(*) from events;
reset role;

-- Cancel and re-accept: C asks, B accepts then cancels, A takes it instead
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
insert into requests (asker_id, course_code, topic, minutes, deadline, place) values (auth.uid(),'phys1','Torque',30, now()+interval '1 day','E11 lounge');
reset role;
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select accept_request((select id from request_board where topic='Torque'), now()+interval '1 hour', '') is not null;
select cancel_session((select id from sessions where status='scheduled'));
select 'after cancel, Torque request is ' || status from request_board where topic='Torque';
reset role;
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select 'A can take reopened request = ' || (accept_request((select id from request_board where topic='Torque'), now()+interval '1 hour', '') is not null);
reset role;

-- Perks: capacity 1, cost 60
insert into perks (title, host_label, cost_minutes, capacity) values ('Coffee chat with an EE senior','EE, 4th year',60,1);
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select 'B claimed perk = ' || (claim_perk((select id from perks limit 1)) is not null);
select 'B balance after perk = ' || my_balance();
reset role;
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select expect_error($$select claim_perk((select id from perks limit 1))$$, 'perk capacity enforced');
select 'leaderboard row for Helper: people_helped = ' || people_helped || ', minutes = ' || minutes_helped || ', rating = ' || avg_rating from helper_stats where display_name = 'Helper';
reset role;
select 'money supply = ' || sum(delta) || ' (3 starters 180 − perk 60 = 120)' from ledger;

-- A signed-out caller who knows a live session ID must not be able to cancel it.
select id as scheduled_session_id from sessions where status = 'scheduled' limit 1 \gset
set role anon;
reset request.jwt.claim.sub;
select expect_error(format('select public.cancel_session(%L::uuid)', :'scheduled_session_id'), 'signed-out caller cannot cancel a known session');
reset role;
select case when status = 'scheduled' then 'PASS anonymous attempt leaves session scheduled'
  else 'FAIL anonymous attempt changed the session' end
from sessions where id = :'scheduled_session_id'::uuid;

-- Catch future privilege regressions on other privileged RPCs as well.
do $$ begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and has_function_privilege('anon', p.oid, 'EXECUTE')
  ) then raise exception 'FAIL anonymous callers can execute a privileged function'; end if;
  if has_function_privilege('authenticated', 'public.expire_requests()', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.grant_starter()', 'EXECUTE') then
    raise exception 'FAIL signed-in callers can directly execute internal jobs';
  end if;
  if not has_function_privilege('postgres', 'public.expire_requests()', 'EXECUTE')
    or not has_function_privilege('service_role', 'public.expire_requests()', 'EXECUTE') then
    raise exception 'FAIL scheduler lost permission to expire requests';
  end if;
end $$;

-- C3 fixtures: only synthetic students in the disposable test database.
insert into auth.users values
 ('00000000-0000-0000-0000-00000000000d'),('00000000-0000-0000-0000-00000000000e'),
 ('00000000-0000-0000-0000-00000000000f'),('00000000-0000-0000-0000-000000000010'),
 ('00000000-0000-0000-0000-000000000011');
insert into profiles (id, display_name, entry_year, is_admin) values
 ('00000000-0000-0000-0000-00000000000d','D',2026,false),('00000000-0000-0000-0000-00000000000e','E',2026,false),
 ('00000000-0000-0000-0000-00000000000f','F',2026,false),('00000000-0000-0000-0000-000000000010','G',2026,false),
 ('00000000-0000-0000-0000-000000000011','Admin',2026,true);
select expect_true((select count(*) = 2 from courses where kind = 'language'), 'F6 language seeds');
select expect_true((select count(*) = 6 from courses where kind = 'skill'), 'F6 skill seeds');
select expect_true((select kind = 'course' from courses where code = 'calc1'), 'existing courses keep their kind');
insert into course_topics values ('calc1','taylor','테일러 전개','Taylor series'),('calc1','limits','극한','Limits'),
 ('calc1','repeat','반복','Repeated requests'),('calc1','boundary','주 경계','Week boundary');
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select expect_error($$insert into course_topics values ('calc1','bad','x','x')$$, 'only admins edit topics');
select expect_error($$insert into requests (asker_id,course_code,topic,topic_tag,minutes,deadline,place)
 values (auth.uid(),'phys1','x','taylor',15,now()+interval '1 day','Library')$$, 'topic tags must belong to the course');
insert into requests (id,asker_id,course_code,topic,topic_tag,is_anonymous,minutes,deadline,place)
 values ('10000000-0000-0000-0000-000000000001',auth.uid(),'calc1','Anonymous question','taylor',true,15,now()+interval '1 day','Library');
select expect_true((select asker_id = auth.uid() from request_board where id = '10000000-0000-0000-0000-000000000001'), 'asker sees own identity');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
select expect_true((select count(*) = 0 from requests where id = '10000000-0000-0000-0000-000000000001'), 'third user cannot read raw anonymous request');
select expect_true((select count(*) = 1 and bool_and(asker_id is null) from request_board where id = '10000000-0000-0000-0000-000000000001'), 'board masks anonymous asker');
select expect_error($$update request_board set topic = 'bypass'$$, 'board is read only');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select accept_request('10000000-0000-0000-0000-000000000001',now()+interval '1 hour','Library') as anonymous_session \gset
select expect_true((select asker_id = '00000000-0000-0000-0000-00000000000b' from sessions where id = :'anonymous_session'), 'accepted helper sees session asker');
select expect_true((select count(*) = 1 from requests where id = '10000000-0000-0000-0000-000000000001'), 'accepted helper reads request');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
select expect_true((select count(*) = 0 from sessions where id = :'anonymous_session'), 'third user still cannot read matched session');
select expect_true((select count(*) = 0 from request_board where id = '10000000-0000-0000-0000-000000000001'), 'matched request leaves outsider board');
reset role;
select expect_true(not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='requests'), 'raw requests are not streamed');
select expect_true(exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='sessions'), 'session realtime retained');
set role anon; reset request.jwt.claim.sub;
select expect_error($$select * from request_board$$, 'signed-out callers cannot read request board');
reset role;

-- F1: separate caps, loop-only users, duplicate protection and participant-only access.
select date_trunc('week',now() at time zone 'Asia/Seoul')::date as current_week \gset
insert into ticket_awards (session_id,helper_id,week_start,tickets,breakdown)
 select id,helper_id,:'current_week',15,'{}' from sessions where status='completed';
set role service_role;
insert into loop_bonuses (loop_key,user_id,week_start,tickets,members,session_ids) values
 ('abc','00000000-0000-0000-0000-00000000000b',:'current_week',1,'{00000000-0000-0000-0000-00000000000a,00000000-0000-0000-0000-00000000000b,00000000-0000-0000-0000-00000000000c}','{10000000-0000-0000-0000-000000000011,10000000-0000-0000-0000-000000000012,10000000-0000-0000-0000-000000000013}'),
 ('abd','00000000-0000-0000-0000-00000000000b',:'current_week',1,'{00000000-0000-0000-0000-00000000000a,00000000-0000-0000-0000-00000000000b,00000000-0000-0000-0000-00000000000d}','{10000000-0000-0000-0000-000000000021,10000000-0000-0000-0000-000000000022,10000000-0000-0000-0000-000000000023}'),
 ('abe','00000000-0000-0000-0000-00000000000b',:'current_week',1,'{00000000-0000-0000-0000-00000000000a,00000000-0000-0000-0000-00000000000b,00000000-0000-0000-0000-00000000000e}','{10000000-0000-0000-0000-000000000031,10000000-0000-0000-0000-000000000032,10000000-0000-0000-0000-000000000033}'),
 ('abc','00000000-0000-0000-0000-00000000000a',:'current_week',1,'{00000000-0000-0000-0000-00000000000a,00000000-0000-0000-0000-00000000000b,00000000-0000-0000-0000-00000000000c}','{10000000-0000-0000-0000-000000000011,10000000-0000-0000-0000-000000000012,10000000-0000-0000-0000-000000000013}');
reset role;
select expect_error($$insert into loop_bonuses select * from loop_bonuses limit 1$$, 'loop award primary key prevents duplicates');
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select expect_true((select count(*) = 4 from loop_bonuses), 'loop member can read fellow member awards');
select expect_true((select tickets = 12 from week_tickets where user_id='00000000-0000-0000-0000-00000000000b' and week_start=:'current_week'), 'weekly base cap 10 plus loop cap 2');
select expect_true((select tickets = 1 from week_tickets where user_id=auth.uid() and week_start=:'current_week'), 'loop-only user appears in lottery pool');
select expect_error($$insert into loop_bonuses select * from loop_bonuses limit 1$$, 'client cannot write loop bonuses');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000010';
select expect_true((select count(*) = 0 from loop_bonuses), 'outsider cannot read loop member identities');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000011';
select expect_true((select count(*) = 4 from loop_bonuses), 'admin can review loop awards');
update course_topics set label_en='Limits and continuity' where course_code='calc1' and tag='limits';
select expect_true((select label_en='Limits and continuity' from course_topics where course_code='calc1' and tag='limits'), 'admin can edit topic labels');
reset role;

-- F2: public, bounded history, KST weeks and distinct-student suppression.
set timezone = 'UTC';
insert into requests (asker_id,course_code,topic,topic_tag,minutes,deadline,place)
 select id,'calc1','Limits','limits',15,now()+interval '1 day','Library' from profiles order by id limit 2;
set role anon; reset request.jwt.claim.sub;
select expect_true((select count(*) = 0 from stuck_map where topic_tag='limits'), 'two-request group is suppressed');
reset role;
insert into requests (asker_id,course_code,topic,topic_tag,minutes,deadline,place)
 values ('00000000-0000-0000-0000-00000000000c','calc1','Limits','limits',15,now()+interval '1 day','Library');
insert into requests (asker_id,course_code,topic,topic_tag,minutes,deadline,place)
 select '00000000-0000-0000-0000-00000000000a','calc1','Repeat','repeat',15,now()+interval '1 day','Library' from generate_series(1,3);
insert into requests (asker_id,course_code,topic,topic_tag,minutes,deadline,place,created_at)
 select id,'calc1','Boundary','boundary',15,now()+interval '1 day','Library',
   (:'current_week'::timestamp - interval '7 weeks') at time zone 'Asia/Seoul' from profiles order by id limit 3;
insert into requests (asker_id,course_code,topic,topic_tag,minutes,deadline,place,created_at)
 select id,'calc1','Too old','boundary',15,now()+interval '1 day','Library',
   (:'current_week'::timestamp - interval '8 weeks') at time zone 'Asia/Seoul' from profiles order by id limit 3;
set role anon;
select expect_true((select requests = 3 from stuck_map where topic_tag='limits'), 'three distinct students make group visible');
select expect_true((select count(*) = 0 from stuck_map where topic_tag='repeat'), 'one student cannot create a public group alone');
select expect_true((select count(*) = 1 and min(week_start) = :'current_week'::date - 49 from stuck_map where topic_tag='boundary'), 'KST boundary included and ninth week excluded');
reset role;

-- F4: six people includes the host; no credits or tickets for joins.
select sum(delta) as table_credits_before from ledger \gset
select count(*) as table_tickets_before from ticket_awards \gset
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into open_tables (id,host_id,place,starts_at,ends_at)
 values ('20000000-0000-0000-0000-000000000001',auth.uid(),'E11 Lounge',now()-interval '1 minute',now()+interval '1 hour');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select expect_error($$insert into open_table_joins values ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000c',now())$$, 'cannot join as another student');
insert into open_table_joins (table_id,user_id) values ('20000000-0000-0000-0000-000000000001',auth.uid());
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
insert into open_table_joins (table_id,user_id) values ('20000000-0000-0000-0000-000000000001',auth.uid());
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
insert into open_table_joins (table_id,user_id) values ('20000000-0000-0000-0000-000000000001',auth.uid());
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
insert into open_table_joins (table_id,user_id) values ('20000000-0000-0000-0000-000000000001',auth.uid());
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000f';
insert into open_table_joins (table_id,user_id) values ('20000000-0000-0000-0000-000000000001',auth.uid());
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000010';
select expect_error($$insert into open_table_joins (table_id,user_id) values ('20000000-0000-0000-0000-000000000001',auth.uid())$$, 'seventh person cannot join a six-person table');
select expect_error($$update open_tables set host_id=auth.uid()$$, 'host identity cannot be reassigned');
with changed as (update open_tables set ends_at=now() where id='20000000-0000-0000-0000-000000000001' returning id)
 select expect_true(count(*)=0, 'non-host cannot end table') from changed;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
with changed as (delete from open_table_joins where table_id='20000000-0000-0000-0000-000000000001' and user_id='00000000-0000-0000-0000-00000000000c' returning user_id)
 select expect_true(count(*)=0, 'cannot remove another student from a table') from changed;
delete from open_table_joins where table_id='20000000-0000-0000-0000-000000000001' and user_id=auth.uid();
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000010';
insert into open_table_joins (table_id,user_id) values ('20000000-0000-0000-0000-000000000001',auth.uid());
select expect_true((select count(*)=5 from open_table_joins where table_id='20000000-0000-0000-0000-000000000001'), 'leaving frees a place for another student');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update open_tables set ends_at=clock_timestamp()-interval '1 second' where id='20000000-0000-0000-0000-000000000001';
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select expect_error($$insert into open_table_joins (table_id,user_id) values ('20000000-0000-0000-0000-000000000001',auth.uid())$$, 'cannot join an ended table');
reset role;
select expect_true((select sum(delta)=:table_credits_before from ledger) and (select count(*)=:table_tickets_before from ticket_awards), 'Open Tables do not move credits or tickets');
select expect_true(not has_function_privilege('anon','helploop_private.enforce_open_table_capacity()','EXECUTE'), 'capacity trigger is not an anonymous RPC');

-- F7: owner/admin access, explicit opt-in and immediate revocation.
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select expect_true((select count(*)=1 from helper_course_stats where user_id=auth.uid()), 'owner sees their private per-course record');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
select expect_true((select count(*)=0 from helper_course_stats where user_id='00000000-0000-0000-0000-00000000000b'), 'other student cannot see private record');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000011';
select expect_true((select count(*)=1 from helper_course_stats where user_id='00000000-0000-0000-0000-00000000000b'), 'admin sees private record');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
update profiles set public_record=true where id=auth.uid();
set role anon; reset request.jwt.claim.sub;
select expect_true((select count(*)=1 from helper_course_stats where user_id='00000000-0000-0000-0000-00000000000b'), 'opted-in record can be shared signed out');
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
update profiles set public_record=false where id=auth.uid();
set role anon; reset request.jwt.claim.sub;
select expect_true((select count(*)=0 from helper_course_stats where user_id='00000000-0000-0000-0000-00000000000b'), 'turning record off revokes public access');
reset role;

set role service_role; reset request.jwt.claim.sub;
select expect_true((select count(*)=1 from helper_course_stats where user_id='00000000-0000-0000-0000-00000000000b'), 'trusted server can read private record without a user JWT');
reset role;
