// ─────────────────────────────────────────────────────────────────────────────
// PROTOTYPE — "Occasions" tab (isolated visual mockup, dummy data)
//
// Birthday & Christmas gifting moments (MVP flow 4): the parent opens a moment, shares
// it, and the family can chip in WITHOUT an account. In the Family Mission visual
// language. NOT wired to data. Open at /prototype/occasions. Design review only.
// ─────────────────────────────────────────────────────────────────────────────
import { Link } from 'react-router-dom'
import { Logo } from '../../components/ui'
import { BottomTabs } from './FamilyTab'

const FAMILY = '#33C6EC'
const CORE = '#2F6FC4'

const CHILD = { name: 'Olivia' }

type Contributor = { initial: string }

type Occasion = {
  emoji: string
  title: string
  date: string
  when: string
  status: 'open' | 'draft'
  gifted?: number
  target?: number
  contributors?: Contributor[]
  items?: { emoji: string; name: string }[]
}

const OCCASIONS: Occasion[] = [
  {
    emoji: '🎂',
    title: `${CHILD.name}'s 5th Birthday`,
    date: '12 August',
    when: 'in 3 weeks',
    status: 'open',
    gifted: 85,
    target: 150,
    contributors: [{ initial: 'N' }, { initial: 'P' }, { initial: 'S' }],
    items: [
      { emoji: '🚲', name: 'A first proper bike' },
      { emoji: '📚', name: 'Story book bundle' },
    ],
  },
  {
    emoji: '🎄',
    title: 'Christmas 2026',
    date: '25 December',
    when: 'in 5 months',
    status: 'draft',
  },
]

export default function OccasionsTab() {
  return (
    <div className="min-h-dvh w-full bg-offwhite">
      <div className="mx-auto w-full max-w-md px-5 pb-24">
        {/* Top bar */}
        <div className="flex items-center justify-between py-4">
          <Logo />
          <span className="rounded-full bg-midnight/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Prototype
          </span>
        </div>

        {/* Header */}
        <div className="pt-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-midnight">Occasions</h1>
          <p className="mt-1 text-sm text-slate-500">
            Turn birthdays and Christmas into a boost for {CHILD.name}&apos;s future — family can
            chip in with no account.
          </p>
        </div>

        {/* Occasion cards */}
        <div className="mt-5 space-y-4">
          {OCCASIONS.map((o) => (
            <OccasionCard key={o.title} o={o} />
          ))}
        </div>

        {/* Create */}
        <button
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3.5 text-sm font-bold transition hover:brightness-105"
          style={{ borderColor: CORE, color: CORE, background: `${CORE}0d` }}
        >
          <span className="text-lg">＋</span> Create a new gifting moment
        </button>

        <p className="mt-6 text-center text-[11px] text-slate-300">
          Prototype · dummy data.{' '}
          <Link to="/prototype/home" className="underline">
            Home prototype
          </Link>
        </p>
      </div>

      <BottomTabs active="occasions" />
    </div>
  )
}

function OccasionCard({ o }: { o: Occasion }) {
  const pct = o.gifted && o.target ? Math.min(100, Math.round((o.gifted / o.target) * 100)) : 0

  if (o.status === 'draft') {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-offwhite text-2xl">
            {o.emoji}
          </span>
          <div className="flex-1">
            <p className="text-base font-bold text-midnight">{o.title}</p>
            <p className="text-xs text-slate-400">
              {o.date} · {o.when}
            </p>
          </div>
        </div>
        <button
          className="mt-4 w-full rounded-xl py-3 text-sm font-bold text-white transition hover:brightness-105"
          style={{ background: CORE }}
        >
          Open this gifting moment
        </button>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="p-5">
        <div className="flex items-center gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full text-2xl"
            style={{ background: `${FAMILY}1f` }}
          >
            {o.emoji}
          </span>
          <div className="flex-1">
            <p className="text-base font-bold text-midnight">{o.title}</p>
            <p className="text-xs text-slate-400">
              {o.date} · {o.when}
            </p>
          </div>
          <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold text-green-700">
            Open
          </span>
        </div>

        {/* Gifted progress */}
        <div className="mt-4">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-sm font-bold text-midnight">
              £{o.gifted}
              <span className="text-xs font-semibold text-slate-400"> gifted so far</span>
            </span>
            <span className="text-xs text-slate-400">of £{o.target} idea</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: FAMILY }} />
          </div>
        </div>

        {/* Contributors */}
        {o.contributors && (
          <div className="mt-3 flex items-center gap-2">
            <span className="flex">
              {o.contributors.map((c, i) => (
                <span
                  key={i}
                  className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[11px] font-bold text-white first:ml-0"
                  style={{ background: FAMILY }}
                >
                  {c.initial}
                </span>
              ))}
            </span>
            <span className="text-xs text-slate-400">{o.contributors.length} have gifted</span>
          </div>
        )}

        {/* Wishlist preview */}
        {o.items && (
          <div className="mt-4 rounded-xl bg-offwhite p-3">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-300">
              Wishlist
            </p>
            <div className="space-y-1.5">
              {o.items.map((it) => (
                <div key={it.name} className="flex items-center gap-2.5">
                  <span className="text-base">{it.emoji}</span>
                  <span className="text-sm font-medium text-midnight">{it.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        className="w-full border-t border-slate-100 py-3.5 text-sm font-bold transition hover:bg-slate-50"
        style={{ color: CORE }}
      >
        Share this moment →
      </button>
    </div>
  )
}
