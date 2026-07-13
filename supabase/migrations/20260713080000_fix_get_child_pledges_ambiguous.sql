-- ── Fix: get_child_pledges "column reference id is ambiguous" ──────────────────
-- The function's RETURNS TABLE declares an output column `id` (and `status`, `linked_at`),
-- which are in scope as PL/pgSQL variables inside the body. Unqualified references like
-- `where id = p_child_id` and `where ... status in (...)` collided with them and raised
-- 42702 at runtime — so the parent's home always got an empty list and the Family ring
-- showed £0, even with a correctly-linked pledge.
--
-- Fix: qualify EVERY column with its table alias, plus `#variable_conflict use_column` as a
-- belt-and-braces guard. Behaviour is otherwise identical to the self-heal version. Idempotent.

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
#variable_conflict use_column
declare
  v_uid   uuid := auth.uid();
  v_owner uuid;
  v_open  boolean;
begin
  if v_uid is null then raise exception 'authentication required'; end if;

  select c.owner_id, (c.account_status = 'account_open')
    into v_owner, v_open
  from children c
  where c.id = p_child_id;

  if v_owner is null or v_owner <> v_uid then raise exception 'not your child'; end if;

  -- Self-heal: once the account is open, link any pledge still stuck 'draft'/'sent'.
  if v_open then
    update family_pledges fp
       set status = 'linked', linked_at = coalesce(fp.linked_at, now())
     where fp.child_id = p_child_id
       and fp.status in ('draft', 'sent');
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
