import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { computePot } from './computePot'
import type { FamilyContribution } from './types'

/**
 * The Pot for a child = sum of ALL active family_contributions for that child
 * (the parent's own self-row + every contributor's), via computePot.
 */
export function usePot(childId: string | null) {
  const [contributions, setContributions] = useState<FamilyContribution[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!childId) {
      setContributions([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('family_contributions')
      .select('id, connection_id, user_id, child_id, amount_gbp, frequency, status, started_at, created_at, stopped_at')
      .eq('child_id', childId)
      .eq('status', 'active')
    setContributions((data as FamilyContribution[] | null) ?? [])
    setLoading(false)
  }, [childId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { pot: computePot(contributions), contributions, loading, refetch }
}
