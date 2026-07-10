// Public (NO login) gift page — /gift/:token. Family open the share link, see the moment,
// and pledge a one-off gift. Writes only via the create_occasion_gift RPC (RLS-protected).
// Amplifi never holds the money — this records the gift; the family shares how to pay in.
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  loadOccasionByToken,
  createOccasionGift,
  OCCASION_EMOJI,
  type OccasionPublic,
} from '../../lib/occasions'
import { formatGBP } from '../../lib/projections'
import { Screen, Logo, Button, Field, Disclaimer, FullScreenLoader } from '../../components/ui'

const AMOUNTS = [10, 25, 50, 100]

export default function GiftPage() {
  const { token } = useParams<{ token: string }>()
  const [occasion, setOccasion] = useState<OccasionPublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState<number | null>(25)
  const [custom, setCustom] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    void loadOccasionByToken(token).then((o) => {
      setOccasion(o)
      setLoading(false)
    })
  }, [token])

  if (loading) return <FullScreenLoader />

  if (!occasion) {
    return (
      <Screen className="items-center justify-center pt-6 text-center">
        <Logo />
        <h1 className="mt-8 text-2xl font-extrabold tracking-tight text-midnight">
          This gifting moment isn't available
        </h1>
        <p className="mt-2 text-sm text-slate-500">The link may be wrong or the moment has closed.</p>
        <Disclaimer />
      </Screen>
    )
  }

  const emoji = OCCASION_EMOJI[occasion.occasionType] ?? '🎁'
  const amount = preset ?? (custom ? Number(custom) : 0)
  const valid = name.trim().length > 0 && amount > 0
  const closed = occasion.status !== 'open'

  const submit = async () => {
    if (!valid || busy || !token) return
    setBusy(true)
    setError('')
    const id = await createOccasionGift({
      token,
      gifterName: name.trim(),
      amountGbp: amount,
      email: email.trim() || null,
      message: message.trim() || null,
    })
    setBusy(false)
    if (!id) {
      setError('Something went wrong — please try again.')
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <Screen className="pt-6">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
            💛
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-midnight">Thank you!</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
            Your {formatGBP(amount)} gift towards {occasion.childName}'s future is noted.
          </p>
        </div>

        {occasion.accountReady && occasion.sortCode ? (
          <div className="mt-6 rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-black/5">
            <p className="text-sm font-bold text-midnight">Now send your gift</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Set up a one-off payment (or standing order) in your own banking app using these
              details. Amplifi never touches the money.
            </p>
            <div className="mt-3 space-y-2">
              {occasion.providerName && <PayinRow label="Provider" value={occasion.providerName} />}
              <PayinRow label="Sort code" value={occasion.sortCode} />
              <PayinRow label="Account number" value={occasion.accountNumber ?? ''} />
              <PayinRow label="Reference" value={occasion.reference ?? ''} />
            </div>
            <p className="mt-3 text-[11px] leading-snug text-slate-400">
              Use the reference exactly as shown so it reaches {occasion.childName}'s account.
            </p>
          </div>
        ) : (
          <p className="mx-auto mt-4 max-w-sm text-center text-sm leading-relaxed text-slate-500">
            {occasion.childName}'s family will share exactly how to send it — Amplifi never holds or
            moves the money.
          </p>
        )}

        <Disclaimer />
      </Screen>
    )
  }

  return (
    <Screen className="pt-6">
      <div className="mb-4 flex justify-center">
        <Logo />
      </div>

      <div className="text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl">
          {emoji}
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-midnight">{occasion.title}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
          Instead of another toy, add a little to {occasion.childName}'s future. No account needed.
        </p>
        {occasion.giftCount > 0 && (
          <p className="mt-2 text-xs text-slate-400">
            {formatGBP(occasion.totalGifted)} from {occasion.giftCount}{' '}
            {occasion.giftCount === 1 ? 'gift' : 'gifts'} so far
          </p>
        )}
      </div>

      {closed ? (
        <p className="mt-8 rounded-2xl bg-white p-5 text-center text-sm font-semibold text-slate-500 shadow-sm ring-1 ring-black/5">
          This moment has closed — thank you for thinking of {occasion.childName}.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-midnight">Your gift</span>
            <div className="grid grid-cols-4 gap-2">
              {AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setPreset(a)
                    setCustom('')
                  }}
                  className={`rounded-xl border-2 py-3 text-sm font-bold transition ${
                    preset === a ? 'border-azure bg-azure/5 text-azure' : 'border-slate-200 bg-white text-midnight'
                  }`}
                >
                  £{a}
                </button>
              ))}
            </div>
            <input
              inputMode="numeric"
              placeholder="Other amount (£)"
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value.replace(/\D/g, ''))
                setPreset(null)
              }}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-midnight outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/30"
            />
          </div>

          <Field label="Your name" placeholder="e.g. Grandma" value={name} onChange={(e) => setName(e.target.value)} />
          <Field
            label="Your email (optional)"
            type="email"
            placeholder="So the family can thank you"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-midnight">
              A message (optional)
            </span>
            <textarea
              rows={3}
              placeholder="Something to build on. With love…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-midnight outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/30"
            />
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button onClick={() => void submit()} loading={busy} disabled={!valid}>
            {valid ? `Gift ${formatGBP(amount)} to ${occasion.childName}'s future` : 'Add your gift'}
          </Button>
        </div>
      )}

      <Disclaimer />
    </Screen>
  )
}

function PayinRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-offwhite px-3 py-2.5">
      <span className="text-xs text-slate-400">{label}</span>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(value)
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
        }}
        className="text-sm font-bold text-midnight"
      >
        {value} <span className="ml-1 text-[11px] font-semibold text-azure">{copied ? '✓' : 'Copy'}</span>
      </button>
    </div>
  )
}
