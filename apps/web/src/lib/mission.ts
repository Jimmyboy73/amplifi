// ─────────────────────────────────────────────────────────────────────────────
// Mission data layer — derives the "Family Mission" home-screen view model from the
// EXISTING tables (family_contributions + linked family_pledges + occasion gifts + age).
//
// Pure + framework-free: no Supabase, no React, no network. Takes plain rows, returns
// numbers — trivially testable, changes NO existing behaviour. See docs/home-screen-build-spec.md.
//
// THE MISSION: £100k by 25. Three rings the family actively drives toward it —
//   • Core      — the parental household (+ Child Benefit), recurring monthly
//   • Family    — the wider circle (grandparents etc.), recurring monthly
//   • Occasions — birthday/Christmas/milestone gifting moments, yearly
// Everyday Boosters (cashback etc.) is PARKED upside — tracked but NOT a ring.
//
// Default targets hit ~£100k from birth at 7% p.a.; they SCALE UP the later a child
// joins (fewer compounding years), and the parent can re-weight them.
// ─────────────────────────────────────────────────────────────────────────────
import type { FamilyContribution, Frequency } from './types'
import type { ChildPledge } from './pledge'
import { computePot, type PledgeAccrual } from './computePot'
import { fv } from './projections'

const ANNUAL_RATE = 0.07
const MONTHLY_RATE = ANNUAL_RATE / 12
export const PROJECTION_AGE_YEARS = 25

export type Targets = {
  coreMonthly: number
  familyMonthly: number
  occasionsYearly: number
  boostersYearly: number
  householdGoal: number
}

// Default targets — the canonical £100k-by-25 model at 7% p.a. (Python-verified from birth):
//   Core £50/mo (~£40.5k) + Family £50/mo, i.e. £25+£25 both sides (~£40.5k)
//   + Occasions £250/yr (~£16.9k)  =>  the three reliable rings ≈ £97.9k (just under £100k)
//   + Everyday Boosters £120/yr (~£8.1k, the coming-soon gap-closer)  =>  all four ≈ £106k.
// The parent can adjust these. Whole-family total only — never one person's contribution.
export const DEFAULT_TARGETS: Targets = {
  coreMonthly: 50,
  familyMonthly: 50,
  occasionsYearly: 250,
  boostersYearly: 120, // Everyday Boosters — the coming-soon gap-closer ring
  householdGoal: 100000, // the £100k-by-25 mission (illustrative, not a guarantee)
}

// Annuity-due future value of a YEARLY contribution at 7% over whole years.
function fvAnnual(pmtYear: number, years: number): number {
  if (years <= 0) return 0
  return pmtYear * ((Math.pow(1 + ANNUAL_RATE, years) - 1) / ANNUAL_RATE) * (1 + ANNUAL_RATE)
}

/**
 * Normalise a contribution to a recurring MONTHLY figure (£). One-off gifts are not a
 * recurring rate → 0 (they still feed the pot; the ring fill tracks recurring giving).
 */
export function toMonthly(amountGbp: number, frequency: Frequency): number {
  if (frequency === 'monthly') return amountGbp
  if (frequency === 'weekly') return (amountGbp * 52) / 12
  return 0 // one_off
}

export type RingMonthly = { core: number; family: number }

/**
 * Split recurring monthly giving into Core vs Family.
 *  - Core   = the parent household — rows on the self-connection (incl. Child Benefit later).
 *  - Family = everyone else — linked pledges + contributions on any other connection.
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

export function monthsToAge(ageMonths: number, ageYears = PROJECTION_AGE_YEARS): number {
  return Math.max(0, ageYears * 12 - ageMonths)
}

/**
 * Target scaling multiplier: to still reach £100k by the target age, contributions must
 * be higher the later a child joins (fewer compounding years). 1.0 from birth.
 * e.g. join at 5 ≈ 1.56×, at 8 ≈ 2.08×, at 12 ≈ 3.2×.
 */
export function targetScale(ageMonths: number | null, ageYears = PROJECTION_AGE_YEARS): number {
  if (ageMonths == null) return 1
  const f = (n: number) => (n <= 0 ? 0 : ((Math.pow(1 + MONTHLY_RATE, n) - 1) / MONTHLY_RATE) * (1 + MONTHLY_RATE))
  const totalMonths = ageYears * 12
  const monthsLeft = Math.max(1, totalMonths - ageMonths)
  return f(totalMonths) / f(monthsLeft)
}

/** Age-adjusted targets (the £100k goal itself never changes; the contributions to reach it do). */
export function scaledTargets(ageMonths: number | null, base: Targets = DEFAULT_TARGETS): Targets {
  const s = targetScale(ageMonths)
  return {
    coreMonthly: Math.round(base.coreMonthly * s),
    familyMonthly: Math.round(base.familyMonthly * s),
    occasionsYearly: Math.round(base.occasionsYearly * s),
    boostersYearly: Math.round(base.boostersYearly * s),
    householdGoal: base.householdGoal,
  }
}

// A parent's saved targets (any NULL falls back to the age-scaled default for that bucket).
export type SavedTargets = {
  core: number | null
  family: number | null
  occasions: number | null
  boosters: number | null
}

/** Effective targets = the parent's saved values where set, else the age-scaled defaults. */
export function effectiveTargets(ageMonths: number | null, saved?: SavedTargets): Targets {
  const base = scaledTargets(ageMonths)
  return {
    coreMonthly: saved?.core ?? base.coreMonthly,
    familyMonthly: saved?.family ?? base.familyMonthly,
    occasionsYearly: saved?.occasions ?? base.occasionsYearly,
    boostersYearly: saved?.boosters ?? base.boostersYearly,
    householdGoal: base.householdGoal,
  }
}

/**
 * The centre projection: illustrative future value at 7% to the target age of the family's
 * ACTUAL current streams (recurring monthly + yearly occasion/booster giving).
 * Returns null when age is unknown — no figure before DOB (compliance).
 */
export function projectedFuture(params: {
  monthlyTotal: number
  occasionsYear?: number
  boostersYear?: number
  ageMonths: number | null
  ageYears?: number
}): number | null {
  const { monthlyTotal, occasionsYear = 0, boostersYear = 0, ageMonths, ageYears = PROJECTION_AGE_YEARS } = params
  if (ageMonths == null) return null
  const months = monthsToAge(ageMonths, ageYears)
  const years = Math.max(0, ageYears - ageMonths / 12)
  return fv(monthlyTotal, months) + fvAnnual(occasionsYear, years) + fvAnnual(boostersYear, years)
}

export function ringPct(current: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, Math.round((current / target) * 100))
}

export type RingStat = { current: number; target: number; pct: number }

export type MissionView = {
  monthly: RingMonthly & { total: number }
  projectedFutureValue: number | null
  pot: number
  rings: { core: RingStat; family: RingStat; occasions: RingStat }
  boosters: RingStat // parked upside — shown as a "coming soon" strip, not a ring
  householdGoal: number
  targets: Targets
  hasDob: boolean
}

/** Assemble the full home view model. Pure — pass data, get numbers. */
export function buildMissionView(params: {
  contributions: FamilyContribution[]
  pledges: ChildPledge[]
  selfConnectionId: string | null
  ageMonths: number | null
  occasionsGbpYear?: number // occasion gifts logged this year (0 until wired)
  targets?: Targets
}): MissionView {
  const targets = params.targets ?? scaledTargets(params.ageMonths)
  const monthly = ringMonthlyTotals(params)
  const total = monthly.core + monthly.family
  const occCurrent = params.occasionsGbpYear ?? 0

  const pledgeAccruals: PledgeAccrual[] = params.pledges.map((p) => ({
    amountPennies: p.amountPennies,
    frequency: p.frequency,
    status: p.status,
    linkedAt: p.linkedAt,
  }))
  const pot = computePot(params.contributions, pledgeAccruals)

  return {
    monthly: { ...monthly, total },
    projectedFutureValue: projectedFuture({
      monthlyTotal: total,
      occasionsYear: occCurrent,
      ageMonths: params.ageMonths,
    }),
    pot,
    rings: {
      core: { current: monthly.core, target: targets.coreMonthly, pct: ringPct(monthly.core, targets.coreMonthly) },
      family: { current: monthly.family, target: targets.familyMonthly, pct: ringPct(monthly.family, targets.familyMonthly) },
      occasions: { current: occCurrent, target: targets.occasionsYearly, pct: ringPct(occCurrent, targets.occasionsYearly) },
    },
    boosters: { current: 0, target: targets.boostersYearly, pct: 0 },
    householdGoal: targets.householdGoal,
    targets,
    hasDob: params.ageMonths != null,
  }
}
