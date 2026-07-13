-- ── Phase 3 email reads — server-side lookups for the new transactional emails ──
-- Three SECURITY DEFINER read RPCs, mirroring the existing get_invite_email_data pattern:
-- the browser passes only an opaque, unguessable key (a status token or a gift UUID); the
-- recipient + body are derived server-side, so none of these can be used as an open relay.
--
--   1. get_pledge_thankyou_data  — thank the PLEDGER after they pledge (to their own email).
--   2. get_pledge_parent_notify  — tell the PARENT an invited pledge landed (owner's email).
--   3. get_occasion_gift_notify  — thank the GIFTER + tell the PARENT a gift came in.
--
-- Parent emails come from auth.users via children.owner_id. These reads are BEST-EFFORT and
-- live OUTSIDE the pledge/gift write path — if the auth.users read is ever not permitted, only
-- the email is skipped; nothing that records a pledge or gift can break. Additive + idempotent.

-- ── 1. Grandparent thank-you (keyed by the pledger's status token) ─────────────
create or replace function get_pledge_thankyou_data(p_token text)
returns table (
  pledger_email  text,
  child_name     text,
  amount_pennies int,
  frequency      text,
  account_open   boolean
)
language sql security definer set search_path = public as $$
  select
    pl.pledger_email,
    c.name,
    pl.amount_pennies,
    pl.frequency,
    (c.account_status = 'account_open')
  from family_pledge_invites fi
  join family_pledges pl on pl.id = fi.pledge_id
  join children c        on c.id = fi.child_id
  where fi.token = p_token and fi.direction = 'pledge_to_parent';
$$;
grant execute on function get_pledge_thankyou_data(text) to anon, authenticated;

-- ── 2. Notify the parent an invited pledge landed (keyed by the same token) ─────
create or replace function get_pledge_parent_notify(p_token text)
returns table (
  parent_email        text,
  pledger_first_name  text,
  child_name          text,
  amount_pennies      int,
  frequency           text
)
language sql security definer set search_path = public as $$
  select
    u.email,
    split_part(coalesce(pl.pledger_name, ''), ' ', 1),
    c.name,
    pl.amount_pennies,
    pl.frequency
  from family_pledge_invites fi
  join family_pledges pl on pl.id = fi.pledge_id
  join children c        on c.id = fi.child_id
  join auth.users u      on u.id = c.owner_id
  where fi.token = p_token and fi.direction = 'pledge_to_parent';
$$;
grant execute on function get_pledge_parent_notify(text) to anon, authenticated;

-- ── 3. Occasion gift — thank the gifter + tell the parent (keyed by gift UUID) ──
create or replace function get_occasion_gift_notify(p_gift_id uuid)
returns table (
  gifter_name       text,
  gifter_email      text,
  amount_gbp        numeric,
  child_name        text,
  occasion_title    text,
  parent_email      text,
  account_open      boolean,
  provider_name     text,
  sort_code         text,
  account_number    text,
  payment_reference text
)
language sql security definer set search_path = public as $$
  select
    g.gifter_name,
    g.gifter_email,
    g.amount_gbp,
    c.name,
    o.title,
    u.email,
    (c.account_status = 'account_open'),
    j.provider_name,
    j.sort_code,
    j.account_number,
    j.payment_reference
  from occasion_gifts g
  join occasions o      on o.id = g.occasion_id
  join children c       on c.id = o.child_id
  left join auth.users u on u.id = c.owner_id
  left join jisa_accounts j on j.child_id = c.id
  where g.id = p_gift_id;
$$;
grant execute on function get_occasion_gift_notify(uuid) to anon, authenticated;
