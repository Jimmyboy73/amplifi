import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Pill } from './ui'
import { RELATIONSHIPS, RELATIONSHIP_DB } from '../lib/types'

function buildInviteMessage(inviteName: string, childName: string, url: string): string {
  const hi = inviteName ? `Hi ${inviteName}! ` : ''
  return `${hi}I've started building a savings pot for ${childName} — I'd love for you to be part of it 💙\n\nTap here to see how: ${url}`
}

async function shareInvite(message: string, url: string) {
  // Web Share API where available; otherwise open WhatsApp.
  if (navigator.share) {
    try {
      await navigator.share({ text: message, url })
      return
    } catch {
      // user cancelled or share failed — fall through to WhatsApp
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
}

/** Parent names the invitee + picks relationship BEFORE sharing. Creates the invite row,
 *  then shares a link carrying the invite id. */
export function InviteCard({
  parentId,
  childId,
  childName,
  onInvited,
}: {
  parentId: string
  childId: string
  childName: string
  onInvited?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setName('')
    setRelationship('')
    setError('')
    setOpen(false)
  }

  const create = async () => {
    if (!relationship || busy) return
    setBusy(true)
    setError('')
    const { data, error } = await supabase
      .from('family_connections')
      .insert({
        parent_id: parentId,
        child_id: childId,
        status: 'invited',
        relationship: RELATIONSHIP_DB[relationship] ?? 'other',
        invited_name: name.trim() || null,
        requester_id: null,
      })
      .select('id')
      .single()

    if (error || !data) {
      setBusy(false)
      setError('Could not create the invite. Please try again.')
      return
    }

    const inviteId = (data as { id: string }).id
    const url = `${window.location.origin}/invite/${inviteId}`
    const message = buildInviteMessage(name.trim(), childName, url)

    setBusy(false)
    onInvited?.()
    reset()
    await shareInvite(message, url)
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Invite a family member
      </Button>
    )
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <p className="text-base font-bold text-midnight">Invite a family member</p>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-midnight">Their name (optional)</span>
        <input
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base outline-none focus:border-sky focus:ring-2 focus:ring-sky/30"
          placeholder="e.g. Grandma Susan"
          autoCapitalize="words"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div>
        <span className="mb-1.5 block text-sm font-semibold text-midnight">
          Their relationship to {childName}
        </span>
        <div className="flex flex-wrap gap-2">
          {RELATIONSHIPS.map((r) => (
            <Pill key={r} active={relationship === r} onClick={() => setRelationship(r)}>
              {r}
            </Pill>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button loading={busy} disabled={!relationship} onClick={() => void create()}>
        Share invite link
      </Button>
      <button type="button" className="w-full text-sm font-semibold text-azure" onClick={reset}>
        Cancel
      </button>
    </div>
  )
}
