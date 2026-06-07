-- ============================================================
-- CLO / Cashback Phase 1 — provider-agnostic offers spine
-- ============================================================
-- Architecture: transactions arrive from providers (Phase 2: Sientia poll,
-- Fidel webhook via Supabase Edge Function) by INSERT into cashback_events.
-- The matching trigger here handles crediting — no change needed when those
-- providers are wired up. Phase 1 uses provider='test' from the admin tool.
-- ============================================================

-- ── RLS note (all tables below) ───────────────────────────────────────────────
-- RLS is intentionally left DISABLED for development, consistent with the
-- other core tables. Before beta, enable and add:
--   merchants, cashback_offers: public SELECT for authenticated + anon
--   cashback_events:  SELECT WHERE user_id = auth.uid()
--   cashback_credits: SELECT WHERE user_id = auth.uid()
--   spend_insights:   SELECT WHERE user_id = auth.uid()
--   linked_accounts:  SELECT WHERE user_id = auth.uid()
-- ─────────────────────────────────────────────────────────────────────────────


-- ------------------------------------------------------------
-- merchants
-- ------------------------------------------------------------

create table merchants (
  id                  uuid        primary key default gen_random_uuid(),
  name                text        not null,
  category            text        not null,
  logo_url            text,
  contact_email       text,
  stripe_customer_id  text,
  status              text        not null default 'active'
                                  check (status in ('active', 'inactive')),
  created_at          timestamptz not null default now()
);


-- ------------------------------------------------------------
-- cashback_offers
-- source='amplifi' for first-party offers; fidel_oaas/sientia added later
-- ------------------------------------------------------------

create table cashback_offers (
  id                uuid        primary key default gen_random_uuid(),
  source            text        not null default 'amplifi'
                                check (source in ('amplifi', 'fidel_oaas', 'sientia')),
  merchant_id       uuid        references merchants(id),
  provider_offer_id text,
  reward_type       text        not null check (reward_type in ('percentage', 'fixed')),
  reward_value      numeric     not null,
  active_from       timestamptz not null,
  active_to         timestamptz not null,
  is_active         boolean     not null default true,
  created_at        timestamptz not null default now()
);


-- ------------------------------------------------------------
-- linked_accounts
-- Unused in Phase 1; populated by Sientia / Fidel flows in Phase 2
-- ------------------------------------------------------------

create table linked_accounts (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id),
  provider        text        not null check (provider in ('sientia', 'fidel')),
  provider_ref    text        not null,
  status          text        not null default 'active'
                              check (status in ('active', 'revoked')),
  created_at      timestamptz not null default now()
);


-- ------------------------------------------------------------
-- cashback_events
-- One row per transaction from any provider.
-- offer_id and cashback_gbp are set by the BEFORE INSERT trigger below.
-- Future Sientia poll / Fidel webhook will INSERT rows here — the trigger
-- handles matching and crediting with no code changes required.
-- ------------------------------------------------------------

create table cashback_events (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id),
  linked_account_id uuid        references linked_accounts(id),
  provider          text        not null default 'test',
  provider_txn_id   text,
  merchant_id       uuid        references merchants(id),
  merchant_name     text        not null,
  amount_gbp        numeric     not null,
  currency          text        not null default 'GBP',
  offer_id          uuid        references cashback_offers(id),  -- set by trigger
  cashback_gbp      numeric,                                      -- set by trigger
  status            text        not null default 'pending'
                                check (status in ('pending', 'settled', 'reversed')),
  transacted_at     timestamptz not null default now(),
  settled_at        timestamptz,
  raw               jsonb       not null default '{}',
  created_at        timestamptz not null default now()
);


-- ------------------------------------------------------------
-- cashback_credits — mirrors referral_credits structure exactly
-- status 'reversed' added to handle refunds / reversed transactions
-- ------------------------------------------------------------

create table cashback_credits (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id),
  amount_gbp        numeric     not null,
  source            text        not null default 'cashback'
                                check (source in ('cashback')),
  cashback_event_id uuid        not null references cashback_events(id),
  status            text        not null default 'pending'
                                check (status in ('pending', 'redeemable', 'redeemed', 'reversed')),
  created_at        timestamptz not null default now()
);


-- ------------------------------------------------------------
-- spend_insights
-- INSIGHT ONLY — records missed cashback for onboarding nudges.
-- Must NEVER create a credit or touch any wallet/JISA balance.
-- ------------------------------------------------------------

create table spend_insights (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references auth.users(id),
  period_start        date        not null,
  period_end          date        not null,
  missed_cashback_gbp numeric     not null default 0,
  detail              jsonb       not null default '{}',
  created_at          timestamptz not null default now()
);


-- ============================================================
-- ENGINE — matching trigger + credit creation
-- ============================================================


-- ------------------------------------------------------------
-- Step 1: BEFORE INSERT — match offer, compute cashback_gbp
-- Sets NEW.offer_id and NEW.cashback_gbp before the row is written.
-- If no active offer matches, the row is still inserted (no credit created).
-- ------------------------------------------------------------

create or replace function fn_match_cashback_offer()
returns trigger
language plpgsql
as $$
declare
  v_offer cashback_offers%rowtype;
begin
  -- Find the most-recently-created active offer for this merchant and time
  select * into v_offer
  from cashback_offers
  where merchant_id  = NEW.merchant_id
    and is_active    = true
    and active_from <= NEW.transacted_at
    and active_to   >= NEW.transacted_at
  order by created_at desc
  limit 1;

  if found then
    NEW.offer_id := v_offer.id;

    if v_offer.reward_type = 'percentage' then
      NEW.cashback_gbp := round(NEW.amount_gbp * v_offer.reward_value / 100.0, 2);
    else
      -- fixed reward
      NEW.cashback_gbp := v_offer.reward_value;
    end if;
  end if;

  return NEW;
end;
$$;

create trigger trg_match_cashback_offer
  before insert on cashback_events
  for each row execute function fn_match_cashback_offer();


-- ------------------------------------------------------------
-- Step 2: AFTER INSERT — create pending credit if offer matched
-- ------------------------------------------------------------

create or replace function fn_create_cashback_credit()
returns trigger
language plpgsql
as $$
begin
  if NEW.cashback_gbp is not null and NEW.cashback_gbp > 0 then
    insert into cashback_credits (user_id, amount_gbp, cashback_event_id, status)
    values (NEW.user_id, NEW.cashback_gbp, NEW.id, 'pending');
  end if;
  return NEW;
end;
$$;

create trigger trg_create_cashback_credit
  after insert on cashback_events
  for each row execute function fn_create_cashback_credit();


-- ------------------------------------------------------------
-- Step 3: BEFORE UPDATE — handle settlement and reversal
-- settled  → credit moves to 'redeemable'; settled_at stamped
-- reversed → credit voided to 'reversed'
-- ------------------------------------------------------------

create or replace function fn_settle_cashback_event()
returns trigger
language plpgsql
as $$
begin
  if OLD.status = 'pending' and NEW.status = 'settled' then
    update cashback_credits
       set status = 'redeemable'
     where cashback_event_id = NEW.id
       and status = 'pending';

    NEW.settled_at := now();
  end if;

  if OLD.status != 'reversed' and NEW.status = 'reversed' then
    update cashback_credits
       set status = 'reversed'
     where cashback_event_id = NEW.id
       and status in ('pending', 'redeemable');
  end if;

  return NEW;
end;
$$;

create trigger trg_settle_cashback_event
  before update on cashback_events
  for each row execute function fn_settle_cashback_event();
