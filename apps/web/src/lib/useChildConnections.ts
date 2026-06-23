import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

export type ContributorRow = {
  id: string
  name: string
  relationship: string | null
}

export type InvitedRow = {
  id: string
  invited_name: string | null
  relationship: string | null
  created_at: string
}

/**
 * Roster for a child: connected contributors (approved, excluding the parent's
 * own self-row) and outstanding named invites (status 'invited').
 */
export function useChildConnections(childId: string | null) {
  const [contributors, setContributors] = useState<ContributorRow[]>([])
  const [invited, setInvited] = useState<InvitedRow[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!childId) {
      setContributors([])
      setInvited([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('family_connections')
      .select('id, requester_id, parent_id, relationship, invited_name, status, created_at')
      .eq('child_id', childId)
      .in('status', ['invited', 'approved'])

    const rows = (data as Array<{
      id: string
      requester_id: string | null
      parent_id: string | null
      relationship: string | null
      invited_name: string | null
      status: string
      created_at: string
    }> | null) ?? []

    setInvited(
      rows
        .filter((r) => r.status === 'invited')
        .map((r) => ({
          id: r.id,
          invited_name: r.invited_name,
          relationship: r.relationship,
          created_at: r.created_at,
        }))
    )

    // Exclude the parent's own self-connection (requester_id === parent_id).
    const approved = rows.filter(
      (r) => r.status === 'approved' && r.requester_id && r.requester_id !== r.parent_id
    )
    if (approved.length === 0) {
      setContributors([])
      setLoading(false)
      return
    }

    const ids = approved.map((r) => r.requester_id as string)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', ids)
    const nameMap = Object.fromEntries(
      ((profiles as Array<{ id: string; full_name: string }> | null) ?? []).map((p) => [p.id, p.full_name])
    )

    setContributors(
      approved.map((r) => ({
        id: r.id,
        name: nameMap[r.requester_id as string] ?? 'Family member',
        relationship: r.relationship,
      }))
    )
    setLoading(false)
  }, [childId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { contributors, invited, loading, refetch }
}
