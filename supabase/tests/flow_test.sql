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
select 'C sees open requests = ' || count(*) from requests where status = 'open';
select 'C sees private profiles of others = ' || count(*) from private_profiles;
reset role;

-- B accepts the Taylor request
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select 'B accepted, session made = ' || (accept_request((select id from requests where topic='Taylor series'), now()+interval '2 hours', '') is not null);
reset role;
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select expect_error($$select accept_request((select id from requests where topic='Taylor series'), now(), 'x')$$, 'second helper cannot take a matched request');
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
select accept_request((select id from requests where topic='Torque'), now()+interval '1 hour', '') is not null;
select cancel_session((select id from sessions where status='scheduled'));
select 'after cancel, Torque request is ' || status from requests where topic='Torque';
reset role;
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select 'A can take reopened request = ' || (accept_request((select id from requests where topic='Torque'), now()+interval '1 hour', '') is not null);
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
