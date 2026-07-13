-- ── Grandparent "follow the child" — claim pledges + read followed children ────
-- After a family member pledges (account-free), they can create a free account to FOLLOW
-- the child's future. Two SECURITY DEFINER RPCs:
--   * claim_pledges_for_user()  — on account creation, link every pledge made with this
--     person's email to their new user id, and connect them to the parent's roster.
--   * get_followed_children()   — the focused follow-card feed, keyed to auth.uid(): the
--     child's AGGREGATE projection inputs (never other contributors' individual rows),
--     this person's own pledge, and pay-in details once the account is open.
--
-- Read path is gated to the caller's OWN linked pledges, so a follower can only ever see a
-- child they've actually contributed to — safe while table RLS is still being finalised.
-- Additive + idempotent.

-- ── Link this user's account to the pledges they made before signing up ────────
-- p_token (optional) is the status token they signed up from — the pledge behind it is
-- linked directly, so the core flow works even if the email-based match below can't run.
create or replace function claim_pledges_for_user(p_token text default null)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_email text;
  v_count int;
begin
  if v_uid is null then raise exception 'authentication required'; end if;

  -- (a) direct link via the token they came from (no email needed).
  if p_token is not null then
    update family_pledges fp
       set pledger_user_id = v_uid
      from family_pledge_invites fi
     where fi.token = p_token
       and fi.pledge_id = fp.id
       and fp.pledger_user_id is null;
  end if;

  -- (b) best-effort: link every other pledge made with this person's email.
  select lower(email) into v_email from auth.users where id = v_uid;
  if v_email is not null then
    update family_pledges fp
       set pledger_user_id = v_uid
     where fp.pledger_user_id is null
       and fp.pledger_email is not null
       and lower(fp.pledger_email) = v_email;
  end if;

  -- Connect the follower to each parent's roster (only where the parent exists).
  insert into family_connections (requester_id, parent_id, child_id, status, relationship)
  select distinct fp.pledger_user_id, ch.owner_id, fp.child_id, 'approved',
         case fp.pledger_relationship
           when 'grandparent' then 'grandparent'
           when 'friend'      then 'friend'
           else 'other'
         end
  from family_pledges fp
  join children ch on ch.id = fp.child_id
  where fp.pledger_user_id = v_uid
    and ch.owner_id is not null
    and not exists (
      select 1 from family_connections fc
      where fc.child_id = fp.child_id and fc.requester_id = v_uid
    );

  select count(distinct child_id) into v_count
  from family_pledges where pledger_user_id = v_uid;
  return coalesce(v_count, 0);
end;
$$;
grant execute on function claim_pledges_for_user(text) to authenticated;

-- ── Focused follow-card feed for the signed-in follower ────────────────────────
create or replace function get_followed_children()
returns table (
  child_id                uuid,
  child_name              text,
  account_open            boolean,
  date_of_birth           date,
  approx_age_months       int,
  household_monthly_pennies numeric,
  occasions_gbp_year      numeric,
  my_amount_pennies       int,
  my_frequency            text,
  my_status               text,
  provider_name           text,
  sort_code               text,
  account_number          text,
  payment_reference       text
)
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'authentication required'; end if;

  return query
  select
    c.id,
    c.name,
    (c.account_status = 'account_open'),
    c.date_of_birth,
    c.approx_age_months,
    -- Aggregate household monthly (pennies): active contributions + linked pledges.
    (
      coalesce((
        select sum(case fc.frequency
                     when 'monthly' then fc.amount_gbp * 100
                     when 'weekly'  then fc.amount_gbp * 100 * 52.0 / 12
                     else 0 end)
        from family_contributions fc
        where fc.child_id = c.id and fc.status = 'active'
      ), 0)
      + coalesce((
        select sum(case fp.frequency
                     when 'monthly' then fp.amount_pennies
                     when 'weekly'  then fp.amount_pennies * 52.0 / 12
                     else 0 end)
        from family_pledges fp
        where fp.child_id = c.id and fp.status = 'linked'
      ), 0)
    )::numeric,
    coalesce((
      select sum(g.amount_gbp)
      from occasion_gifts g
      join occasions o on o.id = g.occasion_id
      where o.child_id = c.id
    ), 0)::numeric,
    mine.amount_pennies,
    mine.frequency,
    mine.status,
    case when c.account_status = 'account_open' then j.provider_name end,
    case when c.account_status = 'account_open' then j.sort_code end,
    case when c.account_status = 'account_open' then j.account_number end,
    case when c.account_status = 'account_open' then j.payment_reference end
  from children c
  left join jisa_accounts j on j.child_id = c.id
  left join lateral (
    select amount_pennies, frequency, status
    from family_pledges
    where child_id = c.id and pledger_user_id = v_uid
    order by created_at desc
    limit 1
  ) mine on true
  where exists (
    select 1 from family_pledges fp2
    where fp2.child_id = c.id and fp2.pledger_user_id = v_uid
  )
  order by c.name;
end;
$$;
grant execute on function get_followed_children() to authenticated;
