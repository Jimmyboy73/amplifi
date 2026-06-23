import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  // Surfaced loudly in dev so a missing apps/web/.env is obvious.
  console.error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — create apps/web/.env (see .env.example).'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Browser session persistence: Supabase uses localStorage by default, so a returning
    // user on the same browser lands already logged in. Session length (~30 days) is set in
    // the Supabase dashboard (Auth → Sessions → Inactivity timeout).
    persistSession: true,
    autoRefreshToken: true,
    // Consume the password-recovery link on /reset-confirm (the only inbound auth link now
    // that OTP/magic-link sign-in is gone).
    detectSessionInUrl: true,
  },
})
