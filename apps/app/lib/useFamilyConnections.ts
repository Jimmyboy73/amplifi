import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

export type ContributorRow = {
  id: string
  requester_id: string
  name: string
  handle: string | null
  relationship: string | null
  joined_at: string
}

export type PendingInviteRow = {
  id: string
  invited_name: string
  sent_to_email: string
  sent_at: string
}

export function useFamilyConnections(childId: string | null) {
  const [contributors, setContributors] = useState<ContributorRow[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!childId) { setLoading(false); return }
    setLoading(true)

    const { data: conns } = await supabase
      .from('family_connections')
      .select('id, requester_id, relationship, created_at')
      .eq('child_id', childId)
      .eq('status', 'approved')

    if (!conns?.length) {
      setContributors([])
      setLoading(false)
      return
    }

    const ids = (conns as Array<{ requester_id: string }>).map(c => c.requester_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, handle')
      .in('id', ids)

    const pm = Object.fromEntries(
      (profiles ?? []).map(p => [
        (p as { id: string; full_name: string; handle: string | null }).id,
        p as { id: string; full_name: string; handle: string | null },
      ])
    )

    setContributors(
      (conns as Array<{ id: string; requester_id: string; relationship: string | null; created_at: string }>)
        .map(c => ({
          id: c.id,
          requester_id: c.requester_id,
          name: pm[c.requester_id]?.full_name ?? 'Unknown',
          handle: pm[c.requester_id]?.handle ?? null,
          relationship: c.relationship,
          joined_at: c.created_at,
        }))
    )
    setLoading(false)
  }, [childId])

  useEffect(() => { void refetch() }, [refetch])

  return { contributors, pending: [] as PendingInviteRow[], loading, refetch }
}
