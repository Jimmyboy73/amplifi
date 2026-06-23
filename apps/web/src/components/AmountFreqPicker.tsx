import { Pill } from './ui'
import { FREQ_LABELS, type Frequency } from '../lib/types'

const AMOUNTS = [10, 25, 50, 100] as const
const FREQS: Frequency[] = ['weekly', 'monthly', 'one_off']

export function AmountFreqPicker({
  amount,
  freq,
  onAmount,
  onFreq,
}: {
  amount: number | null
  freq: Frequency | null
  onAmount: (n: number) => void
  onFreq: (f: Frequency) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {AMOUNTS.map((a) => (
          <Pill key={a} active={amount === a} onClick={() => onAmount(a)}>
            £{a}
          </Pill>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {FREQS.map((f) => (
          <Pill key={f} active={freq === f} onClick={() => onFreq(f)}>
            {FREQ_LABELS[f]}
          </Pill>
        ))}
      </div>
    </div>
  )
}
