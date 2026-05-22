import { calcProjections, formatGBP } from '../../lib/projections'

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
  const { startToday, waitOneYear, costOfWaiting } = calcProjections(monthly, effectiveAgeMonths)
  const costPerMonth = costOfWaiting / 12
  const sliderPct = ((monthly - 10) / 490) * 100
  const displayAge = Math.floor(effectiveAgeMonths / 12)

  return (
    <section className="relative min-h-screen bg-midnight flex flex-col overflow-hidden">
      {/* Founding member badge — top right */}
      <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-10 max-w-[180px] sm:max-w-none">
        <div className="bg-sky/10 border border-sky/30 text-sky text-[10px] sm:text-xs font-semibold px-2.5 py-1.5 rounded-full leading-snug text-center">
          Launching 2026 — founding member benefits available
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full px-4 sm:px-6 pt-16 sm:pt-20 pb-8">
        {/* Headlines */}
        <div className="mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight mb-4">
            Your child's financial future starts the day they're born.
          </h1>
          <p className="text-sky/80 text-base sm:text-lg leading-relaxed">
            Most parents spend 18 years raising a child. Almost none spend 18 years investing for one.
          </p>
        </div>

        {/* Age chips */}
        <div className="mb-6">
          <p className="text-white/50 text-xs font-medium uppercase tracking-widest mb-3">
            {effectiveName ? `${effectiveName}'s age` : 'How old is your child?'}
          </p>
          <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
            {Array.from({ length: 18 }, (_, i) => {
              const isSelected = childAgeMonthsLocked ? i === displayAge : i === ageChip
              return (
                <button
                  key={i}
                  type="button"
                  disabled={childAgeMonthsLocked}
                  onClick={() => onAgeChange(i)}
                  className={`h-11 rounded-xl text-sm font-semibold transition-all ${
                    isSelected
                      ? 'bg-sky text-midnight shadow-lg shadow-sky/20'
                      : 'bg-white/10 text-white/70 hover:bg-white/20 active:scale-95'
                  } disabled:cursor-default`}
                >
                  {i}
                </button>
              )
            })}
          </div>
          {childAgeMonthsLocked && (
            <p className="text-white/30 text-xs mt-2">Age calculated from date of birth</p>
          )}
        </div>

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
            onChange={(e) => onMonthlyChange(Number(e.target.value))}
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

        {/* Output boxes */}
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

        {/* Cost of waiting line */}
        <div className="bg-amber/10 border border-amber/25 rounded-xl px-4 py-3.5 mb-2">
          <p className="text-amber text-sm sm:text-base font-medium text-center">
            Every month you wait costs{' '}
            {effectiveName || 'your child'}{' '}
            <span className="font-bold">{formatGBP(costPerMonth)}</span> in lost growth.
          </p>
        </div>

        {/* Disclaimer */}
        <p className="text-white/25 text-[10px] leading-relaxed text-center mb-2">
          Illustrative only. Based on 8% p.a. growth, compounded monthly. Investment returns are not
          guaranteed and your capital is at risk.
        </p>
      </div>

      {/* Scroll prompt */}
      <div className="pb-8 flex flex-col items-center gap-2 text-white/30">
        <p className="text-xs">Build {effectiveName ? `${effectiveName}'s` : "your child's"} full plan below</p>
        <svg
          className="w-5 h-5 animate-bounce"
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
