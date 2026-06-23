import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { usePot } from '../../lib/usePot'
import { loadInvite, claimInvite, type InviteContext } from '../../lib/invites'
import { Screen, Logo, Card, Button, FullScreenLoader } from '../../components/ui'
import { PotHero } from '../../components/PotHero'

export default function InviteLanding() {
  const { inviteId } = useParams<{ inviteId: string }>()
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()

  const [ctx, setCtx] = useState<InviteContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)

  useEffect(() => {
    if (!inviteId) return
    loadInvite(inviteId).then((c) => {
      setCtx(c)
      setLoading(false)
    })
  }, [inviteId])

  const { pot } = usePot(ctx?.invite.child_id ?? null)

  if (loading || authLoading) return <FullScreenLoader />

  if (!ctx) {
    return (
      <Screen className="items-center justify-center pt-20">
        <Logo className="mb-6 text-2xl" />
        <Card className="text-center">
          <p className="text-lg font-bold text-midnight">This invite isn't available</p>
          <p className="mt-2 text-sm text-slate-500">
            The link may be incorrect or the invite may have been removed. Ask whoever invited you to
            send a fresh link.
          </p>
        </Card>
      </Screen>
    )
  }

  const { invite, childName, parentName } = ctx

  // Already claimed by this signed-in user → straight to contributing.
  if (user && invite.status === 'approved' && invite.requester_id === user.id) {
    navigate(`/contribute/${invite.id}`, { replace: true })
    return null
  }

  const proceed = async () => {
    if (!inviteId) return
    if (!user) {
      navigate(`/invite/${inviteId}/join`)
      return
    }
    setClaiming(true)
    const ok = await claimInvite(inviteId, user.id)
    setClaiming(false)
    if (ok) navigate(`/contribute/${inviteId}`, { replace: true })
  }

  const alreadyTaken = invite.status === 'approved' && invite.requester_id !== (user?.id ?? null)

  return (
    <Screen className="pt-8">
      <div className="mb-6 flex justify-center">
        <Logo className="text-2xl" />
      </div>

      <p className="mb-3 text-center text-base text-slate-600">
        <span className="font-bold text-midnight">{parentName}</span> is building a savings pot for{' '}
        <span className="font-bold text-midnight">{childName}</span>
        {invite.invited_name ? ` and invited you, ${invite.invited_name}` : ''} to help. 💙
      </p>

      <PotHero childName={childName} pot={pot} />

      <Card className="mt-4">
        <p className="text-base font-bold text-midnight">How it works</p>
        <ol className="mt-3 space-y-2 text-sm text-slate-600">
          <li>1. Join in seconds with your email.</li>
          <li>2. See {childName}'s account details for a standing order.</li>
          <li>3. Set up the contribution in your own banking app — you stay in control.</li>
        </ol>
        <p className="mt-3 text-xs leading-snug text-slate-400">
          Amplifi never moves or holds your money. Standing orders go bank-to-bank, set up by you.
        </p>
      </Card>

      <div className="mt-4">
        {alreadyTaken ? (
          <Card className="text-center text-sm text-slate-500">
            This invite has already been used. Ask {parentName} for your own link.
          </Card>
        ) : (
          <Button loading={claiming} onClick={() => void proceed()}>
            Join {childName}'s team
          </Button>
        )}
      </div>
    </Screen>
  )
}
