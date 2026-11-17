#!/usr/bin/env bash
# Runs all migrations plus the flow/permission test on a plain local Postgres (16+).
# Usage: PGHOST=localhost PGPORT=5432 PGUSER=postgres ./supabase/tests/run_local.sh
set -euo pipefail
cd "$(dirname "$0")"
DB=gp_test
psql -q -c "drop database if exists $DB" -c "create database $DB"
psql -q -v ON_ERROR_STOP=1 -d $DB -f supabase_stub.sql
for migration in ../migrations/*.sql; do
  sed 's/^create extension if not exists pg_cron;/-- pg_cron stubbed/' "$migration" | psql -q -v ON_ERROR_STOP=1 -d $DB >/dev/null
done
out=$(psql -q -v ON_ERROR_STOP=1 -d $DB -f flow_test.sql 2>&1) || { echo "$out"; exit 1; }
echo "$out"
if echo "$out" | grep -q "FAIL"; then echo "DB TESTS FAILED"; exit 1; fi
bash capacity_concurrency.sh
bash reservation_concurrency.sh
echo "DB TESTS PASSED"
