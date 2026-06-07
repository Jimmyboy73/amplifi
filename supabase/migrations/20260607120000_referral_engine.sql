-- ============================================================
-- Referral Engine
-- ============================================================

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

create table referral_codes (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        unique not null references auth.users(id),
  code       text        unique not null,
  created_at timestamptz not null default now()
);

create table referral_events (
  id                  uuid        primary key default gen_random_uuid(),
  referrer_id         uuid        not null references auth.users(id),
  referred_id         uuid        not null references auth.users(id),
  code_used           text        not null,
  status              text        not null default 'pending'
                                  check (status in ('pending', 'jisa_linked', 'credited')),
  referrer_credit_gbp numeric     not null default 5.00,
  referred_credit_gbp numeric     not null default 5.00,
  created_at          timestamptz not null default now(),
  credited_at         timestamptz
);

create table referral_credits (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id),
  amount_gbp        numeric     not null,
  source            text        not null check (source in ('referrer', 'referred')),
  referral_event_id uuid        not null references referral_events(id),
  status            text        not null default 'pending'
                                check (status in ('pending', 'redeemable', 'redeemed')),
  created_at        timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Code generation function
-- ------------------------------------------------------------

create or replace function generate_referral_code()
returns trigger
language plpgsql
security definer
as $$
declare
  candidate text;
  chars     text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i         int;
begin
  loop
    candidate := '';
    for i in 1..8 loop
      candidate := candidate || substr(chars, floor(random() * length(chars))::int + 1, 1);
    end loop;

    exit when not exists (
      select 1 from referral_codes where code = candidate
    );
  end loop;

  insert into referral_codes (user_id, code)
  values (new.id, candidate);

  return new;
end;
$$;

-- ------------------------------------------------------------
-- Trigger: auto-generate referral code on new user
-- ------------------------------------------------------------

create trigger trg_create_referral_code
  after insert on auth.users
  for each row
  execute function generate_referral_code();

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------

alter table referral_codes   enable row level security;
alter table referral_events  enable row level security;
alter table referral_credits enable row level security;

-- referral_codes: owner can read their own row
create policy "referral_codes: owner select"
  on referral_codes
  for select
  using (user_id = auth.uid());

-- referral_events: both parties can read rows they appear in
create policy "referral_events: participant select"
  on referral_events
  for select
  using (
    referrer_id = auth.uid()
    or referred_id = auth.uid()
  );

-- referral_credits: owner can read their own credits
create policy "referral_credits: owner select"
  on referral_credits
  for select
  using (user_id = auth.uid());
