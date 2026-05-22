import { useState } from 'react'
import { formatGBP, calcProjections } from '../../lib/projections'
import type { PlanData } from './types'

interface Phase3Props {
  data: PlanData
}

const FOUNDING_COUNT = 47

export default function Phase3({ data }: Phase3Props) {
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

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

    const payload = new URLSearchParams({
      'form-name': 'amplifi-plan',
      firstName: firstName.trim(),
      email: email.trim(),
      password,
      childName: data.childName,
      dobDay: data.dobDay,
      dobMonth: data.dobMonth,
      dobYear: data.dobYear,
      gender: data.gender,
      familyContrib: data.familyContrib,
      housingStatus: data.housingStatus,
      childBenefit: data.childBenefit,
      giftSpend: data.giftSpend,
      cashback: data.cashback,
      monthly: String(data.monthly),
      projectedValue: String(Math.round(startToday)),
    })

    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload.toString(),
      })
      if (!res.ok) throw new Error()
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <section className="animate-fade-slide-up bg-midnight py-20">
        <div className="max-w-lg mx-auto px-4 sm:px-6 text-center">
          <div className="text-5xl mb-6">🎉</div>
          <h2 className="text-3xl font-bold text-white mb-4">
            {data.childName ? `${data.childName}'s` : 'Your'} plan is saved.
          </h2>
          <p className="text-white/70 text-lg">We'll be in touch.</p>
        </div>
      </section>
    )
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

        {/* Founding member counter */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-white/50 text-sm">
            Join{' '}
            <span className="text-white font-semibold">{FOUNDING_COUNT} families</span> already
            saving for their children's futures.
          </p>
        </div>
      </div>
    </section>
  )
}
