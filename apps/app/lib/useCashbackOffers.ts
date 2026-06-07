import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// Future Sientia poll / Fidel webhook (Supabase Edge Function) will INSERT
// cashback_events rows; the matching trigger credits them — no change needed here.
// When RLS is re-enabled, cashback_offers + merchants need a public SELECT policy
// so unauthenticated and authenticated users can browse the broadcast view.

export interface CashbackOffer {
  id: string
  merchant_id: string | null
  reward_type: 'percentage' | 'fixed'
  reward_value: number
  active_from: string
  active_to: string
  // Supabase returns the joined relation under the table name
  merchants: {
    name: string
    category: string
    logo_url: string | null
  } | null
}

export function useCashbackOffers() {
  const [offers, setOffers] = useState<CashbackOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const now = new Date().toISOString()

    supabase
      .from('cashback_offers')
      .select('id, merchant_id, reward_type, reward_value, active_from, active_to, merchants(name, category, logo_url)')
      .eq('is_active', true)
      .lte('active_from', now)
      .gte('active_to', now)
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message)
        } else {
          setOffers((data ?? []) as CashbackOffer[])
        }
        setLoading(false)
      })
  }, [])

  return { offers, loading, error }
}
