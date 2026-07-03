import { supabase } from './supabase'

/**
 * Best-effort, one-time welcome email for a newly confirmed user.
 *
 * Sends via the `send-welcome-email` Edge Function (Resend). The Edge Function
 * derives the recipient from the caller's JWT — we never pass an address — so it
 * can't be abused to email arbitrary people.
 *
 * Guarded by the `welcome_email_sent` user-metadata flag so it never sends twice.
 * The flag is set only after a successful send, so a transient failure leaves the
 * door open for a later attempt. Never throws — a welcome email must never block
 * or error the user's signup.
 */
export async function maybeSendWelcomeEmail(): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || user.user_metadata?.welcome_email_sent) return

    const { error } = await supabase.functions.invoke('send-welcome-email')
    if (error) return // best-effort: leave the flag unset so we can retry later

    await supabase.auth.updateUser({ data: { welcome_email_sent: true } })
  } catch {
    // Swallowed on purpose — the welcome email is a bonus, never a blocker.
  }
}
