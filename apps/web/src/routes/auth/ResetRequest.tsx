import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Screen, Logo, Card, Button, Field } from '../../components/ui'

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

export default function ResetRequest() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!isValidEmail(email) || busy) return
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-confirm`,
    })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    setSent(true)
  }

  return (
    <Screen className="pt-8">
      <div className="mb-8 flex justify-center">
        <Logo className="text-2xl" />
      </div>
      <Card>
        {sent ? (
          <>
            <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
              Check your email
            </h1>
            <p className="text-sm leading-relaxed text-slate-500">
              If an account exists for <span className="font-semibold text-midnight">{email}</span>,
              we've sent a link to reset your password. Open it on this device to choose a new one.
            </p>
            <Link to="/login" className="mt-5 block text-sm font-semibold text-azure">
              ← Back to log in
            </Link>
          </>
        ) : (
          <>
            <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
              Reset your password
            </h1>
            <p className="mb-5 text-sm text-slate-500">
              Enter your email and we'll send you a link to set a new password.
            </p>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                void submit()
              }}
            >
              <Field
                label="Email address"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                placeholder="you@example.co.uk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" loading={busy} disabled={!isValidEmail(email)}>
                Send reset link
              </Button>
            </form>
            <Link to="/login" className="mt-4 block text-center text-sm font-semibold text-azure">
              Back to log in
            </Link>
          </>
        )}
      </Card>
    </Screen>
  )
}
