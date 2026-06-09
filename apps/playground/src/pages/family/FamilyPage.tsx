import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ChildData {
  name: string
  owner_id: string
  date_of_birth: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fvAnnuityDue(pmt: number, years: number): number {
  const r = 0.08 / 12
  const n = years * 12
  return pmt * ((Math.pow(1 + r, n) - 1) / r) * (1 + r)
}

function formatGbp(n: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP', maximumFractionDigits: 0,
  }).format(n)
}

function yearsUntilAge25(dob: string): number {
  const birth = new Date(dob)
  const age25 = new Date(birth.getFullYear() + 25, birth.getMonth(), birth.getDate())
  const diffMs = age25.getTime() - Date.now()
  return Math.max(1, diffMs / (1000 * 60 * 60 * 24 * 365.25))
}

// ── Page ───────────────────────────────────────────────────────────────────────

const AMOUNTS = [10, 25, 50] as const
type Amount = typeof AMOUNTS[number]

export default function FamilyPage() {
  const { childId } = useParams<{ childId: string }>()
  const [searchParams] = useSearchParams()
  const handle = searchParams.get('ref')

  const [child, setChild] = useState<ChildData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [selectedAmount, setSelectedAmount] = useState<Amount>(25)

  // Persist ref code to localStorage
  useEffect(() => {
    if (handle) localStorage.setItem('amplifi_ref_code', handle)
  }, [handle])

  useEffect(() => {
    if (!childId) return
    supabase
      .from('children')
      .select('name, owner_id, date_of_birth')
      .eq('id', childId)
      .single()
      .then(({ data }) => {
        if (!data) setNotFound(true)
        else setChild(data)
        setLoading(false)
      })
  }, [childId])

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-sky border-t-transparent animate-spin" />
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
  const years = yearsUntilAge25(child.date_of_birth)
  const projection = fvAnnuityDue(4 * selectedAmount, years)
  const signupUrl = `https://amplifi-marketing.netlify.app/${handle ? `?ref=${handle}` : ''}`

  const steps = [
    { icon: '👤', title: 'Sign up to Amplifi', desc: 'Create your free account in a few minutes' },
    { icon: '💰', title: 'Set up a contribution', desc: 'Choose a regular or one-off amount that works for you' },
    { icon: '📈', title: `Watch ${name}'s pot grow`, desc: 'See contributions compounding into something real' },
  ]

  return (
    <div className="min-h-screen bg-offwhite font-jakarta">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="bg-midnight px-6 pt-14 pb-12 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 text-2xl"
          style={{ backgroundColor: 'rgba(89,201,233,0.15)' }}
        >
          🌱
        </div>
        <h1 className="text-white text-[2rem] font-extrabold leading-tight tracking-tight">
          {name}'s savings pot
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed max-w-xs mx-auto" style={{ color: 'rgba(89,201,233,0.85)' }}>
          Every contribution makes a difference — help build {name}'s financial future
        </p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* ── Team projection card ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="text-sm font-semibold text-slate-500 mb-4">
            If 4 family members each contribute…
          </p>
          <div className="flex gap-3 mb-6">
            {AMOUNTS.map(amt => (
              <button
                key={amt}
                onClick={() => setSelectedAmount(amt)}
                className="flex-1 py-3 rounded-xl text-sm font-bold transition-colors"
                style={
                  selectedAmount === amt
                    ? { backgroundColor: '#101628', color: '#ffffff' }
                    : { backgroundColor: '#f1f5f9', color: '#101628' }
                }
              >
                £{amt}/mo
              </button>
            ))}
          </div>
          <div className="text-center">
            <p className="text-5xl font-extrabold tracking-tight" style={{ color: '#101628' }}>
              {formatGbp(projection)}
            </p>
            <p className="text-slate-500 text-sm mt-2">
              {name} could have by age 25
            </p>
          </div>
        </div>

        {/* ── How it works ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-base font-bold text-midnight mb-4">How it works</h2>
          <div className="space-y-4">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: 'rgba(89,201,233,0.12)' }}
                >
                  {step.icon}
                </div>
                <div>
                  <p className="font-bold text-midnight text-sm">{step.title}</p>
                  <p className="text-slate-500 text-sm mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <div className="pt-1">
          <a
            href={signupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-4 rounded-2xl font-bold text-center text-base transition-opacity hover:opacity-90 active:opacity-75"
            style={{ backgroundColor: '#59C9E9', color: '#101628' }}
          >
            Join {name}'s team
          </a>
          {handle && (
            <p className="text-center text-sm text-slate-400 mt-4">
              Already have Amplifi?{' '}
              <span className="font-bold" style={{ color: '#101628' }}>Search for @{handle}</span>
            </p>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <p className="text-xs text-slate-400 text-center leading-relaxed pb-8">
          Amplifi helps families build savings for their children through ISAs and JISAs.
          Projections are illustrative at 8% p.a. — not a guarantee.
        </p>

      </div>
    </div>
  )
}
