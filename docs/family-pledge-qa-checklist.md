# Family Pledge & Invite — End-to-End QA Checklist

**Gate 3.** Run this whole pass before any real family uses the flow. Tick each box; note anything that fails with the screen + what you saw. A lost or mis-delivered pledge is a trust failure on the product's core moment.

Use two browsers (or one normal + one incognito) so you can be the **grandparent** (not signed in) and the **parent** (signed in) at the same time. Have **two email addresses** you control for the email tests.

---

## 0. Pre-flight (must all be true before starting)

- [ ] `apps/web` running: `cd apps/web && npm run dev` → http://localhost:5173
- [ ] `.env` has `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- [ ] All four migrations applied in the SQL Editor:
  - [ ] `20260705120000_family_pledge_invite.sql`
  - [ ] `20260705130000_pledge_accept.sql`
  - [ ] `20260705140000_account_open_trigger.sql`
  - [ ] `20260705150000_outward_invites.sql`
- [ ] Edge Function `send-pledge-email` shows **deployed** in the dashboard
- [ ] Start every walk-through at **`/start`** (hitting `/` redirects to `/login`)

---

## 1. Core loop — grandparent → parent → account open (cold path)

**As the grandparent (browser A, not signed in):**
- [ ] `/start` → shows E1 with two choices → tap **"I'm a grandparent or family member"**
- [ ] **F1** — enter child first name, leave age blank, pick a relationship → Continue
- [ ] **F2** — pick an amount + frequency + a start trigger → the summary line reads the **contribution** ("£10 a week for [child]"), **not** a projected total → Continue
- [ ] **F3** — type a message with a line break + an emoji → Continue
- [ ] **F4** — "ready to activate" copy, no account/reference shown yet → Continue
- [ ] **F5** — enter your name + an email → tap **Copy link to share** (fastest for testing)
- [ ] Lands on **F-STATUS** "Your pledge is on its way" — message preserved (line break + emoji intact), timeline at **Sent**
- [ ] Copy the `/i/<token>` link (from the copied link / address bar)

**As the parent (browser B, incognito, not signed in):**
- [ ] Open the `/i/<token>` link → redirects to **P-ACCEPT** (`/i/<token>/accept`)
- [ ] Shows sender first name, the contribution, and the message
- [ ] Complete signup (email + password + 6-digit code + name) with a **second** email
- [ ] Lands on **P4** `/provider/<childId>` — amber "PLACEHOLDER — pending approval" banner, `Provider A/B/C` stubs
- [ ] Tap **"I've opened the account"** → **P5** `/confirm/<childId>`
- [ ] Enter provider (free text), sort code, 8-digit account number, a reference → **Confirm account** → lands on `/home`

**Back as the grandparent (browser A):**
- [ ] Refresh the F-STATUS tab → flips to **"[child]'s account is open"** with provider, sort code, account number, reference — all **copy-only**, and "Amplifi never holds or moves your money" present
- [ ] Each **Copy** button copies the right value

**DB spot-check (SQL Editor):**
```sql
select account_status from children where id = '<childId>';                 -- account_open
select status from family_pledges where child_id = '<childId>';             -- linked
```

---

## 2. Emails (§8.2 / §8.3 / §8.4)

> Links inside emails point to `https://app.letsamplifi.com` (the `APP_URL` constant) — expected, not a bug.

- [ ] **§8.2 grandparent → parent.** Redo a grandparent pledge, at F5 choose **Send by email** → enter an inbox you control → the parent inbox receives *"I've started something for [child]"* with the message + a "See what's waiting" button. Disclaimer in the footer.
- [ ] **§8.3 account open.** After a parent **Confirm account** (step 1), the **pledger's** email receives *"[child]'s account is open"* with the pay-in details (sort code / account / reference) + link. Disclaimer present.
- [ ] **§8.4 parent → family.** Parent `/home` → **"Invite family to build [child]'s pot"** → **Share by email** → recipient inbox receives *"Help build [child]'s future"* with an "Add a little" button.
- [ ] If any email doesn't arrive in ~1 min: check **Edge Functions → send-pledge-email → Logs** and the Resend dashboard for a bounce.

---

## 3. Outward invite path (P6 → F-ACCEPT)

**As the parent (signed in):**
- [ ] `/home` → **"Invite family to build [child]'s pot"** → **Copy link** → gives `/i/<token2>`

**As a family member (incognito, not signed in):**
- [ ] Open `/i/<token2>` → **F-ACCEPT** "Join [child]'s family pot" → **Start a pledge**
- [ ] `/i/<token2>/pledge` — F1 is **relationship only** (child name is fixed, no name/age fields)
- [ ] Complete amount → message → your name/email → **Add my pledge** → lands on a status page
- [ ] **DB:** the new pledge points at the **same** `child_id` (no duplicate child):
```sql
select child_id, pledger_name, status from family_pledges order by created_at desc limit 3;
```

---

## 4. §9 edge cases

**Two grandparents, same child** (use one outward-invite link, per §9):
- [ ] From the same `/i/<token2>` link, run a **second** family member's pledge (different name/email)
- [ ] Both pledges share the same `child_id`:
```sql
select count(*), child_id from family_pledges where child_id = '<childId>' group by child_id;  -- >= 2
```
- [ ] Parent `/home` roster: contributors who **signed up** appear; note that **soft-record** pledgers (no account) don't appear in the roster yet — *expected* (they still get their pay-in + email). Confirm this matches the flagged behaviour.

**Expired link** (force-expire, then view):
```sql
update family_pledge_invites set expires_at = now() - interval '1 day' where token = '<token>';
```
- [ ] Open `/i/<token>` → friendly **"This link has expired"** (not a crash / blank)
- [ ] An expired **outward** link at `/i/<token>/pledge` → **"This invite isn't valid"** card

**Already-open account** (account confirmed *before* the pledge):
- [ ] With a child already `account_open`, run a **new** outward-invite pledge for that child
- [ ] The pledger's status page shows the **pay-in details immediately** (pledge lands `linked`, no waiting state)
- [ ] Note: no proactive §8.3 email fires for a pledge added *after* confirmation (that email triggers at confirm time) — details are still on the status page. Confirm this matches expectation.

**Reminders (not yet built):**
- [ ] Confirm there is **no** 3-day / 10-day reminder yet (§9 row 1) — logged as future work, not a bug for this pass.

---

## 5. Compliance sweep (§10)

**Standing FCA disclaimer present on every flow screen:**
- [ ] `/start` (E1)
- [ ] `/pledge` — all of F1–F5
- [ ] `/pledge/status/<token>` (F-STATUS) — both pre-open and account-open states
- [ ] `/i/<token>` (landing) and `/i/<token>/accept` (P-ACCEPT)
- [ ] `/i/<token>/pledge` (F-ACCEPT)
- [ ] `/provider/<childId>` (P4) and `/confirm/<childId>` (P5)
- [ ] `/invite-family/<childId>` (P6)
- [ ] Each of the 3 emails carries the disclaimer in the footer

**Language:**
- [ ] No **"becomes" / "will be" / "guaranteed"** anywhere in the flow (screens or emails) — conditional framing only
- [ ] No projected outcomes / "could grow to" figures shown — contribution only

**Provider screen:**
- [ ] **P4 is still a clearly-marked placeholder** — banner present, `Provider A/B/C` stubs, no real providers, no links, no final copy. (Ships only after separate copy approval — Gate 2.)

---

## 6. Sign-off

- [ ] Full loop works: grandparent pledge → parent accept → account confirm → pay-in details surface
- [ ] All 3 emails delivered to real inboxes
- [ ] All §9 edge cases behave as noted
- [ ] Compliance sweep clean
- [ ] Any failures logged with screen + observed behaviour

**QA passed by: ________________  Date: __________**

*Reminder — two gates still stand separately from this pass: P4 provider copy approval (Gate 2), and this end-to-end pass itself (Gate 3) before real families.*
