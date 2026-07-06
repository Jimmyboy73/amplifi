-- ── Family Pledge — account-open trigger + pay-in read ─────────────────────────
-- Step 4. When the parent confirms the child's Junior ISA (P5), confirm_child_account
-- is the TRIGGER EVENT (spec §6 P5): mark the child account_open, flip its pledges to
-- 'linked', and build the family_connections graph for any pledger who already has an
-- account. get_pledge_payin then feeds the grandparent's F-STATUS with display-only
-- pay-in details once the account is open. Additive + idempotent — safe to run alone.

-- ── confirm_child_account: the trigger (auth; caller must own the child) ───────
create or replace function confirm_child_account(p_child_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_owner uuid;
begin
  if v_uid is null then raise exception 'authentication required'; end if;

  select owner_id into v_owner from children where id = p_child_id;
  if v_owner is null then raise exception 'child not found'; end if;
  if v_owner <> v_uid then raise exception 'not your child'; end if;

  -- Guard: don't mark open without pay-in details for third parties to use.
  if not exists (select 1 from jisa_accounts where child_id = p_child_id) then
    raise exception 'account details required before confirming';
  end if;

  update children set account_status = 'account_open' where id = p_child_id;

  -- Auto-link every pending pledge for this child (operates on THIS child only — no
  -- "first child" assumption).
  update family_pledges
     set status = 'linked'
   where child_id = p_child_id and status in ('draft', 'sent');

  -- Build the graph for pledgers who ALREADY have an account. Soft-record pledgers
  -- (Option A: no account yet, pledger_user_id NULL) get their family_connections row
  -- when they sign up on return — nothing to insert for them here.
  insert into family_connections (requester_id, parent_id, child_id, status, relationship)
  select distinct fp.pledger_user_id, v_uid, p_child_id, 'approved',
         case fp.pledger_relationship
           when 'grandparent' then 'grandparent'
           when 'friend'      then 'friend'
           else 'other'
         end
  from family_pledges fp
  where fp.child_id = p_child_id
    and fp.pledger_user_id is not null
    and not exists (
      select 1 from family_connections fc
      where fc.child_id = p_child_id and fc.requester_id = fp.pledger_user_id
    );
end;
$$;
grant execute on function confirm_child_account(uuid) to authenticated;

-- ── get_pledge_payin: F-STATUS data for the grandparent (anon, NO email) ──────
-- Bank details are returned ONLY once account_status = 'account_open' (nulled otherwise,
-- belt-and-braces). The token is the only key; the pledger's email is never returned.
create or replace function get_pledge_payin(p_token text)
returns table (
  child_display_name text,
  amount_pennies     int,
  frequency          text,
  personal_message   text,
  invite_status      text,
  account_status     text,
  provider_name      text,
  sort_code          text,
  account_number     text,
  payment_reference  text
)
language sql security definer set search_path = public as $$
  select
    c.name,
    pl.amount_pennies,
    pl.frequency,
    pl.personal_message,
    fi.status,
    c.account_status,
    case when c.account_status = 'account_open' then j.provider_name    end,
    case when c.account_status = 'account_open' then j.sort_code         end,
    case when c.account_status = 'account_open' then j.account_number    end,
    case when c.account_status = 'account_open' then j.payment_reference end
  from family_pledge_invites fi
  join children c on c.id = fi.child_id
  left join family_pledges pl on pl.id = fi.pledge_id
  left join jisa_accounts  j on j.child_id = c.id
  where fi.token = p_token;
$$;
grant execute on function get_pledge_payin(text) to anon, authenticated;
