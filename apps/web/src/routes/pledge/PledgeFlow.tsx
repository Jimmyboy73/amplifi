import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams, Navigate } from 'react-router-dom'
import { Screen, Logo, Card, Button, Field, Pill, Disclaimer, FullScreenLoader } from '../../components/ui'
import {
  createPledge,
  createPledgeForChild,
  loadInviteByToken,
  sendPledgeEmail,
  inviteUrl,
  contributionLabel,
} from '../../lib/pledge'
import { FREQ_LABELS, type Frequency } from '../../lib/types'

// Family-member (grandparent) flow — redesigned to 3 screens (onboarding redesign §2):
//   Screen 1 = the role fork (EntryFork). Screens 2–3 live here:
//   Screen 2 'pledge' — child + amount + frequency (relationship comes from Screen 1's ?rel)
//   Screen 3 'send'   — message + your details + send (WhatsApp / email / copy)
// Two entries:
//   COLD    (/pledge?rel=…): creates a NEW child, then sends the pledge to the parent.
//   INVITED (/i/:token/pledge): child FIXED from the token; relationship picked here (no
//           Screen 1); the pledge attaches to that existing child.
// No account wall up front. FCA disclaimer on every screen; conditional copy only.

type Step = 'pledge' | 'send'
const STEPS: Step[] = ['pledge', 'send']

type Relationship = 'grandparent' | 'other' | 'friend'
const RELATIONSHIPS: { value: Relationship; label: string }[] = [
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'other', label: 'Family member' },
  { value: 'friend', label: 'Friend' },
]
const asRelationship = (r: string | null): Relationship | '' =>
  r === 'grandparent' || r === 'other' || r === 'friend' ? r : ''

const AMOUNTS = [10, 25, 50, 100] as const
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

export default function PledgeFlow() {
  const navigate = useNavigate()
  const { token } = useParams<{ token?: string }>()
  const [searchParams] = useSearchParams()
  const invited = Boolean(token)

  const [step, setStep] = useState<Step>('pledge')

  // Invited mode: resolve the fixed child from the token.
  const [invitedChild, setInvitedChild] = useState<string | null>(null)
  const [invitedAccountOpen, setInvitedAccountOpen] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(invited)
  const [inviteError, setInviteError] = useState(false)

  // Screen 2. Relationship is fixed from Screen 1's ?rel (cold) or picked here (invited).
  const [childName, setChildName] = useState('')
  const [relationship, setRelationship] = useState<Relationship | ''>(
    invited ? '' : asRelationship(searchParams.get('rel'))
  )
  const [preset, setPreset] = useState<number | null>(null)
  const [otherMode, setOtherMode] = useState(false)
  const [customAmount, setCustomAmount] = useState('')
  const [frequency, setFrequency] = useState<Frequency | null>(null)

  // Screen 3.
  const [message, setMessage] = useState('')
  const [pledgerName, setPledgerName] = useState('')
  const [pledgerEmail, setPledgerEmail] = useState('')
  const [emailMode, setEmailMode] = useState(false)
  const [parentEmail, setParentEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    loadInviteByToken(token).then((s) => {
      if (!s || s.expired || s.direction !== 'invite_to_family') setInviteError(true)
      else {
        setInvitedChild(s.childName)
        setInvitedAccountOpen(s.accountOpen)
      }
      setInviteLoading(false)
    })
  }, [token])

  const child = invited ? invitedChild ?? 'the child' : childName.trim() || 'the child'
  const amountGbp = otherMode ? Number(customAmount) : preset
  const amountPennies = amountGbp && amountGbp > 0 ? Math.round(amountGbp * 100) : 0
  const contribution = contributionLabel(amountPennies || null, frequency)

  // Relationship-neutral default: warm, not twee, and easy to make their own.
  const messageDefault =
    relationship === 'grandparent'
      ? 'A little something for your future, with all our love x'
      : 'A little something for your future — with love x'

  // Pre-fill the message once the relationship is known (cold: at mount; invited: after the
  // picker) — it stays editable, and we only auto-fill once so a deliberate clear sticks.
  const msgInit = useRef(false)
  useEffect(() => {
    if (!msgInit.current && relationship) {
      setMessage(messageDefault)
      msgInit.current = true
    }
  }, [relationship, messageDefault])

  const stepIndex = STEPS.indexOf(step)
  // Cold journey is 3 screens (role was Step 1) → 2 of 3, 3 of 3. Invited has no role
  // screen → 1 of 2, 2 of 2.
  const totalSteps = invited ? 2 : 3
  const stepNumber = invited ? stepIndex + 1 : stepIndex + 2

  const goBack = () =>
    stepIndex === 0
      ? navigate(invited ? `/i/${token}` : '/start')
      : setStep(STEPS[stepIndex - 1])

  const commonPledge = () => ({
    amountPennies,
    frequency: frequency as Frequency,
    startTrigger: 'on_account_open' as const, // fixed: the giver sets the standing order later
    customStartDate: null,
    personalMessage: message,
    pledgerName: pledgerName.trim(),
    pledgerEmail: pledgerEmail.trim(),
    relationship: relationship as Relationship,
  })

  // COLD: create a new child + send to the parent via the chosen channel.
  const send = async (channel: 'whatsapp' | 'email' | 'copy_link', recipientEmail?: string) => {
    if (busy) return
    setBusy(true)
    setError('')
    const newToken = await createPledge({
      ...commonPledge(),
      childName: childName.trim(),
      approxAgeMonths: null, // no longer collected — parent supplies the real DOB at setup
      channel,
      recipientEmail: recipientEmail?.trim() || null,
    })
    if (!newToken) {
      setBusy(false)
      setError('Could not send your pledge. Please try again.')
      return
    }
    if (channel === 'email') {
      void sendPledgeEmail({ kind: 'pledge_to_parent', token: newToken })
    } else {
      dispatch(channel, inviteUrl(newToken))
    }
    // Warm thank-you to the pledger (best-effort; never blocks the flow).
    void sendPledgeEmail({ kind: 'pledge_thankyou', token: newToken })
    navigate(`/pledge/status/${newToken}`, { replace: true })
  }

  // INVITED: attach the pledge to the parent's existing child.
  const submitInvited = async () => {
    if (busy || !token) return
    setBusy(true)
    setError('')
    const newToken = await createPledgeForChild(token, commonPledge())
    setBusy(false)
    if (!newToken) {
      setError('Could not add your pledge. The invite may have expired.')
      return
    }
    // Best-effort emails (never block the flow): thank the pledger + tell the parent.
    void sendPledgeEmail({ kind: 'pledge_thankyou', token: newToken })
    void sendPledgeEmail({ kind: 'pledge_landed', token: newToken })
    navigate(`/pledge/status/${newToken}`, { replace: true })
  }

  // WhatsApp + copy are client-side; email is server-sent via Resend (see send()).
  const dispatch = (channel: 'whatsapp' | 'copy_link', url: string) => {
    if (channel === 'whatsapp') {
      const text = `I've started something for ${child} on Amplifi${
        contribution ? ` — ${contribution} towards their future` : ''
      }. There's one quick bit only you can do. Have a look: ${url}`
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    } else {
      void navigator.clipboard?.writeText(url)
    }
  }

  if (inviteLoading) return <FullScreenLoader />

  // Cold with no valid role → they didn't come through Screen 1. Send them there.
  if (!invited && !relationship) return <Navigate to="/start" replace />

  if (invited && inviteError) {
    return (
      <Screen className="pt-8">
        <div className="mb-8 flex justify-center">
          <Logo className="text-2xl" />
        </div>
        <Card>
          <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
            This invite isn't valid
          </h1>
          <p className="text-sm leading-relaxed text-slate-500">
            The link may have expired or been mistyped. Ask whoever sent it for a fresh one.
          </p>
        </Card>
        <Disclaimer />
      </Screen>
    )
  }

  const pledgeValid =
    (invited ? !!relationship : childName.trim().length > 0) && amountPennies > 0 && !!frequency
  const canSend = pledgerName.trim().length > 0 && isValidEmail(pledgerEmail)

  // Account-aware: if the child's JISA is already linked, the giver can start straight away —
  // we show the exact pay-in details on the very next screen. Otherwise it's the "we'll tell
  // you when it opens" holding message.
  const reassurance =
    invited && invitedAccountOpen
      ? frequency === 'one_off'
        ? `Good news — ${child}'s account is already open. As soon as you add your pledge we'll show you exactly where to send your one-off payment, so you can start right away. Amplifi never holds or moves your money.`
        : `Good news — ${child}'s account is already open. As soon as you add your pledge we'll show you the exact standing-order details, so you can start right away. Amplifi never holds or moves your money.`
      : frequency === 'one_off'
        ? "Nothing to set up yet — when the account opens we'll send you the exact pay-in details for your one-off payment. Amplifi never holds or moves your money."
        : "Nothing to set up yet — when the account opens we'll send you the exact pay-in details for your standing order. Amplifi never holds or moves your money."

  return (
    <Screen className="pt-6">
      <div className="mb-6 flex items-center justify-between">
        <button className="text-2xl text-midnight" onClick={goBack} aria-label="Back">
          ←
        </button>
        <Logo />
        <span className="text-xs font-semibold text-slate-400">
          Step {stepNumber} of {totalSteps}
        </span>
      </div>

      {/* ── Screen 2 — The pledge ─────────────────────────────────────────── */}
      {step === 'pledge' && (
        <Card>
          <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
            {invited ? `A pledge for ${child}` : "Who's this for, and how much?"}
          </h1>
          <p className="mb-5 text-sm leading-relaxed text-slate-500">
            {invited
              ? `You've been invited to add a little towards ${child}'s future.`
              : 'Just their first name, and how much you’d like to put in.'}
          </p>

          <div className="space-y-5">
            {invited ? (
              <div>
                <span className="mb-1.5 block text-sm font-semibold text-midnight">
                  Your relationship to {child}
                </span>
                <div className="flex flex-wrap gap-2">
                  {RELATIONSHIPS.map((r) => (
                    <Pill
                      key={r.value}
                      active={relationship === r.value}
                      onClick={() => setRelationship(r.value)}
                    >
                      {r.label}
                    </Pill>
                  ))}
                </div>
              </div>
            ) : (
              <Field
                label="Child's first name"
                autoCapitalize="words"
                placeholder="e.g. Olivia"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                autoFocus
              />
            )}

            <div>
              <span className="mb-1.5 block text-sm font-semibold text-midnight">Amount</span>
              <div className="flex flex-wrap gap-2">
                {AMOUNTS.map((a) => (
                  <Pill
                    key={a}
                    active={!otherMode && preset === a}
                    onClick={() => {
                      setPreset(a)
                      setOtherMode(false)
                      setCustomAmount('')
                    }}
                  >
                    £{a}
                  </Pill>
                ))}
                <Pill
                  active={otherMode}
                  onClick={() => {
                    setOtherMode(true)
                    setPreset(null)
                  }}
                >
                  Other
                </Pill>
              </div>
              {otherMode && (
                <div className="mt-3">
                  <Field
                    label="Amount (£)"
                    inputMode="decimal"
                    placeholder="e.g. 15"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value.replace(/[^\d.]/g, ''))}
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-semibold text-midnight">How often</span>
              <div className="flex flex-wrap gap-2">
                {(['weekly', 'monthly', 'one_off'] as Frequency[]).map((f) => (
                  <Pill key={f} active={frequency === f} onClick={() => setFrequency(f)}>
                    {FREQ_LABELS[f]}
                  </Pill>
                ))}
              </div>
            </div>

            {contribution && (
              <div className="rounded-xl border border-sky/40 bg-sky/5 p-4 text-sm text-slate-600">
                You're pledging <span className="font-bold text-midnight">{contribution}</span> for{' '}
                {child}.
              </div>
            )}

            <Button disabled={!pledgeValid} onClick={() => setStep('send')}>
              Continue
            </Button>
          </div>
        </Card>
      )}

      {/* ── Screen 3 — Message & send ─────────────────────────────────────── */}
      {step === 'send' && (
        <Card>
          <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
            {invited ? 'Add a note and your details' : `Add a note and send it to ${child}'s parent`}
          </h1>
          <p className="mb-5 text-sm leading-relaxed text-slate-500">
            Your message travels with the pledge — {child}'s parent will see it.
          </p>

          <div className="space-y-5">
            {/* Personal message — the emotional core; prominent, pre-filled, editable. */}
            <div>
              <span className="mb-1.5 block text-sm font-semibold text-midnight">Your message</span>
              <textarea
                className="min-h-[120px] w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-midnight outline-none transition focus:border-sky focus:ring-2 focus:ring-sky/30"
                placeholder={messageDefault}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-4">
              <Field
                label="Your name"
                autoCapitalize="words"
                placeholder="e.g. Sue"
                value={pledgerName}
                onChange={(e) => setPledgerName(e.target.value)}
              />
              <Field
                label="Your email"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                placeholder="you@example.co.uk"
                hint="Only so we can tell you when the account opens and share your pay-in details."
                value={pledgerEmail}
                onChange={(e) => setPledgerEmail(e.target.value)}
              />
            </div>

            <p className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-500">
              {reassurance}
            </p>

            {error && <p className="text-sm text-red-500">{error}</p>}

            {invited ? (
              <Button loading={busy} disabled={!canSend} onClick={() => void submitInvited()}>
                Add my pledge
              </Button>
            ) : !emailMode ? (
              <div className="space-y-3">
                <Button loading={busy} disabled={!canSend} onClick={() => void send('whatsapp')}>
                  Send on WhatsApp
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy || !canSend}
                  onClick={() => setEmailMode(true)}
                >
                  Send by email
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy || !canSend}
                  onClick={() => void send('copy_link')}
                >
                  Copy link to share
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Field
                  label="Parent's email"
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  placeholder="parent@example.co.uk"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  autoFocus
                />
                <Button
                  loading={busy}
                  disabled={!isValidEmail(parentEmail)}
                  onClick={() => void send('email', parentEmail)}
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
          </div>
        </Card>
      )}

      <Disclaimer />
    </Screen>
  )
}
