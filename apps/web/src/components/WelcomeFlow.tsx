import { useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * One-time welcome, shown as a dismissible banner ON the pot page (not a full-screen
 * interstitial) — the parent lands straight on their pot, with this greeting sitting
 * above it until dismissed. Merges what used to be two welcome cards (founding-family
 * warmth + the "works alongside your ISA" line) into a single calm banner.
 *
 * On dismiss we persist `has_seen_welcome: true` to Supabase user metadata so it never
 * shows again. The flag lives in auth user metadata (not a profiles column) — it's a
 * non-security UI flag, needs no migration, and updates the live session via the
 * USER_UPDATED auth event. Best-effort: if the write fails the user still gets through;
 * worst case they see the banner once more next login.
 */
export function WelcomeBanner({ onDismiss }: { onDismiss: () => void }) {
  const [busy, setBusy] = useState(false)

  const dismiss = async () => {
    if (busy) return
    setBusy(true)
    await supabase.auth.updateUser({ data: { has_seen_welcome: true } })
    setBusy(false)
    onDismiss()
  }

  return (
    <div className="mt-4 rounded-2xl bg-sky/5 p-4 ring-1 ring-sky/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-midnight">
            <span className="mr-1">👋</span> You're one of our Founding Families
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Amplifi works alongside your ISA or Junior ISA — we help you set one up if you don't
            have one yet. As one of our first families, your feedback shapes what we build next. 💙
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss welcome"
          onClick={() => void dismiss()}
          disabled={busy}
          className="-mr-1 -mt-1 shrink-0 rounded-full px-2 py-1 text-lg leading-none text-slate-400 hover:text-slate-600 disabled:opacity-40"
        >
          ×
        </button>
      </div>
    </div>
  )
}
