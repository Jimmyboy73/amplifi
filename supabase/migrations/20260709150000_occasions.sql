-- ─────────────────────────────────────────────────────────────────────────────
-- Occasions — birthday / Christmas / milestone gifting moments (MVP flow 4, web).
--
-- Mirrors the family-pledge architecture: the two tables have RLS ENABLED with NO table
-- policies, so the client can NEVER touch them directly — all access is through the
-- SECURITY DEFINER functions below. The public (no-login) gift page reaches data ONLY via
-- get_occasion_by_token / create_occasion_gift, which never expose gifter emails to the client.
--
-- Applied by hand in the Supabase SQL editor (this project applies migrations manually).
-- All figures illustrative; Amplifi never holds or moves money — gifts are pledges to pay
-- into the child's account, same as the grandparent flow.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Tables ───────────────────────────────────────────────────────────────────
create table if not exists public.occasions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  created_by_user_id uuid,
  title text not null,
  occasion_type text not null default 'other'
    check (occasion_type in ('birthday', 'christmas', 'milestone', 'other')),
  occasion_date date,
  target_gbp numeric,
  status text not null default 'open' check (status in ('open', 'closed')),
  share_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);

create table if not exists public.occasion_gifts (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references public.occasions(id) on delete cascade,
  gifter_name text not null,
  gifter_email text,
  amount_gbp numeric not null check (amount_gbp > 0),
  message text,
  status text not null default 'pledged' check (status in ('pledged', 'paid')),
  created_at timestamptz not null default now()
);

create index if not exists occasion_gifts_occasion_idx on public.occasion_gifts (occasion_id);

-- RLS on, no table policies → client access is via the definer functions only.
alter table public.occasions enable row level security;
alter table public.occasion_gifts enable row level security;

-- ── Parent functions (authenticated, owner-gated) ────────────────────────────

-- Open a gifting moment for a child you own. Returns the opaque share token.
create or replace function public.create_occasion(
  p_child_id uuid,
  p_title text,
  p_type text,
  p_occasion_date date default null,
  p_target_gbp numeric default null
) returns text
language plpgsql security definer set search_path = public as $$
declare v_token text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not exists (
    select 1 from public.children c where c.id = p_child_id and c.owner_id = auth.uid()
  ) then raise exception 'not your child'; end if;

  insert into public.occasions (child_id, created_by_user_id, title, occasion_type, occasion_date, target_gbp)
  values (p_child_id, auth.uid(), p_title, coalesce(p_type, 'other'), p_occasion_date, p_target_gbp)
  returning share_token into v_token;

  return v_token;
end $$;

-- List a child's moments with running totals (parent only).
create or replace function public.get_child_occasions(p_child_id uuid)
returns table (
  id uuid, title text, occasion_type text, occasion_date date, status text,
  target_gbp numeric, share_token text, total_gifted numeric, gift_count integer,
  created_at timestamptz
) language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.children c where c.id = p_child_id and c.owner_id = auth.uid()
  ) then raise exception 'not your child'; end if;

  return query
    select o.id, o.title, o.occasion_type, o.occasion_date, o.status, o.target_gbp, o.share_token,
           coalesce(sum(g.amount_gbp), 0)::numeric as total_gifted,
           count(g.id)::int as gift_count, o.created_at
    from public.occasions o
    left join public.occasion_gifts g on g.occasion_id = o.id
    where o.child_id = p_child_id
    group by o.id
    order by o.created_at desc;
end $$;

-- Who has gifted to one of your moments (parent only; no emails returned to the client).
create or replace function public.get_occasion_gifts(p_occasion_id uuid)
returns table (id uuid, gifter_name text, amount_gbp numeric, message text, status text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.occasions o
    join public.children c on c.id = o.child_id
    where o.id = p_occasion_id and c.owner_id = auth.uid()
  ) then raise exception 'not your occasion'; end if;

  return query
    select g.id, g.gifter_name, g.amount_gbp, g.message, g.status, g.created_at
    from public.occasion_gifts g
    where g.occasion_id = p_occasion_id
    order by g.created_at desc;
end $$;

-- ── Public functions (anon, by opaque token — the no-login gift page) ────────

-- Read a moment for the public gift page. NO emails, no owner data.
create or replace function public.get_occasion_by_token(p_token text)
returns table (
  occasion_id uuid, title text, occasion_type text, occasion_date date, status text,
  child_name text, target_gbp numeric, total_gifted numeric, gift_count integer
) language plpgsql security definer set search_path = public as $$
begin
  return query
    select o.id, o.title, o.occasion_type, o.occasion_date, o.status,
           c.name as child_name, o.target_gbp,
           coalesce(sum(g.amount_gbp), 0)::numeric, count(g.id)::int
    from public.occasions o
    join public.children c on c.id = o.child_id
    left join public.occasion_gifts g on g.occasion_id = o.id
    where o.share_token = p_token
    group by o.id, c.name;
end $$;

-- Record a gift from the public page (anon), by token. One-off pledge to pay in.
create or replace function public.create_occasion_gift(
  p_token text,
  p_gifter_name text,
  p_amount_gbp numeric,
  p_gifter_email text default null,
  p_message text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_occasion uuid; v_gift uuid;
begin
  select o.id into v_occasion
  from public.occasions o
  where o.share_token = p_token and o.status = 'open';
  if v_occasion is null then raise exception 'occasion not found or closed'; end if;
  if p_amount_gbp is null or p_amount_gbp <= 0 then raise exception 'invalid amount'; end if;

  insert into public.occasion_gifts (occasion_id, gifter_name, gifter_email, amount_gbp, message)
  values (v_occasion, coalesce(nullif(trim(p_gifter_name), ''), 'A family member'),
          p_gifter_email, p_amount_gbp, p_message)
  returning id into v_gift;

  return v_gift;
end $$;

-- ── Grants ───────────────────────────────────────────────────────────────────
grant execute on function public.create_occasion(uuid, text, text, date, numeric) to authenticated;
grant execute on function public.get_child_occasions(uuid) to authenticated;
grant execute on function public.get_occasion_gifts(uuid) to authenticated;
grant execute on function public.get_occasion_by_token(text) to anon, authenticated;
grant execute on function public.create_occasion_gift(text, text, numeric, text, text) to anon, authenticated;
