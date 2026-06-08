import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ChildData {
  name: string
  owner_id: string
}

interface JisaAccount {
  sort_code: string
  account_number: string
  payment_reference: string
  provider_name: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="ml-auto shrink-0 text-xs font-bold text-azure hover:opacity-75 transition-opacity px-2 py-1 rounded-lg bg-azure/10"
    >
      {copied ? '✓' : 'Copy'}
    </button>
  )
}

function fvAnnuityDue(pmt: number, years: number): number {
  const r = 0.08 / 12
  const n = years * 12
  return pmt * ((Math.pow(1 + r, n) - 1) / r) * (1 + r)
}

function formatGbp(n: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n)
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function FamilyPage() {
  const { childId } = useParams<{ childId: string }>()
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref')

  const [child, setChild] = useState<ChildData | null>(null)
  const [jisaAccount, setJisaAccount] = useState<JisaAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [contributeOpen, setContributeOpen] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [selectedAmount, setSelectedAmount] = useState(30)
  const [fetchedCode, setFetchedCode] = useState<string | null>(null)

  // Persist ref code to localStorage immediately (mirrors WishlistPage behaviour)
  useEffect(() => {
    if (refCode) localStorage.setItem('amplifi_ref_code', refCode)
  }, [refCode])

  useEffect(() => {
    if (!childId) return

    const fetchData = async () => {
      const { data: childData } = await supabase
        .from('children')
        .select('name, owner_id')
        .eq('id', childId)
        .single()

      if (!childData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setChild(childData)

      const { data: jisa } = await supabase
        .from('jisa_accounts')
        .select('sort_code, account_number, payment_reference, provider_name')
        .eq('child_id', childId)
        .single()

      if (jisa) setJisaAccount(jisa)

      const { data: refRow } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('user_id', childData.owner_id)
        .single()

      if (refRow?.code) setFetchedCode(refRow.code)

      setLoading(false)
    }

    fetchData()
  }, [childId])

  const handleCopyCode = async () => {
    const code = fetchedCode ?? refCode
    if (!code) return
    await navigator.clipboard.writeText(code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  const handleWhatsApp = (msg: string) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleSMS = (msg: string) => {
    window.open(`sms:?body=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleCopyShare = async (msg: string) => {
    await navigator.clipboard.writeText(msg)
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2000)
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-sky border-t-transparent animate-spin" />
          <p className="text-midnight/60 text-sm font-medium">Loading…</p>
        </div>
      </div>
    )
  }

  // ── Not found ──────────────────────────────────────────────────────────────

  if (notFound || !child) {
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-4xl mb-4">🌱</p>
          <h1 className="text-2xl font-extrabold text-midnight mb-2">Page not found</h1>
          <p className="text-slate-500 text-sm">This link may have expired or the account was removed.</p>
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const name = child.name
  const effectiveCode = fetchedCode ?? refCode
  const shareMsg = effectiveCode
    ? `I'm using Amplifi to build ${name}'s future. Set up Amplifi for your child and use my code ${effectiveCode} — we'll both get £5 into our kids' Junior ISAs! Download here: https://amplifi-marketing.netlify.app/?ref=${effectiveCode}`
    : ''

  return (
    <div className="min-h-screen bg-offwhite font-jakarta">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-midnight px-4 pt-10 pb-8 text-center">
        <h1 className="text-white text-3xl font-extrabold leading-tight">
          Building {name}'s financial future
        </h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* ── Subtext ───────────────────────────────────────────────────── */}
        <p className="text-midnight text-sm leading-relaxed pt-1">
          You've been invited to support {name}'s financial future. Through the power of
          compounding, any contribution you can afford to make will make a real difference.
        </p>

        {/* ── Projection calculator ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="font-bold text-midnight text-base mb-4">
            See what regular contributions could grow to over 25 years
          </p>
          <div className="flex gap-2 mb-5">
            {[10, 20, 30, 40, 50].map((amt) => (
              <button
                key={amt}
                onClick={() => setSelectedAmount(amt)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors"
                style={
                  selectedAmount === amt
                    ? { backgroundColor: '#407BBF', color: '#ffffff' }
                    : { backgroundColor: '#f1f5f9', color: '#101628' }
                }
              >
                £{amt}/mo
              </button>
            ))}
          </div>
          <p className="text-center text-4xl font-extrabold text-midnight tracking-tight mb-3">
            {formatGbp(fvAnnuityDue(selectedAmount, 25))}
          </p>
          <p className="text-center text-xs text-slate-400 leading-relaxed">
            Based on 8% annual growth, compounded monthly. Capital at risk.
          </p>
        </div>

        {/* ── Contribute accordion ──────────────────────────────────────── */}
        <div>
          <button
            onClick={() => setContributeOpen((v) => !v)}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-opacity hover:opacity-90 active:opacity-75"
            style={{ backgroundColor: '#407BBF' }}
          >
            Click here to contribute
          </button>

          {contributeOpen && (
            <div className="mt-2 bg-white rounded-2xl border border-slate-100 overflow-hidden">
              {!jisaAccount ? (
                <p className="text-slate-500 text-sm px-4 py-4">
                  JISA account not yet set up — check back soon.
                </p>
              ) : (
                <div className="px-4 py-4 space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    🏦 Send your contribution directly to {name}'s Junior ISA
                  </p>
                  {jisaAccount.provider_name && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-28 shrink-0">Bank</span>
                      <span className="text-sm font-semibold text-midnight flex-1">{jisaAccount.provider_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-28 shrink-0">Sort code</span>
                    <span className="text-sm font-semibold text-midnight flex-1">{jisaAccount.sort_code}</span>
                    <CopyButton value={jisaAccount.sort_code} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-28 shrink-0">Account number</span>
                    <span className="text-sm font-semibold text-midnight flex-1">{jisaAccount.account_number}</span>
                    <CopyButton value={jisaAccount.account_number} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-28 shrink-0">Reference</span>
                    <span className="text-sm font-semibold text-midnight flex-1">{jisaAccount.payment_reference}</span>
                    <CopyButton value={jisaAccount.payment_reference} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Amplifi signup ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="font-bold text-midnight text-base mb-2">
            See how your contributions are helping {name}'s pot to grow
          </p>
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            Register for an Amplifi account and link it to {name}'s family network.
            You'll be able to see the pot balance and watch it grow over time.
          </p>
          {effectiveCode && (
            <button
              onClick={handleCopyCode}
              className="w-full rounded-2xl py-4 px-5 text-center mb-3 transition-opacity hover:opacity-80 active:opacity-60"
              style={{ backgroundColor: '#407BBF14' }}
            >
              <span className="block text-3xl font-extrabold tracking-[0.25em]" style={{ color: '#407BBF' }}>
                {effectiveCode}
              </span>
              <span className="block text-xs font-semibold mt-1" style={{ color: '#407BBF' }}>
                {codeCopied ? '✓ Copied!' : 'Tap to copy'}
              </span>
            </button>
          )}
          <a
            href={`https://amplifi-marketing.netlify.app/?ref=${effectiveCode ?? ''}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3.5 rounded-2xl font-bold text-white text-sm text-center transition-opacity hover:opacity-90 active:opacity-75 mb-3"
            style={{ backgroundColor: '#101628' }}
          >
            Visit Amplifi to sign up
          </a>
          {effectiveCode && (
            <p className="text-center text-xs text-slate-400">
              Use the code above when you sign up to link to {name}'s account
            </p>
          )}
        </div>

        <div className="pb-10" />

      </div>
    </div>
  )
}
