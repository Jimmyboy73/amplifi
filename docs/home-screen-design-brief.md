# Amplifi — Home Screen Design Brief
## "The Family Mission"

**The defining screen of Amplifi — warm, collaborative, family-first.**

---

> ## HOW THIS GETS BUILT — PROTOTYPE FIRST, DON'T INTEGRATE
> This is a **design brief, not a build ticket.** The first step is a **VISUAL PROTOTYPE only**: a standalone, styled mockup of the home screen with **dummy data**, rendered so it can be seen and felt — **NOT** wired into the real app, the real database, or the working flow.
>
> Iterate the look and feel on the prototype until it's right. Only once the visual is agreed does it become a full build spec and get wired into real data. This keeps it cheap to change and keeps the working app safe.
>
> "Apple Fitness for family wealth" lives or dies on visual execution — so we design it, react to the picture, then build.

---

## 1. The vision

Today the product still feels like a financial app centred on an account balance. That is not what Amplifi is. **Amplifi coordinates a family around a child's future.** The home screen must communicate that in the first three seconds.

When someone opens Amplifi, the first thought should not be "How much is in the account?" It should be "This is our family's mission." The child is the centre of everything; the money simply measures the progress of that mission.

> **THE THREE-SECOND TEST**
> If someone glances at this screen for three seconds, they should immediately understand one thing:
> **"Our family is building this child's future together."**
> That emotional reaction matters more than any individual feature. This screen should become the defining visual identity of Amplifi — and clearly set it apart from every banking, savings or investment app.

Reference feeling: **Apple Fitness, not a banking app.** Simple. Calm. Focused. Optimistic. Collaborative. Avoid a dashboard of balances, charts and widgets.

---

## 2. The centre — the child and their future

The centre of the screen is the child, not the account. For example:

> **Olivia's Future**
> Projected value at age 25
> **£97,400**

The projected figure represents the collective impact of everyone currently helping. It should feel *inspirational rather than financial* — the child and their future are the focus, not the balance.

> **COMPLIANCE — THE CENTRE FIGURE IS A PROJECTION (build it right from day one)**
> This number sits at the emotional heart of the app, so it must be honest and compliant, not bolted on later.
> - A **personalised** figure ("Olivia's Future · £97,400") shows **ONLY once the child's date of birth is known.** Same rule as the calculator.
> - Before a DOB exists, show an aspirational-but-clearly-**generic** version — e.g. "See what Olivia's future could look like — add her date of birth" — never a specific personalised figure built on a guess.
> - The figure always carries, **adjacent (not in a footer):** "Illustrative, could grow to around… not a guarantee. Capital at risk." Assumes 7% p.a. No "will be / becomes / guaranteed" language, ever.

---

## 3. The three progress rings

Around the centre sit three Apple-Fitness-inspired progress rings. Crucially, these are **not progress towards money.** They are progress towards building a stronger support network around the child. They represent *opportunities that have been activated*, never people who are "missing." The tone is always encouraging, never guilt-inducing.

### Ring 1 — Core Support (Azure)
- **Represents:** The people making an ongoing, recurring commitment — the foundation.
- **Feeds it NOW:** Parents and grandparents with recurring pledges/contributions (these exist in the product today).
- **Coming later:** — (this ring is fully buildable now)
- **Tap to expand:** A simple list — ✓ Mum · ✓ Dad · ✓ Grandma · ○ Grandad — with gentle actions (e.g. "Invite Grandad"). Never framed as failure — just opportunity.

### Ring 2 — Family Support (Sky)
- **Represents:** The wider circle — extended family, godparents, friends, and one-off/occasion gifting.
- **Feeds it NOW:** Extended family / friends who've pledged; the outward-invite mechanism (exists today).
- **Coming later:** Birthday & Christmas gifting moments; occasion-based gift prompts (future).
- **Tap to expand:** Shows supporters and gifting opportunities — who's given, and easy ways to invite more or open a birthday/Christmas gifting moment.

### Ring 3 — Everyday Boosters (Amber)
- **Represents:** The passive, automatic ways a child's future grows — money that builds without anyone writing a cheque.
- **Feeds it NOW:** — (none live yet)
- **Coming later:** Cashback, gift cards, employer contributions, payroll giving, loyalty programmes, and future Amplifi auto-grow features.
- **Tap to expand:** Because none of these exist yet, tapping this ring opens a warm **"It's coming"** list — a preview of features on the way, not dead buttons. e.g. "Cashback — coming soon", "Employer contributions — coming soon."

> **THE "IT'S COMING" PATTERN (important)**
> The rings show the FULL vision on day one — including features that don't exist yet — so the home screen communicates the whole ambition immediately. But we build **NO new functionality** for those features now.
> Any not-yet-built opportunity (all of Everyday Boosters, plus future bits of Family Support like occasion gifting) is shown as an activated part of the mission, and tapping it reveals a friendly "coming soon" preview. This teases the roadmap, signals where Amplifi is going, and costs nothing to build beyond the preview list.

Design note: the rings should show progress *visually*, without feeling like a checklist. They represent opportunities activated, not relationships absent. Never make a user feel they've failed because someone hasn't joined.

---

## 4. The family activity feed

Below the rings, a small feed — **not a transaction history, a family activity feed.** Its job is to make the mission feel alive. Examples:

- Grandma started contributing £25/month
- Mum linked Olivia's Junior ISA
- Birthday Fund was activated
- Cashback added £2.14 this week

Warm, human, present-tense. Keep it short — a few recent moments, not an endless ledger.

---

## 5. One contextual suggestion

Rather than a menu of tasks, show a **single** intelligent suggestion at a time — guiding, not overwhelming. Examples:

- "Activate Cashback"
- "Birthday gifting is ready"
- "Invite another grandparent"
- "Employer contributions are now available"

Only one shows at a time. It nudges the next best action naturally. (For the prototype, a single hardcoded suggestion is fine — the smart-selection logic comes later.)

---

## 6. Design principles

The page should feel:
- **Warm** rather than financial.
- **Collaborative** rather than individual.
- **Inspirational** rather than analytical.
- **Family-first** rather than product-first.
- **Calm** rather than information-dense.

Avoid: a dashboard of balances, charts and widgets. Avoid: making users feel they've failed because certain family members haven't joined. The rings represent opportunities activated, not relationships absent.

Brand: Midnight `#101628`, Azure `#407BBF`, Sky `#59C9E9`, amber `#E0A53A` for warm accents, coral `#D9503A` for cost/loss only; Plus Jakarta Sans. The rings can use Azure (Core) / Sky (Family) / Amber (Everyday Boosters) so each has its own identity.

---

## 7. Layout, top to bottom

1. **The child at the centre** — name + projected future (compliant, see §2), the emotional anchor.
2. **Three progress rings** around/below the centre — Core Support, Family Support, Everyday Boosters.
3. **Family activity feed** — a few recent, warm moments.
4. **One contextual suggestion** — the single next best action.

Everything else (explanations, lists, details) lives *inside* the expanded ring views — the home screen itself stays extremely clean.

---

## 8. What this replaces

This becomes the new home/pot screen. The current version — "[child]'s Pot · £0.00", the numbered path, the standalone calculator — is folded into this vision: the pot total becomes secondary (progress, not the headline), the numbered onboarding steps become gentle suggestions/ring actions, and the calculator's projection becomes the compliant centre figure. Nothing useful is lost; it's reframed from "account dashboard" to "family mission."

---

## 9. How to build this (for Fable)

1. **Prototype only, first.** Build a standalone, styled mockup of this home screen with **DUMMY data** (a fake child, fake supporters, fake activity). Do NOT wire it to the real database or the live flow. A single route/page that can be opened to see and feel it.
2. **Make the rings and taps work visually** — tapping a ring expands its list (incl. the "it's coming" preview for Everyday Boosters). Interactions can run on dummy data.
3. **Iterate the look** until the feel is right — this will take a few passes; that's expected and fine because it's just a prototype.
4. **Only then, full build spec** — wire the agreed design into real data (real supporters, real pledges, the compliant projection), replacing the current pot page.

> **KEEP THE WORKING APP SAFE**
> The prototype is additive and isolated — a new page with dummy data. It must not change or break the existing flow, the pot page, the database, or anything currently working. All current work stays on the family-pledge-flow branch; the prototype can be a new page there.
