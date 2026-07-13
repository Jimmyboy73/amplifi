import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { useFollowedChildren, type FollowedChild } from '../../lib/follow'
import { projectedFuture } from '../../lib/mission'
import { formatGBP } from '../../lib/projections'
import { contributionLabel } from '../../lib/pledge'
import { Logo, FullScreenLoader } from '../../components/ui'

const CORE = '#2F6FC4'
const GOAL = 100000

/**
 * Grandparent "following" home — a focused follow-card per grandchild they contribute to:
 * the child's illustrative trajectory + progress toward the £100k mission, their own
 * contribution, and pay-in details once the account's open. Plus the growth loop: start
 * something for another grandchild. Read-only; all data via the gated get_followed_children.
 */
export default function FollowingHome() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { followed, loading } = useFollowedChildren()

  if (loading) return <FullScreenLoader />

  return (
    <div className="min-h-dvh w-full bg-offwhite">
      <div className="mx-auto w-full max-w-md px-5 pb-16">
        <div className="flex items-center justify-between py-4">
          <Logo />
          <button
            className="text-sm font-semibold text-slate-400 transition hover:text-slate-600"
            onClick={() => void signOut().then(() => navigate('/login', { replace: true }))}
          >
            Sign out
          </button>
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-midnight">
          {followed.length > 0 ? 'The families you follow' : 'Following'}
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          {followed.length > 0
            ? "Watch each grandchild's future grow, and add to it whenever you like."
            : "Once you've started something for a grandchild, their future will appear here."}
        </p>

        <div className="mt-5 space-y-4">
          {followed.map((c) => (
            <FollowCard key={c.childId} child={c} />
          ))}
        </div>

        {/* Growth loop — start something for another grandchild. */}
        <Link
          to="/pledge?rel=grandparent"
          className="mt-5 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-4 text-sm font-bold transition hover:brightness-105"
          style={{ borderColor: CORE, color: CORE, background: `${CORE}0d` }}
        >
          <span className="text-lg">＋</span> Start something for another grandchild
        </Link>
      </div>
    </div>
  )
}

function FollowCard({ child }: { child: FollowedChild }) {
  const [showPayin, setShowPayin] = useState(false)
  const projected = projectedFuture({
    monthlyTotal: child.householdMonthly,
    occasionsYear: child.occasionsGbpYear,
    ageMonths: child.ageMonths,
  })
  const pct = projected != null ? Math.min(100, Math.round((projected / GOAL) * 100)) : 0
  const mine = contributionLabel(child.myAmountPennies, child.myFrequency)
  const isLinked = child.myStatus === 'linked'

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="p-5">
        <div className="flex items-center gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full text-base font-extrabold text-white shadow-md"
            style={{ background: CORE }}
          >
            {child.childName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-midnight">{child.childName}</p>
            <p className="text-xs text-slate-400">
              {child.accountOpen ? 'Account open' : 'Account not open yet'}
            </p>
          </div>
        </div>

        {projected != null ? (
          <div className="mt-4">
            <p className="text-sm text-slate-500">
              On track for{' '}
              <span className="text-lg font-extrabold text-midnight">{formatGBP(projected)}</span> by 25
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.max(pct, 1.5)}%`, background: CORE }}
              />
            </div>
            <p className="mt-1 text-[11px] leading-snug text-slate-400">
              Illustrative — the family mission is £100,000 by 25. Assumes 7% p.a.; capital at risk.
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-slate-500">
            {child.childName}'s parent hasn't added a date of birth yet — the projection appears once
            they do.
          </p>
        )}

        {mine && (
          <div className="mt-4 rounded-xl bg-offwhite p-3.5">
            <p className="text-sm font-semibold text-midnight">
              {isLinked ? `You're giving ${mine}` : `You've pledged ${mine}`}
            </p>
            <p className="mt-0.5 text-xs leading-snug text-slate-500">
              {isLinked
                ? 'Thank you for building their future.'
                : `We'll show you exactly how to start the moment ${child.childName}'s account opens.`}
            </p>
          </div>
        )}

        {child.payin && (
          <div className="mt-3">
            <button
              onClick={() => setShowPayin((s) => !s)}
              className="text-xs font-bold transition hover:brightness-110"
              style={{ color: CORE }}
            >
              {showPayin ? 'Hide pay-in details ▲' : 'Show pay-in details ▾'}
            </button>
            {showPayin && (
              <div className="mt-2 space-y-2">
                {child.payin.providerName && <PayinRow label="Provider" value={child.payin.providerName} />}
                <PayinRow label="Sort code" value={child.payin.sortCode} />
                <PayinRow label="Account number" value={child.payin.accountNumber} />
                <PayinRow label="Reference" value={child.payin.reference} />
                <p className="pt-1 text-[11px] leading-snug text-slate-400">
                  Set up a standing order in your own banking app. Amplifi never holds or moves your money.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PayinRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
      <span className="text-xs text-slate-400">{label}</span>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(value)
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
        }}
        className="text-sm font-bold text-midnight"
      >
        {value} <span className="ml-1 text-[11px] font-semibold text-azure">{copied ? '✓' : 'Copy'}</span>
      </button>
    </div>
  )
}
