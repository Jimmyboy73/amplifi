import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

interface ReferralStats {
  inviteCount: number
  pendingGbp: number
}

export function useReferralStats() {
  const { user, isLoading: authLoading } = useAuth()
  const [stats, setStats] = useState<ReferralStats>({ inviteCount: 0, pendingGbp: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }

    // When RLS is re-enabled, add SELECT policies on referral_events and
    // referral_credits scoped to auth.uid().
    const fetchStats = async () => {
      const [eventsRes, creditsRes] = await Promise.all([
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
        const inviteCount = eventsRes.count ?? 0
        const pendingGbp = (creditsRes.data ?? []).reduce(
          (sum, r) => sum + (r.amount_gbp ?? 0),
          0,
        )
        setStats({ inviteCount, pendingGbp })
      }

      setLoading(false)
    }

    void fetchStats()
  }, [user?.id, authLoading])

  return { ...stats, loading, error }
}
