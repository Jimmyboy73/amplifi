import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { useChildren } from '../../lib/useChildren'
import { usePot } from '../../lib/usePot'
import { ensureSelfConnection } from '../../lib/useContribution'
import { ageMonthsFromDob, describeError } from '../../lib/format'
import { contributionLabel } from '../../lib/pledge'
import { RELATIONSHIP_LABEL } from '../../lib/types'
import { Logo, Card, FullScreenLoader } from '../../components/ui'
import { PotHero } from '../../components/PotHero'
import { ProjectionWidget } from '../../components/ProjectionWidget'
import { ContributionPanel } from '../../components/ContributionPanel'
import { WelcomeFlow } from '../../components/WelcomeFlow'
import { FeedbackModal } from '../../components/FeedbackModal'

export default function Home() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const { children, loading: childrenLoading } = useChildren()
  const child = children[0] ?? null

  const { pot, pledges, loading: potLoading, refetch: refetchPot } = usePot(child?.id ?? null)

  const [hasJisa, setHasJisa] = useState(false)
  const [selfConnId, setSelfConnId] = useState<string | null>(null)
  const [selfConnError, setSelfConnError] = useState<string | null>(null)
  const [showContrib, setShowContrib] = useState(false)
  const [welcomeDismissed, setWelcomeDismissed] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

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

  // First-login welcome — shown once, before the pot. Flag lives in user metadata.
  const seenWelcome = Boolean(user?.user_metadata?.has_seen_welcome)
  if (!seenWelcome && !welcomeDismissed) {
    return <WelcomeFlow onDone={() => setWelcomeDismissed(true)} />
  }

  // Prefer a real DOB; fall back to the approximate age captured in the pledge flow.
  const ageMonths = ageMonthsFromDob(child.date_of_birth) ?? child.approx_age_months ?? null

  return (
    <div className="min-h-dvh w-full bg-offwhite">
      <div className="mx-auto w-full max-w-md px-5 pb-16">
        {/* Top bar */}
        <div className="flex items-center justify-between py-4">
          <Logo />
          <div className="flex items-center gap-4">
            <button
              className="text-sm font-semibold text-azure hover:brightness-110"
              onClick={() => setShowFeedback(true)}
            >
              Feedback
            </button>
            <button
              className="text-sm font-semibold text-slate-400 hover:text-slate-600"
              onClick={() => void signOut().then(() => navigate('/signup', { replace: true }))}
            >
              Sign out
            </button>
          </div>
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

          {/* Invite family to pledge (token/pledge flow) */}
          <Link
            to={`/invite-family/${child.id}`}
            className="flex items-center justify-between py-3"
          >
            <span className="text-sm font-semibold text-midnight">
              Invite family to build {child.name}'s pot
            </span>
            <span className="text-slate-400">›</span>
          </Link>
        </Card>

        {/* Family roster — driven by pledges (read-only) */}
        {pledges.length > 0 && (
          <Card className="mt-4">
            <p className="mb-3 text-base font-bold text-midnight">{child.name}'s family</p>
            <div className="space-y-2">
              {pledges.map((p) => {
                const linked = p.status === 'linked'
                const contrib = contributionLabel(p.amountPennies, p.frequency)
                return (
                  <div key={p.id} className="flex items-center justify-between py-1.5">
                    <div>
                      <p className="text-sm font-bold text-midnight">
                        {p.pledgerName || 'Family member'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {RELATIONSHIP_LABEL[p.relationship ?? 'other'] ?? 'Family member'}
                        {contrib ? ` · ${contrib}` : ''}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        linked ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {linked ? 'Contributing' : 'Pledged'}
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Projection */}
        <div className="mt-4">
          <ProjectionWidget childName={child.name} ageMonths={ageMonths} />
        </div>
      </div>

      {showFeedback && user && (
        <FeedbackModal
          userId={user.id}
          email={user.email ?? profile?.email ?? null}
          onClose={() => setShowFeedback(false)}
        />
      )}
    </div>
  )
}
