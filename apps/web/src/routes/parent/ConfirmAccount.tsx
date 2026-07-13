import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { confirmChildAccount, sendPledgeEmail } from '../../lib/pledge'
import { Screen, Logo, Card, Button, Field, Disclaimer, FullScreenLoader } from '../../components/ui'
import { DobInput, childDobError, dobComplete, dobToIso, type Dob } from '../../components/DobInput'
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
  const [dob, setDob] = useState<Dob>({ day: '', month: '', year: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!childId) return
    supabase
      .from('children')
      .select('name, date_of_birth')
      .eq('id', childId)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as { name: string; date_of_birth: string | null } | null
        setChildName(row?.name ?? null)
        // Prefill if the child already has a DOB (e.g. a returning parent), so this
        // stays a confirm rather than a re-entry.
        if (row?.date_of_birth) {
          const [y, m, d] = row.date_of_birth.split('-')
          if (y && m && d) setDob({ day: d, month: m, year: y })
        }
        setLoading(false)
      })
  }, [childId])

  if (loading) return <FullScreenLoader />
  const child = childName ?? 'your child'

  const rawSort = sortCode.replace(/\D/g, '')
  const dobErr = childDobError(dob)
  const valid =
    rawSort.length === 6 &&
    accountNumber.length === 8 &&
    reference.trim().length > 0 &&
    dobComplete(dob) &&
    !dobErr

  const save = async () => {
    if (!valid || !childId || busy) return
    setBusy(true)
    setError('')

    // Capture the child's real date of birth (the keystone — a Junior ISA cannot be
    // opened without it, and it makes every projection accurate). Saved first so a
    // later jisa failure still leaves us with the DOB.
    const { error: dobError } = await supabase
      .from('children')
      .update({ date_of_birth: dobToIso(dob) })
      .eq('id', childId)
    if (dobError) {
      setBusy(false)
      setError(describeError(dobError))
      return
    }

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
        <button className="text-2xl text-midnight" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
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
            onChange={(e) => setReference(e.target.value)}
          />

          <div>
            <span className="mb-1.5 block text-sm font-semibold text-midnight">
              {child}'s date of birth
            </span>
            <DobInput value={dob} onChange={setDob} />
            <span className="mt-1.5 block text-xs text-slate-400">
              A Junior ISA can't be opened without it — and it makes {child}'s projection accurate.
            </span>
            {dobErr && <span className="mt-1 block text-xs text-red-500">{dobErr}</span>}
          </div>

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
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="w-full py-2 text-sm font-semibold text-slate-400 transition hover:text-midnight"
          >
            I'll do this later
          </button>
        </form>
      </Card>

      <Disclaimer />
    </Screen>
  )
}
