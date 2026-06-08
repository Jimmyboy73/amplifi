import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

interface ReferralStats {
  handle: string | null
  inviteCount: number
  pendingGbp: number
}

export function useReferralStats() {
  const { user, isLoading: authLoading } = useAuth()
  const [stats, setStats] = useState<ReferralStats>({ handle: null, inviteCount: 0, pendingGbp: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (!user) return
    // When RLS is re-enabled, add SELECT policies on referral_events and
    // referral_credits scoped to auth.uid().
    const [profileRes, eventsRes, creditsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('handle')
        .eq('id', user.id)
        .single(),
      supabase
        .from('referral_events')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_id', user.id),
      supabase
        .from('referral_credits')
        .select('amount_gbp')
        .eq('user_id', user.id)
        .neq('status', 'redeemed'),
    ])

    if (eventsRes.error || creditsRes.error) {
      setError(eventsRes.error?.message ?? creditsRes.error?.message ?? 'Error loading referral stats')
    } else {
      const handle = profileRes.data
        ? (profileRes.data as { handle: string | null }).handle ?? null
        : null
      const inviteCount = eventsRes.count ?? 0
      const pendingGbp = (creditsRes.data ?? []).reduce(
        (sum, r) => sum + (r.amount_gbp ?? 0),
        0,
      )
      setStats({ handle, inviteCount, pendingGbp })
    }

    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    void fetchStats()
  }, [user?.id, authLoading])

  return { ...stats, loading, error, refetch: fetchStats }
}
