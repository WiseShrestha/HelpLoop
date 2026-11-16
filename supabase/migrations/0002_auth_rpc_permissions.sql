-- Keep privileged RPCs unavailable to unsigned callers.
revoke execute on function
  public.accept_request(uuid, timestamptz, text),
  public.confirm_session(uuid, integer, text),
  public.cancel_session(uuid),
  public.claim_perk(uuid),
  public.my_balance(),
  public.my_open_request_minutes(),
  public.is_admin(),
  public.grant_starter(),
  public.expire_requests()
from public, anon;

-- Application users can call only the functions needed by the app and RLS.
grant execute on function
  public.accept_request(uuid, timestamptz, text),
  public.confirm_session(uuid, integer, text),
  public.cancel_session(uuid),
  public.claim_perk(uuid),
  public.my_balance(),
  public.my_open_request_minutes(),
  public.is_admin()
to authenticated, service_role;

-- Trigger and scheduled-job functions remain internal.
revoke execute on function public.grant_starter(), public.expire_requests() from authenticated;
grant execute on function public.grant_starter(), public.expire_requests() to service_role;
