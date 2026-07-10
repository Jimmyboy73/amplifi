import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useChildren } from '../../lib/useChildren'
import { confirmChildAccount, sendPledgeEmail } from '../../lib/pledge'
import { Screen, Logo, Card, Button, Field, FullScreenLoader } from '../../components/ui'
import { formatSortCode } from '../../lib/format'

const PROVIDERS = [
  { name: 'Hargreaves Lansdown', location: 'Settings → Account Details → Payment Reference' },
  { name: 'AJ Bell', location: 'My Account → Account Details → Reference' },
  { name: 'Moneybox', location: 'Profile → Bank Details → Reference' },
  { name: 'Vanguard', location: 'Account → Payments → Payment Reference' },
]

export default function LinkIsa() {
  const navigate = useNavigate()
  const { children, loading } = useChildren()
  const child = children[0] ?? null

  const [sortCode, setSortCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [reference, setReference] = useState('')
  const [provider, setProvider] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!child) return
    supabase
      .from('jisa_accounts')
      .select('sort_code, account_number, payment_reference, provider_name')
      .eq('child_id', child.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        const d = data as {
          sort_code: string
          account_number: string
          payment_reference: string
          provider_name: string | null
        }
        setSortCode(formatSortCode(d.sort_code))
        setAccountNumber(d.account_number)
        setReference(d.payment_reference)
        setProvider(d.provider_name ?? '')
        setIsEditing(true)
      })
  }, [child])

  if (loading) return <FullScreenLoader />
  if (!child) {
    navigate('/home', { replace: true })
    return null
  }

  const rawSort = sortCode.replace(/\D/g, '')
  const valid = rawSort.length === 6 && accountNumber.length === 8 && reference.trim().length > 0

  const save = async () => {
    if (!valid || busy) return
    setBusy(true)
    setError('')
    const { error } = await supabase.from('jisa_accounts').upsert(
      {
        child_id: child.id,
        sort_code: rawSort,
        account_number: accountNumber,
        payment_reference: reference.trim(),
        provider_name: provider.trim() || null,
      },
      { onConflict: 'child_id' }
    )
    if (error) {
      setBusy(false)
      setError(error.message)
      return
    }

    // First-time open: flip the child's account to "open", link any pending pledges, and
    // email the family their pay-in details — the same trigger the invited path runs.
    // Guarded on account_status so editing details later never re-emails the family.
    if (child.account_status !== 'account_open') {
      const ok = await confirmChildAccount(child.id)
      if (!ok) {
        setBusy(false)
        setError('We saved the details but couldn’t finish linking. Please try again.')
        return
      }
      void sendPledgeEmail({ kind: 'account_open', childId: child.id })
    }

    setBusy(false)
    navigate('/home', { replace: true })
  }

  return (
    <Screen className="pt-6">
      <div className="mb-6 flex items-center justify-between">
        <button className="text-2xl text-midnight" onClick={() => navigate('/home')} aria-label="Back">
          ←
        </button>
        <Logo />
        <span className="w-6" />
      </div>

      <Card>
        <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-midnight">
          {isEditing ? 'ISA / JISA details' : "Link your child's ISA or JISA"}
        </h1>
        <p className="mb-5 text-sm leading-relaxed text-slate-500">
          {isEditing
            ? 'View or update the account family members pay into.'
            : `Family members use these details to set up a standing order straight into ${child.name}'s account. Amplifi never holds the money.`}
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
            placeholder="e.g. Hargreaves Lansdown"
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
            hint="Specific to your provider — it tells them which account to credit."
            value={reference}
            onChange={(e) => setReference(e.target.value.toUpperCase())}
          />

          <button
            type="button"
            className="flex w-full items-center justify-between border-t border-slate-100 pt-3 text-sm font-semibold text-sky"
            onClick={() => setShowHelp((v) => !v)}
          >
            Where do I find my reference?
            <span className="text-xs">{showHelp ? '▲' : '▼'}</span>
          </button>
          {showHelp && (
            <div className="space-y-3 rounded-xl bg-slate-50 p-4">
              {PROVIDERS.map((p) => (
                <div key={p.name}>
                  <p className="text-sm font-bold text-midnight">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.location}</p>
                </div>
              ))}
            </div>
          )}

          {valid && (
            <div className="rounded-xl border border-sky/40 bg-sky/5 p-4 text-sm leading-relaxed text-slate-600">
              Contributions will be sent to{' '}
              <span className="font-bold text-midnight">
                {sortCode} / {accountNumber}
              </span>{' '}
              with reference <span className="font-bold text-midnight">{reference.trim()}</span>.
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" loading={busy} disabled={!valid}>
            {isEditing ? 'Save changes' : 'Save and continue'}
          </Button>
        </form>
      </Card>
    </Screen>
  )
}
