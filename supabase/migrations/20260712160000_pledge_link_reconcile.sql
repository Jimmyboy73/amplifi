-- ── Pledge-linking reconcile — self-heal on the parent's own read ──────────────
-- QA found a real family pledge showing £0 on the parent's home: the home only counts
-- pledges with status 'linked', but a pledge can end up stuck at 'sent' while the child's
-- account is already open (any ordering hiccup, or a pledge that pre-dates the account
-- being confirmed). create_pledge_for_child and confirm_child_account both link at their
-- own moment, but nothing repairs a pledge that slips between them.
--
-- Fix: make the parent's own read (get_child_pledges) the source of truth — before it
-- returns, it links any of THIS child's 'draft'/'sent' pledges to 'linked' (stamping
-- linked_at, so the pot accrues from the moment it became payable, never backdated) IFF
-- the child's account is already open. Owner-gated (the RPC already verifies ownership),
-- idempotent, and self-repairing: the £0 pledge appears the next time home loads.
--
-- One-off backfill below fixes any already-stuck pledge immediately. Additive + idempotent.

-- ── Backfill: link any pledge stuck 'sent'/'draft' whose child's account is open ──
update family_pledges fp
   set status = 'linked',
       linked_at = coalesce(fp.linked_at, now())
  from children c
 where c.id = fp.child_id
   and c.account_status = 'account_open'
   and fp.status in ('draft', 'sent');

-- ── get_child_pledges: self-heal, then return (parent-only, auth-gated, NO email) ─
create or replace function get_child_pledges(p_child_id uuid)
returns table (
  id             uuid,
  pledger_name   text,
  relationship   text,
  amount_pennies int,
  frequency      text,
  status         text,
  linked_at      timestamptz
)
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_owner uuid;
  v_open  boolean;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  select owner_id, (account_status = 'account_open')
    into v_owner, v_open
  from children where id = p_child_id;
  if v_owner is null or v_owner <> v_uid then raise exception 'not your child'; end if;

  -- Self-heal: once the account is open, no pledge should linger unlinked. Link them
  -- here so the parent's home always reflects real pledges (accrues from now(), the
  -- moment we notice — never before the account was open).
  if v_open then
    update family_pledges
       set status = 'linked', linked_at = coalesce(linked_at, now())
     where child_id = p_child_id and status in ('draft', 'sent');
  end if;

  return query
  select fp.id, fp.pledger_name, fp.pledger_relationship, fp.amount_pennies,
         fp.frequency, fp.status, fp.linked_at
  from family_pledges fp
  where fp.child_id = p_child_id
    and fp.status not in ('draft', 'cancelled')
  order by fp.created_at;
end;
$$;
grant execute on function get_child_pledges(uuid) to authenticated;
