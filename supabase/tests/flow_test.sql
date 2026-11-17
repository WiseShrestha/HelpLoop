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
insert into private_profiles values (auth.uid(), 'Student 2', '20261002', 'student2@kaist.ac.kr');
reset role;
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
insert into profiles (id, display_name, entry_year, help_courses, consent) values (auth.uid(), 'Outsider', 2026, '{calc1}', true);
insert into private_profiles values (auth.uid(), 'Student 3', '20261003', 'student3@kaist.ac.kr');
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
update profiles set consent = true where display_name = 'D';
insert into private_profiles values ('00000000-0000-0000-0000-00000000000d','Student D','20261004','d@kaist.ac.kr');
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
insert into requests (asker_id,course_code,topic,topic_tag,minutes,deadline,place,status)
 select id,'calc1','Limits','limits',15,now()+interval '1 day','Library','expired' from profiles order by id limit 2;
set role anon; reset request.jwt.claim.sub;
select expect_true((select count(*) = 0 from stuck_map where topic_tag='limits'), 'two-request group is suppressed');
reset role;
insert into requests (asker_id,course_code,topic,topic_tag,minutes,deadline,place,status)
 values ('00000000-0000-0000-0000-00000000000c','calc1','Limits','limits',15,now()+interval '1 day','Library','expired');
insert into requests (asker_id,course_code,topic,topic_tag,minutes,deadline,place,status)
 select '00000000-0000-0000-0000-00000000000a','calc1','Repeat','repeat',15,now()+interval '1 day','Library','expired' from generate_series(1,3);
insert into requests (asker_id,course_code,topic,topic_tag,minutes,deadline,place,status,created_at)
 select id,'calc1','Boundary','boundary',15,now()+interval '1 day','Library','expired',
   (:'current_week'::timestamp - interval '7 weeks') at time zone 'Asia/Seoul' from profiles order by id limit 3;
insert into requests (asker_id,course_code,topic,topic_tag,minutes,deadline,place,status,created_at)
 select id,'calc1','Too old','boundary',15,now()+interval '1 day','Library','expired',
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

-- C4: reproduce the 60+30 reservation scenario with realistic hosted grants.
insert into auth.users values ('30000000-0000-0000-0000-000000000012');
set role authenticated; set request.jwt.claim.sub='30000000-0000-0000-0000-000000000012';
insert into profiles (id,display_name,entry_year,consent) values (auth.uid(),'Permission test',2026,true);
insert into private_profiles values (auth.uid(),'Permission fixture','20261012','permissions@kaist.ac.kr');
select expect_error($$insert into requests (asker_id,course_code,topic,minutes,deadline,place) values
 (auth.uid(),'calc1','Bulk first',60,now()+interval '1 day','Library'),
 (auth.uid(),'calc1','Bulk second',60,now()+interval '1 day','Library')$$, 'overdraft rejects the entire over-budget batch');
select expect_true(my_open_request_minutes()=0, 'refused batch reserved no credits');
insert into requests (id,asker_id,course_code,topic,minutes,deadline,place) values
 ('40000000-0000-0000-0000-000000000001',auth.uid(),'calc1','First',60,now()+interval '1 day','Library'),
 ('40000000-0000-0000-0000-000000000002',auth.uid(),'calc1','Second',30,now()+interval '1 day','Library');
select expect_error($$insert into requests (asker_id,course_code,topic,minutes,deadline,place) values
 (auth.uid(),'calc1','Third',15,now()+interval '1 day','Library')$$,'third reservation still respects overdraft');
select expect_true(not has_column_privilege('authenticated','requests','minutes','UPDATE')
 and not has_column_privilege('authenticated','requests','created_at','UPDATE'), 'minutes and creation time have no client update privilege');
select expect_error($$update requests set minutes=120 where asker_id=auth.uid()$$,'cannot inflate reserved minutes');
select expect_error($$update requests set created_at='2000-01-01' where asker_id=auth.uid()$$,'cannot backdate existing requests');
select expect_error($$update requests set deadline=now()+interval '2 days' where asker_id=auth.uid()$$,'cannot change deadline');
select expect_error($$update requests set course_code='phys1',topic_tag=null,is_anonymous=true where asker_id=auth.uid()$$,'cannot rewrite request identity or classification');
select expect_true((select sum(minutes)=90 and my_balance()-sum(minutes)=-30 from requests where asker_id=auth.uid()), 'failed edits leave the original reservation intact');
update requests set status='cancelled' where id='40000000-0000-0000-0000-000000000001';
select expect_true((select status='cancelled' from requests where id='40000000-0000-0000-0000-000000000001'), 'owner can still cancel an open request');
insert into requests (asker_id,course_code,topic,minutes,deadline,place) values (auth.uid(),'calc1','After cancel',15,now()+interval '1 day','Library');
select expect_true(not has_column_privilege('authenticated','requests','created_at','INSERT'), 'creation time is server-managed on insert');
select expect_error($$insert into requests (asker_id,course_code,topic,minutes,deadline,place,created_at) values
 (auth.uid(),'calc1','Backdated insert',15,now()+interval '1 day','Library','2000-01-01')$$,'cannot backdate a new request');
set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000e';
with changed as (update requests set status='cancelled' where id='40000000-0000-0000-0000-000000000002' returning id)
 select expect_true(count(*)=0, 'outsider cannot cancel a request') from changed;

-- Public labels are safe reference data; overall helper identities require sign-in.
set role anon; reset request.jwt.claim.sub;
select expect_true(exists(select 1 from stuck_map m join courses c on c.code=m.course_code
 join course_topics t on (t.course_code,t.tag)=(m.course_code,m.topic_tag)
 where m.topic_tag='limits' and c.name_en='Calculus I' and t.label_en='Limits and continuity'), 'signed-out Stuck Map has readable course and topic labels');
select expect_true(not has_table_privilege('anon','helper_stats','SELECT') and not has_any_column_privilege('anon','helper_stats','SELECT'), 'hosted defaults do not expose helper directory');
select expect_error($$select * from helper_stats$$, 'signed-out helper directory is refused');
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000b';
select expect_true(exists(select 1 from helper_stats where user_id=auth.uid()), 'signed-in helper statistics remain readable');

-- A cancelled helper loses raw anonymous-request access; the open board stays masked.
set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000d';
select cancel_session(:'anonymous_session');
select expect_true((select count(*)=0 from requests where id='10000000-0000-0000-0000-000000000001'), 'cancelled helper loses raw request access');
select expect_true((select asker_id is null from request_board where id='10000000-0000-0000-0000-000000000001'), 'reopened anonymous request remains masked to former helper');

-- The host is reserved once, even with an explicit join. Future tables use delete.
set request.jwt.claim.sub='30000000-0000-0000-0000-000000000012';
insert into open_tables (id,host_id,place,starts_at,ends_at,max_people) values
 ('50000000-0000-0000-0000-000000000001',auth.uid(),'Library',now(),now()+interval '1 hour',2),
 ('50000000-0000-0000-0000-000000000002',auth.uid(),'Library',now()+interval '1 hour',now()+interval '2 hours',2);
insert into open_table_joins (table_id,user_id) values ('50000000-0000-0000-0000-000000000001',auth.uid());
select expect_error($$update open_tables set ends_at=now() where id='50000000-0000-0000-0000-000000000002'$$,'future table cannot end before its start');
delete from open_tables where id='50000000-0000-0000-0000-000000000002';
select expect_true((select count(*)=0 from open_tables where id='50000000-0000-0000-0000-000000000002'), 'host can delete a future table');
set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000d';
insert into open_table_joins (table_id,user_id) values ('50000000-0000-0000-0000-000000000001',auth.uid());
select expect_true((select count(*)=2 from open_table_joins where table_id='50000000-0000-0000-0000-000000000001'), 'explicit host join is not counted twice');
set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000e';
select expect_error($$insert into open_table_joins (table_id,user_id) values ('50000000-0000-0000-0000-000000000001',auth.uid())$$,'third person cannot join a two-person table with explicit host');

-- Referenced topic keys are stable; labels remain editable by admins.
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000011';
select expect_error($$delete from course_topics where course_code='calc1' and tag='limits'$$, 'cannot delete a referenced tag');
select expect_error($$update course_topics set tag='new-limits' where course_code='calc1' and tag='limits'$$, 'cannot rename a referenced tag');
update course_topics set label_en='Limits, clarified' where course_code='calc1' and tag='limits';
select expect_true((select label_en='Limits, clarified' from course_topics where course_code='calc1' and tag='limits'), 'admin can still improve a referenced label');
reset role;

-- Award shape checks run for real service-role writes, not only the SQL owner.
set role service_role; reset request.jwt.claim.sub;
insert into loop_bonuses select 'valid-shape',user_id,week_start,tickets,members,session_ids,created_at
 from loop_bonuses where loop_key='abc' limit 1;
select expect_error($$insert into loop_bonuses select 'duplicate-members',user_id,week_start,tickets,
 array[user_id,user_id,members[3]],session_ids,created_at from loop_bonuses where loop_key='abc' limit 1$$, 'loop members must be distinct');
select expect_error($$insert into loop_bonuses select 'duplicate-sessions',user_id,week_start,tickets,
 members,array[session_ids[1],session_ids[1],session_ids[3]],created_at from loop_bonuses where loop_key='abc' limit 1$$, 'loop sessions must be distinct');
select expect_error($$insert into loop_bonuses select 'non-monday',user_id,week_start+1,tickets,members,session_ids,created_at
 from loop_bonuses where loop_key='abc' limit 1$$, 'loop week must start Monday');
select expect_error($$update ticket_awards set week_start=week_start+1$$, 'base award week must start Monday');
reset role;

-- Pilot reference seed is repeatable and preserves admin-edited labels.
\ir ../seed.sql
\ir ../pilot_topics.sql
select expect_true((select count(*)=36 from course_topics where course_code in ('calc1','phys1','chem1','bio1','eng1','prog1') and tag not in ('taylor','repeat','boundary')), '36 starter topic tags cover the six pilot courses');
select count(*) as seeded_topic_count from course_topics \gset
\ir ../pilot_topics.sql
select expect_true((select count(*)=:seeded_topic_count from course_topics), 'repeating topic seed adds no duplicates');
select expect_true((select label_en='Limits, clarified' from course_topics where course_code='calc1' and tag='limits'), 'topic seed preserves edited labels');

-- C5: exercise the database entry points without going through page navigation.
reset role;
insert into auth.users values ('50000000-0000-0000-0000-000000000001');
insert into profiles (id,display_name,entry_year,consent)
 values ('50000000-0000-0000-0000-000000000001','Incomplete signup',2026,true);
insert into requests (id,asker_id,course_code,topic,minutes,deadline,place)
 values ('50000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000001',
 'calc1','Existing request from incomplete account',15,now()+interval '1 day','Library');

set role authenticated; set request.jwt.claim.sub='50000000-0000-0000-0000-000000000001';
select expect_error($$insert into requests (asker_id,course_code,topic,minutes,deadline,place)
 values (auth.uid(),'calc1','Incomplete signup',15,now()+interval '1 day','Library')$$,
 'consent without private profile cannot post');
select expect_error($$select accept_request('40000000-0000-0000-0000-000000000002',now(),'Library')$$,
 'consent without private profile cannot accept');
reset role;

insert into private_profiles values ('50000000-0000-0000-0000-000000000001','Private fixture','20261013','fixture@kaist.ac.kr');
update profiles set consent=false where id='50000000-0000-0000-0000-000000000001';
set role authenticated;
select expect_error($$insert into requests (asker_id,course_code,topic,minutes,deadline,place)
 values (auth.uid(),'calc1','Missing consent',15,now()+interval '1 day','Library')$$,
 'private profile without consent cannot post');
select expect_error($$select accept_request('40000000-0000-0000-0000-000000000002',now(),'Library')$$,
 'private profile without consent cannot accept');

set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000b';
select expect_error($$select accept_request('50000000-0000-0000-0000-000000000002',now(),'Library')$$,
 'completed helper cannot match an existing request from an incomplete asker');
reset role;
select expect_true(not exists (
 select 1 from sessions where request_id in ('40000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000002')
), 'refused matches create no sessions');
