import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

// Future Sientia poll / Fidel webhook (Supabase Edge Function) will INSERT
// cashback_events rows; the matching trigger credits them — no change needed here.
// When RLS is re-enabled, add SELECT WHERE user_id = auth.uid() on cashback_credits.

export function useCashbackBalance() {
  const { user, isLoading: authLoading } = useAuth()
  const [pendingGbp, setPendingGbp] = useState(0)
  const [redeemableGbp, setRedeemableGbp] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }

    supabase
      .from('cashback_credits')
      .select('amount_gbp, status')
      .eq('user_id', user.id)
      .in('status', ['pending', 'redeemable'])
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message)
        } else {
          const rows = data ?? []
          setPendingGbp(
            rows
              .filter((r) => r.status === 'pending')
              .reduce((sum, r) => sum + (r.amount_gbp ?? 0), 0),
          )
          setRedeemableGbp(
            rows
              .filter((r) => r.status === 'redeemable')
              .reduce((sum, r) => sum + (r.amount_gbp ?? 0), 0),
          )
        }
        setLoading(false)
      })
  }, [user?.id, authLoading])

  return { pendingGbp, redeemableGbp, loading, error }
}
