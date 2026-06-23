// Money + bank-detail formatting shared across screens.

export function gbp(n: number, decimals = 2): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

/** Compact money for projection chips: £47k, £1.3m. */
export function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000
    return '£' + (m >= 10 ? Math.round(m) : m.toFixed(1)) + 'm'
  }
  if (value >= 1_000) {
    const k = value / 1_000
    return '£' + (k >= 10 ? Math.round(k) : k.toFixed(1)) + 'k'
  }
  return '£' + Math.round(value).toLocaleString()
}

/** Display sort code as XX-XX-XX from up to 6 raw digits. */
export function formatSortCode(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 6)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`
}

export function formatDob(dob: string): string {
  return new Date(dob).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Human-readable Supabase/PostgREST error — surfaces the real message and code
 * (e.g. a CHECK violation `23514`) instead of a generic "something went wrong".
 */
export function describeError(error: unknown): string {
  const e = error as { message?: string; code?: string; details?: string } | null
  const msg = e?.message || e?.details || 'Unknown error'
  return e?.code ? `${msg} (${e.code})` : msg
}

/** Whole months between a child's DOB and now. */
export function ageMonthsFromDob(dob: string): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  )
}
