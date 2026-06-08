import { supabase } from './supabase'

export type RedeemResult =
  | { ok: true }
  | { ok: false; error: string }

export async function redeemReferral(
  rawInput: string,
  currentUserId: string,
): Promise<RedeemResult> {
  const handle = rawInput.trim().replace(/^@/, '').toLowerCase()

  if (handle.length < 3) {
    return { ok: false, error: 'Handle must be at least 3 characters.' }
  }

  // Look up the profile by handle
  const { data: profile, error: lookupErr } = await supabase
    .from('profiles')
    .select('id')
    .ilike('handle', handle)
    .maybeSingle()

  if (lookupErr) {
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
  if (!profile) {
    return { ok: false, error: "We couldn't find that handle." }
  }

  if (profile.id === currentUserId) {
    return { ok: false, error: "That's your own handle!" }
  }

  const { data: existing, error: existErr } = await supabase
    .from('referral_events')
    .select('id')
    .eq('referred_id', currentUserId)
    .maybeSingle()

  if (existErr) {
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
  if (existing) {
    return { ok: false, error: "You've already used a referral." }
  }

  const { error: insertErr } = await supabase
    .from('referral_events')
    .insert({
      referrer_id: profile.id,
      referred_id: currentUserId,
      code_used: handle,
      status: 'pending',
    })

  if (insertErr) {
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }

  return { ok: true }
}
