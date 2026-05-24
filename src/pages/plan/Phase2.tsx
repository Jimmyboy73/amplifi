import { useState, useRef, useEffect, useCallback } from 'react'
import {
  fv,
  monthsTo21,
  formatGBP,
  formatCompoundingTime,
  dobToAgeMonths,
} from '../../lib/projections'
import type { PlanData } from './types'

interface Phase2Props {
  data: PlanData
  completedQuestions: number
  onUpdate: (updates: Partial<PlanData>) => void
  onComplete: (questionIndex: number) => void
}

// ─── Gift monthly equivalents ─────────────────────────────────────────────────

const GIFT_MONTHLY: Record<string, number> = {
  'under-200': 100 / 2 / 12,
  '200-500': 350 / 2 / 12,
  '500-1000': 750 / 2 / 12,
  'over-1000': 1250 / 2 / 12,
}

// ─── Thermometer calculation ──────────────────────────────────────────────────

function calcThermometerTotal(data: PlanData, completedQuestions: number): number {
  const n = monthsTo21(data.childAgeMonths)
  let total = fv(data.monthly, n)
  if (
    completedQuestions >= 2 &&
    (data.familyContrib === 'grandparents-likely' || data.familyContrib === 'maybe')
  ) {
    total += fv(50, n)
  }
  if (completedQuestions >= 3 && data.childBenefit === 'yes') {
    total += fv(56, n)
  }
  if (completedQuestions >= 4) {
    const gm = GIFT_MONTHLY[data.giftSpend] ?? 0
    if (gm > 0) total += fv(gm, n)
  }
  if (completedQuestions >= 5) {
    total += fv(350 / 12, n)
  }
  return total
}

// ─── Shared UI pieces ────────────────────────────────────────────────────────

function InvestorQuote({ quote, attribution }: { quote: string; attribution: string }) {
  return (
    <div className="mb-4 pb-4 border-b border-azure/20">
      <p className="text-midnight text-base sm:text-lg font-medium leading-snug italic mb-1.5">
        "{quote}"
      </p>
      <p className="text-midnight/55 text-sm">— {attribution}</p>
    </div>
  )
}

function InsightCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-slide-up mt-6 bg-azure/10 border border-azure/20 rounded-2xl p-5 sm:p-6">
      <div className="flex gap-3">
        <span className="text-xl flex-shrink-0">💡</span>
        <div className="text-midnight text-sm sm:text-base leading-relaxed w-full">{children}</div>
      </div>
    </div>
  )
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm font-medium transition-all min-h-[44px] ${
        selected
          ? 'bg-azure/10 border-azure text-midnight'
          : 'bg-white border-slate-200 text-slate-700 hover:border-azure/50 hover:bg-azure/5'
      }`}
    >
      <span className="flex items-center gap-3">
        <span
          className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
            selected ? 'border-azure bg-azure' : 'border-slate-300'
          }`}
        >
          {selected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
        </span>
        {children}
      </span>
    </button>
  )
}

function ContinueButton({
  disabled,
  onClick,
  label = 'Continue',
}: {
  disabled: boolean
  onClick: () => void
  label?: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="mt-6 w-full sm:w-auto bg-midnight text-white font-semibold px-8 py-3.5 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-midnight/80 active:scale-[0.98] min-h-[44px]"
    >
      {label} →
    </button>
  )
}

function QuestionWrapper({
  sectionRef,
  isLocked,
  label,
  children,
}: {
  sectionRef: React.RefObject<HTMLDivElement | null>
  isLocked: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <div
      ref={sectionRef}
      className={`scroll-mt-44 transition-all duration-500 ${
        isLocked ? 'opacity-40 [filter:blur(3px)] pointer-events-none select-none' : ''
      }`}
    >
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 sm:p-7">
        <p className="text-sky text-xs font-bold uppercase tracking-widest mb-4">{label}</p>
        {children}
      </div>
    </div>
  )
}

// ─── Q1: Child details ────────────────────────────────────────────────────────

function Q1({
  sectionRef,
  isLocked,
  isCompleted,
  data,
  onUpdate,
  onComplete,
}: {
  sectionRef: React.RefObject<HTMLDivElement | null>
  isLocked: boolean
  isCompleted: boolean
  data: PlanData
  onUpdate: (u: Partial<PlanData>) => void
  onComplete: () => void
}) {
  const [name, setName] = useState(data.childName)
  const [day, setDay] = useState(data.dobDay)
  const [month, setMonth] = useState(data.dobMonth)
  const [year, setYear] = useState(data.dobYear)
  const [gender, setGender] = useState(data.gender)
  const [dobError, setDobError] = useState('')

  const monthRef = useRef<HTMLInputElement>(null)
  const yearRef = useRef<HTMLInputElement>(null)

  const ageMonths = dobToAgeMonths(day, month, year)
  const isValid = name.trim().length > 0 && ageMonths !== null

  const handleDayChange = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 2)
    setDay(digits)
    setDobError('')
    if (digits.length === 2) monthRef.current?.focus()
  }

  const handleMonthChange = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 2)
    setMonth(digits)
    setDobError('')
    if (digits.length === 2) yearRef.current?.focus()
  }

  const handleYearChange = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 4)
    setYear(digits)
    setDobError('')
    if (digits.length === 4) {
      const age = dobToAgeMonths(day, month, digits)
      if (age === null) setDobError('Please enter a valid date of birth (child must be aged 0–17).')
    }
  }

  const handleContinue = () => {
    if (!isValid || ageMonths === null) return
    onUpdate({
      childName: name.trim(),
      dobDay: day,
      dobMonth: month,
      dobYear: year,
      gender,
      childAgeMonths: ageMonths,
    })
    onComplete()
  }

  const n = monthsTo21(ageMonths ?? data.childAgeMonths)
  const insightName = name.trim() || 'Your child'

  return (
    <QuestionWrapper sectionRef={sectionRef} isLocked={isLocked} label="About your child">
      {/* Name */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-midnight mb-1.5">
          Child's first name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Oliver"
          disabled={isCompleted}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-midnight placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-azure/30 focus:border-azure transition disabled:bg-slate-50 disabled:text-slate-500"
        />
      </div>

      {/* DOB */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-midnight mb-1.5">
          Date of birth
        </label>
        <div className="flex gap-3">
          <div className="w-20">
            <input
              type="text"
              inputMode="numeric"
              placeholder="DD"
              value={day}
              onChange={(e) => handleDayChange(e.target.value)}
              disabled={isCompleted}
              className="w-full border border-slate-200 rounded-xl px-3 py-3 text-midnight text-center placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-azure/30 focus:border-azure transition disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
          <div className="w-20">
            <input
              ref={monthRef}
              type="text"
              inputMode="numeric"
              placeholder="MM"
              value={month}
              onChange={(e) => handleMonthChange(e.target.value)}
              disabled={isCompleted}
              className="w-full border border-slate-200 rounded-xl px-3 py-3 text-midnight text-center placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-azure/30 focus:border-azure transition disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
          <div className="w-28">
            <input
              ref={yearRef}
              type="text"
              inputMode="numeric"
              placeholder="YYYY"
              value={year}
              onChange={(e) => handleYearChange(e.target.value)}
              disabled={isCompleted}
              className="w-full border border-slate-200 rounded-xl px-3 py-3 text-midnight text-center placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-azure/30 focus:border-azure transition disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
        </div>
        {dobError && <p className="text-red-500 text-xs mt-1.5">{dobError}</p>}
      </div>

      {/* Gender (optional) */}
      <div className="mb-2">
        <label className="block text-sm font-semibold text-midnight mb-1.5">
          Gender <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {(['Boy', 'Girl', 'Prefer not to say'] as const).map((g) => {
            const val = g.toLowerCase().replace(/ /g, '-')
            return (
              <button
                key={g}
                type="button"
                disabled={isCompleted}
                onClick={() => setGender(gender === val ? '' : val)}
                className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all min-h-[44px] ${
                  gender === val
                    ? 'bg-azure/10 border-azure text-midnight'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-azure/50'
                } disabled:cursor-default`}
              >
                {g}
              </button>
            )
          })}
        </div>
      </div>

      {!isCompleted && (
        <ContinueButton disabled={!isValid} onClick={handleContinue} label="Continue" />
      )}

      {isCompleted && (
        <InsightCard>
          <InvestorQuote
            quote="Compound interest is the eighth wonder of the world. He who understands it, earns it. He who doesn't, pays it."
            attribution="Albert Einstein"
          />
          <p>
            {insightName} has{' '}
            <strong>{formatCompoundingTime(n)}</strong> of compounding time ahead of them. That is
            one of the most powerful financial assets any person can have — and it belongs entirely
            to {insightName === 'Your child' ? 'them' : insightName} right now.
          </p>
        </InsightCard>
      )}
    </QuestionWrapper>
  )
}

// ─── Q2: Family contribution (Part B housing removed) ────────────────────────

const FAMILY_OPTIONS = [
  { value: 'grandparents-likely', label: 'Grandparents and other family members would likely contribute' },
  { value: 'maybe', label: "Maybe — I'm not sure yet" },
  { value: 'just-me', label: 'Probably just me for now' },
]

function Q2({
  sectionRef,
  isLocked,
  isCompleted,
  data,
  onUpdate,
  onComplete,
}: {
  sectionRef: React.RefObject<HTMLDivElement | null>
  isLocked: boolean
  isCompleted: boolean
  data: PlanData
  onUpdate: (u: Partial<PlanData>) => void
  onComplete: () => void
}) {
  const [answer, setAnswer] = useState(data.familyContrib)
  const childName = data.childName || 'your child'

  const n = monthsTo21(data.childAgeMonths)
  const parentAlone = fv(data.monthly, n)
  const withGrandparents = fv(data.monthly + 50, n)
  const fullNetwork = fv(data.monthly + 100, n)
  const delta = fullNetwork - parentAlone
  const maxVal = fullNetwork

  const scenarios = [
    { label: 'You alone', value: parentAlone, color: '#101628' },
    { label: 'You + 2 grandparents', value: withGrandparents, color: '#407BBF' },
    { label: 'Full family network', value: fullNetwork, color: '#59C9E9' },
  ]

  const handleContinue = () => {
    onUpdate({ familyContrib: answer })
    onComplete()
  }

  return (
    <QuestionWrapper sectionRef={sectionRef} isLocked={isLocked} label="Family">
      <p className="text-midnight font-semibold text-base mb-4">
        Who else in the family might contribute to {childName}'s future?
      </p>
      <div className="space-y-2.5 mb-2">
        {FAMILY_OPTIONS.map((o) => (
          <OptionButton
            key={o.value}
            selected={answer === o.value}
            onClick={() => !isCompleted && setAnswer(o.value)}
          >
            {o.label}
          </OptionButton>
        ))}
      </div>

      {!isCompleted && (
        <ContinueButton disabled={answer === ''} onClick={handleContinue} />
      )}

      {isCompleted && (
        <InsightCard>
          <InvestorQuote
            quote="The first rule of compounding: never interrupt it unnecessarily."
            attribution="Warren Buffett"
          />

          {/* Scenario cards */}
          <div className="space-y-2 mb-4">
            {scenarios.map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ backgroundColor: s.color + '18', border: `1px solid ${s.color}40` }}
              >
                <p className="text-midnight text-sm font-medium">{s.label}</p>
                <p className="text-midnight font-bold text-sm">{formatGBP(s.value)}</p>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-2 mb-4" style={{ height: 120 }}>
            {scenarios.map((s) => (
              <div key={s.label} className="flex-1 flex flex-col items-center gap-1">
                <p className="text-[10px] font-bold text-midnight leading-tight text-center">
                  {formatGBP(s.value)}
                </p>
                <div
                  className="w-full rounded-t-md transition-all duration-500"
                  style={{
                    backgroundColor: s.color,
                    height: maxVal > 0 ? `${(s.value / maxVal) * 90}px` : '4px',
                    minHeight: '4px',
                  }}
                />
                <p className="text-[9px] text-slate-500 text-center leading-tight">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Delta callout */}
          <p className="text-sm">
            Investing together could mean{' '}
            <strong>{formatGBP(delta)}</strong> more for {childName} by age 21.
          </p>
        </InsightCard>
      )}
    </QuestionWrapper>
  )
}

// ─── Q3: Child Benefit ────────────────────────────────────────────────────────

const BENEFIT_OPTIONS = [
  { value: 'yes', label: 'Yes — I receive Child Benefit' },
  { value: 'no', label: "No — I don't receive it or it's being clawed back" },
  { value: 'not-sure', label: 'Not sure' },
]

function Q3({
  sectionRef,
  isLocked,
  isCompleted,
  data,
  onUpdate,
  onComplete,
}: {
  sectionRef: React.RefObject<HTMLDivElement | null>
  isLocked: boolean
  isCompleted: boolean
  data: PlanData
  onUpdate: (u: Partial<PlanData>) => void
  onComplete: () => void
}) {
  const [answer, setAnswer] = useState(data.childBenefit)
  const childName = data.childName || 'your child'

  const n = monthsTo21(data.childAgeMonths)
  const baseVal = fv(data.monthly, n)
  const withBenefit = fv(data.monthly + 56, n)
  const delta = withBenefit - baseVal

  const handleContinue = () => {
    onUpdate({ childBenefit: answer })
    onComplete()
  }

  return (
    <QuestionWrapper sectionRef={sectionRef} isLocked={isLocked} label="Child Benefit">
      <p className="text-midnight font-semibold text-base mb-4">
        Do you currently receive Child Benefit?
      </p>
      <div className="space-y-2.5">
        {BENEFIT_OPTIONS.map((o) => (
          <OptionButton
            key={o.value}
            selected={answer === o.value}
            onClick={() => !isCompleted && setAnswer(o.value)}
          >
            {o.label}
          </OptionButton>
        ))}
      </div>

      {!isCompleted && (
        <ContinueButton disabled={answer === ''} onClick={handleContinue} />
      )}

      {isCompleted && (
        <InsightCard>
          <InvestorQuote
            quote="Time is the most powerful force in investing."
            attribution="Morgan Housel, The Psychology of Money"
          />
          {answer === 'yes' ? (
            <p>
              Investing half your Child Benefit (£56/month) alongside your{' '}
              <strong>{formatGBP(data.monthly)}/month</strong> could mean an extra{' '}
              <strong>{formatGBP(delta)}</strong> for {childName} by age 21.
            </p>
          ) : (
            <p>
              Families receiving Child Benefit who invest just half of it could add an extra{' '}
              <strong>{formatGBP(fv(56, n))}</strong> to their child's future — on top of their
              regular contributions.
            </p>
          )}
        </InsightCard>
      )}
    </QuestionWrapper>
  )
}

// ─── Q4: Gift spend ───────────────────────────────────────────────────────────

const GIFT_OPTIONS = [
  { value: 'under-200', label: 'Under £200', midpoint: 100 },
  { value: '200-500', label: '£200–£500', midpoint: 350 },
  { value: '500-1000', label: '£500–£1,000', midpoint: 750 },
  { value: 'over-1000', label: 'Over £1,000', midpoint: 1250 },
]

function Q4({
  sectionRef,
  isLocked,
  isCompleted,
  data,
  onUpdate,
  onComplete,
}: {
  sectionRef: React.RefObject<HTMLDivElement | null>
  isLocked: boolean
  isCompleted: boolean
  data: PlanData
  onUpdate: (u: Partial<PlanData>) => void
  onComplete: () => void
}) {
  const [answer, setAnswer] = useState(data.giftSpend)
  const childName = data.childName || 'your child'

  const selected = GIFT_OPTIONS.find((o) => o.value === answer)
  const midpoint = selected?.midpoint ?? 350
  const giftFV = fv(midpoint / 2 / 12, monthsTo21(data.childAgeMonths))

  const handleContinue = () => {
    onUpdate({ giftSpend: answer })
    onComplete()
  }

  return (
    <QuestionWrapper sectionRef={sectionRef} isLocked={isLocked} label="Gifts & occasions">
      <p className="text-midnight font-semibold text-base mb-4">
        Roughly how much do family and friends spend in total on birthday and Christmas gifts for{' '}
        {childName} each year — including grandparents, aunts, uncles and friends?
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {GIFT_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={isCompleted}
            onClick={() => setAnswer(o.value)}
            className={`px-4 py-3.5 rounded-xl border text-sm font-medium transition-all min-h-[44px] text-left ${
              answer === o.value
                ? 'bg-azure/10 border-azure text-midnight'
                : 'bg-white border-slate-200 text-slate-700 hover:border-azure/50 hover:bg-azure/5'
            } disabled:cursor-default`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {!isCompleted && (
        <ContinueButton disabled={answer === ''} onClick={handleContinue} />
      )}

      {isCompleted && (
        <InsightCard>
          <InvestorQuote
            quote="Someone is sitting in the shade today because someone planted a tree a long time ago."
            attribution="Warren Buffett"
          />
          <p>
            Based on your answer, your family spends approximately{' '}
            <strong>{formatGBP(midpoint)}</strong> on gifts for {childName} each year. If just half
            of that was invested instead, it would add{' '}
            <strong>{formatGBP(giftFV)}</strong> to {childName}'s future over 18 years.
          </p>
        </InsightCard>
      )}
    </QuestionWrapper>
  )
}

// ─── Q5: Cashback ─────────────────────────────────────────────────────────────

const CASHBACK_OPTIONS = [
  { value: 'yes', label: "Yes — I'm pretty good at capturing cashback" },
  { value: 'sometimes', label: "Sometimes — I use a few but don't think about it much" },
  { value: 'no', label: "Not really — I don't do much with cashback" },
]

function Q5({
  sectionRef,
  isLocked,
  isCompleted,
  data,
  onUpdate,
  onComplete,
}: {
  sectionRef: React.RefObject<HTMLDivElement | null>
  isLocked: boolean
  isCompleted: boolean
  data: PlanData
  onUpdate: (u: Partial<PlanData>) => void
  onComplete: () => void
}) {
  const [answer, setAnswer] = useState(data.cashback)
  const childName = data.childName || 'your child'

  const n = monthsTo21(data.childAgeMonths)
  const cashbackFV = fv(350 / 12, n)

  // Stacked bar layers
  const parentLayer = fv(data.monthly, n)
  const gpLayer =
    data.familyContrib === 'grandparents-likely' || data.familyContrib === 'maybe'
      ? fv(50, n)
      : 0
  const benefitLayer = data.childBenefit === 'yes' ? fv(56, n) : 0
  const giftLayer = fv(GIFT_MONTHLY[data.giftSpend] ?? 0, n)
  const cashbackLayer = cashbackFV
  const totalBar = parentLayer + gpLayer + benefitLayer + giftLayer + cashbackLayer

  // CSS stacked bar (top-to-bottom order: cashback at top, parent at bottom)
  const chartLayers = [
    { label: 'Cashback', value: cashbackLayer, color: '#A8E4F4' },
    { label: 'Gift investment', value: giftLayer, color: '#59C9E9' },
    ...(benefitLayer > 0 ? [{ label: 'Child Benefit', value: benefitLayer, color: '#6DA5D4' }] : []),
    ...(gpLayer > 0 ? [{ label: 'Grandparents', value: gpLayer, color: '#407BBF' }] : []),
    { label: 'Your monthly', value: parentLayer, color: '#101628' },
  ]

  const handleContinue = () => {
    onUpdate({ cashback: answer })
    onComplete()
  }

  return (
    <QuestionWrapper sectionRef={sectionRef} isLocked={isLocked} label="Cashback">
      <p className="text-midnight font-semibold text-base mb-4">
        Do you actively use cashback apps or cards?
      </p>
      <div className="space-y-2.5">
        {CASHBACK_OPTIONS.map((o) => (
          <OptionButton
            key={o.value}
            selected={answer === o.value}
            onClick={() => !isCompleted && setAnswer(o.value)}
          >
            {o.label}
          </OptionButton>
        ))}
      </div>

      {!isCompleted && (
        <ContinueButton disabled={answer === ''} onClick={handleContinue} />
      )}

      {isCompleted && (
        <InsightCard>
          <InvestorQuote
            quote="Time in the market beats timing the market."
            attribution="Kenneth Fisher"
          />
          <p className="mb-5">
            The average UK household generates between £250 and £450 in available cashback each
            year. If £350/year was automatically invested into {childName}'s account, it would add
            approximately <strong>{formatGBP(cashbackFV)}</strong> to their future. At launch,
            Amplifi will make this automatic. Founding members get first access.
          </p>

          {/* Stacked bar chart — all layers */}
          <p className="text-xs font-bold text-midnight/50 uppercase tracking-widest mb-3">
            {childName}'s full picture by age 21
          </p>
          <div className="flex items-stretch gap-4">
            {/* Bar */}
            <div className="flex flex-col rounded-lg overflow-hidden flex-shrink-0" style={{ width: 56, height: 180 }}>
              {totalBar > 0 &&
                chartLayers.map((layer) => (
                  <div
                    key={layer.label}
                    style={{
                      backgroundColor: layer.color,
                      height: `${(layer.value / totalBar) * 100}%`,
                      minHeight: layer.value > 0 ? '2px' : '0px',
                    }}
                  />
                ))}
            </div>
            {/* Legend + total */}
            <div className="flex flex-col justify-between flex-1" style={{ height: 180 }}>
              <div>
                <p className="text-midnight font-bold text-xl leading-tight">{formatGBP(totalBar)}</p>
                <p className="text-slate-400 text-xs mt-0.5">total by age 21</p>
              </div>
              <div className="space-y-1.5">
                {[...chartLayers].reverse().map((layer) => (
                  <div key={layer.label} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: layer.color }}
                    />
                    <p className="text-xs text-slate-600">{layer.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </InsightCard>
      )}
    </QuestionWrapper>
  )
}

// ─── Phase 2 container ────────────────────────────────────────────────────────

export default function Phase2({ data, completedQuestions, onUpdate, onComplete }: Phase2Props) {
  const refs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ]

  // ── Thermometer animation ──
  const [displayValue, setDisplayValue] = useState(0)
  const displayValueRef = useRef(0)
  const thermometerTarget = calcThermometerTotal(data, completedQuestions)

  useEffect(() => {
    const start = displayValueRef.current
    const end = thermometerTarget
    if (Math.abs(start - end) < 1) return

    let rafId: number
    const startTime = performance.now()
    const duration = 800
    const startVal = displayValueRef.current

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = startVal + (end - startVal) * eased
      setDisplayValue(current)
      displayValueRef.current = current
      if (progress < 1) rafId = requestAnimationFrame(animate)
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [thermometerTarget])

  const isThermometerBlurred = completedQuestions >= 5
  const fillPct = Math.min((thermometerTarget / 100_000) * 100, 100)

  const handleComplete = useCallback(
    (idx: number) => {
      onComplete(idx)
      // 2500ms delay so insight animates in before scrolling to next question
      setTimeout(() => {
        refs[idx + 1]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 2500)
    },
    [onComplete],
  )

  return (
    <section id="plan-questions" className="bg-offwhite">
      {/* ── Sticky progress + thermometer header ── */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3">
          {/* Progress bar */}
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-midnight/60 uppercase tracking-wider">
              Question {Math.min(completedQuestions + 1, 5)} of 5
            </p>
            <p className="text-xs text-midnight/40">
              {completedQuestions >= 5 ? 'Complete ✓' : `${completedQuestions}/5`}
            </p>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full mb-3">
            <div
              className="h-full bg-sky rounded-full transition-all duration-700"
              style={{ width: `${(completedQuestions / 5) * 100}%` }}
            />
          </div>

          {/* Thermometer */}
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-midnight/50 font-medium">
              {data.childName || 'Your child'}'s potential by age 21
            </p>
            {isThermometerBlurred && (
              <p className="text-[10px] text-sky font-semibold">
                Save to reveal
              </p>
            )}
          </div>
          <div
            className={`text-xl font-bold text-midnight mb-1.5 transition-all duration-300 ${
              isThermometerBlurred ? 'blur-sm select-none' : ''
            }`}
          >
            {formatGBP(displayValue)}
          </div>
          {/* Fill bar */}
          <div className="relative h-1.5 bg-slate-200 rounded-full mb-1">
            <div
              className="h-full bg-sky rounded-full transition-all duration-700"
              style={{ width: `${fillPct}%` }}
            />
            {[10000, 25000, 50000, 75000, 100000].map((milestone) => (
              <div
                key={milestone}
                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                style={{
                  left: `${(milestone / 100000) * 100}%`,
                  backgroundColor: thermometerTarget >= milestone ? '#59C9E9' : '#cbd5e1',
                }}
              />
            ))}
          </div>
          {/* Milestone labels */}
          <div className="flex justify-between text-[9px] text-midnight/30">
            <span>£10k</span>
            <span>£25k</span>
            <span>£50k</span>
            <span>£75k</span>
            <span>£100k</span>
          </div>
        </div>
      </div>

      {/* ── Question cards ── */}
      <div className="py-8 sm:py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-5">
          <Q1
            sectionRef={refs[0]}
            isLocked={false}
            isCompleted={completedQuestions > 0}
            data={data}
            onUpdate={onUpdate}
            onComplete={() => handleComplete(0)}
          />
          <Q2
            sectionRef={refs[1]}
            isLocked={completedQuestions < 1}
            isCompleted={completedQuestions > 1}
            data={data}
            onUpdate={onUpdate}
            onComplete={() => handleComplete(1)}
          />
          <Q3
            sectionRef={refs[2]}
            isLocked={completedQuestions < 2}
            isCompleted={completedQuestions > 2}
            data={data}
            onUpdate={onUpdate}
            onComplete={() => handleComplete(2)}
          />
          <Q4
            sectionRef={refs[3]}
            isLocked={completedQuestions < 3}
            isCompleted={completedQuestions > 3}
            data={data}
            onUpdate={onUpdate}
            onComplete={() => handleComplete(3)}
          />
          <Q5
            sectionRef={refs[4]}
            isLocked={completedQuestions < 4}
            isCompleted={completedQuestions > 4}
            data={data}
            onUpdate={onUpdate}
            onComplete={() => handleComplete(4)}
          />
        </div>
      </div>
    </section>
  )
}
