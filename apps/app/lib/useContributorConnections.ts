import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

export type ContributorConnection = {
  id: string
  status: 'pending' | 'approved'
  relationship: string | null
  childId: string
  childName: string
  parentId: string
  parentName: string
  parentHandle: string | null
}

export function useContributorConnections() {
  const { user } = useAuth()
  const [connections, setConnections] = useState<ContributorConnection[]>([])
  const [loading, setLoading] = useState(true)
  const hasLoaded = useRef(false)

  const refetch = useCallback(async () => {
    if (!user) { setLoading(false); return }
    if (!hasLoaded.current) setLoading(true)

    const { data: fcRows } = await supabase
      .from('family_connections')
      .select('id, status, relationship, child_id, parent_id')
      .eq('requester_id', user.id)
      .in('status', ['pending', 'approved'])

    if (!fcRows || fcRows.length === 0) {
      setConnections([])
      setLoading(false)
      hasLoaded.current = true
      return
    }

    const parentIds = [...new Set(fcRows.map(r => r.parent_id as string))]
    const approvedChildIds = fcRows
      .filter(r => r.status === 'approved')
      .map(r => r.child_id as string)

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, handle')
      .in('id', parentIds)

    let childMap: Record<string, string> = {}
    if (approvedChildIds.length > 0) {
      const { data: childrenData } = await supabase
        .from('children')
        .select('id, name')
        .in('id', approvedChildIds)
      childMap = Object.fromEntries((childrenData ?? []).map(c => [c.id as string, c.name as string]))
    }

    const profileMap = Object.fromEntries(
      (profiles ?? []).map(p => [
        p.id as string,
        p as { id: string; full_name: string; handle: string | null },
      ])
    )

    setConnections(
      fcRows.map(fc => ({
        id: fc.id as string,
        status: fc.status as 'pending' | 'approved',
        relationship: fc.relationship as string | null,
        childId: fc.child_id as string,
        childName: childMap[fc.child_id as string] ?? 'Unknown child',
        parentId: fc.parent_id as string,
        parentName: profileMap[fc.parent_id as string]?.full_name ?? 'Someone',
        parentHandle: profileMap[fc.parent_id as string]?.handle ?? null,
      }))
    )
    setLoading(false)
    hasLoaded.current = true
  }, [user?.id])

  useEffect(() => { void refetch() }, [refetch])

  return { connections, loading, refetch }
}
