# Amplifi — Onboarding Flow Redesign
## Blueprint for Claude Code / Fable — review before building — v1.0

**Fewer screens, less to read, one clear path — both journeys.**

---

> ## HOW TO USE THIS
> This is a **design blueprint, not a build instruction**. Read it, adjust anything you disagree with, then hand it to Fable **one flow at a time** — grandparent first, parent second — asking for a plan before each build, and re-running the full loop after each.
>
> **The current flow WORKS.** This is a careful refactor of a working journey, not a rebuild. The loop must still pass end-to-end at the end.

---

## 1. What we're trying to achieve

The flows work, but they're longer and denser than they need to be. Every extra screen and every extra field is a place a real user — often an older grandparent — can hesitate or drop out. The goal is fewer screens, less to read, and a single obvious next action on each one.

- **Grandparent flow:** 6 screens → 3.
- **Parent flow:** merge the informational screens, capture the child's date of birth, and turn the pot page into a numbered path.
- **Throughout:** keep each screen calm and uncluttered — merging screens must not create cramped ones.

---

## 2. Grandparent flow — revised (6 screens → 3)

### New Screen 1 — Who are you?
Drop the "Who are you here as?" question. Lead with the brand line as the header, roles as buttons.

| Screen | What it contains |
|---|---|
| Header | "Families build wealth together" |
| Buttons | I'm a parent · I'm a grandparent · I'm a family member · I'm a friend of the family |
| Effect | The button chosen sets the person's relationship — so the old relationship question on the next screen is removed. |

### New Screen 2 — The pledge
Combine the old "child name" screen and the "set your pledge" screen into one. Remove the approximate age and the start-date question.

| Screen | What it contains |
|---|---|
| Header | "Who's this for, and how much?" (or similar — warm, short) |
| Fields | Child's first name · Amount (£10 / £25 / £50 / £100 / custom) · How often (weekly / monthly / one-off) |
| Removed | **Approximate age** — the parent gives the real date of birth at account setup, so the guess is redundant (and it caused the £0 projection bug). **Relationship** — already set on Screen 1. **"When would it start?"** — the grandparent sets up the actual standing order themselves later, so this is a fake choice. Cut it. |

### New Screen 3 — Message & send
Merge the old message screen, the standing-order "ready to activate" screen, and the final send screen into one.

| Screen | What it contains |
|---|---|
| Header | "Add a note and send it to [child]'s parent" |
| Fields | Personal message — pre-filled with "Something to build on. With love, Grandma.", editable · Your name · Your email (with the existing "only so we can tell you when the account opens" helper) |
| Actions | Send on WhatsApp · Send by email · Copy link to share |
| Reassurance | Fold the old standing-order screen's message in as a single calm line here: "Nothing to set up yet — when the account opens we'll send you the exact pay-in details for your bank. Amplifi never holds or moves your money." Not its own screen. |

> **KEEP — DO NOT LOSE**
> - The **personal message** is the emotional core of the whole product — it's what makes the pledge "a gift already in motion." Merge it, never remove it. Keep it prominent on Screen 3.
> - **Progress indicator:** make it clear and prominent ("Step 1 of 3"), and make sure the numbers are correct — the current flow mislabels steps (a 2/5 screen showing as 1/5, etc.).

---

## 3. Parent flow — revised

The parent arrives from a grandparent's link. Same principle: merge the informational screens, ask only for what's needed, and make the pot page a guided path rather than a flat menu.

### Parent Screen 1 — Accept & create account (merge the name screen in)

| Screen | What it contains |
|---|---|
| Header | Simpler: "[Name] wants to give [child] £50 a month" |
| Sub-line | The personal message from the grandparent, shown clearly. |
| Fields | Full name (merged in — no separate "Nice to meet you" screen) · Email · Password + confirm |
| Curiosity hook | Optional teaser line: "Create your account to see what this could grow to for [child] by 25." Uses curiosity as the reason to sign up. See compliance note in Section 5 — the teaser is fine; the actual figure appears only after signup, on the pot page, with the risk line. |
| Removed | The standalone "Nice to meet you — what's your name?" screen. Fold the name field into this screen. |

### Parent Screen 2 — The provider signpost (P4)
Do **not** remove this from the flow. It does essential work: it tells the parent they must open a Junior ISA, that Amplifi doesn't do it for them, and where to go. Removing it risks a parent accepting a pledge and never opening an account — which stalls the whole loop.

> **THE FIX IS TONE, NOT REMOVAL (this is the P4 gate)**
> - The screen feels "unnerving" because it's still the placeholder — the amber "PLACEHOLDER" banner and "Provider A / B / C". The real version should feel warm and simple, not like a warning label.
> - This is James's **P4 gate**: confirm the real providers and approve the exact copy. Until then it stays a placeholder. When built, make it reassuring: "[child] needs a Junior ISA to receive contributions — it takes about five minutes on the provider's own site. Here are a few that offer them." Neutral, factual, no ranking.

### Parent Screen 3 — Confirm the account (capture DATE OF BIRTH here)
This is where the child's real date of birth is captured — see Section 4 for why this is the keystone of the whole redesign.

| Screen | What it contains |
|---|---|
| Fields | Provider (from the list) · Sort code / account number / payment reference (for family pay-in) · **Child's date of birth — NEW, required** |
| Why DOB here | A real Junior ISA legally cannot be opened without it; it makes the projection accurate; and it makes the "see what this becomes by 25" teaser honest. |

### Parent Screens — merge the two welcome screens
The "You're a Founding Family" welcome and the "Before we begin — Amplifi works alongside your ISA" screen are two informational screens in a row. Merge into one welcome that carries both the warm founding-family note and the one-line "here's how it works." One Continue. Fix the wording where "building" and "build" sit too close together.

### Parent Screen — the pot page, as a numbered path
Today the pot page shows a flat list of options with no sense of what to do first. A new parent doesn't know the ISA is the critical first step. Turn the "Get more from Amplifi" list into a numbered, guided path:

1. **Link an ISA** — the critical first step; highlight it.
2. **Send the giver the pay-in details** — so the grandparent can start their standing order.
3. **Set up your own contribution**
4. **Invite others to contribute**

This turns a menu into a journey and makes the essential ISA step impossible to miss.

---

## 4. The date-of-birth question (the keystone)

Walking the flow surfaced the single most important gap: **the app never captures the child's date of birth.** That one omission cascades:

- The age projections ("£20k at 18, £37k at 25") are built on a guess or a default — which for a real family is both misleading and a financial-promotion risk.
- A real Junior ISA cannot legally be opened without the child's date of birth — it's a KYC requirement.
- The "see what this could become by 25" teaser only works honestly if the DOB is known.

**Recommendation: capture the child's date of birth at the parent's account-confirm step (Parent Screen 3).** That's the natural moment — the parent is opening the real account anyway. Do not ask the grandparent for it (they often won't know it precisely, and it adds friction to the flow that must stay light).

Until a DOB is known, projections must degrade gracefully — show "Add [child]'s date of birth to see the projection" rather than a figure built on a guess. (This behaviour already exists from the calculator fix; this section just confirms the DOB is captured so it can be used.)

---

## 5. Compliance notes on the projection teaser

Surfacing "what this could become" is good psychology, but the moment a projected figure appears it becomes a financial promotion. Rules:

- The **teaser** ("see what this could grow to for [child] by 25") is safe — it states no figure.
- The **actual figure** appears only after signup, on the pot page, and must carry "Illustrative, could grow to around … not a guarantee. Capital at risk." immediately adjacent — never only in a footer.
- Rate stays at **7% p.a.** everywhere (already fixed). No "becomes / will be / guaranteed" language anywhere.
- No projected figure should ever display when the child's date of birth is unknown — it would be built on a guess.

---

## 6. What must NOT break

This is a refactor of a working journey. After the redesign, the full loop must still pass end-to-end:

- Grandparent can create a pledge and send it (WhatsApp / email / copy link) without a full account up front, in fewer steps than before.
- Parent can accept, create an account, be signposted to a provider, confirm the account (now with DOB), and see the pledge link and pot update.
- The one invite entry, the pot total, and the family roster all keep working.
- Every screen keeps the FCA disclaimer; conditional language only.
- The provider screen (P4) stays a clearly-marked placeholder until James approves the real copy.

---

## 7. How to execute this with Fable

Do not hand this whole document over as one instruction — it touches both flows and the pot page. Work in controlled chunks:

1. **Grandparent flow first** (Section 2). Ask Fable for a screen-by-screen plan before it writes code; approve it; build; re-run the loop.
2. **Parent flow second** (Section 3), including DOB capture (Section 4). Same pattern — plan, approve, build, re-test.
3. **The pot page numbered path** can be its own small change.
4. **The real P4 provider screen** is a separate gate — James supplies providers and copy.

After each chunk, run one clean loop to confirm nothing broke. Keep each screen calm and uncluttered — the goal is fewer screens, not denser ones.
