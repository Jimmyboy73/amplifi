# Where I left off

## Future enhancements (not now — deferred)

- **Pledge management — let a parent remove/cancel a pledge or contributor.**
  Logged 2026-07-06. The Home family roster is currently read-only (it lists pledges from
  `family_pledges` via `get_child_pledges`). The old `InviteCard`/`family_connections` flow
  had Remove/Cancel actions; those were dropped when consolidating onto the token/pledge
  flow. A parent will eventually need to remove someone (e.g. a mistaken or unwanted
  pledge) — add cancel/remove actions against `family_pledges` (status → `cancelled`) with
  a matching pot/roster refetch. Needs an auth-gated RPC (parent owns the child).


- **Capture the child's date of birth at the parent's account-confirm step (P5).**
  Logged 2026-07-06. Pledge-flow children are created without a DOB (only an optional
  `approx_age_months`), so the pot-page projection currently falls back to that estimate.
  Collecting a real DOB at P5 (`ConfirmAccount`) would give precise age-based projections
  (Age 18 / 25 / 65) for claimed children. New feature — out of scope for the current
  test-data cleanup / bug-fix pass.
