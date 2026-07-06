import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import {
  loadInviteByToken,
  acceptPledgeInvite,
  contributionLabel,
  type InviteSummary,
} from '../../lib/pledge'
import { Screen, Logo, Card, Button, Disclaimer, FullScreenLoader } from '../../components/ui'
import { EmailPasswordForm } from '../../components/EmailPasswordForm'

const LOOKUP_TIMEOUT_MS = 10000

/**
 * P-ACCEPT (spec §6). Invited-parent path: show the pledge, sign the parent in, attach to
 * the token's existing child, then → P4. Never hangs: the invite load and the claim both
 * have timeouts, an already-accepted token shows a clear message, and every failure path
 * renders an error card rather than an infinite spinner.
 */
export default function ParentAccept() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user, isLoading } = useAuth()

  const [summary, setSummary] = useState<InviteSummary | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState('')

  // Whether the user was ALREADY signed in when they landed. A returning/logged-in user
  // is auto-claimed; a user who signs up here has their claim driven by the form's
  // onComplete instead — which runs AFTER the profiles row is created, so the claim's
  // FK (children.owner_id → profiles) is satisfied. Lazy one-time init during render.
  const arrivedSignedInRef = useRef<boolean | null>(null)
  if (!isLoading && arrivedSignedInRef.current === null) {
    arrivedSignedInRef.current = !!user
  }
  const arrivedSignedIn = arrivedSignedInRef.current === true

  // Load the invite, with a timeout so a hung/failed lookup can never spin forever.
  useEffect(() => {
    if (!token) {
      setLoadState('error')
      return
    }
    let done = false
    const timer = setTimeout(() => {
      if (!done) {
        done = true
        setLoadState('error')
      }
    }, LOOKUP_TIMEOUT_MS)
    loadInviteByToken(token)
      .then((s) => {
        if (done) return
        done = true
        clearTimeout(timer)
        setSummary(s)
        setLoadState('loaded')
      })
      .catch(() => {
        if (done) return
        done = true
        clearTimeout(timer)
        setLoadState('error')
      })
    return () => {
      done = true
      clearTimeout(timer)
    }
  }, [token])

  const alreadySetUp = summary?.status === 'accepted'

  const finish = useCallback(async () => {
    if (!token) return
    setClaiming(true)
    setClaimError('')
    try {
      const {
        data: { user: current },
      } = await supabase.auth.getUser()
      if (!current) {
        // Session isn't ready yet — fall back to the signup form (no spin).
        setClaiming(false)
        return
      }
      const childId = await Promise.race([
        acceptPledgeInvite(token),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), LOOKUP_TIMEOUT_MS)),
      ])
      if (!childId) {
        setClaimError('We couldn’t set this up on your account. Please try again.')
        setClaiming(false)
        return
      }
      navigate(`/provider/${childId}`, { replace: true })
    } catch {
      setClaimError('Something went wrong setting this up. Please try again.')
      setClaiming(false)
    }
  }, [token, navigate])

  // ALREADY signed in on arrival + a fresh (not-yet-accepted) pledge → claim and continue.
  // The signup path is NOT auto-claimed here — it goes through the form's onComplete, which
  // fires only after the profiles row exists (otherwise the claim FK-violates → 409).
  useEffect(() => {
    if (isLoading || loadState !== 'loaded' || !summary) return
    if (!user || summary.expired || alreadySetUp) return
    if (!arrivedSignedIn || claiming || claimError) return
    void finish()
  }, [isLoading, loadState, summary, user, alreadySetUp, arrivedSignedIn, claiming, claimError, finish])

  if (isLoading || loadState === 'loading') return <FullScreenLoader />

  const contribution = summary ? contributionLabel(summary.amountPennies, summary.frequency) : null

  return (
    <Screen className="pt-8">
      <div className="mb-8 flex justify-center">
        <Logo className="text-2xl" />
      </div>

      {loadState === 'error' ? (
        <Card>
          <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
            Something went wrong
          </h1>
          <p className="mb-4 text-sm leading-relaxed text-slate-500">
            We couldn't load this pledge just now. Please refresh to try again, or ask whoever sent
            it for a fresh link.
          </p>
          <Button onClick={() => window.location.reload()}>Refresh</Button>
        </Card>
      ) : !summary ? (
        <Card>
          <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
            This link isn't valid
          </h1>
          <p className="text-sm leading-relaxed text-slate-500">
            We couldn't find this pledge. Ask whoever sent it for a fresh link.
          </p>
        </Card>
      ) : summary.expired ? (
        <Card>
          <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
            This link has expired
          </h1>
          <p className="text-sm leading-relaxed text-slate-500">
            Invite links last 30 days. Ask {summary.senderFirstName || 'the sender'} to send a fresh one.
          </p>
        </Card>
      ) : alreadySetUp ? (
        <Card>
          <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
            This pledge is already set up
          </h1>
          <p className="mb-4 text-sm leading-relaxed text-slate-500">
            {summary.childName}'s pledge has already been picked up — there's nothing more to do here.
          </p>
          {user ? (
            <Button onClick={() => navigate('/home', { replace: true })}>Go to your home</Button>
          ) : (
            <Link to="/login" className="font-semibold text-azure">
              Log in to your account
            </Link>
          )}
        </Card>
      ) : claimError ? (
        <Card>
          <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
            We couldn't finish setting this up
          </h1>
          <p className="mb-4 text-sm leading-relaxed text-slate-500">{claimError}</p>
          <Button loading={claiming} onClick={() => void finish()}>
            Try again
          </Button>
        </Card>
      ) : claiming || arrivedSignedIn ? (
        // Claim in progress, or a returning user being auto-claimed (bounded by the
        // timeout in finish()). NOTE: we intentionally do NOT gate on `user` — during
        // signup a session appears at OTP verification, before the profile is created,
        // so the form must stay mounted (below) until it finishes creating the profile.
        <FullScreenLoader />
      ) : (
        <Card>
          <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
            {summary.senderFirstName || 'Someone'} has started something for {summary.childName}
          </h1>
          {contribution && (
            <p className="mb-4 text-sm leading-relaxed text-slate-500">
              {summary.senderFirstName || 'They'} would like to put{' '}
              <span className="font-semibold text-midnight">{contribution}</span> towards{' '}
              {summary.childName}'s future. Here's the one thing only you can do.
            </p>
          )}

          {summary.personalMessage && (
            <blockquote className="mb-5 whitespace-pre-line rounded-xl bg-sky/5 p-4 text-sm leading-relaxed text-midnight ring-1 ring-sky/20">
              {summary.personalMessage}
            </blockquote>
          )}

          <p className="mb-4 text-sm font-semibold text-midnight">
            Create your account to pick this up.
          </p>
          <EmailPasswordForm
            sendWelcomeEmail
            loginQuery={`?next=/i/${token}/accept`}
            onComplete={finish}
          />
          <p className="mt-4 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to={`/login?next=/i/${token}/accept`} className="font-semibold text-azure">
              Log in
            </Link>
          </p>
        </Card>
      )}

      <Disclaimer />
    </Screen>
  )
}
