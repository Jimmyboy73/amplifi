import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Screen, Logo, Button, Disclaimer, FullScreenLoader } from '../../components/ui'

/**
 * P4 — provider signpost (spec §6). APPROVED copy (Gate 2, James 2026-07).
 *
 * Neutral, ALPHABETICAL, no ranking. Each row links OUT to the provider's own site in a new
 * tab; Amplifi collects nothing and never opens the account or moves money. "Use my own" lets
 * a parent who already has a Junior ISA proceed straight to confirming the pay-in details.
 * Fees change — the screen says "check their site", and the exact fee wording should be
 * re-verified against each provider before any big traffic push.
 */
const PROVIDERS = [
  {
    name: 'Hargreaves Lansdown',
    detail: 'Junior ISA · no account fee · start from £25/month or £100',
    url: 'https://www.hl.co.uk',
  },
  {
    name: 'Moneybox',
    detail: 'Junior ISA · start from £1, all in the app',
    url: 'https://www.moneyboxapp.com',
  },
]

const REASSURANCE = [
  { icon: '⏱️', label: 'About 5 minutes' },
  { icon: '🪪', label: 'You stay in control' },
  { icon: '🔒', label: 'Amplifi never holds the money' },
]

export default function ProviderSignpost() {
  const { childId } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const [childName, setChildName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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

  return (
    <Screen className="pt-6">
      <div className="mb-4 flex items-center justify-between">
        <Logo />
        <span className="w-6" />
      </div>

      {/* Warm hero — reassuring, not a warning label */}
      <div className="pt-2 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-azure/10 text-3xl">
          🌱
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-midnight">
          {child} will need a Junior ISA
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
          It's the account everyone's contributions go into. Only a parent or guardian can open one,
          and it takes about five minutes on the provider's own site. Amplifi doesn't open it — and
          never holds or touches the money.
        </p>
      </div>

      {/* Reassurance chips */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        {REASSURANCE.map((r) => (
          <div
            key={r.label}
            className="flex flex-col items-center gap-1 rounded-2xl bg-white px-2 py-3 text-center shadow-sm ring-1 ring-black/5"
          >
            <span className="text-lg">{r.icon}</span>
            <span className="text-[11px] font-semibold leading-tight text-midnight">{r.label}</span>
          </div>
        ))}
      </div>

      {/* Providers — neutral, alphabetical, no ranking */}
      <div className="mt-6">
        <p className="px-1 text-sm font-bold text-midnight">Providers who offer Junior ISAs</p>
        <p className="mb-3 px-1 text-[11px] leading-snug text-slate-400">
          Listed A–Z. We don't rank or recommend — the choice is yours.
        </p>
        <div className="space-y-2.5">
          {PROVIDERS.map((p) => (
            <a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-black/5 transition hover:ring-black/10"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-midnight">{p.name}</span>
                <span className="block text-[11px] leading-snug text-slate-400">{p.detail}</span>
              </span>
              <span className="shrink-0 rounded-lg bg-azure/10 px-3 py-2 text-xs font-bold text-azure">
                Open on their site ↗
              </span>
            </a>
          ))}
        </div>
        <p className="mt-3 px-1 text-[11px] leading-snug text-slate-400">
          Fees can change — check the provider's own site for the latest.
        </p>
      </div>

      {/* Already have one / use my own — no steer */}
      <button
        onClick={() => navigate(`/confirm/${childId}`)}
        className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white/60 px-4 py-3.5 text-left transition hover:bg-white"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-midnight">
            Already have one, or prefer another provider?
          </span>
          <span className="block text-[11px] leading-snug text-slate-400">
            That's completely fine — we don't mind where it's held.
          </span>
        </span>
        <span className="shrink-0 text-sm font-bold text-azure">Use my own →</span>
      </button>

      {/* Actions */}
      <div className="mt-6 space-y-2.5">
        <Button onClick={() => navigate(`/confirm/${childId}`)}>I've opened the account</Button>
        <button
          onClick={() => navigate('/home')}
          className="w-full py-2 text-sm font-semibold text-slate-400 transition hover:text-midnight"
        >
          I'll do this later
        </button>
      </div>

      <Disclaimer />
    </Screen>
  )
}
