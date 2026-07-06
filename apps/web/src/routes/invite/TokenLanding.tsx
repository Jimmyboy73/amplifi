import { useEffect, useState } from 'react'
import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { loadInviteByToken, markInviteOpened, type InviteSummary } from '../../lib/pledge'
import { Screen, Logo, Card, Button, Disclaimer, FullScreenLoader } from '../../components/ui'

/**
 * /i/:token — the opaque-token landing. Bypasses E1 (spec §5) and routes to the right
 * accept screen for the invite's direction. The token is the ONLY thing in the URL; all
 * display data comes from the get_pledge_invite RPC (no email is ever returned).
 *
 *  - pledge_to_parent → P-ACCEPT (/i/:token/accept) — parent claims the token's child.
 *  - invite_to_family → F-ACCEPT — stub until Step 5 (outward invites).
 */
export default function TokenLanding() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<InviteSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    loadInviteByToken(token).then((s) => {
      setSummary(s)
      setLoading(false)
      if (s && !s.expired) void markInviteOpened(token)
    })
  }, [token])

  if (loading) return <FullScreenLoader />

  // Send the parent straight to P-ACCEPT (which shows the pledge + signs them in).
  if (summary && !summary.expired && summary.direction === 'pledge_to_parent') {
    return <Navigate to={`/i/${token}/accept`} replace />
  }

  return (
    <Screen className="pt-8">
      <div className="mb-8 flex justify-center">
        <Logo className="text-2xl" />
      </div>

      {!summary ? (
        <Card>
          <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
            This link isn't valid
          </h1>
          <p className="text-sm leading-relaxed text-slate-500">
            We couldn't find this invite. It may have been mistyped — ask whoever sent it for a fresh link.
          </p>
        </Card>
      ) : summary.expired ? (
        <Card>
          <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
            This link has expired
          </h1>
          <p className="mb-4 text-sm leading-relaxed text-slate-500">
            Invite links last 30 days. Ask {summary.senderFirstName || 'the sender'} to send you a fresh one.
          </p>
        </Card>
      ) : (
        // invite_to_family (parent → family) — F-ACCEPT.
        <Card>
          <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
            Join {summary.childName}'s family pot
          </h1>
          <p className="mb-5 text-sm leading-relaxed text-slate-500">
            {summary.senderFirstName || 'A family member'} invited you to add a little towards{' '}
            {summary.childName}'s future. No account needed to start.
          </p>
          <Button onClick={() => navigate(`/i/${token}/pledge`)}>Start a pledge</Button>
        </Card>
      )}

      <Disclaimer />
    </Screen>
  )
}
