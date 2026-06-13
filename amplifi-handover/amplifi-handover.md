# Amplifi — Chat 5 Handover

## Monorepo & Stack
- **Repo:** `C:\Users\james\Projects\amplifi` — GitHub: `Jimmyboy73/amplifi`
- **Latest commit:** `0f183ef` — clean, pushed to master
- **Metro start:** `cd C:\Users\james\Projects\amplifi\apps\app` then `npx expo start`
- **Playground dev:** `cd C:\Users\james\Projects\amplifi\apps\playground` then `npm run dev`

### Apps
- `apps/app` — React Native / Expo SDK 54, Expo Router, tested via Expo Go
- `apps/playground` — Vite 5 / React, deployed to `amplifi-plan.netlify.app`
- `apps/marketing` — Vite / React, deployed to `amplifi-marketing.netlify.app`
- `letsamplifi.com` — standalone HTML, Netlify site `dancing-sable-1635b9`, deployed via drag-and-drop from `C:\Users\james\Projects\amplifi\letsamplifi\`

### Infrastructure
- **Supabase:** project `zmxnhhnlvpdlptsxvliy` (EU London)
- **RLS:** DISABLED on all core tables for development — must re-enable before beta
- **Netlify:** auto-deploys from GitHub for playground and marketing; letsamplifi.com is manual drag-and-drop only
- **Brand:** Midnight `#101628`, Sky `#59C9E9`, Azure `#407BBF`, White `#FFFFFF`, Plus Jakarta Sans

---

## What Was Built This Session

### 1. Home Screen Referral Card
- **File:** `apps/app/app/(tabs)/home.tsx`
- **Hook:** `apps/app/lib/useReferralStats.ts`
- Shows user's referral code (tappable to copy), invite count, £ pending
- "Invite friends" CTA opens native Share sheet with personalised message
- Stats query: `referral_events` count where `referrer_id = user.id`, `referral_credits` sum where `user_id = user.id` and status IN ('pending', 'redeemable')

### 2. Manual Referral Code Entry (Signup + Settings)
- **Shared helper:** `apps/app/lib/redeemReferralCode.ts`
- **Signup:** `apps/app/app/(auth)/details.tsx` — always-visible, editable referral field (pre-fills from AsyncStorage if present)
- **Settings:** `apps/app/app/settings/referral.tsx` — "Have a referral code?" row, three states (form / success / already-used)
- **Validation order inside helper (ALL checks run before any insert):**
  1. Length = 5 chars
  2. Code exists in `referral_codes` → "We couldn't find that code"
  3. Not own code (`codeRow.user_id === currentUserId`) → "That's your own code"
  4. Not already referred (existing `referral_events` row as `referred_id`) → "You've already used a code"
  5. Insert `referral_events` row + downstream trigger creates credits

### 3. CLO / Cashback Engine (Phase 1)
**Migration:** `supabase/migrations/20260607160000_clo_cashback_phase1.sql` — APPLIED to Supabase

**Tables created:**
- `merchants` — id, name, category, logo_url, contact_email, stripe_customer_id, status (active/inactive)
- `cashback_offers` — id, source (amplifi/fidel_oaas/sientia), merchant_id (FK), provider_offer_id, reward_type (percentage/fixed), reward_value, active_from, active_to, is_active, created_at
- `linked_accounts` — id, user_id, provider (sientia/fidel), provider_ref, status (active/revoked) — unused Phase 1
- `cashback_events` — id, user_id, linked_account_id, provider, provider_txn_id, merchant_id, merchant_name, amount_gbp, currency, offer_id (set by trigger), cashback_gbp (set by trigger), status (pending/settled/reversed), transacted_at, settled_at, raw (jsonb)
- `cashback_credits` — id, user_id, amount_gbp, source, cashback_event_id, status (pending/redeemable/redeemed/reversed)
- `spend_insights` — id, user_id, period_start, period_end, missed_cashback_gbp, detail (jsonb) — INSIGHT ONLY, never creates credits

**Engine (DB triggers):**
1. `trg_match_cashback_offer` (BEFORE INSERT on cashback_events) — finds active offer for merchant, computes cashback_gbp: percentage = `round(amount * rate / 100.0, 2)`, fixed = reward_value. No match = no credit.
2. `trg_create_cashback_credit` (AFTER INSERT) — creates pending credit if cashback_gbp > 0
3. `trg_settle_cashback_event` (BEFORE UPDATE) — pending→settled flips credit to redeemable + stamps settled_at; any→reversed flips credit to reversed

**Grants migration:** `supabase/migrations/20260607170000_cashback_grants.sql` — APPLIED
- `GRANT ALL` on all 6 tables to anon + authenticated
- `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` on all 6 tables

**App hooks:**
- `apps/app/lib/useCashbackOffers.ts` — fetches active offers joined to merchants
- `apps/app/lib/useCashbackBalance.ts` — sums credits using `.in('status', ['pending', 'redeemable'])` (correctly excludes reversed)
- **Cashback tab:** `apps/app/app/(tabs)/offers.tsx` — balance card (pending/redeemable split), active offers list, Phase 2 teaser

**Web admin:** `apps/playground/src/pages/Admin.tsx` — route `/admin` (not linked from public nav)
- Merchants tab: create merchants
- Offers tab: create offers (NO list of existing offers yet — see outstanding issues)
- Simulate txn: inject test transactions (trigger handles matching + crediting)
- Settle/reverse: flip events to settled or reversed

**Tested end-to-end:** create merchant → create offer → simulate £50 txn → £1.00 pending → settle → £1.00 redeemable → reverse → credit disappears. All verified in Expo Go.

### 4. Gift Card Shop
**Migration:** `supabase/migrations/20260607180000_gift_card_tables.sql` — APPLIED

**Tables:**
- `gift_card_brands` — id, name, slug, category, logo_url, cashback_percentage, min_amount_gbp, max_amount_gbp, is_active, tillo_brand_slug
- `gift_card_orders` — id, user_id, child_id, brand_id, amount_gbp, cashback_gbp, status (pending/completed/refunded), gift_card_code, gift_card_url, tillo_reference, stripe_payment_intent_id, cashback_event_id

**Seeded 8 demo brands:** Tesco (5%), Sainsbury's (4%), M&S (7%), ASOS (9%), John Lewis (4%), Amazon (3%), Costa (6%), Nike (8%)

**App:** `apps/app/app/(tabs)/shop.tsx`
- Search bar, brand grid (2 columns), "Buy now" opens modal
- Modal: preset amounts (£10/£25/£50/£100), live cashback calculation, stubbed "Pay with Stripe" that creates a cashback_events row (provider='gift_card') + gift_card_orders row
- Category filter pills were removed (persistent layout bug — see outstanding issues)

**Hooks:**
- `apps/app/lib/useGiftCardBrands.ts`
- `apps/app/lib/useGiftCardPurchase.ts`

### 5. Family Landing Page
**File:** `apps/playground/src/pages/family/FamilyPage.tsx`
**Route:** `/family/:childId` (optionally `?ref={code}`)

**Current page order (top to bottom):**
1. Header: "Building {name}'s financial future" + subtext about compounding
2. Projection calculator: £10/£20/£30/£40/£50 per month pills, 25-year projection at 8% annuity due
3. Contribute button → expands accordion showing JISA sort code + account number (fetched from `jisa_accounts` where `child_id` matches)
4. Amplifi signup section: "See how your contributions are helping {name}'s pot to grow" — referral code pill + "Visit Amplifi to sign up" link

**Family tab share link fixed:** `apps/app/app/(tabs)/family.tsx`
- URL now includes child ID and referral code: `amplifi-plan.netlify.app/family/{childId}?ref={code}`
- Gender-neutral language (was hardcoded "her")
- Home screen "Invite family" button now navigates to Family tab (was "coming soon")

### 6. letsamplifi.com Updates
- All investment-promise language replaced with cashback/gifting language (15 text replacements)
- Privacy policy page added at `/privacy.html`
- Projection numbers aligned to annuity due formula: £47,868 (25yr), £1,338,000 (65yr)
- Files at `C:\Users\james\Projects\amplifi\letsamplifi\` — deploy via Netlify drag-and-drop to site `dancing-sable-1635b9`

### 7. Tab Bar Change (unapproved)
`_layout.tsx` was changed: "Loyalty" → "Cashback" (💳), old "Cashback" → "Shop" (🛍️)
Current tab bar: **Home | Family | Cashback | Shop**
James has NOT approved this — needs his decision.

---

## Outstanding Issues

### Marketing site projection not updating
- Commit `0f183ef` changed `apps/marketing/src/App.tsx`: `useCountUp(47551)` → `useCountUp(47868)` and "age 21" → "age 25"
- Pushed to master but `amplifi-marketing.netlify.app` has not redeployed with the new numbers
- **Possible causes:** Netlify auto-deploy may not be triggered (check Netlify dashboard for the marketing site — is it linked to GitHub? correct branch? correct build command?). The playground auto-deploys fine, so it may be a different Netlify site configuration.
- **Fix:** check the Netlify project for the marketing site, verify GitHub integration is active and pointing at the correct branch and base directory (`apps/marketing`). May need to trigger a manual deploy.

### Category filter pills in Shop tab
- Removed because they were persistently clipping text despite multiple fix attempts (flexShrink, minWidth, FlatList replacement, inline styles — none worked)
- The `CATEGORIES` constant and `activeCategory` state were deleted, brand grid shows all brands
- **Root cause unknown** — the styles looked correct but the pills rendered identically regardless. May be a Metro/Expo Go caching issue that wasn't cleared by a fresh restart. Worth retrying in a clean session.

### Admin offers list
- The Offers tab in `/admin` lets you create offers but does NOT list existing ones
- This caused confusion during testing (couldn't see what offers existed, created duplicates, couldn't toggle is_active)
- **Need to add:** a list of all offers below the create form, showing merchant, reward, status (Live/Scheduled/Off/Expired), with a toggle switch per row to flip is_active

### Two older pending migrations (not yet applied)
- `supabase/migrations/20260607140000_profiles_payment_methods.sql` — adds pay_monzo, pay_paypal, pay_revolut, pay_bank to profiles
- `supabase/migrations/20260607150000_shorter_referral_codes.sql` — updates generate_referral_code() to 5-char codes
- The pay_bank columns were added manually earlier, but the migration should be run to keep repo in sync
- **Action:** paste each into Supabase SQL Editor and run

---

## Stripe Status
- **Account:** `acct_1TX4z4R4y4AhHzOu`
- **Issue:** Terms of service violation — Stripe flagged Amplifi as a restricted investment business
- **Action taken:** letsamplifi.com language updated to remove investment promises. Business description submitted via Stripe dashboard explaining Amplifi is a cashback platform, not an investment manager.
- **Current status:** "Appeal In Review — we'll get back to you in 1-2 business days" (dashboard). An automated email said "unable to support" but this may have crossed wires with the review.
- **If rejected:** alternatives are GoCardless, Mollie, Adyen, Revolut Business
- **Stripe payment integration is ON HOLD** until this is resolved

---

## Fidel API — Ready to Build
- **Account active** at dashboard.fidel.uk
- **API Key (test):** `sk_test_<redacted — retrieve from Fidel dashboard>`
- **SDK Key (test):** `pk_test_<redacted — retrieve from Fidel dashboard>`
- **Program ID:** `<redacted>` (Demo Program, Select Transactions)
- **Products:** Select Transactions API (real-time card-linked transaction webhooks) + Transaction Stream (all transactions) + OaaS (brand offer marketplace) available
- **Integration plan:** Supabase Edge Function receives Fidel webhook → inserts `cashback_events` row → existing DB trigger handles matching + crediting. Card enrolment via Fidel React Native SDK (requires Expo dev client, NOT Expo Go).
- **Key Fidel fields:** `cleared` boolean = settlement signal (pending while false, settled when true); `card.metadata.userId` = where to stash Amplifi user ID at enrolment

## Sientia API — Contract Pending
- **Docs:** https://sientia-api-documentation.readme.io/reference/base-url
- **Model:** pull/consent — link_account returns consent URL, transactions fetched via GET (poll, not webhook)
- **Key endpoints:** Get Transactions, Spend Analysis (date range), Missed Cashback (onboarding hook)
- **Settlement signal:** Mark as Paid endpoint
- **Response bodies not documented** — need sandbox access for field mapping. The `raw` jsonb column on cashback_events hedges this.
- **Integration plan:** Supabase Edge Function or scheduled function polls Sientia → inserts cashback_events → same trigger pipeline

## Tillo — Gift Cards
- **Docs:** https://tillo.tech/docs/before-you-begin (robots-blocked, couldn't fetch fully)
- **Model:** buy gift cards wholesale at a discount, sell at face value, margin = cashback to JISA
- **Integration plan:** Supabase Edge Function handles Tillo API calls server-side (API keys stay off client). Stripe handles parent payment. Gift card code/URL delivered in-app.
- **Action needed:** sign up for Tillo sandbox

---

## Architecture: The Provider-Agnostic CLO Spine

### Two separate layers

**Layer 1 — Offer Catalogue ("what's on offer")**
Three sources:
- **Amplifi own merchants** (source='amplifi') — first-party, you sign them, invoice via Stripe. Needs NO external provider.
- **Fidel OaaS** (source='fidel_oaas') — national brand marketplace, Fidel handles relationships, you earn commission.
- **Sientia** (source='sientia') — their cashback offer inventory.

**Layer 2 — Attribution ("did this person actually spend there?")**
Two sources:
- **Sientia open banking** — sees ALL spend across a linked bank account, at any merchant. Broad. Poll model.
- **Fidel Select** — real-time card-linked webhooks at participating merchants. Precise. Push model.

**Matching engine:** any transaction (from either source) × any offer (from any source) → if merchant + window + terms match → cashback_events row → trigger → credit. Already built and working.

### Credit lifecycle
`pending` (transaction detected) → `redeemable` (transaction settled/cleared) → `redeemed` (swept to JISA at launch)
Also: `reversed` (refund detected, credit voided)

This mirrors the referral credit lifecycle exactly.

---

## NEW FEATURE: Family Visibility & Handle System (Not Yet Built)

### Concept
Each user has a unique handle (like @revolut). Family members can find you by handle or receive it in an invite link. They send a LinkedIn-style connection request. The parent approves and sets visibility permissions. A grandparent with multiple grandchildren across different families sees all connected children.

### Three ways to connect
1. **Invite link** — family page URL carries the handle + child ID, auto-sends request on signup
2. **Search by handle** — type a handle in the app, find the account, send request
3. **Verbal share** — parent tells grandparent their handle, grandparent types it in

### Proposed data model

**profiles table addition:**
- `handle` — unique, lowercase, alphanumeric + underscores, e.g. `myhandle`. Set during onboarding or in Settings. Searchable.

**New table: `family_connections`**
- `id` (uuid PK)
- `requester_id` (FK auth.users) — the family member requesting access
- `child_id` (FK children) — which child they want visibility of
- `parent_id` (FK auth.users) — the account holder who approves
- `status` ('pending' | 'approved' | 'revoked')
- `visibility` (jsonb, default `{"own_contributions": true, "pot_total": true, "other_contributors": false, "transactions": false}`)
- `created_at`, `updated_at`

A grandparent with 3 grandchildren = 3 rows, each potentially with different parents and different visibility settings.

### App screens needed
1. **Settings → Handle** — set/change your handle, uniqueness check
2. **Family tab → Pending requests** — parent sees incoming requests, approve/revoke, set visibility per connection
3. **Search by handle** — family member searches, sends request to connect to a specific child
4. **Connected children view** — family member's dashboard showing all children they're connected to, with pot balance (if permitted) and their own contribution total
5. **Push notifications** (future) — notify parent of new connection request

### Default visibility on approval
- Their own contributions: YES
- Total pot size: YES
- Other contributors: NO
- Transaction history: NO

Parent can toggle each per connection.

---

## Projection Formula (Annuity Due)
All projections across the app use:
`FV = PMT × ((1 + r)^n - 1) / r × (1 + r)`
Where r = 0.08/12, n = years × 12

This assumes contribution at the START of each month (annuity due), giving slightly higher values than ordinary annuity.

Reference values at £50/mo:
- 25 years: £47,868
- 65 years: £1,338,000

---

## Key Files Reference

| Area | Key files |
|------|-----------|
| Auth & session | `apps/app/lib/auth.ts`, `apps/app/app/(auth)/` |
| Home screen | `apps/app/app/(tabs)/home.tsx` |
| Family tab | `apps/app/app/(tabs)/family.tsx` |
| Cashback tab | `apps/app/app/(tabs)/offers.tsx` |
| Shop tab | `apps/app/app/(tabs)/shop.tsx` |
| Tab layout | `apps/app/app/(tabs)/_layout.tsx` |
| Referral system | `apps/app/lib/redeemReferralCode.ts`, `apps/app/lib/useReferralCode.ts`, `apps/app/lib/useReferralStats.ts` |
| Cashback hooks | `apps/app/lib/useCashbackOffers.ts`, `apps/app/lib/useCashbackBalance.ts` |
| Gift card hooks | `apps/app/lib/useGiftCardBrands.ts`, `apps/app/lib/useGiftCardPurchase.ts` |
| DB types | `apps/app/lib/database.types.ts` |
| Family landing page | `apps/playground/src/pages/family/FamilyPage.tsx` |
| Birthday/wishlist page | `apps/playground/src/pages/birthday/WishlistPage.tsx` |
| Admin tool | `apps/playground/src/pages/Admin.tsx` |
| Playground router | `apps/playground/src/App.tsx` |
| Production site | `C:\Users\james\Projects\amplifi\letsamplifi\index.html` |
| Privacy policy | `C:\Users\james\Projects\amplifi\letsamplifi\privacy.html` |
| Supabase migrations | `supabase/migrations/` |
| TODO | `TODO.md` (at repo root) |

---

## Test Accounts & Data
- **Test user:** `<redacted>`, user ID `<redacted>`
- **Test child:** child ID `<redacted>`
- **Test merchant:** Waitrose (in merchants table), has a 2% cashback offer (was toggled off then on during testing — there may be duplicate offers, one active one inactive)
- **Family page URL:** `amplifi-plan.netlify.app/family/<redacted>`

---

## Immediate Priorities (Next Session)
1. Fix marketing site deploy (projection numbers not updating)
2. Admin offers list + toggle (prevent duplicate/invisible offers)
3. Family handle + visibility system (scoped above, not yet built)
4. Stripe integration (ON HOLD until account cleared)
5. Run the two older pending migrations
6. Tab bar naming decision
7. Brand/design polish (James to supply visual references)
