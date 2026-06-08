import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export interface GiftCardBrand {
  id: string
  name: string
  slug: string
  category: string
  logo_url: string | null
  cashback_percentage: number
  min_amount_gbp: number
  max_amount_gbp: number
}

export function useGiftCardBrands() {
  const [brands, setBrands] = useState<GiftCardBrand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('gift_card_brands')
      .select('id, name, slug, category, logo_url, cashback_percentage, min_amount_gbp, max_amount_gbp')
      .eq('is_active', true)
      .order('name')
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setBrands((data as GiftCardBrand[]) ?? [])
        setLoading(false)
      })
  }, [])

  return { brands, loading, error }
}
