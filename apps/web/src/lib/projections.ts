const MONTHLY_RATE = 0.07 / 12

export function fv(pmt: number, months: number): number {
  if (months <= 0) return 0
  return (pmt * (Math.pow(1 + MONTHLY_RATE, months) - 1)) / MONTHLY_RATE
}

export function monthsTo21(ageMonths: number): number {
  return Math.max(0, 252 - ageMonths)
}

export interface ProjectionResult {
  startToday: number
  waitOneYear: number
  costOfWaiting: number
}

export function calcProjections(monthly: number, ageMonths: number): ProjectionResult {
  const n = monthsTo21(ageMonths)
  const startToday = fv(monthly, n)
  const waitOneYear = fv(monthly, Math.max(0, n - 12))
  return { startToday, waitOneYear, costOfWaiting: startToday - waitOneYear }
}

export function formatGBP(n: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(n))
}

export function formatCompoundingTime(months: number): string {
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years === 0) return `${rem} month${rem !== 1 ? 's' : ''}`
  if (rem === 0) return `${years} year${years !== 1 ? 's' : ''}`
  return `${years} year${years !== 1 ? 's' : ''} and ${rem} month${rem !== 1 ? 's' : ''}`
}

export function dobToAgeMonths(day: string, month: string, year: string): number | null {
  const d = parseInt(day, 10)
  const m = parseInt(month, 10)
  const y = parseInt(year, 10)
  if (isNaN(d) || isNaN(m) || isNaN(y) || y < 1000) return null
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  const dob = new Date(y, m - 1, d)
  if (isNaN(dob.getTime()) || dob > new Date()) return null
  const today = new Date()
  let total = (today.getFullYear() - y) * 12 + (today.getMonth() - (m - 1))
  if (today.getDate() < d) total--
  if (total < 0 || total > 204) return null
  return total
}
