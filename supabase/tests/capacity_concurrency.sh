#!/usr/bin/env bash
# Competing joins must not overfill a table, at default and stronger isolation.
set -euo pipefail
c3_test_tmp=$(mktemp -d)
trap 'rm -rf "$c3_test_tmp"' EXIT
c3_case=2
for c3_isolation in 'read committed' 'repeatable read'; do
  c3_table="20000000-0000-0000-0000-00000000000$c3_case"
  psql -q -v ON_ERROR_STOP=1 -d gp_test <<SQL
insert into open_tables (id,host_id,place,starts_at,ends_at,max_people) values
 ('$c3_table','00000000-0000-0000-0000-00000000000a','Library',now(),now()+interval '1 hour',2);
SQL
  psql -q -v ON_ERROR_STOP=1 -d gp_test >"$c3_test_tmp/first.log" 2>&1 <<SQL &
begin isolation level $c3_isolation;
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into open_table_joins (table_id,user_id) values ('$c3_table',auth.uid());
\! touch '$c3_test_tmp/ready'
select pg_sleep(1);
commit;
SQL
  c3_first_pid=$!
  for _ in {1..100}; do [[ -e "$c3_test_tmp/ready" ]] && break; sleep .05; done
  [[ -e "$c3_test_tmp/ready" ]] || { cat "$c3_test_tmp/first.log"; exit 1; }
  if psql -q -v ON_ERROR_STOP=1 -d gp_test >"$c3_test_tmp/second.log" 2>&1 <<SQL
begin isolation level $c3_isolation;
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
insert into open_table_joins (table_id,user_id) values ('$c3_table',auth.uid());
commit;
SQL
  then echo 'FAIL concurrent join exceeded capacity'; exit 1; fi
  wait "$c3_first_pid"
  grep -Eq 'This study table is full|could not serialize access due to concurrent update' "$c3_test_tmp/second.log"
  [[ $(psql -At -d gp_test -c "select count(*) from open_table_joins where table_id='$c3_table'") = 1 ]]
  echo "PASS concurrent joins respect capacity ($c3_isolation)"
  rm "$c3_test_tmp/ready"
  c3_case=$((c3_case+1))
done
