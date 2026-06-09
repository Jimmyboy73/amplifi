-- ── family_connections ────────────────────────────────────────────────────────
-- Tracks connection requests between a contributor (requester) and a parent
-- (parent_id). Created automatically when a new user signs up via a handle.
-- The parent approves or declines; approved connections grant contributors
-- read access to the linked child's details and JISA.

create table family_connections (
  id            uuid        primary key default uuid_generate_v4(),
  requester_id  uuid        not null references profiles(id) on delete cascade,
  parent_id     uuid        not null references profiles(id) on delete cascade,
  child_id      uuid        not null references children(id) on delete cascade,
  status        text        not null default 'pending'
                check (status in ('pending', 'approved', 'revoked')),
  relationship  text,
  created_at    timestamptz not null default now()
);

alter table family_connections enable row level security;

-- Parent can see requests for their children
create policy "Parents can view connection requests" on family_connections
  for select using (auth.uid() = parent_id);

-- Requester can see their own connections
create policy "Requesters can view own connections" on family_connections
  for select using (auth.uid() = requester_id);

-- Authenticated user can request a connection (requester_id must be self)
create policy "Users can create connection requests" on family_connections
  for insert with check (auth.uid() = requester_id);

-- Parent can approve or revoke
create policy "Parents can update connection requests" on family_connections
  for update using (auth.uid() = parent_id);

-- ── Extended RLS so approved contributors can read child & JISA data ──────────

-- Allow approved family members to read the child they're connected to
create policy "Approved contributors can view connected children" on children
  for select using (
    exists (
      select 1 from family_connections fc
      where fc.child_id = id
        and fc.requester_id = auth.uid()
        and fc.status = 'approved'
    )
  );

-- Allow approved family members to read the JISA for that child
create policy "Approved contributors can view connected JISA" on jisa_accounts
  for select using (
    exists (
      select 1 from family_connections fc
      where fc.child_id = child_id
        and fc.requester_id = auth.uid()
        and fc.status = 'approved'
    )
  );

create index idx_family_connections_parent    on family_connections(parent_id);
create index idx_family_connections_requester on family_connections(requester_id);
create index idx_family_connections_child     on family_connections(child_id);
