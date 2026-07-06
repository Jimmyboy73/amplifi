-- ── Family Pledge — linked_at + parent-facing pledge read ──────────────────────
-- Path 1 (consolidate onto the token/pledge flow): surface family_pledges in the pot and
-- the family roster.
--   * linked_at records WHEN a pledge became payable (account open), so the pot accrues
--     from that moment — never backdated to when the pledge was merely sent.
--   * get_child_pledges lets the child's owner read their pledges (family_pledges has RLS
--     and the parent isn't the pledger). SECURITY DEFINER, ownership-checked, NO email.
-- Additive + idempotent.

alter table family_pledges add column if not exists linked_at timestamptz;

-- ── confirm_child_account: stamp linked_at when pledges flip to 'linked' ───────
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
  if not exists (select 1 from jisa_accounts where child_id = p_child_id) then
    raise exception 'account details required before confirming';
  end if;

  update children set account_status = 'account_open' where id = p_child_id;

  update family_pledges
     set status = 'linked', linked_at = now()
   where child_id = p_child_id and status in ('draft', 'sent');

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

-- ── create_pledge_for_child: set linked_at when the pledge lands 'linked' ──────
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
    personal_message, status, sent_at, linked_at
  ) values (
    v_child_id, p_pledger_name, p_pledger_email, p_relationship,
    p_amount_pennies, p_frequency, p_start_trigger, p_custom_start_date,
    p_personal_message, v_status, now(),
    case when v_status = 'linked' then now() else null end
  ) returning id into v_pledge_id;

  update family_pledge_invites
     set status = 'accepted', accepted_at = now()
   where token = p_token and status <> 'accepted';

  v_token := encode(extensions.gen_random_bytes(16), 'hex');
  insert into family_pledge_invites (token, direction, child_id, pledge_id, channel)
  values (v_token, 'pledge_to_parent', v_child_id, v_pledge_id, 'copy_link');

  return v_token;
end;
$$;
grant execute on function create_pledge_for_child(text, int, text, text, text, text, text, text, date) to anon, authenticated;

-- ── get_child_pledges: parent reads their child's pledges (auth-gated, NO email) ─
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
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  select owner_id into v_owner from children where id = p_child_id;
  if v_owner is null or v_owner <> v_uid then raise exception 'not your child'; end if;

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
