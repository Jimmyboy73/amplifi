import { supabase } from './supabase'

// Occasions data access — all via SECURITY DEFINER RPCs (the tables have RLS on with no
// table policies, so the client never touches them directly). Mirrors lib/pledge.ts.

export type OccasionType = 'birthday' | 'christmas' | 'milestone' | 'other'

export type Occasion = {
  id: string
  title: string
  occasionType: string
  occasionDate: string | null
  status: string
  targetGbp: number | null
  shareToken: string
  totalGifted: number
  giftCount: number
  createdAt: string
}

type OccasionRow = {
  id: string
  title: string
  occasion_type: string
  occasion_date: string | null
  status: string
  target_gbp: number | null
  share_token: string
  total_gifted: number | string
  gift_count: number
  created_at: string
}

/** The parent's gifting moments for a child they own, with running totals. */
export async function loadChildOccasions(childId: string): Promise<Occasion[]> {
  const { data, error } = await supabase.rpc('get_child_occasions', { p_child_id: childId })
  if (error || !data) return []
  return (data as OccasionRow[]).map((r) => ({
    id: r.id,
    title: r.title,
    occasionType: r.occasion_type,
    occasionDate: r.occasion_date,
    status: r.status,
    targetGbp: r.target_gbp === null ? null : Number(r.target_gbp),
    shareToken: r.share_token,
    totalGifted: Number(r.total_gifted),
    giftCount: r.gift_count,
    createdAt: r.created_at,
  }))
}

/** Open a gifting moment. Returns the opaque share token, or null on failure. */
export async function createOccasion(input: {
  childId: string
  title: string
  type: OccasionType
  date?: string | null
  target?: number | null
}): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_occasion', {
    p_child_id: input.childId,
    p_title: input.title,
    p_type: input.type,
    p_occasion_date: input.date ?? null,
    p_target_gbp: input.target ?? null,
  })
  if (error || !data) return null
  return data as string
}

export type OccasionGift = {
  id: string
  gifterName: string
  amountGbp: number
  message: string | null
  status: string
  createdAt: string
}

type OccasionGiftRow = {
  id: string
  gifter_name: string
  amount_gbp: number | string
  message: string | null
  status: string
  created_at: string
}

/** Who has gifted to one of the parent's moments (owner-gated; no emails). */
export async function loadOccasionGifts(occasionId: string): Promise<OccasionGift[]> {
  const { data, error } = await supabase.rpc('get_occasion_gifts', { p_occasion_id: occasionId })
  if (error || !data) return []
  return (data as OccasionGiftRow[]).map((r) => ({
    id: r.id,
    gifterName: r.gifter_name,
    amountGbp: Number(r.amount_gbp),
    message: r.message,
    status: r.status,
    createdAt: r.created_at,
  }))
}

export type OccasionPublic = {
  occasionId: string
  title: string
  occasionType: string
  occasionDate: string | null
  status: string
  childName: string
  targetGbp: number | null
  totalGifted: number
  giftCount: number
  accountReady: boolean
  providerName: string | null
  sortCode: string | null
  accountNumber: string | null
  reference: string | null
}

type OccasionPublicRow = {
  occasion_id: string
  title: string
  occasion_type: string
  occasion_date: string | null
  status: string
  child_name: string
  target_gbp: number | null
  total_gifted: number | string
  gift_count: number
  account_ready: boolean
  provider_name: string | null
  sort_code: string | null
  account_number: string | null
  payment_reference: string | null
}

/** Public (no-login) read of a moment by its share token. */
export async function loadOccasionByToken(token: string): Promise<OccasionPublic | null> {
  const { data, error } = await supabase.rpc('get_occasion_by_token', { p_token: token })
  if (error || !data || (data as OccasionPublicRow[]).length === 0) return null
  const r = (data as OccasionPublicRow[])[0]
  return {
    occasionId: r.occasion_id,
    title: r.title,
    occasionType: r.occasion_type,
    occasionDate: r.occasion_date,
    status: r.status,
    childName: r.child_name,
    targetGbp: r.target_gbp === null ? null : Number(r.target_gbp),
    totalGifted: Number(r.total_gifted),
    giftCount: r.gift_count,
    accountReady: Boolean(r.account_ready),
    providerName: r.provider_name,
    sortCode: r.sort_code,
    accountNumber: r.account_number,
    reference: r.payment_reference,
  }
}

/** Public (no-login) gift from the share page. Returns the gift id, or null on failure. */
export async function createOccasionGift(input: {
  token: string
  gifterName: string
  amountGbp: number
  email?: string | null
  message?: string | null
}): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_occasion_gift', {
    p_token: input.token,
    p_gifter_name: input.gifterName,
    p_amount_gbp: input.amountGbp,
    p_gifter_email: input.email ?? null,
    p_message: input.message ?? null,
  })
  if (error || !data) return null
  return data as string
}

/** The public share URL for a moment — carries the opaque token only. */
export function occasionShareUrl(token: string): string {
  return `${window.location.origin}/gift/${token}`
}

export const OCCASION_EMOJI: Record<string, string> = {
  birthday: '🎂',
  christmas: '🎄',
  milestone: '🌟',
  other: '🎁',
}
