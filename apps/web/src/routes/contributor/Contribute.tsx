import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { usePot } from '../../lib/usePot'
import { Screen, Logo, Card, FullScreenLoader } from '../../components/ui'
import { PotHero } from '../../components/PotHero'
import { IsaDetails } from '../../components/IsaDetails'
import { ContributionPanel } from '../../components/ContributionPanel'

type Jisa = {
  sort_code: string
  account_number: string
  payment_reference: string
  provider_name: string | null
}

export default function Contribute() {
  const { connectionId } = useParams<{ connectionId: string }>()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const [childId, setChildId] = useState<string | null>(null)
  const [childName, setChildName] = useState('')
  const [parentName, setParentName] = useState('the family')
  const [jisa, setJisa] = useState<Jisa | null>(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)

  const { pot, refetch: refetchPot } = usePot(childId)

  useEffect(() => {
    if (!connectionId || !user) return
    let active = true
    ;(async () => {
      const { data: conn } = await supabase
        .from('family_connections')
        .select('child_id, parent_id, requester_id, status')
        .eq('id', connectionId)
        .maybeSingle()
      const row = conn as
        | { child_id: string; parent_id: string; requester_id: string | null; status: string }
        | null
      if (!active) return
      if (!row || row.requester_id !== user.id || row.status !== 'approved') {
        setDenied(true)
        setLoading(false)
        return
      }
      const [{ data: child }, { data: parent }, { data: jisaRow }] = await Promise.all([
        supabase.from('children').select('name').eq('id', row.child_id).maybeSingle(),
        supabase.from('profiles').select('full_name').eq('id', row.parent_id).maybeSingle(),
        supabase
          .from('jisa_accounts')
          .select('sort_code, account_number, payment_reference, provider_name')
          .eq('child_id', row.child_id)
          .maybeSingle(),
      ])
      if (!active) return
      setChildId(row.child_id)
      setChildName((child as { name: string } | null)?.name ?? 'their child')
      setParentName((parent as { full_name: string } | null)?.full_name ?? 'the family')
      setJisa((jisaRow as Jisa | null) ?? null)
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [connectionId, user])

  if (loading) return <FullScreenLoader />

  if (denied) {
    return (
      <Screen className="items-center justify-center pt-20">
        <Logo className="mb-6 text-2xl" />
        <Card className="text-center">
          <p className="text-lg font-bold text-midnight">This isn't your contribution</p>
          <p className="mt-2 text-sm text-slate-500">
            We couldn't find a connection for your account here. Ask the family for a fresh invite link.
          </p>
        </Card>
      </Screen>
    )
  }

  return (
    <div className="min-h-dvh w-full bg-offwhite">
      <div className="mx-auto w-full max-w-md px-5 pb-16">
        <div className="flex items-center justify-between py-4">
          <Logo />
          <button
            className="text-sm font-semibold text-slate-400 hover:text-slate-600"
            onClick={() => void signOut().then(() => navigate('/', { replace: true }))}
          >
            Sign out
          </button>
        </div>

        <p className="mb-3 text-center text-sm text-slate-600">
          You're part of <span className="font-bold text-midnight">{childName}</span>'s team, with{' '}
          {parentName}. 💙
        </p>

        <PotHero childName={childName} pot={pot} />

        <Card className="mt-4">
          <p className="text-base font-bold text-midnight">Set up a standing order</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Add these details in your own banking app to send money straight into {childName}'s
            account.
          </p>
          <div className="mt-3">
            <IsaDetails childName={childName} jisa={jisa} />
          </div>
          <div className="mt-3 rounded-xl bg-sky/5 p-3 text-xs leading-relaxed text-slate-500 ring-1 ring-sky/20">
            🔒 Amplifi never moves or holds your money. Your standing order goes bank-to-bank and you
            stay in full control — change or cancel it anytime in your banking app.
          </div>
        </Card>

        <Card className="mt-4">
          {childId && (
            <ContributionPanel
              connectionId={connectionId ?? null}
              childId={childId}
              userId={user?.id ?? null}
              childName={childName}
              ctaLabel="Log my contribution"
              onChanged={() => void refetchPot()}
            />
          )}
          <p className="mt-3 text-xs leading-snug text-slate-400">
            Logging your contribution helps {childName}'s family see the pot grow. It doesn't move any
            money — set up the actual standing order in your banking app.
          </p>
        </Card>
      </div>
    </div>
  )
}
