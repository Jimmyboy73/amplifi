# Amplifi — full test run (Phases 1–5)

Work top to bottom. 🔴 = must pass before launch. 🆕 = new this session. Tick as you go.

---

## 0. Start the app

1. Open a terminal in the repo, then:

   ```
   cd apps/web
   npm run dev
   ```

2. Vite prints the address, e.g. `➜  Local:   http://localhost:5173/`. **Use whatever port it prints** — if 5173 is busy it uses 5174, 5175, etc. That's your base URL for everything below.
3. Handy start points:
   - Parent app: `http://localhost:<port>/home`
   - Grandparent/gifter entry: open the specific link the app generates (invite / gift), ideally in an **incognito window** so there's no shared login.

**Before you start, have ready:**
- 2–3 **real email inboxes** you can open (your gmail `+aliases` are perfect, e.g. `you+parent@`, `you+grandma@`, `you+gift@`).
- An **incognito / private window** for anything a grandparent or gifter does (proves it works with no account).
- Keep the Supabase **Edge Function → Logs** tab open in a browser tab — it shows why any email is skipped.

**Fresh slate (optional):** the cleanest way to start fresh is simply to **sign up as a new parent with a new email** — no need to wipe anything. If you'd rather wipe your old test rows, ask me and I'll give you the SQL (I won't delete anything without you).

---

## A. Parent signup + home  🔴  (MVP flow 1)

- [ ] `/start` → "I'm a parent" → enter a new email → **6-digit code email arrives** → enter it.
- [ ] Set name + password → add a child (name + **date of birth**) → land on **Home**.
- [ ] Home shows the three rings, the **£100k mission box**, and a projected figure in the ring centre.
- [ ] 🆕 The ring **centre has no square** behind it when you tap it.
- [ ] 🆕 The **£100k box** reads as encouragement (no duplicated £ figure; a "you're on the board…" style line) with a gentle "Adjust targets →".
- [ ] Tap the centre → projection breakdown opens/closes. Tap each ring → its panel opens.
- [ ] **Adjust targets** → drag sliders → the projected figure moves → Save → rings update.
- [ ] Bottom bar: **Home · My Family · Occasions** all navigate.

## B. Settings + Link ISA  🔴  (Phase 2 + MVP flow 2)

- [ ] 🆕 **Gear icon** top-right of Home → menu shows **Edit ISA / pay-in details**, **Send feedback**, **Sign out**.
- [ ] From the nudge / Core ring / gear → **Link ISA** → enter sort code, account number, reference → Save → back to Home.
- [ ] 🆕 The **reference keeps exactly what you type** (no forced CAPS).
- [ ] 🆕 Re-open **Edit ISA / pay-in details** from the gear → your saved details are **pre-filled** and editable (fixes the "how do I change it" gap).

## C. Invite → pledge → connected  🔴  (MVP flow 3 + Phases 1/2/3)

- [ ] Home / My Family → **Invite** → generate a link (WhatsApp or copy). 🆕 If you use **email**, the "invite sent" message only appears on a real send.
- [ ] Open the invite link in **incognito** → landing → start a pledge → amount + frequency → message (🆕 note the warmer default: "A little something for your future…") → add your details → **Add my pledge**.
- [ ] 🆕 Because the ISA is already linked, the flow says **the account's already open / you can start straight away**, and the status page shows the **pay-in details immediately**.
- [ ] 🆕 **Emails:** the **pledger gets a thank-you**, and **you (parent) get "X added a pledge for [child]."** (check Promotions/Spam).
- [ ] 🔴 Back on the **parent Home**: the **Family ring reflects the pledge** (not £0).
- [ ] 🆕 The pledge appears in the Home **Family activity** feed, and the supporter shows in **My Family**.

## D. Provider signpost (P4)  🆕 still-untested

- [ ] Reach it via the invited-parent path, or directly: `/provider/<childId>`.
- [ ] Shows **Hargreaves Lansdown** + **Moneybox** (A–Z), the "we don't rank" line, "use my own", reassurance chips.
- [ ] "Open on their site" opens a **new tab**; "use my own" and "I've opened the account" go to confirm; "I'll do this later" → Home; **back arrow** works.

## E. Occasions  🔴  (MVP flow 4 + Phases 3/4)

- [ ] Occasions tab: if no JISA, the amber **"set up Junior ISA first"** banner shows.
- [ ] 🆕 From **Home → Occasions ring panel**, the **Birthday / Christmas buttons** open the Occasions tab with the create box pre-set to that type.
- [ ] Create a moment → it appears with its total bar.
- [ ] **Share on WhatsApp** + **Copy link** both work.
- [ ] Open the gift link in **incognito** → add a gift (name, amount, **real email**, message).
- [ ] Thank-you shows **pay-in details** (ISA is linked) with copy buttons, plus 🆕 an **"I've made the gift"** confirm (no dead end).
- [ ] 🆕 **Emails:** the **gifter gets a thank-you with pay-in details**, and **you (parent) get "X gifted £Y for [child]."**
- [ ] Back on Occasions tab (refresh): total + gift count update; "X gifts so far" expands the gifter list.
- [ ] Home: the **Occasions ring** reflects the gift, and 🆕 the gift shows in the **Family activity** feed with the giver's name.

## F. Grandparent "follow the child"  🆕  (Phase 5)

- [ ] After pledging (section C), on the **status page** tap **"Follow [child]'s future — create a free account."**
- [ ] Sign up with a **fresh email** (one that is *not* already a parent account).
- [ ] Land on **`/following`** with a **follow-card**: the child's "on track for £X by 25" + progress bar, **your contribution**, and **pay-in details** (account is open).
- [ ] Tap **"Start something for another grandchild"** → it begins a new (cold) pledge for a different child.
- [ ] Sign out, then sign back in with that grandparent email → you land back on **`/following`** (not the parent home).

## G. Cross-checks

- [ ] **Sign out / sign back in** (parent) → child, ISA, pledges, occasions, targets all persist.
- [ ] Every money screen shows the **FCA risk disclaimer**; projections say **"illustrative"** + 7% + capital at risk.
- [ ] Nothing says "pot" (should be "future"); no "guaranteed / will be" language.
- [ ] On a phone-width window nothing overflows and the tab bar doesn't cover content.

---

## Watch-outs (so you know what's "expected" vs a bug)

- **Parent-facing emails** (the two "someone pledged / gifted" notifications) read your address from `auth.users`. If the **thank-yous arrive but the parent notifications don't**, that's a known permissions quirk — tell me and I'll switch the source. Nothing else breaks either way.
- **Deep links still 404 on the live site** until we **deploy** (the `_redirects` fix ships then). Testing locally avoids this — email links point at `app.letsamplifi.com`, so to follow one locally, swap the domain for `localhost:<port>`.
- Emails landing in **Promotions/Spam** is deliverability tuning (a later task), not a failure — they are being delivered.
