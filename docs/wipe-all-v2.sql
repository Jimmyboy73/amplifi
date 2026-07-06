-- ============================================================================
-- WIPE ALL DATA (public schema) — v2, robust
--
-- Why v1 may have looked like it "didn't clear":
--   1. Its verify query used pg_stat_user_tables.n_live_tup — an ESTIMATE that lags,
--      so it can show old numbers even after the rows are gone. v2 verifies with real
--      count(*).
--   2. v1 truncated every table in ONE statement; if any single table couldn't be
--      truncated, the whole thing rolled back and nothing cleared. v2 truncates
--      table-by-table and reports any table it couldn't clear (with the reason), so a
--      single problem table can't block the rest.
--
-- Keeps all tables, functions, RPCs, policies — data only. Does NOT touch auth.users.
-- IRREVERSIBLE.
-- ============================================================================

do $$
declare
  r        record;
  failures int := 0;
begin
  for r in
    select tablename from pg_tables where schemaname = 'public' order by tablename
  loop
    begin
      execute format('truncate table public.%I restart identity cascade', r.tablename);
    exception when others then
      failures := failures + 1;
      raise notice 'COULD NOT TRUNCATE %  ->  % (SQLSTATE %)', r.tablename, sqlerrm, sqlstate;
    end;
  end loop;
  raise notice 'wipe complete. tables that could NOT be truncated: %', failures;
end $$;

-- ── REAL row counts (authoritative — not estimates) ──────────────────────────
-- Every one of these must read 0. If any is > 0, check the NOTICE output above for
-- the table name + reason and send it over.
select 'profiles'               as table_name, count(*) as rows from profiles
union all select 'children',              count(*) from children
union all select 'family_pledges',        count(*) from family_pledges
union all select 'family_pledge_invites', count(*) from family_pledge_invites
union all select 'feedback',              count(*) from feedback
union all select 'gift_card_brands',      count(*) from gift_card_brands
union all select 'cashback_offers',       count(*) from cashback_offers
union all select 'merchants',             count(*) from merchants
order by table_name;
