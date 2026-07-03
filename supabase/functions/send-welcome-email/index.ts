// Supabase Edge Function: send-welcome-email
//
// Sends the one-time Founding Families welcome email via Resend (domain
// letsamplifi.com is verified in Resend) to the signed-in user who calls it.
//
// SECURITY: the recipient is derived from the caller's verified JWT — never from
// the request body — so this cannot be abused to email arbitrary addresses. The
// client (maybeSendWelcomeEmail) also guards with a welcome_email_sent metadata
// flag so it fires at most once per user. This is BEST-EFFORT: the client swallows
// any failure and never blocks signup.
//
// Deploy: paste into Supabase Dashboard → Edge Functions → new function named
// exactly "send-welcome-email".
//
// Secrets: RESEND_API_KEY (already set). SUPABASE_URL and SUPABASE_ANON_KEY are
// injected automatically by the platform — no need to add them.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
const FROM = 'Amplifi <noreply@letsamplifi.com>'
const SUBJECT = "Welcome to Amplifi — you're one of our Founding Families"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const TEXT_BODY = `Hi,

Thanks for joining Amplifi and starting your child's pot — you're one of our very first families, which genuinely means a lot.

Today, Amplifi works alongside your existing ISA or Junior ISA (and if you don't have one, we'll help you set one up with a trusted partner).

We're just getting started, and we'll grow — bigger, better, stronger — with you.

The thing that shapes what we build next is hearing from you — there's a feedback option right inside the app, use it any time. We read every one.

Thanks for being early,
James · Founder, Amplifi`

const HTML_BODY = `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #101628;">
    <p>Hi,</p>
    <p>Thanks for joining Amplifi and starting your child's pot — you're one of our very first families, which genuinely means a lot.</p>
    <p>Today, Amplifi works alongside your existing ISA or Junior ISA (and if you don't have one, we'll help you set one up with a trusted partner).</p>
    <p>We're just getting started, and we'll grow — bigger, better, stronger — with you.</p>
    <p>The thing that shapes what we build next is hearing from you — there's a feedback option right inside the app, use it any time. We read every one.</p>
    <p>Thanks for being early,<br>James · Founder, Amplifi</p>
  </div>
`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Identify the caller from their JWT — this is who we email.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'unauthorized' }, 401)
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('SUPABASE_URL / SUPABASE_ANON_KEY not available')
      return json({ error: 'not configured' }, 500)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user?.email) return json({ error: 'no authenticated user' }, 401)

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set')
      return json({ error: 'email not configured' }, 500)
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [user.email],
        subject: SUBJECT,
        text: TEXT_BODY,
        html: HTML_BODY,
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.error('Resend send failed', res.status, detail)
      return json({ error: 'send failed' }, 502)
    }

    return json({ ok: true })
  } catch (err) {
    console.error('send-welcome-email error', err)
    return json({ error: 'unexpected error' }, 500)
  }
})
