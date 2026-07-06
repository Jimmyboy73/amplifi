-- ============================================================================
-- Family Pledge — SCOPED TEST-DATA CLEANUP
-- Removes ONLY family-pledge test data. Leaves the schema, functions, and ALL
-- pre-existing MVP data (your real account, children, wishlists, jisa, etc.) intact.
--
-- HOW TO USE:
--   PART 1 — run the previews first and eyeball the rows. Confirm they're all test.
--   PART 2 — run the deletes (wrapped in a transaction).
--   PART 3 — MANUAL: claimed test children + test parent accounts (can't be auto-scoped).
--
-- WHY IT'S SAFE:
--   * family_pledges / family_pledge_invites are NEW tables with no real users yet,
--     so every row is from your own testing.
--   * A child with owner_id IS NULL can only come from the pledge flow — the normal
--     signup (ParentSignup / Expo) always sets owner_id. Your real children are never
--     owner-null, so this filter can't touch them.
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────────
-- PART 1 — PREVIEW (read-only): exactly what PART 2 will delete
-- ─────────────────────────────────────────────────────────────────────────

-- 1a. ALL invites (new table — every row is test)
select count(*) as invites_to_delete from family_pledge_invites;

-- 1b. ALL pledges (new table — every row is test)
select count(*) as pledges_to_delete from family_pledges;

-- 1c. Unclaimed pledge-flow children (owner_id IS NULL — safe; incl. all the QA/curl
--     children like 'QA Diagnostic', 'Direct Test', etc.)
select id, name, account_status, created_at
from children
where owner_id is null
order by created_at;


-- ─────────────────────────────────────────────────────────────────────────
-- PART 2 — DELETE (run only after reviewing PART 1)
-- ─────────────────────────────────────────────────────────────────────────
begin;

-- Order: invites reference pledges; both reference children.
delete from family_pledge_invites;                 -- new table: all test
delete from family_pledges;                        -- new table: all test
delete from children where owner_id is null;       -- unclaimed pledge-flow children only

commit;


-- ─────────────────────────────────────────────────────────────────────────
-- PART 3 — MANUAL: claimed test children + test parent accounts
-- ─────────────────────────────────────────────────────────────────────────
-- Cannot be auto-scoped safely: a child claimed by a TEST parent looks identical to your
-- real child except for who owns it, and auth users are managed by Supabase.

-- 3a. List every parent account + how many children it owns. Identify the TEST accounts
--     (the throwaway emails you signed up during full-loop testing) vs your REAL account
--     (jamesshattock@yahoo.co.uk — do NOT delete this one).
select p.id, p.email, p.full_name, count(c.id) as children_owned, p.created_at
from profiles p
left join children c on c.owner_id = p.id
group by p.id, p.email, p.full_name, p.created_at
order by p.created_at desc;

-- 3b. For a TEST parent id from 3a, preview what they own before deleting (replace the id):
-- select id, name, account_status from children where owner_id = '<TEST_PARENT_ID>';

-- 3c. Remove ONE test parent's data. Replace <TEST_PARENT_ID>, run top to bottom:
-- delete from family_contributions where child_id in (select id from children where owner_id = '<TEST_PARENT_ID>');
-- delete from jisa_accounts        where child_id in (select id from children where owner_id = '<TEST_PARENT_ID>');
-- delete from children             where owner_id = '<TEST_PARENT_ID>';   -- cascades family_connections on those children
--
-- 3d. Then delete the auth user itself — DO THIS IN THE DASHBOARD, not SQL:
--     Authentication → Users → find the test email → Delete user.
--     (This cascades their profiles row. Do it AFTER 3c so no children are orphaned.
--      If a profiles row lingers: delete from profiles where id = '<TEST_PARENT_ID>';)
