import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { calcProjections, formatGBP } from '../../lib/projections'
import { supabase } from '../../lib/supabase'
import type { PlanData } from './types'

interface Phase3Props {
  data: PlanData
}

export default function Phase3({ data }: Phase3Props) {
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const childName = data.childName || 'your child'
  const { startToday } = calcProjections(data.monthly, data.childAgeMonths)

  const isValid =
    firstName.trim().length > 0 &&
    email.includes('@') &&
    password.length >= 8 &&
    agreed

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
          housingStatus: data.housingStatus,
          childBenefitStatus: data.childBenefit,
          annualGiftSpend: data.giftSpend,
          cashbackParticipation: data.cashback,
          monthlyAmount: data.monthly,
          projectedValue: Math.round(startToday),
        }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setError('Something went wrong — please try again.')
      setLoading(false)
      return
    }

    // 2. Supabase — non-blocking on failure
    let userId: string | null = null
    let planId: string | null = null
    let foundingMemberNumber: number | null = null

    try {
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      foundingMemberNumber = (count ?? 0) + 1

      const referralCode = Math.random().toString(36).substring(2, 10).toUpperCase()
      const pad = (s: string) => s.padStart(2, '0')
      const childDob = `${data.dobYear}-${pad(data.dobMonth)}-${pad(data.dobDay)}`

      const { data: userRow, error: userError } = await supabase
        .from('users')
        .insert({
          email: email.trim(),
          first_name: firstName.trim(),
          founding_member_number: foundingMemberNumber,
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
            housing_status: data.housingStatus,
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
      // Supabase failure is non-blocking — continue to report
    }

    // 3. Persist report data for the next page
    sessionStorage.setItem(
      'amplifi_report_data',
      JSON.stringify({
        childName: data.childName,
        childAgeMonths: data.childAgeMonths,
        monthly: data.monthly,
        familyContrib: data.familyContrib,
        housingStatus: data.housingStatus,
        childBenefit: data.childBenefit,
        giftSpend: data.giftSpend,
        cashback: data.cashback,
        foundingMemberNumber,
        userId,
        planId,
      }),
    )

    navigate('/plan/report')
  }

  return (
    <section className="animate-fade-slide-up bg-midnight py-14 sm:py-20">
      <div className="max-w-lg mx-auto px-4 sm:px-6">
        {/* Founding member badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 bg-amber/10 border border-amber/30 text-amber text-sm font-semibold px-4 py-2 rounded-full">
            <span className="w-2 h-2 bg-amber rounded-full animate-pulse" />
            Founding member status available
          </div>
        </div>

        {/* Headline */}
        <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-3 tracking-tight">
          Save {childName}'s plan and secure your founding member status.
        </h2>
        <p className="text-white/60 text-center mb-8 text-base leading-relaxed">
          Your answers are saved. Create an account to receive your personalised report when we
          launch.
        </p>

        {/* Plan summary card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8">
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-3">
            {childName}'s plan
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

          <div>
            <label
              className="block text-white/70 text-sm font-medium mb-1.5"
              htmlFor="p3-password"
            >
              Password <span className="text-white/40">(min 8 characters)</span>
            </label>
            <input
              id="p3-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-sky/40 transition"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                required
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="peer sr-only"
              />
              <div className="w-5 h-5 border-2 border-white/30 rounded peer-checked:bg-azure peer-checked:border-azure transition-all group-hover:border-white/50" />
              {agreed && (
                <svg
                  className="absolute inset-0 w-5 h-5 text-white p-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-white/60 text-sm leading-relaxed">
              I agree to the{' '}
              <span className="text-sky underline cursor-pointer">Privacy Policy</span> and{' '}
              <span className="text-sky underline cursor-pointer">Terms</span>
            </span>
          </label>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={!isValid || loading}
            className="w-full bg-amber text-midnight font-bold py-4 rounded-xl hover:bg-amber/90 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed text-base min-h-[52px]"
          >
            {loading ? 'Saving…' : `Save ${data.childName ? `${data.childName}'s` : 'your'} plan`}
          </button>

          <p className="text-white/40 text-xs text-center pt-1">
            No spam. We'll only contact you about Amplifi.
          </p>
        </form>
      </div>
    </section>
  )
}
