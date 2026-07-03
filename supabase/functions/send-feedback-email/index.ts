// Supabase Edge Function: send-feedback-email
//
// Sends a feedback notification email via Resend (domain letsamplifi.com is
// verified in Resend). This is BEST-EFFORT: the web app has already saved the
// feedback row and shows the user success before this runs, so any failure here
// only means James doesn't get the email — the feedback is never lost.
//
// Deploy: paste into Supabase Dashboard → Edge Functions → New function named
// exactly "send-feedback-email". Add the secret RESEND_API_KEY first (see below).
//
// Secret needed (Dashboard → Edge Functions → Secrets, or Project Settings →
// Edge Functions → Secrets): RESEND_API_KEY = <your Resend API key>

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM = 'Amplifi <noreply@letsamplifi.com>'
const TO = 'james@letsamplifi.com'

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

// Minimal HTML escaping so feedback text can't inject markup into the email.
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email, message } = await req.json()

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return json({ error: 'message is required' }, 400)
    }
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set')
      return json({ error: 'email not configured' }, 500)
    }

    const from = email && typeof email === 'string' ? email : 'unknown user'

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: email || undefined,
        subject: `New Amplifi feedback from ${from}`,
        html:
          `<p><strong>From:</strong> ${esc(from)}</p>` +
          `<p><strong>Message:</strong></p>` +
          `<p>${esc(message.trim()).replace(/\n/g, '<br>')}</p>`,
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.error('Resend send failed', res.status, detail)
      return json({ error: 'send failed' }, 502)
    }

    return json({ ok: true })
  } catch (err) {
    console.error('send-feedback-email error', err)
    return json({ error: 'unexpected error' }, 500)
  }
})
