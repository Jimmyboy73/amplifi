// ─────────────────────────────────────────────────────────────────────────────
// PROTOTYPE — "My Family" tab (isolated visual mockup, dummy data)
//
// The fuller network view behind the home-screen rings: who's supporting Olivia, how
// much, their status, and pending invites — in the Family Mission visual language.
// NOT wired to data. Open at /prototype/family. Design review only.
// ─────────────────────────────────────────────────────────────────────────────
import { Link } from 'react-router-dom'
import { Logo } from '../../components/ui'

const CORE = '#2F6FC4'
const FAMILY = '#33C6EC'

type Status = 'contributing' | 'pledged' | 'invited' | 'none'
type Member = { name: string; initial: string; relationship: string; detail: string; status: Status }

const CHILD = { name: 'Olivia' }

const CORE_MEMBERS: Member[] = [
  { name: 'You', initial: 'Y', relationship: 'Parent', detail: '£50 / month', status: 'contributing' },
  { name: 'Sam (partner)', initial: 'S', relationship: 'Parent', detail: '£30 / month', status: 'contributing' },
]

const FAMILY_GROUPS: { title: string; members: Member[] }[] = [
  {
    title: "Mum's side",
    members: [
      { name: 'Nana', initial: 'N', relationship: 'Grandparent', detail: '£25 / month', status: 'contributing' },
      { name: 'Grandad', initial: 'G', relationship: 'Grandparent', detail: 'Invite sent', status: 'invited' },
    ],
  },
  {
    title: "Dad's side",
    members: [
      { name: 'Grandma Rose', initial: 'R', relationship: 'Grandparent', detail: '£20 / month', status: 'contributing' },
    ],
  },
  {
    title: 'Wider circle',
    members: [
      { name: 'Auntie Priya', initial: 'P', relationship: 'Aunt / Uncle', detail: '£15 / month', status: 'contributing' },
      { name: 'Uncle Sam', initial: 'S', relationship: 'Aunt / Uncle', detail: 'Pledged £10 / month', status: 'pledged' },
      { name: 'The Hendersons', initial: 'H', relationship: 'Godparents', detail: 'Not invited yet', status: 'none' },
    ],
  },
]

const STATUS_PILL: Record<Status, { label: string; cls: string }> = {
  contributing: { label: 'Contributing', cls: 'bg-green-100 text-green-700' },
  pledged: { label: 'Pledged', cls: 'bg-amber-100 text-amber-700' },
  invited: { label: 'Invited', cls: 'bg-slate-100 text-slate-500' },
  none: { label: 'Invite', cls: 'bg-sky-100 text-sky-700' },
}

function Avatar({ initial, color, muted }: { initial: string; color: string; muted?: boolean }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
      style={muted ? { background: '#eef1f5', color: '#94a3b8' } : { background: color, color: '#fff' }}
    >
      {initial}
    </span>
  )
}

function MemberRow({ m, color }: { m: Member; color: string }) {
  const pill = STATUS_PILL[m.status]
  const muted = m.status === 'invited' || m.status === 'none'
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Avatar initial={m.initial} color={color} muted={muted} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-midnight">{m.name}</span>
        <span className="block text-xs text-slate-400">
          {m.relationship} · {m.detail}
        </span>
      </span>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${pill.cls}`}>
        {pill.label}
      </span>
    </div>
  )
}

export default function FamilyTab() {
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
          <h1 className="text-2xl font-extrabold tracking-tight text-midnight">
            {CHILD.name}&apos;s family
          </h1>
          <p className="mt-1 text-sm text-slate-500">Everyone building her future, together.</p>
        </div>

        {/* Summary */}
        <div className="mt-4 flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="flex-1">
            <p className="text-2xl font-extrabold text-midnight">£140<span className="text-sm font-semibold text-slate-400"> / month</span></p>
            <p className="text-xs text-slate-400">from 5 people contributing</p>
          </div>
          <div className="h-10 w-px bg-slate-100" />
          <div className="flex-1">
            <p className="text-2xl font-extrabold text-midnight">2</p>
            <p className="text-xs text-slate-400">invites out</p>
          </div>
        </div>

        {/* Core */}
        <SectionHeader color={CORE} label="Core Support" sub="Your household" />
        <div className="rounded-2xl bg-white px-4 py-1 shadow-sm ring-1 ring-black/5">
          {CORE_MEMBERS.map((m) => (
            <MemberRow key={m.name} m={m} color={CORE} />
          ))}
          <div className="flex items-center gap-3 border-t border-slate-100 py-2.5">
            <Avatar initial="💷" color={CORE} muted />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-midnight">Child Benefit</span>
              <span className="block text-xs text-slate-400">Redirect part of ~£117 / month</span>
            </span>
            <span className="shrink-0 rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
              Set up
            </span>
          </div>
        </div>

        {/* Family */}
        <SectionHeader color={FAMILY} label="Family Support" sub="The wider circle" />
        <div className="space-y-3">
          {FAMILY_GROUPS.map((g) => (
            <div key={g.title} className="rounded-2xl bg-white px-4 py-2 shadow-sm ring-1 ring-black/5">
              <p className="pt-1 text-[10px] font-bold uppercase tracking-wide text-slate-300">
                {g.title}
              </p>
              <div className="divide-y divide-slate-100">
                {g.members.map((m) => (
                  <MemberRow key={m.name} m={m} color={FAMILY} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Invite CTA */}
        <button
          className="mt-5 w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-sm transition hover:brightness-105"
          style={{ background: CORE }}
        >
          Invite someone to {CHILD.name}&apos;s future
        </button>

        <p className="mt-6 text-center text-[11px] text-slate-300">
          Prototype · dummy data.{' '}
          <Link to="/prototype/home" className="underline">
            Home prototype
          </Link>
        </p>
      </div>

      <BottomTabs active="family" />
    </div>
  )
}

function SectionHeader({ color, label, sub }: { color: string; label: string; sub: string }) {
  return (
    <div className="mb-2 mt-6 flex items-center gap-2 px-1">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      <p className="text-sm font-bold text-midnight">{label}</p>
      <p className="text-xs text-slate-400">· {sub}</p>
    </div>
  )
}

// Shared 3-tab bottom bar (prototype context).
export function BottomTabs({ active }: { active: 'home' | 'family' | 'occasions' }) {
  const tabs: { key: 'home' | 'family' | 'occasions'; label: string; icon: string; to: string }[] = [
    { key: 'home', label: 'Home', icon: '🏠', to: '/prototype/home' },
    { key: 'family', label: 'My Family', icon: '👪', to: '/prototype/family' },
    { key: 'occasions', label: 'Occasions', icon: '🎁', to: '/prototype/occasions' },
  ]
  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md items-stretch">
        {tabs.map((t) => (
          <Link
            key={t.key}
            to={t.to}
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold"
            style={{ color: t.key === active ? CORE : '#94a3b8' }}
          >
            <span className="text-lg">{t.icon}</span>
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
