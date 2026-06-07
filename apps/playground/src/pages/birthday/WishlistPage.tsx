import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Wishlist {
  id: string
  occasion: string
  occasion_date: string
  total_target: number
  total_pledged: number
  payment_method: string
  child_id: string
}

interface WishlistItem {
  id: string
  name: string
  retailer: string | null
  target_amount: number
  pledged_amount: number
  emoji: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function gbp(n: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function WishlistPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref')

  const [wishlist, setWishlist] = useState<Wishlist | null>(null)
  const [items, setItems] = useState<WishlistItem[]>([])
  const [childName, setChildName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  // Persist ref code to localStorage immediately
  useEffect(() => {
    if (refCode) {
      localStorage.setItem('amplifi_ref_code', refCode)
    }
  }, [refCode])

  useEffect(() => {
    if (!id) return

    const fetchData = async () => {
      const { data: wl } = await supabase
        .from('wishlists')
        .select('id, occasion, occasion_date, total_target, total_pledged, payment_method, child_id')
        .eq('id', id)
        .single()

      if (!wl) {
        setLoading(false)
        return
      }

      setWishlist(wl)

      // Attempt to fetch child name — silently skipped if RLS blocks it
      const { data: child } = await supabase
        .from('children')
        .select('name')
        .eq('id', wl.child_id)
        .single()

      if (child?.name) setChildName(child.name)

      const { data: wlItems } = await supabase
        .from('wishlist_items')
        .select('id, name, retailer, target_amount, pledged_amount, emoji')
        .eq('wishlist_id', id)

      if (wlItems) setItems(wlItems)
      setLoading(false)
    }

    fetchData()
  }, [id])

  const handleCopy = async () => {
    if (!refCode) return
    await navigator.clipboard.writeText(refCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-sky border-t-transparent animate-spin" />
          <p className="text-midnight/60 text-sm font-medium">Loading wishlist…</p>
        </div>
      </div>
    )
  }

  // ── Not found ──────────────────────────────────────────────────────────────

  if (!wishlist) {
    return (
      <div className="min-h-screen bg-offwhite flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-4xl mb-4">🎁</p>
          <h1 className="text-2xl font-extrabold text-midnight mb-2">Wishlist not found</h1>
          <p className="text-slate-500 text-sm">This link may have expired or the wishlist was removed.</p>
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const occasionDate = new Date(wishlist.occasion_date)
  const formattedDate = occasionDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const heading = childName
    ? `${childName}'s ${wishlist.occasion}`
    : wishlist.occasion

  return (
    <div className="min-h-screen bg-offwhite font-jakarta">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-midnight px-4 pt-10 pb-8 text-center">
        <p className="text-sky text-xs font-bold uppercase tracking-widest mb-3">
          Gift Wishlist
        </p>
        <h1 className="text-white text-3xl font-extrabold leading-tight">
          {heading}
        </h1>
        <p className="text-white/50 mt-2 text-sm">🎂 {formattedDate}</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* ── Items ─────────────────────────────────────────────────────── */}
        {items.length > 0 && (
          <>
            <h2 className="text-midnight font-bold text-base pt-1">What would they love?</h2>
            {items.map((item) => {
              const pct = item.target_amount > 0
                ? Math.min(item.pledged_amount / item.target_amount, 1) * 100
                : 0
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-midnight text-sm leading-snug">
                        {item.emoji} {item.name}
                      </p>
                      {item.retailer && (
                        <p className="text-slate-400 text-xs mt-0.5">{item.retailer}</p>
                      )}
                    </div>
                    <p className="text-sm font-bold text-midnight ml-3 shrink-0">
                      {gbp(item.target_amount)}
                    </p>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-1.5 bg-sky rounded-full transition-all duration-500"
                      style={{ width: `${pct.toFixed(0)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    {gbp(item.pledged_amount)} of {gbp(item.target_amount)} pledged
                  </p>
                </div>
              )
            })}
          </>
        )}

        {/* ── Payment info ──────────────────────────────────────────────── */}
        {wishlist.payment_method && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Send your contribution to
            </p>
            <p className="font-bold text-midnight">{wishlist.payment_method}</p>
          </div>
        )}

        {/* ── Referral callout ──────────────────────────────────────────── */}
        {refCode && (
          <div className="bg-midnight rounded-2xl p-5 mt-2">
            <p className="text-white/80 text-sm leading-relaxed mb-4">
              Want to start building your child's financial future? Use code{' '}
              <span className="text-sky font-extrabold">{refCode}</span>
              {' '}when you sign up to Amplifi and you'll both get{' '}
              <span className="text-white font-bold">£5 credit</span>{' '}
              when you link a JISA.
            </p>
            <div className="bg-white/10 rounded-xl px-4 py-3 text-center mb-3">
              <span className="text-sky font-extrabold text-3xl tracking-[0.25em]">
                {refCode}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="w-full bg-sky text-midnight font-bold py-3 rounded-xl text-sm hover:opacity-90 active:opacity-75 transition-opacity"
            >
              {copied ? '✓ Copied!' : `Copy code: ${refCode}`}
            </button>
          </div>
        )}

        {/* ── Footer CTA ────────────────────────────────────────────────── */}
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
