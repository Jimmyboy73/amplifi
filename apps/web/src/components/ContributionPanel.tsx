import { useState } from 'react'
import { Button, Spinner } from './ui'
import { AmountFreqPicker } from './AmountFreqPicker'
import { useContribution } from '../lib/useContribution'
import { describeError } from '../lib/format'
import { FREQ_LABELS, type Frequency } from '../lib/types'

/**
 * Self-reported contribution control: shows the user's active standing order with
 * Edit / Stop, or a picker to set one up. Writes to family_contributions and calls
 * onChanged so the pot can refresh. Used by the parent's own card and the contributor
 * Contribute screen.
 */
export function ContributionPanel({
  connectionId,
  connectionError,
  childId,
  userId,
  childName,
  ctaLabel = 'Set up your contribution',
  onChanged,
}: {
  connectionId: string | null
  /** Error from resolving the connection (e.g. the parent's self-connection), surfaced to the user. */
  connectionError?: string | null
  childId: string
  userId: string | null
  childName: string
  ctaLabel?: string
  onChanged?: () => void
}) {
  const { contribution, loading, log, update, stop } = useContribution(connectionId, userId)
  const [editing, setEditing] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [amount, setAmount] = useState<number | null>(null)
  const [freq, setFreq] = useState<Frequency | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setAmount(null)
    setFreq(null)
    setEditing(false)
    setShowSetup(false)
    setError('')
  }

  const submitNew = async () => {
    if (!amount || !freq || busy) return
    if (!connectionId) {
      setError(connectionError || "Couldn't set up your contribution link. Please try again.")
      return
    }
    setBusy(true)
    setError('')
    const { error } = await log(childId, amount, freq)
    setBusy(false)
    if (error) {
      setError(describeError(error))
      return
    }
    reset()
    onChanged?.()
  }

  const submitEdit = async () => {
    if (!contribution || !amount || !freq || busy) return
    setBusy(true)
    setError('')
    const { error } = await update(contribution.id, amount, freq)
    setBusy(false)
    if (error) {
      setError(describeError(error))
      return
    }
    reset()
    onChanged?.()
  }

  const doStop = async () => {
    if (!contribution || busy) return
    if (!window.confirm(`Stop your contribution to ${childName}?`)) return
    setBusy(true)
    const { error } = await stop(contribution.id)
    setBusy(false)
    if (error) {
      setError(describeError(error))
      return
    }
    onChanged?.()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner className="h-5 w-5 text-sky" />
      </div>
    )
  }

  // Editing an existing contribution
  if (editing && contribution) {
    return (
      <div className="space-y-4">
        <p className="text-sm font-bold text-midnight">Update your contribution</p>
        <AmountFreqPicker amount={amount} freq={freq} onAmount={setAmount} onFreq={setFreq} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2.5">
          <Button loading={busy} disabled={!amount || !freq} onClick={() => void submitEdit()}>
            Save
          </Button>
          <Button variant="ghost" onClick={reset}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  // Existing active contribution summary
  if (contribution) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-bold text-midnight">Your contribution</p>
        <div className="flex items-baseline gap-2 rounded-xl bg-sky/10 px-4 py-3">
          <span className="text-2xl font-extrabold text-midnight">£{contribution.amount_gbp}</span>
          <span className="text-sm font-semibold text-slate-500">{FREQ_LABELS[contribution.frequency]}</span>
        </div>
        <div className="flex gap-2.5">
          <Button
            variant="secondary"
            onClick={() => {
              setAmount(contribution.amount_gbp)
              setFreq(contribution.frequency)
              setEditing(true)
            }}
          >
            Edit
          </Button>
          <button
            className="min-h-[52px] flex-1 rounded-2xl border border-red-300 bg-red-50 px-5 font-bold text-red-600 transition active:scale-[0.99]"
            onClick={() => void doStop()}
          >
            Stop
          </button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    )
  }

  // Setup picker
  if (showSetup) {
    return (
      <div className="space-y-4">
        <p className="text-sm font-bold text-midnight">How much would you like to contribute?</p>
        <AmountFreqPicker amount={amount} freq={freq} onAmount={setAmount} onFreq={setFreq} />
        {(error || connectionError) && <p className="text-sm text-red-500">{error || connectionError}</p>}
        <Button loading={busy} disabled={!amount || !freq} onClick={() => void submitNew()}>
          I've set it up ✓
        </Button>
        <button type="button" className="w-full text-sm font-semibold text-azure" onClick={reset}>
          Cancel
        </button>
      </div>
    )
  }

  // Collapsed CTA
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between gap-2 rounded-2xl border-2 border-midnight px-4 py-3.5 text-left text-sm font-semibold text-midnight transition active:scale-[0.99]"
      onClick={() => setShowSetup(true)}
    >
      <span>+ {ctaLabel}</span>
      <span className="text-slate-400">›</span>
    </button>
  )
}
