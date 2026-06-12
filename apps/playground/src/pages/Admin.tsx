import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Merchant {
  id: string
  name: string
  category: string
  status: string
}

interface CashbackEvent {
  id: string
  merchant_name: string
  amount_gbp: number
  cashback_gbp: number | null
  status: string
  transacted_at: string
  user_id: string
}

interface Profile {
  id: string
  full_name: string
  email: string | null
}

type OfferStatus = 'Live' | 'Scheduled' | 'Off' | 'Expired'

interface CashbackOffer {
  id: string
  merchant_id: string | null
  reward_type: 'percentage' | 'fixed'
  reward_value: number
  active_from: string
  active_to: string
  is_active: boolean
  merchants: { name: string } | null
}

type Tab = 'merchants' | 'offers' | 'simulate' | 'settle'

// ── Colours ────────────────────────────────────────────────────────────────────

const C = {
  midnight: '#101628',
  azure: '#407BBF',
  sky: '#59C9E9',
  offwhite: '#F4F6F9',
  red: '#ef4444',
  green: '#16a34a',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function gbp(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function rewardLabel(type: 'percentage' | 'fixed', value: number) {
  return type === 'percentage' ? `${value}%` : `£${value}`
}

function offerStatus(o: CashbackOffer): OfferStatus {
  if (!o.is_active) return 'Off'
  const now = new Date()
  if (new Date(o.active_to) < now) return 'Expired'
  if (new Date(o.active_from) > now) return 'Scheduled'
  return 'Live'
}

const STATUS_ORDER: Record<OfferStatus, number> = { Live: 0, Scheduled: 1, Off: 2, Expired: 3 }

const STATUS_COLOURS: Record<OfferStatus, string> = {
  Live: '#16a34a',
  Scheduled: '#d97706',
  Off: '#64748b',
  Expired: '#94a3b8',
}

function StatusPill({ status }: { status: string }) {
  const colour =
    status === 'settled'   ? C.green :
    status === 'reversed'  ? C.red :
    status === 'active'    ? C.green : '#64748b'
  return (
    <span style={{ fontSize: 12, fontWeight: 700, color: colour,
      background: colour + '18', borderRadius: 6, padding: '2px 8px' }}>
      {status}
    </span>
  )
}

// ── Admin page ─────────────────────────────────────────────────────────────────

export default function Admin() {
  // ── Auth state ─────────────────────────────────────────────────────────────
  const [authChecked, setAuthChecked] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session)
      setAuthChecked(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError('')
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
    setLoginLoading(false)
    if (error) setLoginError(error.message)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  // ── Admin panel state (always declared — hooks must not be conditional) ────
  const [tab, setTab] = useState<Tab>('merchants')
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [events, setEvents] = useState<CashbackEvent[]>([])
  const [offers, setOffers] = useState<CashbackOffer[]>([])
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // ── Merchant form state
  const [mName, setMName]       = useState('')
  const [mCat, setMCat]         = useState('')
  const [mLogo, setMLogo]       = useState('')
  const [mEmail, setMEmail]     = useState('')

  // ── Offer form state
  const [oMerchant, setOMerchant]     = useState('')
  const [oType, setOType]             = useState<'percentage' | 'fixed'>('percentage')
  const [oValue, setOValue]           = useState('')
  const [oFrom, setOFrom]             = useState('')
  const [oTo, setOTo]                 = useState('')
  const [oActive, setOActive]         = useState(true)

  // ── Simulate txn state
  const [tUser, setTUser]             = useState('')
  const [tMerchant, setTMerchant]     = useState('')
  const [tAmount, setTAmount]         = useState('')

  const notify = (text: string, ok = true) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 4000)
  }

  const loadMerchants = async () => {
    const { data } = await supabase.from('merchants').select('id, name, category, status').order('created_at', { ascending: false })
    setMerchants(data ?? [])
  }

  const loadProfiles = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, email').order('full_name')
    setProfiles(data ?? [])
  }

  const loadEvents = async () => {
    const { data } = await supabase
      .from('cashback_events')
      .select('id, merchant_name, amount_gbp, cashback_gbp, status, transacted_at, user_id')
      .eq('provider', 'test')
      .order('created_at', { ascending: false })
      .limit(30)
    setEvents(data ?? [])
  }

  const loadOffers = async () => {
    const { data } = await supabase
      .from('cashback_offers')
      .select('id, merchant_id, reward_type, reward_value, active_from, active_to, is_active, merchants(name)')
      .order('created_at', { ascending: false })
    setOffers((data ?? []) as CashbackOffer[])
  }

  useEffect(() => {
    if (!authed) return
    loadMerchants()
    loadProfiles()
    loadEvents()
    loadOffers()
  }, [authed])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCreateMerchant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mName.trim() || !mCat.trim()) return notify('Name and category are required.', false)
    const { error } = await supabase.from('merchants').insert({
      name: mName.trim(), category: mCat.trim(),
      logo_url: mLogo.trim() || null, contact_email: mEmail.trim() || null,
    })
    if (error) return notify(error.message, false)
    notify(`Merchant "${mName.trim()}" created.`)
    setMName(''); setMCat(''); setMLogo(''); setMEmail('')
    loadMerchants()
  }

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseFloat(oValue)
    if (!oMerchant) return notify('Select a merchant.', false)
    if (isNaN(val) || val <= 0) return notify('Reward value must be > 0.', false)
    if (!oFrom || !oTo) return notify('Set active_from and active_to.', false)
    const { error } = await supabase.from('cashback_offers').insert({
      merchant_id: oMerchant,
      reward_type: oType,
      reward_value: val,
      active_from: new Date(oFrom).toISOString(),
      active_to: new Date(oTo).toISOString(),
      is_active: oActive,
    })
    if (error) return notify(error.message, false)
    notify('Offer created.')
    setOValue(''); setOFrom(''); setOTo('')
    loadOffers()
  }

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(tAmount)
    if (!tUser) return notify('Select a user.', false)
    if (!tMerchant) return notify('Select a merchant.', false)
    if (isNaN(amt) || amt <= 0) return notify('Amount must be > 0.', false)

    const merchant = merchants.find((m) => m.id === tMerchant)
    const { data, error } = await supabase.from('cashback_events').insert({
      user_id: tUser,
      merchant_id: tMerchant,
      merchant_name: merchant?.name ?? 'Unknown',
      amount_gbp: amt,
      provider: 'test',
      status: 'pending',
    }).select('cashback_gbp, offer_id').single()

    if (error) return notify(error.message, false)

    const matched = data?.cashback_gbp != null
    notify(matched
      ? `Transaction inserted. Cashback: ${gbp(data.cashback_gbp as number)} (offer matched).`
      : 'Transaction inserted. No matching offer — no credit created.')
    setTAmount('')
    loadEvents()
  }

  const handleSettle = async (eventId: string) => {
    const { error } = await supabase
      .from('cashback_events')
      .update({ status: 'settled' })
      .eq('id', eventId)
    if (error) return notify(error.message, false)
    notify('Event settled — credit moved to redeemable.')
    loadEvents()
  }

  const handleReverse = async (eventId: string) => {
    const { error } = await supabase
      .from('cashback_events')
      .update({ status: 'reversed' })
      .eq('id', eventId)
    if (error) return notify(error.message, false)
    notify('Event reversed — credit voided.', false)
    loadEvents()
  }

  const handleToggleOffer = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from('cashback_offers')
      .update({ is_active: !current })
      .eq('id', id)
    if (error) return notify(error.message, false)
    notify(`Offer ${!current ? 'activated' : 'deactivated'}.`)
    loadOffers()
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string }[] = [
    { key: 'merchants', label: 'Merchants' },
    { key: 'offers',    label: 'Offers' },
    { key: 'simulate',  label: 'Simulate txn' },
    { key: 'settle',    label: 'Settle / reverse' },
  ]

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', background: C.offwhite, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#64748b', fontSize: 14 }}>Checking access…</span>
      </div>
    )
  }

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: C.offwhite, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#ffffff', borderRadius: 16, padding: 32, width: 340, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ fontWeight: 800, fontSize: 20, color: C.midnight, marginBottom: 4 }}>amplifi admin</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>Sign in to continue</div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Email</label>
              <input
                style={{ ...inputStyle, display: 'block', width: '100%', boxSizing: 'border-box' }}
                type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                placeholder="you@example.com" required autoFocus
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Password</label>
              <input
                style={{ ...inputStyle, display: 'block', width: '100%', boxSizing: 'border-box' }}
                type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                placeholder="••••••••" required
              />
            </div>
            {loginError && (
              <div style={{ fontSize: 13, color: C.red, marginBottom: 14, fontWeight: 600 }}>{loginError}</div>
            )}
            <button type="submit" disabled={loginLoading} style={{
              width: '100%', background: C.azure, color: '#fff', border: 'none',
              borderRadius: 10, padding: '12px 0', fontWeight: 700, fontSize: 15, cursor: 'pointer',
              opacity: loginLoading ? 0.6 : 1,
            }}>
              {loginLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.offwhite, fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: C.midnight, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ color: '#ffffff', fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>amplifi</span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>operator admin</span>
        <button onClick={handleSignOut} style={{
          marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)',
          border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          Sign out
        </button>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>

        {/* Notification banner */}
        {msg && (
          <div style={{
            background: msg.ok ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${msg.ok ? '#86efac' : '#fca5a5'}`,
            color: msg.ok ? C.green : C.red,
            borderRadius: 10, padding: '10px 16px', marginBottom: 16,
            fontSize: 14, fontWeight: 600,
          }}>
            {msg.text}
          </div>
        )}

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 14,
              background: tab === t.key ? C.azure : '#ffffff',
              color: tab === t.key ? '#ffffff' : C.midnight,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Merchants tab ──────────────────────────────────────── */}
        {tab === 'merchants' && (
          <div>
            <Card title="Create merchant">
              <form onSubmit={handleCreateMerchant} style={formStyle}>
                <Row label="Name *">
                  <input style={inputStyle} value={mName} onChange={(e) => setMName(e.target.value)} placeholder="e.g. Waitrose" required />
                </Row>
                <Row label="Category *">
                  <input style={inputStyle} value={mCat} onChange={(e) => setMCat(e.target.value)} placeholder="e.g. Groceries" required />
                </Row>
                <Row label="Logo URL">
                  <input style={inputStyle} value={mLogo} onChange={(e) => setMLogo(e.target.value)} placeholder="https://..." />
                </Row>
                <Row label="Contact email">
                  <input style={inputStyle} value={mEmail} onChange={(e) => setMEmail(e.target.value)} placeholder="merchant@example.com" />
                </Row>
                <SubmitBtn>Create merchant</SubmitBtn>
              </form>
            </Card>

            <Card title={`Merchants (${merchants.length})`}>
              {merchants.length === 0
                ? <p style={emptyStyle}>No merchants yet.</p>
                : <table style={tableStyle}>
                    <thead><tr>
                      <Th>Name</Th><Th>Category</Th><Th>Status</Th><Th>ID</Th>
                    </tr></thead>
                    <tbody>
                      {merchants.map((m) => (
                        <tr key={m.id}>
                          <Td>{m.name}</Td>
                          <Td>{m.category}</Td>
                          <Td><StatusPill status={m.status} /></Td>
                          <Td style={{ color: '#94a3b8', fontSize: 11 }}>{m.id}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              }
            </Card>
          </div>
        )}

        {/* ── Offers tab ─────────────────────────────────────────── */}
        {tab === 'offers' && (
          <div>
            <Card title="Create cashback offer">
              <form onSubmit={handleCreateOffer} style={formStyle}>
                <Row label="Merchant *">
                  <select style={inputStyle} value={oMerchant} onChange={(e) => setOMerchant(e.target.value)} required>
                    <option value="">Select merchant…</option>
                    {merchants.filter((m) => m.status === 'active').map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </Row>
                <Row label="Reward type">
                  <select style={inputStyle} value={oType} onChange={(e) => setOType(e.target.value as 'percentage' | 'fixed')}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (£)</option>
                  </select>
                </Row>
                <Row label={oType === 'percentage' ? 'Cashback % *' : 'Fixed reward £ *'}>
                  <input style={inputStyle} type="number" step="0.01" min="0.01"
                    value={oValue} onChange={(e) => setOValue(e.target.value)}
                    placeholder={oType === 'percentage' ? 'e.g. 2.5' : 'e.g. 5.00'} required />
                </Row>
                <Row label="Active from *">
                  <input style={inputStyle} type="datetime-local" value={oFrom} onChange={(e) => setOFrom(e.target.value)} required />
                </Row>
                <Row label="Active to *">
                  <input style={inputStyle} type="datetime-local" value={oTo} onChange={(e) => setOTo(e.target.value)} required />
                </Row>
                <Row label="Live now">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={oActive} onChange={(e) => setOActive(e.target.checked)} />
                    <span style={{ fontSize: 14, color: C.midnight }}>is_active</span>
                  </label>
                </Row>
                <SubmitBtn>Create offer</SubmitBtn>
              </form>
            </Card>

            <Card title={`Offers (${offers.length})`}>
              {offers.length === 0 ? (
                <p style={emptyStyle}>No offers yet.</p>
              ) : (
                <table style={tableStyle}>
                  <thead><tr>
                    <Th>Merchant</Th><Th>Reward</Th><Th>From</Th><Th>To</Th><Th>Status</Th><Th></Th>
                  </tr></thead>
                  <tbody>
                    {[...offers]
                      .sort((a, b) => STATUS_ORDER[offerStatus(a)] - STATUS_ORDER[offerStatus(b)])
                      .map((o) => {
                        const s = offerStatus(o)
                        return (
                          <tr key={o.id}>
                            <Td>{o.merchants?.name ?? '—'}</Td>
                            <Td style={{ fontWeight: 700 }}>{rewardLabel(o.reward_type, o.reward_value)}</Td>
                            <Td>{fmtDate(o.active_from)}</Td>
                            <Td>{fmtDate(o.active_to)}</Td>
                            <Td>
                              <span style={{
                                fontSize: 12, fontWeight: 700,
                                color: STATUS_COLOURS[s],
                                background: STATUS_COLOURS[s] + '18',
                                borderRadius: 6, padding: '2px 8px',
                              }}>{s}</span>
                            </Td>
                            <Td>
                              <ActionBtn
                                color={o.is_active ? C.red : C.green}
                                onClick={() => handleToggleOffer(o.id, o.is_active)}
                              >
                                {o.is_active ? 'Deactivate' : 'Activate'}
                              </ActionBtn>
                            </Td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        )}

        {/* ── Simulate transaction tab ───────────────────────────── */}
        {tab === 'simulate' && (
          <Card title="Simulate a transaction (provider = 'test')">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Inserts a <code>cashback_events</code> row. The DB trigger matches the merchant
              against active offers and creates a <code>cashback_credits</code> row if matched.
            </p>
            <form onSubmit={handleSimulate} style={formStyle}>
              <Row label="User *">
                <select style={inputStyle} value={tUser} onChange={(e) => setTUser(e.target.value)} required>
                  <option value="">Select user…</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name} ({p.email ?? p.id.slice(0, 8)})</option>
                  ))}
                </select>
              </Row>
              <Row label="Merchant *">
                <select style={inputStyle} value={tMerchant} onChange={(e) => setTMerchant(e.target.value)} required>
                  <option value="">Select merchant…</option>
                  {merchants.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </Row>
              <Row label="Amount (£) *">
                <input style={inputStyle} type="number" step="0.01" min="0.01"
                  value={tAmount} onChange={(e) => setTAmount(e.target.value)}
                  placeholder="e.g. 45.00" required />
              </Row>
              <SubmitBtn>Inject transaction</SubmitBtn>
            </form>
          </Card>
        )}

        {/* ── Settle / reverse tab ───────────────────────────────── */}
        {tab === 'settle' && (
          <Card title={`Recent test events (${events.length})`}>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Settling flips the event to <code>settled</code> and moves the cashback credit
              to <code>redeemable</code> via DB trigger.
            </p>
            {events.length === 0
              ? <p style={emptyStyle}>No test events yet — simulate a transaction first.</p>
              : <table style={tableStyle}>
                  <thead><tr>
                    <Th>Merchant</Th><Th>Amount</Th><Th>Cashback</Th>
                    <Th>Status</Th><Th>Actions</Th>
                  </tr></thead>
                  <tbody>
                    {events.map((ev) => (
                      <tr key={ev.id}>
                        <Td>{ev.merchant_name}</Td>
                        <Td>{gbp(ev.amount_gbp)}</Td>
                        <Td>{ev.cashback_gbp != null ? gbp(ev.cashback_gbp) : <span style={{ color: '#94a3b8' }}>—</span>}</Td>
                        <Td><StatusPill status={ev.status} /></Td>
                        <Td>
                          {ev.status === 'pending' && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <ActionBtn color={C.azure} onClick={() => handleSettle(ev.id)}>Settle</ActionBtn>
                              <ActionBtn color={C.red}   onClick={() => handleReverse(ev.id)}>Reverse</ActionBtn>
                            </div>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </Card>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#ffffff', borderRadius: 14, padding: 20, marginBottom: 20,
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#101628' }}>{title}</h2>
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function SubmitBtn({ children }: { children: React.ReactNode }) {
  return (
    <button type="submit" style={{
      marginTop: 8, background: '#407BBF', color: '#fff',
      border: 'none', borderRadius: 10, padding: '10px 22px',
      fontWeight: 700, fontSize: 14, cursor: 'pointer',
    }}>
      {children}
    </button>
  )
}

function ActionBtn({ color, onClick, children }: { color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      background: color, color: '#fff', border: 'none',
      borderRadius: 6, padding: '4px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer',
    }}>
      {children}
    </button>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 12, fontWeight: 700,
    color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>{children}</th>
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: '8px 10px', fontSize: 13, color: '#101628',
    borderBottom: '1px solid #f8fafc', verticalAlign: 'middle', ...style }}>{children}</td>
}

// ── Inline styles ──────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid #e2e8f0', borderRadius: 8,
  padding: '8px 12px', fontSize: 14, color: '#101628',
  background: '#f8fafc', outline: 'none',
}

const formStyle: React.CSSProperties = { maxWidth: 480 }
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' }
const emptyStyle: React.CSSProperties = { color: '#94a3b8', fontSize: 14, margin: 0 }
