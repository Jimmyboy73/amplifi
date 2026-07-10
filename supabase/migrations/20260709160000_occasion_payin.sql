-- Extend the public occasion read to include the child's JISA pay-in details, so a gifter
-- can be shown exactly how to send their gift (sort code / account / reference) — same as
-- the grandparent pay-in view. account_ready is true only once the JISA details exist.
-- These are pay-IN details (for receiving money), meant to be shared with family.
--
-- The return signature changes, so we DROP + recreate (create-or-replace can't change the
-- return type), then re-grant. Applied by hand in the Supabase SQL editor.

drop function if exists public.get_occasion_by_token(text);

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
           (j.id is not null) as account_ready,
           j.provider_name, j.sort_code, j.account_number, j.payment_reference
    from public.occasions o
    join public.children c on c.id = o.child_id
    left join public.jisa_accounts j on j.child_id = c.id
    left join public.occasion_gifts g on g.occasion_id = o.id
    where o.share_token = p_token
    group by o.id, c.name, j.id, j.provider_name, j.sort_code, j.account_number, j.payment_reference;
end $$;

grant execute on function public.get_occasion_by_token(text) to anon, authenticated;
