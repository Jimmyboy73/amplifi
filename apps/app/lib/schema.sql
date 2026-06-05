-- =============================================================================
-- Amplifi Database Schema
-- Apply via Supabase SQL editor or `supabase db push`
-- =============================================================================

create extension if not exists "uuid-ossp";

-- ── profiles ──────────────────────────────────────────────────────────────────
-- Extends Supabase Auth (auth.users) with app-level profile data.
create table profiles (
  id            uuid        primary key references auth.users(id) on delete cascade,
  full_name     text        not null,
  phone         text,
  date_of_birth date,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "Users can view own profile"   on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- ── children ──────────────────────────────────────────────────────────────────
create table children (
  id            uuid        primary key default uuid_generate_v4(),
  parent_id     uuid        not null references profiles(id) on delete cascade,
  first_name    text        not null,
  date_of_birth date        not null,
  photo_url     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table children enable row level security;
create policy "Parents can manage their children" on children
  for all using (auth.uid() = parent_id);

-- ── jisa_accounts ─────────────────────────────────────────────────────────────
create table jisa_accounts (
  id                uuid        primary key default uuid_generate_v4(),
  child_id          uuid        not null references children(id) on delete cascade,
  sort_code         text        not null,       -- 6 raw digits (no hyphens)
  account_number    text        not null,       -- 8 digits
  payment_reference text        not null,
  provider_name     text,
  is_active         boolean     not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table jisa_accounts enable row level security;
create policy "Parents can manage JISA accounts" on jisa_accounts
  for all using (
    auth.uid() = (select parent_id from children where id = child_id)
  );

-- ── wallets ───────────────────────────────────────────────────────────────────
-- Cientia wallet — one per child.
create table wallets (
  id                uuid           primary key default uuid_generate_v4(),
  child_id          uuid           not null unique references children(id) on delete cascade,
  available_balance numeric(10,2)  not null default 0,
  pending_balance   numeric(10,2)  not null default 0,
  sweep_threshold   numeric(10,2)  not null default 20.00,
  currency          char(3)        not null default 'GBP',
  updated_at        timestamptz    not null default now()
);

alter table wallets enable row level security;
create policy "Parents can view wallet" on wallets
  for select using (
    auth.uid() = (select parent_id from children where id = child_id)
  );

-- ── gift_card_purchases ───────────────────────────────────────────────────────
-- Tillo gift card purchase records.
create table gift_card_purchases (
  id                uuid          primary key default uuid_generate_v4(),
  user_id           uuid          not null references profiles(id) on delete cascade,
  child_id          uuid          not null references children(id) on delete cascade,
  merchant_name     text          not null,
  merchant_category text,
  denomination      numeric(10,2) not null,
  cashback_percent  integer       not null,
  cashback_amount   numeric(10,2) not null,
  tillo_order_id    text          unique,
  status            text          not null default 'processing'
                    check (status in ('processing','delivered','failed','refunded')),
  gift_card_code    text,         -- stored encrypted; populated on delivery
  created_at        timestamptz   not null default now(),
  delivered_at      timestamptz
);

alter table gift_card_purchases enable row level security;
create policy "Users can view own purchases" on gift_card_purchases
  for select using (auth.uid() = user_id);
create policy "Users can insert own purchases" on gift_card_purchases
  for insert with check (auth.uid() = user_id);

-- ── contributions ─────────────────────────────────────────────────────────────
-- All cashback / contribution events; feeds the pot and activity feed.
create table contributions (
  id           uuid          primary key default uuid_generate_v4(),
  child_id     uuid          not null references children(id) on delete cascade,
  user_id      uuid          references profiles(id) on delete set null,
  type         text          not null
               check (type in ('gift_card','sweep','family','clo','challenge','birthday_surplus')),
  description  text          not null,
  amount       numeric(10,2) not null,
  source_ref   uuid,         -- FK to gift_card_purchases, sweeps, pledges etc.
  source_table text,
  created_at   timestamptz   not null default now()
);

alter table contributions enable row level security;
create policy "Parents can view child contributions" on contributions
  for select using (
    auth.uid() = (select parent_id from children where id = child_id)
  );

-- ── sweeps ────────────────────────────────────────────────────────────────────
-- Wallet → JISA sweeps via Cientia.
create table sweeps (
  id               uuid          primary key default uuid_generate_v4(),
  child_id         uuid          not null references children(id) on delete cascade,
  jisa_account_id  uuid          not null references jisa_accounts(id),
  amount           numeric(10,2) not null,
  cientia_sweep_id text          unique,
  status           text          not null default 'pending'
                   check (status in ('pending','processing','complete','failed')),
  initiated_at     timestamptz   not null default now(),
  completed_at     timestamptz
);

alter table sweeps enable row level security;
create policy "Parents can view sweeps" on sweeps
  for select using (
    auth.uid() = (select parent_id from children where id = child_id)
  );

-- ── family_contributors ───────────────────────────────────────────────────────
create table family_contributors (
  id                   uuid          primary key default uuid_generate_v4(),
  child_id             uuid          not null references children(id) on delete cascade,
  contributor_user_id  uuid          references profiles(id) on delete set null,
  name                 text          not null,
  relationship         text,
  email                text,
  avatar_color         text          not null default '#59C9E9',
  total_contributed    numeric(10,2) not null default 0,
  last_active_at       timestamptz,
  joined_at            timestamptz   not null default now()
);

alter table family_contributors enable row level security;
create policy "Parents can view family contributors" on family_contributors
  for select using (
    auth.uid() = (select parent_id from children where id = child_id)
  );

-- ── family_invites ────────────────────────────────────────────────────────────
create table family_invites (
  id              uuid        primary key default uuid_generate_v4(),
  child_id        uuid        not null references children(id) on delete cascade,
  inviter_user_id uuid        not null references profiles(id) on delete cascade,
  invited_name    text        not null,
  sent_to_email   text        not null,
  invite_token    text        not null unique,
  status          text        not null default 'pending'
                  check (status in ('pending','accepted','expired')),
  sent_at         timestamptz not null default now(),
  accepted_at     timestamptz,
  expires_at      timestamptz not null default (now() + interval '30 days')
);

alter table family_invites enable row level security;
create policy "Inviters can manage their invites" on family_invites
  for all using (auth.uid() = inviter_user_id);

-- ── clo_offers ────────────────────────────────────────────────────────────────
-- Always-on card-linked offers (Layer 2, via Cientia).
create table clo_offers (
  id                uuid        primary key default uuid_generate_v4(),
  merchant_name     text        not null,
  merchant_category text,
  cashback_percent  integer     not null,
  description       text,
  logo_initial      text,
  brand_color       text,
  is_active         boolean     not null default true,
  created_at        timestamptz not null default now()
);

alter table clo_offers enable row level security;
create policy "Authenticated users can view CLO offers" on clo_offers
  for select using (auth.uid() is not null);

-- ── activatable_offers ────────────────────────────────────────────────────────
-- Offers requiring explicit user activation (Layer 3).
create table activatable_offers (
  id                uuid        primary key default uuid_generate_v4(),
  merchant_name     text        not null,
  merchant_category text,
  cashback_percent  integer     not null,
  description       text,
  logo_initial      text,
  brand_color       text,
  expiry_date       date,
  is_active         boolean     not null default true,
  created_at        timestamptz not null default now()
);

alter table activatable_offers enable row level security;
create policy "Authenticated users can view activatable offers" on activatable_offers
  for select using (auth.uid() is not null);

-- ── user_activated_offers ─────────────────────────────────────────────────────
create table user_activated_offers (
  id           uuid        primary key default uuid_generate_v4(),
  user_id      uuid        not null references profiles(id) on delete cascade,
  offer_id     uuid        not null references activatable_offers(id) on delete cascade,
  activated_at timestamptz not null default now(),
  unique (user_id, offer_id)
);

alter table user_activated_offers enable row level security;
create policy "Users manage own activations" on user_activated_offers
  for all using (auth.uid() = user_id);

-- ── challenges ────────────────────────────────────────────────────────────────
-- Merchant-funded challenges (Layer 4, via Fidel API — Phase 2).
create table challenges (
  id                    uuid          primary key default uuid_generate_v4(),
  merchant_name         text          not null,
  challenge_description text          not null,
  reward_amount         numeric(10,2) not null,
  target_count          integer       not null default 1,
  logo_initial          text,
  brand_color           text,
  expiry_date           date,
  is_active             boolean       not null default true,
  created_at            timestamptz   not null default now()
);

alter table challenges enable row level security;
create policy "Authenticated users can view challenges" on challenges
  for select using (auth.uid() is not null);

-- ── user_challenge_state ──────────────────────────────────────────────────────
create table user_challenge_state (
  id           uuid        primary key default uuid_generate_v4(),
  user_id      uuid        not null references profiles(id) on delete cascade,
  challenge_id uuid        not null references challenges(id) on delete cascade,
  child_id     uuid        references children(id) on delete cascade,
  progress     integer     not null default 0,
  status       text        not null default 'active'
               check (status in ('active','completed','expired')),
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, challenge_id)
);

alter table user_challenge_state enable row level security;
create policy "Users manage own challenge state" on user_challenge_state
  for all using (auth.uid() = user_id);

-- ── pending_credits ───────────────────────────────────────────────────────────
-- Cashback earned but not yet swept to JISA (held in Cientia wallet).
create table pending_credits (
  id          uuid          primary key default uuid_generate_v4(),
  child_id    uuid          not null references children(id) on delete cascade,
  source_type text          not null
              check (source_type in ('gift_card','clo','challenge','family','birthday_surplus')),
  source_id   uuid,
  amount      numeric(10,2) not null,
  currency    char(3)       not null default 'GBP',
  status      text          not null default 'pending'
              check (status in ('pending','swept','reversed')),
  created_at  timestamptz   not null default now(),
  swept_at    timestamptz
);

alter table pending_credits enable row level security;
create policy "Parents can view pending credits" on pending_credits
  for select using (
    auth.uid() = (select parent_id from children where id = child_id)
  );

-- ── merchant_invoice_ledger ───────────────────────────────────────────────────
-- Settlement tracking between Amplifi and merchants / Tillo / Cientia.
-- Admin-only; accessed via service role key in backend functions.
create table merchant_invoice_ledger (
  id              uuid          primary key default uuid_generate_v4(),
  merchant_name   text          not null,
  invoice_ref     text          unique,
  gross_amount    numeric(10,2) not null,
  cashback_amount numeric(10,2) not null,
  amplifi_margin  numeric(10,2),
  settled         boolean       not null default false,
  period_start    date,
  period_end      date,
  created_at      timestamptz   not null default now(),
  settled_at      timestamptz
);

-- ── wishlists ─────────────────────────────────────────────────────────────────
create table wishlists (
  id              uuid          primary key default uuid_generate_v4(),
  child_id        uuid          not null references children(id) on delete cascade,
  user_id         uuid          not null references profiles(id) on delete cascade,
  occasion        text          not null,
  occasion_date   date          not null,
  closing_date    date,
  status          text          not null default 'active'
                  check (status in ('active','closed')),
  total_target    numeric(10,2) not null default 0,
  total_pledged   numeric(10,2) not null default 0,
  surplus_amount  numeric(10,2) not null default 0,
  payment_method  text          not null,
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);

alter table wishlists enable row level security;
create policy "Users can manage own wishlists" on wishlists
  for all using (auth.uid() = user_id);

-- ── wishlist_items ────────────────────────────────────────────────────────────
create table wishlist_items (
  id             uuid          primary key default uuid_generate_v4(),
  wishlist_id    uuid          not null references wishlists(id) on delete cascade,
  name           text          not null,
  retailer       text,
  target_amount  numeric(10,2) not null,
  pledged_amount numeric(10,2) not null default 0,
  image_emoji    text          not null default '🎁',
  purchased      boolean       not null default false,
  created_at     timestamptz   not null default now()
);

alter table wishlist_items enable row level security;
create policy "Wishlist owners can manage items" on wishlist_items
  for all using (
    auth.uid() = (select user_id from wishlists where id = wishlist_id)
  );
create policy "Public can view wishlist items" on wishlist_items
  for select using (true);  -- public read for share links; tighten as needed

-- ── pledges ───────────────────────────────────────────────────────────────────
create table pledges (
  id               uuid          primary key default uuid_generate_v4(),
  wishlist_id      uuid          not null references wishlists(id) on delete cascade,
  wishlist_item_id uuid          references wishlist_items(id) on delete set null,
  pledger_name     text          not null,
  pledger_email    text,
  amount           numeric(10,2) not null,
  item_label       text,
  status           text          not null default 'pending'
                   check (status in ('pending','confirmed','swept')),
  confirmed_at     timestamptz,
  created_at       timestamptz   not null default now()
);

alter table pledges enable row level security;
create policy "Wishlist owners can manage pledges" on pledges
  for all using (
    auth.uid() = (select user_id from wishlists where id = wishlist_id)
  );

-- =============================================================================
-- Indexes
-- =============================================================================

create index idx_children_parent_id          on children(parent_id);
create index idx_contributions_child_id      on contributions(child_id);
create index idx_contributions_created_at    on contributions(created_at desc);
create index idx_sweeps_child_id             on sweeps(child_id);
create index idx_gift_card_purchases_user_id on gift_card_purchases(user_id);
create index idx_gift_card_purchases_child_id on gift_card_purchases(child_id);
create index idx_pending_credits_child_id    on pending_credits(child_id, status);
create index idx_pledges_wishlist_id         on pledges(wishlist_id);
create index idx_wishlist_items_wishlist_id  on wishlist_items(wishlist_id);
create index idx_family_contributors_child   on family_contributors(child_id);
create index idx_family_invites_token        on family_invites(invite_token);
