# Amplifi — Parent & Grandparent flow audit (punch-list)

Plain-English list of what to fix in the two front-door journeys before launch, worst-impact
first. Tick them off as we go.

---

## 🔴 The one that actually breaks the product

- [ ] **Self-serve parents never truly "open" the account, so grandparents get stranded.**
  When a parent who signed up on their own links their ISA (the `/link-isa` screen, reached from
  the home nudge), the app saves the bank details but **never flips the child's account to "open"
  and never emails the grandparents their pay-in details.** Only the *invited*-parent path does
  that. Result: a grandparent who pledged sees "we'll let you know when the account opens" **forever**,
  and never gets the sort code/reference to set up their standing order — the core promise of the
  product silently fails for every organically-signed-up family.
  *Fix:* make the `/link-isa` screen do the same "confirm + notify" step the invited path does
  (`confirmChildAccount` + the account-open email). Files: `LinkIsa.tsx`, `ConfirmAccount.tsx`.

- [ ] **The home nudge points parents at the weaker of two ISA screens.** There are two screens that
  do the same job — `/link-isa` (self-serve, buggy: only handles the *first* child, collects no date
  of birth, doesn't trigger the above) and `/confirm/:childId` (invited path, correct). The home page
  sends most parents to the buggy one.
  *Fix:* unify them — everyone should go through the correct `:childId` version.

---

## 🟠 Must fix before real people use it

- [ ] **The provider screen is still a placeholder and cannot ship.** The invited-parent path shows
  a screen literally reading "PLACEHOLDER — Provider A/B/C". This is the **P4 / Gate-2** decision:
  you pick the real Junior ISA providers and approve the neutral wording. (We already built the warm
  version at `/prototype/provider` as the template.) File: `ProviderSignpost.tsx`.

- [ ] **The parent's first money screen has no risk disclaimer.** Every pledge screen carries the FCA
  disclaimer; the parent signup screen doesn't — and it's also where a Junior ISA (an *investment*)
  is called a **"savings pot"**. That combination is the weakest compliance spot in the app.
  *Fix:* add the standard disclaimer to signup, and stop calling the investment a "savings pot".
  File: `ParentSignup.tsx`.

---

## 🟡 Consistency — pick one word

- [ ] **"pot" vs "future" — the product can't decide what it's called.** The warm home, the pledge
  flow, and the invited-parent screens all say **"[child]'s future"**. But the parent signup says
  "your child's **pot**", "savings **pot**", "Create **pot**", and one invite screen says "Join
  [child]'s family **pot**". It reads like two different products at the front door.
  *Fix:* standardise on **"future"** everywhere. Files: `ParentSignup.tsx`, `TokenLanding.tsx`.

---

## 🟢 Polish / friction (quick wins)

- [ ] **"Step 1 of 3" is wrong for half of users.** The role-picker screen says "Step 1 of 3", but
  parents who tap "I'm a parent" go to a signup that isn't 3 steps and has no counter.
  *Fix:* drop the counter on that screen (or make it role-aware). File: `EntryFork.tsx`.

- [ ] **The invited-parent confirm screen is a one-way door.** It has no "back" and no "I'll do this
  later" — a parent who hasn't actually opened their ISA yet is stuck on a form demanding real bank
  details. *Fix:* add a back arrow and a "later" escape (the provider screen already has both).
  File: `ConfirmAccount.tsx`.

- [ ] **"Copy link" on the pledge step gives no feedback.** It copies the link then jumps to the next
  screen with no "copied ✓" confirmation, so people aren't sure it worked. *Fix:* show a confirmation.
  File: `PledgeFlow.tsx`.

- [ ] **Smaller nits:** a rare "stuck spinner" for an already-signed-in invited parent
  (`ParentAccept.tsx`); the date-of-birth boxes don't backspace to the previous field (`DobInput.tsx`);
  hitting `/signup` while already signed in can let a parent add a duplicate child (`ParentSignup.tsx`);
  the pay-in "reference" hint is worded two different ways on two screens.

---

## What's genuinely good (leave alone)

The grandparent pledge flow itself (`PledgeFlow`, `PledgeStatus`, `TokenLanding`, `ParentAccept`) is
warm, on-brand, compliance-clean ("contribution", never "guaranteed/becomes"), handles expired/invalid
links well, and keeps the no-account-needed promise. The email/OTP form is robust. The problems above
are mostly at the *parent* end and the *provider* screen — the emotional core is in good shape.

---

## Suggested order

1. The account-open loop (🔴) — it silently breaks the product for real users. Do first.
2. P4 provider copy (🟠) — needs *your* decision (providers + wording); everything else I can do.
3. Disclaimer + drop "savings pot" (🟠), then "pot → future" everywhere (🟡).
4. The polish batch (🟢) in one pass.
