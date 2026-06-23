import { supabase } from './supabase'

export type InviteRow = {
  id: string
  child_id: string
  parent_id: string
  requester_id: string | null
  status: string
  invited_name: string | null
  relationship: string | null
}

export type InviteContext = {
  invite: InviteRow
  childName: string
  parentName: string
}

/** Load an invite by id along with the child + parent names for the landing page. */
export async function loadInvite(inviteId: string): Promise<InviteContext | null> {
  const { data } = await supabase
    .from('family_connections')
    .select('id, child_id, parent_id, requester_id, status, invited_name, relationship')
    .eq('id', inviteId)
    .maybeSingle()
  if (!data) return null
  const invite = data as InviteRow

  const [{ data: child }, { data: parent }] = await Promise.all([
    supabase.from('children').select('name').eq('id', invite.child_id).maybeSingle(),
    supabase.from('profiles').select('full_name').eq('id', invite.parent_id).maybeSingle(),
  ])

  return {
    invite,
    childName: (child as { name: string } | null)?.name ?? 'their child',
    parentName: (parent as { full_name: string } | null)?.full_name ?? 'the family',
  }
}

/**
 * Claim an invite: the contributor becomes the requester and the connection is
 * auto-approved (no parent approval step). Idempotent for the same user.
 * Returns true if the connection now belongs to this user.
 */
export async function claimInvite(inviteId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('family_connections')
    .update({ requester_id: userId, status: 'approved' })
    .eq('id', inviteId)
    .eq('status', 'invited')
    .is('requester_id', null)
    .select('id')
    .maybeSingle()

  if (data) return true
  if (error) return false

  // Nothing updated — either already claimed by this user, or by someone else.
  const { data: existing } = await supabase
    .from('family_connections')
    .select('requester_id, status')
    .eq('id', inviteId)
    .maybeSingle()
  const row = existing as { requester_id: string | null; status: string } | null
  return !!row && row.requester_id === userId && row.status === 'approved'
}
