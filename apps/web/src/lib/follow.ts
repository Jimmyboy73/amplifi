import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { ageMonthsFromDob } from './format'
import type { Frequency } from './types'

// Grandparent "follow the child" data access. All reads go through get_followed_children,
// which returns ONLY children the signed-in user has actually pledged to (aggregate figures,
// never other contributors' individual rows). claim_pledges_for_user links pledges made
// before signup to the new account by matching email.

export type FollowedChild = {
  childId: string
  childName: string
  accountOpen: boolean
  ageMonths: number | null
  householdMonthly: number // £/month, aggregate of the whole household
  occasionsGbpYear: number
  myAmountPennies: number | null
  myFrequency: Frequency | null
  myStatus: string | null
  payin: { providerName: string | null; sortCode: string; accountNumber: string; reference: string } | null
}

type FollowedRow = {
  child_id: string
  child_name: string
  account_open: boolean
  date_of_birth: string | null
  approx_age_months: number | null
  household_monthly_pennies: number | null
  occasions_gbp_year: number | null
  my_amount_pennies: number | null
  my_frequency: Frequency | null
  my_status: string | null
  provider_name: string | null
  sort_code: string | null
  account_number: string | null
  payment_reference: string | null
}

export async function loadFollowedChildren(): Promise<FollowedChild[]> {
  const { data, error } = await supabase.rpc('get_followed_children')
  if (error || !data) return []
  return (data as FollowedRow[]).map((r) => ({
    childId: r.child_id,
    childName: r.child_name,
    accountOpen: r.account_open,
    ageMonths: ageMonthsFromDob(r.date_of_birth) ?? r.approx_age_months ?? null,
    householdMonthly: Number(r.household_monthly_pennies ?? 0) / 100,
    occasionsGbpYear: Number(r.occasions_gbp_year ?? 0),
    myAmountPennies: r.my_amount_pennies,
    myFrequency: r.my_frequency,
    myStatus: r.my_status,
    payin:
      r.account_open && r.sort_code && r.account_number
        ? {
            providerName: r.provider_name,
            sortCode: r.sort_code,
            accountNumber: r.account_number,
            reference: r.payment_reference ?? '',
          }
        : null,
  }))
}

/**
 * Link pledges made before signup to this account. Pass the status token they signed up
 * from so the pledge behind it links directly; other pledges match by email. Returns the
 * number of children now followed.
 */
export async function claimPledgesForUser(token?: string, giftId?: string): Promise<number> {
  const { data, error } = await supabase.rpc('claim_pledges_for_user', {
    p_token: token ?? null,
    p_gift_id: giftId ?? null,
  })
  if (error || data == null) return 0
  return data as number
}

/** Hook: the children the signed-in user follows (used by Root to route + the dashboard). */
export function useFollowedChildren() {
  const [followed, setFollowed] = useState<FollowedChild[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let live = true
    void loadFollowedChildren().then((list) => {
      if (live) {
        setFollowed(list)
        setLoading(false)
      }
    })
    return () => {
      live = false
    }
  }, [])
  return { followed, loading }
}
