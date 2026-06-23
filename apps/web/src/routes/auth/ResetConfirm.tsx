import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Screen, Logo, Card, Button, Field, FullScreenLoader } from '../../components/ui'

const MIN_PASSWORD = 8

/**
 * Landing for the password-recovery email link. `detectSessionInUrl: true` consumes the
 * recovery token and fires a PASSWORD_RECOVERY auth event, so `useAuth().user` becomes
 * available; we then let the user set a new password via updateUser.
 */
export default function ResetConfirm() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const [waited, setWaited] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Give the client a moment to consume the recovery token from the URL.
  useEffect(() => {
    if (user) return
    const t = setTimeout(() => setWaited(true), 3000)
    return () => clearTimeout(t)
  }, [user])

  const valid = password.length >= MIN_PASSWORD && password === confirm

  const submit = async () => {
    if (!valid || busy) return
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setBusy(false)
      setError(error.message)
      return
    }
    // Sign out of the recovery session so they log in fresh with the new password.
    await signOut()
    setBusy(false)
    navigate('/login?reset=1', { replace: true })
  }

  if (!user && !waited) return <FullScreenLoader />

  return (
    <Screen className="pt-8">
      <div className="mb-8 flex justify-center">
        <Logo className="text-2xl" />
      </div>
      <Card>
        {!user ? (
          <>
            <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
              This reset link isn't valid
            </h1>
            <p className="text-sm leading-relaxed text-slate-500">
              The link may have expired or already been used. Request a fresh one and open it on
              this device.
            </p>
            <Link to="/reset" className="mt-5 block text-sm font-semibold text-azure">
              Request a new reset link
            </Link>
          </>
        ) : (
          <>
            <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
              Choose a new password
            </h1>
            <p className="mb-5 text-sm text-slate-500">Set a new password for your account.</p>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                void submit()
              }}
            >
              <div className="relative">
                <Field
                  label="New password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
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
                label="Confirm new password"
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
              <Button type="submit" loading={busy} disabled={!valid}>
                Update password
              </Button>
            </form>
          </>
        )}
      </Card>
    </Screen>
  )
}
