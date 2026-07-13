import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { loadPledgePayin } from '../../lib/pledge'
import { claimPledgesForUser } from '../../lib/follow'
import { Screen, Logo, Card, Disclaimer, FullScreenLoader } from '../../components/ui'
import { EmailPasswordForm } from '../../components/EmailPasswordForm'

/**
 * "Follow the child" signup — reached from the pledge status page (/follow/:token). The
 * pledge stays account-free; this is an OPTIONAL free account so a grandparent can follow
 * the child's future. On completion we claim their pre-signup pledges (by email) and send
 * them to their following dashboard. Reuses the shared email/password form + auth.
 */
export default function FollowSignup() {
  const { token, giftId } = useParams<{ token?: string; giftId?: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isLoading } = useAuth()

  const followPath = token ? `/follow/${token}` : `/follow/gift/${giftId}`
  const [childName, setChildName] = useState<string | null>(
    (location.state as { childName?: string } | null)?.childName ?? null
  )
  const [loading, setLoading] = useState(Boolean(token))

  useEffect(() => {
    // Pledge follow carries the child name behind the status token; gift follow passes it in
    // navigation state (set above).
    if (!token) return
    void loadPledgePayin(token).then((v) => {
      setChildName(v?.childName ?? null)
      setLoading(false)
    })
  }, [token])

  const finish = async () => {
    // Read the session directly — the auth context may not have updated yet.
    const { data: { user: current } } = await supabase.auth.getUser()
    if (!current) return
    await claimPledgesForUser(token, giftId)
    navigate('/following', { replace: true })
  }

  // Already signed in → claim and go straight to the dashboard.
  useEffect(() => {
    if (!isLoading && user) void finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user])

  if (loading || isLoading || user) return <FullScreenLoader />

  const child = childName ?? 'your grandchild'

  return (
    <Screen className="pt-8">
      <div className="mb-8 flex justify-center">
        <Logo className="text-2xl" />
      </div>
      <Card>
        <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
          Follow {child}'s future
        </h1>
        <p className="mb-5 text-sm leading-relaxed text-slate-500">
          Create a free account to watch {child}'s fund grow, keep your pay-in details handy, and
          start something for your other grandchildren too. Your pledge works with or without this.
        </p>
        <EmailPasswordForm loginQuery={`?next=${followPath}`} onComplete={finish} />
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to={`/login?next=${followPath}`} className="font-semibold text-azure">
            Log in
          </Link>
        </p>
      </Card>
      <Disclaimer />
    </Screen>
  )
}
