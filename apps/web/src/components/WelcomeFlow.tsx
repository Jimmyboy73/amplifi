import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Screen, Logo, Card, Button } from './ui'

/**
 * One-time welcome shown on a user's FIRST login (after email confirmation),
 * before the pot/home screen. Two tap-through cards. On finish we persist
 * `has_seen_welcome: true` to Supabase user metadata so it never shows again,
 * and call `onDone` to swap to the home screen immediately.
 *
 * The flag lives in auth user metadata (not a profiles column) — it's a
 * non-security UI flag, needs no migration, and updates the live session via the
 * USER_UPDATED auth event.
 */
export function WelcomeFlow({ onDone }: { onDone: () => void }) {
  const [card, setCard] = useState<0 | 1>(0)
  const [busy, setBusy] = useState(false)

  const finish = async () => {
    if (busy) return
    setBusy(true)
    // Best-effort persist — even if it fails we still let the user through; worst
    // case they see the welcome once more on next login.
    await supabase.auth.updateUser({ data: { has_seen_welcome: true } })
    setBusy(false)
    onDone()
  }

  return (
    <Screen className="justify-center pt-8">
      <div className="mb-8 flex justify-center">
        <Logo className="text-2xl" />
      </div>

      {card === 0 ? (
        <Card>
          <p className="text-4xl">👋</p>
          <h1 className="mb-3 mt-3 text-2xl font-extrabold tracking-tight text-midnight">
            Welcome
          </h1>
          <p className="mb-2 text-base font-semibold text-midnight">
            You're one of our Founding Families.
          </p>
          <p className="mb-6 text-sm leading-relaxed text-slate-500">
            Together we're building a better way for families to build wealth.
          </p>
          <Button type="button" onClick={() => setCard(1)}>
            Let's get started →
          </Button>
        </Card>
      ) : (
        <Card>
          <h1 className="mb-3 text-2xl font-extrabold tracking-tight text-midnight">
            Before we begin…
          </h1>
          <p className="mb-4 text-sm leading-relaxed text-slate-500">
            Today, Amplifi works alongside your existing ISA or Junior ISA. Don't have one yet?
            We'll help you set one up with one of our trusted partners.
          </p>
          <p className="mb-6 text-sm leading-relaxed text-midnight">
            💙 As one of our first families, your feedback will help shape everything we build next.
          </p>
          <Button type="button" onClick={() => void finish()} loading={busy}>
            Continue →
          </Button>
        </Card>
      )}
    </Screen>
  )
}
