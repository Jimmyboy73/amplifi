-- ============================================================
-- Gift Card Shop — gift_card_brands + gift_card_orders
-- ============================================================
-- RLS is intentionally left DISABLED for development, consistent
-- with the other core tables. Before beta, enable and add:
--   gift_card_brands: public SELECT for authenticated + anon
--   gift_card_orders: SELECT/INSERT WHERE user_id = auth.uid()
-- ============================================================

-- ── gift_card_brands ─────────────────────────────────────────────────────────

create table gift_card_brands (
  id                  uuid        primary key default gen_random_uuid(),
  name                text        not null,
  slug                text        not null unique,
  category            text        not null,
  logo_url            text,
  cashback_percentage numeric     not null,
  min_amount_gbp      numeric     not null default 5,
  max_amount_gbp      numeric     not null default 250,
  is_active           boolean     not null default true,
  tillo_brand_slug    text,
  created_at          timestamptz not null default now()
);


-- ── gift_card_orders ─────────────────────────────────────────────────────────

create table gift_card_orders (
  id                        uuid        primary key default gen_random_uuid(),
  user_id                   uuid        not null references auth.users(id),
  child_id                  uuid        not null references children(id),
  brand_id                  uuid        not null references gift_card_brands(id),
  amount_gbp                numeric     not null,
  cashback_gbp              numeric     not null,
  status                    text        not null default 'pending'
                                        check (status in ('pending', 'completed', 'refunded')),
  gift_card_code            text,
  gift_card_url             text,
  tillo_reference           text,
  stripe_payment_intent_id  text,
  cashback_event_id         uuid        references cashback_events(id),
  created_at                timestamptz not null default now()
);


-- ── Demo brand seed ───────────────────────────────────────────────────────────

insert into gift_card_brands (name, slug, category, cashback_percentage, min_amount_gbp, max_amount_gbp) values
  ('Tesco',        'tesco',         'Groceries',    5, 5, 250),
  ('Sainsbury''s', 'sainsburys',    'Groceries',    4, 5, 250),
  ('M&S',          'marks-spencer', 'Fashion',      7, 5, 250),
  ('ASOS',         'asos',          'Fashion',      9, 5, 250),
  ('John Lewis',   'john-lewis',    'Home',         4, 5, 250),
  ('Amazon',       'amazon',        'Shopping',     3, 5, 250),
  ('Costa',        'costa',         'Food & Drink', 6, 5, 100),
  ('Nike',         'nike',          'Sports',       8, 5, 250);


-- ── Grants ───────────────────────────────────────────────────────────────────

grant all on table gift_card_brands, gift_card_orders to anon, authenticated;
