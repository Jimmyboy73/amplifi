import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Screen, Logo, Card, Button, Field } from '../../components/ui'

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

export default function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')
  const justReset = params.get('reset') === '1'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const valid = isValidEmail(email) && password.length > 0

  const submit = async () => {
    if (!valid || busy) return
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setBusy(false)
    if (error) {
      setError('That email or password is incorrect.')
      return
    }
    // Honor an explicit next target; otherwise let Root resolve parent vs contributor.
    navigate(next || '/', { replace: true })
  }

  return (
    <Screen className="pt-8">
      <div className="mb-8 flex justify-center">
        <Logo className="text-2xl" />
      </div>
      <Card>
        <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">Welcome back</h1>
        <p className="mb-5 text-sm text-slate-500">Log in to your Amplifi account.</p>
        {justReset && (
          <p className="mb-4 rounded-xl bg-green-50 px-3 py-2 text-sm font-medium text-green-700 ring-1 ring-green-200">
            Password updated — log in with your new password.
          </p>
        )}
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
          <div className="relative">
            <Field
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Your password"
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
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" loading={busy} disabled={!valid}>
            Log in
          </Button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link to="/reset" className="font-semibold text-azure">
            Forgot password?
          </Link>
          <Link to="/signup" className="font-semibold text-azure">
            Create an account
          </Link>
        </div>
      </Card>
    </Screen>
  )
}
