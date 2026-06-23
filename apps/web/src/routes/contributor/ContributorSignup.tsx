import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { loadInvite, claimInvite, type InviteContext } from '../../lib/invites'
import { Screen, Logo, Card, FullScreenLoader } from '../../components/ui'
import { EmailPasswordForm } from '../../components/EmailPasswordForm'

export default function ContributorSignup() {
  const { inviteId } = useParams<{ inviteId: string }>()
  const navigate = useNavigate()
  const { user, isLoading } = useAuth()

  const [ctx, setCtx] = useState<InviteContext | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!inviteId) return
    loadInvite(inviteId).then((c) => {
      setCtx(c)
      setLoading(false)
    })
  }, [inviteId])

  const finish = async () => {
    if (!inviteId) return
    // Read the session directly — the auth context may not have updated yet.
    const { data: { user: current } } = await supabase.auth.getUser()
    if (!current) return
    await claimInvite(inviteId, current.id)
    navigate(`/contribute/${inviteId}`, { replace: true })
  }

  // Already signed in → claim and go.
  useEffect(() => {
    if (!isLoading && user && inviteId) void finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user, inviteId])

  if (loading || isLoading || user) return <FullScreenLoader />

  return (
    <Screen className="pt-8">
      <div className="mb-8 flex justify-center">
        <Logo className="text-2xl" />
      </div>
      <Card>
        <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
          Join {ctx?.childName ?? 'the'}'s team
        </h1>
        <p className="mb-5 text-sm text-slate-500">Create your account to join in.</p>
        <EmailPasswordForm loginQuery={`?next=/invite/${inviteId}`} onComplete={finish} />
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to={`/login?next=/invite/${inviteId}`} className="font-semibold text-azure">
            Log in
          </Link>
        </p>
      </Card>
    </Screen>
  )
}
