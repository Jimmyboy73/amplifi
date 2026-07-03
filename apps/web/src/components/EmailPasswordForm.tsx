import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button, Field } from './ui'

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
const MIN_PASSWORD = 8
const CODE_LENGTH = 6

type Step = 'credentials' | 'verify' | 'details'

/**
 * Reusable email + password signup block: credentials → (email code) → full name.
 *
 * Handles both Supabase "Confirm email" states:
 *  - OFF  → signUp returns a live session immediately, so we skip straight to the
 *           name step.
 *  - ON   → signUp returns a user but NO session and emails a numeric code; we show
 *           a code-entry step (`verify`), confirm it with verifyOtp to establish the
 *           session, then continue to the name step.
 *
 * Once a session + `profiles` row exist, `onComplete` fires. Parent flow continues
 * to a Child step; contributor flow claims the invite.
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
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [alreadyExists, setAlreadyExists] = useState(false)

  const credentialsValid =
    isValidEmail(email) && password.length >= MIN_PASSWORD && password === confirm

  const signUp = async () => {
    if (!credentialsValid || busy) return
    setBusy(true)
    setError('')
    setNotice('')
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
    // With "Confirm email" ON, signing up an already-registered email returns a
    // fake user with an empty `identities` array and NO error (Supabase hides this
    // to prevent account enumeration). Detect it so we don't strand the user on a
    // code screen waiting for an email that never comes.
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      setAlreadyExists(true)
      setError('An account with this email already exists.')
      return
    }
    if (data.session) {
      // "Confirm email" is OFF — we already have a live session, skip verification.
      setStep('details')
      return
    }
    // "Confirm email" is ON — Supabase emailed a code. Collect it next.
    setStep('verify')
  }

  const verifyCode = async () => {
    if (code.length !== CODE_LENGTH || busy) return
    setBusy(true)
    setError('')
    setNotice('')
    // A signUp confirmation code verifies against type 'signup'. Depending on the
    // dashboard email template/config some projects register it as a generic email
    // OTP instead, so fall back to type 'email'. A wrong-type attempt does not
    // consume the code, so this fallback is safe.
    let result = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: 'signup',
    })
    if (result.error) {
      const retry = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code,
        type: 'email',
      })
      if (!retry.error) result = retry
    }
    setBusy(false)
    if (result.error) {
      setError('That code is incorrect or has expired. Check your email and try again.')
      return
    }
    // Session is now live — continue to collect the user's name.
    setStep('details')
  }

  const resendCode = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    setNotice('We’ve sent a fresh code to your email.')
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

  if (step === 'verify') {
    return (
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void verifyCode()
        }}
      >
        <p className="text-sm leading-relaxed text-slate-500">
          We’ve emailed a {CODE_LENGTH}-digit code to{' '}
          <span className="font-semibold text-midnight">{email.trim()}</span>. Enter it below to
          confirm your email.
        </p>
        <Field
          label="Confirmation code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
          maxLength={CODE_LENGTH}
          className="text-center text-lg tracking-[0.4em]"
          autoFocus
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        {notice && <p className="text-sm text-emerald-600">{notice}</p>}
        <Button type="submit" loading={busy} disabled={code.length !== CODE_LENGTH}>
          Confirm email
        </Button>
        <button
          type="button"
          onClick={() => void resendCode()}
          disabled={busy}
          className="block w-full text-center text-sm font-semibold text-azure disabled:opacity-40"
        >
          Didn’t get it? Resend code
        </button>
      </form>
    )
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
