import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

export type ContributorConnection = {
  id: string
  status: 'approved'
  relationship: string | null
  childId: string
  childName: string
  parentName: string
}

/**
 * Connections where the current user is the contributor (requester).
 * The web MVP auto-approves on claim, so we only surface 'approved' rows —
 * excluding the parent's own self-connection (requester_id === parent_id).
 */
export function useContributorConnections() {
  const { user } = useAuth()
  const [connections, setConnections] = useState<ContributorConnection[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!user) {
      setConnections([])
      setLoading(false)
      return
    }

    const { data: rows } = await supabase
      .from('family_connections')
      .select('id, status, relationship, child_id, parent_id')
      .eq('requester_id', user.id)
      .eq('status', 'approved')
      .neq('parent_id', user.id) // exclude the parent's own self-connection

    const fcRows = (rows as Array<{
      id: string
      status: string
      relationship: string | null
      child_id: string
      parent_id: string
    }> | null) ?? []

    if (fcRows.length === 0) {
      setConnections([])
      setLoading(false)
      return
    }

    const childIds = [...new Set(fcRows.map(r => r.child_id))]
    const parentIds = [...new Set(fcRows.map(r => r.parent_id))]

    const [{ data: childrenData }, { data: profiles }] = await Promise.all([
      supabase.from('children').select('id, name').in('id', childIds),
      supabase.from('profiles').select('id, full_name').in('id', parentIds),
    ])

    const childMap = Object.fromEntries(
      ((childrenData as Array<{ id: string; name: string }> | null) ?? []).map(c => [c.id, c.name])
    )
    const parentMap = Object.fromEntries(
      ((profiles as Array<{ id: string; full_name: string }> | null) ?? []).map(p => [p.id, p.full_name])
    )

    setConnections(
      fcRows.map(r => ({
        id: r.id,
        status: 'approved' as const,
        relationship: r.relationship,
        childId: r.child_id,
        childName: childMap[r.child_id] ?? 'their child',
        parentName: parentMap[r.parent_id] ?? 'the family',
      }))
    )
    setLoading(false)
  }, [user])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { connections, loading, refetch }
}
