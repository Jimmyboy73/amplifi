import { useState } from 'react'
import { describeError } from '../lib/format'
import { supabase } from '../lib/supabase'
import { Button } from './ui'
import { DobInput, childDobError, dobComplete, dobToIso, type Dob } from './DobInput'

/**
 * Date-of-birth capture card, shown on the home screen ONLY when the child's DOB is unknown
 * (e.g. a parent tapped "I'll do this later" on the provider signpost). Adding the DOB flips
 * the ring's centre to a personalised projection toward the £100k mission. The old "what you
 * could have" calculator was removed — projection now lives in the ring + Adjust targets.
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
  const [dob, setDob] = useState<Dob>({ day: '', month: '', year: '' })
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')

  // Projection now shows in the ring centre once a DOB exists — nothing to render here then.
  if (ageMonths != null) return null

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
    onDobSaved()
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <p className="text-base font-bold text-midnight">Add {childName}&apos;s date of birth</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        It sets {childName}&apos;s age, so we can show their personal projection toward the £100k
        mission. Amplifi never holds or moves money.
      </p>

      <div className="mt-4">
        <DobInput value={dob} onChange={setDob} />
        {dobErr && <span className="mt-1.5 block text-xs text-red-500">{dobErr}</span>}
        {saveErr && <span className="mt-1.5 block text-xs text-red-500">{saveErr}</span>}
        <div className="mt-3">
          <Button loading={saving} disabled={!canSave} onClick={() => void saveDob()}>
            Save date of birth
          </Button>
        </div>
      </div>

      <p className="mt-3 text-center text-[11px] italic text-slate-400">
        Illustrative projections assume 7% p.a. — not a guarantee. Capital at risk.
      </p>
    </div>
  )
}
