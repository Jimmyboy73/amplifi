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

// ─── Shared UI pieces ────────────────────────────────────────────────────────

function InsightCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-slide-up mt-6 bg-azure/10 border border-azure/20 rounded-2xl p-5 sm:p-6">
      <div className="flex gap-3">
        <span className="text-xl flex-shrink-0">💡</span>
        <p className="text-midnight text-sm sm:text-base leading-relaxed">{children}</p>
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
      className={`transition-all duration-500 ${
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
          {insightName} has{' '}
          <strong>{formatCompoundingTime(n)}</strong> of compounding time ahead of them. That is one
          of the most powerful financial assets any person can have — and it belongs entirely to{' '}
          {insightName === 'Your child' ? 'them' : insightName} right now.
        </InsightCard>
      )}
    </QuestionWrapper>
  )
}

// ─── Q2: Family & housing ─────────────────────────────────────────────────────

const FAMILY_OPTIONS = [
  { value: 'grandparents-likely', label: 'Grandparents and other family members would likely contribute' },
  { value: 'maybe', label: "Maybe — I'm not sure yet" },
  { value: 'just-me', label: 'Probably just me for now' },
]

const HOUSING_OPTIONS = [
  { value: 'renting-buying', label: 'Renting — and thinking about buying one day' },
  { value: 'renting-not-buying', label: 'Renting — not planning to buy' },
  { value: 'own-mortgage', label: 'Own with a mortgage' },
  { value: 'own-outright', label: 'Own outright' },
  { value: 'living-family', label: 'Living with family' },
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
  const [partA, setPartA] = useState(data.familyContrib)
  const [partB, setPartB] = useState(data.housingStatus)

  const isValid = partA !== '' && partB !== ''
  const childName = data.childName || 'your child'
  const totalMonthly = data.monthly + 50
  const withFamily = fv(totalMonthly, monthsTo21(data.childAgeMonths))

  const handleContinue = () => {
    onUpdate({ familyContrib: partA, housingStatus: partB })
    onComplete()
  }

  return (
    <QuestionWrapper sectionRef={sectionRef} isLocked={isLocked} label="Family & home">
      {/* Part A */}
      <p className="text-midnight font-semibold text-base mb-4">
        Who else in the family might contribute to {childName}'s future?
      </p>
      <div className="space-y-2.5 mb-6">
        {FAMILY_OPTIONS.map((o) => (
          <OptionButton
            key={o.value}
            selected={partA === o.value}
            onClick={() => !isCompleted && setPartA(o.value)}
          >
            {o.label}
          </OptionButton>
        ))}
      </div>

      {/* Part B — appears once Part A selected */}
      {partA && (
        <div className="animate-fade-slide-up">
          <p className="text-midnight font-semibold text-base mb-4">
            Where are you currently living?
          </p>
          <div className="space-y-2.5">
            {HOUSING_OPTIONS.map((o) => (
              <OptionButton
                key={o.value}
                selected={partB === o.value}
                onClick={() => !isCompleted && setPartB(o.value)}
              >
                {o.label}
              </OptionButton>
            ))}
          </div>
        </div>
      )}

      {!isCompleted && (
        <ContinueButton disabled={!isValid} onClick={handleContinue} />
      )}

      {isCompleted && (
        <InsightCard>
          Families who invest together reach £10,000 for their child an average of 4 years faster
          than families investing alone. If two grandparents each contributed £25/month alongside
          your {formatGBP(data.monthly)}/month, {childName} would have{' '}
          <strong>{formatGBP(withFamily)}</strong> by age 21.
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
  const extraFV = fv(56, monthsTo21(data.childAgeMonths))

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
          Child Benefit pays £26.05/week for your first child. If you invested just half of it —
          around £56/month — from today, {childName} would have an extra{' '}
          <strong>{formatGBP(extraFV)}</strong> by age 21 on top of your regular contributions.
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
  { value: 'over-1000', label: 'Over £1,000', midpoint: 1500 },
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
        How much does your family spend on gifts for {childName} each year (birthdays, Christmas,
        etc.)?
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
          Based on your answer, your family spends approximately{' '}
          <strong>{formatGBP(midpoint)}</strong> on gifts for {childName} each year. If just half
          of that was invested instead, it would add{' '}
          <strong>{formatGBP(giftFV)}</strong> to {childName}'s future over 18 years.
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
  const cashbackFV = fv(350 / 12, monthsTo21(data.childAgeMonths))

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
          The average UK household generates between £250 and £450 in available cashback each year.
          If £350/year was automatically invested into {childName}'s account, it would add
          approximately <strong>{formatGBP(cashbackFV)}</strong> to their future. At launch,
          Amplifi will make this automatic. Founding members get first access.
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

  const handleComplete = useCallback(
    (idx: number) => {
      onComplete(idx)
      setTimeout(() => {
        refs[idx + 1]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 700)
    },
    [onComplete],
  )

  // Scroll to Q1 when Phase 2 first mounts (user arrived from scroll prompt)
  useEffect(() => {
    // intentionally no auto-scroll — user scrolled here manually
  }, [])

  return (
    <section className="bg-offwhite py-8 sm:py-12">
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
    </section>
  )
}
