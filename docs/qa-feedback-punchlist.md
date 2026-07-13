# Amplifi — QA-pass feedback punch-list

James's feedback from the launch QA walkthrough, grouped by type. This is the "polish before
launch" list. (Earlier code-audit items live in `flow-audit-punchlist.md`.)

Legend: 🟢 quick · 🟠 real fix · 🔵 design pass · 🌟 bigger feature · ✉️ email · 🔴 test.

---

## 🟢 Quick wins (copy / small UI)
- [x] **Centre "shaded square"** — ✅ removed the square tap/hover background behind the ring centre.
- [x] **Reference field forced to CAPS** — ✅ removed `.toUpperCase()` in LinkIsa + ConfirmAccount; keeps exactly what's typed.
- [x] **Default pledge message** — ✅ now "A little something for your future — with love x" (grandparent variant "…with all our love x"); gift page placeholder matched. Alternates offered to James.
- [x] **"Invite sent — we've emailed them a link"** — ✅ now only shows on a real send; on failure it says so and offers the copy-link fallback (`sendPledgeEmail` now returns success).
- [x] **£100k mission box feels redundant** after adjusting targets — ✅ dropped the duplicated projection figure (it lives in the ring centre); box now = goal + encouraging progress line + gentle "Adjust targets".

## 🟠 Real fixes (logic / flow)
- [x] **Settings menu (top-right gear icon)** — ✅ home header gear opens a menu: Edit ISA / pay-in details (→ Link ISA, pre-filled), Send feedback, Sign out. (On Home; could mirror to other tabs.)
- [x] **Pledge flow should be account-aware** — ✅ invite lookup now returns `account_open`; when the ISA's already linked the flow says "already open — you can start straight away" and the status page shows pay-in. Plumbing confirmed via the Phase 1 self-heal (a pledge after account-open links + shows).
- [x] **Grandparent status page is a dead end** — ✅ account-open view now has an "I've set up my standing order" confirm + a "keep this link, come back any time" note.

## 🔵 Mission framing (a focused design pass)
- [x] **£100k by 25 = THE universal default mission** — ✅ box copy now "Every family starts here: {child} reaching £100,000 by 25. A shared goal, not a promise — shape it to fit your family," and progress reads as encouragement at every level (never a shortfall). *Design judgment call — for James to react to in testing.*
- [x] **New-parent disconnect** — ✅ the projected figure now lives only in the ring centre; the box owns the goal + progress + the adjust lever, so they read as one story rather than two competing numbers.

## 🌟 Bigger feature — scope on its own (STRATEGIC / growth)
- [x] **Grandparent home / "follow the child."** — ✅ built. After pledging, the status page offers a free account (`/follow/:token`); on signup we link their pledges (`claim_pledges_for_user`, token-direct + email match) and land them on `/following` — a **focused follow-card** per grandchild (illustrative trajectory + progress to £100k, their own contribution, pay-in details when open), plus the growth CTA **"Start something for another grandchild"** into the cold pledge flow. Reads are gated to their own linked pledges (`get_followed_children`). Root routes followers to `/following`. Needs migration `20260712190000_grandparent_follow.sql`.

## ✉️ Email (operational + missing)
- [ ] **Outward family-invite email not arriving** (WhatsApp share works). Code verified correct end-to-end → it's operational: check Gmail **Promotions/Spam**, and the **Supabase Edge Function logs** for `send-pledge-email` (they'll show the exact cause). Confirm the function is deployed with current code + `RESEND_API_KEY` is set.
- [ ] **No thank-you email to the grandparent** after they pledge — only the parent is emailed. Add a warm grandparent confirmation email.
- [ ] **Deliverability** — emails landing in Promotions/Spam is a known tuning task (SPF/DKIM/domain warmup, content).

## 🔴 Outstanding critical test
- [ ] **Account-open loop, end to end** (needs two inboxes): parent invites grandparent → grandparent pledges → parent accepts → parent links ISA → grandparent's status flips to "account open" **and the pay-in email arrives**. The single most important thing to confirm before launch.

---

## Additional findings — QA walkthrough (11 Jul)

- [x] **Emails DO send and deliver** — the earlier "no emails" scare was Gmail putting them in **Promotions**, not a broken pipeline (Resend shows "delivered"). So the email work is *deliverability tuning + missing messages*, not repair. Email to-dos:
  - [ ] Steer the family/invite emails out of **Promotions** into Primary (DKIM/DMARC alignment + less promotional styling). *(deliverability tuning — partly outside code)*
  - [x] **Grandparent thank-you email** after they pledge — ✅ `pledge_thankyou` kind, fires on cold + invited pledges (account-aware copy).
  - [x] **Notify the parent** when an *invited* pledge lands — ✅ `pledge_landed` kind emails the child's owner.
  - [x] **Occasion gift emails** — ✅ `occasion_gift` kind thanks the gifter (with pay-in details when open) + tells the parent.
- [x] **Deep links 404 in production** — `apps/web` was missing the Netlify SPA redirect. **Fixed:** added `public/_redirects` (`/* → /index.html 200`). Takes effect on next **deploy**. (Until deployed, test email links locally — same DB — via `localhost:5173/i/<token>`.)
- [x] **CONFIRMED: a pledge made *after* the account is already open never links** → parent home showed £0. ✅ Fixed by migration `20260712160000_pledge_link_reconcile.sql`: (a) one-off backfill links any stuck 'sent'/'draft' pledge whose child's account is open; (b) `get_child_pledges` self-heals on every parent read, so this can never silently recur. **James must apply this migration in the Supabase SQL Editor.**
- [x] **Home Occasions panel** — ✅ Birthday/Christmas buttons now open the Occasions tab with the create modal pre-set to that type.
- [x] **Gift thank-you page** — ✅ added an "I've made the gift" confirm that resolves the dead-end (client-side closure).
- [ ] **P4 provider screen still untested** — setting up the ISA directly skips it; it only appears on the invited-parent path (accept → /provider → confirm). Walk that path (or use the direct URL) to check it.

---

## Test-run feedback — round 2 (12 Jul, after Phases 1–5)

- [x] **Record of who you've invited** — ✅ InviteFamily now takes an optional "who are you inviting" name; `get_child_invites` + a new "Invited — waiting to hear back" section in My Family shows each sent invite with status (Waiting / Opened; accepted ones appear as pledges). Migration `20260713110000_invite_record.sql`.
- [x] **Occasion gifters can follow the child** — ✅ `occasion_gifts.gifter_user_id` + claim/`get_followed_children` extended to gifts; Follow CTA added to the gift thank-you page (`/follow/gift/:giftId`). Migration `20260713100000_occasion_follow.sql`.
- [x] **Create-moment modal Cancel** — ✅ added a Cancel button under Create moment.
- [x] **Phase 3 parent-notify confirmed working** — "Grandparent2 added a pledge for Child Test2" reached `+parenttest2`, so the `auth.users` parent-email read is fine (the flagged risk is clear).
- [ ] **"Start for another grandchild" reuses the anon cold flow → wrong for a signed-in grandparent.** It asks for "Your email" (we already have it) and uses the share-a-link-to-parent model. Rework the logged-in path: pre-fill/skip the grandparent's email, and reframe the send step as "invite this child's parent to join" (they aren't on Amplifi yet). *(Points from the cold-flow test.)*
- [x] **Grandparent expectation-setting after pledging** — ✅ the Follow CTA now reads "watch the fund grow once [child]'s parent opens the account".
- [x] **Deep-link 404 (again)** — the "See what's waiting" / "Add a little" email buttons point at `app.letsamplifi.com` and 404 until we **deploy** the `_redirects` fix. Known; ships on deploy. Locally, swap the domain for `localhost:<port>`.
- [x] **🔴 ROOT-CAUSE FOUND: Family ring always £0.** `get_child_pledges` threw `42702 column reference "id" is ambiguous` on every call (the RETURNS TABLE output columns `id`/`status`/`linked_at` collided with unqualified column refs in the body). The client swallowed the error → empty list → Family ring £0 in *every* test. **Fixed** in `20260713080000_fix_get_child_pledges_ambiguous.sql` (all columns qualified + `#variable_conflict use_column`). Apply it; the linked £50 pledge then shows.
- [x] **Pending ("sent") pledges look like broken maths** — ✅ feed rows now carry a "waiting on ISA" tag, and a banner shows "£X a month is pledged and waiting — link the ISA to activate it."
- [x] **Child switcher (multi-child parents)** — ✅ `useActiveChild` (localStorage-backed) + a switcher dropdown on the Home header (shown when >1 child); Home / My Family / Occasions all follow the active child. *(Auto-switch-to-newly-accepted-child is a nice follow-up, Batch B.)*
- [x] **Cold email now explains the Junior ISA step** — ✅ "To receive it, [child] needs a Junior ISA … only you can open one … five minutes." (Provider screen already states it; the *accept* screen copy could still be beefed up — minor, Batch B.)
- [x] **Nudge now prioritises by biggest gap** — ✅ suggests the least-filled ring and goes quiet once every ring is ≥90% of target (no more pushing a full bucket).
- [x] **Home auto-refresh on focus** — ✅ Home refetches pot + children + occasions when you return to the tab.
- [x] **Unified "account ready"** — ✅ `get_occasion_by_token` now keys `account_ready` off `account_status = 'account_open'` (migration `20260713090000`), matching pledges.

---

## BUILD PLAN — final order

**Phase 1 — Functional fixes (broken behaviour; do first)**
1. **Pledge-linking gap** — link a pledge immediately when the child's account is already open (parent home currently shows £0 for a real pledge). [backend RPC]
2. **Dead-ends** — add "Done / I've made the gift" on the gift page and "I've set up my standing order" on the pledge status page.
3. **Home Occasions panel** — wire the Birthday/Christmas buttons to the Occasions tab / create flow.
4. **Reference field** — stop forcing CAPS (Link ISA + Confirm Account).
5. **"Invite sent" honesty** — only say it sent if the email actually succeeded.
   (SPA `_redirects` for the 404 is already done — ships on deploy.)

**Phase 2 — Account & navigation**
6. **Settings menu** (top-right gear) — ISA / pay-in details edit, Sign out, Feedback.
7. **Account-aware pledge flow** — if the account's already open, show pay-in details + "you can start now" (ties to #1).

**Phase 3 — Emails (trust-critical)**
8. Notify the **parent** when an *invited* pledge lands.
9. **Grandparent thank-you** email after pledging.
10. **Occasion gift emails** — thank the gifter (with pay-in details) + tell the parent.
11. **Deliverability** — steer family/invite emails out of Promotions into Primary (DKIM/DMARC + less-promotional styling).

**Phase 4 — Mission-framing pass (design)**
12. Centre **"shaded square"** → invisible / circular.
13. **£100k as the empowering universal default**; unify the centre projection + the mission banner into one story; tidy the redundant mission box after adjusting.
14. Rewrite the **default pledge message**.
15. ✅ **Home "Family activity" feed** now shows **occasion gifts** (gifter name + amount + occasion) alongside pledges — a gift shows *who* on home, not just in the ring total.

**Phase 5 — Grandparent home (strategic feature — its own build)**
15. Offer (not force) a free account after pledging → a **grandparent dashboard** following the child's mission + their own contribution.

**Phase 6 — Launch gates**
16. **Deploy** the current app (with the `_redirects` fix) to production.
17. **Test the P4 provider screen** (invited path — still untested).
18. **RLS security** session (careful; own session; needs the live-DB read first).
19. **Re-run** the full account-open + gift QA end to end.

_(Minor code-audit leftovers in `flow-audit-punchlist.md` — copy-link toast, ParentAccept stuck-spinner, DobInput backspace, duplicate-child guard — can be swept up during Phase 1/2.)_
