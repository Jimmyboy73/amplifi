# Amplifi — Family Pledge & Invite
## Build specification for Claude Code / Fable

**Version 1.0 · Owner: James Shattock · Pre-launch, pre-FCA-authorisation**
**Extends the existing Amplifi MVP (React · TypeScript · Supabase). Do NOT scaffold a new app.**

---

> ## ⚠️ TWO ITEMS REQUIRE JAMES BEFORE SHIP — DO NOT AUTO-FILL
> 1. **The JISA provider list and its screen copy (Screen P4).** Placeholder only in this spec. James confirms the providers and approves the exact wording before this screen goes live.
> 2. **A QA pass on the full live flow with a test pledge before any real family uses it.** A lost or mis-delivered pledge message is a trust failure on the product's core emotional moment.

---

## 0. How to use this document

This is a complete, self-contained build spec. It assumes you are **extending the existing Amplifi MVP** — the Vite + React + TypeScript + Supabase project already deployed at `app.letsamplifi.com` via the GitHub-connected Netlify site. **Do not scaffold a new app. Reuse the existing auth, email (Resend / Supabase SMTP), design tokens, and component library.**

Sections 1–3 are context and rules. Section 4 is the data model. Sections 5–7 are the screen-by-screen flows (the build itself). Section 8 covers email/share templates, Section 9 states and edge cases, Section 10 the compliance guardrails — **read Section 10 before writing any user-facing copy.**

**Before writing any code:** explore the existing app (auth flow, Supabase schema, email setup, design tokens) and produce a plan for how you will extend it. Surface any conflict between this spec and what already exists (table names, existing user/profile structure, auth pattern) and get James's approval on the plan before building.

---

## 1. What we're building

A two-sided family flow that lets any family member start a regular-contribution **pledge** for a child, and hands the one regulated step — opening the child's Junior ISA — to the child's parent. Amplifi coordinates everything around the account; **it never opens the account, holds money, or moves money.**

### The core insight this encodes
Only a person with parental responsibility can open a Junior ISA. A grandparent (or any other gifter) cannot. So the grandparent does everything *except* the account itself — sets the pledge, writes the message, prepares their own standing order — and sends it to the parent, who completes the single act only they can perform. The apathetic parent is converted from decision-maker to recipient of a gift already in motion.

### Two journeys, one family graph
- **Parent journey:** opens/anchors the child's account, can invite family outward to contribute.
- **Family member (grandparent) journey:** lightweight — starts a pledge for a child and sends it to the parent, auto-linking to the child once the parent completes setup.

Both journeys converge on the same **child** record and the same family graph, so a child accumulates one account and many linked contributors.

---

## 2. Scope

### In scope
- An entry fork: "I'm a parent" vs "I'm a grandparent or family member."
- Lightweight pledge creation for family members (no full account required to start).
- Share of the pledge/invite by **WhatsApp and by email**.
- Parent-side receipt of a pledge, neutral provider signpost, and account confirmation.
- Automatic linking of the family member to the child once the parent confirms the account.
- Amplifi-generated contribution instructions (sort code / reference style payload) shown on screen — **display only**.
- Outward invites: a parent can generate invite links to send to family members.

### Explicitly OUT of scope (do not build)
- **Any JISA account opening inside Amplifi.** The account is always opened on the provider's own site.
- **Any movement, holding, or initiation of money.** Amplifi displays instructions; the user sets up the standing order in their own banking app.
- **Any pre-filling or submission of a provider's application.** We link out only.
- Investment projections, recommendations, or provider ranking (see Section 10).

---

## 3. Design & product principles
- **Lightweight for the family member:** the fewest possible steps from "start a pledge" to "sent." Do not force account creation before value is delivered.
- **The emotional payload is sacred:** the personal message, the child's name, the sense of "I started something." Never lose a pledge silently; always confirm delivery.
- **The parent decides nothing except the account:** the pledge arrives pre-built; the parent's only real task is the account.
- **Amplifi is the coordination layer, not the pipe:** it owns the family graph, the reminders, the instructions — not the money.
- **Reuse existing look and tokens:** Midnight `#101628`, Azure `#407BBF`, Sky `#59C9E9`, Slate `#6B7FA3`, coral `#D9503A` for cost/loss only, amber `#E0A53A` for warm accents; Plus Jakarta Sans.

---

## 4. Data model (Supabase / Postgres)

Design against existing conventions (UUID PKs, `created_at` timestamps, RLS enabled, EU London project). New tables below; **reconcile names with what already exists** (e.g. if a `profiles` or `users` table exists, hang foreign keys off it rather than duplicating).

### 4.1 New tables

#### `children`
| Column | Notes |
|---|---|
| `id` | uuid PK |
| `display_name` | child's first name or nickname (free text; no full legal identity required at pledge stage) |
| `approx_age_months` | nullable int — grandparent may only know rough age |
| `parent_user_id` | nullable uuid FK → user; null until a parent claims/creates the child |
| `account_status` | enum: `no_account`, `account_open` — set to `account_open` only when parent confirms |
| `provider_name` | nullable text — set by parent on confirmation (from the neutral list) |
| `contribution_reference` | nullable text — the reference other gifters must use; entered by parent |
| `created_by_user_id` | uuid FK → user who first created the child record (parent or family member) |
| `created_at` | timestamptz |

#### `pledges`
| Column | Notes |
|---|---|
| `id` | uuid PK |
| `child_id` | uuid FK → children |
| `pledger_user_id` | uuid FK → user (the family member / grandparent) |
| `amount_pennies` | int — store money as integer pennies, never floats |
| `frequency` | enum: `weekly`, `monthly`, `one_off` |
| `start_trigger` | enum: `now`, `next_birthday`, `on_account_open`, `custom_date` |
| `custom_start_date` | nullable date |
| `personal_message` | text — the emotional payload; preserve exactly, allow line breaks, emoji |
| `status` | enum: `draft`, `sent`, `linked`, `active_instructions_shown`, `cancelled` |
| `created_at` / `sent_at` | timestamptz |

#### `family_invites`
| Column | Notes |
|---|---|
| `id` | uuid PK |
| `token` | text unique — unguessable (e.g. 22+ char nanoid); used in the share link |
| `direction` | enum: `pledge_to_parent` (grandparent → parent), `invite_to_family` (parent → family) |
| `child_id` | uuid FK → children |
| `pledge_id` | nullable uuid FK → pledges (set when direction = `pledge_to_parent`) |
| `created_by_user_id` | uuid FK → user |
| `channel` | enum: `whatsapp`, `email`, `copy_link` |
| `recipient_email` | nullable text (email channel only) |
| `status` | enum: `pending`, `opened`, `accepted`, `expired` |
| `expires_at` | timestamptz — default +30 days |
| `created_at` / `accepted_at` | timestamptz |

#### `family_links`
Join table making the graph explicit and queryable so a child screen can list every contributor.

| Column | Notes |
|---|---|
| `id` | uuid PK |
| `child_id` | uuid FK → children |
| `user_id` | uuid FK → user |
| `relationship` | enum: `parent`, `grandparent`, `other_family`, `friend` |
| `role` | enum: `owner` (parent), `contributor` |
| `created_at` | timestamptz |

### 4.2 Lightweight family-member accounts
A family member starts a pledge **without a full account**. On "Send," create a minimal user via the existing auth (email + magic-link / OTP as already implemented) so the pledge has an owner and they can return to see its status. Do not force a password step up-front; reuse the passwordless path already in the app if present. Auto-link them into `family_links` with the relationship they selected and role = `contributor`.

### 4.3 RLS
- A user can read/write their own pledges and the children they created.
- A parent (`parent_user_id`) can read pledges attached to their child and the contributor list.
- Invite tokens are readable unauthenticated **ONLY** via a security-definer RPC that returns the minimum needed to render the accept screen (child display name, pledge summary, sender first name) — never raw table access.

---

## 5. Entry fork

### Screen E1 — "Who are you here as?"
Shown to a new user entering the pledge/invite flow (from marketing, from an ad, or from the app nav). Two large choices:
- **"I'm a parent"** → Parent flow (Section 6).
- **"I'm a grandparent or family member"** → Family-member flow (Section 7).

Copy under the heading (approved): *"Families build wealth together. Tell us where you fit and we'll do the rest."*

A user arriving via an invite link (with a `token`) **skips E1** and lands directly on the relevant accept screen (P-ACCEPT or F-ACCEPT).

---

## 6. Parent flow

Two entry conditions: (a) **cold** — parent starts fresh; (b) **invited** — parent arrives from a grandparent's pledge link. Handle both.

### 6.1 Screens

#### P1 — Add your child
- Inputs: child display name (required); approximate age or DOB (optional).
- Creates a `children` row (`account_status = no_account`, `parent_user_id = this user`).

#### P-ACCEPT — "Someone has started something for [child]" (invited parents only)
- Rendered from the invite token via the security-definer RPC.
- Shows: sender's first name, the pledge (amount + frequency), and the personal message, prominently.
- Copy: *"[Grandma] wants to start [£10 a week] for [Olivia]. Here's the one thing only you can do."*
- On continue: link/create the parent's account, attach to the existing `child_id` from the token, set `parent_user_id`.

#### P4 — "Olivia will need a Junior ISA" (PROVIDER SIGNPOST — James to approve)
> **PLACEHOLDER — James confirms providers & copy before ship**
> - Neutral, factual list of 2–3 providers. Placeholder entries: Moneybox · Hargreaves Lansdown · Nutmeg.
> - Each entry: provider name, headline fee, minimum contribution — factual only.
> - **NO** ranking, **NO** "recommended," **NO** "best," no editorial steering. Alphabetical or user-shuffled order.
> - Each row links OUT to the provider's own site in a new tab. Amplifi collects nothing here.
> - Screen copy (draft, for James): *"To receive contributions, Olivia needs a Junior ISA. Only a parent or guardian can open one. These providers offer them — opening takes about five minutes on their site."*

#### P5 — Confirm the account
- Parent returns after opening the account elsewhere.
- Inputs: which provider (from the list), and the contribution reference the provider gave them for third-party payments.
- Sets `children.account_status = account_open`, `provider_name`, `contribution_reference`.
- **This is the trigger event:** auto-link any pending pledges for this child (status `draft`/`sent` → `linked`), and notify each pledger that they can now start their standing order.

#### P6 — Invite the family (outward)
- Parent can generate invite links (`direction = invite_to_family`) to send to grandparents/others via WhatsApp or email.
- Makes the graph bidirectional so "target both" works: parents recruit gifters, gifters recruit parents.

---

## 7. Family-member (grandparent) flow

Deliberately the lightest path in the app. Goal: from landing to "pledge sent" in under two minutes, no account friction up front.

#### F1 — Who is this for?
- Inputs: child display name; approximate age (optional); relationship (grandparent / other family / friend).
- If arriving from a parent's outward invite (token), child is pre-filled and F1 is confirmation only.

#### F2 — Set the pledge
- Amount; frequency (weekly / monthly / one-off); start trigger (now / next birthday / when the account opens / custom date).
- Show a gentle illustrative line **only if** a figure is displayed — see Section 10. **Prefer showing the contribution, not a projected outcome.**

#### F3 — Add a message
- Free-text personal message. This is the emotional core — give it room, preserve formatting, allow emoji. Placeholder: *"Something to build on. With love, Grandma."*

#### F4 — Prepare your own standing order (optional, display-only)
- Amplifi shows how to set up a standing order in the grandparent's OWN banking app once the account exists. **It does not create, hold, or initiate any payment.**
- Because there is no account/reference yet, this is framed as "ready to activate" — the actual sort-code + reference payload is delivered to them only **after** the parent confirms the account (see P5 trigger).

#### F5 — Send to the parent
- Choose channel: **WhatsApp or email** (both required).
- On send: create the lightweight account (4.2), persist the pledge (`status = sent`), create a `family_invite` (`direction = pledge_to_parent`, token, channel), and dispatch.
- WhatsApp: open `wa.me` with a pre-filled message containing the invite link (**no personal data in the URL** beyond the opaque token — see Section 10).
- Email: send via existing Resend integration using the template in 8.2.

#### F-STATUS — "Your pledge is on its way"
- Confirmation screen + a returnable status view: `sent` → `opened` → `linked` → `instructions ready`.
- When the parent confirms the account, this flips to "Olivia's account is open — here's how to start your £10 a week" with the display-only instructions.

---

## 8. Share & email templates

All copy below is drafted to stay within the compliance guardrails (Section 10): no outcome projections, no product recommendation, illustrative-only if any figure appears. Keep these as the shipped defaults.

**8.1 WhatsApp pre-fill (grandparent → parent)**
*"I've started something for [Olivia] on Amplifi — a little every week towards her future. There's one quick bit only you can do. Have a look: [link]"*

**8.2 Email (grandparent → parent)**
- Subject: *"I've started something for [Olivia]"*
- Body: sender's first name, the pledge summary, the personal message, and a single clear button: "See what's waiting." No figures beyond the contribution amount; no projected value.

**8.3 Notification (to grandparent, on account open)**
*"[Olivia]'s account is open. You can start your [£10 a week] whenever you like — here's exactly how."* Followed by the display-only standing-order instructions.

**8.4 Outward invite (parent → family)**
*"[James] has set up a way for the family to build [Olivia]'s future together. If you'd like to add a little, it starts here: [link]"*

---

## 9. States & edge cases

| Case | Behaviour |
|---|---|
| Parent never acts on a pledge | Pledge stays `sent`. Remind at 3 and 10 days, then stop. Grandparent's F-STATUS shows "waiting on parent." Never auto-cancel. |
| Invite link expires (30 days) | Accept screen shows a friendly "this link has expired" with a "request a fresh link" action that pings the sender. |
| Two grandparents pledge for the same child | Both attach to the same `child_id` once the parent confirms. Child screen lists all contributors. |
| Parent opens account before any pledge | Fine — `account_open` with no pledges; outward invites (P6) drive contributions in. |
| Grandparent doesn't know exact age/DOB | `approx_age_months` is optional; never block the pledge on it. |
| Parent picks a provider not on the list | Allow "Other" free-text in P5; still capture `provider_name` + reference. |
| Duplicate child (grandparent + parent both create) | On parent confirm via token, merge into the token's `child_id`; do not create a second child. |
| Money question from user | Never answer with advice. Link to neutral info; restate Amplifi doesn't hold or move money. |

---

## 10. Compliance guardrails — do not cross

**Amplifi is pre-launch and not yet FCA-authorised. The entire flow is designed to stay outside regulated activity. Builders must not add anything that crosses these lines, even if it seems helpful. If a feature seems to require crossing one, stop and flag to James.**

### Hard rules
1. **No account opening in-app.** The JISA is always opened on the provider's own website. Amplifi links out only; it must not pre-fill, embed, or submit any provider application.
2. **No money movement.** Amplifi never holds, initiates, or processes payments. Standing-order details are displayed for the user to enter in their own banking app.
3. **No advice, no recommendation, no ranking.** The provider list is neutral and factual. No "best," "recommended," "top," no ordering by preference, no steering.
4. **No outcome projections in user-facing copy or ads.** Show the contribution ("£10 a week"), not a promised result. If any projected figure ever appears, it must say "could grow to around …" and carry **"Illustrative, not guaranteed. Capital at risk."** immediately adjacent — never only in a footer.
5. **No "becomes / will be / guaranteed" language anywhere.** Conditional framing only.
6. **Provider screen (P4) copy ships only after James approves it.** Leave the placeholder until then.

### Privacy rules
- Never put a child's name or any personal data in a share URL. The only thing in the link is the opaque invite token; the accept screen fetches display data server-side via the security-definer RPC.
- Invite tokens must be unguessable and expiring (30 days).
- Collect the minimum: a pledge needs a child's first name and an amount, nothing more.

### Standing disclaimer (footer of every screen in this flow)
*"Amplifi is pre-launch and not yet authorised or regulated by the FCA. Nothing here is financial advice or an invitation to invest. Amplifi does not open accounts or hold or move money. Investments can fall as well as rise."*

---

## 11. Definition of done
- [ ] Entry fork (E1) routes correctly, and token links bypass it to the right accept screen.
- [ ] A family member can create a pledge and send it by **WhatsApp AND email** in under two minutes without a full account up front.
- [ ] A parent can receive a pledge, be signposted out to a provider, confirm the account, and see the pledge auto-link.
- [ ] On account confirmation, every pledger is notified and shown display-only contribution instructions.
- [ ] A parent can send outward invites to family.
- [ ] All new tables have RLS; invite data is exposed only via the security-definer RPC.
- [ ] No screen opens an account, moves money, projects an outcome, or ranks providers.
- [ ] P4 provider list is still a clearly-marked placeholder awaiting James's approval.
- [ ] Every flow screen carries the standing disclaimer; no "becomes/guaranteed" language anywhere.
- [ ] A test pledge has been run end-to-end and reviewed by James before real families use it.
