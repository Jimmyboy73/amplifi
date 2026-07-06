-- ============================================================================
-- WIPE ALL DATA (public schema) — test-data reset
--
-- Removes EVERY row from EVERY table in the public schema, while keeping all
-- tables, columns, functions, RPCs, policies, and constraints intact. Structure
-- untouched — data only.
--
-- Uses a single TRUNCATE ... CASCADE so foreign-key order is handled automatically
-- (no manual ordering, and it works even with the non-cascading FKs we've run into).
-- RESTART IDENTITY also resets any sequences.
--
-- Does NOT touch auth.users / the auth schema — delete those separately (see the
-- notes I gave you: run this FIRST, then remove the auth users; wiping public data
-- is what unblocks the auth-user deletion).
--
-- IRREVERSIBLE. Only run when you truly want an empty database.
-- ============================================================================

do $$
declare
  all_tables text;
begin
  select string_agg(format('%I.%I', schemaname, tablename), ', ')
    into all_tables
  from pg_tables
  where schemaname = 'public';

  if all_tables is not null then
    execute 'truncate table ' || all_tables || ' restart identity cascade';
  end if;
end $$;

-- Sanity check: every public table should now report 0 rows.
select relname as table, n_live_tup as approx_rows
from pg_stat_user_tables
where schemaname = 'public'
order by n_live_tup desc, relname;

-- ── OPTIONAL: also clear auth users via SQL (only AFTER the truncate above) ──
-- Once public is empty, nothing references auth.users, so this succeeds and
-- cascades to auth.identities / auth.sessions. Prefer the Dashboard if unsure.
-- Uncomment to use:
--
-- delete from auth.users;
