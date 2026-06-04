import { useState, useRef, useEffect, useCallback } from 'react'
import posthog from 'posthog-js'
import { fv, formatGBP } from '../../lib/projections'

// ── DrumRollPicker ────────────────────────────────────────────────────────────
const ITEM_H = 48
const VISIBLE_ITEMS = 3

function clampOffset(o: number) {
  return Math.max(0, Math.min(17 * ITEM_H, o))
}

function DrumRollPicker({
  value,
  locked,
  onChange,
}: {
  value: number
  locked: boolean
  onChange: (age: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [, setTick] = useState(0)
  const rerender = useCallback(() => setTick((t) => t + 1), [])

  const offsetRef = useRef(value * ITEM_H)
  const animRef = useRef(0)
  const lockedRef = useRef(locked)
  const onChangeRef = useRef(onChange)
  const lastSnapped = useRef(value)

  lockedRef.current = locked
  onChangeRef.current = onChange

  const animateTo = useCallback(
    (target: number) => {
      cancelAnimationFrame(animRef.current)
      const from = offsetRef.current
      const t0 = performance.now()
      const dur = 220
      const step = (now: number) => {
        const p = Math.min((now - t0) / dur, 1)
        const eased = 1 - (1 - p) ** 3
        offsetRef.current = from + (target - from) * eased
        rerender()
        if (p < 1) {
          animRef.current = requestAnimationFrame(step)
        } else {
          offsetRef.current = target
          rerender()
          const age = Math.round(target / ITEM_H)
          if (age !== lastSnapped.current) {
            lastSnapped.current = age
            onChangeRef.current(age)
          }
        }
      }
      animRef.current = requestAnimationFrame(step)
    },
    [rerender],
  )

  // Sync to externally set value (e.g. lock from DOB)
  useEffect(() => {
    const target = value * ITEM_H
    if (Math.abs(offsetRef.current - target) > 1) {
      animateTo(target)
      lastSnapped.current = value
    }
  }, [value, animateTo])

  // Native event listeners so we can call preventDefault (passive: false)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let dragStartY = 0
    let dragStartOffset = 0
    let lastY = 0
    let lastT = 0
    let velocity = 0

    const snapNearest = (vel: number) => {
      const projected = clampOffset(offsetRef.current + vel * 14)
      const nearest = Math.round(projected / ITEM_H) * ITEM_H
      animateTo(nearest)
    }

    const notifyAge = () => {
      const age = Math.max(0, Math.min(17, Math.round(offsetRef.current / ITEM_H)))
      if (age !== lastSnapped.current) {
        lastSnapped.current = age
        onChangeRef.current(age)
      }
    }

    const onTouchStart = (e: TouchEvent) => {
      if (lockedRef.current) return
      e.preventDefault()
      cancelAnimationFrame(animRef.current)
      dragStartY = e.touches[0].clientY
      dragStartOffset = offsetRef.current
      lastY = dragStartY
      lastT = e.timeStamp
      velocity = 0
    }

    const onTouchMove = (e: TouchEvent) => {
      if (lockedRef.current) return
      e.preventDefault()
      const y = e.touches[0].clientY
      const dy = dragStartY - y
      offsetRef.current = clampOffset(dragStartOffset + dy)
      const dt = e.timeStamp - lastT
      if (dt > 0) velocity = (lastY - y) / dt
      lastY = y
      lastT = e.timeStamp
      rerender()
      notifyAge()
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (lockedRef.current) return
      e.preventDefault()
      snapNearest(velocity * 16)
    }

    const onWheel = (e: WheelEvent) => {
      if (lockedRef.current) return
      e.preventDefault()
      cancelAnimationFrame(animRef.current)
      offsetRef.current = clampOffset(offsetRef.current + e.deltaY * 0.5)
      const nearest = Math.round(offsetRef.current / ITEM_H) * ITEM_H
      offsetRef.current = nearest
      rerender()
      notifyAge()
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: false })
    el.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('wheel', onWheel)
      cancelAnimationFrame(animRef.current)
    }
  }, [animateTo, rerender])

  const offset = offsetRef.current
  const centreSlot = Math.floor(VISIBLE_ITEMS / 2)
  const translateY = centreSlot * ITEM_H - offset

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden select-none"
      style={{
        height: VISIBLE_ITEMS * ITEM_H,
        backgroundColor: '#101628',
        borderRadius: 14,
        border: `2px solid ${locked ? 'rgba(89,201,233,0.3)' : '#59C9E9'}`,
        cursor: locked ? 'default' : 'ns-resize',
      }}
    >
      {/* Centre selection band */}
      <div
        className="absolute inset-x-0 pointer-events-none"
        style={{
          top: centreSlot * ITEM_H,
          height: ITEM_H,
          background: 'rgba(89,201,233,0.08)',
          borderTop: '1px solid rgba(89,201,233,0.25)',
          borderBottom: '1px solid rgba(89,201,233,0.25)',
        }}
      />

      {/* Scrolling age list */}
      <div style={{ transform: `translateY(${translateY}px)`, willChange: 'transform' }}>
        {Array.from({ length: 18 }, (_, age) => {
          const dist = Math.abs(age - offset / ITEM_H)
          const t = Math.min(dist, 1)
          const isSelected = dist < 0.5
          return (
            <div
              key={age}
              style={{
                height: ITEM_H,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isSelected ? '#59C9E9' : 'rgba(255,255,255,0.7)',
                fontSize: isSelected ? '20px' : '17px',
                fontWeight: isSelected ? 700 : 500,
                opacity: 1 - t * 0.6,
                transform: `scale(${1 - t * 0.15})`,
              }}
            >
              {age} {age === 1 ? 'year old' : 'years old'}
            </div>
          )
        })}
      </div>

      {/* Locked state indicator */}
      {locked && (
        <div className="absolute bottom-2 right-3 flex items-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 20 20" fill="rgba(89,201,233,0.5)">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          <span style={{ color: 'rgba(89,201,233,0.5)', fontSize: '10px' }}>from date of birth</span>
        </div>
      )}
    </div>
  )
}

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
  childAgeMonthsLocked,
  onAgeChange,
  onMonthlyChange,
}: Phase1Props) {
  const displayAge = Math.floor(effectiveAgeMonths / 12)
  const n = Math.max(0, 252 - effectiveAgeMonths) // months to age 21
  const startToday = fv(monthly, n)

  const waitOneYear = fv(monthly, Math.max(0, n - 12))
  const lossOneYear = startToday - waitOneYear

  // Box 3: X = min(5, 21 - age - 1), floored at 1 so the label stays meaningful
  const waitBox3Years = Math.max(1, Math.min(5, 21 - displayAge - 1))
  const lossBox3 = startToday - fv(monthly, Math.max(0, n - waitBox3Years * 12))

  const sliderPct = ((monthly - 10) / (500 - 10)) * 100
  const pickerValue = childAgeMonthsLocked ? displayAge : ageChip
  const quizStartedRef = useRef(false)

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

        {/* Age picker + contribution slider — stacked on mobile, side by side on sm+ */}
        <div className="flex flex-col sm:flex-row sm:items-stretch gap-6 mb-8">
          {/* Age drum roll picker */}
          <div className="flex-1">
            <p className="text-white/50 text-xs font-medium uppercase tracking-widest mb-3">
              Child's age
            </p>
            <DrumRollPicker
              value={pickerValue}
              locked={childAgeMonthsLocked}
              onChange={onAgeChange}
            />
            {childAgeMonthsLocked && (
              <p className="text-white/30 text-xs mt-2">Age calculated from date of birth</p>
            )}
          </div>

          {/* Monthly contribution slider */}
          <div className="flex-1 flex flex-col justify-start">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/50 text-xs font-medium uppercase tracking-widest">
                Monthly contribution
              </p>
              <span className="text-white font-bold text-2xl">{formatGBP(monthly)}</span>
            </div>
            <div
              className="flex flex-col justify-center px-4"
              style={{
                height: VISIBLE_ITEMS * ITEM_H,
                backgroundColor: '#101628',
                borderRadius: 14,
                border: '2px solid #59C9E9',
              }}
            >
              <input
                type="range"
                min={10}
                max={500}
                step={5}
                value={monthly}
                onChange={(e) => {
                  if (!quizStartedRef.current) {
                    quizStartedRef.current = true
                    posthog.capture('quiz_started', { child_age_months: effectiveAgeMonths })
                  }
                  onMonthlyChange(Number(e.target.value))
                }}
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
          </div>
        </div>

        {/* Output boxes */}
        <div className="mb-6">
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
            <div
              className="rounded-2xl p-4 sm:p-5"
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">
                Wait 1 year
              </p>
              <p className="text-white/40 text-xs mb-2">You could miss out on</p>
              <p className="font-bold text-2xl sm:text-3xl leading-none" style={{ color: '#D97706' }}>
                {formatGBP(lossOneYear)}
              </p>
            </div>
            <div
              className="rounded-2xl p-4 sm:p-5"
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">
                Wait {waitBox3Years} {waitBox3Years === 1 ? 'year' : 'years'}
              </p>
              <p className="text-white/40 text-xs mb-2">You could miss out on</p>
              <p className="font-bold text-2xl sm:text-3xl leading-none" style={{ color: '#D97706' }}>
                {formatGBP(lossBox3)}
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={scrollToQuestions}
          className="w-full inline-flex items-center justify-center gap-2 font-bold text-base sm:text-lg px-6 py-3.5 rounded-2xl transition-all hover:opacity-90 active:scale-[0.98] shadow-lg shadow-sky/20 mb-4"
          style={{ backgroundColor: '#59C9E9', color: '#101628' }}
        >
          This is just the beginning... see your family's full picture below.
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
      <div className="pb-8 flex flex-col items-center gap-2 animate-bounce">
        <p className="text-white/70 text-xs font-medium tracking-wide">Scroll to build your picture</p>
        <svg
          className="w-16 h-16"
          style={{ color: '#59C9E9' }}
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
