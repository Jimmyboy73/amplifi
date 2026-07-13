-- ── Unify "account ready" — occasions key off account_status, like pledges ─────
-- Bug source: get_occasion_by_token treated `account_ready = (jisa row exists)`, while pledge
-- linking requires `children.account_status = 'account_open'`. These could diverge (a JISA row
-- present but the account never confirmed open), showing gifters pay-in details while pledges
-- stayed 'sent'. Make occasions use the SAME condition so the two can never disagree.
-- Same return signature → plain CREATE OR REPLACE. Idempotent.

create or replace function public.get_occasion_by_token(p_token text)
returns table (
  occasion_id uuid, title text, occasion_type text, occasion_date date, status text,
  child_name text, target_gbp numeric, total_gifted numeric, gift_count integer,
  account_ready boolean, provider_name text, sort_code text, account_number text, payment_reference text
) language plpgsql security definer set search_path = public as $$
begin
  return query
    select o.id, o.title, o.occasion_type, o.occasion_date, o.status,
           c.name as child_name, o.target_gbp,
           coalesce(sum(g.amount_gbp), 0)::numeric, count(g.id)::int,
           (c.account_status = 'account_open') as account_ready,
           j.provider_name, j.sort_code, j.account_number, j.payment_reference
    from public.occasions o
    join public.children c on c.id = o.child_id
    left join public.jisa_accounts j on j.child_id = c.id
    left join public.occasion_gifts g on g.occasion_id = o.id
    where o.share_token = p_token
    group by o.id, c.name, c.account_status, j.id, j.provider_name, j.sort_code, j.account_number, j.payment_reference;
end $$;

grant execute on function public.get_occasion_by_token(text) to anon, authenticated;
