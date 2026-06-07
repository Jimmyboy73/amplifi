import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ChildData {
  name: string
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

  // Persist ref code to localStorage immediately (mirrors WishlistPage behaviour)
  useEffect(() => {
    if (refCode) localStorage.setItem('amplifi_ref_code', refCode)
  }, [refCode])

  useEffect(() => {
    if (!childId) return

    const fetchData = async () => {
      const { data: childData } = await supabase
        .from('children')
        .select('name')
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

      setLoading(false)
    }

    fetchData()
  }, [childId])

  const handleCopyCode = async () => {
    if (!refCode) return
    await navigator.clipboard.writeText(refCode)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
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

  return (
    <div className="min-h-screen bg-offwhite font-jakarta">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-midnight px-4 pt-10 pb-8 text-center">
        <p className="text-sky text-xs font-bold uppercase tracking-widest mb-3">
          JUNIOR ISA
        </p>
        <h1 className="text-white text-3xl font-extrabold leading-tight">
          {name}'s future
        </h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* ── Intro copy ────────────────────────────────────────────────── */}
        <div className="space-y-3 pt-1">
          <p className="text-midnight text-sm leading-relaxed">
            You've been invited to support {name}'s future. Any contribution goes
            straight into {name}'s Junior ISA — a tax-free savings account invested
            for {name}'s future.
          </p>
        </div>

        {/* ── Contribute accordion ──────────────────────────────────────── */}
        <div>
          <button
            onClick={() => setContributeOpen((v) => !v)}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-opacity hover:opacity-90 active:opacity-75"
            style={{ backgroundColor: '#407BBF' }}
          >
            Contribute
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

        {/* ── Divider ───────────────────────────────────────────────────── */}
        {refCode && <hr className="border-slate-200" />}

        {/* ── Referral callout ──────────────────────────────────────────── */}
        {refCode && (
          <div className="bg-midnight rounded-2xl p-5">
            <p className="text-white font-bold text-base mb-2">
              Want to set up Amplifi for your own child?
            </p>
            <p className="text-white/80 text-sm leading-relaxed mb-4">
              Sign up to Amplifi and use this code when you create your account.
              You'll get £5 credited to your child's Junior ISA when you link a
              savings account.
            </p>
            <div className="bg-white/10 rounded-xl px-4 py-3 text-center mb-3">
              <span className="text-sky font-extrabold text-3xl tracking-[0.25em]">
                {refCode}
              </span>
            </div>
            <button
              onClick={handleCopyCode}
              className="w-full bg-sky text-midnight font-bold py-3 rounded-xl text-sm hover:opacity-90 active:opacity-75 transition-opacity"
            >
              {codeCopied ? '✓ Copied!' : `Copy code: ${refCode}`}
            </button>
          </div>
        )}

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="text-center pt-2 pb-10">
          <a
            href="https://letsamplifi.com"
            className="text-sm text-sky font-semibold hover:underline underline-offset-2"
          >
            Learn more about Amplifi →
          </a>
        </div>

      </div>
    </div>
  )
}
