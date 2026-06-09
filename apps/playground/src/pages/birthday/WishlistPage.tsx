import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Wishlist {
  id: string
  owner_id: string
  occasion: string
  occasion_date: string | null
  total_target: number
  total_pledged: number
  child_id: string
}

interface WishlistItem {
  id: string
  name: string
  retailer: string | null
  target_amount: number
  pledged_amount: number
  emoji: string | null
}

interface Pledge {
  id: string
  wishlist_item_id: string
  pledger_name: string | null
  amount: number
}

interface OwnerData {
  handle: string | null
  jisa_sort_code: string | null
  jisa_account_number: string | null
  jisa_reference: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function gbp(n: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

function daysUntil(dateStr: string | null): number {
  if (!dateStr) return 0
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function countdownLabel(days: number): string {
  if (days < 0) return 'Has passed'
  if (days === 0) return 'Today! 🎉'
  if (days === 1) return 'Tomorrow!'
  return `${days} days to go`
}

function formatSortCode(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.length < 6) return raw
  return `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4, 6)}`
}

function setMetaTag(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

// ── CopyButton ─────────────────────────────────────────────────────────────────

function CopyButton({ value, display }: { value: string; display?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="shrink-0 text-xs font-bold text-azure hover:opacity-75 transition-opacity px-2.5 py-1 rounded-lg"
      style={{ backgroundColor: 'rgba(64,123,191,0.12)' }}
    >
      {copied ? '✓' : (display ?? 'Copy')}
    </button>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function WishlistPage() {
  // Support both /wishlist/:wishlistId and the legacy /birthday/:id route
  const params = useParams<{ wishlistId?: string; id?: string }>()
  const resolvedId = params.wishlistId ?? params.id
  const [searchParams] = useSearchParams()
  const refHandle = searchParams.get('ref')

  const [wishlist, setWishlist] = useState<Wishlist | null>(null)
  const [items, setItems] = useState<WishlistItem[]>([])
  const [pledges, setPledges] = useState<Pledge[]>([])
  const [childName, setChildName] = useState<string | null>(null)
  const [ownerData, setOwnerData] = useState<OwnerData | null>(null)
  const [loading, setLoading] = useState(true)

  // Pledge flow
  const [claimingItemId, setClaimingItemId] = useState<string | null>(null)
  const [pledgerName, setPledgerName] = useState('')
  const [pledging, setPledging] = useState(false)
  const [claimedLocally, setClaimedLocally] = useState<Record<string, string>>({})

  // Pot contribution
  const [potAmount, setPotAmount] = useState<number | null>(null)
  const [showIsaDetails, setShowIsaDetails] = useState(false)

  // Persist ref code
  useEffect(() => {
    if (refHandle) localStorage.setItem('amplifi_ref_code', refHandle)
  }, [refHandle])

  // Fetch all data
  useEffect(() => {
    if (!resolvedId) return

    const fetchData = async () => {
      const { data: wl } = await supabase
        .from('wishlists')
        .select('id, owner_id, occasion, occasion_date, total_target, total_pledged, child_id')
        .eq('id', resolvedId)
        .single()

      if (!wl) { setLoading(false); return }
      setWishlist(wl)

      // Parallel: child name, owner profile, wishlist items
      const [{ data: child }, { data: profile }, { data: wlItems }] = await Promise.all([
        supabase.from('children').select('name').eq('id', wl.child_id).single(),
        supabase.from('profiles').select('handle').eq('id', wl.owner_id).single(),
        supabase.from('wishlist_items')
          .select('id, name, retailer, target_amount, pledged_amount, emoji')
          .eq('wishlist_id', resolvedId),
      ])

      const name = (child as { name: string } | null)?.name ?? null
      const handle = (profile as { handle: string | null } | null)?.handle ?? null
      if (name) setChildName(name)

      const itemsList = (wlItems ?? []) as WishlistItem[]
      setItems(itemsList)

      // JISA details for pot contribution section
      let jisaSortCode: string | null = null
      let jisaAccountNumber: string | null = null
      let jisaReference: string | null = null

      const { data: jisa } = await supabase
        .from('jisa_accounts')
        .select('sort_code, account_number, payment_reference')
        .eq('child_id', wl.child_id)
        .maybeSingle()

      if (jisa) {
        const j = jisa as { sort_code: string; account_number: string; payment_reference: string }
        jisaSortCode = j.sort_code
        jisaAccountNumber = j.account_number
        jisaReference = j.payment_reference
      }

      setOwnerData({ handle, jisa_sort_code: jisaSortCode, jisa_account_number: jisaAccountNumber, jisa_reference: jisaReference })

      // Fetch pledges
      if (itemsList.length > 0) {
        const { data: pledgeData } = await supabase
          .from('pledges')
          .select('id, wishlist_item_id, pledger_name, amount')
          .in('wishlist_item_id', itemsList.map(i => i.id))
        if (pledgeData) setPledges(pledgeData as Pledge[])
      }

      setLoading(false)
    }

    void fetchData()
  }, [resolvedId])

  // OG meta tags (best-effort for social previews)
  useEffect(() => {
    if (!wishlist || !childName) return
    const title = `${childName}'s ${wishlist.occasion} Wishlist`
    const days = daysUntil(wishlist.occasion_date)
    const description = days > 0
      ? `${countdownLabel(days)} — see what ${childName} would love for their ${wishlist.occasion}.`
      : `See what ${childName} would love for their ${wishlist.occasion}.`
    document.title = title
    setMetaTag('og:title', title)
    setMetaTag('og:description', description)
    setMetaTag('og:type', 'website')
  }, [wishlist, childName])

  // Claim an item
  const handleClaim = async (item: WishlistItem) => {
    if (!pledgerName.trim() || pledging) return
    setPledging(true)
    try {
      await supabase.from('pledges').insert({
        wishlist_item_id: item.id,
        pledger_name: pledgerName.trim(),
        amount: item.target_amount,
      })
    } catch {
      // silently absorb — UI already updates optimistically
    }
    setClaimedLocally(prev => ({ ...prev, [item.id]: pledgerName.trim() }))
    setClaimingItemId(null)
    setPledgerName('')
    setPledging(false)
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f8fafc' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#59C9E9', borderTopColor: 'transparent' }} />
          <p className="text-sm font-medium" style={{ color: 'rgba(16,22,40,0.5)' }}>Loading wishlist…</p>
        </div>
      </div>
    )
  }

  // ── Not found ──────────────────────────────────────────────────────────────

  if (!wishlist) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: '#f8fafc' }}>
        <div className="text-center">
          <p className="text-5xl mb-4">🎁</p>
          <h1 className="text-2xl font-extrabold mb-2" style={{ color: '#101628' }}>Wishlist not found</h1>
          <p className="text-sm" style={{ color: '#64748b' }}>This link may have expired or the wishlist was removed.</p>
        </div>
      </div>
    )
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const name = childName ?? 'They'
  const occasion = wishlist.occasion
  const days = daysUntil(wishlist.occasion_date)
  const handle = ownerData?.handle ?? null
  const hasJisa = !!(ownerData?.jisa_sort_code)
  const signupUrl = `https://letsamplifi.com/signup${handle ? `?ref=${handle}` : ''}`

  const getClaimedBy = (item: WishlistItem): string | null => {
    if (claimedLocally[item.id]) return claimedLocally[item.id]
    const pledge = pledges.find(p => p.wishlist_item_id === item.id)
    if (pledge) return pledge.pledger_name ?? 'Someone'
    return null
  }

  const isClaimed = (item: WishlistItem): boolean => {
    return getClaimedBy(item) !== null || item.pledged_amount >= item.target_amount
  }

  return (
    <div className="min-h-screen font-jakarta" style={{ backgroundColor: '#f8fafc' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div
        className="relative text-center px-6 pt-14 pb-12 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #101628 0%, #1b2e50 100%)' }}
      >
        {/* Decorative accent blobs */}
        <div
          className="absolute -top-12 -right-12 w-56 h-56 rounded-full opacity-10"
          style={{ backgroundColor: '#59C9E9' }}
        />
        <div
          className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full opacity-10"
          style={{ backgroundColor: '#407BBF' }}
        />

        <p
          className="text-xs font-bold uppercase tracking-[0.22em] mb-4"
          style={{ color: '#59C9E9' }}
        >
          {occasion.toUpperCase()} WISHLIST
        </p>

        <h1 className="text-white text-4xl font-extrabold leading-tight tracking-tight mb-5">
          {name}'s<br />{occasion} Wishlist
        </h1>

        {wishlist.occasion_date && (
          <div
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 border"
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderColor: 'rgba(255,255,255,0.18)',
            }}
          >
            <span className="text-base">🎂</span>
            <span className="text-white font-bold text-sm">{countdownLabel(days)}</span>
          </div>
        )}
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 py-7 space-y-6">

        {/* ── Wishes list ─────────────────────────────────────────────────── */}
        {items.length > 0 && (
          <section>
            <h2 className="font-extrabold text-lg mb-4" style={{ color: '#101628' }}>
              What {name} would love 🎁
            </h2>
            <div className="space-y-3">
              {items.map((item) => {
                const claimedBy = getClaimedBy(item)
                const claimed = isClaimed(item)
                const isClaiming = claimingItemId === item.id

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl overflow-hidden"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9' }}
                  >
                    <div className="p-4">
                      {/* Item header */}
                      <div className="flex items-start gap-3">
                        <span className="text-3xl leading-none mt-0.5 shrink-0">
                          {item.emoji || '🎁'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-base leading-snug" style={{ color: '#101628' }}>
                            {item.name}
                          </p>
                          {item.retailer && (
                            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{item.retailer}</p>
                          )}
                        </div>
                        <p className="font-extrabold text-lg shrink-0 ml-2" style={{ color: '#101628' }}>
                          {gbp(item.target_amount)}
                        </p>
                      </div>

                      {/* Claim state */}
                      <div className="mt-3">
                        {claimed ? (
                          <div
                            className="flex items-center gap-2.5 rounded-xl px-4 py-2.5"
                            style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}
                          >
                            <span className="font-bold text-base" style={{ color: '#16a34a' }}>✓</span>
                            <span className="text-sm font-semibold" style={{ color: '#15803d' }}>
                              {claimedBy ? `Claimed by ${claimedBy}` : 'Claimed ✓'}
                            </span>
                          </div>
                        ) : isClaiming ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Your name"
                              value={pledgerName}
                              onChange={e => setPledgerName(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') void handleClaim(item) }}
                              autoFocus
                              className="w-full border rounded-xl px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none transition-colors"
                              style={{
                                borderColor: '#e2e8f0',
                                color: '#101628',
                              }}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => void handleClaim(item)}
                                disabled={!pledgerName.trim() || pledging}
                                className="flex-1 font-bold py-2.5 rounded-xl text-sm transition-opacity"
                                style={{
                                  backgroundColor: '#101628',
                                  color: '#ffffff',
                                  opacity: (!pledgerName.trim() || pledging) ? 0.4 : 1,
                                }}
                              >
                                {pledging ? '…' : "I'll get this ✓"}
                              </button>
                              <button
                                onClick={() => { setClaimingItemId(null); setPledgerName('') }}
                                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                                style={{ border: '1px solid #e2e8f0', color: '#64748b', backgroundColor: '#ffffff' }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setClaimingItemId(item.id)}
                            className="w-full font-bold py-2.5 rounded-xl text-sm transition-colors"
                            style={{
                              border: '2px solid #101628',
                              color: '#101628',
                              backgroundColor: 'transparent',
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#101628'
                              ;(e.currentTarget as HTMLButtonElement).style.color = '#ffffff'
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                              ;(e.currentTarget as HTMLButtonElement).style.color = '#101628'
                            }}
                          >
                            I'll get this 🎁
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Contribute to the pot ────────────────────────────────────────── */}
        <section
          className="rounded-2xl p-5"
          style={{ backgroundColor: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9' }}
        >
          <h2 className="font-extrabold text-base mb-1" style={{ color: '#101628' }}>
            Rather give to {name}'s savings? 💙
          </h2>
          <p className="text-sm leading-relaxed mb-5" style={{ color: '#64748b' }}>
            Any cash goes straight into {name}'s Junior ISA — building their future for when it matters most.
          </p>

          {/* Amount pills */}
          <div className="flex gap-2 flex-wrap mb-5">
            {[10, 25, 50].map(amt => (
              <button
                key={amt}
                onClick={() => setPotAmount(potAmount === amt ? null : amt)}
                className="px-5 py-2 rounded-full font-bold text-sm transition-colors"
                style={{
                  backgroundColor: potAmount === amt ? '#101628' : '#ffffff',
                  color: potAmount === amt ? '#ffffff' : '#101628',
                  border: potAmount === amt ? '1px solid #101628' : '1px solid #e2e8f0',
                }}
              >
                £{amt}
              </button>
            ))}
            <button
              onClick={() => setPotAmount(null)}
              className="px-5 py-2 rounded-full font-bold text-sm transition-colors"
              style={{ border: '1px solid #e2e8f0', color: '#64748b', backgroundColor: '#ffffff' }}
            >
              Other
            </button>
          </div>

          {/* ISA bank details */}
          {hasJisa ? (
            <>
              {!showIsaDetails ? (
                <button
                  onClick={() => setShowIsaDetails(true)}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#407BBF' }}
                >
                  Show ISA details →
                </button>
              ) : (
                <div className="rounded-xl p-4 space-y-2.5" style={{ backgroundColor: '#f8fafc' }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#94a3b8' }}>
                    Junior ISA — bank details
                  </p>
                  {([
                    { label: 'Sort code', value: formatSortCode(ownerData!.jisa_sort_code!), raw: ownerData!.jisa_sort_code! },
                    { label: 'Account number', value: ownerData!.jisa_account_number!, raw: ownerData!.jisa_account_number! },
                    { label: 'Reference', value: ownerData!.jisa_reference!, raw: ownerData!.jisa_reference! },
                  ]).map(f => (
                    <div key={f.label} className="flex items-center gap-2">
                      <span className="text-xs w-28 shrink-0" style={{ color: '#94a3b8' }}>{f.label}</span>
                      <span className="text-sm font-bold flex-1" style={{ color: '#101628' }}>{f.value}</span>
                      <CopyButton value={f.raw} />
                    </div>
                  ))}
                  <p className="text-xs pt-1" style={{ color: '#94a3b8' }}>
                    Set up a standing order in your banking app using the details above.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div
              className="rounded-xl p-4 text-sm text-center"
              style={{ backgroundColor: '#f8fafc', color: '#94a3b8' }}
            >
              ISA details not yet added — check back soon or ask {name}'s parent for their bank details.
            </div>
          )}
        </section>

        {/* ── Join Amplifi ──────────────────────────────────────────────────── */}
        <section
          className="rounded-2xl p-6 text-center"
          style={{ background: 'linear-gradient(135deg, #101628 0%, #1b3260 100%)' }}
        >
          <p className="text-3xl mb-3">✨</p>
          <h2 className="font-extrabold text-base mb-2" style={{ color: '#ffffff' }}>
            Want to be part of {name}'s journey?
          </h2>
          <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Join Amplifi and earn cashback on everything you buy — automatically
            invested into your child's Junior ISA.
          </p>
          <a
            href={signupUrl}
            className="block w-full py-3.5 rounded-xl font-extrabold text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#59C9E9', color: '#101628' }}
          >
            Join Amplifi — it's free →
          </a>
          {handle && (
            <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Already have Amplifi? Search for @{handle}
            </p>
          )}
        </section>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="text-center pb-8">
          <a
            href="https://letsamplifi.com"
            className="text-sm transition-colors hover:opacity-80"
            style={{ color: '#94a3b8' }}
          >
            Learn more about Amplifi →
          </a>
        </div>

      </div>
    </div>
  )
}
