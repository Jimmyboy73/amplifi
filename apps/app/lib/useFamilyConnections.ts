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

export type InvitedRow = {
  id: string
  invited_name: string | null
  relationship: string | null
  created_at: string
}

export function useFamilyConnections(childId: string | null) {
  const [contributors, setContributors] = useState<ContributorRow[]>([])
  const [invited, setInvited] = useState<InvitedRow[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!childId) { setLoading(false); return }
    setLoading(true)

    const { data: conns } = await supabase
      .from('family_connections')
      .select('id, requester_id, relationship, created_at, status, invited_name')
      .eq('child_id', childId)
      .in('status', ['invited', 'approved'])

    if (!conns?.length) {
      setContributors([])
      setInvited([])
      setLoading(false)
      return
    }

    const rows = conns as Array<{
      id: string
      requester_id: string | null
      relationship: string | null
      created_at: string
      status: string
      invited_name: string | null
    }>

    setInvited(
      rows
        .filter(r => r.status === 'invited')
        .map(r => ({
          id: r.id,
          invited_name: r.invited_name,
          relationship: r.relationship,
          created_at: r.created_at,
        }))
    )

    const approvedRows = rows.filter(r => r.status === 'approved' && r.requester_id)
    if (!approvedRows.length) {
      setContributors([])
      setLoading(false)
      return
    }

    const ids = approvedRows.map(r => r.requester_id as string)
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
      approvedRows.map(r => ({
        id: r.id,
        requester_id: r.requester_id as string,
        name: pm[r.requester_id as string]?.full_name ?? 'Unknown',
        handle: pm[r.requester_id as string]?.handle ?? null,
        relationship: r.relationship,
        joined_at: r.created_at,
      }))
    )
    setLoading(false)
  }, [childId])

  useEffect(() => { void refetch() }, [refetch])

  return { contributors, invited, loading, refetch }
}
