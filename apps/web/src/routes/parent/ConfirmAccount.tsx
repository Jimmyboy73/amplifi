import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { confirmChildAccount, sendPledgeEmail } from '../../lib/pledge'
import { Screen, Logo, Card, Button, Field, Disclaimer, FullScreenLoader } from '../../components/ui'
import { formatSortCode, describeError } from '../../lib/format'

/**
 * P5 — "Confirm the account" (spec §6). Child-SPECIFIC (via :childId) so an invited parent
 * with more than one child confirms the right one — unlike the shared /link-isa, which uses
 * children[0] (the flagged "first child only" snag). Saves the pay-in details to
 * jisa_accounts, then calls confirm_child_account: the TRIGGER that sets account_open, links
 * the pledges, and builds the graph. Display-only — Amplifi never opens the account or moves
 * money.
 */
export default function ConfirmAccount() {
  const { childId } = useParams<{ childId: string }>()
  const navigate = useNavigate()

  const [childName, setChildName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [provider, setProvider] = useState('')
  const [sortCode, setSortCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!childId) return
    supabase
      .from('children')
      .select('name')
      .eq('id', childId)
      .maybeSingle()
      .then(({ data }) => {
        setChildName((data as { name: string } | null)?.name ?? null)
        setLoading(false)
      })
  }, [childId])

  if (loading) return <FullScreenLoader />
  const child = childName ?? 'your child'

  const rawSort = sortCode.replace(/\D/g, '')
  const valid = rawSort.length === 6 && accountNumber.length === 8 && reference.trim().length > 0

  const save = async () => {
    if (!valid || !childId || busy) return
    setBusy(true)
    setError('')

    const { error: jisaError } = await supabase.from('jisa_accounts').upsert(
      {
        child_id: childId,
        sort_code: rawSort,
        account_number: accountNumber,
        payment_reference: reference.trim(),
        provider_name: provider.trim() || null,
      },
      { onConflict: 'child_id' }
    )
    if (jisaError) {
      setBusy(false)
      setError(describeError(jisaError))
      return
    }

    const ok = await confirmChildAccount(childId)
    if (!ok) {
      setBusy(false)
      setError('We saved the details but couldn’t finish linking. Please try again.')
      return
    }
    // Notify every linked pledger with their pay-in details (§8.3). Best-effort.
    void sendPledgeEmail({ kind: 'account_open', childId })
    setBusy(false)
    navigate('/home', { replace: true })
  }

  return (
    <Screen className="pt-6">
      <div className="mb-6 flex items-center justify-between">
        <Logo />
        <span className="w-6" />
      </div>

      <Card>
        <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
          Confirm {child}'s account
        </h1>
        <p className="mb-5 text-sm leading-relaxed text-slate-500">
          Once you've opened {child}'s Junior ISA, add the details family use to pay in. Family set
          up their own standing orders with these — Amplifi never holds or moves the money.
        </p>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <Field
            label="Provider (optional)"
            placeholder="e.g. the provider you opened the account with"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          />
          <Field
            label="Sort code"
            inputMode="numeric"
            placeholder="XX-XX-XX"
            maxLength={8}
            value={sortCode}
            onChange={(e) => setSortCode(formatSortCode(e.target.value))}
          />
          <Field
            label="Account number"
            inputMode="numeric"
            placeholder="8 digits"
            maxLength={8}
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 8))}
          />
          <Field
            label="Payment reference"
            placeholder="e.g. ISA123456"
            hint="Given by your provider — it tells them which account to credit."
            value={reference}
            onChange={(e) => setReference(e.target.value.toUpperCase())}
          />

          {valid && (
            <div className="rounded-xl border border-sky/40 bg-sky/5 p-4 text-sm leading-relaxed text-slate-600">
              Family would pay in to{' '}
              <span className="font-bold text-midnight">
                {sortCode} / {accountNumber}
              </span>{' '}
              with reference <span className="font-bold text-midnight">{reference.trim()}</span>.
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" loading={busy} disabled={!valid}>
            Confirm account
          </Button>
        </form>
      </Card>

      <Disclaimer />
    </Screen>
  )
}
