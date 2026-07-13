// "My Family" tab — the fuller network view behind the home-screen rings, wired to REAL
// data (the same pledges + contributions the home page loads; no new database anything).
// Grouped by relationship, not "side" (no data for side). Child Benefit shows as a prompt.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { useActiveChild } from '../../lib/useActiveChild'
import { usePot } from '../../lib/usePot'
import { ensureSelfConnection } from '../../lib/useContribution'
import { contributionLabel, loadChildInvites, type ChildInvite } from '../../lib/pledge'
import { RELATIONSHIP_LABEL } from '../../lib/types'
import { ringMonthlyTotals } from '../../lib/mission'
import { formatGBP } from '../../lib/projections'
import { Logo, FullScreenLoader } from '../../components/ui'
import { BottomTabs } from '../../components/BottomTabs'

const CORE = '#2F6FC4'
const FAMILY = '#33C6EC'

type Status = 'contributing' | 'pledged' | 'none'
const STATUS_PILL: Record<Status, { label: string; cls: string }> = {
  contributing: { label: 'Contributing', cls: 'bg-green-100 text-green-700' },
  pledged: { label: 'Pledged', cls: 'bg-amber-100 text-amber-700' },
  none: { label: 'Set up', cls: 'bg-sky-100 text-sky-700' },
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

function MemberRow({
  initial,
  name,
  detail,
  status,
  color,
}: {
  initial: string
  name: string
  detail: string
  status: Status
  color: string
}) {
  const pill = STATUS_PILL[status]
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Avatar initial={initial} color={color} muted={status === 'none'} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-midnight">{name}</span>
        <span className="block text-xs text-slate-400">{detail}</span>
      </span>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${pill.cls}`}>
        {pill.label}
      </span>
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

export default function FamilyView() {
  const { user } = useAuth()
  const { child, loading } = useActiveChild()
  const { contributions, pledges } = usePot(child?.id ?? null)
  const [selfConnId, setSelfConnId] = useState<string | null>(null)
  const [invites, setInvites] = useState<ChildInvite[]>([])

  useEffect(() => {
    if (!user || !child) return
    void ensureSelfConnection(user.id, child.id).then(({ id }) => setSelfConnId(id))
  }, [user, child])

  useEffect(() => {
    if (!child) return
    void loadChildInvites(child.id).then(setInvites)
  }, [child])

  if (loading || !child) return <FullScreenLoader />

  const monthly = ringMonthlyTotals({ contributions, pledges, selfConnectionId: selfConnId })
  const totalMonthly = monthly.core + monthly.family
  const linkedCount = pledges.filter((p) => p.status === 'linked').length
  const peopleCount = linkedCount + (monthly.core > 0 ? 1 : 0)
  // Invites still waiting (accepted ones already appear as pledges above).
  const pendingInvites = invites.filter((i) => i.status !== 'accepted')

  return (
    <div className="min-h-dvh w-full bg-offwhite">
      <div className="mx-auto w-full max-w-md px-5 pb-24">
        <div className="flex items-center justify-between py-4">
          <Logo />
          <span className="w-6" />
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-midnight">
          {child.name}'s family
        </h1>
        <p className="mt-1 text-sm text-slate-500">Everyone building their future, together.</p>

        {/* Summary */}
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-2xl font-extrabold text-midnight">
            {formatGBP(totalMonthly)}
            <span className="text-sm font-semibold text-slate-400"> / month</span>
          </p>
          <p className="text-xs text-slate-400">
            from {peopleCount} {peopleCount === 1 ? 'person' : 'people'} contributing
          </p>
        </div>

        {/* Core */}
        <SectionHeader color={CORE} label="Core Support" sub="Your household" />
        <div className="rounded-2xl bg-white px-4 py-1 shadow-sm ring-1 ring-black/5">
          <MemberRow
            initial="Y"
            name="You"
            detail={monthly.core > 0 ? `${formatGBP(monthly.core)} / month` : 'Not set up yet'}
            status={monthly.core > 0 ? 'contributing' : 'none'}
            color={CORE}
          />
          <div className="flex items-center gap-3 border-t border-slate-100 py-2.5">
            <Avatar initial="💷" color={CORE} muted />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-midnight">Child Benefit</span>
              <span className="block text-xs text-slate-400">Redirect part of ~£117 / month</span>
            </span>
            <Link
              to="/home"
              className="shrink-0 rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700"
            >
              Set up
            </Link>
          </div>
        </div>

        {/* Family */}
        <SectionHeader color={FAMILY} label="Family Support" sub="The wider circle" />
        {pledges.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center">
            <p className="text-sm font-semibold text-midnight">No-one from the wider circle yet</p>
            <p className="mx-auto mt-1 max-w-[240px] text-xs leading-snug text-slate-400">
              Invite a grandparent, auntie or godparent to be the first.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-2xl bg-white px-4 py-1 shadow-sm ring-1 ring-black/5">
            {pledges.map((p) => {
              const contrib = contributionLabel(p.amountPennies, p.frequency)
              const rel = RELATIONSHIP_LABEL[p.relationship ?? 'other'] ?? 'Family member'
              return (
                <MemberRow
                  key={p.id}
                  initial={(p.pledgerName || 'F').charAt(0).toUpperCase()}
                  name={p.pledgerName || 'Family member'}
                  detail={contrib ? `${rel} · ${contrib}` : rel}
                  status={p.status === 'linked' ? 'contributing' : 'pledged'}
                  color={FAMILY}
                />
              )
            })}
          </div>
        )}

        {/* Invited - waiting to hear back (accepted invites show as pledges above) */}
        {pendingInvites.length > 0 && (
          <>
            <SectionHeader color="#94a3b8" label="Invited" sub="Waiting to hear back" />
            <div className="divide-y divide-slate-100 rounded-2xl bg-white px-4 py-1 shadow-sm ring-1 ring-black/5">
              {pendingInvites.map((i) => {
                const who = i.recipientName || i.recipientEmail || 'Someone you shared a link with'
                const channelLabel =
                  i.channel === 'whatsapp' ? 'WhatsApp' : i.channel === 'email' ? 'email' : 'a link'
                return (
                  <div key={i.id} className="flex items-center gap-3 py-2.5">
                    <Avatar initial={who.charAt(0).toUpperCase()} color="#94a3b8" muted />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-midnight">{who}</span>
                      <span className="block text-xs text-slate-400">Invited via {channelLabel}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                      {i.status === 'opened' ? 'Opened' : 'Waiting'}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Invite */}
        <Link
          to={`/invite-family/${child.id}`}
          className="mt-5 block w-full rounded-xl py-3.5 text-center text-sm font-bold text-white shadow-sm transition hover:brightness-105"
          style={{ background: CORE }}
        >
          Invite someone to {child.name}'s future
        </Link>
      </div>

      <BottomTabs active="family" />
    </div>
  )
}
