import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import type { FamilyContribution, Frequency } from './types'

/**
 * The current user's contribution against a single connection (their own standing
 * order, self-reported). One active row per person per connection in practice.
 */
export function useContribution(connectionId: string | null, userId: string | null) {
  const [contribution, setContribution] = useState<FamilyContribution | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!connectionId || !userId) {
      setContribution(null)
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('family_contributions')
      .select('id, connection_id, user_id, child_id, amount_gbp, frequency, status, started_at, created_at, stopped_at')
      .eq('connection_id', connectionId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setContribution((data as FamilyContribution | null) ?? null)
    setLoading(false)
  }, [connectionId, userId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const log = useCallback(
    async (childId: string, amountGbp: number, frequency: Frequency) => {
      if (!connectionId || !userId) return { error: new Error('Not ready') }
      const { error } = await supabase.from('family_contributions').insert({
        connection_id: connectionId,
        user_id: userId,
        child_id: childId,
        amount_gbp: amountGbp,
        frequency,
        status: 'active',
      })
      if (!error) await refetch()
      return { error }
    },
    [connectionId, userId, refetch]
  )

  const update = useCallback(
    async (id: string, amountGbp: number, frequency: Frequency) => {
      const { error } = await supabase
        .from('family_contributions')
        .update({ amount_gbp: amountGbp, frequency })
        .eq('id', id)
      if (!error) await refetch()
      return { error }
    },
    [refetch]
  )

  const stop = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from('family_contributions')
        .update({ status: 'stopped', stopped_at: new Date().toISOString() })
        .eq('id', id)
      if (!error) await refetch()
      return { error }
    },
    [refetch]
  )

  return { contribution, loading, refetch, log, update, stop }
}

/**
 * Find-or-create the parent's "self" connection for a child so their own
 * contribution has a connection_id (family_contributions.connection_id is NOT NULL).
 *
 * relationship is left NULL: the family_connections CHECK only permits
 * grandparent/aunt/uncle/aunt_uncle/friend/other, so 'parent' would be rejected
 * (23514). The self-row is instead identified by requester_id === parent_id, which
 * is how the roster hooks exclude it from the contributor list.
 *
 * Reuses the existing row if present so the parent's second contribution doesn't
 * trip the unique (requester_id, child_id) index. Returns the real error so the UI
 * can surface it rather than failing silently.
 */
export async function ensureSelfConnection(
  userId: string,
  childId: string,
): Promise<{ id: string | null; error: unknown }> {
  const { data: existing, error: findError } = await supabase
    .from('family_connections')
    .select('id')
    .eq('parent_id', userId)
    .eq('requester_id', userId)
    .eq('child_id', childId)
    .maybeSingle()
  if (findError) return { id: null, error: findError }
  if (existing) return { id: (existing as { id: string }).id, error: null }

  const { data: created, error } = await supabase
    .from('family_connections')
    .insert({
      parent_id: userId,
      requester_id: userId,
      child_id: childId,
      status: 'approved',
      relationship: null,
    })
    .select('id')
    .single()
  if (created) return { id: (created as { id: string }).id, error: null }

  // Insert failed — most likely a concurrent create (StrictMode double-effect) hit the
  // unique (requester_id, child_id) index. Re-query before surfacing a real error.
  const { data: raced } = await supabase
    .from('family_connections')
    .select('id')
    .eq('parent_id', userId)
    .eq('requester_id', userId)
    .eq('child_id', childId)
    .maybeSingle()
  if (raced) return { id: (raced as { id: string }).id, error: null }

  return { id: null, error: error ?? new Error('Could not create self-connection') }
}
