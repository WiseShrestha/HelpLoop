-- 0001_init.sql: the frozen contract for 공부품앗이. Never edit; add 0002_*.sql instead.
-- Credits and tickets are never written by clients. They change only inside the
-- security-definer functions below (or by the server with the service role).

create extension if not exists pg_cron;

create type request_status as enum ('open', 'matched', 'completed', 'cancelled', 'expired');
create type session_status as enum ('scheduled', 'completed', 'cancelled', 'disputed');
create type ledger_reason as enum ('starter', 'session_earned', 'session_spent', 'perk', 'admin');
create type claim_status as enum ('claimed', 'fulfilled', 'cancelled');

-- Constants shared with src/lib/model/ledger.ts. Keep in sync.
create function starter_minutes() returns int language sql immutable as $$ select 60 $$;
create function overdraft_limit() returns int language sql immutable as $$ select 30 $$;

---------------------------------------------------------------- people
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 20),
  entry_year int not null check (entry_year between 2000 and 2030),
  department text not null default 'undeclared',
  bio text check (char_length(bio) <= 200),
  help_courses text[] not null default '{}',
  consent boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Checked in person when a prize or perk is collected. Only the owner and admins can read it.
create table private_profiles (
  user_id uuid primary key references profiles on delete cascade,
  real_name text not null check (char_length(real_name) between 1 and 40),
  student_no text not null unique check (student_no ~ '^[0-9]{8}$'),
  kaist_email text check (kaist_email ~* '^[^@\s]+@kaist\.ac\.kr$')
);

create table courses (
  code text primary key,           -- short slug, e.g. 'calc1'
  name_ko text not null,
  name_en text not null,
  active boolean not null default true
);

---------------------------------------------------------------- help
create table requests (
  id uuid primary key default gen_random_uuid(),
  asker_id uuid not null references profiles on delete cascade,
  course_code text not null references courses,
  topic text not null check (char_length(topic) between 1 and 80),
  details text check (char_length(details) <= 500),
  minutes int not null check (minutes in (15, 30, 45, 60, 90, 120)),
  deadline timestamptz not null,
  place text not null check (char_length(place) between 1 and 60),
  status request_status not null default 'open',
  created_at timestamptz not null default now()
);
create index requests_open_idx on requests (status, course_code, deadline);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests on delete cascade,
  helper_id uuid not null references profiles on delete cascade,
  asker_id uuid not null references profiles on delete cascade,
  minutes int not null,
  scheduled_at timestamptz not null,
  place text not null,
  status session_status not null default 'scheduled',
  helper_confirmed_at timestamptz,
  asker_confirmed_at timestamptz,
  covered text check (char_length(covered) <= 300),   -- helper: what we went over
  rating int check (rating between 1 and 5),          -- asker: how helpful
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (helper_id <> asker_id)
);
create index sessions_pair_idx on sessions (helper_id, asker_id, completed_at);
-- At most one live session per request; cancelled ones don't block a new helper.
create unique index sessions_one_live_per_request on sessions (request_id) where status <> 'cancelled';

---------------------------------------------------------------- rewards
create table ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles on delete cascade,
  delta int not null,
  reason ledger_reason not null,
  session_id uuid references sessions on delete set null,
  perk_claim_id uuid,
  created_at timestamptz not null default now()
);
create index ledger_user_idx on ledger (user_id);

-- Written by the server (service role) after a session completes, using src/lib/model/tickets.ts.
create table ticket_awards (
  session_id uuid primary key references sessions on delete cascade,
  helper_id uuid not null references profiles on delete cascade,
  week_start date not null,         -- Monday (KST) of the session's week
  tickets numeric(6,2) not null check (tickets >= 0),
  breakdown jsonb not null,
  created_at timestamptz not null default now()
);
create index ticket_awards_week_idx on ticket_awards (week_start, helper_id);

create table draws (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  commit_hash text not null,        -- sha256(seed), published before the week's sessions
  seed text,                        -- revealed at the draw
  prizes jsonb not null,            -- e.g. [{"label":"₩30,000 café voucher"}]
  winners jsonb,                    -- [{"user_id":..., "display_name":..., "prize":...}]
  drawn_at timestamptz
);

create table perks (
  id uuid primary key default gen_random_uuid(),
  title text not null,              -- e.g. 'Coffee chat with an EE senior'
  host_label text not null,         -- e.g. 'EE, 4th year' (no names until claimed)
  description text,
  cost_minutes int not null check (cost_minutes > 0),
  capacity int not null check (capacity > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table perk_claims (
  id uuid primary key default gen_random_uuid(),
  perk_id uuid not null references perks on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  status claim_status not null default 'claimed',
  created_at timestamptz not null default now(),
  unique (perk_id, user_id)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions on delete cascade,
  reporter_id uuid not null references profiles on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table events (
  id bigint generated always as identity primary key,
  user_id uuid references profiles on delete set null,
  type text not null,
  ref_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

---------------------------------------------------------------- helpers
create function is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
$$;

create function my_balance() returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::int from ledger where user_id = auth.uid()
$$;

create function my_open_request_minutes() returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(minutes), 0)::int from requests where asker_id = auth.uid() and status in ('open', 'matched')
$$;

-- Starter credit on sign-up.
create function grant_starter() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into ledger (user_id, delta, reason) values (new.id, starter_minutes(), 'starter');
  insert into events (user_id, type) values (new.id, 'signed_up');
  return new;
end $$;
create trigger profiles_starter after insert on profiles for each row execute function grant_starter();

---------------------------------------------------------------- actions (call with supabase.rpc)
-- Helper takes an open request. Atomic: two helpers can't both take it.
create function accept_request(p_request uuid, p_scheduled_at timestamptz, p_place text)
returns uuid language plpgsql security definer set search_path = public as $$
declare r requests; sid uuid;
begin
  select * into r from requests where id = p_request for update;
  if r is null or r.status <> 'open' then raise exception 'This request is no longer open'; end if;
  if r.asker_id = auth.uid() then raise exception 'You cannot take your own request'; end if;
  if r.deadline <= now() then raise exception 'This request has passed its deadline'; end if;
  update requests set status = 'matched' where id = r.id;
  insert into sessions (request_id, helper_id, asker_id, minutes, scheduled_at, place)
    values (r.id, auth.uid(), r.asker_id, r.minutes, p_scheduled_at, coalesce(nullif(p_place, ''), r.place))
    returning id into sid;
  insert into events (user_id, type, ref_id) values (auth.uid(), 'request_accepted', sid);
  return sid;
end $$;

-- Each side confirms once. Helper must say what was covered; asker must rate.
-- When both have confirmed: session completes and credits move. Returns the new status.
create function confirm_session(p_session uuid, p_rating int default null, p_covered text default null)
returns session_status language plpgsql security definer set search_path = public as $$
declare s sessions;
begin
  select * into s from sessions where id = p_session for update;
  if s is null or s.status <> 'scheduled' then raise exception 'This session cannot be confirmed'; end if;

  if auth.uid() = s.helper_id then
    if coalesce(trim(p_covered), '') = '' then raise exception 'Say briefly what you covered'; end if;
    update sessions set helper_confirmed_at = now(), covered = p_covered where id = s.id;
  elsif auth.uid() = s.asker_id then
    if p_rating is null or p_rating not between 1 and 5 then raise exception 'Rate the session from 1 to 5'; end if;
    update sessions set asker_confirmed_at = now(), rating = p_rating where id = s.id;
  else
    raise exception 'You are not in this session';
  end if;
  insert into events (user_id, type, ref_id) values (auth.uid(), 'session_confirmed', s.id);

  select * into s from sessions where id = p_session;
  if s.helper_confirmed_at is not null and s.asker_confirmed_at is not null then
    update sessions set status = 'completed', completed_at = now() where id = s.id;
    update requests set status = 'completed' where id = s.request_id;
    insert into ledger (user_id, delta, reason, session_id) values
      (s.helper_id, s.minutes, 'session_earned', s.id),
      (s.asker_id, -s.minutes, 'session_spent', s.id);
    insert into events (user_id, type, ref_id) values (auth.uid(), 'session_completed', s.id);
    return 'completed';
  end if;
  return 'scheduled';
end $$;

-- Either side cancels before completion; the request reopens if its deadline hasn't passed.
create function cancel_session(p_session uuid) returns void language plpgsql security definer set search_path = public as $$
declare s sessions;
begin
  select * into s from sessions where id = p_session for update;
  if s is null or s.status <> 'scheduled' or auth.uid() not in (s.helper_id, s.asker_id) then
    raise exception 'This session cannot be cancelled';
  end if;
  update sessions set status = 'cancelled' where id = s.id;
  update requests set status = case when deadline > now() then 'open'::request_status else 'expired'::request_status end
    where id = s.request_id;
  insert into events (user_id, type, ref_id) values (auth.uid(), 'session_cancelled', s.id);
end $$;

create function claim_perk(p_perk uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare p perks; taken int; cid uuid;
begin
  select * into p from perks where id = p_perk and active for update;
  if p is null then raise exception 'This perk is not available'; end if;
  select count(*) into taken from perk_claims where perk_id = p.id and status <> 'cancelled';
  if taken >= p.capacity then raise exception 'All slots for this perk are taken'; end if;
  if my_balance() < p.cost_minutes then raise exception 'Not enough credit: help someone to earn more'; end if;
  insert into perk_claims (perk_id, user_id) values (p.id, auth.uid()) returning id into cid;
  insert into ledger (user_id, delta, reason, perk_claim_id) values (auth.uid(), -p.cost_minutes, 'perk', cid);
  insert into events (user_id, type, ref_id) values (auth.uid(), 'perk_claimed', cid);
  return cid;
end $$;

---------------------------------------------------------------- public stats
-- Helper leaderboard and profile stats. Ranks by distinct people helped, not hours.
create view helper_stats with (security_invoker = false) as
  select p.id as user_id, p.display_name, p.entry_year, p.department,
         count(s.id)::int as sessions_helped,
         count(distinct s.asker_id)::int as people_helped,
         coalesce(sum(s.minutes), 0)::int as minutes_helped,
         round(avg(s.rating), 2) as avg_rating
  from profiles p
  left join sessions s on s.helper_id = p.id and s.status = 'completed'
  group by p.id;

-- This week's tickets per helper (the lottery pool). Visible to all, like a public raffle board.
create view week_tickets with (security_invoker = false) as
  select t.helper_id as user_id, p.display_name, t.week_start, least(sum(t.tickets), 10)::numeric(6,2) as tickets
  from ticket_awards t join profiles p on p.id = t.helper_id
  group by t.helper_id, p.display_name, t.week_start;

grant select on helper_stats, week_tickets to authenticated;

---------------------------------------------------------------- RLS
alter table profiles enable row level security;
alter table private_profiles enable row level security;
alter table courses enable row level security;
alter table requests enable row level security;
alter table sessions enable row level security;
alter table ledger enable row level security;
alter table ticket_awards enable row level security;
alter table draws enable row level security;
alter table perks enable row level security;
alter table perk_claims enable row level security;
alter table reports enable row level security;
alter table events enable row level security;

create policy profiles_read on profiles for select to authenticated using (true);
create policy profiles_insert on profiles for insert to authenticated with check (id = auth.uid() and is_admin = false);
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and is_admin = (select is_admin from profiles where id = auth.uid()));
create policy profiles_delete on profiles for delete to authenticated using (id = auth.uid());

create policy private_read on private_profiles for select to authenticated using (user_id = auth.uid() or is_admin());
create policy private_insert on private_profiles for insert to authenticated with check (user_id = auth.uid());
create policy private_update on private_profiles for update to authenticated using (user_id = auth.uid());

create policy courses_read on courses for select to authenticated using (true);

create policy requests_read on requests for select to authenticated using (true);
create policy requests_insert on requests for insert to authenticated with check (
  asker_id = auth.uid() and status = 'open' and deadline > now()
  and my_balance() - my_open_request_minutes() - minutes >= -overdraft_limit()
);
create policy requests_cancel on requests for update to authenticated
  using (asker_id = auth.uid() and status = 'open')
  with check (asker_id = auth.uid() and status in ('open', 'cancelled'));

create policy sessions_read on sessions for select to authenticated using (auth.uid() in (helper_id, asker_id) or is_admin());
create policy ledger_read on ledger for select to authenticated using (user_id = auth.uid() or is_admin());
create policy tickets_read on ticket_awards for select to authenticated using (helper_id = auth.uid() or is_admin());
create policy draws_read on draws for select to authenticated using (true);
create policy perks_read on perks for select to authenticated using (true);
create policy claims_read on perk_claims for select to authenticated using (user_id = auth.uid() or is_admin());
create policy reports_insert on reports for insert to authenticated with check (
  reporter_id = auth.uid() and exists (select 1 from sessions s where s.id = session_id and auth.uid() in (s.helper_id, s.asker_id))
);
create policy reports_read on reports for select to authenticated using (is_admin());
create policy events_insert on events for insert to authenticated with check (user_id = auth.uid());
create policy events_read on events for select to authenticated using (is_admin());

grant execute on function accept_request, confirm_session, cancel_session, claim_perk, my_balance to authenticated;

---------------------------------------------------------------- housekeeping
create function expire_requests() returns void language sql security definer set search_path = public as $$
  update requests set status = 'expired' where status = 'open' and deadline <= now();
$$;
select cron.schedule('expire-requests', '*/10 * * * *', 'select expire_requests()');

alter publication supabase_realtime add table requests, sessions;
