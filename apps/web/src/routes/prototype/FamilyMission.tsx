// ─────────────────────────────────────────────────────────────────────────────
// PROTOTYPE — "The Family Mission" home screen (isolated visual mockup)
//
// This is a STANDALONE, DUMMY-DATA mockup for design review only. It is NOT wired
// to Supabase, auth, or any real flow. It imports no hooks, no db, no network — all
// data below is hardcoded. It does not touch or replace the real pot page (Home.tsx).
// Open it at /prototype/home. See docs/home-screen-design-brief.md.
//
// TWO STATES (toggle in the top bar):
//   • Full      — the aspirational, fully-populated mission (DOB set, supporters, activity).
//   • First-run — a brand-new parent: NO date of birth, NO supporters yet. This is what
//                 every new user actually sees first, so it must feel alive and inviting,
//                 never guilt-inducing ("opportunities to activate", not "people missing").
//                 Pre-DOB we show a GENERIC prompt, never a specific personalised figure
//                 built on a guess (brief §2 / same rule as the calculator).
//
// Ring design (agreed): the rings are NOT a progress bar. They are a calm "circle of
// presence" radiating outward from the child — Core inner, Family wider, Boosters outer.
// Supporters gather as avatar clusters BESIDE each ring, so the ring stays serene and a
// full ring is the reward, never an "incomplete" bar. In first-run the rings stay warm
// (soft baseline) with a single dashed "invite" slot — present and waiting, not empty.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../../components/ui'

// ── Brand (Option 1 — saturated brand palette) ───────────────────────────────
const CORE = '#2F6FC4' // Core Support   (was Azure #407BBF — deepened + saturated)
const FAMILY = '#33C6EC' // Family Support (was Sky #59C9E9 — brightened)
const BOOST = '#F5A623' // Everyday Boosters (was #E0A53A — vivid marigold, clear of coral)

type Mode = 'full' | 'empty'
// Ring visual style — the live design decision we're comparing:
//   • presence — full "circle of people" (a full ring = everyone's here, never a bar).
//   • target   — rings FILL toward a contribution target the family works towards
//                (Core £/mo, Family £/mo, Boosters £/yr). Solves Boosters (it gets a
//                fillable £ target) and gives clear, satisfying progress per contribution.
type RingStyle = 'presence' | 'target'

// ── Dummy data (fake — for the mockup only) ──────────────────────────────────
const CHILD = { name: 'Olivia', initial: 'O', projectedValue: 97400, futureAge: 25 }
const GOAL_LABEL = '£100k' // illustrative outcome goal shown at the centre in target style

type RingKey = 'core' | 'family' | 'boosters'

// r = radius; Core innermost, Boosters at the outer edge (radiating out from the child).
// Radii are spaced so the innermost (Core) ring is large enough to hold the centre
// figure cleanly — the child's projection sits in a proper "well", not cut by an arc.
const RINGS: { key: RingKey; label: string; color: string; r: number; tagline: string }[] = [
  { key: 'core', label: 'Core', color: CORE, r: 78, tagline: 'The recurring foundation' },
  { key: 'family', label: 'Family', color: FAMILY, r: 101, tagline: 'The wider circle' },
  { key: 'boosters', label: 'Boosters', color: BOOST, r: 123, tagline: 'On the way' },
]

// First-run taglines — invitations, not emptiness.
const EMPTY_TAGLINE: Record<RingKey, string> = {
  core: 'Be the first to start',
  family: 'Invite the wider circle',
  boosters: 'On the way',
}

type FamilyGroupKey = 'mums' | 'dads' | 'wider'
type Person = {
  name: string
  detail: string
  active: boolean
  initial: string
  amount: number
  group?: FamilyGroupKey
}

// Core = the parental household (Mum + Dad), plus Child Benefit (see ChildBenefitCard).
const CORE_PEOPLE: Person[] = [
  { name: 'Mum', detail: '£50 / month', active: true, initial: 'M', amount: 50 },
  { name: 'Dad', detail: '£30 / month', active: true, initial: 'D', amount: 30 },
]

// Family = the wider circle. Grandparents grouped by side (flexible — 1-2 each, never
// a forced pair), then the wider circle of aunties/uncles/godparents.
const FAMILY_PEOPLE: Person[] = [
  { name: 'Nana', detail: '£25 / month', active: true, initial: 'N', amount: 25, group: 'mums' },
  { name: 'Grandpa Joe', detail: 'Not yet — invite him', active: false, initial: '+', amount: 0, group: 'mums' },
  { name: 'Grandma Rose', detail: '£20 / month', active: true, initial: 'R', amount: 20, group: 'dads' },
  { name: 'Grandad', detail: 'Not yet — invite him', active: false, initial: '+', amount: 0, group: 'dads' },
  { name: 'Auntie Priya', detail: '£15 / month', active: true, initial: 'P', amount: 15, group: 'wider' },
  { name: 'Uncle Sam', detail: '£10 / month', active: true, initial: 'S', amount: 10, group: 'wider' },
]

const FAMILY_GROUP_LABELS: Record<FamilyGroupKey, string> = {
  mums: "Mum's side",
  dads: "Dad's side",
  wider: 'Wider circle',
}

const BOOSTERS_COMING = [
  { name: 'Cashback on everyday spending', note: 'Coming soon' },
  { name: 'Employer contributions', note: 'Coming soon' },
  { name: 'Gift-card boosts', note: 'Coming soon' },
  { name: 'Payroll giving', note: 'Coming soon' },
]

const FEED = [
  { icon: '💛', text: 'Grandma started contributing £25/month', when: '2 days ago' },
  { icon: '🔗', text: `Mum linked ${CHILD.name}'s Junior ISA`, when: '5 days ago' },
  { icon: '🎁', text: 'Auntie Priya gave £50', when: '1 week ago' },
  { icon: '🎂', text: 'Birthday Fund was activated', when: '2 weeks ago' },
]

// Which cluster + colour to show beside each ring in the legend.
const CLUSTERS: Record<RingKey, { people?: Person[]; coming?: number }> = {
  core: { people: CORE_PEOPLE },
  family: { people: FAMILY_PEOPLE },
  boosters: { coming: 3 },
}

// Per-ring contribution targets (target style). first-run starts at £0 and the family
// works towards these. Defaults are suggested — in the real product the parent could
// adjust them. All illustrative. Core is monthly recurring; Family and Boosters are
// yearly (gifts + passive accrual don't map to a monthly figure).
const BOOSTER_CURRENT = 120 // dummy boosters accrued this year (£)
const TARGETS: Record<RingKey, { target: number; unit: string }> = {
  core: { target: 150, unit: 'a month' }, // Mum £50 + Dad £30 = £80; headroom for Child Benefit
  family: { target: 100, unit: 'a month' }, // Grandma £25 + Priya £15 + Sam £10 = £50
  boosters: { target: 500, unit: 'a year' },
}

// `current` is derived from the actual contributors, so the pill ALWAYS equals the sum
// of the people in that ring (Mum £50 + Dad £30 + Grandma £25 = £105, etc.).
function ringCurrent(ringKey: RingKey, empty: boolean) {
  if (empty) return 0
  if (ringKey === 'boosters') return BOOSTER_CURRENT
  const people = ringKey === 'core' ? CORE_PEOPLE : FAMILY_PEOPLE
  return people.reduce((sum, p) => sum + (p.active ? p.amount : 0), 0)
}

function ringPct(ringKey: RingKey, empty: boolean) {
  return Math.min(100, Math.round((ringCurrent(ringKey, empty) / TARGETS[ringKey].target) * 100))
}

// How the centre projection is built — the mission grows as the circle grows.
// ALL figures illustrative (dummy). The "now" tier matches the headline; the last
// tier is aspirational headroom, never a promise. This reconnects the projection to
// the family joining, without turning the rings into progress bars.
const PROJECTION_TIERS: { label: string; value: number; color: string; now?: boolean }[] = [
  { label: 'You & your partner', value: 58000, color: CORE },
  { label: 'With grandparents helping', value: CHILD.projectedValue, color: FAMILY, now: true },
  { label: 'If the whole family joins in', value: 164000, color: BOOST },
]

// ── Ring geometry ────────────────────────────────────────────────────────────
const VIEW = 270
const CENTER = VIEW / 2

// The vibrant part of a ring. Presence = a full circle (a full ring is the reward).
// Target = an arc that FILLS toward the contribution goal, animating in from empty.
function VibrantRing({
  ringStyle,
  pct,
  color,
  r,
  opacity,
  width,
  selected,
}: {
  ringStyle: RingStyle
  pct: number
  color: string
  r: number
  opacity: number
  width: number
  selected: boolean
}) {
  const [off, setOff] = useState(ringStyle === 'target' ? pct : 0)
  useEffect(() => {
    if (ringStyle !== 'target') {
      setOff(0)
      return
    }
    setOff(pct) // start empty…
    const id = requestAnimationFrame(() => setOff(0)) // …then fill to `pct`
    return () => cancelAnimationFrame(id)
  }, [ringStyle, pct])

  const common = {
    cx: CENTER,
    cy: CENTER,
    r,
    fill: 'none',
    stroke: color,
    strokeOpacity: opacity,
    strokeWidth: width,
    strokeLinecap: 'round' as const,
    style: {
      transition:
        'stroke-dashoffset 1000ms cubic-bezier(0.22,1,0.36,1), stroke-width 280ms ease, stroke-opacity 280ms ease',
      filter: selected ? `drop-shadow(0 0 6px ${color}66)` : undefined,
    },
  }

  if (ringStyle === 'target') {
    return <circle {...common} pathLength={100} strokeDasharray={`${pct} 100`} strokeDashoffset={off} />
  }
  return <circle {...common} />
}

// A soft baseline track + the vibrant ring on top (presence = full, target = filling arc).
function RingStack({
  mode,
  ringStyle,
  selected,
  onSelect,
  pulse,
  projectionOpen,
  onToggleProjection,
}: {
  mode: Mode
  ringStyle: RingStyle
  selected: RingKey | null
  onSelect: (k: RingKey) => void
  pulse: RingKey | null
  projectionOpen: boolean
  onToggleProjection: () => void
}) {
  const empty = mode === 'empty'
  const target = ringStyle === 'target'
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[300px]">
      <div
        className="absolute inset-8 rounded-full blur-2xl"
        style={{ background: `radial-gradient(closest-side, ${FAMILY}22, transparent 72%)` }}
      />

      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="relative h-full w-full">
        {/* outer group breathes; inner group holds the rings */}
        <g
          style={{
            animation: 'ampBreathe 3600ms ease-in-out infinite',
            transformBox: 'fill-box',
            transformOrigin: 'center',
          }}
        >
          {RINGS.map((ring) => {
            const isSel = selected === ring.key
            const dim = selected !== null && !isSel
            const isPulsing = pulse === ring.key
            const pct = ringPct(ring.key, empty)
            // Baseline. Target keeps a visible full "track" (shows how far there is to go);
            // presence first-run stays deliberately delicate so the full state lights up.
            const baseOpacity = target ? 0.14 : empty ? 0.1 : 0.16
            const baseWidth = target ? 10 : empty ? 6 : 11
            const vibrantOpacity = target
              ? isSel
                ? 1
                : 0.92
              : isPulsing
                ? 0.95
                : isSel
                  ? empty
                    ? 0.42
                    : 0.78
                  : empty
                    ? 0.2
                    : 0.6
            const vibrantWidth = target
              ? isSel
                ? 12
                : 10
              : isPulsing
                ? 11
                : isSel
                  ? empty
                    ? 4.5
                    : 9
                  : empty
                    ? 2.5
                    : 7
            return (
              <g
                key={ring.key}
                className="cursor-pointer transition-opacity duration-300"
                style={{ opacity: dim ? 0.5 : 1 }}
                onClick={() => onSelect(ring.key)}
              >
                {/* soft baseline — keeps the ring warm even at rest / shows the target track */}
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={ring.r}
                  fill="none"
                  stroke={ring.color}
                  strokeOpacity={baseOpacity}
                  strokeWidth={baseWidth}
                />
                <VibrantRing
                  ringStyle={ringStyle}
                  pct={pct}
                  color={ring.color}
                  r={ring.r}
                  opacity={vibrantOpacity}
                  width={vibrantWidth}
                  selected={isSel}
                />
              </g>
            )
          })}
        </g>
      </svg>

      {/* centre — the child and their future, the emotional anchor */}
      <CentreFigure mode={mode} ringStyle={ringStyle} open={projectionOpen} onToggle={onToggleProjection} />
    </div>
  )
}

// Centre figure. Full: counts up once on mount, tap to see how it's built.
// First-run: NO figure (no DOB) — a warm, generic invitation to add the date of birth.
function CentreFigure({
  mode,
  ringStyle,
  open,
  onToggle,
}: {
  mode: Mode
  ringStyle: RingStyle
  open: boolean
  onToggle: () => void
}) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (mode !== 'full') {
      setVal(0)
      return
    }
    const target = CHILD.projectedValue
    const dur = 1200
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
      setVal(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [mode])

  if (mode === 'empty') {
    return (
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="flex flex-col items-center px-3">
          <div
            className="mb-2 flex h-12 w-12 items-center justify-center rounded-full text-lg font-extrabold text-white shadow-md"
            style={{ background: CORE }}
          >
            {CHILD.initial}
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {CHILD.name}&apos;s Future
          </p>
          <p className="mt-1 max-w-[160px] text-sm font-semibold leading-snug text-slate-400">
            Her future starts here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
      {/* only this inner block is tappable, so ring arcs behind it stay clickable */}
      <button
        onClick={onToggle}
        className="pointer-events-auto flex max-w-[150px] flex-col items-center rounded-2xl px-2 py-1 transition hover:bg-black/[0.03]"
      >
        <div
          className="mb-1.5 flex h-11 w-11 items-center justify-center rounded-full text-base font-extrabold text-white shadow-md"
          style={{ background: CORE }}
        >
          {CHILD.initial}
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {CHILD.name}&apos;s Future
        </p>
        <p className="text-2xl font-extrabold leading-none text-midnight">
          £{val.toLocaleString('en-GB')}
        </p>
        <p className="mt-1 flex flex-wrap items-center justify-center gap-x-1 text-[10px] font-medium leading-tight text-slate-400">
          <span>at age {CHILD.futureAge}</span>
          {ringStyle === 'target' && <span>· {GOAL_LABEL} goal</span>}
          <span
            className="transition-transform duration-300"
            style={{ transform: open ? 'rotate(180deg)' : 'none' }}
          >
            ⌄
          </span>
        </p>
      </button>
    </div>
  )
}

// Tap-the-centre panel — how the projection is built, and how the family lifts it.
function ProjectionPanel() {
  const max = Math.max(...PROJECTION_TIERS.map((t) => t.value))
  return (
    <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <p className="text-base font-bold text-midnight">How {CHILD.name}&apos;s future could grow</p>
      <p className="mb-4 mt-0.5 text-sm text-slate-500">
        Every supporter who joins lifts what&apos;s possible. Illustrative — not a guarantee.
      </p>
      <div className="space-y-3.5">
        {PROJECTION_TIERS.map((t) => (
          <div key={t.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-midnight">
                {t.label}
                {t.now && (
                  <span
                    className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: `${t.color}1f`, color: t.color }}
                  >
                    Now
                  </span>
                )}
              </span>
              <span className="text-sm font-extrabold text-midnight">
                £{t.value.toLocaleString('en-GB')}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.round((t.value / max) * 100)}%`, background: t.color }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] leading-snug text-slate-400">
        Illustrative — could grow to around these figures, not a guarantee. Assumes 7% p.a.; capital
        at risk.
      </p>
    </div>
  )
}

// ── Avatar cluster (beside the ring) ─────────────────────────────────────────
function Avatar({ initial, active, color }: { initial: string; active: boolean; color: string }) {
  return (
    <span
      className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-bold first:ml-0"
      style={
        active
          ? { background: color, color: '#fff', borderColor: '#F7F7F4' }
          : { background: '#F7F7F4', color, borderColor: color, borderStyle: 'dashed' }
      }
    >
      {active ? initial : '+'}
    </span>
  )
}

function Cluster({ mode, ringKey, color }: { mode: Mode; ringKey: RingKey; color: string }) {
  const c = CLUSTERS[ringKey]

  // Boosters is always "coming soon" sparkles.
  if (c.coming) {
    return (
      <span className="flex pl-2">
        {Array.from({ length: c.coming }).map((_, i) => (
          <span
            key={i}
            className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed text-[11px] first:ml-0"
            style={{ background: '#F7F7F4', color, borderColor: color }}
          >
            ✦
          </span>
        ))}
      </span>
    )
  }

  // First-run: a single dashed "invite" slot — a warm open door, not an empty ring.
  if (mode === 'empty') {
    return (
      <span className="flex pl-2">
        <Avatar initial="+" active={false} color={color} />
      </span>
    )
  }

  // Show up to 4 avatars (active first) with a +N overflow chip so a big circle stays tidy.
  const sorted = [...c.people!].sort((a, b) => Number(b.active) - Number(a.active))
  const shown = sorted.slice(0, 4)
  const extra = sorted.length - shown.length
  return (
    <span className="flex items-center pl-2">
      {shown.map((p) => (
        <Avatar key={p.name} initial={p.initial} active={p.active} color={color} />
      ))}
      {extra > 0 && (
        <span
          className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#F7F7F4] bg-slate-100 text-[10px] font-bold text-slate-500"
        >
          +{extra}
        </span>
      )}
    </span>
  )
}

// Target style: the £ progress shown beside each ring instead of avatars.
function TargetStat({ ringKey, color, empty }: { ringKey: RingKey; color: string; empty: boolean }) {
  const t = TARGETS[ringKey]
  const current = ringCurrent(ringKey, empty)
  return (
    <span className="shrink-0 pl-2 text-right">
      <span className="block text-sm font-bold leading-tight" style={{ color }}>
        £{current}
        <span className="text-[11px] font-semibold text-slate-400">/£{t.target}</span>
      </span>
      <span className="block text-[10px] leading-tight text-slate-400">{t.unit}</span>
    </span>
  )
}

// ── Expandable ring panels ───────────────────────────────────────────────────
function PersonRow({ name, detail, active, color }: Person & { color: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
        style={active ? { background: `${color}1f`, color } : { background: '#eef1f5', color: '#94a3b8' }}
      >
        {active ? '✓' : '○'}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-midnight">{name}</span>
        <span className="block text-xs text-slate-400">{detail}</span>
      </span>
    </div>
  )
}

// A gentle "why this matters" note that sits above each panel's CTA.
function ImpactNote({ color, children }: { color: string; children: ReactNode }) {
  return (
    <p
      className="mt-4 rounded-xl px-3.5 py-2.5 text-xs font-semibold leading-snug"
      style={{ background: `${color}12`, color }}
    >
      {children}
    </p>
  )
}

// Child Benefit lives inside the Core ring (not its own ring — rule of three). Framing
// is deliberately realistic: redirect EVEN PART of the ~£117/mo, never "all of it".
function ChildBenefitCard({ color }: { color: string }) {
  return (
    <div
      className="mt-4 rounded-xl p-4"
      style={{ background: `${color}12`, border: `1px solid ${color}33` }}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-xl">💷</span>
        <p className="text-sm font-bold text-midnight">Put Child Benefit to work</p>
      </div>
      <p className="mt-1.5 text-xs leading-snug text-slate-500">
        {CHILD.name}&apos;s Child Benefit is around £117 a month. Redirecting even part of it is one
        of the most powerful things you can do — it&apos;s money you already receive.
      </p>
      <button
        className="mt-3 w-full rounded-lg py-2.5 text-xs font-bold text-white transition hover:brightness-105"
        style={{ background: color }}
      >
        Set up a Child Benefit contribution
      </button>
    </div>
  )
}

function PrimaryCta({ color, children }: { color: string; children: ReactNode }) {
  return (
    <button
      className="mt-3 w-full rounded-xl py-3 text-sm font-bold text-white transition hover:brightness-105"
      style={{ background: color }}
    >
      {children}
    </button>
  )
}

// A labelled sub-group inside the Family panel (Mum's side / Dad's side / Wider circle).
function FamilyGroup({ title, people, color }: { title: string; people: Person[]; color: string }) {
  if (people.length === 0) return null
  return (
    <div className="mt-3">
      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-300">{title}</p>
      <div className="divide-y divide-slate-100">
        {people.map((p) => (
          <PersonRow key={p.name} {...p} color={color} />
        ))}
      </div>
    </div>
  )
}

function RingPanel({ mode, selected }: { mode: Mode; selected: RingKey }) {
  const ring = RINGS.find((r) => r.key === selected)!
  const empty = mode === 'empty'

  return (
    <div
      className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5"
      style={{ borderTop: `3px solid ${ring.color}` }}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: ring.color }} />
        <p className="text-base font-bold text-midnight">{ring.label} Support</p>
      </div>

      {selected === 'core' && (
        <>
          {empty ? (
            <>
              <p className="mb-1 text-sm text-slate-500">
                No supporters yet — and that&apos;s exactly where every family starts.
              </p>
              <ChildBenefitCard color={ring.color} />
              <ImpactNote color={ring.color}>
                Setting up your own monthly contribution, or inviting one grandparent to be the
                first, is the best possible start — steady giving is what compounds over 18 years.
              </ImpactNote>
              <PrimaryCta color={ring.color}>Set up my contribution</PrimaryCta>
              <button
                className="mt-2 w-full rounded-xl border-2 py-3 text-sm font-bold transition hover:brightness-105"
                style={{ borderColor: ring.color, color: ring.color, background: `${ring.color}0d` }}
              >
                Invite a grandparent
              </button>
            </>
          ) : (
            <>
              <p className="mb-3 text-sm text-slate-500">
                The people making an ongoing commitment — the foundation of {CHILD.name}&apos;s
                future.
              </p>
              <div className="divide-y divide-slate-100">
                {CORE_PEOPLE.map((p) => (
                  <PersonRow key={p.name} {...p} color={ring.color} />
                ))}
              </div>
              <ChildBenefitCard color={ring.color} />
              <ImpactNote color={ring.color}>
                One more recurring supporter makes the biggest difference of all — steady monthly
                giving is what compounds.
              </ImpactNote>
              <PrimaryCta color={ring.color}>Invite another supporter</PrimaryCta>
            </>
          )}
        </>
      )}

      {selected === 'family' && (
        <>
          {empty ? (
            <p className="mb-1 text-sm text-slate-500">
              Invite the wider circle — grandparents, aunties, godparents and friends. Everyone who
              chips in will appear here.
            </p>
          ) : (
            <>
              <p className="mb-1 text-sm text-slate-500">
                The wider circle — both sides of the family, plus aunties, uncles and godparents.
              </p>
              {(['mums', 'dads', 'wider'] as FamilyGroupKey[]).map((gk) => (
                <FamilyGroup
                  key={gk}
                  title={FAMILY_GROUP_LABELS[gk]}
                  people={FAMILY_PEOPLE.filter((p) => p.group === gk)}
                  color={ring.color}
                />
              ))}
            </>
          )}
          {/* Occasion gifting — available from day one, even before regular giving starts */}
          <div
            className="mt-4 rounded-xl p-4"
            style={{ background: `${ring.color}12`, border: `1px solid ${ring.color}33` }}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🎂</span>
              <p className="text-sm font-bold text-midnight">Occasion gifting</p>
            </div>
            <p className="mt-1.5 text-xs leading-snug text-slate-500">
              Open a birthday or Christmas gifting moment — the whole circle can chip in, no account
              needed.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                className="flex-1 rounded-lg py-2.5 text-xs font-bold text-white transition hover:brightness-105"
                style={{ background: ring.color }}
              >
                🎂 Birthday
              </button>
              <button
                className="flex-1 rounded-lg py-2.5 text-xs font-bold transition hover:brightness-105"
                style={{ background: '#fff', color: ring.color, border: `1.5px solid ${ring.color}` }}
              >
                🎄 Christmas
              </button>
            </div>
          </div>
          <ImpactNote color={ring.color}>
            {empty
              ? `Even before regular giving starts, a birthday or Christmas moment lets the whole circle add to ${CHILD.name}'s future.`
              : `A single birthday gift from the wider circle can add hundreds to ${CHILD.name}'s future — and it means more coming from people who love her.`}
          </ImpactNote>
          <PrimaryCta color={ring.color}>
            {empty ? 'Invite the wider circle' : 'Invite more family'}
          </PrimaryCta>
        </>
      )}

      {selected === 'boosters' && (
        <>
          <p className="mb-4 text-sm text-slate-500">
            Passive ways {CHILD.name}&apos;s future can grow — money that builds without anyone
            writing a cheque. These are on the way.
          </p>
          <div className="space-y-2">
            {BOOSTERS_COMING.map((b) => (
              <div
                key={b.name}
                className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3.5"
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs"
                  style={{ background: `${ring.color}1f`, color: ring.color }}
                >
                  ✦
                </span>
                <span className="flex-1 text-sm font-semibold text-midnight">{b.name}</span>
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{ background: `${ring.color}1f`, color: ring.color }}
                >
                  {b.note}
                </span>
              </div>
            ))}
          </div>
          <ImpactNote color={ring.color}>
            These grow {CHILD.name}&apos;s future automatically — no cheques, no effort. Small,
            passive amounts that quietly add up over 18 years.
          </ImpactNote>
          <button
            className="mt-3 w-full rounded-xl border-2 py-3 text-sm font-bold transition hover:brightness-105"
            style={{ borderColor: ring.color, color: ring.color, background: `${ring.color}0d` }}
          >
            Notify me when these launch
          </button>
        </>
      )}
    </div>
  )
}

// ── Contribution ripple — a small "+ £" rises toward the centre when money lands ──
function FloatBurst({ nonce, color }: { nonce: number; color: string }) {
  if (nonce === 0) return null
  return (
    <div
      key={nonce}
      className="pointer-events-none absolute left-1/2 top-1/2 text-sm font-bold"
      style={{ color, animation: 'ampFloat 1200ms ease-out forwards' }}
    >
      + £25
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function FamilyMission() {
  const [mode, setMode] = useState<Mode>('full')
  const [ringStyle, setRingStyle] = useState<RingStyle>('presence')
  const [selected, setSelected] = useState<RingKey | null>(null)
  const [showProjection, setShowProjection] = useState(false)
  const empty = mode === 'empty'

  const toggle = (k: RingKey) => {
    setShowProjection(false)
    setSelected((cur) => (cur === k ? null : k))
  }
  const toggleProjection = () => {
    setSelected(null)
    setShowProjection((v) => !v)
  }
  // In the prototype, "add date of birth" simulates completing setup → the full mission.
  const onAddDob = () => {
    setSelected(null)
    setShowProjection(false)
    setMode('full')
  }
  const switchMode = (m: Mode) => {
    setSelected(null)
    setShowProjection(false)
    setMode(m)
  }
  const switchRingStyle = (s: RingStyle) => {
    setSelected(null)
    setShowProjection(false)
    setRingStyle(s)
  }

  // Periodic contribution ripple (dummy, full mode only): brighten a ring + float a "+ £".
  const [pulse, setPulse] = useState<RingKey | null>(null)
  const [burst, setBurst] = useState<{ nonce: number; color: string }>({ nonce: 0, color: CORE })
  const nonceRef = useRef(0)
  useEffect(() => {
    if (mode !== 'full') {
      setPulse(null)
      return
    }
    const fire = () => {
      const key: RingKey = Math.random() < 0.5 ? 'core' : 'family'
      const color = key === 'core' ? CORE : FAMILY
      setPulse(key)
      nonceRef.current += 1
      setBurst({ nonce: nonceRef.current, color })
      window.setTimeout(() => setPulse(null), 340)
    }
    const first = window.setTimeout(fire, 2600)
    const id = window.setInterval(fire, 5200)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(id)
    }
  }, [mode])

  return (
    <div className="min-h-dvh w-full bg-offwhite">
      <style>{`
        @keyframes ampBreathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.012); } }
        @keyframes ampFloat {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
          18%  { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -150%) scale(1); }
        }
      `}</style>

      <div className="mx-auto w-full max-w-md px-5 pb-20">
        {/* Top bar — logo + prototype badge */}
        <div className="flex items-center justify-between py-4">
          <Logo />
          <span className="rounded-full bg-midnight/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Prototype
          </span>
        </div>

        {/* Prototype controls — state (full/first-run) + ring style (presence/target) */}
        <div className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wide text-slate-300">State</span>
            <div className="flex rounded-full bg-midnight/5 p-0.5 text-[10px] font-bold">
              {(['full', 'empty'] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`rounded-full px-2.5 py-1 uppercase tracking-wide transition ${
                    mode === m ? 'bg-white text-midnight shadow-sm' : 'text-slate-400'
                  }`}
                >
                  {m === 'full' ? 'Full' : 'First run'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wide text-slate-300">Rings</span>
            <div className="flex rounded-full bg-midnight/5 p-0.5 text-[10px] font-bold">
              {(['presence', 'target'] as RingStyle[]).map((s) => (
                <button
                  key={s}
                  onClick={() => switchRingStyle(s)}
                  className={`rounded-full px-2.5 py-1 uppercase tracking-wide transition ${
                    ringStyle === s ? 'bg-white text-midnight shadow-sm' : 'text-slate-400'
                  }`}
                >
                  {s === 'presence' ? 'Presence' : 'Target'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Hero — child at the centre, rings of presence around them */}
        <div className="relative pt-2">
          <RingStack
            mode={mode}
            ringStyle={ringStyle}
            selected={selected}
            onSelect={toggle}
            pulse={pulse}
            projectionOpen={showProjection}
            onToggleProjection={toggleProjection}
          />
          {!empty && <FloatBurst nonce={burst.nonce} color={burst.color} />}
        </div>

        {/* Compliance line — only when a figure is shown (full). Pre-DOB shows no figure,
            and the "add date of birth" ask is already carried by the centre + the nudge. */}
        {!empty && (
          <p className="mx-auto mt-3 max-w-xs text-center text-[11px] leading-snug text-slate-400">
            Illustrative — could grow to around this, not a guarantee. Assumes 7% p.a.; capital at
            risk.
          </p>
        )}

        {/* Tap-the-centre projection breakdown (full only) */}
        {!empty && showProjection && <ProjectionPanel />}

        {/* One quiet contextual nudge — default state only; routes to the first best action */}
        {!selected && !showProjection && (
          <button
            onClick={empty ? onAddDob : () => toggle('core')}
            className="mt-5 flex w-full items-center gap-2.5 rounded-xl px-3.5 py-3 text-left transition hover:brightness-[1.03]"
            style={{ background: `${CORE}12` }}
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ background: CORE }}
            >
              ✦
            </span>
            <span className="flex-1 text-xs font-semibold leading-snug" style={{ color: CORE }}>
              {empty
                ? `Add ${CHILD.name}'s date of birth to reveal her future — it takes a few seconds.`
                : `Redirecting even part of ${CHILD.name}'s Child Benefit is the most powerful step you can take.`}
            </span>
            <span className="shrink-0 text-base" style={{ color: CORE }}>
              →
            </span>
          </button>
        )}

        {/* Legend rows — the ring's identity + its people gathered beside it (tap to expand) */}
        <div className="mt-4 flex flex-col gap-2">
          {RINGS.map((ring) => {
            const isSel = selected === ring.key
            return (
              <button
                key={ring.key}
                onClick={() => toggle(ring.key)}
                className={`flex items-center gap-3 rounded-2xl bg-white px-3.5 py-2.5 text-left shadow-sm ring-1 transition ${
                  isSel ? 'ring-black/10' : 'ring-black/5 hover:ring-black/10'
                }`}
                style={{ borderLeft: `3px solid ${ring.color}` }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold leading-tight text-midnight">
                    {ring.label}
                  </span>
                  <span className="block text-[11px] leading-tight text-slate-400">
                    {empty ? EMPTY_TAGLINE[ring.key] : ring.tagline}
                  </span>
                </span>
                {ringStyle === 'target' ? (
                  <TargetStat ringKey={ring.key} color={ring.color} empty={empty} />
                ) : (
                  <Cluster mode={mode} ringKey={ring.key} color={ring.color} />
                )}
              </button>
            )
          })}
        </div>

        {/* Expanded ring detail */}
        {selected && <RingPanel mode={mode} selected={selected} />}

        {/* Family activity feed — warm moments (full), or a warm empty state (first-run) */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-sm font-bold text-midnight">Family activity</p>
            {!empty && (
              <button className="text-[11px] font-semibold text-slate-400 transition hover:text-slate-600">
                See all ›
              </button>
            )}
          </div>
          {empty ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center">
              <p className="text-sm font-semibold text-midnight">The first moment is on its way</p>
              <p className="mx-auto mt-1 max-w-[240px] text-xs leading-snug text-slate-400">
                It&apos;ll appear the day someone joins {CHILD.name}&apos;s mission. Invite a
                supporter to begin.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5">
              {FEED.slice(0, 3).map((f, i, arr) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-3 py-3 ${
                    i < arr.length - 1 ? 'border-b border-slate-100' : ''
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-offwhite text-base">
                    {f.icon}
                  </span>
                  <span className="flex-1 text-sm font-medium text-midnight">{f.text}</span>
                  <span className="shrink-0 text-[11px] text-slate-400">{f.when}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prototype note */}
        <p className="mt-8 text-center text-[11px] leading-snug text-slate-300">
          Prototype · dummy data · not connected to any account.{' '}
          <Link to="/home" className="underline">
            Back to app
          </Link>
        </p>
      </div>
    </div>
  )
}
