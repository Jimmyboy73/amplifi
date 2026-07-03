import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { describeError } from '../lib/format'
import { Card, Button } from './ui'

/**
 * Always-available feedback form (opened from the Home top bar).
 *
 * On submit:
 *  1. Insert a row into `feedback` (the guaranteed part — RLS lets a logged-in
 *     user insert only their own row).
 *  2. Best-effort: invoke the `send-feedback-email` Edge Function to notify
 *     james@letsamplifi.com via Resend. Any failure here is swallowed — the row
 *     is already saved, so we never block the user.
 *  3. Show a thank-you confirmation.
 */
export function FeedbackModal({
  userId,
  email,
  onClose,
}: {
  userId: string
  email: string | null
  onClose: () => void
}) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const submit = async () => {
    const trimmed = message.trim()
    if (trimmed.length === 0 || busy) return
    setBusy(true)
    setError('')

    // 1. Persist the row — this is the source of truth.
    const { error: insertError } = await supabase.from('feedback').insert({
      user_id: userId,
      email,
      message: trimmed,
    })
    if (insertError) {
      setBusy(false)
      setError(describeError(insertError))
      return
    }

    // 2. Best-effort email notification — never blocks or fails the submit.
    try {
      await supabase.functions.invoke('send-feedback-email', {
        body: { email, message: trimmed },
      })
    } catch {
      // Swallowed on purpose: the row is saved; email is a bonus.
    }

    setBusy(false)
    setSent(true)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-midnight/40 px-4 pb-6 pt-16 sm:items-center sm:pb-16"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <Card>
          {sent ? (
            <div className="text-center">
              <p className="text-4xl">💙</p>
              <h2 className="mb-2 mt-3 text-xl font-extrabold tracking-tight text-midnight">
                Thanks — we read every one
              </h2>
              <p className="mb-6 text-sm leading-relaxed text-slate-500">
                Your feedback helps shape what we build next.
              </p>
              <Button type="button" onClick={onClose}>
                Done
              </Button>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                void submit()
              }}
            >
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-extrabold tracking-tight text-midnight">
                  What would make Amplifi better?
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="-mr-1 -mt-1 p-1 text-2xl leading-none text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              </div>
              <label className="block">
                <span className="sr-only">Your feedback</span>
                <textarea
                  className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-midnight outline-none transition focus:border-sky focus:ring-2 focus:ring-sky/30"
                  placeholder="Tell us what's working, what's not, or what you'd love to see…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  autoFocus
                />
              </label>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" loading={busy} disabled={message.trim().length === 0}>
                Send
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
