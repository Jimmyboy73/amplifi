import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { useChildren } from '../../lib/useChildren'
import { usePot } from '../../lib/usePot'
import { useChildConnections } from '../../lib/useChildConnections'
import { ensureSelfConnection } from '../../lib/useContribution'
import { ageMonthsFromDob, describeError } from '../../lib/format'
import { RELATIONSHIP_LABEL } from '../../lib/types'
import { Logo, Card, FullScreenLoader } from '../../components/ui'
import { PotHero } from '../../components/PotHero'
import { ProjectionWidget } from '../../components/ProjectionWidget'
import { ContributionPanel } from '../../components/ContributionPanel'
import { InviteCard } from '../../components/InviteCard'

export default function Home() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { children, loading: childrenLoading } = useChildren()
  const child = children[0] ?? null

  const { pot, loading: potLoading, refetch: refetchPot } = usePot(child?.id ?? null)
  const { contributors, invited, refetch: refetchRoster, cancelInvite, removeConnection } =
    useChildConnections(child?.id ?? null)

  const [hasJisa, setHasJisa] = useState(false)
  const [selfConnId, setSelfConnId] = useState<string | null>(null)
  const [selfConnError, setSelfConnError] = useState<string | null>(null)
  const [showContrib, setShowContrib] = useState(false)
  const [rosterError, setRosterError] = useState<string | null>(null)

  const handleCancelInvite = async (id: string, name: string) => {
    if (!window.confirm(`Cancel the invite for ${name}?`)) return
    setRosterError(null)
    const { error } = await cancelInvite(id)
    if (error) setRosterError(describeError(error))
  }

  const handleRemoveConnection = async (id: string, name: string) => {
    if (!window.confirm(`Remove ${name}? Their past contributions stay part of the pot.`)) return
    setRosterError(null)
    const { error } = await removeConnection(id)
    if (error) setRosterError(describeError(error))
  }

  useEffect(() => {
    if (!child) return
    supabase
      .from('jisa_accounts')
      .select('id')
      .eq('child_id', child.id)
      .maybeSingle()
      .then(({ data }) => setHasJisa(!!data))
  }, [child])

  // Ensure the parent's self-connection exists so they can log their own contribution.
  useEffect(() => {
    if (!user || !child) return
    void ensureSelfConnection(user.id, child.id).then(({ id, error }) => {
      setSelfConnId(id)
      setSelfConnError(error ? describeError(error) : null)
    })
  }, [user, child])

  if (childrenLoading || !child) return <FullScreenLoader />

  const ageMonths = ageMonthsFromDob(child.date_of_birth)

  return (
    <div className="min-h-dvh w-full bg-offwhite">
      <div className="mx-auto w-full max-w-md px-5 pb-16">
        {/* Top bar */}
        <div className="flex items-center justify-between py-4">
          <Logo />
          <button
            className="text-sm font-semibold text-slate-400 hover:text-slate-600"
            onClick={() => void signOut().then(() => navigate('/signup', { replace: true }))}
          >
            Sign out
          </button>
        </div>

        {/* Hero pot */}
        {potLoading ? (
          <div className="h-44 animate-pulse rounded-2xl bg-midnight/90" />
        ) : (
          <PotHero childName={child.name} pot={pot} />
        )}

        {/* Getting started */}
        <Card className="mt-4">
          <p className="mb-3 text-base font-bold text-midnight">Get more from Amplifi</p>

          {/* Link ISA */}
          <Link
            to="/link-isa"
            className="flex items-center justify-between border-b border-slate-100 py-3"
          >
            <span className="text-sm font-semibold text-midnight">Link {child.name}'s ISA</span>
            {hasJisa ? (
              <span className="text-xs font-bold text-green-600">Linked ✓</span>
            ) : (
              <span className="text-slate-400">›</span>
            )}
          </Link>

          {/* Own contribution */}
          <div className="border-b border-slate-100 py-3">
            {showContrib ? (
              <ContributionPanel
                connectionId={selfConnId}
                connectionError={selfConnError}
                childId={child.id}
                userId={user?.id ?? null}
                childName={child.name}
                ctaLabel="Set up your contribution"
                onChanged={() => {
                  void refetchPot()
                }}
              />
            ) : (
              <button
                className="flex w-full items-center justify-between text-left"
                onClick={() => setShowContrib(true)}
              >
                <span className="text-sm font-semibold text-midnight">Set up your contribution</span>
                <span className="text-slate-400">›</span>
              </button>
            )}
          </div>

          {/* Invite */}
          <div className="pt-4">
            <InviteCard
              parentId={user!.id}
              childId={child.id}
              childName={child.name}
              onInvited={() => void refetchRoster()}
            />
          </div>
        </Card>

        {/* Family roster */}
        {(contributors.length > 0 || invited.length > 0) && (
          <Card className="mt-4">
            <p className="mb-3 text-base font-bold text-midnight">{child.name}'s family</p>
            <div className="space-y-2">
              {contributors.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-1.5">
                  <div>
                    <p className="text-sm font-bold text-midnight">{c.name}</p>
                    <p className="text-xs text-slate-500">
                      {RELATIONSHIP_LABEL[c.relationship ?? 'other'] ?? 'Family member'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                      Connected
                    </span>
                    <button
                      type="button"
                      className="text-xs font-semibold text-slate-400 transition hover:text-azure"
                      onClick={() => void handleRemoveConnection(c.id, c.name)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {invited.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-1.5">
                  <div>
                    <p className="text-sm font-bold text-midnight">{inv.invited_name ?? 'Guest'}</p>
                    <p className="text-xs text-slate-500">
                      {RELATIONSHIP_LABEL[inv.relationship ?? 'other'] ?? 'Family member'} · Invited
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                      Invited
                    </span>
                    <button
                      type="button"
                      className="text-xs font-semibold text-slate-400 transition hover:text-azure"
                      onClick={() => void handleCancelInvite(inv.id, inv.invited_name ?? 'Guest')}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {rosterError && <p className="mt-3 text-sm text-red-500">{rosterError}</p>}
          </Card>
        )}

        {/* Projection */}
        <div className="mt-4">
          <ProjectionWidget childName={child.name} ageMonths={ageMonths} />
        </div>
      </div>
    </div>
  )
}
