import { fv, monthsTo21, formatGBP } from '../../lib/projections'

interface Phase1Props {
  ageChip: number
  monthly: number
  effectiveAgeMonths: number
  effectiveName: string
  childAgeMonthsLocked: boolean
  onAgeChange: (age: number) => void
  onMonthlyChange: (amount: number) => void
}

export default function Phase1({
  ageChip,
  monthly,
  effectiveAgeMonths,
  effectiveName,
  childAgeMonthsLocked,
  onAgeChange,
  onMonthlyChange,
}: Phase1Props) {
  const displayAge = Math.floor(effectiveAgeMonths / 12)
  const n = monthsTo21(effectiveAgeMonths)
  const startToday = fv(monthly, n)

  const waitOneYear = fv(monthly, Math.max(0, n - 12))
  const lossOneYear = startToday - waitOneYear

  // Box 3: wait X years where X = min(5, yearsRemaining), except for age 16/17
  // use yearsRemaining-1 so the value stays non-zero
  const yearsRemaining = 21 - displayAge
  const waitBox3Years =
    displayAge >= 16 ? yearsRemaining - 1 : Math.min(5, yearsRemaining)
  const lossBox3 = startToday - fv(monthly, Math.max(0, n - waitBox3Years * 12))

  const costPerMonth = startToday - fv(monthly, Math.max(0, n - 1))

  const sliderPct = ((monthly - 10) / (250 - 10)) * 100

  const scrollToQuestions = () => {
    document.getElementById('plan-questions')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative min-h-screen bg-midnight flex flex-col overflow-hidden">
      {/* Founding member badge */}
      <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-10">
        <div
          className="text-sm sm:text-base font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded-full leading-snug text-center shadow-lg"
          style={{ backgroundColor: '#59C9E9', color: '#101628' }}
        >
          Launching 2026 — founding member benefits available
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full px-4 sm:px-6 pt-16 sm:pt-20 pb-8">
        {/* Headlines */}
        <div className="mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight mb-4">
            See what your child could have by the age of 21
          </h1>
          <p className="text-sky/80 text-base sm:text-lg leading-relaxed">
            Your child's financial future should start the day they're born.
          </p>
        </div>

        {/* Age dropdown + contribution slider — stacked on mobile, side by side on sm+ */}
        <div className="flex flex-col sm:flex-row gap-6 mb-8">
          {/* Age dropdown */}
          <div className="flex-1">
            <p className="text-white/50 text-xs font-medium uppercase tracking-widest mb-3">
              Child's age
            </p>
            <div className="relative">
              <select
                value={childAgeMonthsLocked ? displayAge : ageChip}
                disabled={childAgeMonthsLocked}
                onChange={(e) => onAgeChange(Number(e.target.value))}
                className="w-full h-14 rounded-xl px-4 pr-10 text-base font-semibold appearance-none outline-none cursor-pointer disabled:cursor-default disabled:opacity-60"
                style={{
                  backgroundColor: '#101628',
                  color: 'white',
                  border: '2px solid #59C9E9',
                }}
              >
                {Array.from({ length: 18 }, (_, i) => (
                  <option key={i} value={i} style={{ backgroundColor: '#101628', color: 'white' }}>
                    {i} {i === 1 ? 'year old' : 'years old'}
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5"
                style={{ color: '#59C9E9' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {childAgeMonthsLocked && (
              <p className="text-white/30 text-xs mt-2">Age calculated from date of birth</p>
            )}
          </div>

          {/* Monthly contribution slider */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/50 text-xs font-medium uppercase tracking-widest">
                Monthly contribution
              </p>
              <span className="text-white font-bold text-2xl">{formatGBP(monthly)}</span>
            </div>
            <input
              type="range"
              min={10}
              max={250}
              step={5}
              value={monthly}
              onChange={(e) => onMonthlyChange(Number(e.target.value))}
              style={{
                background: `linear-gradient(to right, #59c9e9 0%, #59c9e9 ${sliderPct}%, rgba(255,255,255,0.15) ${sliderPct}%, rgba(255,255,255,0.15) 100%)`,
              }}
              className="w-full h-2 rounded-full outline-none cursor-pointer appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-sky [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-sky [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-white/30 text-xs mt-1.5">
              <span>£10</span>
              <span>£250</span>
            </div>
          </div>
        </div>

        {/* Output boxes */}
        <div className="mb-5">
          {/* Box 1 — full-width hero */}
          <div
            className="rounded-2xl p-5 sm:p-7 mb-3"
            style={{ backgroundColor: '#59C9E9', color: '#101628' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ opacity: 0.65 }}>
              Start investing today
            </p>
            <p className="font-bold text-5xl sm:text-6xl leading-none">
              {formatGBP(startToday)}
            </p>
            <p className="text-xs mt-2" style={{ opacity: 0.6 }}>at age 21</p>
          </div>

          {/* Boxes 2 & 3 — side by side, loss framing */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">
                Wait 1 year
              </p>
              <p className="text-white/30 text-xs mb-2">You could miss out on</p>
              <p className="text-white/70 font-bold text-2xl sm:text-3xl leading-none">
                {formatGBP(lossOneYear)}
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">
                Wait {waitBox3Years} {waitBox3Years === 1 ? 'year' : 'years'}
              </p>
              <p className="text-white/30 text-xs mb-2">You could miss out on</p>
              <p className="text-white/70 font-bold text-2xl sm:text-3xl leading-none">
                {formatGBP(lossBox3)}
              </p>
            </div>
          </div>
        </div>

        {/* Cost of waiting line */}
        <div className="bg-amber/10 border border-amber/25 rounded-xl px-4 py-3.5 mb-6">
          <p className="text-amber text-sm sm:text-base font-medium text-center">
            Every month you delay costs{' '}
            {effectiveName || 'your child'}{' '}
            <span className="font-bold">{formatGBP(costPerMonth)}</span> in lost growth.
          </p>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={scrollToQuestions}
          className="w-full inline-flex items-center justify-center gap-2 font-bold text-base sm:text-lg px-6 py-3.5 rounded-2xl transition-all hover:opacity-90 active:scale-[0.98] shadow-lg shadow-sky/20 mb-4"
          style={{ backgroundColor: '#59C9E9', color: '#101628' }}
        >
          Build your report and see your child's financial future
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Disclaimer */}
        <p className="text-white/25 text-[10px] leading-relaxed text-center mb-2">
          Illustrative only. Based on 8% p.a. growth, compounded monthly. Investment returns are not
          guaranteed and your capital is at risk.
        </p>
      </div>

      {/* Scroll indicator */}
      <div className="pb-8 flex flex-col items-center gap-1">
        <svg
          className="w-10 h-10 text-white/50 animate-bounce"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  )
}
