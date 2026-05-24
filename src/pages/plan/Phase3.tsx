import { useState, useEffect, useRef } from 'react'
import { fv, monthsTo21, formatGBP, calcProjections } from '../../lib/projections'
import { supabase } from '../../lib/supabase'
import type { PlanData } from './types'

interface Phase3Props {
  data: PlanData
}

const GIFT_MONTHLY: Record<string, number> = {
  'under-200': 100 / 2 / 12,
  '200-500': 350 / 2 / 12,
  '500-1000': 750 / 2 / 12,
  'over-1000': 1250 / 2 / 12,
}

function calcTotal(data: PlanData): number {
  const n = monthsTo21(data.childAgeMonths)
  let total = fv(data.monthly, n)
  if (data.familyContrib === 'grandparents-likely' || data.familyContrib === 'maybe') {
    total += fv(50, n)
  }
  if (data.childBenefit === 'yes') {
    total += fv(56, n)
  }
  total += fv(GIFT_MONTHLY[data.giftSpend] ?? 0, n)
  total += fv(350 / 12, n)
  return total
}

export default function Phase3({ data }: Phase3Props) {
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [foundingMemberNumber, setFoundingMemberNumber] = useState<number | null>(null)
  const [confirmDisplayValue, setConfirmDisplayValue] = useState(0)
  const [copied, setCopied] = useState(false)

  const childName = data.childName || 'your child'
  const childPoss = childName === 'your child' ? "your child's" : `${childName}'s`
  const { startToday } = calcProjections(data.monthly, data.childAgeMonths)
  const totalCalc = calcTotal(data)

  const isValid = firstName.trim().length > 0 && email.includes('@')

  // Counter animation after submission
  const rafRef = useRef<number>(0)
  useEffect(() => {
    if (!submitted) return
    const end = totalCalc
    const duration = 1500
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setConfirmDisplayValue(end * eased)
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [submitted, totalCalc])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)
    setError('')

    // 1. Formspree — primary submission, blocks on failure
    try {
      const res = await fetch('https://formspree.io/f/mredkbww', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          email: email.trim(),
          childName: data.childName,
          childDob: `${data.dobYear}-${data.dobMonth}-${data.dobDay}`,
          childGender: data.gender,
          familyContributorIntent: data.familyContrib,
          childBenefitStatus: data.childBenefit,
          annualGiftSpend: data.giftSpend,
          cashbackParticipation: data.cashback,
          monthlyAmount: data.monthly,
          projectedValue: Math.round(startToday),
          totalPotential: Math.round(totalCalc),
        }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setError('Something went wrong — please try again.')
      setLoading(false)
      return
    }

    // 2. Supabase — non-blocking on failure
    let foundingMemberNum: number | null = null
    let userId: string | null = null
    let planId: string | null = null

    try {
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      foundingMemberNum = (count ?? 0) + 1

      const referralCode = Math.random().toString(36).substring(2, 10).toUpperCase()
      const pad = (s: string) => s.padStart(2, '0')
      const childDob = `${data.dobYear}-${pad(data.dobMonth)}-${pad(data.dobDay)}`

      const { data: userRow, error: userError } = await supabase
        .from('users')
        .insert({
          email: email.trim(),
          first_name: firstName.trim(),
          founding_member_number: foundingMemberNum,
          referral_code: referralCode,
        })
        .select('id')
        .single()

      if (!userError && userRow) {
        userId = userRow.id

        const { data: planRow } = await supabase
          .from('plans')
          .insert({
            user_id: userId,
            child_name: data.childName,
            child_dob: childDob,
            child_gender: data.gender,
            monthly_amount: data.monthly,
            family_contributor_intent: data.familyContrib,
            child_benefit_status: data.childBenefit,
            annual_gift_spend_range: data.giftSpend,
            cashback_participation: data.cashback,
            projected_value_at_21: Math.round(startToday),
          })
          .select('id')
          .single()

        if (planRow) planId = planRow.id
      }
    } catch {
      // Supabase failure is non-blocking
    }

    // 3. Persist to sessionStorage for report page
    sessionStorage.setItem(
      'amplifi_report_data',
      JSON.stringify({
        childName: data.childName,
        childAgeMonths: data.childAgeMonths,
        monthly: data.monthly,
        familyContrib: data.familyContrib,
        childBenefit: data.childBenefit,
        giftSpend: data.giftSpend,
        cashback: data.cashback,
        foundingMemberNumber: foundingMemberNum,
        userId,
        planId,
      }),
    )

    setFoundingMemberNumber(foundingMemberNum)
    setLoading(false)
    setSubmitted(true)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText('https://letsamplifi.com/plan').catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Confirmation screen ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <section className="animate-fade-slide-up bg-midnight py-14 sm:py-20 px-4 sm:px-6">
        <div className="max-w-lg mx-auto">
          {/* Headline */}
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center leading-tight mb-3 tracking-tight">
            Your plan is on its way, {firstName}.
          </h2>
          <p className="text-white/60 text-center text-base mb-10 leading-relaxed">
            We've sent {childPoss} personalised financial picture to{' '}
            <span className="text-white font-medium">{email}</span>. Check your inbox — it should
            arrive within a few minutes.
          </p>

          {/* Revealed total */}
          <div className="bg-sky/10 border border-sky/25 rounded-2xl p-6 sm:p-8 mb-6 text-center">
            <p className="text-sky/70 text-xs font-bold uppercase tracking-widest mb-3">
              {childPoss} potential by age 21
            </p>
            <p className="text-white font-bold text-5xl sm:text-6xl leading-none mb-2">
              {formatGBP(confirmDisplayValue)}
            </p>
            <p className="text-white/50 text-sm leading-relaxed mt-3">
              This is {childPoss} potential — built by your family, starting today.
            </p>
          </div>

          {/* Founding member badge */}
          {foundingMemberNumber != null && (
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 bg-amber/10 border border-amber/40 text-amber text-sm font-semibold px-5 py-2.5 rounded-full">
                <span className="w-2 h-2 bg-amber rounded-full" />
                You are founding member #{foundingMemberNumber}
              </div>
            </div>
          )}

          {/* Share prompt */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
            <p className="text-white font-semibold mb-1">
              Know someone who should see this for their child?
            </p>
            <p className="text-white/50 text-sm mb-4">
              Share the link — it takes 2 minutes to build a plan.
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-medium py-3 rounded-xl hover:bg-white/15 active:scale-[0.98] transition-all text-sm"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-sky" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy letsamplifi.com/plan
                </>
              )}
            </button>
          </div>

          <p className="text-white/25 text-[10px] leading-relaxed text-center">
            Illustrative only. Based on 8% p.a. growth, compounded monthly. Investment returns are
            not guaranteed and your capital is at risk.
          </p>
        </div>
      </section>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <section className="animate-fade-slide-up bg-midnight py-14 sm:py-20">
      <div className="max-w-lg mx-auto px-4 sm:px-6">
        {/* Headline */}
        <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-3 tracking-tight">
          Save {childPoss} plan and secure your founding member status.
        </h2>
        <p className="text-white/60 text-center mb-8 text-base leading-relaxed">
          Your answers are saved. Create an account to receive your personalised report when we
          launch.
        </p>

        {/* Plan summary card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8">
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-3">
            {childPoss} plan
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-white/40 text-xs mb-1">Child</p>
              <p className="text-white font-semibold text-sm truncate">{childName}</p>
            </div>
            <div>
              <p className="text-white/40 text-xs mb-1">Monthly</p>
              <p className="text-white font-semibold text-sm">{formatGBP(data.monthly)}</p>
            </div>
            <div>
              <p className="text-white/40 text-xs mb-1">At age 21</p>
              <p className="text-sky font-bold text-sm">{formatGBP(startToday)}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="form-name" value="amplifi-plan" />
          <div hidden aria-hidden="true">
            <input name="bot-field" tabIndex={-1} />
          </div>

          <div>
            <label className="block text-white/70 text-sm font-medium mb-1.5" htmlFor="p3-name">
              First name
            </label>
            <input
              id="p3-name"
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Jane"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-sky/40 transition"
            />
          </div>

          <div>
            <label className="block text-white/70 text-sm font-medium mb-1.5" htmlFor="p3-email">
              Email address
            </label>
            <input
              id="p3-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.co.uk"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-sky/40 transition"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={!isValid || loading}
            className="w-full bg-amber text-midnight font-bold py-4 rounded-xl hover:bg-amber/90 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed text-base min-h-[52px]"
          >
            {loading
              ? 'Saving…'
              : `Save ${data.childName ? `${data.childName}'s` : "your child's"} plan`}
          </button>

          <p className="text-white/40 text-xs text-center pt-1">
            By continuing you agree to our{' '}
            <a href="/privacy" className="text-sky underline">
              Privacy Policy
            </a>
          </p>
        </form>
      </div>
    </section>
  )
}
