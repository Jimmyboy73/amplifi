import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

// ── Types ─────────────────────────────────────────────────────────────────────

export type FamilyContribution = {
  id: string
  amount_gbp: number
  frequency: 'weekly' | 'monthly' | 'one_off'
  status: 'active' | 'stopped'
  created_at: string
  stopped_at: string | null
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFamilyContributions(connectionId: string | null) {
  const { user } = useAuth()
  const [contributions, setContributions] = useState<FamilyContribution[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!connectionId) { setLoading(false); return }
    const { data } = await supabase
      .from('family_contributions' as never)
      .select('id, amount_gbp, frequency, status, created_at, stopped_at')
      .eq('connection_id', connectionId)
      .order('created_at', { ascending: false })
    setContributions((data ?? []) as FamilyContribution[])
    setLoading(false)
  }, [connectionId])

  useEffect(() => { void refetch() }, [refetch])

  const logContribution = useCallback(async (params: {
    childId: string
    amountGbp: number
    frequency: string
  }): Promise<{ error: Error | null }> => {
    if (!user || !connectionId) return { error: new Error('Not authenticated') }
    const { error } = await supabase
      .from('family_contributions' as never)
      .insert({
        connection_id: connectionId,
        user_id: user.id,
        child_id: params.childId,
        amount_gbp: params.amountGbp,
        frequency: params.frequency,
        status: 'active',
      } as never)
    if (!error) await refetch()
    return { error: error as unknown as Error | null }
  }, [user?.id, connectionId, refetch])

  const updateContribution = useCallback(async (
    id: string,
    params: { amountGbp?: number; frequency?: string }
  ): Promise<{ error: Error | null }> => {
    const updates: Record<string, unknown> = {}
    if (params.amountGbp !== undefined) updates.amount_gbp = params.amountGbp
    if (params.frequency !== undefined) updates.frequency = params.frequency
    const { error } = await supabase
      .from('family_contributions' as never)
      .update(updates as never)
      .eq('id', id)
    if (!error) await refetch()
    return { error: error as unknown as Error | null }
  }, [refetch])

  const stopContribution = useCallback(async (id: string): Promise<{ error: Error | null }> => {
    const { error } = await supabase
      .from('family_contributions' as never)
      .update({ status: 'stopped', stopped_at: new Date().toISOString() } as never)
      .eq('id', id)
    if (!error) await refetch()
    return { error: error as unknown as Error | null }
  }, [refetch])

  return { contributions, loading, refetch, logContribution, updateContribution, stopContribution }
}
