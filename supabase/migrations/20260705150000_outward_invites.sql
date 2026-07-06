-- ── Family Pledge — outward invites (P6) ───────────────────────────────────────
-- Step 5. The parent recruits family: create_family_invite mints an invite_to_family
-- token for their child; the recipient pledges against that EXISTING child via
-- create_pledge_for_child (no duplicate child — spec §6 P6, §9). Additive + idempotent.

-- ── create_family_invite: parent → family (auth; caller must own the child) ────
create or replace function create_family_invite(
  p_child_id       uuid,
  p_channel        text,
  p_recipient_email text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_owner uuid;
  v_token text;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  select owner_id into v_owner from children where id = p_child_id;
  if v_owner is null then raise exception 'child not found'; end if;
  if v_owner <> v_uid then raise exception 'not your child'; end if;

  v_token := encode(extensions.gen_random_bytes(16), 'hex');
  insert into family_pledge_invites (token, direction, child_id, created_by_user_id, channel, recipient_email)
  values (v_token, 'invite_to_family', p_child_id, v_uid, p_channel, p_recipient_email);
  return v_token;
end;
$$;
grant execute on function create_family_invite(uuid, text, text) to authenticated;

-- ── create_pledge_for_child: family member pledges to an EXISTING child (anon) ─
-- Resolves the child from the invite_to_family token (never exposes/accepts a child_id),
-- attaches the pledge, marks the parent's invite accepted, and returns a fresh token for
-- the pledger's status page (reusing get_pledge_payin). If the account is already open the
-- pledge lands 'linked' so the pledger sees pay-in details immediately.
create or replace function create_pledge_for_child(
  p_token             text,
  p_amount_pennies    int,
  p_frequency         text,
  p_start_trigger     text,
  p_personal_message  text,
  p_pledger_name      text,
  p_pledger_email     text,
  p_relationship      text,
  p_custom_start_date date default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_child_id  uuid;
  v_expired   boolean;
  v_acct      text;
  v_pledge_id uuid;
  v_status    text;
  v_token     text;
begin
  select fi.child_id, (fi.expires_at < now()), c.account_status
    into v_child_id, v_expired, v_acct
  from family_pledge_invites fi
  join children c on c.id = fi.child_id
  where fi.token = p_token and fi.direction = 'invite_to_family';

  if v_child_id is null then raise exception 'invite not found'; end if;
  if v_expired then raise exception 'invite expired'; end if;

  v_status := case when v_acct = 'account_open' then 'linked' else 'sent' end;

  insert into family_pledges (
    child_id, pledger_name, pledger_email, pledger_relationship,
    amount_pennies, frequency, start_trigger, custom_start_date,
    personal_message, status, sent_at
  ) values (
    v_child_id, p_pledger_name, p_pledger_email, p_relationship,
    p_amount_pennies, p_frequency, p_start_trigger, p_custom_start_date,
    p_personal_message, v_status, now()
  ) returning id into v_pledge_id;

  update family_pledge_invites
     set status = 'accepted', accepted_at = now()
   where token = p_token and status <> 'accepted';

  -- Fresh status-page record for the pledger (keyed by its own token).
  v_token := encode(extensions.gen_random_bytes(16), 'hex');
  insert into family_pledge_invites (token, direction, child_id, pledge_id, channel)
  values (v_token, 'pledge_to_parent', v_child_id, v_pledge_id, 'copy_link');

  return v_token;
end;
$$;
grant execute on function create_pledge_for_child(text, int, text, text, text, text, text, text, date) to anon, authenticated;
