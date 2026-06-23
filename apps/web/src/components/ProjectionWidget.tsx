import { useState } from 'react'
import { fv } from '../lib/projections'
import { formatCompact } from '../lib/format'

/**
 * Supporting visual (not a competing hero number): an illustrative growth estimate.
 * Parent drags a monthly amount; chips show projected value at three ages.
 */
export function ProjectionWidget({ childName, ageMonths }: { childName: string; ageMonths: number }) {
  const [monthly, setMonthly] = useState(50)

  const points = [
    { label: 'Age 18', sub: 'ISA matures', months: Math.max(0, 18 * 12 - ageMonths) },
    { label: 'Age 25', sub: 'First home?', months: Math.max(0, 25 * 12 - ageMonths) },
    { label: 'Age 65', sub: 'Retirement', months: Math.max(0, 65 * 12 - ageMonths) },
  ]

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <p className="text-base font-bold text-midnight">What {childName} could have</p>
      <p className="mt-1 text-sm text-slate-500">Drag to see the impact of a regular contribution.</p>

      <p className="mt-4 text-sm text-slate-600">
        Monthly contribution: <span className="font-bold text-midnight">£{monthly}</span>
      </p>
      <input
        type="range"
        min={10}
        max={200}
        step={5}
        value={monthly}
        onChange={(e) => setMonthly(Number(e.target.value))}
        className="mt-2 w-full accent-sky"
      />

      <div className="mt-4 grid grid-cols-3 gap-2">
        {points.map((p) => (
          <div key={p.label} className="rounded-xl bg-offwhite p-3 text-center">
            <p className="text-[11px] text-slate-500">{p.label}</p>
            <p className="mt-1 text-lg font-extrabold tracking-tight text-azure">
              {formatCompact(fv(monthly, p.months))}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">{p.sub}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-center text-[11px] italic text-slate-400">
        Illustrative projection at 8% p.a. — not a guarantee.
      </p>
    </div>
  )
}
