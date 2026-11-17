-- Minimal stand-ins for what Supabase provides, so 0001_init.sql runs on plain Postgres.
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create schema cron;
create function cron.schedule(a text, b text, c text) returns bigint language sql as $$ select 1::bigint $$;
create publication supabase_realtime;
alter role service_role bypassrls;
grant usage on schema public, auth to authenticated, anon, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to authenticated;
-- test helper
create function expect_error(q text, label text) returns text language plpgsql as $$
begin
  begin execute q; exception when others then return 'PASS ' || label || ' -> ' || sqlerrm; end;
  raise exception 'FAIL (no error): %', label;
end $$;
grant execute on function expect_error to authenticated;

create function expect_true(ok boolean, label text) returns text language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'FAIL %', label; end if;
  return 'PASS ' || label;
end $$;
