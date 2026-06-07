import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

export function useReferralCode() {
  const { user, isLoading: authLoading } = useAuth()
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Wait for AuthProvider to finish restoring the session before querying.
    // If we fire before this, auth.uid() is null on the server and RLS blocks the read.
    if (authLoading) return

    if (!user) {
      setLoading(false)
      return
    }

    console.log('[useReferralCode] querying for user.id:', user.id)

    supabase
      .from('referral_codes')
      .select('code')
      .eq('user_id', user.id)
      .single()
      .then(({ data, error: err }) => {
        console.log('[useReferralCode] data:', data, '| error:', err?.message ?? null)
        if (err) {
          setError(err.message)
          console.log('[useReferralCode] final code: null (query error)')
        } else {
          const resolved = data?.code ?? null
          console.log('[useReferralCode] final code:', resolved)
          setCode(resolved)
        }
        setLoading(false)
      })
  }, [user?.id, authLoading])

  return { code, loading, error }
}
