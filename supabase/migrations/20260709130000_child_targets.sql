-- Per-child contribution targets — the parent's re-weighted "default-then-adjust" figures.
--
-- NULL means "use the age-scaled defaults from lib/mission.ts" (Core £50/mo, Family £30/mo,
-- Occasions £400/yr, scaled up for a child joining later). The £100k-by-25 GOAL itself is
-- fixed (it's the mission) and is NOT stored here. All figures are illustrative motivators,
-- not promises.
--
-- Safe, additive: nullable columns, no data change. Applied manually in the Supabase SQL
-- Editor (this project applies migrations by hand, not via CLI).

alter table public.children
  add column if not exists core_target_gbp numeric,
  add column if not exists family_target_gbp numeric,
  add column if not exists occasions_target_gbp numeric,
  add column if not exists boosters_target_gbp numeric;
