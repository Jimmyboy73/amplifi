// ─────────────────────────────────────────────────────────────────────────────
// PROTOTYPE — P4 "Olivia will need a Junior ISA" (provider signpost)
//
// Isolated, dummy-data mockup for design review only. NOT wired to auth/db/flow and
// does NOT touch the live ProviderSignpost.tsx. Open at /prototype/provider.
//
// Purpose (per docs/onboarding-redesign.md §"Parent Screen 2" and family-pledge-spec §6):
// THE FIX IS TONE, NOT REMOVAL. The live screen feels unnerving because it's still the
// amber "PLACEHOLDER / Provider A-B-C" warning. This prototype shows how P4 should FEEL —
// warm, simple, reassuring — while keeping the provider list + fees clearly marked as
// pending James's approval (Gate 2). It ranks nothing and steers to no one.
// ─────────────────────────────────────────────────────────────────────────────
import { Link } from 'react-router-dom'
import { Logo } from '../../components/ui'

const CORE = '#2F6FC4'
const CHILD = { name: 'Olivia' }

// Neutral, ALPHABETICAL. No ranking, no "recommended/best". Approved copy (Gate 2).
// `url` opens the provider's OWN site in a new tab; Amplifi collects nothing.
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

export default function ProviderSignpostPrototype() {
  return (
    <div className="min-h-dvh w-full bg-offwhite">
      <div className="mx-auto w-full max-w-md px-5 pb-20">
        {/* Top bar */}
        <div className="flex items-center justify-between py-4">
          <Logo />
          <span className="rounded-full bg-midnight/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Prototype
          </span>
        </div>

        {/* Warm hero — reassuring, not a warning label */}
        <div className="pt-4 text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl"
            style={{ background: `${CORE}14` }}
          >
            🌱
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-midnight">
            {CHILD.name} will need a Junior ISA
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
            It&apos;s the account everyone&apos;s contributions go into. Only a parent or guardian
            can open one, and it takes about five minutes on the provider&apos;s own site. Amplifi
            doesn&apos;t open it — and never holds or touches the money.
          </p>
        </div>

        {/* Reassurance chips — take the fear out of the step */}
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

        {/* Provider list — neutral, alphabetical, no ranking */}
        <div className="mt-6">
          <div className="mb-1 flex items-baseline justify-between px-1">
            <p className="text-sm font-bold text-midnight">Providers who offer Junior ISAs</p>
          </div>
          <p className="mb-3 px-1 text-[11px] leading-snug text-slate-400">
            Listed A–Z. We don&apos;t rank or recommend — the choice is entirely yours.
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
                <span
                  className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold"
                  style={{ background: `${CORE}12`, color: CORE }}
                >
                  Open on their site ↗
                </span>
              </a>
            ))}
          </div>

          <p className="mt-3 px-1 text-[11px] leading-snug text-slate-400">
            Fees can change — check the provider&apos;s own site for the latest.
          </p>
        </div>

        {/* Already have one / use my own — no steer */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white/60 px-4 py-3.5">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-midnight">
              Already have one, or prefer another provider?
            </span>
            <span className="block text-[11px] leading-snug text-slate-400">
              That&apos;s completely fine — we don&apos;t mind where it&apos;s held.
            </span>
          </span>
          <span className="shrink-0 text-sm font-bold" style={{ color: CORE }}>
            Use my own →
          </span>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-2.5">
          <button
            className="w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-sm transition hover:brightness-105"
            style={{ background: CORE }}
          >
            I&apos;ve opened the account
          </button>
          <button className="w-full rounded-xl py-3 text-sm font-bold text-slate-500 transition hover:text-midnight">
            I&apos;ll do this later
          </button>
        </div>

        {/* Prototype note */}
        <p className="mt-8 text-center text-[11px] leading-snug text-slate-300">
          Prototype · dummy data · providers &amp; copy pending approval.{' '}
          <Link to="/prototype/home" className="underline">
            Back to home prototype
          </Link>
        </p>
      </div>
    </div>
  )
}
