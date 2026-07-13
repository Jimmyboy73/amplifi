-- ── Let occasion gifters follow the child too ──────────────────────────────────
-- Phase 5 only let recurring PLEDGERS follow a child. An occasion gifter (a one-off gift)
-- had no route to watch the fund grow. This extends the same follow machinery to gifts:
--   * occasion_gifts.gifter_user_id links a gift to a signed-up account.
--   * claim_pledges_for_user now also claims gifts (by the exact gift id they signed up from,
--     and by email) and connects the gifter to the parent's roster.
--   * get_followed_children now returns children the user has PLEDGED to OR GIFTED to.
-- Reads stay gated to the caller's own pledges/gifts. Additive + idempotent.

alter table occasion_gifts
  add column if not exists gifter_user_id uuid references profiles(id) on delete set null;

-- ── claim: link pledges AND occasion gifts to this account ─────────────────────
-- Signature grows (adds p_gift_id), so drop the old one first, then recreate + re-grant.
drop function if exists claim_pledges_for_user(text);

create or replace function claim_pledges_for_user(
  p_token   text default null,
  p_gift_id uuid default null
)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_email text;
  v_count int;
begin
  if v_uid is null then raise exception 'authentication required'; end if;

  -- (a) direct links via the token / gift id they signed up from (no email needed).
  if p_token is not null then
    update family_pledges fp
       set pledger_user_id = v_uid
      from family_pledge_invites fi
     where fi.token = p_token and fi.pledge_id = fp.id and fp.pledger_user_id is null;
  end if;
  if p_gift_id is not null then
    update occasion_gifts g
       set gifter_user_id = v_uid
     where g.id = p_gift_id and g.gifter_user_id is null;
  end if;

  -- (b) best-effort: link everything else made with this person's email.
  select lower(email) into v_email from auth.users where id = v_uid;
  if v_email is not null then
    update family_pledges fp
       set pledger_user_id = v_uid
     where fp.pledger_user_id is null
       and fp.pledger_email is not null
       and lower(fp.pledger_email) = v_email;
    update occasion_gifts g
       set gifter_user_id = v_uid
     where g.gifter_user_id is null
       and g.gifter_email is not null
       and lower(g.gifter_email) = v_email;
  end if;

  -- Connect the follower to each parent's roster (pledged-to and gifted-to children).
  insert into family_connections (requester_id, parent_id, child_id, status, relationship)
  select distinct v_uid, ch.owner_id, ch.id, 'approved', 'other'
  from children ch
  where ch.owner_id is not null
    and (
      exists (select 1 from family_pledges fp where fp.child_id = ch.id and fp.pledger_user_id = v_uid)
      or exists (
        select 1 from occasion_gifts g join occasions o on o.id = g.occasion_id
        where o.child_id = ch.id and g.gifter_user_id = v_uid
      )
    )
    and not exists (
      select 1 from family_connections fc
      where fc.child_id = ch.id and fc.requester_id = v_uid
    );

  select count(*) into v_count
  from children ch
  where exists (select 1 from family_pledges fp where fp.child_id = ch.id and fp.pledger_user_id = v_uid)
     or exists (
       select 1 from occasion_gifts g join occasions o on o.id = g.occasion_id
       where o.child_id = ch.id and g.gifter_user_id = v_uid
     );
  return coalesce(v_count, 0);
end;
$$;
grant execute on function claim_pledges_for_user(text, uuid) to authenticated;

-- ── get_followed_children: pledged-to OR gifted-to ─────────────────────────────
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
     or exists (
      select 1 from occasion_gifts og
      join occasions oc on oc.id = og.occasion_id
      where oc.child_id = c.id and og.gifter_user_id = v_uid
    )
  order by c.name;
end;
$$;
grant execute on function get_followed_children() to authenticated;
