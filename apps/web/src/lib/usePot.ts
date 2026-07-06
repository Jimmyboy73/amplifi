import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { computePot } from './computePot'
import { loadChildPledges, type ChildPledge } from './pledge'
import type { FamilyContribution } from './types'

/**
 * The Pot for a child = the parent's own family_contributions (their self-logged standing
 * orders) + every LINKED family_pledge from family members (accrued from linked_at), via
 * computePot. Also returns the pledges themselves so the family roster can render them.
 *
 * Contributions live on a non-RLS table (read directly); pledges come through the
 * get_child_pledges RPC (family_pledges has RLS + we exclude email).
 */
export function usePot(childId: string | null) {
  const [contributions, setContributions] = useState<FamilyContribution[]>([])
  const [pledges, setPledges] = useState<ChildPledge[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!childId) {
      setContributions([])
      setPledges([])
      setLoading(false)
      return
    }
    const [{ data: contribData }, pledgeData] = await Promise.all([
      supabase
        .from('family_contributions')
        .select('id, connection_id, user_id, child_id, amount_gbp, frequency, status, started_at, created_at, stopped_at')
        .eq('child_id', childId)
        .in('status', ['active', 'stopped']),
      loadChildPledges(childId),
    ])
    setContributions((contribData as FamilyContribution[] | null) ?? [])
    setPledges(pledgeData)
    setLoading(false)
  }, [childId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { pot: computePot(contributions, pledges), contributions, pledges, loading, refetch }
}
