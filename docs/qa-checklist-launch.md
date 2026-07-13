# Amplifi — Launch QA checklist

Walk every flow end to end before real people use it. 🔴 = critical (a failure here breaks
trust or the core loop — don't launch until these pass). Test on the live-ish app with your
own account(s). Use a real email you can check, and **look in Spam / Promotions** — email
deliverability is a known weak spot.

Tip: use an incognito/private window for anything a grandparent or gifter would do (to prove
it works with no login and no shared session).

---

## A. Parent signup + home
- [ ] `/start` → "I'm a parent" → enter email → **a 6-digit code email arrives** 🔴 → enter it.
- [ ] Set name + password → add child (name + date of birth) → land on **Home**.
- [ ] Home shows the rings, the £100k mission banner, and the projected figure (or "add date of birth" if none).
- [ ] Tap the centre → projection breakdown opens; tap it again → closes.
- [ ] Tap each ring (Core, Family, Occasions) → its panel opens. Tap **Boosters** row → "coming soon" list.
- [ ] Tap **Adjust your targets** → drag the sliders → the "Projected at 25" figure moves → **Save** → the ring targets update on Home.
- [ ] Bottom bar: **Home · My Family · Occasions** all navigate correctly.

## B. Link ISA + account opens 🔴 (the fixed bug — test carefully)
- [ ] From Home, follow the nudge / Core ring → **Link ISA** → enter sort code, account number, reference → Save → back to Home.
- [ ] 🔴 After linking, any grandparent who has pledged should have their status flip to **"account open"** and receive the **pay-in email** (test this together with section C).

## C. Invite → pledge → accept → connected 🔴 (the core loop)
- [ ] Home or My Family → **Invite** → generate a link (WhatsApp / copy).
- [ ] Open the invite link in **incognito** → landing → "Start a pledge" → set amount + frequency → add a message → **send** using a real email.
- [ ] 🔴 The pledge **email reaches the parent** (check spam).
- [ ] As the parent, open the accept screen → it shows the sender, amount and message → create/confirm account → **provider signpost (P4)** → **confirm account** (enter DOB + pay-in details) → Home.
- [ ] 🔴 Back on the grandparent's status link (incognito): it now says **account open** and shows the **pay-in details** (sort code / account / reference), and they get the **account-open email**.
- [ ] **My Family** tab shows that supporter as **Contributing**; the Family ring on Home reflects their amount.

## D. Provider signpost (P4)
- [ ] On the invited path, `/provider` shows **Hargreaves Lansdown** and **Moneybox** (A–Z), the "we don't rank" line, the "use my own" option, and the reassurance chips.
- [ ] "Open on their site" opens the provider in a **new tab**.
- [ ] "Use my own" and "I've opened the account" both go to the confirm screen; "I'll do this later" goes Home; the **back arrow** works.

## E. Occasions 🔴 (the new flow)
- [ ] Occasions tab: if the child's JISA isn't set up, the amber **"Set up Junior ISA first"** banner shows and links to Link ISA.
- [ ] **Create a gifting moment** (title, type, optional date + target) → it appears in the list.
- [ ] **Share on WhatsApp** opens WhatsApp with a message + link; **Copy link** copies and shows "Copied ✓".
- [ ] Open the gift link in **incognito** → the gift page shows the child + occasion.
- [ ] Add a gift (name, amount, message) → 🔴 thank-you appears, and if the JISA is set up it shows the **pay-in details** with copy buttons (if not set up, it shows the "family will share how to send it" fallback).
- [ ] Back on the Occasions tab (refresh): the **total and gift count update**; tap "X gifts so far" → the **gifter list** shows names, messages and amounts.
- [ ] Home: the **Occasions ring** reflects the gift total.

## F. Cross-checks
- [ ] **Sign out** → sign back in → all data (child, contributions, pledges, occasions, targets) persists.
- [ ] Every money-facing screen shows the **FCA risk disclaimer**.
- [ ] No "guaranteed / becomes / will be" language anywhere; projections say **"illustrative"** with the 7% + capital-at-risk line.
- [ ] Nothing says "pot" any more (should be "future" throughout).
- [ ] On a phone-sized window, nothing overflows and the bottom tab bar doesn't cover content.

---

## Known follow-ups (not blockers, but note during testing)
- Occasions **thank-you email** to gifters isn't wired yet (server-side follow-up) — gifters only see details on-screen.
- **RLS security** is still off — fine while it's only your data; must be on before other families.
- Email **deliverability** (landing in Promotions/Spam) is a known tuning task.
- Stripe / payment processing is **parked** (compliance decision).

**QA passed by: ____________________   Date: __________**
