#!/usr/bin/env bash
# Runs 0001_init.sql plus the flow/permission test on a plain local Postgres (16+).
# Usage: PGHOST=localhost PGPORT=5432 PGUSER=postgres ./supabase/tests/run_local.sh
set -euo pipefail
cd "$(dirname "$0")"
DB=gp_test
psql -q -c "drop database if exists $DB" -c "create database $DB"
psql -q -v ON_ERROR_STOP=1 -d $DB -f supabase_stub.sql
sed 's/^create extension if not exists pg_cron;/-- pg_cron stubbed/' ../migrations/0001_init.sql | psql -q -v ON_ERROR_STOP=1 -d $DB >/dev/null
out=$(psql -q -v ON_ERROR_STOP=1 -d $DB -f flow_test.sql 2>&1)
echo "$out"
if echo "$out" | grep -q "FAIL"; then echo "DB TESTS FAILED"; exit 1; fi
echo "DB TESTS PASSED"
