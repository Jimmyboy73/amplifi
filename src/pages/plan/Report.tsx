import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fv, monthsTo21, calcProjections, formatGBP } from '../../lib/projections'

interface ReportData {
  childName: string
  childAgeMonths: number
  monthly: number
  familyContrib: string
  housingStatus: string
  childBenefit: string
  giftSpend: string
  cashback: string
  foundingMemberNumber: number | null
  userId: string | null
  planId: string | null
}

const GIFT_MIDPOINTS: Record<string, number> = {
  'under-200': 100,
  '200-500': 350,
  '500-1000': 750,
  'over-1000': 1250,
}

export default function Report() {
  const navigate = useNavigate()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [monthly, setMonthly] = useState(50)
  const [cashbackPref, setCashbackPref] = useState<string | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('amplifi_report_data')
    if (!raw) {
      navigate('/plan')
      return
    }
    try {
      const parsed = JSON.parse(raw) as ReportData
      setReportData(parsed)
      setMonthly(parsed.monthly)
      const stored = sessionStorage.getItem('cashback_method_preference')
      if (stored) setCashbackPref(stored)
    } catch {
      navigate('/plan')
    }
  }, [navigate])

  if (!reportData) return null

  const childName = reportData.childName || 'your child'
  const childPoss = childName === 'your child' ? "your child's" : `${childName}'s`
  const n = monthsTo21(reportData.childAgeMonths)

  // Section 1
  const { startToday, waitOneYear, costOfWaiting } = calcProjections(monthly, reportData.childAgeMonths)
  const costPerMonth = costOfWaiting / 12
  const sliderPct = ((monthly - 10) / 490) * 100

  // Section 2
  const showFamily = reportData.familyContrib === 'grandparents-likely' || reportData.familyContrib === 'maybe'
  const parentAlone = fv(monthly, n)
  const withGrandparents = fv(monthly + 50, n)
  const fullNetwork = fv(monthly + 100, n)
  const familyDelta = fullNetwork - parentAlone

  // Section 3
  const showBenefit = reportData.childBenefit === 'yes'
  const benefitExtra = fv(56, n)

  // Section 4
  const giftMidpoint = GIFT_MIDPOINTS[reportData.giftSpend] ?? 350
  const giftFV = fv((giftMidpoint / 2) / 12, n)

  // Section 5
  const cashbackFV = fv(350 / 12, n)

  const handleCashbackPref = (pref: string) => {
    setCashbackPref(pref)
    sessionStorage.setItem('cashback_method_preference', pref)
  }

  return (
    <div className="font-jakarta antialiased">

      {/* ── Section 1: Baseline ─────────────────────────────────────────────── */}
      <section className="bg-midnight min-h-screen flex flex-col justify-center px-4 sm:px-6 py-16">
        <div className="max-w-2xl mx-auto w-full">
          <p className="text-sky text-xs font-bold uppercase tracking-widest mb-3">Your plan</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight mb-3">
            {childPoss} financial future, built today.
          </h1>
          <p className="text-white/60 text-base sm:text-lg mb-10 leading-relaxed">
            Here's exactly what consistent investing can do — starting now.
          </p>

          {/* Slider */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/50 text-xs font-medium uppercase tracking-widest">
                Monthly contribution
              </p>
              <span className="text-white font-bold text-2xl">{formatGBP(monthly)}</span>
            </div>
            <input
              type="range"
              min={10}
              max={500}
              step={5}
              value={monthly}
              onChange={(e) => setMonthly(Number(e.target.value))}
              style={{
                background: `linear-gradient(to right, #59c9e9 0%, #59c9e9 ${sliderPct}%, rgba(255,255,255,0.15) ${sliderPct}%, rgba(255,255,255,0.15) 100%)`,
              }}
              className="w-full h-2 rounded-full outline-none cursor-pointer appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-sky [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-sky [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-white/30 text-xs mt-1.5">
              <span>£10</span>
              <span>£500</span>
            </div>
          </div>

          {/* Projection cards */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-sky/10 border border-sky/25 rounded-2xl p-4 sm:p-5">
              <p className="text-sky/70 text-xs font-semibold uppercase tracking-wider mb-2">
                Start today
              </p>
              <p className="text-white font-bold text-2xl sm:text-3xl leading-none">
                {formatGBP(startToday)}
              </p>
              <p className="text-white/35 text-xs mt-1.5">at age 21</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">
                Wait one year
              </p>
              <p className="text-white/70 font-bold text-2xl sm:text-3xl leading-none">
                {formatGBP(waitOneYear)}
              </p>
              <p className="text-white/35 text-xs mt-1.5">at age 21</p>
            </div>
          </div>

          {/* Cost of waiting */}
          <div className="bg-amber/10 border border-amber/25 rounded-xl px-4 py-3.5 mb-4">
            <p className="text-amber text-sm sm:text-base font-medium text-center">
              Every month you wait costs {childName}{' '}
              <span className="font-bold">{formatGBP(costPerMonth)}</span> in lost growth.
            </p>
          </div>

          <p className="text-white/25 text-[10px] leading-relaxed text-center">
            Illustrative only. Based on 8% p.a. growth, compounded monthly. Investment returns are
            not guaranteed and your capital is at risk.
          </p>
        </div>
      </section>

      {/* ── Section 2: Family multiplier ────────────────────────────────────── */}
      {showFamily && (
        <section className="bg-offwhite py-14 sm:py-20 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto w-full">
            <p className="text-azure text-xs font-bold uppercase tracking-widest mb-2">
              Family multiplier
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-midnight leading-tight mb-3">
              What if the whole family played a part?
            </h2>
            <p className="text-midnight/60 text-base mb-8 leading-relaxed">
              Families who invest together reach £10,000 for their child an average of 4 years
              faster than families investing alone.
            </p>

            <div className="space-y-3 mb-6">
              {/* Parent alone */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                      Parent alone
                    </p>
                    <p className="text-midnight font-semibold text-sm">{formatGBP(monthly)}/month</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-midnight font-bold text-2xl">{formatGBP(parentAlone)}</p>
                    <p className="text-slate-400 text-xs">at age 21</p>
                  </div>
                </div>
              </div>

              {/* Parent + 2 grandparents */}
              <div className="bg-azure/5 border border-azure/20 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-azure text-xs font-semibold uppercase tracking-wider mb-1">
                      Parent + 2 grandparents
                    </p>
                    <p className="text-midnight font-semibold text-sm">
                      {formatGBP(monthly + 50)}/month
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">+£25/month each from grandparents</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-midnight font-bold text-2xl">{formatGBP(withGrandparents)}</p>
                    <p className="text-slate-400 text-xs">at age 21</p>
                  </div>
                </div>
              </div>

              {/* Full network */}
              <div className="bg-sky/10 border border-sky/25 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sky text-xs font-semibold uppercase tracking-wider mb-1">
                      Full network
                    </p>
                    <p className="text-midnight font-semibold text-sm">
                      {formatGBP(monthly + 100)}/month
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">+aunts, uncles & friends too</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-midnight font-bold text-2xl">{formatGBP(fullNetwork)}</p>
                    <p className="text-slate-400 text-xs">at age 21</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Delta callout */}
            <div className="bg-midnight rounded-2xl px-5 py-5 text-center">
              <p className="text-white/60 text-sm mb-1">The family difference</p>
              <p className="text-sky font-bold text-4xl">{formatGBP(familyDelta)}</p>
              <p className="text-white/50 text-xs mt-1">more for {childName} by age 21</p>
            </div>
          </div>
        </section>
      )}

      {/* ── Section 3: Child Benefit ─────────────────────────────────────────── */}
      {showBenefit && (
        <section className="bg-white py-14 sm:py-20 px-4 sm:px-6 border-t border-slate-100">
          <div className="max-w-2xl mx-auto w-full">
            <p className="text-azure text-xs font-bold uppercase tracking-widest mb-2">
              Child Benefit
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-midnight leading-tight mb-3">
              The money you're already receiving.
            </h2>
            <p className="text-midnight/60 text-base mb-8 leading-relaxed">
              Most families spend Child Benefit on day-to-day costs. If you invested just half of
              it, here's what it would add to {childPoss} future.
            </p>

            <div className="bg-sky/10 border border-sky/25 rounded-2xl p-5 sm:p-6 mb-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sky text-xs font-semibold uppercase tracking-wider mb-1">
                    Half of Child Benefit
                  </p>
                  <p className="text-midnight font-semibold">£56/month invested</p>
                  <p className="text-slate-500 text-xs mt-0.5">Half of £26.05/week</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-midnight font-bold text-3xl">{formatGBP(benefitExtra)}</p>
                  <p className="text-slate-400 text-xs">extra by age 21</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full sm:w-auto bg-sky text-midnight font-semibold px-8 py-3.5 rounded-xl hover:bg-sky/90 active:scale-[0.98] transition-all min-h-[44px]"
            >
              Set this up at launch — I'll remind you
            </button>
          </div>
        </section>
      )}

      {/* ── Section 4: Gift reframe ──────────────────────────────────────────── */}
      <section className="bg-offwhite py-14 sm:py-20 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto w-full">
          <p className="text-azure text-xs font-bold uppercase tracking-widest mb-2">
            Gifts & occasions
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-midnight leading-tight mb-3">
            What if birthday money actually mattered?
          </h2>
          <p className="text-midnight/60 text-base mb-8 leading-relaxed">
            Your family spends approximately{' '}
            <strong className="text-midnight">{formatGBP(giftMidpoint)}</strong> on gifts for{' '}
            {childName} each year. If just half of that was invested instead of spent on things
            forgotten in a week, it would add{' '}
            <strong className="text-midnight">{formatGBP(giftFV)}</strong> to {childPoss} future.
          </p>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 mb-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                  Half of annual gifts invested
                </p>
                <p className="text-midnight font-semibold">{formatGBP(giftMidpoint / 2)}/year</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-midnight font-bold text-3xl">{formatGBP(giftFV)}</p>
                <p className="text-slate-400 text-xs">extra by age 21</p>
              </div>
            </div>
          </div>

          {/* Occasion pages teaser */}
          <div className="bg-azure/5 border border-azure/20 rounded-2xl p-5">
            <div className="flex gap-3">
              <span className="text-xl flex-shrink-0 mt-0.5">🎂</span>
              <div>
                <p className="text-midnight font-semibold text-sm mb-1">Amplifi occasion pages</p>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Amplifi's birthday occasion pages make it easy for family to invest instead of
                  buying toys. With one link, anyone can contribute directly to {childPoss} future —
                  no account needed on their end.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: Connect your bank ────────────────────────────────────── */}
      <section className="bg-white py-14 sm:py-20 px-4 sm:px-6 border-t border-slate-100">
        <div className="max-w-2xl mx-auto w-full">
          <p className="text-azure text-xs font-bold uppercase tracking-widest mb-2">Cashback</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-midnight leading-tight mb-3">
            See your real number.
          </h2>
          <p className="text-midnight/60 text-base mb-8 leading-relaxed">
            The average UK household generates between £250 and £450 in available cashback each
            year. Most of it is never captured. Link your bank and we'll calculate exactly what you
            could be adding to {childPoss} account every month — automatically.
          </p>

          <div className="grid sm:grid-cols-2 gap-3 mb-5">
            {/* Option A — Open banking */}
            <button
              type="button"
              onClick={() => handleCashbackPref('open-banking')}
              className={`text-left p-5 rounded-2xl border transition-all ${
                cashbackPref === 'open-banking'
                  ? 'bg-azure/10 border-azure'
                  : 'bg-white border-slate-200 hover:border-azure/50 hover:bg-azure/5'
              }`}
            >
              <p className="text-midnight font-semibold mb-1">Connect your bank</p>
              <p className="text-slate-500 text-sm leading-relaxed">
                See cashback from all your accounts. Takes 2 minutes.
              </p>
              {cashbackPref === 'open-banking' && (
                <p className="text-azure text-xs font-semibold mt-2">Selected ✓</p>
              )}
            </button>

            {/* Option B — Card link */}
            <button
              type="button"
              onClick={() => handleCashbackPref('card-link')}
              className={`text-left p-5 rounded-2xl border transition-all ${
                cashbackPref === 'card-link'
                  ? 'bg-azure/10 border-azure'
                  : 'bg-white border-slate-200 hover:border-azure/50 hover:bg-azure/5'
              }`}
            >
              <p className="text-midnight font-semibold mb-1">Link a card</p>
              <p className="text-slate-500 text-sm leading-relaxed">
                Simpler. Works on the card you use most.
              </p>
              {cashbackPref === 'card-link' && (
                <p className="text-azure text-xs font-semibold mt-2">Selected ✓</p>
              )}
            </button>
          </div>

          <p className="text-slate-400 text-sm text-center mb-8">
            Or skip for now — we'll use the UK average of £350/year in your plan.
          </p>

          {/* Generic cashback projection */}
          <div className="bg-offwhite border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                  UK average cashback
                </p>
                <p className="text-midnight font-semibold">£350/year invested</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-midnight font-bold text-3xl">{formatGBP(cashbackFV)}</p>
                <p className="text-slate-400 text-xs">extra by age 21</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 6: Founding member ───────────────────────────────────────── */}
      <section className="bg-midnight py-14 sm:py-20 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto w-full">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 bg-amber/10 border border-amber/40 text-amber text-sm font-semibold px-5 py-2.5 rounded-full">
              <span className="w-2 h-2 bg-amber rounded-full animate-pulse" />
              Founding member
              {reportData.foundingMemberNumber != null
                ? ` #${reportData.foundingMemberNumber}`
                : ''}
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center leading-tight mb-3 tracking-tight">
            Your launch benefits — available to founding members only.
          </h2>
          <p className="text-white/60 text-center text-base mb-10 leading-relaxed">
            These are locked in for you. They activate the moment Amplifi launches.
          </p>

          {/* Benefits */}
          <div className="space-y-4 mb-10">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-amber/10 border border-amber/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-amber font-bold text-sm">£5</span>
                </div>
                <div>
                  <p className="text-white font-semibold mb-1">Amplifi matches your first 3 months</p>
                  <p className="text-white/60 text-sm leading-relaxed">
                    Set up a regular contribution when we launch and we'll add £5/month to{' '}
                    {childPoss} account for your first 3 months. That's £15 Amplifi puts in
                    alongside you.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-amber/10 border border-amber/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-amber font-bold text-sm">£10</span>
                </div>
                <div>
                  <p className="text-white font-semibold mb-1">Refer a friend — double the match</p>
                  <p className="text-white/60 text-sm leading-relaxed">
                    Refer a friend who also sets up a contribution and we'll increase your match to
                    £10/month for 3 months — £30 total.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-sky/10 border border-sky/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-sky text-base">💳</span>
                </div>
                <div>
                  <p className="text-white font-semibold mb-1">First access to card-linked cashback</p>
                  <p className="text-white/60 text-sm leading-relaxed">
                    At launch, link your card and every qualifying purchase contributes to{' '}
                    {childPoss} future automatically. Founding members get first access.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <button
              type="button"
              className="w-full bg-amber text-midnight font-bold py-4 rounded-xl hover:bg-amber/90 active:scale-[0.99] transition-all text-base min-h-[52px]"
            >
              Set up my contribution — activate at launch
            </button>
            <button
              type="button"
              className="w-full bg-white/10 border border-white/20 text-white font-semibold py-4 rounded-xl hover:bg-white/15 active:scale-[0.99] transition-all text-base min-h-[52px]"
            >
              Share my personal link
            </button>
          </div>
        </div>
      </section>

    </div>
  )
}
