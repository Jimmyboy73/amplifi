# Amplifi — final launch walkthrough (live)

Run this on the **live site: https://app.letsamplifi.com**. Deep links now resolve, so email
buttons work for real — no localhost swap needed.

🔴 = must pass before you point anyone else at it. 🆕 = new since the last full test.

**Before you start**
- A **fresh parent email** you haven't used (so you start clean, not on old test data).
- 2–3 real inboxes you can open (gmail `+aliases` are ideal: `+parent`, `+grandma`, `+gift`).
- An **incognito window** for anything a grandparent or gifter does (proves no-login works).
- Keep the Supabase **Edge Function → Logs** tab open — it shows why any email is skipped.
- **Don't onboard real other families yet** — RLS is still off; that's the one pre-beta gate.

---

## A. Parent signup + the new home 🔴
- [ ] `/start` → "I'm a parent" → email → **6-digit code arrives** → enter it.
- [ ] Name + password → add a child (name + **date of birth**) → land on **Home**.
- [ ] 🆕 The **£100k mission** box is bold and near the top (🎯, gradient) — front and centre.
- [ ] 🆕 Text is **dark and legible** everywhere (not washed-out grey).
- [ ] Ring centre shows the projected figure with a small `*`; the full disclaimer sits at the **bottom** of the page.
- [ ] 🆕 Tap **Core / Family / Occasions / Boosters** → each opens as a **pop-out modal** (dimmed background, ✕ to close). Pills have strong coloured borders.
- [ ] 🆕 **Adjust targets** → drag sliders → the projected figure moves → tap **Age 18 / 25 / 45 / 65** to see it at each milestone → **Save** → rings update. (No standalone "what you could have" calculator anymore.)
- [ ] Bottom bar: **Home · My Family · Occasions** all navigate.

## B. Settings + Link ISA 🔴
- [ ] 🆕 **Gear icon** top-right → Edit ISA / pay-in details, Send feedback, Sign out.
- [ ] Link ISA → sort code, account number, reference → Save → back to Home. Reference keeps exactly what you type (no forced CAPS).
- [ ] Re-open **Edit ISA** from the gear → details are **pre-filled** and editable.

## C. Invite → pledge → connected 🔴 (the core loop)
- [ ] Home/My Family → **Invite** → 🆕 add an optional **"who are you inviting"** name → share (WhatsApp / copy / email).
- [ ] 🆕 **My Family** shows an **"Invited — waiting to hear back"** row for that person.
- [ ] Open the invite link in **incognito** → pledge (amount + frequency + message) → send with a real email.
- [ ] 🆕 Because the ISA is linked, the flow says **"account's already open — start straight away"** and the status page shows **pay-in details** immediately.
- [ ] 🆕 **Emails:** pledger gets a **thank-you**; you (parent) get **"X added a pledge for [child]."**
- [ ] 🔴 Parent **Home → Family ring** reflects the pledge (£50/£40 etc.), and the supporter moves from "Invited" to the **family list** in My Family.
- [ ] If the ISA is **not** linked, the pledge shows as **"waiting on ISA"** with a banner explaining the ring is £0 until you link it.

## D. Provider signpost (P4)
- [ ] On the invited-parent path (accept → provider) or `/provider/<childId>`: shows **Hargreaves Lansdown** + **Moneybox**, "we don't rank", "use my own", reassurance chips; "open on their site" → new tab; "I'll do this later" → Home; back arrow works.

## E. Occasions 🔴
- [ ] Occasions tab (or Home → Occasions modal → Birthday/Christmas): create a moment (note the **Cancel** button works).
- [ ] Share on WhatsApp / Copy link both work.
- [ ] Open the gift link in **incognito** → add a gift (name, amount, real email) → thank-you shows **pay-in details** + an **"I've made the gift"** button.
- [ ] 🆕 **Emails:** gifter gets a **thank-you with pay-in details**; you (parent) get **"X gifted £Y for [child]."**
- [ ] Home: the **Occasions ring** and the **Family activity feed** both reflect the gift (with the giver's name).

## F. Grandparent "follow the child" 🆕
- [ ] After a **pledge**, the status page offers **"Follow [child]'s future"** → sign up with a **fresh email** → land on **/following** with a follow-card (trajectory, your contribution, pay-in details).
- [ ] 🆕 After an **occasion gift**, the thank-you page also offers **Follow** → same dashboard.
- [ ] On /following, **"Start something for another grandchild"** begins a new pledge.
- [ ] Sign out and back in as that grandparent → you land on **/following** (not the parent home).

## G. Child switcher 🆕 (only if a parent has 2+ children)
- [ ] With two children, the **Home header** shows a child switcher → pick the other child → Home, My Family and Occasions all follow the selected child.

## H. Cross-checks
- [ ] Sign out / back in (parent) → child, ISA, pledges, occasions, targets all persist.
- [ ] Every money screen shows the **FCA risk disclaimer**; projections say **illustrative**, 7%, capital at risk.
- [ ] Nothing says "pot" (should be "future"); no "guaranteed / will be" language.
- [ ] On a phone-width window nothing overflows and the tab bar doesn't cover content.

---

## Known non-blockers (expected, not bugs)
- Emails sometimes land in **Promotions/Spam** — deliverability tuning is a later task; they *are* delivered.
- **RLS is off** — fine for your own testing; must be on before real families. This is the top launch-gate.
- Parent-facing emails read the address from `auth.users`; if a thank-you arrives but a parent-notification doesn't, tell me (it's a permissions tweak, not a break).

**Passed by: ____________   Date: __________**
