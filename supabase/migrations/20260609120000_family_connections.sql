-- ── family_connections ────────────────────────────────────────────────────────
-- Tracks connection requests between a contributor (requester) and a parent.
-- Created automatically when a new user signs up via a referral handle.
-- Safe to run against a DB where family_connections already exists:
--   - CREATE TABLE IF NOT EXISTS skips if the table is there
--   - ADD COLUMN IF NOT EXISTS handles the relationship column added manually
--   - Policies wrapped in DO blocks ignore duplicate_object errors
--   - Indexes use IF NOT EXISTS

create table if not exists family_connections (
  id            uuid        primary key default uuid_generate_v4(),
  requester_id  uuid        not null references profiles(id) on delete cascade,
  parent_id     uuid        not null references profiles(id) on delete cascade,
  child_id      uuid        not null references children(id) on delete cascade,
  status        text        not null default 'pending'
                check (status in ('pending', 'approved', 'revoked')),
  relationship  text,
  created_at    timestamptz not null default now()
);

-- Additive: covers the case where the table was created without this column
alter table family_connections add column if not exists relationship text;

alter table family_connections enable row level security;

do $$ begin
  create policy "Parents can view connection requests" on family_connections
    for select using (auth.uid() = parent_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Requesters can view own connections" on family_connections
    for select using (auth.uid() = requester_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can create connection requests" on family_connections
    for insert with check (auth.uid() = requester_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Parents can update connection requests" on family_connections
    for update using (auth.uid() = parent_id);
exception when duplicate_object then null; end $$;

-- Allow approved contributors to read the child they're connected to
do $$ begin
  create policy "Approved contributors can view connected children" on children
    for select using (
      exists (
        select 1 from family_connections fc
        where fc.child_id = id
          and fc.requester_id = auth.uid()
          and fc.status = 'approved'
      )
    );
exception when duplicate_object then null; end $$;

-- Allow approved contributors to read the JISA for that child
do $$ begin
  create policy "Approved contributors can view connected JISA" on jisa_accounts
    for select using (
      exists (
        select 1 from family_connections fc
        where fc.child_id = child_id
          and fc.requester_id = auth.uid()
          and fc.status = 'approved'
      )
    );
exception when duplicate_object then null; end $$;

create index if not exists idx_family_connections_parent    on family_connections(parent_id);
create index if not exists idx_family_connections_requester on family_connections(requester_id);
create index if not exists idx_family_connections_child     on family_connections(child_id);
