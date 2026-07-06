-- Corrected create_family_pledge (v3) — DROPS every overload and recreates exactly one
-- correct function, then verifies. Use this because a "create or replace" (v2) couldn't
-- fix the problem: either it didn't apply, or a stale overload with a different signature
-- was shadowing it. Paste this whole file into the Supabase SQL Editor and run once.
--
-- Includes both fixes:
--   1. Token: schema-qualified extensions.gen_random_bytes.
--   2. recipient_email included in the family_pledge_invites INSERT (fixes §8.2 "no recipient").
--
-- Safe: create_family_pledge has no in-DB dependents (only the app + REST call it). The
-- drop + recreate run in one transaction, so it can't be left half-applied.

begin;

-- Drop ALL overloads of public.create_family_pledge (however many exist).
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'create_family_pledge' and n.nspname = 'public'
  loop
    execute 'drop function ' || r.sig::text;
  end loop;
end $$;

-- Recreate the one correct function.
create function create_family_pledge(
  p_child_name         text,
  p_amount_pennies     int,
  p_frequency          text,
  p_start_trigger      text,
  p_personal_message   text,
  p_pledger_name       text,
  p_pledger_email      text,
  p_relationship       text,
  p_channel            text,
  p_approx_age_months  int  default null,
  p_custom_start_date  date default null,
  p_recipient_email    text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_child_id  uuid;
  v_pledge_id uuid;
  v_token     text;
begin
  insert into children (name, approx_age_months, account_status)
  values (p_child_name, p_approx_age_months, 'no_account')
  returning id into v_child_id;

  insert into family_pledges (
    child_id, pledger_name, pledger_email, pledger_relationship,
    amount_pennies, frequency, start_trigger, custom_start_date,
    personal_message, status, sent_at
  ) values (
    v_child_id, p_pledger_name, p_pledger_email, p_relationship,
    p_amount_pennies, p_frequency, p_start_trigger, p_custom_start_date,
    p_personal_message, 'sent', now()
  ) returning id into v_pledge_id;

  -- Fix 1: schema-qualified pgcrypto for the opaque token.
  v_token := encode(extensions.gen_random_bytes(16), 'hex');

  -- Fix 2: recipient_email included (the parent's address when channel = email).
  insert into family_pledge_invites (
    token, direction, child_id, pledge_id, channel, recipient_email
  ) values (
    v_token, 'pledge_to_parent', v_child_id, v_pledge_id, p_channel, p_recipient_email
  );

  return v_token;
end;
$$;

grant execute on function create_family_pledge(
  text, int, text, text, text, text, text, text, text, int, date, text
) to anon, authenticated;

commit;

-- ── Verify: exactly ONE function, and its invite INSERT includes recipient_email ──
select
  p.oid::regprocedure as signature,
  (pg_get_functiondef(p.oid) ilike '%channel, recipient_email%') as invite_insert_has_recipient_email
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname = 'create_family_pledge' and n.nspname = 'public';
