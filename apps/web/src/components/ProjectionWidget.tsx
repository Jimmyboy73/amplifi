import { useState } from 'react'
import { fv } from '../lib/projections'
import { formatCompact, describeError } from '../lib/format'
import { supabase } from '../lib/supabase'
import { Button } from './ui'
import { DobInput, childDobError, dobComplete, dobToIso, type Dob } from './DobInput'

/**
 * Supporting visual (not a competing hero number): an illustrative growth estimate.
 * Parent drags a monthly amount; chips show projected value at three ages.
 *
 * The calculator is NEVER empty. Until the child's date of birth is known it shows a
 * GENERIC "from birth" (age 0) illustration, clearly labelled as an example and NOT as
 * this child's actual figures — with an inline "add date of birth" editor so a parent
 * who reached the pot page without capturing it (e.g. tapped "I'll do this later" on the
 * provider signpost) can add it here, without going back through the confirm screen. Once
 * the DOB is saved the widget flips to a personalised projection.
 *
 * (Compliance note: §5 of the redesign spec says no figure should show pre-DOB; this
 * generic-example behaviour is an explicit product decision by James that overrides that —
 * kept honest by labelling it as an example, illustrative, 7%, capital at risk. The example
 * wording is James-approved.)
 */
export function ProjectionWidget({
  childName,
  ageMonths,
  childId,
  onDobSaved,
}: {
  childName: string
  ageMonths: number | null
  childId: string
  /** Called after a DOB is saved from here, so the parent screen can refetch the child. */
  onDobSaved: () => void
}) {
  const [monthly, setMonthly] = useState(50)
  const [editing, setEditing] = useState(false)
  const [dob, setDob] = useState<Dob>({ day: '', month: '', year: '' })
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')

  const known = ageMonths != null
  // DOB unknown → project from birth (age 0) as a generic example.
  const effectiveAge = known ? ageMonths : 0

  const points = [
    { label: 'Age 18', sub: 'ISA matures', months: Math.max(0, 18 * 12 - effectiveAge) },
    { label: 'Age 25', sub: 'First home?', months: Math.max(0, 25 * 12 - effectiveAge) },
    { label: 'Age 65', sub: 'Retirement', months: Math.max(0, 65 * 12 - effectiveAge) },
  ]

  const dobErr = childDobError(dob)
  const canSave = dobComplete(dob) && !dobErr

  const saveDob = async () => {
    if (!canSave || saving) return
    setSaving(true)
    setSaveErr('')
    const { error } = await supabase
      .from('children')
      .update({ date_of_birth: dobToIso(dob) })
      .eq('id', childId)
    setSaving(false)
    if (error) {
      setSaveErr(describeError(error))
      return
    }
    setEditing(false)
    onDobSaved()
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <p className="text-base font-bold text-midnight">
        {known ? `What ${childName} could have` : 'What regular saving could build'}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        Drag to see the impact of a regular contribution.
      </p>

      {/* Example-state callout with an inline DOB editor, shown only when the DOB is unknown. */}
      {!known && (
        <div className="mt-3 rounded-xl bg-sky/5 p-3 ring-1 ring-sky/15">
          <p className="text-xs leading-relaxed text-slate-600">
            <span className="font-semibold text-midnight">An example</span> — what regular saving
            from birth could build. Add {childName}'s date of birth to see {childName}'s actual
            projection.
          </p>

          {editing ? (
            <div className="mt-3">
              <DobInput value={dob} onChange={setDob} />
              {dobErr && <span className="mt-1.5 block text-xs text-red-500">{dobErr}</span>}
              {saveErr && <span className="mt-1.5 block text-xs text-red-500">{saveErr}</span>}
              <div className="mt-2.5">
                <Button loading={saving} disabled={!canSave} onClick={() => void saveDob()}>
                  Save date of birth
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    setSaveErr('')
                  }}
                  className="mt-2 block w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-2 text-xs font-semibold text-azure hover:brightness-110"
            >
              Add {childName}'s date of birth →
            </button>
          )}
        </div>
      )}

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
        Illustrative projection at 7% p.a. — not a guarantee. Capital at risk.
      </p>
    </div>
  )
}
