import { useState, useEffect } from 'react'
import posthog from 'posthog-js'
import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const childName = data.childName || 'your child'
  const childPoss = childName === 'your child' ? "your child's" : `${childName}'s`
  const { startToday } = calcProjections(data.monthly, data.childAgeMonths)
  const totalCalc = calcTotal(data)

  const isValid = firstName.trim().length > 0 && email.includes('@')

  useEffect(() => {
    posthog.capture('email_gate_viewed')
  }, [])

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

    posthog.capture('email_submitted')
    setLoading(false)
    navigate('/plan/report')
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
