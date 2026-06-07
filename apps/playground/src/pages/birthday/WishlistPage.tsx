import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Wishlist {
  id: string
  owner_id: string
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

interface OwnerPayment {
  pay_monzo: string | null
  pay_paypal: string | null
  pay_revolut: string | null
  pay_bank: string | null
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

export default function WishlistPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref')

  const [wishlist, setWishlist] = useState<Wishlist | null>(null)
  const [items, setItems] = useState<WishlistItem[]>([])
  const [childName, setChildName] = useState<string | null>(null)
  const [ownerPayment, setOwnerPayment] = useState<OwnerPayment | null>(null)
  const [loading, setLoading] = useState(true)
  const [contributeOpen, setContributeOpen] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)

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
        .select('id, owner_id, occasion, occasion_date, total_target, total_pledged, payment_method, child_id')
        .eq('id', id)
        .single()

      if (!wl) {
        setLoading(false)
        return
      }

      setWishlist(wl)

      // Fetch child name — silently skipped if RLS blocks it
      const { data: child } = await supabase
        .from('children')
        .select('name')
        .eq('id', wl.child_id)
        .single()

      if (child?.name) setChildName(child.name)

      // Fetch owner payment methods — silently skipped if RLS blocks it
      if (wl.owner_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('pay_monzo, pay_paypal, pay_revolut, pay_bank')
          .eq('id', wl.owner_id)
          .single()

        if (profile) setOwnerPayment(profile)
      }

      const { data: wlItems } = await supabase
        .from('wishlist_items')
        .select('id, name, retailer, target_amount, pledged_amount, emoji')
        .eq('wishlist_id', id)

      if (wlItems) setItems(wlItems)
      setLoading(false)
    }

    fetchData()
  }, [id])

  const handleCopyCode = async () => {
    if (!refCode) return
    await navigator.clipboard.writeText(refCode)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  const hasMonzo   = !!ownerPayment?.pay_monzo
  const hasPaypal  = !!ownerPayment?.pay_paypal
  const hasRevolut = !!ownerPayment?.pay_revolut
  const hasBank    = !!ownerPayment?.pay_bank
  const hasAnyPayment = hasMonzo || hasPaypal || hasRevolut || hasBank

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

  const name = childName ?? 'They'
  const occasion = wishlist.occasion

  const bannerLabel = occasion.toLowerCase() === 'birthday'
    ? 'BIRTHDAY WISHLIST'
    : occasion.toLowerCase() === 'christmas'
      ? 'CHRISTMAS WISHLIST'
      : `${occasion.toUpperCase()} WISHLIST`

  return (
    <div className="min-h-screen bg-offwhite font-jakarta">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-midnight px-4 pt-10 pb-8 text-center">
        <p className="text-sky text-xs font-bold uppercase tracking-widest mb-3">
          {bannerLabel}
        </p>
        <h1 className="text-white text-3xl font-extrabold leading-tight">
          You're invited to {name}'s {occasion}
        </h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* ── Intro copy ────────────────────────────────────────────────── */}
        <div className="space-y-3 pt-1">
          <p className="text-midnight text-sm leading-relaxed">
            {name}'s having a {occasion} and it'd be great to see you there.
            If you'd like to bring something, here's {name}'s wishlist — but
            there's absolutely no obligation. Coming along is more than enough.
          </p>
        </div>

        {/* ── Items ─────────────────────────────────────────────────────── */}
        {items.length > 0 && (
          <>
            <h2 className="text-midnight font-bold text-base pt-1">What {name} is hoping for</h2>
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
                </div>
              )
            })}
          </>
        )}

        {/* ── JISA note ─────────────────────────────────────────────────── */}
        <p className="text-slate-500 text-sm leading-relaxed">
          {name} is set up on Amplifi so that anything extra automatically goes
          into {name}'s Junior ISA — a savings account that stays invested for{' '}
          {name}'s future.
        </p>

        {/* ── Contribute now accordion ──────────────────────────────────── */}
        <div>
          <button
            onClick={() => setContributeOpen((v) => !v)}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-opacity hover:opacity-90 active:opacity-75"
            style={{ backgroundColor: '#407BBF' }}
          >
            Contribute now
          </button>

          {contributeOpen && (
            <div className="mt-2 bg-white rounded-2xl border border-slate-100 overflow-hidden">
              {!hasAnyPayment ? (
                <p className="text-slate-500 text-sm px-4 py-4">
                  The family hasn't added payment details yet.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {hasBank && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                          🏦 Bank transfer
                        </p>
                        <p className="text-sm font-semibold text-midnight break-all">
                          {ownerPayment!.pay_bank}
                        </p>
                      </div>
                      <CopyButton value={ownerPayment!.pay_bank!} />
                    </div>
                  )}
                  {hasMonzo && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                          💸 Monzo
                        </p>
                        <p className="text-sm font-semibold text-midnight">
                          {ownerPayment!.pay_monzo}
                        </p>
                      </div>
                      <CopyButton value={ownerPayment!.pay_monzo!} />
                    </div>
                  )}
                  {hasPaypal && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                          🅿️ PayPal
                        </p>
                        <p className="text-sm font-semibold text-midnight">
                          {ownerPayment!.pay_paypal}
                        </p>
                      </div>
                      <CopyButton value={ownerPayment!.pay_paypal!} />
                    </div>
                  )}
                  {hasRevolut && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                          💜 Revolut
                        </p>
                        <p className="text-sm font-semibold text-midnight">
                          {ownerPayment!.pay_revolut}
                        </p>
                      </div>
                      <CopyButton value={ownerPayment!.pay_revolut!} />
                    </div>
                  )}
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
              Here's £5 for your child's future
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
