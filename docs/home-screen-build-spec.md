# Amplifi — Home Screen Build Spec
## "The Family Mission" — turning the agreed prototype into the real home

**Status: PLAN FOR APPROVAL. No app code or migrations to be written until James signs off.**
This follows the prototype-first process in `home-screen-design-brief.md` §9.4: the visual is now
agreed, so it becomes a build spec and gets wired to real data, replacing the current pot page.

Agreed design decisions locked during prototyping (see `apps/web/src/routes/prototype/FamilyMission.tsx`):

- **Ring model: Target** — rings FILL toward a contribution target (a deliberate, signed-off
  departure from the brief's original "rings are not progress toward money").
- **Rings (inner → outer): Core, Family, Boosters.** Core innermost.
- **Core = the parental household** (Mum + Dad) **plus Child Benefit** (featured inside Core, not
  its own ring — rule of three).
- **Family = the wider circle** — grandparents (grouped by side), then aunties/uncles/godparents.
- **Boosters = passive growth**, still parked/"on the way" (cashback etc. — Phase 2, do not wire).
- Centre = the child's projected future (illustrative), tappable for the "how it's built" breakdown;
  pre-DOB shows a generic prompt, never a figure built on a guess.
- Supporters shown as avatar clusters beside each ring; occasion gifting lives in Family.
- First-run (no DOB, no supporters) is a designed state, warm and inviting, never guilt-inducing.

---

## 1. What this replaces

The current `/home` pot page (`apps/web/src/routes/parent/Home.tsx`) — `PotHero`, the numbered
"Get the pot growing" path, the family roster, and `ProjectionWidget` — is reframed into the Family
Mission. Nothing useful is lost; it is re-expressed:

| Today (pot page) | Becomes (Family Mission) |
|---|---|
| `PotHero` big pot £ total | Secondary — the mission progresses; the centre shows the child's projection, not the pot balance |
| Numbered guided path (link ISA, send pay-in, contribute, invite) | The single contextual nudge + the per-ring CTAs inside expanded panels |
| Family roster card | The avatar clusters + the expandable ring panels (Core / Family) |
| `ProjectionWidget` (slider, age chips) | The centre figure + the tap-to-expand projection breakdown |
| Link-ISA prompt | Stays reachable (Core panel / nudge); the ISA/DOB step is P4→P5, unchanged |

The four MVP flows must remain intact: parent signup, link ISA, invite family / pledge, occasion
wishlist. This is a re-skin of the home surface, not a change to those flows.

---

## 2. What data feeds each ring (from the existing schema)

Everything below is derivable from tables that already exist. No cashback/CLO wiring (parked).

**Core ring — the parental household.**
- People: the parent (child `owner_id`) and their partner, via the self-connection in
  `family_connections` (`requester_id === parent_id`, `relationship IS NULL`).
- Money: `family_contributions` rows on that self-connection — `amount_gbp` + `frequency`.
- Child Benefit: featured inside Core. **Not in the schema today** — see §4 (decision needed).
- Ring "current" = monthly-normalised sum of the household's recurring contributions (+ Child
  Benefit if set up). Weekly ×52/12; one-off excluded from the monthly rate (it still feeds the
  pot/centre figure).

**Family ring — the wider circle.**
- People + money: `family_pledges` (`amount_pennies`, `frequency`, `pledger_relationship` =
  `grandparent|other|friend`) once `status = 'linked'`/active, plus any non-self
  `family_connections` + their `family_contributions` (`relationship` =
  `grandparent|aunt|uncle|aunt_uncle|friend|other`).
- Ring "current" = monthly-normalised sum of the wider circle's recurring giving. (Prototype showed
  Family as a monthly figure; one-off birthday/Christmas gifts belong to occasion gifting, not the
  monthly rate — see §5 open question.)

**Boosters ring — passive growth.**
- No real data. Stays "on the way" / £0 of target with the coming-soon panel. Cashback data exists
  (`cashback_events` etc.) but is **Phase-2 and parked** — do NOT read it into the pot.

**Centre figure — the projection.**
- Reuse the existing projection maths (`lib/projections.ts`, 7% p.a. annuity-due) driven by the
  household's total monthly contribution and the child's age from `children.date_of_birth`
  (fallback `approx_age_months`).
- Pre-DOB: no figure — show the generic "add date of birth" prompt (rule already exists).

---

## 3. What the design needs that the schema does NOT have yet

Flagged by the schema audit. Each is a decision (see §4):

1. **Per-ring targets** (Core £/mo, Family £/mo, Boosters £/yr) — no target column exists on any
   contribution/connection table.
2. **Household £ goal** (the centre "£100k goal") — no field anywhere.
3. **Child Benefit as a contribution** — absent entirely; needs a way to record it.
4. **Maternal / paternal "side"** for grandparents — no column (prototype's "Mum's side / Dad's
   side" has no backing data).
5. **Explicit Core vs Family membership** — currently only *inferred* (self-connection heuristic +
   relationship enums). Works, but is a heuristic.
6. Housekeeping: `family_contributions` has **no CREATE TABLE migration** in the repo (documented in
   the handover, implied by code). Any column added to it should be done carefully and the base
   table's DDL captured in a migration for the record.

---

## 4. Decisions needed before build (James)

**D1 — Targets & household goal: config or schema?**
- *Option A (recommended for MVP):* app-level default targets (Core £150/mo, Family £100/mo,
  Boosters £500/yr, goal £100k), not persisted, shown as sensible defaults. Zero migration, fastest,
  fully testable. Persist only later, once the parent can edit them.
- *Option B:* add nullable columns now (e.g. `children.core_target_gbp`, `family_target_gbp`,
  `boosters_target_gbp`, `household_goal_gbp`) so the parent can set/adjust them from day one.
- Recommendation: **A now, B when we add the "edit targets" UI.**

**D2 — Child Benefit modelling.**
- *Option A (recommended):* record it as a `family_contributions` row on the self-connection with a
  new nullable `source` column (e.g. `source = 'child_benefit'`), so it flows through the existing
  pot/ring maths and can be labelled distinctly.
- *Option B:* a boolean `is_child_benefit` on `family_contributions`.
- Either is a small manual migration. Recommendation: **A** (a `source` text column is more
  extensible — future payroll/employer sources).

**D3 — Grandparents by side.**
- *Option A (recommended for v1):* ship WITHOUT persisted side — group grandparents under a single
  "Grandparents" heading in the Family panel, defer "Mum's side / Dad's side" until there's a column
  and an onboarding step to capture it.
- *Option B:* add `family_connections.family_side` (`maternal|paternal|null`) + capture it in the
  invite flow now.
- Recommendation: **A** — the side grouping was a nice-to-have; don't block the build on new capture
  UI.

**D4 — Boosters:** confirm it stays a parked "on the way" ring with no data wiring (per MVP
discipline / CLAUDE.md). Recommendation: **yes, parked.**

---

## 5. Open design questions surfaced by real data

- **One-off gifts vs monthly ring rate.** Family recurring giving maps cleanly to a monthly ring
  figure; one-off birthday/Christmas gifts don't. Proposal: one-offs feed the pot + centre
  projection and appear in the activity feed, but the Family ring's fill tracks *recurring* monthly
  giving only. Confirm.
- **Single child.** The current home uses `children[0]`. The mission screen assumes one child too.
  Multi-child is out of scope for this build (flag as future).
- **Relationship enum mismatch.** `family_pledges` only has `grandparent|other|friend` while
  `family_connections` has `aunt|uncle|aunt_uncle|friend|other`. Family sub-grouping must handle
  both. (Known snag: dead `aunt`/`uncle` values — see CLAUDE.md.)

---

## 6. Compliance (build it right from day one)

- Centre figure is a projection: always "Illustrative — could grow to around this, not a guarantee.
  Capital at risk. Assumes 7% p.a.", adjacent (not footer). No "becomes/will be/guaranteed", ever.
- No personalised figure before DOB is known.
- Targets and the household goal are illustrative motivators, not promises — same "could/illustrative"
  framing; keep gift-card/commerce (Boosters, parked) visually separate from investment returns.
- Child Benefit framing stays realistic ("redirect even part of ~£117/mo"), never "all of it".
- P4 provider copy remains a separate gate (James approves providers + wording) — unchanged here.
- No investment-promise language anywhere (the wording that got Stripe to flag Amplifi).

---

## 7. Impacted files (anticipated)

- **New:** `apps/web/src/routes/parent/Home.tsx` rewritten from the prototype
  (`prototype/FamilyMission.tsx`), wired to real data. Keep the prototype route as-is for reference.
- **Data layer:** extend `lib/usePot.ts` / `lib/computePot.ts` (or add `lib/useMission.ts`) to derive
  per-ring monthly totals (Core vs Family) and the projection inputs, reusing `lib/projections.ts`.
- **Reuse:** `ProjectionWidget` maths, `useChildren`, `ensureSelfConnection`, the contribution panel,
  invite/link-ISA links — all unchanged.
- **Migration (if D1-B / D2 chosen):** manual SQL for James to run in the Supabase SQL editor
  (migrations are manual per CLAUDE.md) — plus a migration capturing `family_contributions` base DDL.

---

## 8. Phased plan (each phase stops for review)

1. **Data model** — confirm D1–D4; if any schema change, write the SQL for James to apply manually,
   and verify. (Data model before app code.)
2. **Data layer** — build the per-ring monthly derivation + projection inputs from existing tables
   (Core = self contributions [+ Child Benefit], Family = recurring pledges/connections, Boosters =
   parked). Unit-test the monthly-normalisation and pot maths.
3. **UI** — productionise the FamilyMission UI into `/home` (Target rings), wired to real data,
   including the first-run states (no DOB / no supporters). Replace the pot page.
4. **QA + gates** — full end-to-end pass on the four MVP flows + the new home; then the standing
   gates before real families: **P4 provider copy** and **RLS** (RLS is disabled and must be enabled
   before Week 2 / other families — a dedicated session, not this build).

---

## 9. Risks

- **Security / RLS is disabled** (`GRANT ALL` to `anon`). Fine for solo dev with only James's data;
  must be enabled before other families. This build does not enable it — flagged as its own gate.
- **`family_contributions` has no base migration** — take care adding columns; capture DDL.
- **Boosters must stay parked** — easy to accidentally wire cashback; do not.
- **Auto-connect-to-first-child snag** (CLAUDE.md) and single-child assumption persist.
- **Production site is sacred** — this is the app (`app.letsamplifi.com`), not `letsamplifi.com`.
- Monthly normalisation and one-off handling need care so ring figures always reconcile with the
  people shown (the prototype lesson: numbers must add up).
