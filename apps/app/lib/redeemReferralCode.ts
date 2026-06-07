import { supabase } from './supabase'

export type RedeemResult =
  | { ok: true }
  | { ok: false; error: string }

// When RLS is re-enabled:
// - referral_codes needs a SELECT policy allowing any authenticated user to look
//   up a row by code value (e.g. via a SECURITY DEFINER function, or a policy
//   "for select using (true)" scoped to authenticated role).
// - referral_events needs an INSERT policy: "for insert with check (referred_id = auth.uid())".
export async function redeemReferralCode(
  rawCode: string,
  currentUserId: string,
): Promise<RedeemResult> {
  const code = rawCode.trim().toUpperCase()

  if (code.length !== 5) {
    return { ok: false, error: 'Referral codes are 5 characters long.' }
  }

  // Verify the code exists and get the owner
  const { data: codeRow, error: lookupErr } = await supabase
    .from('referral_codes')
    .select('user_id')
    .eq('code', code)
    .maybeSingle()

  if (lookupErr) {
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
  if (!codeRow) {
    return { ok: false, error: "We couldn't find that code." }
  }

  // Prevent using own code
  if (codeRow.user_id === currentUserId) {
    return { ok: false, error: "That's your own code — share it with a friend!" }
  }

  // Prevent double-referral
  const { data: existing, error: existErr } = await supabase
    .from('referral_events')
    .select('id')
    .eq('referred_id', currentUserId)
    .maybeSingle()

  if (existErr) {
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
  if (existing) {
    return { ok: false, error: "You've already used a referral code." }
  }

  // Insert the event; pending credits are created downstream (not via app code)
  const { error: insertErr } = await supabase
    .from('referral_events')
    .insert({
      referrer_id: codeRow.user_id,
      referred_id: currentUserId,
      code_used: code,
      status: 'pending',
    })

  if (insertErr) {
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }

  return { ok: true }
}
