// Supabase Edge Function: send-pledge-email
//
// Sends the family-pledge transactional emails via Resend (domain letsamplifi.com is
// verified in Resend). Three kinds (spec §8):
//   - pledge_to_parent  (§8.2) grandparent → parent: "I've started something for [child]"
//   - invite_to_family  (§8.4) parent → family: outward invite
//   - account_open       (§8.3) → every linked pledger: "the account is open, here's how"
//
// READS GO THROUGH SECURITY DEFINER RPCs (get_invite_email_data / get_account_open_
// notifications), NOT direct table access — the pledge tables have RLS on, and a plain
// service-role client did not reliably bypass it. Definer RPCs read as owner, so this works
// regardless of the calling client's role. The function no longer needs the service-role key.
//
// SECURITY — not an open relay. The client never passes a recipient address or body.
//   - token kinds: recipient + template are derived server-side from the token.
//   - account_open: called with the parent's JWT; the RPC verifies they own the child.
//
// Deploy: paste into Supabase Dashboard → Edge Functions → the existing send-pledge-email
// function → Deploy. Secret RESEND_API_KEY is already set; SUPABASE_URL / SUPABASE_ANON_KEY
// are injected by the platform.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
const FROM = 'Amplifi <noreply@letsamplifi.com>'
// Where links in emails point. Change if the app is served elsewhere.
const APP_URL = 'https://app.letsamplifi.com'

const DISCLAIMER =
  'Amplifi is pre-launch and not yet authorised or regulated by the FCA. Nothing here is ' +
  'financial advice or an invitation to invest. Amplifi does not open accounts or hold or move ' +
  'money. Investments can fall as well as rise.'

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

const esc = (s: string) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function contribution(amountPennies: number | null, frequency: string | null): string | null {
  if (!amountPennies || !frequency) return null
  const amt = `£${Math.round(amountPennies / 100).toLocaleString('en-GB')}`
  if (frequency === 'weekly') return `${amt} a week`
  if (frequency === 'monthly') return `${amt} a month`
  return `${amt} one-off`
}

function shell(inner: string, button?: { label: string; url: string }): string {
  const btn = button
    ? `<p style="margin:24px 0;"><a href="${esc(button.url)}" style="background:#59c9e9;color:#101628;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px;display:inline-block;">${esc(button.label)}</a></p>`
    : ''
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#101628;max-width:520px;">
    ${inner}${btn}
    <hr style="border:none;border-top:1px solid #e5e9f0;margin:24px 0;">
    <p style="font-size:12px;line-height:1.5;color:#8a97ad;">${esc(DISCLAIMER)}</p>
  </div>`
}

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, text }),
  })
  if (!res.ok) console.error('Resend send failed', res.status, await res.text())
  return res.ok
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('missing env (RESEND_API_KEY / SUPABASE_URL / SUPABASE_ANON_KEY)')
      return json({ error: 'not configured' }, 500)
    }
    // Plain anon client — reads happen through SECURITY DEFINER RPCs, which bypass RLS.
    const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { kind, token, childId } = await req.json()

    // ── pledge_to_parent (§8.2) + invite_to_family (§8.4) ────────────────────
    if (kind === 'pledge_to_parent' || kind === 'invite_to_family') {
      const { data: rows, error } = await db.rpc('get_invite_email_data', { p_token: token })
      if (error) {
        console.error('get_invite_email_data failed', error)
        return json({ error: 'lookup failed' }, 500)
      }
      const d = rows?.[0]
      if (!d?.recipient_email) return json({ ok: true, skipped: 'no recipient' })

      const name = d.child_name ?? 'their child'
      const link = `${APP_URL}/i/${token}`

      if (d.direction === 'pledge_to_parent') {
        const contrib = contribution(d.amount_pennies, d.frequency)
        const sender = d.sender_first_name || 'Someone'
        const msg = (d.personal_message ?? '').trim()
        const subject = `I've started something for ${name}`
        const inner =
          `<p>${esc(sender)} has started ${esc(contrib ?? 'a contribution')} for ${esc(name)} on Amplifi.</p>` +
          (msg ? `<blockquote style="border-left:3px solid #59c9e9;margin:16px 0;padding:8px 16px;">${esc(msg).replace(/\n/g, '<br>')}</blockquote>` : '') +
          `<p>There's one quick step only you can do.</p>`
        const text = `${sender} has started ${contrib ?? 'a contribution'} for ${name} on Amplifi.\n\n${msg ? `"${msg}"\n\n` : ''}There's one quick step only you can do — see what's waiting:\n${link}\n\n${DISCLAIMER}`
        return json({ ok: await sendEmail(d.recipient_email, subject, shell(inner, { label: 'See what’s waiting', url: link }), text) })
      } else {
        const parentFirst = d.sender_first_name || 'Someone'
        const subject = `Help build ${name}'s future`
        const inner = `<p>${esc(parentFirst)} has set up a way for the family to build ${esc(name)}'s future together. If you'd like to add a little, it starts here.</p>`
        const text = `${parentFirst} has set up a way for the family to build ${name}'s future together. If you'd like to add a little, it starts here:\n${link}\n\n${DISCLAIMER}`
        return json({ ok: await sendEmail(d.recipient_email, subject, shell(inner, { label: 'Add a little', url: link }), text) })
      }
    }

    // ── account_open (§8.3) — notify every linked pledger ────────────────────
    if (kind === 'account_open') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) return json({ error: 'unauthorized' }, 401)
      // Call the RPC AS THE PARENT so auth.uid() lets the RPC verify child ownership.
      const asUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: rows, error } = await asUser.rpc('get_account_open_notifications', {
        p_child_id: childId,
      })
      if (error) {
        console.error('get_account_open_notifications failed', error)
        return json({ error: 'forbidden' }, 403)
      }

      let sent = 0
      for (const r of rows ?? []) {
        if (!r.pledger_email) continue
        const contrib = contribution(r.amount_pennies, r.frequency)
        const sortDisplay = (r.sort_code ?? '').replace(/(\d{2})(\d{2})(\d{2})/, '$1-$2-$3')
        const link = r.status_token ? `${APP_URL}/pledge/status/${r.status_token}` : undefined
        const subject = `${r.child_name}'s account is open`
        const details =
          `<table style="border-collapse:collapse;margin:16px 0;">` +
          (r.provider_name ? `<tr><td style="padding:4px 12px 4px 0;color:#8a97ad;">Provider</td><td style="font-weight:700;">${esc(r.provider_name)}</td></tr>` : '') +
          `<tr><td style="padding:4px 12px 4px 0;color:#8a97ad;">Sort code</td><td style="font-weight:700;">${esc(sortDisplay)}</td></tr>` +
          `<tr><td style="padding:4px 12px 4px 0;color:#8a97ad;">Account number</td><td style="font-weight:700;">${esc(r.account_number ?? '')}</td></tr>` +
          `<tr><td style="padding:4px 12px 4px 0;color:#8a97ad;">Reference</td><td style="font-weight:700;">${esc(r.payment_reference ?? '')}</td></tr>` +
          `</table>`
        const inner =
          `<p>${esc(r.child_name)}'s account is open. You can start ${esc(contrib ?? 'your contribution')} whenever you like — here's exactly how.</p>` +
          `<p>Set up a standing order in your own banking app using these details. Amplifi never holds or moves your money.</p>` +
          details
        const text =
          `${r.child_name}'s account is open. You can start ${contrib ?? 'your contribution'} whenever you like.\n\n` +
          `Set up a standing order in your own banking app using these details (Amplifi never holds or moves money):\n` +
          `${r.provider_name ? `Provider: ${r.provider_name}\n` : ''}Sort code: ${sortDisplay}\nAccount number: ${r.account_number}\nReference: ${r.payment_reference}\n` +
          `${link ? `\nSee it here: ${link}\n` : ''}\n${DISCLAIMER}`
        if (await sendEmail(r.pledger_email as string, subject, shell(inner, link ? { label: 'See how to start', url: link } : undefined), text)) sent++
      }
      return json({ ok: true, sent })
    }

    return json({ error: 'unknown kind' }, 400)
  } catch (err) {
    console.error('send-pledge-email error', err)
    return json({ error: 'unexpected error' }, 500)
  }
})
