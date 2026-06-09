import { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { colors } from '@/constants/brand'
import { useFamilyContributions } from '@/lib/useFamilyContributions'
import { fv } from '@/lib/projections'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSortCode(s: string) {
  const d = s.replace(/\D/g, '')
  return `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4, 6)}`
}

function monthsUntil(dob: string, age: number): number {
  if (!dob) return 0
  const birth = new Date(dob)
  const target = new Date(birth.getFullYear() + age, birth.getMonth(), birth.getDate())
  return Math.max(0, Math.floor((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44)))
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return '£' + (n / 1_000_000).toFixed(1) + 'm'
  if (n >= 1_000) return '£' + Math.round(n / 1_000) + 'k'
  return '£' + Math.round(n).toLocaleString()
}

const FREQ_LABELS: Record<'weekly' | 'monthly' | 'one_off', string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  one_off: 'One-off',
}

// ── Types ─────────────────────────────────────────────────────────────────────

type PageData = {
  relationship: string | null
  child_id: string
  child_name: string
  child_dob: string
  parent_name: string
  parent_handle: string | null
  sort_code: string | null
  account_number: string | null
  payment_reference: string | null
  provider_name: string | null
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ConnectedChildScreen() {
  const { connectionId } = useLocalSearchParams<{ connectionId: string }>()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PageData | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [logAmount, setLogAmount] = useState<number | null>(null)
  const [logFreq, setLogFreq] = useState<'weekly' | 'monthly' | 'one_off' | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { contributions, loading: contribLoading, logContribution } = useFamilyContributions(
    connectionId ?? null
  )

  useEffect(() => {
    const load = async () => {
      if (!connectionId) return
      setLoading(true)

      const db = supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }
      const { data: raw, error: connErr } = await db
        .from('family_connections')
        .select('relationship, child_id, parent_id')
        .eq('id', connectionId)
        .eq('status', 'approved')
        .single()

      const conn = raw as { relationship: string | null; child_id: string; parent_id: string } | null

      if (connErr || !conn) {
        Alert.alert('Not found', 'This connection could not be found.')
        router.back()
        return
      }

      const [{ data: child }, { data: parentProfile }, { data: jisa }] = await Promise.all([
        supabase.from('children').select('name, date_of_birth').eq('id', conn.child_id).single(),
        supabase.from('profiles').select('full_name, handle').eq('id', conn.parent_id).single(),
        supabase.from('jisa_accounts')
          .select('sort_code, account_number, payment_reference, provider_name')
          .eq('child_id', conn.child_id)
          .maybeSingle(),
      ])

      type Child = { name: string; date_of_birth: string } | null
      type Parent = { full_name: string; handle: string | null } | null
      type Jisa = { sort_code: string; account_number: string; payment_reference: string; provider_name: string | null } | null

      setData({
        relationship: conn.relationship,
        child_id: conn.child_id,
        child_name: (child as Child)?.name ?? 'Unknown child',
        child_dob: (child as Child)?.date_of_birth ?? '',
        parent_name: (parentProfile as Parent)?.full_name ?? 'Unknown',
        parent_handle: (parentProfile as Parent)?.handle ?? null,
        sort_code: (jisa as Jisa)?.sort_code ?? null,
        account_number: (jisa as Jisa)?.account_number ?? null,
        payment_reference: (jisa as Jisa)?.payment_reference ?? null,
        provider_name: (jisa as Jisa)?.provider_name ?? null,
      })
      setLoading(false)
    }

    void load()
  }, [connectionId])

  const copy = async (value: string, field: string) => {
    await Clipboard.setStringAsync(value)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleLog = async () => {
    if (!logAmount || !logFreq || !data || submitting) return
    setSubmitting(true)
    const { error } = await logContribution({ childId: data.child_id, amountGbp: logAmount, frequency: logFreq })
    setSubmitting(false)
    if (error) {
      Alert.alert('Something went wrong', 'Please try again.')
    } else {
      setShowForm(false)
      setLogAmount(null)
      setLogFreq(null)
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.sky} />
      </View>
    )
  }

  if (!data) return null

  const hasJisa = !!data.sort_code
  const activeContrib = contributions.find(c => c.status === 'active') ?? null
  const m18 = monthsUntil(data.child_dob, 18)
  const m25 = monthsUntil(data.child_dob, 25)
  const projPmt = activeContrib?.amount_gbp ?? 25
  const proj18 = fv(projPmt, m18)
  const proj25 = fv(projPmt, m25)

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/home')}
            activeOpacity={0.7}
            style={styles.backBtn}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{data.child_name}</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>{data.child_name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.heroName}>{data.child_name}</Text>
          <Text style={styles.heroParent}>
            Saving with {data.parent_handle ? `@${data.parent_handle}` : data.parent_name}
          </Text>
          {data.relationship && (
            <View style={styles.relBadge}>
              <Text style={styles.relBadgeText}>{data.relationship}</Text>
            </View>
          )}
          <View style={styles.potTotalRow}>
            <Text style={styles.potTotalLabel}>Pot total</Text>
            <Text style={styles.potTotalValue}>£0.00</Text>
          </View>
        </View>

        {/* Projection */}
        {m18 > 0 && (
          <View style={styles.projCard}>
            <Text style={styles.projTitle}>
              {activeContrib
                ? `At £${activeContrib.amount_gbp} ${FREQ_LABELS[activeContrib.frequency].toLowerCase()}, ${data.child_name} could have`
                : `At £25/month, ${data.child_name} could have`}
            </Text>
            <View style={styles.projRow}>
              <View style={styles.projItem}>
                <Text style={styles.projAge}>Age 18</Text>
                <Text style={styles.projValue}>{formatMoney(proj18)}</Text>
                <Text style={styles.projNote}>ISA matures</Text>
              </View>
              <View style={styles.projDivider} />
              <View style={styles.projItem}>
                <Text style={styles.projAge}>Age 25</Text>
                <Text style={[styles.projValue, { color: colors.azure }]}>{formatMoney(proj25)}</Text>
                <Text style={styles.projNote}>First home?</Text>
              </View>
            </View>
            <Text style={styles.projDisclaimer}>Illustrative at 8% p.a. — not a guarantee</Text>
          </View>
        )}

        {/* ISA details */}
        <Text style={styles.sectionTitle}>ISA details</Text>
        <View style={styles.card}>
          {hasJisa ? (
            <>
              {data.provider_name && (
                <Text style={styles.provider}>{data.provider_name}</Text>
              )}
              <Text style={styles.cardHint}>
                Set up a standing order directly into {data.child_name}'s Junior ISA.
              </Text>
              {([
                { key: 'sort_code', label: 'Sort code', display: formatSortCode(data.sort_code!), raw: data.sort_code! },
                { key: 'account', label: 'Account number', display: data.account_number!, raw: data.account_number! },
                { key: 'reference', label: 'Reference', display: data.payment_reference!, raw: data.payment_reference! },
              ] as const).map((f, i, arr) => (
                <View key={f.key}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>{f.label}</Text>
                    <Text style={styles.detailVal}>{f.display}</Text>
                    <TouchableOpacity style={styles.copyBtn} onPress={() => copy(f.raw, f.key)} activeOpacity={0.7}>
                      <Text style={styles.copyBtnText}>{copied === f.key ? '✓' : 'Copy'}</Text>
                    </TouchableOpacity>
                  </View>
                  {i < arr.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.emptyText}>
              No ISA linked yet — the parent will add details and you'll see them here.
            </Text>
          )}
        </View>

        {/* Contributions */}
        <Text style={styles.sectionTitle}>Contributions</Text>

        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Log a contribution</Text>
            <Text style={styles.formHint}>How much are you sending per payment?</Text>

            <View style={styles.pillRow}>
              {([10, 25, 50, 100] as const).map(amt => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.pill, logAmount === amt && styles.pillActive]}
                  onPress={() => setLogAmount(amt)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, logAmount === amt && styles.pillTextActive]}>£{amt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.pillRow}>
              {(['weekly', 'monthly', 'one_off'] as const).map(freq => (
                <TouchableOpacity
                  key={freq}
                  style={[styles.pill, styles.freqPill, logFreq === freq && styles.pillActive]}
                  onPress={() => setLogFreq(freq)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, logFreq === freq && styles.pillTextActive]}>
                    {FREQ_LABELS[freq]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, (!logAmount || !logFreq || submitting) && styles.submitBtnDisabled]}
              onPress={handleLog}
              disabled={!logAmount || !logFreq || submitting}
              activeOpacity={0.85}
            >
              {submitting
                ? <ActivityIndicator size="small" color={colors.midnight} />
                : <Text style={styles.submitBtnText}>I've set it up ✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => { setShowForm(false); setLogAmount(null); setLogFreq(null) }}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : contribLoading ? (
          <ActivityIndicator size="small" color={colors.sky} style={{ marginBottom: 20 }} />
        ) : contributions.length === 0 ? (
          <>
            <View style={styles.card}>
              <Text style={styles.emptyText}>No contributions logged yet.</Text>
            </View>
            <TouchableOpacity style={styles.logBtn} onPress={() => setShowForm(true)} activeOpacity={0.85}>
              <Text style={styles.logBtnText}>Log a contribution</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.card}>
              {contributions.map((c, i, arr) => (
                <View key={c.id}>
                  <View style={styles.contribRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contribAmount}>£{c.amount_gbp} · {FREQ_LABELS[c.frequency]}</Text>
                      <Text style={styles.contribDate}>
                        {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, c.status === 'stopped' && styles.statusBadgeStopped]}>
                      <Text style={[styles.statusText, c.status === 'stopped' && styles.statusTextStopped]}>
                        {c.status === 'active' ? 'Active' : 'Stopped'}
                      </Text>
                    </View>
                  </View>
                  {i < arr.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
            {!activeContrib && (
              <TouchableOpacity style={styles.logBtn} onPress={() => setShowForm(true)} activeOpacity={0.85}>
                <Text style={styles.logBtnText}>Log a contribution</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { paddingHorizontal: 16, paddingBottom: 60 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 16,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 22, color: colors.midnight },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.midnight },

  heroCard: {
    backgroundColor: colors.midnight, borderRadius: 20,
    padding: 24, alignItems: 'center', marginBottom: 16,
  },
  heroAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.sky, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  heroAvatarText: { fontSize: 30, fontWeight: '800', color: colors.midnight },
  heroName: { fontSize: 22, fontWeight: '800', color: '#ffffff', marginBottom: 4 },
  heroParent: { fontSize: 14, color: '#94a3b8', marginBottom: 12 },
  relBadge: {
    backgroundColor: `${colors.sky}33`, borderRadius: 100,
    paddingHorizontal: 14, paddingVertical: 6, marginBottom: 16,
  },
  relBadgeText: { fontSize: 13, fontWeight: '700', color: colors.sky },
  potTotalRow: {
    width: '100%', flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'baseline', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)',
    paddingTop: 14, marginTop: 4,
  },
  potTotalLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  potTotalValue: { color: '#ffffff', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },

  projCard: {
    backgroundColor: '#f0fbff', borderRadius: 16, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: `${colors.sky}55`,
  },
  projTitle: { fontSize: 13, color: '#475569', marginBottom: 12, lineHeight: 19 },
  projRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  projItem: { flex: 1, alignItems: 'center' },
  projAge: { fontSize: 12, color: '#64748b', marginBottom: 2 },
  projValue: { fontSize: 22, fontWeight: '800', color: colors.midnight },
  projNote: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  projDivider: { width: 1, height: 40, backgroundColor: '#e2e8f0', marginHorizontal: 16 },
  projDisclaimer: { fontSize: 11, color: '#94a3b8', textAlign: 'center', fontStyle: 'italic' },

  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: colors.midnight,
    marginBottom: 10, marginTop: 4,
  },

  card: {
    backgroundColor: '#f8fafc', borderRadius: 16,
    padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  provider: {
    fontSize: 12, fontWeight: '700', color: colors.azure,
    marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  cardHint: { fontSize: 13, color: '#64748b', lineHeight: 20, marginBottom: 14 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  detailKey: { fontSize: 13, color: '#64748b', width: 110 },
  detailVal: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.midnight },
  copyBtn: { backgroundColor: `${colors.sky}33`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  copyBtnText: { fontSize: 12, fontWeight: '700', color: colors.azure },
  divider: { height: 1, backgroundColor: '#e2e8f0' },
  emptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', paddingVertical: 8 },

  contribRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  contribAmount: { fontSize: 14, fontWeight: '700', color: colors.midnight },
  contribDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  statusBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  statusBadgeStopped: { backgroundColor: '#f1f5f9' },
  statusText: { fontSize: 12, fontWeight: '700', color: '#16a34a' },
  statusTextStopped: { color: '#94a3b8' },

  formCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 20,
    marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0',
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: colors.midnight, marginBottom: 4 },
  formHint: { fontSize: 13, color: '#64748b', marginBottom: 14 },
  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  pill: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 100, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff',
  },
  freqPill: { paddingHorizontal: 14 },
  pillActive: { backgroundColor: colors.midnight, borderColor: colors.midnight },
  pillText: { fontSize: 14, fontWeight: '600', color: colors.midnight },
  pillTextActive: { color: '#ffffff' },

  submitBtn: {
    backgroundColor: colors.sky, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 12, marginBottom: 8,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: colors.midnight, fontSize: 15, fontWeight: '700' },
  cancelBtn: { paddingVertical: 10, alignItems: 'center' },
  cancelBtnText: { color: colors.azure, fontSize: 14, fontWeight: '600' },

  logBtn: {
    backgroundColor: colors.azure, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  logBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
})
