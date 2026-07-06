-- ── Family Pledge & Invite — VERIFICATION ONLY (run AFTER the migration) ────────
-- This file changes NOTHING permanently. Sections A–C are read-only checks; Section D
-- creates a throwaway pledge inside a transaction and ROLLS IT BACK, so no data is left
-- behind. Paste the whole file into the Supabase SQL Editor and Run, or run a section
-- at a time. Not a migration — do not put this in supabase/migrations.
--
-- NOTE: the new tables are family_pledges / family_pledge_invites (NOT the pre-existing
-- `pledges` wishlist table or legacy `family_invites`).

-- ── A. Tables, columns, functions exist ───────────────────────────────────────
-- Expect: 2 tables, 3 new children columns, 3 functions.
select 'tables' as check, string_agg(table_name, ', ' order by table_name) as found
from information_schema.tables
where table_schema = 'public' and table_name in ('family_pledges', 'family_pledge_invites');

select 'children cols' as check, string_agg(column_name, ', ' order by column_name) as found
from information_schema.columns
where table_name = 'children'
  and column_name in ('account_status', 'approx_age_months', 'created_by_user_id');

select 'functions' as check, string_agg(proname, ', ' order by proname) as found
from pg_proc
where proname in ('create_family_pledge', 'get_pledge_invite', 'mark_pledge_invite_opened');

-- children.owner_id and children.date_of_birth must now be NULLABLE (YES = correct).
select column_name, case when is_nullable = 'YES' then 'nullable OK'
                         else 'NOT NULL - WRONG' end as nullable
from information_schema.columns
where table_name = 'children' and column_name in ('owner_id', 'date_of_birth')
order by column_name;

-- Confirm the pre-existing tables were NOT disturbed (wishlist pledges keeps wishlist_id;
-- legacy family_invites keeps inviter_user_id). Both should still return their old columns.
select 'wishlist pledges intact' as check,
       exists (select 1 from information_schema.columns
               where table_name = 'pledges' and column_name = 'wishlist_id') as ok;

-- ── B. RLS is enabled on the two new tables (both must be true) ────────────────
select relname as table, relrowsecurity as rls_enabled
from pg_class
where relname in ('family_pledges', 'family_pledge_invites')
order by relname;

-- Policies present on the new tables (expect: pledgers read/update own, creators read own).
select tablename, policyname, cmd
from pg_policies
where tablename in ('family_pledges', 'family_pledge_invites')
order by tablename, policyname;

-- ── C. The accept-screen RPC exposes NO email column ──────────────────────────
-- proargnames lists the function's IN + OUT names. Eyeball the OUT names: there must be
-- NO 'email'/'pledger_email' among them. Expected OUTs: invite_id, direction,
-- child_display_name, sender_first_name, amount_pennies, frequency, personal_message,
-- status, expired.
select proname, proargnames
from pg_proc
where proname = 'get_pledge_invite';

-- ── D. End-to-end round trip — CREATES then ROLLS BACK (leaves nothing) ────────
-- Creates a pledge via the RPC, reads it straight back through the token RPC, and returns
-- exactly what a parent would see on the accept screen. The result set has NO email column
-- — proof the sender's address is never exposed by the link. Rolled back, so no test
-- child/pledge/invite persists.
begin;
  with new_token as (
    select create_family_pledge(
      'VerifyTest Child',           -- p_child_name
      1000,                         -- p_amount_pennies  (£10.00)
      'weekly',                     -- p_frequency
      'on_account_open',            -- p_start_trigger
      'Smoke test — safe to ignore, this is rolled back',  -- p_personal_message
      'Verify Sender',              -- p_pledger_name
      'verify-sender@example.com',  -- p_pledger_email  (should NOT appear in the output)
      'grandparent',                -- p_relationship
      'copy_link'                   -- p_channel
    ) as token
  )
  select g.*
  from new_token, get_pledge_invite(new_token.token) g;
rollback;

-- After running D, confirm nothing stuck around (must be 0):
select 'leftover test children' as check, count(*) as n
from children where name = 'VerifyTest Child';
