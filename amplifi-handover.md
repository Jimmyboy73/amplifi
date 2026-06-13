# Amplifi — Chat 6 Handover
# "Gifting & CLO Build + Handle System + UX Overhaul"

---

## Monorepo & Stack

- **Repo:** `C:\Users\james\Projects\amplifi` — GitHub: `Jimmyboy73/amplifi`
- **Latest commit:** `87fd18e` (security fixes) — clean, pushed to master
- **Metro start:** `cd C:\Users\james\Projects\amplifi\apps\app && npx expo start --clear`
- **Playground dev:** `cd C:\Users\james\Projects\amplifi\apps\playground && npm run dev`

### Apps
- `apps/app` — React Native / Expo SDK 54, Expo Router, tested via Expo Go
- `apps/playground` — Vite 5 / React, deployed to `amplifi-plan.netlify.app`
- `apps/marketing` — Vite / React, deployed to `amplifi-marketing.netlify.app`
- `letsamplifi.com` — standalone HTML, Netlify site `dancing-sable-1635b9`, deployed via drag-and-drop from `C:\Users\james\Projects\amplifi\letsamplifi\`

### Infrastructure
- **Supabase:** project `zmxnhhnlvpdlptsxvliy` (EU London)
- **RLS:** DISABLED on all core tables for development — must re-enable before beta in a dedicated session with carefully written policies
- **Netlify:** auto-deploys from GitHub for playground and marketing; letsamplifi.com is manual drag-and-drop only
- **Netlify SPA fix:** `apps/playground/public/_redirects` now contains `/*    /index.html   200` so direct URLs to `/family/[id]` and `/wishlist/[id]` work
- **Brand:** Midnight `#101628`, Sky `#59C9E9`, Azure `#407BBF`, White `#FFFFFF`, Plus Jakarta Sans
- **Apple Developer Account:** James is in the process of signing up (£79/year) to enable TestFlight builds for real-family testing

---

## Strategic Direction — MVP Focus

### The Only Thing That Matters
The MVP exists to prove ONE loop: **does a parent invite their family, and does that family contribute?**

Everything else is noise until that loop is validated. The test is simple: can one parent get one grandparent to set up a standing order through this app?

### What's In the MVP (4 core flows)
1. **Parent signup** — 5 screens: Email → OTP → Details → Handle → Child → Home
2. **Link ISA** — prompted from home screen Getting Started card, not during onboarding
3. **Invite family** — WhatsApp message → landing page → contributor signs up → gets connected
4. **Birthday/occasion wishlist** — parent creates, shares, family pledges gifts

### What's Explicitly Parked (built but hidden or deprioritised)
- Cashback tab (CLO engine) — hidden from tab bar, teaser card on home screen
- Loyalty tab (gift card shop) — hidden from tab bar, teaser card on home screen
- Open banking / missed cashback — removed from onboarding
- Fidel/Sientia integration — Phase 2
- Payment processing — Stripe on hold (appeal under review)
- Referral codes — fully replaced by handles

### The Tab Bar (3 tabs only)
**Home | My Family | Occasions**

Cashback and Loyalty tabs are hidden via `href: null` in `_layout.tsx`. Screen files are kept — just not visible in the tab bar.

---

## What Was Built This Session (Chat 6)

### 1. Handle System — Replaces Referral Codes
The 5-character referral code system has been fully replaced by user handles (like @revolut).

**Schema change:**
- `profiles` table: added `handle` column (text, unique, case-insensitive index, 3-20 chars, lowercase alphanumeric + underscores)
- Constraint: `chk_handle_format CHECK (handle ~ '^[a-z0-9_]{3,20}$')`
- Unique index: `idx_profiles_handle_unique ON profiles (lower(handle))`

**App changes:**
- Handle is mandatory during onboarding (screen 4 of 5)
- Real-time availability check (debounced 500ms) — green "Available" / red "Handle taken"
- `@` prefix locked in all handle inputs
- `apps/app/lib/useHandle.ts` — fetches, checks availability, saves handle
- `apps/app/lib/redeemReferral.ts` — replaced `redeemReferralCode.ts`, looks up profiles by handle instead of referral_codes table
- `apps/app/lib/useReferralCode.ts` — DELETED (all callers migrated to useHandle)
- Home screen, settings, signup, and share messages all use `@handle` instead of 5-char codes
- Referral validation happens BEFORE auth user creation to prevent orphaned accounts

### 2. Family Connections System
Full LinkedIn-style connection flow for family members.

**Schema:**
```sql
CREATE TABLE family_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id),
  child_id uuid NOT NULL REFERENCES children(id),
  parent_id uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'revoked')),
  relationship text CHECK (relationship IN ('grandparent', 'aunt', 'uncle', 'aunt_uncle', 'friend', 'other')),
  visibility jsonb NOT NULL DEFAULT '{"own_contributions": true, "pot_total": true, "other_contributors": false, "transactions": false}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_family_connections_unique_request ON family_connections (requester_id, child_id);
```

**How connections are created:**
- When someone signs up with a handle, `details.tsx` auto-creates a `family_connections` row (status=pending) linking the new user to the referrer's first child
- Parent sees pending requests on My Family screen with amber "New" badge
- Approval flow: parent picks relationship (Grandparent / Aunt·Uncle / Friend / Other) + selects which children to grant access to (checkboxes, all checked by default)
- One approval creates/updates `family_connections` rows for each selected child
- Decline sets status to 'revoked'

**App files:**
- `apps/app/lib/useFamilyConnections.ts` — fetches connections for a child (approved + pending)
- `apps/app/lib/useContributorConnections.ts` — fetches connections where current user is the requester

### 3. Self-Reported Family Contributions
Contributors log what they've set up in their own banking app.

**Schema:**
```sql
CREATE TABLE family_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES family_connections(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  child_id uuid NOT NULL REFERENCES children(id),
  amount_gbp numeric NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'one_off')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'stopped')),
  started_at timestamptz NOT NULL DEFAULT now(),
  stopped_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**App flow:**
- Contributor sees ISA sort code, account number, and reference with copy buttons
- Instruction: "Set up a standing order in your banking app using these details"
- Amount pills: £10 / £25 / £50 / £100
- "I've set it up" button → logs amount and frequency
- After logging: shows contribution summary with Edit / Stop options

**Hook:** `apps/app/lib/useFamilyContributions.ts` — logContribution, updateContribution, stopContribution

### 4. Parent Onboarding — Shortened to 5 Screens
**Old flow (8 screens):** Email → OTP → Details → Handle → Child → JISA explainer → ISA linking → Open banking → Invite family → Home

**New flow (5 screens):** Email → OTP → Details → Handle → Child → Home

ISA linking, open banking, and invite family are now prompted via the **Getting Started card** on the home screen. The card shows three action rows:
- "Link [child's name]'s ISA" — navigates to ISA linking, returns to home
- "Invite family to contribute" — navigates to My Family tab
- "Create a birthday wishlist" — navigates to Occasions tab
- Card disappears once all three are complete

**Key files changed:** `child.tsx` (navigates to home, not isa-status), `handle.tsx` (progress counter 4/5), `isa-link.tsx` (supports `source=home` for return routing)

### 5. Contributor vs Parent Experience Split
When someone signs up via a handle (contributor), they skip child setup, ISA linking, and all parent-specific onboarding. They go straight to the home screen.

**Contributor home screen shows:**
- If approved connections: hero card "You're part of [child's name]'s team 💙", pot progress placeholder, contribution setup
- If only pending: animated waiting state "Waiting for [parent's name] to approve"
- "Set up your own child's account" upgrade button

**Parent home screen shows:**
- Pot card, projections, child switcher (if multiple children)
- Getting Started card (if incomplete steps)
- "Your team" summary: contributor count + estimated £/month
- Coming soon teasers for Cashback and Loyalty

**Cashback & Loyalty tabs:** show upgrade prompt ("Set up your own account to unlock this feature") for contributors without children.

### 6. My Family Screen — Complete Rebuild
Renamed from "Network" to "My Family". This is the central hub.

**Parent view:**
- Child selector pills (horizontal, appears when multiple children)
- Child card: name, DOB, ISA details (sort code/account/reference), edit/delete
- Add another child (inline form, 3-field DOB: DD/MM/YYYY, auto-advance, validation: no dates >9 months future or >18 years past)
- Family & Contributors: approved members with relationship badges, pending connection requests with approve/decline
- Pending WhatsApp invites (locally tracked in AsyncStorage, shown as "Grandparent invite sent — Pending")
- Invite a family member: relationship picker → Share on WhatsApp

**Contributor view:**
- Connected children with "View details →"
- Pending connections "Waiting for approval"
- "Set up your own child's account" button

**Both views shown simultaneously** if user is parent AND contributor.

**Key hooks:**
- `apps/app/lib/useChildren.ts` — fetches children for current user
- `apps/app/lib/useFamilyConnections.ts` — connections for a specific child
- `apps/app/lib/useContributorConnections.ts` — connections where user is requester

### 7. Child Switcher
- `SelectedChildContext` created in `_layout.tsx`
- Consumed by both `home.tsx` and `family.tsx`
- Selection persists across tab switches
- Pills appear below the pot card on home screen when multiple children exist

### 8. Celebration Modals
Reusable component at `apps/app/components/CelebrationModal.tsx`.

Three moments:
- **Connection approved:** "🎉 [Name] is now part of [child's name]'s team!" + referral credit line if applicable
- **Contribution logged:** "💙 Thank you! You're helping build [child's name]'s future" with annual projection
- **Wishlist created:** "🎁 [Child's name]'s wishlist is ready to share!" with Share Now / Later buttons

### 9. Contributor Progress & Feedback
- **Impact tracker:** "You've contributed approximately £[total] to [child's name]'s pot" (calculated from months × amount)
- **Milestone progress bar:** targets at £100 → £250 → £500 → £1,000 → £2,500 → £5,000 → £10,000
- **Team stats on parent home:** contributor count + estimated £/month from all contributors

### 10. Wishlist Share Page — Rebuilt
**File:** `apps/playground/src/pages/birthday/WishlistPage.tsx`
**Routes:** `/wishlist/:wishlistId` (primary), `/birthday/:id` (legacy alias)

**Page sections:**
- Hero: Midnight gradient, occasion label, child's name, countdown ("12 days to go" / "Today! 🎉")
- Wish cards: emoji + name + amount + "I'll get this 🎁" button → inline name input → pledge saved to `pledges` table (no login required)
- Contribute to pot: amount pills (£10/£25/£50/Other) + ISA details reveal with copy buttons
- Join Amplifi: dark card with signup CTA, handle embedded in URL as `?ref=[handle]`

### 11. Family Landing Page — Rebuilt
**File:** `apps/playground/src/pages/family/FamilyPage.tsx`
**Route:** `/family/:childId?ref=[handle]`

**Page sections:**
- Hero: child's name, "Every contribution makes a difference"
- Team projection calculator: £10/£25/£50 pills, annuity due formula
- How it works: 3 steps (sign up → contribute → watch pot grow)
- CTA: "Join [child's name]'s team"
- ISA details removed (private — only shown after signup and approval)

### 12. WhatsApp Invite Message
Short and warm, no jargon:
```
I've started building a savings pot for [child's name] — would you like to be part of it? 💙

Tap here to see how you can help: [URL with embedded handle]
```

### 13. Occasions Tab
- Gift Registry screen renders directly as the tab content (not a redirect)
- Tab bar stays visible on the Gift Registry
- "Create Wishlist" pushes to a stack screen (with back button, no tab bar)
- Back button uses `router.canGoBack()` check; falls back to `router.replace('/(tabs)/home')`

### 14. Home Screen Changes
- Settings cog icon (replaced user initial)
- Profile Settings accessible from settings menu
- Slider max £200, animation only runs once per session
- Coming soon teasers for Cashback and Loyalty below Getting Started card
- Bell icon removed
- Referral card removed (handle-based invites happen from My Family)
- Sliding pills: My Family, Occasions, Cashback, Loyalty Offers — each links to correct destination

### 15. Security Fixes Applied
- **PII logging removed** — all console.log of emails, names, phones, user IDs stripped from auth screens
- **Admin page gated** — `apps/playground/src/pages/Admin.tsx` requires Supabase session login
- **PostHog key moved to env var** — `apps/playground/src/main.tsx` reads `import.meta.env.VITE_POSTHOG_KEY`
- **Handover doc redacted** — real email, UUIDs removed from `amplifi-handover.md`

### 16. ISA Screen Copy Updates
- ISA recommended over JISA
- JISA warning: "Your child takes full control at 18 — once money is in a JISA, you cannot get it back"
- "I need to open an ISA or JISA" (ISA first everywhere)
- Confirmation box: "We'll send cashback and contributions to account..."
- "Where do I find my reference?" removed if no answer provided
- ISA re-editable from Getting Started card (pre-fills existing values)

---

## Complete Database Schema (as of Chat 6)

### Core Tables
```
profiles
  id (uuid PK, FK auth.users)
  first_name, last_name, email, phone, date_of_birth
  handle (text, unique, 3-20 chars lowercase alphanumeric + underscores)
  pay_monzo, pay_paypal, pay_revolut, pay_bank (booleans)
  created_at

children
  id (uuid PK)
  owner_id (uuid FK auth.users)
  name (text)
  date_of_birth (date)
  photo_url (text)
  created_at

jisa_accounts
  id (uuid PK)
  child_id (uuid FK children)
  sort_code, account_number, reference (text)
  provider (text)
  created_at

family_connections
  id (uuid PK)
  requester_id (uuid FK auth.users)
  child_id (uuid FK children)
  parent_id (uuid FK auth.users)
  status (text: pending/approved/revoked)
  relationship (text: grandparent/aunt/uncle/aunt_uncle/friend/other)
  visibility (jsonb)
  created_at, updated_at

family_contributions
  id (uuid PK)
  connection_id (uuid FK family_connections)
  user_id (uuid FK auth.users)
  child_id (uuid FK children)
  amount_gbp (numeric)
  frequency (text: weekly/monthly/one_off)
  status (text: active/stopped)
  started_at, stopped_at, notes
  created_at, updated_at
```

### Referral Tables
```
referral_codes
  id (uuid PK)
  user_id (uuid FK auth.users)
  code (text, 5 chars) — LEGACY, no longer used by app. Handle replaces this.

referral_events
  id (uuid PK)
  referrer_id (uuid FK auth.users)
  referred_id (uuid FK auth.users)
  created_at

referral_credits
  id (uuid PK)
  user_id (uuid FK auth.users)
  amount_gbp (numeric)
  status (text: pending/redeemable/redeemed/reversed)
  referral_event_id (uuid FK)
  created_at
```

### CLO / Cashback Tables (Phase 2 — built but not in MVP)
```
merchants
  id, name, category, logo_url, contact_email, stripe_customer_id, status

cashback_offers
  id, source (amplifi/fidel_oaas/sientia), merchant_id (FK), provider_offer_id
  reward_type (percentage/fixed), reward_value, active_from, active_to, is_active

linked_accounts
  id, user_id, provider (sientia/fidel), provider_ref, status

cashback_events
  id, user_id, linked_account_id, provider, provider_txn_id
  merchant_id, merchant_name, amount_gbp, currency
  offer_id (set by trigger), cashback_gbp (set by trigger)
  status (pending/settled/reversed), transacted_at, settled_at, raw (jsonb)

cashback_credits
  id, user_id, amount_gbp, source, cashback_event_id
  status (pending/redeemable/redeemed/reversed)

spend_insights
  id, user_id, period_start, period_end, missed_cashback_gbp, detail (jsonb)
```

### Gift Card Tables (Phase 2 — built but not in MVP)
```
gift_card_brands
  id, name, slug, category, logo_url, cashback_percentage
  min_amount_gbp, max_amount_gbp, is_active, tillo_brand_slug

gift_card_orders
  id, user_id, child_id, brand_id, amount_gbp, cashback_gbp
  status (pending/completed/refunded)
  gift_card_code, gift_card_url, tillo_reference
  stripe_payment_intent_id, cashback_event_id
```

### Wishlist / Gifting Tables
```
wishlists
  id (uuid PK)
  owner_id (uuid FK auth.users)
  child_id (uuid FK children)
  occasion (text), occasion_label (text), occasion_date (date)
  closing_date (date), status (text)
  referral_code (text — legacy, may be null)
  payment_method, payment_detail (text)
  total_target, total_pledged, surplus_amount (numeric)
  created_at

wishlist_items
  id (uuid PK)
  wishlist_id (uuid FK wishlists)
  name, emoji (text)
  target_amount (numeric)
  pledged_amount (numeric)
  created_at

pledges
  id (uuid PK)
  wishlist_item_id (uuid FK wishlist_items)
  pledger_name (text)
  amount (numeric)
  created_at
```

### Other Tables (exist but not actively used in MVP)
```
wallets, plans, sweeps, pending_credits
contributions, family_contributors (legacy), family_invites (legacy)
users (legacy — profiles is canonical)
challenges, user_challenge_state, clo_offers, activatable_offers, user_activated_offers
merchant_invoice_ledger, gift_card_purchases
```

### DB Triggers (CLO engine — Phase 2)
- `trg_match_cashback_offer` (BEFORE INSERT on cashback_events) — finds matching offer, computes cashback_gbp
- `trg_create_cashback_credit` (AFTER INSERT on cashback_events) — creates pending credit if cashback_gbp > 0
- `trg_settle_cashback_event` (BEFORE UPDATE on cashback_events) — pending→settled flips credit to redeemable

---

## Key Files Reference

### App — Auth & Onboarding
| File | Purpose |
|------|---------|
| `apps/app/lib/auth.ts` | Auth context, session management |
| `apps/app/app/(auth)/details.tsx` | Signup: name, DOB, phone, referral handle input. Creates auth user + profile. Validates handle BEFORE creating user. Auto-creates family_connections row if handle used. |
| `apps/app/app/(auth)/handle.tsx` | Choose handle screen (onboarding step 4/5). Real-time availability. Contributors skip to home after this. |
| `apps/app/app/(auth)/child.tsx` | Add child screen (onboarding step 5/5). Navigates to /(tabs)/home on completion. |
| `apps/app/app/(auth)/isa-status.tsx` | JISA vs ISA explainer modal. ISA recommended. |
| `apps/app/app/(auth)/isa-link.tsx` | ISA linking form. Supports source=home and source=family for return routing. Pre-fills existing values for re-editing. |
| `apps/app/app/(auth)/invite.tsx` | Invite family onboarding screen (skipped in new flow but file kept) |
| `apps/app/app/_layout.tsx` | Root layout. AuthRedirect: checks onboarding completion (profile + handle + child). SelectedChildContext provider. |

### App — Tab Screens
| File | Purpose |
|------|---------|
| `apps/app/app/(tabs)/_layout.tsx` | Tab bar: Home, My Family, Occasions. Cashback + Loyalty hidden (href: null). |
| `apps/app/app/(tabs)/home.tsx` | Home screen: pot card, child switcher, slider, Getting Started card, coming soon teasers, team stats. Contributor view: connected children, pending states, contribution setup. |
| `apps/app/app/(tabs)/family.tsx` | My Family: child selector, child card, ISA details, add/edit/delete child, family connections, approve/decline, invite via WhatsApp, contributor view. |
| `apps/app/app/(tabs)/occasions.tsx` | Gift Registry screen (rendered directly, not redirected). |
| `apps/app/app/(tabs)/offers.tsx` | Cashback tab (hidden from tab bar). |
| `apps/app/app/(tabs)/shop.tsx` | Loyalty/gift card shop tab (hidden from tab bar). |

### App — Hooks
| File | Purpose |
|------|---------|
| `apps/app/lib/useHandle.ts` | Fetch, check availability, save handle |
| `apps/app/lib/useChildren.ts` | Fetch children for current user |
| `apps/app/lib/useFamilyConnections.ts` | Fetch connections for a specific child |
| `apps/app/lib/useContributorConnections.ts` | Fetch connections where user is requester |
| `apps/app/lib/useFamilyContributions.ts` | Log, update, stop self-reported contributions |
| `apps/app/lib/redeemReferral.ts` | Validate and redeem a handle as referral |
| `apps/app/lib/useReferralStats.ts` | Referral stats (invite count, pending £) — now uses handle |
| `apps/app/lib/useCashbackOffers.ts` | Cashback offers (Phase 2) |
| `apps/app/lib/useCashbackBalance.ts` | Cashback balance (Phase 2) |
| `apps/app/lib/useGiftCardBrands.ts` | Gift card brands (Phase 2) |
| `apps/app/lib/useGiftCardPurchase.ts` | Gift card purchase (Phase 2) |

### App — Other
| File | Purpose |
|------|---------|
| `apps/app/components/CelebrationModal.tsx` | Reusable celebration overlay (animated) |
| `apps/app/app/settings/handle.tsx` | Handle settings screen |
| `apps/app/app/settings/profile.tsx` | Profile settings (name editing only, children moved to My Family) |
| `apps/app/app/settings/referral.tsx` | Referral handle entry (settings) |
| `apps/app/app/connected-child/[connectionId].tsx` | Connected child detail: pot total, projections, ISA details, contribution logging |
| `apps/app/app/birthday/create.tsx` | Create wishlist flow. Add multiple items. Celebration modal on completion. |
| `apps/app/app/birthday/index.tsx` | Gift Registry list. Uses useHandle for share. |
| `apps/app/app/birthday/manage.tsx` | Manage existing wishlist |

### Playground (Web)
| File | Purpose |
|------|---------|
| `apps/playground/src/App.tsx` | Router: /family/:childId, /wishlist/:wishlistId, /birthday/:id, /admin |
| `apps/playground/src/pages/family/FamilyPage.tsx` | Family landing page (public, no auth) |
| `apps/playground/src/pages/birthday/WishlistPage.tsx` | Wishlist share page (public, no auth, pledging without login) |
| `apps/playground/src/pages/Admin.tsx` | Admin tool (auth-gated): merchants, offers, simulate transactions |
| `apps/playground/public/_redirects` | Netlify SPA redirect rule |

### Other
| File | Purpose |
|------|---------|
| `letsamplifi.com` files | `C:\Users\james\Projects\amplifi\letsamplifi\` — drag-and-drop deploy only |
| `supabase/migrations/` | All migration SQL files (applied manually via SQL Editor) |

---

## Tillo Gift Card Strategy — Phase 2 but Informs MVP Marketing

### The Strategic Insight
Tillo is NOT cashback. It's a parental commitment device. Parents deliberately route shopping through Amplifi gift cards. The discount goes to the child's JISA. The friction is intentional — it's the effort a good parent makes.

### The Verified Numbers (from Tillo UK Rate Card, May 2026)
- 338 GBP brands, mean discount 7.4%, median 6.0%
- Realistic family basket: £630/month routed through gift cards → £29.85/month JISA contribution
- 18-year compounding at 7%: £12,857 in the JISA
- Left to age 65: £309,156 → funds 12 years of retirement
- Single transaction example: £80 Tesco shop → £3.20 saving → £260 at age 65

### What This Means for MVP
Tillo can't be live in MVP (needs sandbox access, float capital, Stripe). But the rate card data powers:
1. **The `/plan` calculator** — parent enters monthly spend per retailer, sees personalised retirement impact using real Tillo rates
2. **In-app teasers** — "Your weekly Tesco shop could add £12.80/month to [child's name]'s pot. Coming soon."
3. **Marketing copy** — "Your shopping habit funds 12 years of their financial freedom"

### Key Tillo Brands for Parent Basket
| Retailer | Discount | Online? |
|----------|----------|---------|
| Tesco | 4.0% | In-store only |
| Sainsbury's | 4.0% | Online + in-store |
| M&S | 6.5% | Online + in-store |
| John Lewis | 5.5% | Online + in-store |
| Boots Online | 4.0% | Online only |
| Costa | 10.0% | In-store only |
| H&M | 9.0% | Online + in-store |
| JD Sports | 10.0% | Online + in-store |
| Currys | 7.5% | Online + in-store |
| Buyagift / Virgin Experience | 20.0% | Online only |

### Pre-Build Blockers (for Phase 2)
- CRITICAL: "Requires sign off" flag on Tesco, Sainsbury's, Amazon, John Lewis — confirm with Tillo if one-time approval or per-transaction
- CRITICAL: Confirm Cientia AISP scope covers proactive gift card suggestions
- CRITICAL: PrepaidPass wholesale discount rate
- Float mechanics: minimum size, top-up process

### Marketing Claims (Locked — Do Not Alter Without Re-Verifying)
- **Primary:** "Your shopping habit funds 12 years of their financial freedom."
- **Transaction hook:** "That £100 M&S shop just funded a week of their retirement."
- **Contribution hook:** "Last month you spent £320 at Tesco. Through Amplifi, that could have been £12.80 for [child's name]'s JISA — every month."
- Regulatory: every instance of 7% must be labelled "illustrative". Gift card discount is commerce; investment return is separate.

---

## Security Audit — Status

### Fixed ✓
- C-3: PostHog key moved to env var
- H-1: Admin page auth-gated
- H-2: PII console.logs removed
- H-3: Handover doc redacted

### Still Outstanding
| ID | Severity | Issue | Notes |
|----|----------|-------|-------|
| C-2 | CRITICAL | RLS disabled + GRANT ALL to anon on all tables | Must be done as a dedicated session with proper policies BEFORE beta. Will break the app if done carelessly. |
| H-4 | HIGH | Netlify keepalive function uses VITE_ env vars that don't exist at runtime | Change to SUPABASE_URL / SUPABASE_ANON_KEY, set in Netlify dashboard |
| M-2 | MEDIUM | No security headers on Netlify sites | Add CSP, X-Frame-Options etc to netlify.toml |
| M-4 | MEDIUM | Profiles table has no RLS | Covered by C-2 |
| M-6 | MEDIUM | SECURITY DEFINER function missing SET search_path | Low exploitability |
| L-3 | LOW | Production URL hardcoded throughout app | Should be EXPO_PUBLIC_WEB_BASE_URL |
| L-4 | LOW | .gitignore missing .env.production, *.pem, *.key patterns | Housekeeping |

---

## Projection Formula (Annuity Due)
All projections across the app use:
```
FV = PMT × ((1 + r)^n - 1) / r × (1 + r)
```
Where r = 0.08/12 (for app projections) or 0.07/12 (for Tillo marketing claims), n = years × 12.

Reference values at £50/mo, 8% p.a.:
- 25 years: £47,868
- 65 years: £1,338,000

---

## External Services Status

| Service | Status | Notes |
|---------|--------|-------|
| Supabase | Active | EU London, free tier, keepalive function pings every 4 days |
| Netlify | Active | Auto-deploys for playground + marketing. letsamplifi.com is drag-and-drop. |
| Stripe | ON HOLD | Appeal under review for ToS violation (investment language). Alternatives: GoCardless, Mollie, Adyen, Revolut Business |
| Fidel API | Ready | Test keys active. Integration deferred to Phase 2. |
| Sientia | Pending | Contract not signed. Needed for Open Banking AISP. |
| Tillo | Ready | Rate card obtained. Sandbox access not yet requested. Phase 2. |
| PostHog | Active | EU region. Key in env var. |
| Resend | Not built | Email delivery planned but not started |
| Apple Developer | In progress | James signing up. Needed for TestFlight builds. |

---

## Immediate Priorities (Next Session)

### Tier 1 — Polish the 4 core flows
1. Full end-to-end test of parent signup (delete all data, fresh start)
2. Test contributor signup via handle → approval → contribution logging
3. Test wishlist creation → share → pledge on web page
4. Fix any bugs found during testing

### Tier 2 — Tillo-powered marketing
5. Seed real Tillo rate card into gift_card_brands table (replacing demo data)
6. Build `/plan` calculator on playground — parent enters spend per retailer, sees personalised impact
7. Enrich coming soon teasers with real retailer data ("Your Tesco shop could add £12.80/month")

### Tier 3 — Pre-beta
8. Apple Developer account → TestFlight build for real-family testing
9. RLS enablement session (dedicated, careful, with proper policies)
10. Fix Netlify keepalive env vars (H-4)
11. Add security headers to netlify.toml (M-2)

### The Test Plan
- **Week 1:** James tests with own family (real child, real ISA, invite parents)
- **Week 2:** 3-5 more families. Measure: what % of invited family members sign up and contribute?
- **Success metric:** >30% of invited family members set up a standing order

---

## Key Principles (Learned Across Sessions)

- **Data model before app code** — schema correctness is the top priority
- **MVP discipline** — 4 core flows only; everything else is Phase 2
- **Production site is sacred** — letsamplifi.com is drag-and-drop only, never auto-deployed
- **Handles replace referral codes** — handles are the universal identifier for sharing and connecting
- **Self-reported contributions for MVP** — avoids payment processing complexity
- **The friction is the point** — for Tillo: intentional behaviour shift, not passive cashback
- **Test with real families** — the only metric that matters is: does a grandparent set up a standing order?
- **Batched Claude Code prompts** — comprehensive single prompts covering multiple related changes
- **Verify before commit** — test in Expo Go, note issues, batch fixes
- **Concise responses preferred** — short, clear, structured output
