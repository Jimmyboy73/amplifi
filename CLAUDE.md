# CLAUDE.md — Amplifi App (code repo)

This is the working monorepo for the Amplifi MVP. Read this first, then the detailed handover
(`amplifi-handover.md` at repo root) for schema, file map, and history. If anything here conflicts
with an older note in the repo, this file wins.

## What we are doing right now

The MVP exists to prove ONE loop: **does a parent invite their family, and does that family
contribute?** Concretely — can one parent get one grandparent to set up a standing order through
this app?

The four MVP flows are already built. The current job is **not new features** — it is to test them
end-to-end, find bugs, and harden them. Nail the four flows before adding anything.

### The four MVP flows (the only things that matter now)
1. Parent signup — Email -> OTP -> Details -> Handle -> Child -> Home (5 screens)
2. Link ISA — prompted from the home-screen Getting Started card (not in onboarding)
3. Invite family — WhatsApp -> landing page -> contributor signs up via handle -> parent approves -> connected
4. Birthday/occasion wishlist — parent creates, shares, family pledges (no login to pledge)

### Tab bar (3 tabs only): Home | My Family | Occasions

## Parked — do NOT build on, re-enable, or delete

Cashback (CLO engine) and Loyalty (gift-card shop) are **built but hidden** (`href: null` in
`apps/app/app/(tabs)/_layout.tsx`). Their screen files and tables stay in place, untouched. Also
parked: open banking, Fidel/Sientia integration, Tillo, payment processing (Stripe on hold). None of
this is in scope. Do not wire it up, and do not remove it either — just leave it alone.

## Critical rules (never break)

- **MVP discipline.** Four flows only. If a task drifts toward cashback, gift cards, open banking, or
  payments, stop and flag it — that is Phase 2.
- **Production site is sacred.** Never touch `letsamplifi.com` / Netlify `dancing-sable-1635b9`.
  It is drag-and-drop only and disconnected from GitHub.
- **Plan before edits.** For any change, first produce a plan — impacted files, risks, approach — and
  wait for approval before editing. Data model before app code.
- **Migrations are manual.** Schema changes are written as SQL and applied by James in the Supabase
  SQL Editor — not via CLI. Provide the SQL; don't assume it's auto-applied.
- **No investment-promise language in any user-facing or marketing copy.** Wording like "funds their
  retirement / financial freedom" is what got Stripe to flag Amplifi (appeal still under review).
  Any return figure must be labelled "illustrative", and gift-card discounts (commerce) must be kept
  separate from investment returns. When in doubt, flag copy for review rather than shipping it.
- **Spelling: Sientia** (never "Cientia").

## Security — read before any data work

- **RLS is DISABLED on all tables and `GRANT ALL` is granted to `anon`.** This is fine for solo dev
  with only James's own data. It is NOT safe once other families' real data is in the database.
  **RLS must be enabled before Week 2 of testing (other families), not "before beta" generally.**
- Do not enable RLS casually mid-task — done carelessly it breaks the app. It needs a dedicated
  session with written policies. If a task touches this, flag it and stop.

## Data model — current truth & known snags

- `profiles` (has `handle`), `children` (`owner_id`), `jisa_accounts`, `family_connections`
  (canonical), `family_contributions`, `wishlists`, `wishlist_items`, `pledges`.
- **Handles replaced referral codes.** `referral_codes` is legacy/unused. `family_contributors` and
  `family_invites` are legacy. `users` is legacy — `profiles` is canonical.
- Known snag 1: the `family_connections.relationship` CHECK still allows `'aunt'` and `'uncle'` as
  separate values, but the UI only writes `'aunt_uncle'`. Two dead values — clean up when convenient.
- Known snag 2: signup auto-connects a contributor to the referrer's **first** child only. Watch this
  in testing when a referrer has more than one child.

## Projection formula & rate

**Rate is 7% p.a. everywhere** (canonical model — see the Fable alignment brief). `lib/projections.ts`
`fv` uses an ORDINARY monthly annuity at r = 0.07/12; `lib/mission.ts` `fvAnnual` uses an annuity-DUE
for yearly buckets (Occasions/Boosters) at 7%. Do not reintroduce 8%.
Reference (ordinary monthly at 7%): £50/mo -> ~£40,504 at 25 years, ~£791,911 at 65 years.
Canonical default targets (`DEFAULT_TARGETS`): Core £50/mo + Family £50/mo + Occasions £250/yr ≈ £97.9k
(the three reliable rings), + Everyday Boosters £120/yr (coming-soon gap-closer) ≈ £106k all four.
The £100k is always the WHOLE-FAMILY total, never one person's contribution.

## Stack & commands

- `apps/app` — React Native / Expo SDK 54, Expo Router, tested in Expo Go.
  Start: `cd apps/app && npx expo start --clear`
- `apps/playground` — Vite 5 / React -> `amplifi-plan.netlify.app` (auto-deploys from GitHub).
  Start: `cd apps/playground && npm run dev`
- `apps/marketing` — Vite / React -> `amplifi-marketing.netlify.app` (auto-deploys).
- Supabase project `zmxnhhnlvpdlptsxvliy` (EU London).
- Brand: Midnight #101628 · Sky #59C9E9 · Azure #407BBF · White #FFFFFF · Plus Jakarta Sans.

## Where to look

Full schema, complete file-by-file map, and session history are in `amplifi-handover.md` at the repo
root. Build specs (when handed one) live in the brain folder at
`C:\Users\james\OneDrive\Documents\Amplifi\amplifi-brain\specs\` — read the relevant spec before
implementing, and treat it as the source of truth for scope and acceptance criteria.
