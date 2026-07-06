-- ── Family Pledge — email read RPCs ────────────────────────────────────────────
-- Fix for the send-pledge-email Edge Function. Its service-role client was NOT bypassing
-- RLS on family_pledges / family_pledge_invites, so §8.2 / §8.4 / §8.3 reads returned
-- nothing ("no recipient"). These SECURITY DEFINER functions read as owner (bypass RLS
-- deterministically), so the function fetches send data via RPC regardless of the calling
-- client's role. Additive + idempotent.
--
-- Privacy note: get_invite_email_data returns recipient_email, but only for an unguessable
-- token the sender already holds (and chose the recipient for). This is a deliberate, scoped
-- exposure for the send path only — the accept-screen RPC (get_pledge_invite) still excludes
-- email. get_account_open_notifications is auth-gated to the child's owner.

-- ── §8.2 / §8.4: everything the invite email needs, keyed by token ────────────
create or replace function get_invite_email_data(p_token text)
returns table (
  direction         text,
  recipient_email   text,
  child_name        text,
  sender_first_name text,   -- pledger (pledge_to_parent) OR parent (invite_to_family)
  amount_pennies    int,
  frequency         text,
  personal_message  text
)
language sql security definer set search_path = public as $$
  select
    fi.direction,
    fi.recipient_email,
    c.name,
    case
      when fi.direction = 'invite_to_family'
        then split_part(coalesce(p.full_name, ''), ' ', 1)
      else split_part(coalesce(pl.pledger_name, ''), ' ', 1)
    end,
    pl.amount_pennies,
    pl.frequency,
    pl.personal_message
  from family_pledge_invites fi
  join children c on c.id = fi.child_id
  left join family_pledges pl on pl.id = fi.pledge_id
  left join profiles p on p.id = fi.created_by_user_id
  where fi.token = p_token;
$$;
grant execute on function get_invite_email_data(text) to anon, authenticated, service_role;

-- ── §8.3: one row per linked pledger to notify (auth-gated to the child's owner) ─
-- Called with the parent's JWT, so auth.uid() is the parent; the function verifies
-- ownership itself, then returns pay-in details + each pledger's email + status token.
create or replace function get_account_open_notifications(p_child_id uuid)
returns table (
  child_name        text,
  provider_name     text,
  sort_code         text,
  account_number    text,
  payment_reference text,
  pledger_email     text,
  amount_pennies    int,
  frequency         text,
  status_token      text
)
language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_owner  uuid;
  v_status text;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  select owner_id, account_status into v_owner, v_status from children where id = p_child_id;
  if v_owner is null or v_owner <> v_uid then raise exception 'not your child'; end if;
  if v_status <> 'account_open' then return; end if;

  return query
  select
    c.name,
    j.provider_name,
    j.sort_code,
    j.account_number,
    j.payment_reference,
    fp.pledger_email,
    fp.amount_pennies,
    fp.frequency,
    si.token
  from family_pledges fp
  join children c on c.id = fp.child_id
  left join jisa_accounts j on j.child_id = c.id
  left join lateral (
    select token from family_pledge_invites
    where pledge_id = fp.id and direction = 'pledge_to_parent'
    limit 1
  ) si on true
  where fp.child_id = p_child_id
    and fp.status = 'linked'
    and fp.pledger_email is not null;
end;
$$;
grant execute on function get_account_open_notifications(uuid) to authenticated, service_role;
