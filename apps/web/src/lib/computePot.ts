import type { FamilyContribution } from './types'

export function monthlyEquiv(amount: number, freq: 'weekly' | 'monthly' | 'one_off'): number {
  if (freq === 'monthly') return amount
  if (freq === 'weekly') return amount * 52 / 12
  return 0
}

function monthsElapsed(dateStr: string): number {
  return Math.max(0, Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  ))
}

export function computePot(contributions: FamilyContribution[]): number {
  return contributions
    .filter(c => c.status === 'active')
    .reduce((sum, c) => {
      if (c.frequency === 'one_off') return sum + c.amount_gbp
      const anchor = c.started_at ?? c.created_at
      return sum + monthlyEquiv(c.amount_gbp, c.frequency) * monthsElapsed(anchor)
    }, 0)
}
