import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { createFamilyInvite, sendPledgeEmail, inviteUrl } from '../../lib/pledge'
import { Screen, Logo, Card, Button, Field, Disclaimer, FullScreenLoader } from '../../components/ui'

/**
 * P6 — "Invite the family" (spec §6). The parent mints an invite_to_family link and shares
 * it. The recipient lands on F-ACCEPT and pledges against this existing child. Templates
 * from §8.4. Only the opaque token travels in the URL — no child name or PII.
 */
export default function InviteFamily() {
  const { childId } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [childName, setChildName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [emailMode, setEmailMode] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!childId) return
    supabase
      .from('children')
      .select('name')
      .eq('id', childId)
      .maybeSingle()
      .then(({ data }) => {
        setChildName((data as { name: string } | null)?.name ?? null)
        setLoading(false)
      })
  }, [childId])

  if (loading) return <FullScreenLoader />
  const child = childName ?? 'your child'
  const parentFirst = (profile?.full_name ?? '').split(' ')[0] || 'Someone'

  const message = (url: string) =>
    `${parentFirst} has set up a way for the family to build ${child}'s future together. If you'd like to add a little, it starts here: ${url}`

  const share = async (channel: 'whatsapp' | 'email' | 'copy_link', to?: string) => {
    if (!childId || busy) return
    setBusy(true)
    setError('')
    const token = await createFamilyInvite(childId, channel, to?.trim() || null, recipientName.trim() || null)
    setBusy(false)
    if (!token) {
      setError('Could not create the invite. Please try again.')
      return
    }
    const url = inviteUrl(token)
    if (channel === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(message(url))}`, '_blank')
    } else if (channel === 'email') {
      // Server-sent via Resend (§8.4) — recipient stored on the invite. Only claim it
      // sent if the function actually succeeded; otherwise be honest and offer the link.
      const ok = await sendPledgeEmail({ kind: 'invite_to_family', token })
      if (ok) {
        setEmailMode(false)
        setSent(true)
        setTimeout(() => setSent(false), 4000)
      } else {
        setError(
          "We couldn't email them just now. You can copy the link and send it yourself instead."
        )
      }
    } else if (channel === 'copy_link') {
      void navigator.clipboard?.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Screen className="pt-6">
      <div className="mb-6 flex items-center justify-between">
        <button className="text-2xl text-midnight" onClick={() => navigate('/home')} aria-label="Back">
          ←
        </button>
        <Logo />
        <span className="w-6" />
      </div>

      <Card>
        <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
          Invite the family
        </h1>
        <p className="mb-5 text-sm leading-relaxed text-slate-500">
          Share a link so grandparents and other family can add a little towards {child}'s future.
          They don't need an account to start.
        </p>

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
        {sent && (
          <p className="mb-3 rounded-xl bg-green-50 px-3 py-2 text-sm font-medium text-green-700 ring-1 ring-green-200">
            Invite sent — we've emailed them a link.
          </p>
        )}

        {!emailMode ? (
          <div className="space-y-3">
            <Field
              label="Who are you inviting? (optional)"
              autoCapitalize="words"
              placeholder="e.g. Grandma Sue"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              hint="So you can keep track of who you've asked."
            />
            <Button loading={busy} onClick={() => void share('whatsapp')}>
              Share on WhatsApp
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setEmailMode(true)}>
              Share by email
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => void share('copy_link')}>
              {copied ? 'Link copied ✓' : 'Copy link'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Field
              label="Their email"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              placeholder="family@example.co.uk"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              autoFocus
            />
            <Button
              loading={busy}
              disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim())}
              onClick={() => void share('email', recipientEmail)}
            >
              Send email
            </Button>
            <button
              type="button"
              className="w-full text-sm font-semibold text-azure"
              onClick={() => setEmailMode(false)}
            >
              ← Choose another way
            </button>
          </div>
        )}
      </Card>

      <Disclaimer />
    </Screen>
  )
}
