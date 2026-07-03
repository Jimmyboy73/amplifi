import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Screen, Logo, Card, Button, Field, FullScreenLoader } from '../../components/ui'
import { EmailPasswordForm } from '../../components/EmailPasswordForm'
import { DobInput, childDobError, dobComplete, dobToIso, type Dob } from '../../components/DobInput'

type Phase = 'auth' | 'child'

export default function ParentSignup() {
  const navigate = useNavigate()
  const { user, profile, isLoading, refreshProfile } = useAuth()
  const [phase, setPhase] = useState<Phase>('auth')

  // Returning, already-signed-in user with a profile but no child lands straight on the child step.
  useEffect(() => {
    if (!isLoading && user && profile) setPhase('child')
  }, [isLoading, user, profile])

  if (isLoading) return <FullScreenLoader />

  return (
    <Screen className="pt-8">
      <div className="mb-8 flex justify-center">
        <Logo className="text-2xl" />
      </div>

      {phase === 'auth' ? (
        <Card>
          <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
            Start your child's pot
          </h1>
          <p className="mb-5 text-sm text-slate-500">
            Build a savings pot for your child — and invite the family to help.
          </p>
          <EmailPasswordForm
            sendWelcomeEmail
            onComplete={async () => {
              await refreshProfile()
              setPhase('child')
            }}
          />
          <p className="mt-4 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-azure">
              Log in
            </Link>
          </p>
        </Card>
      ) : (
        <ChildStep
          onDone={() => navigate('/home', { replace: true })}
        />
      )}
    </Screen>
  )
}

function ChildStep({ onDone }: { onDone: () => void }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [dob, setDob] = useState<Dob>({ day: '', month: '', year: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const dobErr = childDobError(dob)
  const valid = name.trim().length > 0 && dobComplete(dob) && !dobErr

  const save = async () => {
    if (!valid || !user || busy) return
    setBusy(true)
    setError('')
    const { error } = await supabase.from('children').insert({
      owner_id: user.id,
      name: name.trim(),
      date_of_birth: dobToIso(dob),
    })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    onDone()
  }

  return (
    <Card>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
        Who are you saving for?
      </h1>
      <p className="mb-5 text-sm text-slate-500">Add your child so we can start their pot.</p>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <Field
          label="Child's name"
          autoCapitalize="words"
          placeholder="e.g. Olivia"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-midnight">Date of birth</span>
          <DobInput value={dob} onChange={setDob} />
          {dobErr && <span className="mt-1.5 block text-xs text-red-500">{dobErr}</span>}
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" loading={busy} disabled={!valid}>
          Create pot
        </Button>
      </form>
    </Card>
  )
}
