-- ── Family Pledge — parent accept RPC ──────────────────────────────────────────
-- Step 3 of the family-pledge flow. When an invited parent continues from P-ACCEPT, this
-- attaches them to the child the token already points to (spec §6, §9 "duplicate child" —
-- MERGE into the token's child, never create a second one). SECURITY DEFINER so the parent
-- can only ever claim the specific child the token resolves to — the client never passes,
-- or even sees, a child_id.
--
-- Scope: claims the child (sets children.owner_id) + marks the invite accepted. It does NOT
-- flip pledges to 'linked' or build the family_connections graph — that is the account-open
-- trigger (Step 4, P5). Additive and idempotent; safe to run on its own in the SQL Editor.

create or replace function accept_pledge_invite(p_token text)
returns uuid  -- the child_id the parent is now attached to
language plpgsql security definer set search_path = public as $$
declare
  v_uid      uuid := auth.uid();
  v_child_id uuid;
  v_expired  boolean;
  v_owner    uuid;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  select fi.child_id, (fi.expires_at < now()), c.owner_id
    into v_child_id, v_expired, v_owner
  from family_pledge_invites fi
  join children c on c.id = fi.child_id
  where fi.token = p_token and fi.direction = 'pledge_to_parent';

  if v_child_id is null then
    raise exception 'invite not found';
  end if;
  if v_expired then
    raise exception 'invite expired';
  end if;

  -- Claim the child if unclaimed; if already claimed by someone else, refuse.
  if v_owner is null then
    update children set owner_id = v_uid where id = v_child_id;
  elsif v_owner <> v_uid then
    raise exception 'child already claimed by another account';
  end if;

  update family_pledge_invites
     set status = 'accepted', accepted_at = now()
   where token = p_token and status <> 'accepted';

  return v_child_id;
end;
$$;
grant execute on function accept_pledge_invite(text) to authenticated;
