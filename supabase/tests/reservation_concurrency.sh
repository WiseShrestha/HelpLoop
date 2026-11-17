#!/usr/bin/env bash
# Hold the first reservation open until the second transaction is blocked on it.
set -euo pipefail
test_tmp=$(mktemp -d)
trap 'touch "$test_tmp/commit"; rm -rf "$test_tmp"' EXIT
case_id=0
for isolation in 'read committed' 'repeatable read'; do
  case_id=$((case_id+1))
  asker="60000000-0000-0000-0000-00000000000$case_id"
  psql -q -v ON_ERROR_STOP=1 -d gp_test <<SQL
insert into auth.users values ('$asker');
insert into profiles (id, display_name, entry_year, consent) values ('$asker','Concurrent fixture',2026,true);
insert into private_profiles values ('$asker','Concurrent fixture','2026190$case_id','fixture@kaist.ac.kr');
SQL
  rm -f "$test_tmp/ready" "$test_tmp/commit"
  psql -q -v ON_ERROR_STOP=1 -d gp_test >"$test_tmp/first.log" 2>&1 <<SQL &
begin isolation level $isolation;
set local role authenticated;
set local request.jwt.claim.sub = '$asker';
insert into requests (asker_id, course_code, topic, minutes, deadline, place)
 values (auth.uid(),'calc1','First reservation',60,now()+interval '1 day','Library');
\! touch '$test_tmp/ready'
\! timeout 15 sh -c 'while [ ! -f "\$1" ]; do sleep .05; done' sh '$test_tmp/commit'
commit;
SQL
  first_pid=$!
  for _ in {1..100}; do [[ -e "$test_tmp/ready" ]] && break; sleep .05; done
  [[ -e "$test_tmp/ready" ]] || { cat "$test_tmp/first.log"; exit 1; }

  PGAPPNAME=helploop_reservation_contender psql -q -v ON_ERROR_STOP=1 -d gp_test >"$test_tmp/second.log" 2>&1 <<SQL &
begin isolation level $isolation;
set local statement_timeout = '12s';
set local role authenticated;
set local request.jwt.claim.sub = '$asker';
insert into requests (asker_id, course_code, topic, minutes, deadline, place)
 values (auth.uid(),'calc1','Second reservation',60,now()+interval '1 day','Library');
commit;
SQL
  second_pid=$!
  blocked=f
  for _ in {1..100}; do
    blocked=$(psql -At -d gp_test -c "select exists(select 1 from pg_stat_activity where application_name='helploop_reservation_contender' and cardinality(pg_blocking_pids(pid)) > 0)")
    [[ "$blocked" = t ]] && break
    kill -0 "$second_pid" 2>/dev/null || break
    sleep .05
  done
  touch "$test_tmp/commit"
  wait "$first_pid"
  if wait "$second_pid"; then echo 'FAIL second reservation succeeded'; exit 1; fi
  [[ "$blocked" = t ]]
  if [[ "$isolation" = 'read committed' ]]; then
    grep -q 'Not enough available credit' "$test_tmp/second.log" || { cat "$test_tmp/second.log"; exit 1; }
  else
    grep -q 'could not serialize access due to concurrent update' "$test_tmp/second.log" || { cat "$test_tmp/second.log"; exit 1; }
  fi
  [[ $(psql -At -d gp_test -c "select sum(minutes) from requests where asker_id='$asker'") = 60 ]]
  echo "PASS concurrent requests respect overdraft ($isolation)"
done
