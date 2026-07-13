import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { loadPledgePayin, inviteUrl, contributionLabel, type PledgeStatusView } from '../../lib/pledge'
import { formatSortCode } from '../../lib/format'
import { Screen, Logo, Card, Button, Disclaimer, FullScreenLoader } from '../../components/ui'

// F-STATUS (spec §7) — "Your pledge is on its way", then flips to "the account is open —
// here's how to start" once the parent confirms (Step 4 trigger). Keyed by the opaque
// token; no account needed. Pay-in details are DISPLAY-ONLY — the grandparent sets up their
// own standing order in their banking app; Amplifi never holds or moves money.

const STAGES = ['Sent', 'Opened', 'Account open'] as const

function stageIndex(v: PledgeStatusView): number {
  if (v.accountOpen) return 2
  if (v.inviteStatus === 'opened' || v.inviteStatus === 'accepted') return 1
  return 0
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-bold tracking-wide text-midnight">{value}</p>
      </div>
      <button
        type="button"
        className="text-xs font-semibold text-azure"
        onClick={() => {
          void navigator.clipboard?.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
      >
        {copied ? 'Copied ✓' : 'Copy'}
      </button>
    </div>
  )
}

export default function PledgeStatus() {
  const { token } = useParams<{ token: string }>()
  const [view, setView] = useState<PledgeStatusView | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [setUp, setSetUp] = useState(false)

  useEffect(() => {
    if (!token) return
    loadPledgePayin(token).then((v) => {
      setView(v)
      setLoading(false)
    })
  }, [token])

  if (loading) return <FullScreenLoader />

  const url = token ? inviteUrl(token) : ''
  const contribution = view ? contributionLabel(view.amountPennies, view.frequency) : null
  const active = view ? stageIndex(view) : 0

  const followCta = (
    <Link
      to={`/follow/${token}`}
      className="mt-5 block rounded-xl bg-sky/5 p-4 text-center ring-1 ring-sky/20 transition hover:bg-sky/10"
    >
      <p className="text-sm font-bold text-midnight">Follow {view?.childName ?? 'their'}&apos;s future</p>
      <p className="mt-0.5 text-xs leading-snug text-slate-500">
        Create a free account to watch the fund grow once {view?.childName ?? 'their'}&apos;s parent
        opens the account — and start something for your other grandchildren.
      </p>
      <span className="mt-2 inline-block text-xs font-bold text-azure">Create a free account →</span>
    </Link>
  )

  const reshareWhatsApp = () => {
    if (!view) return
    const text = `I've started something for ${view.childName} on Amplifi${
      contribution ? ` — ${contribution} towards their future` : ''
    }. There's one quick bit only you can do. Have a look: ${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const copy = () => {
    void navigator.clipboard?.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Screen className="pt-8">
      <div className="mb-8 flex justify-center">
        <Logo className="text-2xl" />
      </div>

      {!view ? (
        <Card>
          <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
            We couldn't find this pledge
          </h1>
          <p className="text-sm leading-relaxed text-slate-500">
            The link may be mistyped. If you just sent a pledge, try opening it again from your
            share message.
          </p>
        </Card>
      ) : view.accountOpen && view.payin ? (
        // ── Account open — display-only pay-in instructions (spec §8.3) ──
        <Card>
          <div className="mb-4 text-center">
            <div className="mb-2 text-4xl">🎉</div>
            <h1 className="text-2xl font-extrabold tracking-tight text-midnight">
              {view.childName}'s account is open
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              You can start {contribution ? <span className="font-semibold text-midnight">{contribution}</span> : 'your contribution'}{' '}
              whenever you like. Set up a standing order in your own banking app using these details —
              Amplifi never holds or moves your money.
            </p>
          </div>

          <div className="space-y-2">
            {view.payin.providerName && <CopyRow label="Provider" value={view.payin.providerName} />}
            <CopyRow label="Sort code" value={formatSortCode(view.payin.sortCode)} />
            <CopyRow label="Account number" value={view.payin.accountNumber} />
            <CopyRow label="Payment reference" value={view.payin.reference} />
          </div>

          <p className="mt-4 text-center text-xs leading-snug text-slate-400">
            Use the reference exactly as shown so it reaches {view.childName}'s account.
          </p>

          <div className="mt-5">
            {!setUp ? (
              <Button onClick={() => setSetUp(true)}>I've set up my standing order</Button>
            ) : (
              <p className="rounded-xl bg-green-50 px-4 py-3 text-center text-sm font-semibold text-green-700 ring-1 ring-green-200">
                Wonderful — thank you for building {view.childName}'s future. 💙
              </p>
            )}
            <p className="mt-4 text-center text-xs leading-snug text-slate-400">
              Keep this link — you can come back to these details any time.
            </p>
          </div>
          {followCta}
        </Card>
      ) : (
        // ── Pre-open — "on its way" + timeline ──
        <Card>
          <div className="mb-4 text-center">
            <div className="mb-2 text-4xl">💙</div>
            <h1 className="text-2xl font-extrabold tracking-tight text-midnight">
              Your pledge is on its way
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              {contribution ? (
                <>
                  <span className="font-semibold text-midnight">{contribution}</span> for{' '}
                  {view.childName}. We'll let you know the moment {view.childName}'s parent opens the
                  account.
                </>
              ) : (
                <>We'll let you know the moment {view.childName}'s parent opens the account.</>
              )}
            </p>
          </div>

          {view.personalMessage && (
            <blockquote className="mb-5 whitespace-pre-line rounded-xl bg-sky/5 p-4 text-sm leading-relaxed text-midnight ring-1 ring-sky/20">
              {view.personalMessage}
            </blockquote>
          )}

          <ol className="mb-6 space-y-3">
            {STAGES.map((label, i) => {
              const done = i <= active
              return (
                <li key={label} className="flex items-center gap-3">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      done ? 'bg-sky text-midnight' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                  <span className={`text-sm ${done ? 'font-semibold text-midnight' : 'text-slate-400'}`}>
                    {label}
                    {label === 'Account open' && active < 2 && (
                      <span className="ml-1 font-normal text-slate-400">
                        — you'll get your standing-order details here
                      </span>
                    )}
                  </span>
                </li>
              )
            })}
          </ol>

          <div className="space-y-3">
            <Button onClick={reshareWhatsApp}>Share again on WhatsApp</Button>
            <Button variant="ghost" onClick={copy}>
              {copied ? 'Link copied ✓' : 'Copy link'}
            </Button>
          </div>

          <p className="mt-4 text-center text-xs leading-snug text-slate-400">
            Keep this link — it's how you'll check back. We'll also email you when there's an update.
          </p>
          {followCta}
        </Card>
      )}

      <Disclaimer />
    </Screen>
  )
}
