// ─────────────────────────────────────────────────────────────────────────────
// Mission data layer — derives the "Family Mission" home-screen view model from the
// EXISTING tables (family_contributions + linked family_pledges + the child's age).
//
// Pure + framework-free on purpose: no Supabase, no React, no network. It takes plain
// rows and returns numbers, so it's trivially testable and changes NO existing behaviour.
// The UI phase (Phase 3) consumes buildMissionView; nothing here touches Home.tsx yet.
//
// See docs/home-screen-build-spec.md. Ring model = Target. Boosters is parked (Phase 2):
// it has no live data and always reads £0 of its target.
// ─────────────────────────────────────────────────────────────────────────────
import type { FamilyContribution, Frequency } from './types'
import type { ChildPledge } from './pledge'
import { computePot, type PledgeAccrual } from './computePot'
import { fv } from './projections'

// D1-A: app-level default targets (not persisted yet). Illustrative motivators, not
// promises — kept in one place so persisting them later (D1-B) is a drop-in swap.
export const DEFAULT_TARGETS = {
  coreMonthly: 150, // Core = parental household (+ Child Benefit)
  familyMonthly: 100, // Family = the wider circle, recurring
  boostersYearly: 500, // Boosters = parked; shown as a target to work toward
  householdGoal: 100000, // the centre "£100k goal" (illustrative)
} as const
export type Targets = typeof DEFAULT_TARGETS

// The centre figure projects to this age (the design's "at age 25").
export const PROJECTION_AGE_YEARS = 25

/**
 * Normalise any contribution to a recurring MONTHLY figure (£).
 * One-off gifts are NOT a recurring rate → 0 (they still feed the pot + the projection
 * base elsewhere, but the ring's fill tracks recurring monthly giving only — see spec §5).
 */
export function toMonthly(amountGbp: number, frequency: Frequency): number {
  if (frequency === 'monthly') return amountGbp
  if (frequency === 'weekly') return (amountGbp * 52) / 12
  return 0 // one_off
}

export type RingMonthly = { core: number; family: number }

/**
 * Split recurring monthly giving into Core vs Family.
 *  - Core   = the parent household's own contributions — rows on the self-connection
 *             (`connection_id === selfConnectionId`). Child Benefit lands here too, once
 *             recorded as a contribution on that connection (D2, later phase).
 *  - Family = everyone else — linked family_pledges + contributions on any other connection.
 * Only `active` contributions and `linked` pledges count toward the live rate.
 */
export function ringMonthlyTotals(params: {
  contributions: FamilyContribution[]
  pledges: ChildPledge[]
  selfConnectionId: string | null
}): RingMonthly {
  const { contributions, pledges, selfConnectionId } = params
  let core = 0
  let family = 0

  for (const c of contributions) {
    if (c.status !== 'active') continue
    const monthly = toMonthly(c.amount_gbp, c.frequency)
    if (selfConnectionId && c.connection_id === selfConnectionId) core += monthly
    else family += monthly
  }

  for (const p of pledges) {
    if (p.status !== 'linked') continue
    family += toMonthly(p.amountPennies / 100, p.frequency)
  }

  return { core, family }
}

/** Whole months from the child's current age to the target age (never negative). */
export function monthsToAge(ageMonths: number, ageYears = PROJECTION_AGE_YEARS): number {
  return Math.max(0, ageYears * 12 - ageMonths)
}

/**
 * The centre projection: illustrative future value of the household's total monthly giving
 * at 7% p.a. (annuity-due, via projections.fv) to the target age.
 * Returns null when age is unknown — NO figure before the DOB is known (compliance).
 */
export function projectedFuture(params: {
  monthlyTotal: number
  ageMonths: number | null
  ageYears?: number
}): number | null {
  const { monthlyTotal, ageMonths, ageYears = PROJECTION_AGE_YEARS } = params
  if (ageMonths == null) return null
  return fv(monthlyTotal, monthsToAge(ageMonths, ageYears))
}

/** Ring fill percentage (0–100), clamped. */
export function ringPct(currentGbp: number, targetGbp: number): number {
  if (targetGbp <= 0) return 0
  return Math.min(100, Math.round((currentGbp / targetGbp) * 100))
}

export type RingStat = { current: number; target: number; pct: number }

export type MissionView = {
  monthly: RingMonthly & { total: number }
  projectedFutureValue: number | null // null before DOB known
  pot: number
  rings: { core: RingStat; family: RingStat; boosters: RingStat }
  householdGoal: number
  hasDob: boolean
}

/**
 * Assemble the whole home-screen view model from raw rows. This is the single function
 * the UI hook (Phase 3) will call. Pure — pass it data, get back numbers.
 */
export function buildMissionView(params: {
  contributions: FamilyContribution[]
  pledges: ChildPledge[]
  selfConnectionId: string | null
  ageMonths: number | null
  targets?: Targets
}): MissionView {
  const targets = params.targets ?? DEFAULT_TARGETS
  const monthly = ringMonthlyTotals(params)
  const total = monthly.core + monthly.family

  const pledgeAccruals: PledgeAccrual[] = params.pledges.map((p) => ({
    amountPennies: p.amountPennies,
    frequency: p.frequency,
    status: p.status,
    linkedAt: p.linkedAt,
  }))
  const pot = computePot(params.contributions, pledgeAccruals)

  // Boosters is parked (Phase 2) — no live data, always £0 of its target.
  const boostersCurrent = 0

  return {
    monthly: { ...monthly, total },
    projectedFutureValue: projectedFuture({ monthlyTotal: total, ageMonths: params.ageMonths }),
    pot,
    rings: {
      core: {
        current: monthly.core,
        target: targets.coreMonthly,
        pct: ringPct(monthly.core, targets.coreMonthly),
      },
      family: {
        current: monthly.family,
        target: targets.familyMonthly,
        pct: ringPct(monthly.family, targets.familyMonthly),
      },
      boosters: {
        current: boostersCurrent,
        target: targets.boostersYearly,
        pct: ringPct(boostersCurrent, targets.boostersYearly),
      },
    },
    householdGoal: targets.householdGoal,
    hasDob: params.ageMonths != null,
  }
}
