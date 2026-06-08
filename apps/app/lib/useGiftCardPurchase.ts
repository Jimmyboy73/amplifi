import { useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'
import type { GiftCardBrand } from './useGiftCardBrands'

export type PurchaseResult =
  | { ok: true; giftCardCode: string; cashbackGbp: number }
  | { ok: false; error: string }

export function useGiftCardPurchase() {
  const { user } = useAuth()
  const [purchasing, setPurchasing] = useState(false)

  const purchase = async (params: {
    brand: GiftCardBrand
    amountGbp: number
    childId: string
  }): Promise<PurchaseResult> => {
    if (!user) return { ok: false, error: 'Not signed in' }

    setPurchasing(true)

    try {
      const cashbackGbp =
        Math.round(params.amountGbp * params.brand.cashback_percentage / 100 * 100) / 100

      const fakeCode = `DEMO-${rand4()}-${rand4()}`

      // Insert with cashback_gbp pre-set. The BEFORE INSERT trigger finds no matching
      // cashback_offer (gift_card_brands is separate from merchants) so it leaves
      // cashback_gbp untouched. The AFTER INSERT trigger then creates the credit.
      const { data: event, error: eventErr } = await supabase
        .from('cashback_events')
        .insert({
          user_id: user.id,
          provider: 'gift_card',
          merchant_name: params.brand.name,
          amount_gbp: params.amountGbp,
          cashback_gbp: cashbackGbp,
          status: 'pending',
          raw: { brand_id: params.brand.id, brand_slug: params.brand.slug },
        })
        .select('id')
        .single()

      if (eventErr) return { ok: false, error: eventErr.message }

      const { error: orderErr } = await supabase.from('gift_card_orders').insert({
        user_id: user.id,
        child_id: params.childId,
        brand_id: params.brand.id,
        amount_gbp: params.amountGbp,
        cashback_gbp: cashbackGbp,
        status: 'completed',
        gift_card_code: fakeCode,
        cashback_event_id: event.id,
      })

      if (orderErr) return { ok: false, error: orderErr.message }

      return { ok: true, giftCardCode: fakeCode, cashbackGbp }
    } catch (e) {
      return { ok: false, error: String(e) }
    } finally {
      setPurchasing(false)
    }
  }

  return { purchase, purchasing }
}

function rand4(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase()
}
