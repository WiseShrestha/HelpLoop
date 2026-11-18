-- C7: perks respect reserved request minutes, and draw weeks start on Monday (KST).
begin;

-- Before: claim_perk checked only the balance, so a student with 60 credits and
-- 90 reserved minutes could buy a 60-minute perk and reach -90 once sessions
-- completed. Now the perk must be covered by balance minus reserved minutes.
create or replace function public.claim_perk(p_perk uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  claimant uuid := auth.uid();
  p public.perks;
  taken int;
  available bigint;
  cid uuid;
begin
  if not exists (
    select 1 from public.profiles pr
    join public.private_profiles i on i.user_id = pr.id
    where pr.id = claimant and pr.consent
  ) then
    raise exception 'Complete onboarding before claiming a perk' using errcode = '42501';
  end if;

  select * into p from public.perks where id = p_perk and active for update;
  if p.id is null then raise exception 'This perk is not available'; end if;

  -- Same lock as the request-reservation trigger (0005): serializes this
  -- student's perk claims and new requests against each other.
  update public.profiles set entry_year = entry_year where id = claimant;

  select count(*) into taken from public.perk_claims where perk_id = p.id and status <> 'cancelled';
  if taken >= p.capacity then raise exception 'All slots for this perk are taken'; end if;

  select
    coalesce((select sum(l.delta) from public.ledger l where l.user_id = claimant), 0)
    - coalesce((select sum(r.minutes) from public.requests r
      where r.asker_id = claimant and r.status in ('open', 'matched')), 0)
  into available;
  if available < p.cost_minutes then
    raise exception 'Not enough credit: help someone to earn more';
  end if;

  insert into public.perk_claims (perk_id, user_id) values (p.id, claimant) returning id into cid;
  insert into public.ledger (user_id, delta, reason, perk_claim_id) values (claimant, -p.cost_minutes, 'perk', cid);
  insert into public.events (user_id, type, ref_id) values (claimant, 'perk_claimed', cid);
  return cid;
end $$;

-- draws.week_start joins week_tickets.week_start, which is always a Monday.
-- A Sunday (the UTC date of Monday 00:00 KST) would silently draw from an empty pool.
alter table public.draws add constraint draw_week_monday check (extract(isodow from week_start) = 1);

commit;
