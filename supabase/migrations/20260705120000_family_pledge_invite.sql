-- ── Family Pledge & Invite ─────────────────────────────────────────────────────
-- Extends the existing MVP for the two-sided pledge flow (grandparent → parent).
--
-- ⚠️ NAMING — read this. Two table names from the spec were ALREADY TAKEN in the live DB:
--   * `pledges`        = the ACTIVE wishlist/occasions gift-pledge table (MVP flow 4).
--                        Different concept (one-off gift vs recurring JISA contribution).
--   * `family_invites` = the LEGACY apps/app invite table (inviter_user_id NOT NULL,
--                        superseded by family_connections in web).
-- So this flow uses purpose-named tables that run in PARALLEL and touch neither:
--   family_pledges, family_pledge_invites.
--
-- Reconciliation (see docs/family-pledge-spec.md §4):
--   * children ALREADY EXISTS — we extend it, never duplicate. owner_id = the parent;
--     owner_id + date_of_birth made nullable so a family member can create a name-only
--     child before any parent exists.
--   * The spec's `family_links` is NOT built — family_connections already IS the graph.
--   * provider/reference are NOT duplicated onto children — they live on jisa_accounts.
--   * Money is stored as integer pennies (spec rule), not numeric GBP.
--   * enums are text + CHECK, matching every existing table's convention.
--
-- OPTION A (pledge-first, deferred account): a family member sends a pledge WITHOUT a
-- full account. pledger_user_id / created_by_user_id are NULLABLE and the soft record
-- (pledger_name / pledger_email) is captured instead, backfilled to profiles.id on return.
--
-- SECURITY: family_pledges + family_pledge_invites have RLS ENABLED (the rest of the DB
-- is a separate deferred task). anon has NO direct table access — the only anon paths are
-- the SECURITY DEFINER RPCs below, and get_pledge_invite NEVER returns an email. The share
-- link carries only the opaque token, minted server-side.
--
-- SAFETY: the whole migration runs in ONE transaction (atomic — no more partial applies),
-- and a guard RAISES if a target name is already taken (loud failure, never a silent skip).
-- Re-running after a successful apply will fail loudly on the guard — that is intentional;
-- drop the tables first if you genuinely mean to recreate them.

begin;

create extension if not exists pgcrypto;  -- gen_random_bytes for the invite token

-- ── Guard: fail loudly if either name is already taken ────────────────────────
do $$
begin
  if to_regclass('public.family_pledges') is not null then
    raise exception 'family_pledges already exists — migration already applied (or name clash). Inspect before re-running; drop it first if you intend to recreate.';
  end if;
  if to_regclass('public.family_pledge_invites') is not null then
    raise exception 'family_pledge_invites already exists — migration already applied (or name clash). Inspect before re-running.';
  end if;
end $$;

-- ── 1. Extend children (idempotent — safe after the earlier partial run) ──────
alter table children alter column owner_id      drop not null;  -- parent set later (on account claim)
alter table children alter column date_of_birth drop not null;  -- family member may only know rough age

alter table children
  add column if not exists account_status text not null default 'no_account'
    check (account_status in ('no_account', 'account_open')),
  add column if not exists approx_age_months  int,
  add column if not exists created_by_user_id uuid references profiles(id) on delete set null;

-- ── 2. family_pledges (new — recurring JISA contribution intent) ──────────────
create table family_pledges (
  id                   uuid        primary key default gen_random_uuid(),
  child_id             uuid        not null references children(id) on delete cascade,
  pledger_user_id      uuid        references profiles(id) on delete set null,  -- NULL until they sign up
  pledger_name         text,       -- soft record captured at send (Option A)
  pledger_email        text,       -- soft record — RLS-protected, never returned to the accept screen
  pledger_relationship text        check (pledger_relationship in ('grandparent', 'other', 'friend')),
  amount_pennies       int         not null check (amount_pennies > 0),
  frequency            text        not null check (frequency in ('weekly', 'monthly', 'one_off')),
  start_trigger        text        not null default 'on_account_open'
                         check (start_trigger in ('now', 'next_birthday', 'on_account_open', 'custom_date')),
  custom_start_date    date,
  personal_message     text,
  status               text        not null default 'draft'
                         check (status in ('draft', 'sent', 'linked', 'active_instructions_shown', 'cancelled')),
  created_at           timestamptz not null default now(),
  sent_at              timestamptz
);
create index idx_family_pledges_child   on family_pledges(child_id);
create index idx_family_pledges_pledger on family_pledges(pledger_user_id);

-- ── 3. family_pledge_invites (new — opaque token) ─────────────────────────────
create table family_pledge_invites (
  id                 uuid        primary key default gen_random_uuid(),
  token              text        not null unique,  -- 32 hex chars, minted server-side (see RPC)
  direction          text        not null check (direction in ('pledge_to_parent', 'invite_to_family')),
  child_id           uuid        not null references children(id) on delete cascade,
  pledge_id          uuid        references family_pledges(id) on delete cascade,
  created_by_user_id uuid        references profiles(id) on delete set null,  -- NULL under Option A
  channel            text        not null check (channel in ('whatsapp', 'email', 'copy_link')),
  recipient_email    text,       -- the PARENT's address when channel = email (not the sender's)
  status             text        not null default 'pending' check (status in ('pending', 'opened', 'accepted', 'expired')),
  expires_at         timestamptz not null default (now() + interval '30 days'),
  created_at         timestamptz not null default now(),
  accepted_at        timestamptz
);
create index idx_family_pledge_invites_token on family_pledge_invites(token);
create index idx_family_pledge_invites_child on family_pledge_invites(child_id);

-- ── 4. RLS (scoped to the two NEW tables only) ────────────────────────────────
alter table family_pledges        enable row level security;
alter table family_pledge_invites enable row level security;

-- A signed-in pledger can read/update their OWN pledges (their return / status view).
create policy "Pledgers read own pledges" on family_pledges
  for select using (auth.uid() = pledger_user_id);
create policy "Pledgers update own pledges" on family_pledges
  for update using (auth.uid() = pledger_user_id);

-- A signed-in creator can read their OWN invites.
create policy "Creators read own invites" on family_pledge_invites
  for select using (auth.uid() = created_by_user_id);

-- NOTE: no anon/parent SELECT policies here on purpose. Anon reaches invite data ONLY via
-- get_pledge_invite (which excludes email). Parent-side reads come with the account-open /
-- auto-link step via a dedicated RPC that also excludes email.

-- ── 5. RPC: create a pledge + invite, minting the token server-side (anon) ─────
create or replace function create_family_pledge(
  p_child_name         text,
  p_amount_pennies     int,
  p_frequency          text,
  p_start_trigger      text,
  p_personal_message   text,
  p_pledger_name       text,
  p_pledger_email      text,
  p_relationship       text,
  p_channel            text,
  p_approx_age_months  int  default null,
  p_custom_start_date  date default null,
  p_recipient_email    text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_child_id  uuid;
  v_pledge_id uuid;
  v_token     text;
begin
  insert into children (name, approx_age_months, account_status)
  values (p_child_name, p_approx_age_months, 'no_account')
  returning id into v_child_id;

  insert into family_pledges (
    child_id, pledger_name, pledger_email, pledger_relationship,
    amount_pennies, frequency, start_trigger, custom_start_date,
    personal_message, status, sent_at
  ) values (
    v_child_id, p_pledger_name, p_pledger_email, p_relationship,
    p_amount_pennies, p_frequency, p_start_trigger, p_custom_start_date,
    p_personal_message, 'sent', now()
  ) returning id into v_pledge_id;

  -- pgcrypto lives in the `extensions` schema on Supabase; schema-qualify it since this
  -- function pins search_path = public (an unqualified call would not resolve).
  v_token := encode(extensions.gen_random_bytes(16), 'hex');

  insert into family_pledge_invites (token, direction, child_id, pledge_id, channel, recipient_email)
  values (v_token, 'pledge_to_parent', v_child_id, v_pledge_id, p_channel, p_recipient_email);

  return v_token;
end;
$$;
grant execute on function create_family_pledge(
  text, int, text, text, text, text, text, text, text, int, date, text
) to anon, authenticated;

-- ── 6. RPC: read the accept-screen data from a token (anon, NO email) ──────────
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
  expired            boolean
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
    (fi.expires_at < now())
  from family_pledge_invites fi
  join children c       on c.id = fi.child_id
  left join family_pledges pl on pl.id = fi.pledge_id
  left join profiles p   on p.id = fi.created_by_user_id
  where fi.token = p_token;
$$;
grant execute on function get_pledge_invite(text) to anon, authenticated;

-- ── 7. RPC: mark an invite opened (anon, pending → opened only) ────────────────
create or replace function mark_pledge_invite_opened(p_token text)
returns void
language sql security definer set search_path = public as $$
  update family_pledge_invites
     set status = 'opened'
   where token = p_token and status = 'pending';
$$;
grant execute on function mark_pledge_invite_opened(text) to anon, authenticated;

commit;
