// "Occasions" tab (parent) — open birthday/Christmas/milestone gifting moments, see their
// running totals, and copy a share link to send round. Family gift via the no-login page
// (Phase 3). Wired to lib/occasions RPCs; no direct table access.
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useChildren } from '../../lib/useChildren'
import {
  loadChildOccasions,
  loadOccasionGifts,
  createOccasion,
  occasionShareUrl,
  OCCASION_EMOJI,
  type Occasion,
  type OccasionGift,
  type OccasionType,
} from '../../lib/occasions'
import { formatGBP } from '../../lib/projections'
import { Logo, FullScreenLoader } from '../../components/ui'
import { BottomTabs } from '../../components/BottomTabs'

const CORE = '#2F6FC4'
const OCC = '#F5A623'

const TYPES: { value: OccasionType; label: string }[] = [
  { value: 'birthday', label: '🎂 Birthday' },
  { value: 'christmas', label: '🎄 Christmas' },
  { value: 'milestone', label: '🌟 Milestone' },
  { value: 'other', label: '🎁 Other' },
]

export default function OccasionsView() {
  const { children, loading: childrenLoading } = useChildren()
  const child = children[0] ?? null
  const [occasions, setOccasions] = useState<Occasion[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [giftsById, setGiftsById] = useState<Record<string, OccasionGift[]>>({})
  const [openId, setOpenId] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!child) return
    setOccasions(await loadChildOccasions(child.id))
    setLoading(false)
  }, [child])

  useEffect(() => {
    void refetch()
  }, [refetch])

  if (childrenLoading || !child) return <FullScreenLoader />

  const copyLink = (token: string) => {
    void navigator.clipboard?.writeText(occasionShareUrl(token))
    setCopied(token)
    window.setTimeout(() => setCopied((c) => (c === token ? null : c)), 1800)
  }

  const toggleGifts = async (o: Occasion) => {
    if (openId === o.id) {
      setOpenId(null)
      return
    }
    if (!giftsById[o.id]) {
      const gifts = await loadOccasionGifts(o.id)
      setGiftsById((m) => ({ ...m, [o.id]: gifts }))
    }
    setOpenId(o.id)
  }

  const shareWhatsApp = (o: Occasion) => {
    const url = occasionShareUrl(o.shareToken)
    const text = `Help build ${child.name}'s future for ${o.title} 🎁 — gift straight in, no account needed: ${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="min-h-dvh w-full bg-offwhite">
      <div className="mx-auto w-full max-w-md px-5 pb-24">
        <div className="flex items-center justify-between py-4">
          <Logo />
          <span className="w-6" />
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-midnight">Occasions</h1>
        <p className="mt-1 text-sm text-slate-500">
          Turn birthdays, Christmas and milestones into a boost for {child.name}'s future — family
          can chip in with no account.
        </p>

        {child.account_status !== 'account_open' && (
          <Link
            to="/link-isa"
            className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3"
          >
            <span className="text-lg">⚠️</span>
            <span className="flex-1">
              <span className="block text-sm font-bold text-midnight">
                Set up {child.name}'s Junior ISA first
              </span>
              <span className="block text-xs leading-snug text-amber-800">
                Family need somewhere to send their gifts. Link the account so we can show them how
                to pay. →
              </span>
            </span>
          </Link>
        )}

        {loading ? (
          <div className="mt-8 flex justify-center">
            <FullScreenLoader />
          </div>
        ) : (
          <>
            <div className="mt-5 space-y-4">
              {occasions.map((o) => {
                const pct =
                  o.targetGbp && o.targetGbp > 0
                    ? Math.min(100, Math.round((o.totalGifted / o.targetGbp) * 100))
                    : 0
                return (
                  <div key={o.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                    <div className="p-5">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-11 w-11 items-center justify-center rounded-full text-2xl"
                          style={{ background: `${OCC}1f` }}
                        >
                          {OCCASION_EMOJI[o.occasionType] ?? '🎁'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-bold text-midnight">{o.title}</p>
                          {o.occasionDate && (
                            <p className="text-xs text-slate-400">
                              {new Date(o.occasionDate).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'long',
                              })}
                            </p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            o.status === 'open'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {o.status === 'open' ? 'Open' : 'Closed'}
                        </span>
                      </div>

                      <div className="mt-4">
                        <div className="mb-1 flex items-baseline justify-between">
                          <span className="text-sm font-bold text-midnight">
                            {formatGBP(o.totalGifted)}
                            <span className="text-xs font-semibold text-slate-400"> gifted</span>
                          </span>
                          {o.targetGbp ? (
                            <span className="text-xs text-slate-400">of {formatGBP(o.targetGbp)} idea</span>
                          ) : null}
                        </div>
                        {o.targetGbp ? (
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: OCC }} />
                          </div>
                        ) : null}
                        <button
                          onClick={() => void toggleGifts(o)}
                          disabled={o.giftCount === 0}
                          className="mt-2 text-xs font-semibold text-slate-400 transition hover:text-slate-600 disabled:hover:text-slate-400"
                        >
                          {o.giftCount} {o.giftCount === 1 ? 'gift' : 'gifts'} so far
                          {o.giftCount > 0 ? (openId === o.id ? ' ▲' : ' ▾') : ''}
                        </button>

                        {openId === o.id && (
                          <div className="mt-3 space-y-2.5 border-t border-slate-100 pt-3">
                            {(giftsById[o.id] ?? []).map((g) => (
                              <div key={g.id} className="flex items-start justify-between gap-3">
                                <span className="min-w-0">
                                  <span className="block text-sm font-semibold text-midnight">
                                    {g.gifterName}
                                  </span>
                                  {g.message && (
                                    <span className="block text-xs italic text-slate-400">
                                      &ldquo;{g.message}&rdquo;
                                    </span>
                                  )}
                                </span>
                                <span className="shrink-0 text-sm font-bold text-midnight">
                                  {formatGBP(g.amountGbp)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex border-t border-slate-100">
                      <button
                        onClick={() => shareWhatsApp(o)}
                        className="flex-1 py-3.5 text-sm font-bold transition hover:bg-slate-50"
                        style={{ color: '#128C7E' }}
                      >
                        Share on WhatsApp
                      </button>
                      <button
                        onClick={() => copyLink(o.shareToken)}
                        className="flex-1 border-l border-slate-100 py-3.5 text-sm font-bold transition hover:bg-slate-50"
                        style={{ color: CORE }}
                      >
                        {copied === o.shareToken ? 'Copied ✓' : 'Copy link'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {occasions.length === 0 && (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center">
                <p className="text-sm font-semibold text-midnight">No gifting moments yet</p>
                <p className="mx-auto mt-1 max-w-[240px] text-xs leading-snug text-slate-400">
                  Open one for a birthday or Christmas and family can gift straight into {child.name}'s
                  future.
                </p>
              </div>
            )}

            <button
              onClick={() => setShowCreate(true)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3.5 text-sm font-bold transition hover:brightness-105"
              style={{ borderColor: CORE, color: CORE, background: `${CORE}0d` }}
            >
              <span className="text-lg">＋</span> Create a gifting moment
            </button>
          </>
        )}
      </div>

      {showCreate && (
        <CreateOccasionModal
          childId={child.id}
          childName={child.name}
          onClose={() => setShowCreate(false)}
          onCreated={() => void refetch()}
        />
      )}

      <BottomTabs active="occasions" />
    </div>
  )
}

function CreateOccasionModal({
  childId,
  childName,
  onClose,
  onCreated,
}: {
  childId: string
  childName: string
  onClose: () => void
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<OccasionType>('birthday')
  const [date, setDate] = useState('')
  const [target, setTarget] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const valid = title.trim().length > 0

  const submit = async () => {
    if (!valid || busy) return
    setBusy(true)
    setError('')
    const token = await createOccasion({
      childId,
      title: title.trim(),
      type,
      date: date || null,
      target: target ? Number(target) : null,
    })
    setBusy(false)
    if (!token) {
      setError('Something went wrong — please try again.')
      return
    }
    onCreated()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-offwhite p-5 shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-extrabold text-midnight">New gifting moment</p>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 transition hover:text-midnight">
            ✕
          </button>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-midnight">What's the occasion?</span>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-midnight outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/30"
            placeholder={`e.g. ${childName}'s 5th Birthday`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </label>

        <div className="mt-4">
          <span className="mb-1.5 block text-sm font-semibold text-midnight">Type</span>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`rounded-xl border-2 py-2.5 text-sm font-bold transition ${
                  type === t.value ? 'bg-white' : 'border-transparent bg-white/50 text-slate-500'
                }`}
                style={type === t.value ? { borderColor: OCC, color: '#854F0B' } : { borderColor: '#e2e8f0' }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-semibold text-midnight">Date (optional)</span>
          <input
            type="date"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-midnight outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/30"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-semibold text-midnight">
            A target to aim for (optional)
          </span>
          <input
            inputMode="numeric"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-midnight outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/30"
            placeholder="e.g. 150"
            value={target}
            onChange={(e) => setTarget(e.target.value.replace(/\D/g, ''))}
          />
        </label>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <button
          onClick={() => void submit()}
          disabled={!valid || busy}
          className="mt-5 w-full rounded-xl py-3.5 text-sm font-bold text-white transition hover:brightness-105 disabled:opacity-50"
          style={{ background: CORE }}
        >
          {busy ? 'Creating…' : 'Create moment'}
        </button>
      </div>
    </div>
  )
}
