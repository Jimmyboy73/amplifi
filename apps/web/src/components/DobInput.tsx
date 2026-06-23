import { useRef } from 'react'

export type Dob = { day: string; month: string; year: string }

/** Three-field DD / MM / YYYY input with auto-advance. */
export function DobInput({ value, onChange }: { value: Dob; onChange: (d: Dob) => void }) {
  const monthRef = useRef<HTMLInputElement>(null)
  const yearRef = useRef<HTMLInputElement>(null)
  // min-w-0 lets the inputs shrink inside the flex row (defeats the default input size);
  // widths come from flex-grow only so all three fit the mobile viewport with no overflow.
  const inputCls =
    'min-w-0 rounded-xl border border-slate-200 bg-white px-2 py-3 text-center text-base text-midnight outline-none transition focus:border-sky focus:ring-2 focus:ring-sky/30'

  return (
    <div className="flex gap-2.5">
      <input
        className={`${inputCls} flex-1`}
        inputMode="numeric"
        placeholder="DD"
        maxLength={2}
        value={value.day}
        onChange={(e) => {
          const day = e.target.value.replace(/\D/g, '').slice(0, 2)
          onChange({ ...value, day })
          if (day.length === 2) monthRef.current?.focus()
        }}
      />
      <input
        ref={monthRef}
        className={`${inputCls} flex-1`}
        inputMode="numeric"
        placeholder="MM"
        maxLength={2}
        value={value.month}
        onChange={(e) => {
          const month = e.target.value.replace(/\D/g, '').slice(0, 2)
          onChange({ ...value, month })
          if (month.length === 2) yearRef.current?.focus()
        }}
      />
      <input
        ref={yearRef}
        className={`${inputCls} flex-[1.6]`}
        inputMode="numeric"
        placeholder="YYYY"
        maxLength={4}
        value={value.year}
        onChange={(e) => onChange({ ...value, year: e.target.value.replace(/\D/g, '').slice(0, 4) })}
      />
    </div>
  )
}

/** Validate a child's DOB: real date, not >9 months future, not >18 years past. */
export function childDobError(d: Dob): string {
  if (d.day.length === 0 || d.month.length === 0 || d.year.length !== 4) return ''
  const day = parseInt(d.day, 10)
  const month = parseInt(d.month, 10)
  const year = parseInt(d.year, 10)
  if (isNaN(day) || isNaN(month) || isNaN(year) || day < 1 || day > 31 || month < 1 || month > 12) {
    return 'Please enter a valid date'
  }
  const dob = new Date(year, month - 1, day)
  if (dob.getMonth() !== month - 1) return 'Please enter a valid date'
  const today = new Date()
  const maxDate = new Date(today.getFullYear(), today.getMonth() + 9, today.getDate())
  const minDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
  if (dob > maxDate) return 'Date of birth cannot be more than 9 months in the future'
  if (dob < minDate) return 'A Junior ISA is only available for children under 18'
  return ''
}

export function dobToIso(d: Dob): string {
  return `${d.year}-${d.month.padStart(2, '0')}-${d.day.padStart(2, '0')}`
}

export function dobComplete(d: Dob): boolean {
  return d.day.length > 0 && d.month.length > 0 && d.year.length === 4
}
