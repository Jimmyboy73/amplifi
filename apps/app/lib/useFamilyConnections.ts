import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

export type ContributorRow = {
  id: string
  name: string
  relationship: string | null
  avatar_color: string
  total_contributed: number
  last_active_at: string | null
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
  const [pending, setPending] = useState<PendingInviteRow[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!childId) { setLoading(false); return }
    setLoading(true)
    const [{ data: contribs }, { data: invites }] = await Promise.all([
      supabase
        .from('family_contributors')
        .select('id, name, relationship, avatar_color, total_contributed, last_active_at, joined_at')
        .eq('child_id', childId),
      supabase
        .from('family_invites')
        .select('id, invited_name, sent_to_email, sent_at')
        .eq('child_id', childId)
        .eq('status', 'pending'),
    ])
    setContributors((contribs ?? []) as ContributorRow[])
    setPending((invites ?? []) as PendingInviteRow[])
    setLoading(false)
  }, [childId])

  useEffect(() => { void refetch() }, [refetch])

  return { contributors, pending, loading, refetch }
}
