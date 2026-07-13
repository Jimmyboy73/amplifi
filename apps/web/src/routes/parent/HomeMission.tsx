// ─────────────────────────────────────────────────────────────────────────────
// "The Family Mission" — the real home screen (Phase 3 of the home-screen build spec).
//
// Wires the agreed prototype (Target rings) to REAL data via lib/mission.buildMissionView,
// replacing the old pot page (Home.tsx, kept for rollback). Reuses the existing action
// wiring so no MVP flow is lost: ContributionPanel, ProjectionWidget (DOB capture +
// projection detail), invite-family, link-ISA, send pay-in details, welcome, feedback.
//
// Ring model = Target (locked). Boosters is parked (Phase 2) — shown as a target to work
// toward with a coming-soon panel; no cashback data is read. See docs/home-screen-build-spec.md.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, useCallback, type ReactNode } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { useActiveChild } from '../../lib/useActiveChild'
import { usePot } from '../../lib/usePot'
import { ensureSelfConnection } from '../../lib/useContribution'
import { ageMonthsFromDob, describeError } from '../../lib/format'
import { contributionLabel, sendPledgeEmail, type ChildPledge } from '../../lib/pledge'
import { RELATIONSHIP_LABEL } from '../../lib/types'
import { buildMissionView, effectiveTargets, toMonthly } from '../../lib/mission'
import { formatGBP } from '../../lib/projections'
import { AdjustTargetsModal } from '../../components/AdjustTargetsModal'
import { BottomTabs } from '../../components/BottomTabs'
import { loadChildOccasions, loadOccasionGifts } from '../../lib/occasions'
import { Logo, FullScreenLoader } from '../../components/ui'
import { ProjectionWidget } from '../../components/ProjectionWidget'
import { ContributionPanel } from '../../components/ContributionPanel'
import { WelcomeBanner } from '../../components/WelcomeFlow'
import { FeedbackModal } from '../../components/FeedbackModal'

const CORE = '#2F6FC4'
const FAMILY = '#33C6EC'
const OCC = '#F5A623' // Occasions ring — celebratory amber
// Everyday Boosters is parked upside (not a ring) — rendered with neutral slate utilities.

type RingKey = 'core' | 'family' | 'occasions'
const VIEW = 270
const CENTER = VIEW / 2

// ── Vibrant ring — fills toward the ring's target (animates in on mount) ──────
function VibrantRing({
  pct,
  color,
  r,
  selected,
}: {
  pct: number
  color: string
  r: number
  selected: boolean
}) {
  const [off, setOff] = useState(pct)
  useEffect(() => {
    setOff(pct)
    const id = requestAnimationFrame(() => setOff(0))
    return () => cancelAnimationFrame(id)
  }, [pct])
  return (
    <circle
      cx={CENTER}
      cy={CENTER}
      r={r}
      fill="none"
      stroke={color}
      strokeOpacity={selected ? 1 : 0.92}
      strokeWidth={selected ? 12 : 10}
      strokeLinecap="round"
      pathLength={100}
      strokeDasharray={`${pct} 100`}
      strokeDashoffset={off}
      style={{
        transition: 'stroke-dashoffset 1000ms cubic-bezier(0.22,1,0.36,1), stroke-width 280ms ease',
        filter: selected ? `drop-shadow(0 0 6px ${color}66)` : undefined,
      }}
    />
  )
}

export default function HomeMission() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const { child, children, loading: childrenLoading, refetch: refetchChildren, setActiveChild } =
    useActiveChild()

  const { contributions, pledges, refetch: refetchPot } = usePot(child?.id ?? null)

  const [hasJisa, setHasJisa] = useState(false)
  const [selfConnId, setSelfConnId] = useState<string | null>(null)
  const [selfConnError, setSelfConnError] = useState<string | null>(null)
  const [selected, setSelected] = useState<RingKey | 'boosters' | null>(null)
  const [showProjection, setShowProjection] = useState(false)
  const [showContrib, setShowContrib] = useState(false)
  const [showAdjust, setShowAdjust] = useState(false)
  const [occasionsGbpYear, setOccasionsGbpYear] = useState(0)
  const [occasionActivity, setOccasionActivity] = useState<
    { id: string; name: string; amountGbp: number; title: string; createdAt: string }[]
  >([])
  const [welcomeDismissed, setWelcomeDismissed] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
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

  useEffect(() => {
    if (!user || !child) return
    void ensureSelfConnection(user.id, child.id).then(({ id, error }) => {
      setSelfConnId(id)
      setSelfConnError(error ? describeError(error) : null)
    })
  }, [user, child])

  // Total gifted across this child's occasion moments — feeds the Occasions ring — plus the
  // individual gifts (gifter + amount) so they can show in the Family activity feed.
  const childId = child?.id ?? null
  const loadOccasions = useCallback(async () => {
    if (!childId) return
    const list = await loadChildOccasions(childId)
    setOccasionsGbpYear(list.reduce((sum, o) => sum + o.totalGifted, 0))
    const nested = await Promise.all(
      list
        .filter((o) => o.giftCount > 0)
        .map(async (o) =>
          (await loadOccasionGifts(o.id)).map((g) => ({
            id: g.id,
            name: g.gifterName,
            amountGbp: g.amountGbp,
            title: o.title,
            createdAt: g.createdAt,
          }))
        )
    )
    setOccasionActivity(nested.flat().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)))
  }, [childId])

  useEffect(() => {
    void loadOccasions()
  }, [loadOccasions])

  // Refresh everything when the parent returns to the tab (a new pledge/gift made in another
  // session won't have been picked up otherwise).
  useEffect(() => {
    const onFocus = () => {
      void refetchPot()
      void refetchChildren()
      void loadOccasions()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refetchPot, refetchChildren, loadOccasions])

  if (childrenLoading || !child) return <FullScreenLoader />

  const ageMonths = ageMonthsFromDob(child.date_of_birth) ?? child.approx_age_months ?? null
  const targets = effectiveTargets(ageMonths, {
    core: child.core_target_gbp,
    family: child.family_target_gbp,
    occasions: child.occasions_target_gbp,
    boosters: child.boosters_target_gbp,
  })
  const view = buildMissionView({
    contributions,
    pledges,
    selfConnectionId: selfConnId,
    ageMonths,
    occasionsGbpYear,
    targets,
  })

  const seenWelcome = Boolean(user?.user_metadata?.has_seen_welcome)
  const showWelcome = !seenWelcome && !welcomeDismissed

  // Pledges waiting on the ISA (status 'sent', not yet 'linked') — shown but not counted in
  // the Family ring, which otherwise looks like broken maths.
  const pendingPledges = pledges.filter((p) => p.status !== 'linked')
  const pendingMonthly = pendingPledges.reduce(
    (s, p) => s + toMonthly(p.amountPennies / 100, p.frequency),
    0
  )

  // £100k mission progress — framed as encouragement, never as a shortfall.
  const missionPct =
    view.projectedFutureValue != null && view.householdGoal > 0
      ? Math.min(100, Math.round((view.projectedFutureValue / view.householdGoal) * 100))
      : 0
  const missionLine =
    missionPct >= 100
      ? 'On track for the full £100k — wonderful. 🎉'
      : missionPct >= 50
        ? 'Over halfway to the £100k mission — keep it going.'
        : missionPct >= 10
          ? 'Well on the way — every new supporter adds to it.'
          : missionPct >= 1
            ? "You're on the board. Small amounts compound hugely over the years."
            : `Add your first contribution and watch ${child.name}'s future start to grow.`

  const RINGS: { key: RingKey; label: string; color: string; r: number; unit: string }[] = [
    { key: 'core', label: 'Core', color: CORE, r: 78, unit: 'a month' },
    { key: 'family', label: 'Family', color: FAMILY, r: 101, unit: 'a month' },
    { key: 'occasions', label: 'Occasions', color: OCC, r: 123, unit: 'a year' },
  ]

  const selectRing = (k: RingKey | 'boosters') => {
    setShowProjection(false)
    setSelected((cur) => (cur === k ? null : k))
  }
  const toggleProjection = () => {
    setSelected(null)
    setShowProjection((v) => !v)
  }

  // Single contextual nudge — the genuinely next-best action. Linking the ISA always wins;
  // otherwise suggest the LEAST-filled ring, and go quiet once everything's near target (so
  // we never push a bucket that's already full).
  const nudge: { text: string; onClick: () => void } | null = (() => {
    if (!hasJisa) {
      return { text: `Link ${child.name}'s Junior ISA — the critical first step.`, onClick: () => navigate('/link-isa') }
    }
    const r = view.rings
    const candidates = [
      { pct: r.family.pct, text: 'Invite a grandparent — one recurring supporter makes the biggest difference.', onClick: () => navigate(`/invite-family/${child.id}`) },
      { pct: r.occasions.pct, text: 'Open a birthday or Christmas moment — the easiest way for the wider family to chip in.', onClick: () => navigate('/occasions') },
      { pct: r.core.pct, text: `Redirecting even part of ${child.name}'s Child Benefit is a powerful monthly boost.`, onClick: () => selectRing('core') },
    ]
    const lowest = candidates.reduce((a, b) => (b.pct < a.pct ? b : a))
    return lowest.pct >= 90 ? null : { text: lowest.text, onClick: lowest.onClick }
  })()

  return (
    <div className="min-h-dvh w-full bg-offwhite">
      <style>{`
        @keyframes ampBreathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.012); } }
      `}</style>

      <div className="mx-auto w-full max-w-md px-5 pb-24">
        {/* Top bar */}
        <div className="flex items-center justify-between py-4">
          <Logo />
          <div className="relative">
            <button
              aria-label="Settings"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-black/5 hover:text-midnight"
              onClick={() => setShowSettings((s) => !s)}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            {showSettings && (
              <>
                <button
                  className="fixed inset-0 z-40 cursor-default"
                  aria-hidden
                  onClick={() => setShowSettings(false)}
                />
                <div className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-2xl bg-white py-1.5 shadow-xl ring-1 ring-black/10">
                  <button
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-midnight transition hover:bg-slate-50"
                    onClick={() => {
                      setShowSettings(false)
                      navigate('/link-isa')
                    }}
                  >
                    <span className="text-base">🏦</span>
                    {hasJisa ? 'Edit ISA / pay-in details' : "Set up child's Junior ISA"}
                  </button>
                  <button
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-midnight transition hover:bg-slate-50"
                    onClick={() => {
                      setShowSettings(false)
                      setShowFeedback(true)
                    }}
                  >
                    <span className="text-base">💬</span>
                    Send feedback
                  </button>
                  <div className="my-1 h-px bg-slate-100" />
                  <button
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
                    onClick={() => {
                      setShowSettings(false)
                      void signOut().then(() => navigate('/signup', { replace: true }))
                    }}
                  >
                    <span className="text-base">↩︎</span>
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {children.length > 1 && (
          <ChildSwitcher childList={children} activeId={child.id} onSelect={setActiveChild} />
        )}

        {showWelcome && <WelcomeBanner onDismiss={() => setWelcomeDismissed(true)} />}

        {/* Hero — rings + centre */}
        <div className="relative pt-2">
          <div className="relative mx-auto aspect-square w-full max-w-[300px]">
            <div
              className="absolute inset-8 rounded-full blur-2xl"
              style={{ background: `radial-gradient(closest-side, ${FAMILY}22, transparent 72%)` }}
            />
            <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="relative h-full w-full">
              <g
                style={{ animation: 'ampBreathe 3600ms ease-in-out infinite', transformBox: 'fill-box', transformOrigin: 'center' }}
              >
                {RINGS.map((ring) => {
                  const isSel = selected === ring.key
                  const dim = selected !== null && !isSel
                  const pct = view.rings[ring.key].pct
                  return (
                    <g
                      key={ring.key}
                      className="cursor-pointer transition-opacity duration-300"
                      style={{ opacity: dim ? 0.5 : 1 }}
                      onClick={() => selectRing(ring.key)}
                    >
                      <circle cx={CENTER} cy={CENTER} r={ring.r} fill="none" stroke={ring.color} strokeOpacity={0.14} strokeWidth={10} />
                      <VibrantRing pct={pct} color={ring.color} r={ring.r} selected={isSel} />
                    </g>
                  )
                })}
              </g>
            </svg>

            {/* centre */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <button
                onClick={() => {
                  // Tapping only does something pre-DOB (to open the date-of-birth capture).
                  if (view.projectedFutureValue == null) toggleProjection()
                }}
                className="pointer-events-auto flex max-w-[150px] flex-col items-center px-2 py-1"
              >
                <div
                  className="mb-1.5 flex h-11 w-11 items-center justify-center rounded-full text-base font-extrabold text-white shadow-md"
                  style={{ background: CORE }}
                >
                  {child.name.charAt(0).toUpperCase()}
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {child.name}&apos;s Future
                </p>
                {view.projectedFutureValue == null ? (
                  <>
                    <p className="mt-1 text-sm font-semibold leading-snug text-slate-400">
                      Her future starts here
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium" style={{ color: CORE }}>
                      Add date of birth ⌄
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-extrabold leading-none text-midnight">
                      {formatGBP(view.projectedFutureValue)}
                    </p>
                    <p className="mt-1 text-[10px] font-medium leading-tight text-slate-400">
                      at age 25
                    </p>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Compliance line — only when a figure is shown */}
        {view.projectedFutureValue != null && (
          <p className="mx-auto mt-3 max-w-xs text-center text-[11px] leading-snug text-slate-400">
            Illustrative — could grow to around this, not a guarantee. Assumes 7% p.a.; capital at risk.
          </p>
        )}

        {/* Pre-DOB only: tap the centre to capture the date of birth (no calculator). */}
        {showProjection && view.projectedFutureValue == null && (
          <div className="mt-4">
            <ProjectionWidget
              childName={child.name}
              ageMonths={ageMonths}
              childId={child.id}
              onDobSaved={() => void refetchChildren()}
            />
          </div>
        )}

        {/* Single contextual nudge — default state only, and only when there's a useful next step */}
        {nudge && !selected && !showProjection && (
          <button
            onClick={nudge.onClick}
            className="mt-5 flex w-full items-center gap-2.5 rounded-xl px-3.5 py-3 text-left transition hover:brightness-[1.03]"
            style={{ background: `${CORE}12` }}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: CORE }}>✦</span>
            <span className="flex-1 text-xs font-semibold leading-snug" style={{ color: CORE }}>{nudge.text}</span>
            <span className="shrink-0 text-base" style={{ color: CORE }}>→</span>
          </button>
        )}

        {/* Pending pledges waiting on the ISA — explains why the Family ring can read £0 */}
        {pendingMonthly > 0 && !selected && !showProjection && (
          <button
            onClick={() => navigate('/link-isa')}
            className="mt-3 flex w-full items-center gap-2.5 rounded-xl bg-amber-50 px-3.5 py-3 text-left ring-1 ring-amber-200 transition hover:brightness-[1.02]"
          >
            <span className="text-base">⏳</span>
            <span className="flex-1 text-xs font-semibold leading-snug text-amber-800">
              {formatGBP(pendingMonthly)} a month is pledged and waiting. Link {child.name}&apos;s ISA
              to activate it — then it counts toward the mission.
            </span>
            <span className="shrink-0 text-amber-700">→</span>
          </button>
        )}

        {/* The £100k mission — the shared goal + the lever. The projected figure lives in the
            ring centre; here we frame the goal and progress (encouragement, never a shortfall). */}
        <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-midnight">The £100k mission</p>
            <button
              onClick={() => setShowAdjust(true)}
              className="shrink-0 text-[11px] font-bold transition hover:brightness-110"
              style={{ color: CORE }}
            >
              Adjust targets →
            </button>
          </div>
          <p className="mt-0.5 text-xs leading-snug text-slate-500">
            Every family starts here: {child.name} reaching £100,000 by 25. A shared goal, not a
            promise — shape it to fit your family.
          </p>
          {view.projectedFutureValue != null && (
            <>
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(missionPct, 1.5)}%`, background: CORE }}
                />
              </div>
              <p className="mt-1.5 text-[11px] font-medium" style={{ color: CORE }}>
                {missionLine}
              </p>
            </>
          )}
        </div>

        {/* Legend rows — tap to expand */}
        <div className="mt-3 flex flex-col gap-2">
          {RINGS.map((ring) => {
            const isSel = selected === ring.key
            const stat = view.rings[ring.key]
            const tagline =
              ring.key === 'core'
                ? 'You + Child Benefit'
                : ring.key === 'family'
                  ? 'The wider circle'
                  : 'Birthdays, Christmas & milestones'
            return (
              <button
                key={ring.key}
                onClick={() => selectRing(ring.key)}
                className={`flex items-center gap-3 rounded-2xl bg-white px-3.5 py-2.5 text-left shadow-sm ring-1 transition ${isSel ? 'ring-black/10' : 'ring-black/5 hover:ring-black/10'}`}
                style={{ borderLeft: `3px solid ${ring.color}` }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold leading-tight text-midnight">{ring.label}</span>
                  <span className="block text-[11px] leading-tight text-slate-400">{tagline}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-bold leading-tight text-midnight">
                    £{Math.round(stat.current)}
                    <span className="text-[11px] font-semibold text-slate-400">/£{stat.target}</span>
                  </span>
                  <span className="block text-[10px] leading-tight text-slate-400">{ring.unit}</span>
                </span>
              </button>
            )
          })}

          {/* Everyday Boosters — a fourth row in the same family, but coming soon (no target yet) */}
          <button
            onClick={() => selectRing('boosters')}
            className={`flex w-full items-center gap-3 rounded-2xl bg-white px-3.5 py-2.5 text-left shadow-sm ring-1 transition ${selected === 'boosters' ? 'ring-black/10' : 'ring-black/5 hover:ring-black/10'}`}
            style={{ borderLeft: '3px solid #94a3b8' }}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold leading-tight text-midnight">Everyday Boosters</span>
              <span className="block text-[11px] leading-tight text-slate-400">Cashback, employer top-ups &amp; more</span>
            </span>
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Coming soon
            </span>
          </button>
        </div>

        {/* Expanded ring detail */}
        {selected === 'core' && (
          <RingPanelShell color={CORE} title="Core Support">
            <p className="mb-3 text-sm text-slate-500">
              Your household — your own giving, plus {child.name}&apos;s Child Benefit put to work.
            </p>
            {/* Child Benefit callout */}
            <div className="rounded-xl p-4" style={{ background: `${CORE}12`, border: `1px solid ${CORE}33` }}>
              <div className="flex items-center gap-2.5">
                <span className="text-xl">💷</span>
                <p className="text-sm font-bold text-midnight">Put Child Benefit to work</p>
              </div>
              <p className="mt-1.5 text-xs leading-snug text-slate-500">
                {child.name}&apos;s Child Benefit is around £117 a month. Redirecting even part of it
                is one of the most powerful things you can do — it&apos;s money you already receive.
              </p>
            </div>
            <div className="mt-4">
              {showContrib ? (
                <ContributionPanel
                  connectionId={selfConnId}
                  connectionError={selfConnError}
                  childId={child.id}
                  userId={user?.id ?? null}
                  childName={child.name}
                  ctaLabel="Set up your contribution"
                  onChanged={() => void refetchPot()}
                />
              ) : (
                <button
                  className="w-full rounded-xl py-3 text-sm font-bold text-white transition hover:brightness-105"
                  style={{ background: CORE }}
                  onClick={() => setShowContrib(true)}
                >
                  Set up your contribution
                </button>
              )}
            </div>
            {!hasJisa && (
              <Link
                to="/link-isa"
                className="mt-2 block w-full rounded-xl border-2 py-3 text-center text-sm font-bold transition hover:brightness-105"
                style={{ borderColor: CORE, color: CORE, background: `${CORE}0d` }}
              >
                Link {child.name}&apos;s Junior ISA
              </Link>
            )}
          </RingPanelShell>
        )}

        {selected === 'family' && (
          <RingPanelShell color={FAMILY} title="Family Support">
            <p className="mb-3 text-sm text-slate-500">
              The wider circle — grandparents, aunties, uncles and godparents who chip in.
            </p>
            <FamilyRoster pledges={pledges} />
            {pledges.length > 0 && (
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
                className="mt-3 w-full rounded-xl border-2 py-3 text-sm font-bold transition hover:brightness-105 disabled:opacity-50"
                style={{ borderColor: FAMILY, color: '#0C447C', background: `${FAMILY}12` }}
              >
                {detailsSent ? 'Pay-in details sent ✓' : hasJisa ? 'Send the giver the pay-in details' : 'Link the ISA first to send pay-in details'}
              </button>
            )}
            <Link
              to={`/invite-family/${child.id}`}
              className="mt-2 block w-full rounded-xl py-3 text-center text-sm font-bold text-white transition hover:brightness-105"
              style={{ background: FAMILY }}
            >
              Invite more family
            </Link>
          </RingPanelShell>
        )}

        {selected === 'occasions' && (
          <RingPanelShell color={OCC} title="Occasions">
            <p className="mb-3 text-sm text-slate-500">
              Birthdays, Christmas and milestones — pocket money, exam results, a christening. The
              whole circle can chip in with no account, and it&apos;s the easiest money toward{' '}
              {child.name}&apos;s future.
            </p>
            <div className="rounded-xl p-4" style={{ background: `${OCC}12`, border: `1px solid ${OCC}33` }}>
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🎂</span>
                <p className="text-sm font-bold text-midnight">Open a gifting moment</p>
              </div>
              <p className="mt-1.5 text-xs leading-snug text-slate-500">
                Share it and family gift straight into {child.name}&apos;s future, instead of another toy.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => navigate('/occasions', { state: { create: 'birthday' } })}
                  className="flex-1 rounded-lg py-2.5 text-xs font-bold text-white transition hover:brightness-105"
                  style={{ background: OCC }}
                >
                  🎂 Birthday
                </button>
                <button
                  onClick={() => navigate('/occasions', { state: { create: 'christmas' } })}
                  className="flex-1 rounded-lg py-2.5 text-xs font-bold transition hover:brightness-105"
                  style={{ background: '#fff', color: '#854F0B', border: `1.5px solid ${OCC}` }}
                >
                  🎄 Christmas
                </button>
              </div>
            </div>
          </RingPanelShell>
        )}

        {selected === 'boosters' && (
          <RingPanelShell color="#94a3b8" title="Everyday Boosters">
            <p className="mb-4 text-sm text-slate-500">
              Passive ways {child.name}&apos;s future can grow — money that builds without anyone
              writing a cheque. These are on the way; no target is set until they launch.
            </p>
            <div className="space-y-2">
              {['Cashback on everyday spending', 'Employer contributions', 'Gift-card boosts', 'Payroll giving'].map((b) => (
                <div key={b} className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-400">✦</span>
                  <span className="flex-1 text-sm font-semibold text-midnight">{b}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-400">Coming soon</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-slate-400">We&apos;ll let you know the moment these are ready.</p>
          </RingPanelShell>
        )}

        {/* Family activity — real moments plus a ghost example of what's still to come */}
        <div className="mt-6">
          <p className="mb-2 px-1 text-sm font-bold text-midnight">Family activity</p>
          <div className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            {view.monthly.core > 0 && (
              <div className="flex items-center gap-3 px-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-offwhite text-base">💷</span>
                <span className="flex-1 text-sm font-medium text-midnight">
                  You&apos;re contributing {formatGBP(view.monthly.core)} a month
                </span>
              </div>
            )}
            {pledges.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-offwhite text-base">
                  {p.status === 'linked' ? '💛' : '🎁'}
                </span>
                <span className="flex-1 text-sm font-medium text-midnight">
                  {(p.pledgerName || 'A family member')}{' '}
                  {p.status === 'linked' ? 'is contributing' : 'pledged'}{' '}
                  {contributionLabel(p.amountPennies, p.frequency) ?? ''}
                  {p.status !== 'linked' && (
                    <span className="ml-1.5 whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                      waiting on ISA
                    </span>
                  )}
                </span>
              </div>
            ))}
            {occasionActivity.slice(0, 3).map((g) => (
              <div key={g.id} className="flex items-center gap-3 px-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-offwhite text-base">🎁</span>
                <span className="flex-1 text-sm font-medium text-midnight">
                  {(g.name || 'A family member')} gifted {formatGBP(g.amountGbp)}
                  <span className="text-slate-400"> · {g.title}</span>
                </span>
              </div>
            ))}
            {pledges.length === 0 && occasionActivity.length === 0 && (
              <div className="flex items-center gap-3 px-3 py-3 opacity-40">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-offwhite text-base">💛</span>
                <span className="flex-1 text-sm font-medium italic text-slate-400">
                  Waiting for your first family gift — e.g. Grandma starts £20 a month
                </span>
              </div>
            )}
          </div>
          {pledges.length === 0 && occasionActivity.length === 0 && (
            <p className="mt-2 px-1 text-[11px] leading-snug text-slate-400">
              This is where {child.name}&apos;s family moments will appear — each new supporter shows up here.
            </p>
          )}
        </div>
      </div>

      {showFeedback && user && (
        <FeedbackModal
          userId={user.id}
          email={user.email ?? profile?.email ?? null}
          onClose={() => setShowFeedback(false)}
        />
      )}

      {showAdjust && (
        <AdjustTargetsModal
          childId={child.id}
          ageMonths={ageMonths}
          initial={targets}
          onClose={() => setShowAdjust(false)}
          onSaved={() => void refetchChildren()}
        />
      )}

      <BottomTabs active="home" />
    </div>
  )
}

function ChildSwitcher({
  childList,
  activeId,
  onSelect,
}: {
  childList: { id: string; name: string }[]
  activeId: string
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const active = childList.find((c) => c.id === activeId)
  return (
    <div className="relative mb-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-midnight shadow-sm ring-1 ring-black/5"
      >
        <span className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold text-white"
            style={{ background: CORE }}
          >
            {active?.name.charAt(0).toUpperCase()}
          </span>
          {active?.name ?? 'Select child'}
        </span>
        <span className="text-xs text-slate-400">Switch child {open ? '▲' : '▾'}</span>
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl bg-white py-1 shadow-xl ring-1 ring-black/10">
            {childList.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onSelect(c.id)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-slate-50 ${
                  c.id === activeId ? 'font-bold text-midnight' : 'text-slate-600'
                }`}
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold text-white"
                  style={{ background: CORE }}
                >
                  {c.name.charAt(0).toUpperCase()}
                </span>
                {c.name}
                {c.id === activeId && <span className="ml-auto text-azure">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function RingPanelShell({ color, title, children }: { color: string; title: string; children: ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5" style={{ borderTop: `3px solid ${color}` }}>
      <div className="mb-1 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <p className="text-base font-bold text-midnight">{title}</p>
      </div>
      {children}
    </div>
  )
}

function FamilyRoster({ pledges }: { pledges: ChildPledge[] }) {
  if (pledges.length === 0) {
    return (
      <p className="rounded-xl bg-slate-50 p-3.5 text-xs leading-snug text-slate-500">
        No-one from the wider circle yet. Invite a grandparent, auntie or godparent to be the first.
      </p>
    )
  }
  return (
    <div className="divide-y divide-slate-100">
      {pledges.map((p) => {
        const linked = p.status === 'linked'
        const contrib = contributionLabel(p.amountPennies, p.frequency)
        return (
          <div key={p.id} className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-semibold text-midnight">{p.pledgerName || 'Family member'}</p>
              <p className="text-xs text-slate-400">
                {RELATIONSHIP_LABEL[p.relationship ?? 'other'] ?? 'Family member'}
                {contrib ? ` · ${contrib}` : ''}
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${linked ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {linked ? 'Contributing' : 'Pledged'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
