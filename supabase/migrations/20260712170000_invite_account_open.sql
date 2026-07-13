-- ── Account-aware pledge flow — expose account-open on the invite lookup ───────
-- When a family member opens an invite for a child whose JISA is ALREADY linked, the
-- pledge flow should say "you can start straight away" instead of "nothing to set up yet,
-- we'll tell you when it opens". get_pledge_invite already resolves the child; add a single
-- account_open boolean so the (unauthenticated) accept screen can adapt its copy. Still
-- excludes the pledger's email. Additive column at the end — safe for existing callers.
--
-- Postgres can't change a function's return type with CREATE OR REPLACE, so drop first.
-- The drop + recreate run together, so the function is never missing between statements.

drop function if exists get_pledge_invite(text);

create or replace function get_pledge_invite(p_token text)
returns table (
  invite_id          uuid,
  direction          text,
  child_display_name text,
  sender_first_name  text,
  amount_pennies     int,
  frequency          text,
  personal_message   text,
  status             text,
  expired            boolean,
  account_open       boolean
)
language sql security definer set search_path = public as $$
  select
    fi.id,
    fi.direction,
    c.name,
    split_part(coalesce(p.full_name, pl.pledger_name, ''), ' ', 1),
    pl.amount_pennies,
    pl.frequency,
    pl.personal_message,
    fi.status,
    (fi.expires_at < now()),
    (c.account_status = 'account_open')
  from family_pledge_invites fi
  join children c       on c.id = fi.child_id
  left join family_pledges pl on pl.id = fi.pledge_id
  left join profiles p   on p.id = fi.created_by_user_id
  where fi.token = p_token;
$$;
grant execute on function get_pledge_invite(text) to anon, authenticated;
