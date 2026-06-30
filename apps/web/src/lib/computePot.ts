import type { FamilyContribution } from './types'

/**
 * Periods a contribution has been live, counted on an ANNUITY-DUE basis: the
 * current period is counted from the moment of setup (the standing order is live
 * now), which matches the projection convention used everywhere else in the app.
 * So a £25/month set up today shows £25 today, not £0.
 *
 * End date is stopped_at for a stopped row (accrual is frozen at the stop, not left
 * to keep climbing), otherwise now.
 */
export function periodsElapsed(c: FamilyContribution, now = new Date()): number {
  if (c.frequency === 'one_off') return 1

  const start = new Date(c.started_at ?? c.created_at)
  const end = c.status === 'stopped' && c.stopped_at ? new Date(c.stopped_at) : now

  if (c.frequency === 'weekly') {
    const weeks = Math.floor(Math.max(0, end.getTime() - start.getTime()) / (7 * 864e5))
    return weeks + 1
  }

  // monthly: calendar-month difference, minus 1 if this month's anniversary day
  // hasn't arrived yet, clamped at 0, then +1 for the current (annuity-due) period.
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  if (end.getDate() < start.getDate()) months -= 1
  return Math.max(0, months) + 1
}

/**
 * The Pot for a child = Σ (amount_gbp × periodsElapsed) over every active AND
 * stopped contribution. Stopped rows stay counted (frozen at stopped_at); only
 * their accrual halts.
 */
export function computePot(contributions: FamilyContribution[]): number {
  return contributions
    .filter(c => c.status === 'active' || c.status === 'stopped')
    .reduce((sum, c) => sum + c.amount_gbp * periodsElapsed(c), 0)
}
