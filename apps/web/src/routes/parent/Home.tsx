import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { useChildren } from '../../lib/useChildren'
import { usePot } from '../../lib/usePot'
import { ensureSelfConnection } from '../../lib/useContribution'
import { ageMonthsFromDob, describeError } from '../../lib/format'
import { contributionLabel, sendPledgeEmail } from '../../lib/pledge'
import { RELATIONSHIP_LABEL } from '../../lib/types'
import { Logo, Card, FullScreenLoader } from '../../components/ui'
import { PotHero } from '../../components/PotHero'
import { ProjectionWidget } from '../../components/ProjectionWidget'
import { ContributionPanel } from '../../components/ContributionPanel'
import { WelcomeBanner } from '../../components/WelcomeFlow'
import { FeedbackModal } from '../../components/FeedbackModal'

export default function Home() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const { children, loading: childrenLoading, refetch: refetchChildren } = useChildren()
  const child = children[0] ?? null

  const { pot, pledges, loading: potLoading, refetch: refetchPot } = usePot(child?.id ?? null)

  const [hasJisa, setHasJisa] = useState(false)
  const [selfConnId, setSelfConnId] = useState<string | null>(null)
  const [selfConnError, setSelfConnError] = useState<string | null>(null)
  const [showContrib, setShowContrib] = useState(false)
  const [welcomeDismissed, setWelcomeDismissed] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [sendingDetails, setSendingDetails] = useState(false)
  const [detailsSent, setDetailsSent] = useState(false)

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

  // First-login welcome — now a dismissible banner ON the pot page (below), shown once.
  // Flag lives in user metadata.
  const seenWelcome = Boolean(user?.user_metadata?.has_seen_welcome)
  const showWelcome = !seenWelcome && !welcomeDismissed

  // Prefer a real DOB; fall back to the approximate age captured in the pledge flow.
  const ageMonths = ageMonthsFromDob(child.date_of_birth) ?? child.approx_age_months ?? null

  // Step 2 ("send the giver the pay-in details") only exists when someone has pledged.
  // Keep the remaining numbers contiguous so the path never reads 1, 3, 4.
  const hasPledges = pledges.length > 0
  const nContrib = hasPledges ? 3 : 2
  const nInvite = hasPledges ? 4 : 3

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

        {/* One-time founding-family welcome — dismissible banner, not a gate */}
        {showWelcome && <WelcomeBanner onDismiss={() => setWelcomeDismissed(true)} />}

        {/* Guided path — a numbered journey (not a flat menu), ISA first. Step 2 only
            appears once someone has pledged, so the numbers stay contiguous. */}
        <Card className="mt-4">
          <p className="mb-1 text-base font-bold text-midnight">Get {child.name}'s pot growing</p>
          <p className="mb-4 text-sm text-slate-500">A few steps to set everything up.</p>

          <ol className="space-y-1.5">
            {/* 1 — Link the ISA: the critical first step, highlighted until done */}
            <li>
              <Link
                to="/link-isa"
                className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                  hasJisa ? 'hover:bg-slate-50' : 'bg-sky/5 ring-1 ring-sky/30'
                }`}
              >
                <StepBadge n={1} done={hasJisa} />
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-midnight">
                    Link {child.name}'s ISA
                  </span>
                  {!hasJisa && (
                    <span className="block text-xs text-azure">
                      Start here — the critical first step
                    </span>
                  )}
                </span>
                {hasJisa ? (
                  <span className="text-xs font-bold text-green-600">Linked ✓</span>
                ) : (
                  <span className="text-slate-400">›</span>
                )}
              </Link>
            </li>

            {/* 2 — Send the giver the pay-in details (only when someone has pledged) */}
            {hasPledges && (
              <li>
                <button
                  type="button"
                  disabled={!hasJisa || sendingDetails || detailsSent}
                  onClick={() => {
                    if (!hasJisa) return
                    setSendingDetails(true)
                    void sendPledgeEmail({ kind: 'account_open', childId: child.id }).then(() => {
                      setSendingDetails(false)
                      setDetailsSent(true)
                    })
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-slate-50 disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <StepBadge n={2} done={detailsSent} />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-midnight">
                      Send the giver the pay-in details
                    </span>
                    <span className="block text-xs text-slate-400">
                      {hasJisa ? 'So they can set up their standing order' : 'Link the ISA first'}
                    </span>
                  </span>
                  {detailsSent ? (
                    <span className="text-xs font-bold text-green-600">Sent ✓</span>
                  ) : sendingDetails ? (
                    <span className="text-xs text-slate-400">Sending…</span>
                  ) : (
                    <span className="text-slate-400">›</span>
                  )}
                </button>
              </li>
            )}

            {/* 3 — Your own contribution (inline expand) */}
            <li className="rounded-xl px-3 py-3">
              {showContrib ? (
                <div className="flex gap-3">
                  <StepBadge n={nContrib} />
                  <div className="flex-1">
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
                  </div>
                </div>
              ) : (
                <button
                  className="flex w-full items-center gap-3 text-left"
                  onClick={() => setShowContrib(true)}
                >
                  <StepBadge n={nContrib} />
                  <span className="flex-1 text-sm font-semibold text-midnight">
                    Set up your own contribution
                  </span>
                  <span className="text-slate-400">›</span>
                </button>
              )}
            </li>

            {/* 4 — Invite others to contribute */}
            <li>
              <Link
                to={`/invite-family/${child.id}`}
                className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-slate-50"
              >
                <StepBadge n={nInvite} />
                <span className="flex-1 text-sm font-semibold text-midnight">
                  Invite others to contribute
                </span>
                <span className="text-slate-400">›</span>
              </Link>
            </li>
          </ol>
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
          <ProjectionWidget
            childName={child.name}
            ageMonths={ageMonths}
            childId={child.id}
            onDobSaved={() => void refetchChildren()}
          />
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

/** Numbered step marker for the guided path; shows a tick once the step is done. */
function StepBadge({ n, done }: { n: number; done?: boolean }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        done ? 'bg-green-100 text-green-700' : 'bg-sky/15 text-azure'
      }`}
    >
      {done ? '✓' : n}
    </span>
  )
}
