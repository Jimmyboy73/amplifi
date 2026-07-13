// Adjust-your-targets modal — the parent re-weights the four buckets and watches the
// projection move toward the £100k mission, live. Saves to the children row (see the
// 20260709130000_child_targets migration). All figures illustrative, not promises.
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { projectedFuture, scaledTargets, type Targets } from '../lib/mission'
import { formatGBP } from '../lib/projections'

const CORE = '#2F6FC4'

function Slider({
  label,
  suffix,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  suffix: string
  value: number
  min: number
  max: number
  step: number
  onChange: (n: number) => void
}) {
  return (
    <div className="mb-3.5">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-midnight">{label}</span>
        <span className="shrink-0 text-sm font-bold text-midnight">
          £{value}
          <span className="text-[11px] font-medium text-slate-400"> {suffix}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-azure"
      />
    </div>
  )
}

export function AdjustTargetsModal({
  childId,
  ageMonths,
  initial,
  onClose,
  onSaved,
}: {
  childId: string
  ageMonths: number | null
  initial: Targets
  onClose: () => void
  onSaved: () => void
}) {
  const [core, setCore] = useState(initial.coreMonthly)
  const [family, setFamily] = useState(initial.familyMonthly)
  const [occasions, setOccasions] = useState(initial.occasionsYearly)
  const [boosters, setBoosters] = useState(initial.boostersYearly)
  const [saving, setSaving] = useState(false)
  const [projAge, setProjAge] = useState(25) // the milestone age the headline figure projects to

  const goal = initial.householdGoal
  const monthlyTotal = core + family
  // Headline figure at the chosen milestone age; the mission bar always tracks the £100k-by-25 goal.
  const projectedAtAge = projectedFuture({
    monthlyTotal,
    occasionsYear: occasions,
    boostersYear: boosters,
    ageMonths,
    ageYears: projAge,
  })
  const projected25 = projectedFuture({
    monthlyTotal,
    occasionsYear: occasions,
    boostersYear: boosters,
    ageMonths,
    ageYears: 25,
  })
  const onTrack = projected25 != null && projected25 >= goal
  const pct = projected25 != null ? Math.min(100, Math.round((projected25 / goal) * 100)) : 0

  const reset = () => {
    const d = scaledTargets(ageMonths)
    setCore(d.coreMonthly)
    setFamily(d.familyMonthly)
    setOccasions(d.occasionsYearly)
    setBoosters(d.boostersYearly)
  }

  const save = async () => {
    setSaving(true)
    await supabase
      .from('children')
      .update({
        core_target_gbp: core,
        family_target_gbp: family,
        occasions_target_gbp: occasions,
        boosters_target_gbp: boosters,
      })
      .eq('id', childId)
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-offwhite p-5 shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <p className="text-lg font-extrabold text-midnight">Adjust your targets</p>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 transition hover:text-midnight">
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Set what feels realistic for your family. The mission stays {formatGBP(goal)} by 25 — these
          are the amounts you&apos;re aiming for.
        </p>

        {/* Live projection — headline figure at a chosen milestone age; bar tracks the mission */}
        <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-midnight">Projected at {projAge}</span>
            <span className="text-xl font-extrabold text-midnight">
              {projectedAtAge != null ? formatGBP(projectedAtAge) : '—'}
            </span>
          </div>

          {/* Milestone age selector — see how it keeps growing if contributions continue */}
          <div className="mt-2.5 flex gap-1.5">
            {[18, 25, 45, 65].map((a) => (
              <button
                key={a}
                onClick={() => setProjAge(a)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                  projAge === a ? 'text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
                style={projAge === a ? { background: CORE } : undefined}
              >
                Age {a}
              </button>
            ))}
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${pct}%`, background: onTrack ? '#1D9E75' : CORE }}
            />
          </div>
          <p className="mt-1.5 text-xs font-semibold" style={{ color: onTrack ? '#0F6E56' : '#64748b' }}>
            {onTrack
              ? `On track for the ${formatGBP(goal)} mission by 25 ✓`
              : `${formatGBP(projected25 ?? 0)} of ${formatGBP(goal)} by 25 — keep nudging up`}
          </p>
          <p className="mt-2 text-[11px] leading-snug text-slate-400">
            Illustrative — not a guarantee. Assumes 7% p.a.; capital at risk.
          </p>
        </div>

        <Slider label="Core — you + Child Benefit" suffix="a month" value={core} min={0} max={200} step={5} onChange={setCore} />
        <Slider label="Family — the wider circle" suffix="a month" value={family} min={0} max={200} step={5} onChange={setFamily} />
        <Slider label="Occasions — birthdays, Christmas & milestones" suffix="a year" value={occasions} min={0} max={1500} step={25} onChange={setOccasions} />
        <Slider label="Boosters — cashback & more (coming soon)" suffix="a year" value={boosters} min={0} max={1000} step={25} onChange={setBoosters} />

        <div className="mt-5 flex gap-2">
          <button
            onClick={reset}
            className="rounded-xl border-2 border-slate-200 px-4 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
          >
            Reset
          </button>
          <button
            onClick={() => void save()}
            disabled={saving}
            className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition hover:brightness-105 disabled:opacity-50"
            style={{ background: CORE }}
          >
            {saving ? 'Saving…' : 'Save targets'}
          </button>
        </div>
      </div>
    </div>
  )
}
