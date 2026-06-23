import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button, Field } from './ui'

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
const MIN_PASSWORD = 8

type Step = 'credentials' | 'details'

/**
 * Reusable email + password signup block: credentials → full name.
 * On success the user has a live session (email confirmation is OFF) and a `profiles`
 * row, then `onComplete` fires. Parent flow continues to a Child step; contributor
 * flow claims the invite.
 */
export function EmailPasswordForm({
  loginQuery = '',
  onComplete,
}: {
  /** Optional query string appended to the "Log in" link, e.g. "?next=/invite/123". */
  loginQuery?: string
  onComplete: () => void | Promise<void>
}) {
  const [step, setStep] = useState<Step>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [alreadyExists, setAlreadyExists] = useState(false)

  const credentialsValid =
    isValidEmail(email) && password.length >= MIN_PASSWORD && password === confirm

  const signUp = async () => {
    if (!credentialsValid || busy) return
    setBusy(true)
    setError('')
    setAlreadyExists(false)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })
    setBusy(false)
    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('already registered') || msg.includes('already exists')) {
        setAlreadyExists(true)
        setError('An account with this email already exists.')
      } else {
        setError(error.message)
      }
      return
    }
    if (!data.user) {
      // Would happen if "Confirm email" is ON — no session until confirmed.
      setError('Please check your email to confirm your account, then log in.')
      return
    }
    setStep('details')
  }

  const saveDetails = async () => {
    const name = fullName.trim()
    if (name.length === 0 || busy) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Your session expired. Please start again.')
      setStep('credentials')
      return
    }
    setBusy(true)
    setError('')
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, full_name: name, email: email.trim() }, { onConflict: 'id' })
    if (error) {
      setBusy(false)
      setError(error.message)
      return
    }
    setBusy(false)
    await onComplete()
  }

  if (step === 'details') {
    return (
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void saveDetails()
        }}
      >
        <p className="text-sm leading-relaxed text-slate-500">Nice to meet you — what's your name?</p>
        <Field
          label="Full name"
          autoComplete="name"
          autoCapitalize="words"
          placeholder="Jane Smith"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoFocus
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" loading={busy} disabled={fullName.trim().length === 0}>
          Continue
        </Button>
      </form>
    )
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void signUp()
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
      <div className="relative">
        <Field
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          className="absolute right-3 top-[34px] text-xs font-semibold text-azure"
          onClick={() => setShowPassword((v) => !v)}
        >
          {showPassword ? 'Hide' : 'Show'}
        </button>
      </div>
      <Field
        label="Confirm password"
        type={showPassword ? 'text' : 'password'}
        autoComplete="new-password"
        placeholder="Re-enter your password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      {confirm.length > 0 && password !== confirm && (
        <p className="text-sm text-red-500">Passwords don't match.</p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {alreadyExists && (
        <Link to={`/login${loginQuery}`} className="block text-sm font-semibold text-azure">
          Log in instead →
        </Link>
      )}
      <Button type="submit" loading={busy} disabled={!credentialsValid}>
        Create account
      </Button>
    </form>
  )
}
