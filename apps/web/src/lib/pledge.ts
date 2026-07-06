import { supabase } from './supabase'
import { gbp } from './format'
import type { Frequency } from './types'

// Pledge / invite data access. All writes and the unauthenticated accept-screen read go
// through SECURITY DEFINER RPCs (see supabase/migrations/20260705120000_...), so the share
// link only ever carries the opaque token and the pledger's email is never exposed.
//
// Tables behind these RPCs are `family_pledges` / `family_pledge_invites` — NOT the
// pre-existing `pledges` (wishlist gifts) or legacy `family_invites`. The app only ever
// touches them via the RPC names below, so no table name appears in client code.

export type InviteDirection = 'pledge_to_parent' | 'invite_to_family'

/** Shape returned by get_invite_by_token — deliberately excludes the pledger's email. */
export type InviteSummary = {
  inviteId: string
  direction: InviteDirection
  childName: string
  senderFirstName: string
  amountPennies: number | null
  frequency: Frequency | null
  personalMessage: string | null
  status: 'pending' | 'opened' | 'accepted' | 'expired'
  expired: boolean
}

type InviteRpcRow = {
  invite_id: string
  direction: InviteDirection
  child_display_name: string
  sender_first_name: string
  amount_pennies: number | null
  frequency: Frequency | null
  personal_message: string | null
  status: InviteSummary['status']
  expired: boolean
}

/** Resolve an invite token to its accept-screen summary (public / unauthenticated). */
export async function loadInviteByToken(token: string): Promise<InviteSummary | null> {
  const { data, error } = await supabase.rpc('get_pledge_invite', { p_token: token })
  if (error || !data || (data as InviteRpcRow[]).length === 0) return null
  const row = (data as InviteRpcRow[])[0]
  return {
    inviteId: row.invite_id,
    direction: row.direction,
    childName: row.child_display_name,
    senderFirstName: row.sender_first_name,
    amountPennies: row.amount_pennies,
    frequency: row.frequency,
    personalMessage: row.personal_message,
    status: row.status,
    expired: row.expired,
  }
}

/**
 * Attach the signed-in parent to the child the token points to (claims children.owner_id
 * and marks the invite accepted, server-side). Returns the child_id, or null on failure
 * (not authenticated, expired, or already claimed by another account).
 */
export async function acceptPledgeInvite(token: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('accept_pledge_invite', { p_token: token })
  if (error || !data) return null
  return data as string
}

/** F-STATUS view keyed by token — includes display-only pay-in details once open. */
export type PledgeStatusView = {
  childName: string
  amountPennies: number | null
  frequency: Frequency | null
  personalMessage: string | null
  inviteStatus: 'pending' | 'opened' | 'accepted' | 'expired'
  accountOpen: boolean
  payin: {
    providerName: string | null
    sortCode: string
    accountNumber: string
    reference: string
  } | null
}

type PayinRpcRow = {
  child_display_name: string
  amount_pennies: number | null
  frequency: Frequency | null
  personal_message: string | null
  invite_status: PledgeStatusView['inviteStatus']
  account_status: 'no_account' | 'account_open'
  provider_name: string | null
  sort_code: string | null
  account_number: string | null
  payment_reference: string | null
}

/** Load the grandparent's status view (contribution, message, and — once open — pay-in). */
export async function loadPledgePayin(token: string): Promise<PledgeStatusView | null> {
  const { data, error } = await supabase.rpc('get_pledge_payin', { p_token: token })
  if (error || !data || (data as PayinRpcRow[]).length === 0) return null
  const r = (data as PayinRpcRow[])[0]
  const open = r.account_status === 'account_open'
  return {
    childName: r.child_display_name,
    amountPennies: r.amount_pennies,
    frequency: r.frequency,
    personalMessage: r.personal_message,
    inviteStatus: r.invite_status,
    accountOpen: open,
    payin:
      open && r.sort_code && r.account_number
        ? {
            providerName: r.provider_name,
            sortCode: r.sort_code,
            accountNumber: r.account_number,
            reference: r.payment_reference ?? '',
          }
        : null,
  }
}

/** Parent confirms the child's account — the trigger that links pledges. Returns success. */
export async function confirmChildAccount(childId: string): Promise<boolean> {
  const { error } = await supabase.rpc('confirm_child_account', { p_child_id: childId })
  return !error
}

/** Best-effort: flip a freshly-opened invite pending → opened. Never throws. */
export async function markInviteOpened(token: string): Promise<void> {
  try {
    await supabase.rpc('mark_pledge_invite_opened', { p_token: token })
  } catch {
    // Non-critical — a missed status bump must never break the accept screen.
  }
}

export type CreatePledgeInput = {
  childName: string
  approxAgeMonths?: number | null
  amountPennies: number
  frequency: Frequency
  startTrigger: 'now' | 'next_birthday' | 'on_account_open' | 'custom_date'
  customStartDate?: string | null
  personalMessage: string
  pledgerName: string
  pledgerEmail: string
  relationship: 'grandparent' | 'other' | 'friend'
  channel: 'whatsapp' | 'email' | 'copy_link'
  recipientEmail?: string | null
}

/**
 * Persist a pledge + child + invite server-side and return the opaque token.
 * Under Option A this runs with NO authenticated user — the pledge exists in full
 * before the family member has an account, so the parent's link works immediately.
 */
export async function createPledge(input: CreatePledgeInput): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_family_pledge', {
    p_child_name: input.childName,
    p_amount_pennies: input.amountPennies,
    p_frequency: input.frequency,
    p_start_trigger: input.startTrigger,
    p_personal_message: input.personalMessage,
    p_pledger_name: input.pledgerName,
    p_pledger_email: input.pledgerEmail,
    p_relationship: input.relationship,
    p_channel: input.channel,
    p_approx_age_months: input.approxAgeMonths ?? null,
    p_custom_start_date: input.customStartDate ?? null,
    p_recipient_email: input.recipientEmail ?? null,
  })
  if (error || !data) return null
  return data as string // the token
}

/** A pledge for the parent's child, for the pot + family roster (no email). */
export type ChildPledge = {
  id: string
  pledgerName: string | null
  relationship: string | null
  amountPennies: number
  frequency: Frequency
  status: string
  linkedAt: string | null
}

type ChildPledgeRow = {
  id: string
  pledger_name: string | null
  relationship: string | null
  amount_pennies: number
  frequency: Frequency
  status: string
  linked_at: string | null
}

/** Load the pledges for a child the caller owns (auth-gated RPC; excludes email). */
export async function loadChildPledges(childId: string): Promise<ChildPledge[]> {
  const { data, error } = await supabase.rpc('get_child_pledges', { p_child_id: childId })
  if (error || !data) return []
  return (data as ChildPledgeRow[]).map((r) => ({
    id: r.id,
    pledgerName: r.pledger_name,
    relationship: r.relationship,
    amountPennies: r.amount_pennies,
    frequency: r.frequency,
    status: r.status,
    linkedAt: r.linked_at,
  }))
}

/** P6: parent mints an invite_to_family token for their child. Returns the token. */
export async function createFamilyInvite(
  childId: string,
  channel: 'whatsapp' | 'email' | 'copy_link',
  recipientEmail?: string | null
): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_family_invite', {
    p_child_id: childId,
    p_channel: channel,
    p_recipient_email: recipientEmail ?? null,
  })
  if (error || !data) return null
  return data as string
}

export type PledgeForChildInput = {
  amountPennies: number
  frequency: Frequency
  startTrigger: 'now' | 'next_birthday' | 'on_account_open' | 'custom_date'
  customStartDate?: string | null
  personalMessage: string
  pledgerName: string
  pledgerEmail: string
  relationship: 'grandparent' | 'other' | 'friend'
}

/**
 * F-ACCEPT: a family member pledges to the EXISTING child behind an invite_to_family
 * token (never a duplicate). Returns a fresh token for the pledger's status page.
 */
export async function createPledgeForChild(
  token: string,
  input: PledgeForChildInput
): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_pledge_for_child', {
    p_token: token,
    p_amount_pennies: input.amountPennies,
    p_frequency: input.frequency,
    p_start_trigger: input.startTrigger,
    p_personal_message: input.personalMessage,
    p_pledger_name: input.pledgerName,
    p_pledger_email: input.pledgerEmail,
    p_relationship: input.relationship,
    p_custom_start_date: input.customStartDate ?? null,
  })
  if (error || !data) return null
  return data as string
}

/**
 * Fire a Resend transactional email via the send-pledge-email Edge Function. Best-effort:
 * never throws and never blocks the flow (mirrors maybeSendWelcomeEmail). The function
 * derives the recipient + template server-side from the token / childId — the browser never
 * passes an address or body, so it can't be used as an open relay.
 */
export async function sendPledgeEmail(body: {
  kind: 'pledge_to_parent' | 'invite_to_family' | 'account_open'
  token?: string
  childId?: string
}): Promise<void> {
  try {
    await supabase.functions.invoke('send-pledge-email', { body })
  } catch {
    // Best-effort — a failed email must never break the pledge flow.
  }
}

/** The share URL for an invite token — carries the opaque token ONLY, no PII. */
export function inviteUrl(token: string): string {
  return `${window.location.origin}/i/${token}`
}

/**
 * "£10 a week" / "£25 a month" / "£50 one-off" — the CONTRIBUTION, never a projected
 * outcome (spec §10). Whole pounds; returns null if either part is missing.
 */
export function contributionLabel(
  amountPennies: number | null,
  frequency: Frequency | null
): string | null {
  if (!amountPennies || !frequency) return null
  const amt = gbp(amountPennies / 100, 0)
  if (frequency === 'weekly') return `${amt} a week`
  if (frequency === 'monthly') return `${amt} a month`
  return `${amt} one-off`
}
