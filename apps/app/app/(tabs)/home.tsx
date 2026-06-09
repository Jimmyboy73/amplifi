import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Animated,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import Slider from '@react-native-community/slider'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { useAuth } from '@/lib/auth'
import { useChildren } from '@/lib/useChildren'
import { useContributorConnections, type ContributorConnection } from '@/lib/useContributorConnections'
import { useFamilyContributions, type FamilyContribution } from '@/lib/useFamilyContributions'
import { supabase } from '@/lib/supabase'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fv } from '@/lib/projections'
import { colors } from '@/constants/brand'
import { useHandle } from '@/lib/useHandle'
import { useSelectedChild } from '@/lib/SelectedChildContext'
import { Ionicons } from '@expo/vector-icons'

// ── Types ─────────────────────────────────────────────────────────────────────

type ActivityType = 'gift_card' | 'sweep' | 'family'

// ── Helpers ───────────────────────────────────────────────────────────────────

function gbp(n: number, decimals = 2): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000
    return '£' + (m >= 10 ? Math.round(m) : m.toFixed(1)) + 'm'
  }
  if (value >= 1_000) {
    const k = value / 1_000
    return '£' + (k >= 10 ? Math.round(k) : k.toFixed(1)) + 'k'
  }
  return '£' + Math.round(value).toLocaleString()
}

const ACTIVITY_ICON: Record<ActivityType, string> = {
  gift_card: '🛍️',
  sweep: '↑',
  family: '👨‍👩‍👧',
}

const ACTIVITY_ICON_BG: Record<ActivityType, string> = {
  gift_card: `${colors.sky}33`,
  sweep: `${colors.azure}33`,
  family: `${colors.amber}33`,
}

// ── Contributor sub-components ────────────────────────────────────────────────

const FREQ_LABELS: Record<'weekly' | 'monthly' | 'one_off', string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  one_off: 'One-off',
}

function formatSC(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.length < 6) return raw
  return `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4, 6)}`
}

type JisaDetails = {
  sort_code: string
  account_number: string
  payment_reference: string
  provider_name: string | null
}

function AmountFreqPicker({
  selectedAmount,
  selectedFreq,
  onSelectAmount,
  onSelectFreq,
}: {
  selectedAmount: number | null
  selectedFreq: 'weekly' | 'monthly' | 'one_off' | null
  onSelectAmount: (n: number) => void
  onSelectFreq: (f: 'weekly' | 'monthly' | 'one_off') => void
}) {
  return (
    <View>
      <View style={cStyles.pillRow}>
        {([10, 25, 50, 100] as const).map(amt => (
          <TouchableOpacity
            key={amt}
            style={[cStyles.pill, selectedAmount === amt && cStyles.pillActive]}
            onPress={() => onSelectAmount(amt)}
            activeOpacity={0.7}
          >
            <Text style={[cStyles.pillText, selectedAmount === amt && cStyles.pillTextActive]}>
              £{amt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={cStyles.pillRow}>
        {(['weekly', 'monthly', 'one_off'] as const).map(freq => (
          <TouchableOpacity
            key={freq}
            style={[cStyles.pill, cStyles.freqPill, selectedFreq === freq && cStyles.pillActive]}
            onPress={() => onSelectFreq(freq)}
            activeOpacity={0.7}
          >
            <Text style={[cStyles.pillText, selectedFreq === freq && cStyles.pillTextActive]}>
              {FREQ_LABELS[freq]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

function PendingWaitingCard({ conn }: { conn: ContributorConnection }) {
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [])

  return (
    <View style={cStyles.pendingCard}>
      <Animated.Text style={[cStyles.pendingIcon, { opacity: pulse }]}>⏳</Animated.Text>
      <Text style={cStyles.pendingTitle}>
        Waiting for {conn.parentHandle ? `@${conn.parentHandle}` : conn.parentName} to approve your connection
      </Text>
      <Text style={cStyles.pendingSub}>
        This usually happens quickly — we'll let you know when you're in.
      </Text>
    </View>
  )
}

function ContributorChildCard({ conn }: { conn: ContributorConnection }) {
  const router = useRouter()
  const { contributions, loading: contribLoading, logContribution, updateContribution, stopContribution } =
    useFamilyContributions(conn.id)

  const [jisa, setJisa] = useState<JisaDetails | null>(null)
  const [jisaLoading, setJisaLoading] = useState(true)
  const [showSetup, setShowSetup] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [selectedFreq, setSelectedFreq] = useState<'weekly' | 'monthly' | 'one_off' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('jisa_accounts')
      .select('sort_code, account_number, payment_reference, provider_name')
      .eq('child_id', conn.childId)
      .maybeSingle()
      .then(({ data }) => {
        setJisa(data as JisaDetails | null)
        setJisaLoading(false)
      })
  }, [conn.childId])

  const activeContrib = contributions.find(c => c.status === 'active') ?? null
  const inSetupMode = showSetup || !!editingId

  const copy = async (value: string, field: string) => {
    await Clipboard.setStringAsync(value)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleLog = async () => {
    if (!selectedAmount || !selectedFreq || submitting) return
    setSubmitting(true)
    const { error } = await logContribution({ childId: conn.childId, amountGbp: selectedAmount, frequency: selectedFreq })
    setSubmitting(false)
    if (error) {
      Alert.alert('Something went wrong', 'Please try again.')
    } else {
      setShowSetup(false)
      setSelectedAmount(null)
      setSelectedFreq(null)
    }
  }

  const handleUpdate = async () => {
    if (!editingId || !selectedAmount || !selectedFreq || submitting) return
    setSubmitting(true)
    const { error } = await updateContribution(editingId, { amountGbp: selectedAmount, frequency: selectedFreq })
    setSubmitting(false)
    if (error) {
      Alert.alert('Something went wrong', 'Please try again.')
    } else {
      setEditingId(null)
      setSelectedAmount(null)
      setSelectedFreq(null)
    }
  }

  const handleStop = (id: string) => {
    Alert.alert(
      'Stop contribution',
      `Are you sure you want to stop your contribution to ${conn.childName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
            const { error } = await stopContribution(id)
            if (error) Alert.alert('Something went wrong', 'Please try again.')
          },
        },
      ]
    )
  }

  const openEdit = (contrib: FamilyContribution) => {
    setEditingId(contrib.id)
    setSelectedAmount(contrib.amount_gbp)
    setSelectedFreq(contrib.frequency)
  }

  return (
    <View style={cStyles.card}>
      {/* Hero */}
      <View style={cStyles.heroSection}>
        <View style={cStyles.heroRow}>
          <View style={cStyles.heroAvatar}>
            <Text style={cStyles.heroAvatarText}>{conn.childName[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={cStyles.heroTitle}>You're part of {conn.childName}'s team 💙</Text>
            <Text style={cStyles.heroSub}>
              {conn.parentHandle ? `with @${conn.parentHandle}` : `with ${conn.parentName}`}
            </Text>
          </View>
        </View>
        <View style={cStyles.potRow}>
          <Text style={cStyles.potLabel}>Pot total</Text>
          <Text style={cStyles.potValue}>£0.00</Text>
        </View>
        <Text style={cStyles.potSub}>Together, the family is building {conn.childName}'s future</Text>
      </View>

      {/* Body */}
      <View style={cStyles.bodySection}>
        {contribLoading ? (
          <ActivityIndicator size="small" color={colors.sky} style={{ marginVertical: 16 }} />
        ) : editingId ? (
          <View>
            <Text style={cStyles.setupLabel}>Update your contribution</Text>
            <AmountFreqPicker
              selectedAmount={selectedAmount}
              selectedFreq={selectedFreq}
              onSelectAmount={setSelectedAmount}
              onSelectFreq={setSelectedFreq}
            />
            <View style={cStyles.editBtnRow}>
              <TouchableOpacity
                style={[cStyles.logBtn, { flex: 1 }, (!selectedAmount || !selectedFreq || submitting) && cStyles.btnDisabled]}
                onPress={handleUpdate}
                disabled={!selectedAmount || !selectedFreq || submitting}
                activeOpacity={0.85}
              >
                {submitting
                  ? <ActivityIndicator size="small" color={colors.midnight} />
                  : <Text style={cStyles.logBtnText}>Save</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[cStyles.cancelBtn, { flex: 1 }]}
                onPress={() => { setEditingId(null); setSelectedAmount(null); setSelectedFreq(null) }}
                activeOpacity={0.7}
              >
                <Text style={cStyles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : activeContrib ? (
          <View>
            <Text style={cStyles.setupLabel}>Your contribution</Text>
            <View style={cStyles.activeContribRow}>
              <Text style={cStyles.activeAmount}>£{activeContrib.amount_gbp}</Text>
              <Text style={cStyles.activeFreq}>{FREQ_LABELS[activeContrib.frequency]}</Text>
            </View>
            <View style={cStyles.editStopRow}>
              <TouchableOpacity style={cStyles.editBtn} onPress={() => openEdit(activeContrib)} activeOpacity={0.8}>
                <Text style={cStyles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={cStyles.stopBtn} onPress={() => handleStop(activeContrib.id)} activeOpacity={0.8}>
                <Text style={cStyles.stopBtnText}>Stop</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : showSetup ? (
          <View>
            {jisaLoading ? (
              <ActivityIndicator size="small" color={colors.sky} style={{ marginVertical: 16 }} />
            ) : jisa ? (
              <>
                <Text style={cStyles.setupLabel}>Set up a standing order</Text>
                <Text style={cStyles.setupHint}>
                  Add these details in your banking app to set up a standing order directly into {conn.childName}'s Junior ISA.
                </Text>
                <View style={cStyles.isaBlock}>
                  {jisa.provider_name ? <Text style={cStyles.isaProvider}>{jisa.provider_name}</Text> : null}
                  {([
                    { key: 'sort_code', label: 'Sort code', display: formatSC(jisa.sort_code), raw: jisa.sort_code },
                    { key: 'account', label: 'Account number', display: jisa.account_number, raw: jisa.account_number },
                    { key: 'reference', label: 'Reference', display: jisa.payment_reference, raw: jisa.payment_reference },
                  ] as const).map((f, i, arr) => (
                    <View key={f.key}>
                      <View style={cStyles.isaFieldRow}>
                        <Text style={cStyles.isaKey}>{f.label}</Text>
                        <Text style={cStyles.isaVal}>{f.display}</Text>
                        <TouchableOpacity style={cStyles.copyBtn} onPress={() => copy(f.raw, f.key)} activeOpacity={0.7}>
                          <Text style={cStyles.copyBtnText}>{copied === f.key ? '✓' : 'Copy'}</Text>
                        </TouchableOpacity>
                      </View>
                      {i < arr.length - 1 && <View style={cStyles.isaDivider} />}
                    </View>
                  ))}
                </View>
                <Text style={cStyles.amountLabel}>How much per payment?</Text>
                <AmountFreqPicker
                  selectedAmount={selectedAmount}
                  selectedFreq={selectedFreq}
                  onSelectAmount={setSelectedAmount}
                  onSelectFreq={setSelectedFreq}
                />
                <TouchableOpacity
                  style={[cStyles.logBtn, (!selectedAmount || !selectedFreq || submitting) && cStyles.btnDisabled]}
                  onPress={handleLog}
                  disabled={!selectedAmount || !selectedFreq || submitting}
                  activeOpacity={0.85}
                >
                  {submitting
                    ? <ActivityIndicator size="small" color={colors.midnight} />
                    : <Text style={cStyles.logBtnText}>I've set it up ✓</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={cStyles.cancelBtn}
                  onPress={() => { setShowSetup(false); setSelectedAmount(null); setSelectedFreq(null) }}
                  activeOpacity={0.7}
                >
                  <Text style={cStyles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={cStyles.noJisaMsg}>
                <Text style={cStyles.noJisaText}>
                  No ISA linked yet — {conn.parentHandle ? `@${conn.parentHandle}` : conn.parentName} is still setting up {conn.childName}'s account. Check back soon.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity style={cStyles.setupCta} onPress={() => setShowSetup(true)} activeOpacity={0.85}>
            <Ionicons name="add-circle-outline" size={20} color={colors.midnight} />
            <Text style={cStyles.setupCtaText}>Set up your contribution</Text>
            <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
          </TouchableOpacity>
        )}

        {!inSetupMode && (
          <TouchableOpacity
            style={cStyles.viewDetailsBtn}
            onPress={() => router.push(`/connected-child/${conn.id}` as never)}
            activeOpacity={0.7}
          >
            <Text style={cStyles.viewDetailsTxt}>View full details →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter()
  const { user, signOut } = useAuth()

  const { handle, refetch: refetchHandle } = useHandle()
  const { children, loading: childrenLoading, refetch: refetchChildren } = useChildren()
  const { connections, loading: connectionsLoading, refetch: refetchConnections } = useContributorConnections()

  useFocusEffect(
    useCallback(() => {
      refetchHandle()
      void refetchChildren()
      void refetchConnections()
      void refetchGettingStarted()
    }, [refetchHandle, refetchChildren, refetchConnections, refetchGettingStarted])
  )

  // Selected child (shared across tabs via context)
  const { selectedChildId, setSelectedChildId } = useSelectedChild()

  useEffect(() => {
    if (children.length > 0 && selectedChildId === null) {
      setSelectedChildId(children[0].id)
    }
  }, [children])

  const child = children.find(c => c.id === selectedChildId) ?? null
  const childPhoto = child?.photo_url ?? null

  // Wallet (owner-level, fetched once)
  const [wallet, setWallet] = useState<{ balance: number; total_earned: number } | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('wallets')
      .select('balance, total_earned')
      .eq('owner_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setWallet(data as { balance: number; total_earned: number })
      })
  }, [user?.id])

  // Contributions (child-level)
  const [contributions, setContributions] = useState<Array<{
    id: string; type: string; description: string; amount: number; created_at: string
  }>>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (childrenLoading) return
    if (!selectedChildId) { setIsLoading(false); return }
    setIsLoading(true)
    supabase
      .from('contributions')
      .select('id, type, description, amount, created_at')
      .eq('child_id', selectedChildId)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setContributions((data ?? []) as typeof contributions)
        setIsLoading(false)
      })
  }, [selectedChildId, childrenLoading])

  // Getting Started card data
  const [hasJisa, setHasJisa] = useState(false)
  const [approvedFamilyCount, setApprovedFamilyCount] = useState(0)
  const [hasWishlists, setHasWishlists] = useState(false)
  const [gettingStartedLoaded, setGettingStartedLoaded] = useState(false)

  const refetchGettingStarted = useCallback(async () => {
    if (!user || !selectedChildId) return
    const [jisaRes, connRes, wlRes] = await Promise.all([
      supabase.from('jisa_accounts').select('id').eq('child_id', selectedChildId).maybeSingle(),
      (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> })
        .from('family_connections')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', user.id)
        .eq('status', 'approved'),
      supabase.from('wishlists').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
    ])
    setHasJisa(!!jisaRes.data)
    setApprovedFamilyCount((connRes as { count: number | null }).count ?? 0)
    setHasWishlists(((wlRes as { count: number | null }).count ?? 0) > 0)
    setGettingStartedLoaded(true)
  }, [user?.id, selectedChildId])

  useEffect(() => {
    if (selectedChildId && !childrenLoading) void refetchGettingStarted()
  }, [selectedChildId, childrenLoading])

  // Slider animation — runs once per session only
  const [sliderValue, setSliderValue] = useState(20)
  const hasAnimatedSlider = useRef(false)

  useEffect(() => {
    if (wallet) setSliderValue(wallet.balance > 0 ? wallet.balance : 20)
  }, [wallet])

  useEffect(() => {
    if (isLoading || hasAnimatedSlider.current) return
    hasAnimatedSlider.current = true
    let current = 10
    const target = 50
    const steps = 40
    const increment = (target - current) / steps
    const timer = setInterval(() => {
      current += increment
      if (current >= target) { setSliderValue(target); clearInterval(timer) }
      else { setSliderValue(Math.round(current)) }
    }, 2000 / steps)
    return () => clearInterval(timer)
  }, [isLoading])

  if (childrenLoading || isLoading || connectionsLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.sky} />
      </View>
    )
  }

  const isParent = children.length > 0
  const approvedConnections = connections.filter(c => c.status === 'approved')
  const pendingConnections = connections.filter(c => c.status === 'pending')

  // ── Contributor-only home ────────────────────────────────────────────────────
  if (!isParent) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <Text style={styles.logo}>amplifi</Text>
            <View style={styles.topRight}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  Alert.alert('Your account', '', [
                    { text: 'Profile Settings', onPress: () => router.push('/settings/profile') },
                    { text: handle ? `Your Handle (@${handle})` : 'Your Handle (Not set)', onPress: () => router.push('/settings/handle') },
                    { text: 'Sign out', style: 'destructive', onPress: () => { void signOut() } },
                    { text: 'Cancel', style: 'cancel' },
                  ])
                }
              >
                <Ionicons name="settings-outline" size={26} color={colors.midnight} />
              </TouchableOpacity>
            </View>
          </View>

          {approvedConnections.length > 0
            ? approvedConnections.map(conn => (
                <ContributorChildCard key={conn.id} conn={conn} />
              ))
            : pendingConnections.map(conn => (
                <PendingWaitingCard key={conn.id} conn={conn} />
              ))}

          <View style={styles.setupCard}>
            <Text style={styles.setupCardTitle}>Build your own child's pot</Text>
            <Text style={styles.setupCardSub}>
              Set up a JISA and start earning cashback every time you spend
            </Text>
            <TouchableOpacity
              style={styles.setupCardBtn}
              onPress={() => router.push('/(auth)/child')}
              activeOpacity={0.85}
            >
              <Text style={styles.setupCardBtnText}>Set up your child's account →</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    )
  }

  const childName = child?.name ?? 'Your child'
  const childInitial = (child?.name?.[0] ?? 'A').toUpperCase()

  const childAgeMonths = child?.date_of_birth
    ? Math.floor((Date.now() - new Date(child.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0

  const monthsTo18 = Math.max(0, 18 * 12 - childAgeMonths)
  const monthsTo25 = Math.max(0, 25 * 12 - childAgeMonths)
  const monthsTo65 = Math.max(0, 65 * 12 - childAgeMonths)

  const proj18 = fv(sliderValue, monthsTo18)
  const proj25 = fv(sliderValue, monthsTo25)
  const proj65 = fv(sliderValue, monthsTo65)

  const comingSoon = (feature: string) =>
    Alert.alert(feature, 'Coming soon. Join the waitlist to be first to know.')

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── S1: Top bar ──────────────────────────────────────────────── */}
        <View style={styles.topBar}>
          <Text style={styles.logo}>amplifi</Text>
          <View style={styles.topRight}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                Alert.alert('Your account', '', [
                  { text: 'Profile Settings', onPress: () => router.push('/settings/profile') },
                  { text: handle ? `Your Handle (@${handle})` : 'Your Handle (Not set)', onPress: () => router.push('/settings/handle') },
                  { text: 'Payment settings', onPress: () => router.push('/settings/payment') },
                  { text: 'Referral code', onPress: () => router.push('/settings/referral') },
                  { text: 'Sign out', style: 'destructive', onPress: () => { void signOut() } },
                  { text: 'Cancel', style: 'cancel' },
                ])
              }
            >
              <Ionicons name="settings-outline" size={26} color={colors.midnight} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── S2: Hero pot card ────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.childAvatar}>
              {childPhoto ? (
                <Image source={{ uri: childPhoto }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.childAvatarText}>{childInitial}</Text>
              )}
            </View>
            <Text style={styles.potTitle}>{childName}'s Pot</Text>
            <Text style={styles.potSub}>Building {child?.name ?? 'their'}'s future</Text>
          </View>

          <Text style={styles.heroBalance}>{gbp(wallet?.total_earned ?? 0)}</Text>
          <Text style={styles.heroBalanceSub}>total in {childName}'s JISA</Text>
        </View>

        {/* ── Child switcher (multi-child only) ────────────────────────── */}
        {children.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.childSwitcherContent}
            style={styles.childSwitcherRow}
          >
            {children.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.childPill, c.id === selectedChildId && styles.childPillActive]}
                onPress={() => setSelectedChildId(c.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.childPillText, c.id === selectedChildId && styles.childPillTextActive]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── Getting Started card ─────────────────────────────────────── */}
        {gettingStartedLoaded && !(hasJisa && approvedFamilyCount > 0 && hasWishlists) && (
          <View style={styles.gettingStartedCard}>
            <Text style={styles.gsTitle}>Get more from Amplifi</Text>

            <TouchableOpacity
              style={styles.gsRow}
              onPress={hasJisa ? undefined : () => router.push({ pathname: '/(auth)/isa-link', params: { childId: child!.id, childName: childName, source: 'home' } })}
              activeOpacity={hasJisa ? 1 : 0.75}
              disabled={hasJisa}
            >
              <View style={[styles.gsIconWrap, hasJisa && styles.gsIconWrapDone]}>
                <Ionicons name="business-outline" size={19} color={hasJisa ? '#16a34a' : colors.azure} />
              </View>
              <Text style={styles.gsLabel}>Link {childName}'s ISA</Text>
              {hasJisa
                ? <Text style={styles.gsDoneText}>Linked ✓</Text>
                : <Ionicons name="chevron-forward" size={17} color="#94a3b8" />}
            </TouchableOpacity>

            <View style={styles.gsDivider} />

            <TouchableOpacity
              style={styles.gsRow}
              onPress={approvedFamilyCount > 0 ? undefined : () => router.push('/(tabs)/family')}
              activeOpacity={approvedFamilyCount > 0 ? 1 : 0.75}
              disabled={approvedFamilyCount > 0}
            >
              <View style={[styles.gsIconWrap, approvedFamilyCount > 0 && styles.gsIconWrapDone]}>
                <Ionicons name="people-outline" size={19} color={approvedFamilyCount > 0 ? '#16a34a' : colors.azure} />
              </View>
              <Text style={styles.gsLabel}>Invite family to contribute</Text>
              {approvedFamilyCount > 0
                ? <Text style={styles.gsDoneText}>{approvedFamilyCount} connected ✓</Text>
                : <Ionicons name="chevron-forward" size={17} color="#94a3b8" />}
            </TouchableOpacity>

            <View style={styles.gsDivider} />

            <TouchableOpacity
              style={styles.gsRow}
              onPress={hasWishlists ? undefined : () => router.push('/(tabs)/occasions')}
              activeOpacity={hasWishlists ? 1 : 0.75}
              disabled={hasWishlists}
            >
              <View style={[styles.gsIconWrap, hasWishlists && styles.gsIconWrapDone]}>
                <Ionicons name="gift-outline" size={19} color={hasWishlists ? '#16a34a' : colors.azure} />
              </View>
              <Text style={styles.gsLabel}>Create a birthday wishlist</Text>
              {hasWishlists
                ? <Text style={styles.gsDoneText}>Done ✓</Text>
                : <Ionicons name="chevron-forward" size={17} color="#94a3b8" />}
            </TouchableOpacity>
          </View>
        )}

        {/* ── S3: Quick actions ────────────────────────────────────────── */}
        <Text style={styles.actionsTitle}>Ways to grow {child?.name ?? 'your child'}'s pot</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionsContent}
          style={styles.actionsRow}
        >
          {([
            { key: 'family',   label: 'My Family',     icon: <Ionicons name="people" size={18} color={colors.sky} />, onPress: () => router.push('/(tabs)/family') },
            { key: 'occasions',label: 'Occasions',      icon: <Text style={styles.actionIcon}>🎁</Text>,              onPress: () => router.push('/birthday') },
            { key: 'cashback', label: 'Cashback',       icon: <Text style={styles.actionIcon}>💳</Text>,              onPress: () => router.push('/(tabs)/offers') },
            { key: 'loyalty',  label: 'Loyalty offers', icon: <Text style={styles.actionIcon}>🎯</Text>,              onPress: () => router.push('/(tabs)/shop') },
          ] as const).map((a) => (
            <TouchableOpacity key={a.key} style={styles.actionChip} onPress={a.onPress} activeOpacity={0.8}>
              {a.icon}
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── S4: Projection slider ────────────────────────────────────── */}
        <View style={styles.sliderCard}>
          <Text style={styles.sliderCardTitle}>What {childName} could have!</Text>
          <Text style={styles.sliderCardSubtitle}>Adjust monthly contribution to see the impact</Text>

          <Text style={styles.sliderAmountLabel}>
            Monthly contribution:{' '}
            <Text style={styles.sliderAmountBold}>{gbp(sliderValue)}</Text>
          </Text>

          <Slider
            style={{ width: '100%', height: 40, marginBottom: 4 }}
            minimumValue={10}
            maximumValue={200}
            step={5}
            value={sliderValue}
            onValueChange={setSliderValue}
            minimumTrackTintColor={colors.sky}
            maximumTrackTintColor="#e2e8f0"
            thumbTintColor={colors.sky}
          />

          <View style={styles.projRow}>
            <View style={styles.projCard}>
              <Text style={styles.projLabel}>Age 18</Text>
              <Text style={[styles.projCardValue, { color: colors.sky }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{formatCompact(proj18)}</Text>
              <Text style={styles.projSub}>ISA matures</Text>
            </View>
            <View style={styles.projCard}>
              <Text style={styles.projLabel}>Age 25</Text>
              <Text style={[styles.projCardValue, { color: colors.midnight }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{formatCompact(proj25)}</Text>
              <Text style={styles.projSub}>First home?</Text>
            </View>
            <View style={styles.projCard}>
              <Text style={styles.projLabel}>Age 65</Text>
              <Text style={[styles.projCardValue, { color: colors.azure }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{formatCompact(proj65)}</Text>
              <Text style={styles.projSub}>Retirement</Text>
            </View>
          </View>

          <Text style={styles.sliderDisclaimer}>
            Illustrative projection at 8% p.a. — not a guarantee
          </Text>
        </View>

        {/* ── S5: Recent activity ──────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Recent activity</Text>
        <View style={styles.activityList}>
          {contributions.length === 0 ? (
            <View>
              <Text style={styles.ghostHeader}>✨ Here's what your activity could look like</Text>
              <View style={{ opacity: 0.35 }}>
                <View style={styles.activityRow}>
                  <View style={[styles.activityIconWrap, { backgroundColor: '#7C3AED26' }]}>
                    <Text style={styles.activityIcon}>👵</Text>
                  </View>
                  <View style={styles.activityMid}>
                    <Text style={styles.activityDesc}>{childName}'s Grandma</Text>
                    <Text style={styles.activityDate}>Monthly family contribution</Text>
                  </View>
                  <Text style={styles.activityCashback}>+£20.00</Text>
                </View>
                <View style={styles.activityRow}>
                  <View style={[styles.activityIconWrap, { backgroundColor: '#0891B226' }]}>
                    <Text style={styles.activityIcon}>👴</Text>
                  </View>
                  <View style={styles.activityMid}>
                    <Text style={styles.activityDesc}>{childName}'s Grandpa</Text>
                    <Text style={styles.activityDate}>One-off contribution</Text>
                  </View>
                  <Text style={styles.activityCashback}>+£10.00</Text>
                </View>
                <View style={styles.activityRow}>
                  <View style={[styles.activityIconWrap, { backgroundColor: `${colors.sky}26` }]}>
                    <Text style={styles.activityIcon}>🛍️</Text>
                  </View>
                  <View style={styles.activityMid}>
                    <Text style={styles.activityDesc}>Retailer loyalty cashback</Text>
                    <Text style={styles.activityDate}>Cashback earned</Text>
                  </View>
                  <Text style={styles.activityCashback}>+£8.50</Text>
                </View>
              </View>
              <Text style={styles.ghostFooter}>Invite family and earn cashback to see real activity here</Text>
            </View>
          ) : (
            contributions.map((item) => {
              const activityType = (item.type as ActivityType) in ACTIVITY_ICON
                ? (item.type as ActivityType)
                : 'gift_card'
              const formattedDate = new Date(item.created_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short',
              })
              return (
                <View key={item.id} style={styles.activityRow}>
                  <View style={[styles.activityIconWrap, { backgroundColor: ACTIVITY_ICON_BG[activityType] }]}>
                    <Text style={styles.activityIcon}>{ACTIVITY_ICON[activityType]}</Text>
                  </View>
                  <View style={styles.activityMid}>
                    <Text style={styles.activityDesc}>{item.description}</Text>
                    <Text style={styles.activityDate}>{formattedDate}</Text>
                  </View>
                  {item.type === 'sweep' ? (
                    <Text style={styles.activitySweep}>→ JISA</Text>
                  ) : (
                    <Text style={styles.activityCashback}>+{gbp(item.amount ?? 0)}</Text>
                  )}
                </View>
              )
            })
          )}
        </View>

        {/* ── Contributor section (if also connected to others) ────── */}
        {approvedConnections.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Also contributing to</Text>
            {approvedConnections.map(conn => (
              <TouchableOpacity
                key={conn.id}
                style={styles.connCard}
                onPress={() => router.push(`/connected-child/${conn.id}` as never)}
                activeOpacity={0.8}
              >
                <View style={styles.connAvatar}>
                  <Text style={styles.connAvatarText}>{conn.childName[0]?.toUpperCase() ?? '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.connChildName}>{conn.childName}</Text>
                  <Text style={styles.connParentName}>
                    {conn.parentHandle ? `@${conn.parentHandle}` : conn.parentName}
                  </Text>
                </View>
                {conn.relationship && (
                  <View style={styles.connRelBadge}>
                    <Text style={styles.connRelBadgeText}>{conn.relationship}</Text>
                  </View>
                )}
                <Text style={styles.connChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  logo: { fontSize: 20, fontWeight: '800', color: colors.midnight, letterSpacing: -0.5 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  // Hero card
  heroCard: {
    backgroundColor: colors.midnight,
    borderRadius: 20,
    marginHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  heroTopRow: { alignItems: 'center', marginBottom: 20 },
  childAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.sky,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  childAvatarText: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  potTitle: { color: '#ffffff', fontSize: 17, fontWeight: '700', textAlign: 'center', marginTop: 10 },
  potSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2, textAlign: 'center' },
  heroBalance: {
    color: '#ffffff', fontSize: 42, fontWeight: '800',
    textAlign: 'center', letterSpacing: -1, marginTop: 8,
  },
  heroBalanceSub: { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', marginTop: 4 },

  // Child switcher
  childSwitcherRow: { marginBottom: 8 },
  childSwitcherContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  childPill: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 100, borderWidth: 1, borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  childPillActive: { backgroundColor: colors.midnight, borderColor: colors.midnight },
  childPillText: { fontSize: 13, fontWeight: '600', color: colors.midnight },
  childPillTextActive: { color: '#ffffff' },

  // Quick actions
  actionsTitle: {
    fontSize: 16, fontWeight: '700', color: colors.midnight,
    paddingHorizontal: 16, marginBottom: 8, marginTop: 16,
  },
  actionsRow: { marginBottom: 16 },
  actionsContent: { paddingHorizontal: 16, paddingVertical: 4, gap: 10 },
  actionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.midnight,
    borderRadius: 100, backgroundColor: '#ffffff',
  },
  actionIcon: { fontSize: 15 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: colors.midnight },

  // Projection slider card
  sliderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 20,
    marginBottom: 16,
  },
  sliderCardTitle: { fontSize: 16, fontWeight: '700', color: colors.midnight, marginBottom: 4 },
  sliderCardSubtitle: { fontSize: 13, color: '#64748b', marginBottom: 14, lineHeight: 19 },
  sliderAmountLabel: { fontSize: 14, color: '#475569', marginBottom: 4 },
  sliderAmountBold: { fontWeight: '700', color: colors.midnight },
  projRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  projCard: {
    flex: 1, backgroundColor: colors.offwhite,
    borderRadius: 12, padding: 12, alignItems: 'center',
  },
  projLabel: { fontSize: 11, color: '#64748b', marginBottom: 4 },
  projCardValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center' },
  projSub: { fontSize: 10, color: '#94a3b8', marginTop: 3 },
  sliderDisclaimer: {
    fontSize: 11, color: '#94a3b8',
    textAlign: 'center', fontStyle: 'italic', lineHeight: 16, marginTop: 6,
  },

  // Activity
  sectionTitle: {
    fontSize: 18, fontWeight: '700', color: colors.midnight,
    paddingHorizontal: 16, marginBottom: 4,
  },
  activityList: { marginBottom: 24 },
  activityRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12,
  },
  activityIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  activityIcon: { fontSize: 18 },
  activityMid: { flex: 1 },
  activityDesc: { fontSize: 14, fontWeight: '600', color: colors.midnight },
  activityDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  activityCashback: { fontSize: 14, fontWeight: '700', color: '#16a34a' },
  activitySweep: { fontSize: 14, fontWeight: '700', color: colors.azure },
  ghostHeader: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', paddingTop: 12, paddingHorizontal: 16, marginBottom: 12 },
  ghostFooter: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 12, paddingBottom: 12, paddingHorizontal: 16 },

  // Contributor elements
  connCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ffffff', borderRadius: 14,
    marginHorizontal: 16, marginBottom: 8, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  connAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.azure,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  connAvatarText: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  connChildName: { fontSize: 15, fontWeight: '700', color: colors.midnight },
  connParentName: { fontSize: 13, color: '#64748b', marginTop: 1 },
  connRelBadge: {
    backgroundColor: `${colors.sky}22`, borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  connRelBadgeText: { fontSize: 11, fontWeight: '700', color: colors.azure },
  connChevron: { fontSize: 22, color: '#94a3b8' },
  pendingConnCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fef3c7', borderRadius: 14,
    marginHorizontal: 16, marginBottom: 8, padding: 14,
  },
  pendingConnIcon: { fontSize: 20 },
  pendingConnText: { flex: 1, fontSize: 14, color: '#92400e', lineHeight: 20 },
  setupCard: {
    backgroundColor: '#ffffff', borderRadius: 20,
    marginHorizontal: 16, marginTop: 16, padding: 20,
  },
  setupCardTitle: { fontSize: 17, fontWeight: '800', color: colors.midnight, marginBottom: 6 },
  setupCardSub: { fontSize: 14, color: '#64748b', lineHeight: 21, marginBottom: 16 },
  setupCardBtn: {
    backgroundColor: colors.sky, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  setupCardBtnText: { color: colors.midnight, fontSize: 15, fontWeight: '700' },

  // Getting Started card
  gettingStartedCard: {
    backgroundColor: '#ffffff', borderRadius: 20,
    marginHorizontal: 16, marginTop: 8, marginBottom: 8, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  gsTitle: { fontSize: 15, fontWeight: '700', color: colors.midnight, marginBottom: 12 },
  gsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  gsIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: `${colors.azure}18`,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  gsIconWrapDone: { backgroundColor: '#dcfce7' },
  gsLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.midnight },
  gsDoneText: { fontSize: 12, fontWeight: '700', color: '#16a34a' },
  gsDivider: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 48 },
})

// ── Contributor card styles ────────────────────────────────────────────────────

const cStyles = StyleSheet.create({
  card: {
    borderRadius: 20, marginHorizontal: 16, marginBottom: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  heroSection: {
    backgroundColor: colors.midnight,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  heroAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.sky, alignItems: 'center', justifyContent: 'center',
  },
  heroAvatarText: { color: colors.midnight, fontSize: 20, fontWeight: '800' },
  heroTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  heroSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 },
  potRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  potLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  potValue: { color: '#ffffff', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  potSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 },

  bodySection: { backgroundColor: '#ffffff', padding: 20 },
  setupLabel: { fontSize: 14, fontWeight: '700', color: colors.midnight, marginBottom: 8 },
  setupHint: { fontSize: 13, color: '#64748b', lineHeight: 19, marginBottom: 14 },

  isaBlock: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, marginBottom: 16 },
  isaProvider: {
    fontSize: 12, fontWeight: '700', color: colors.azure,
    marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  isaFieldRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  isaKey: { fontSize: 12, color: '#64748b', width: 110 },
  isaVal: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.midnight },
  copyBtn: { backgroundColor: `${colors.sky}33`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  copyBtnText: { fontSize: 12, fontWeight: '700', color: colors.azure },
  isaDivider: { height: 1, backgroundColor: '#e2e8f0' },

  amountLabel: { fontSize: 13, fontWeight: '600', color: colors.midnight, marginBottom: 8 },
  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  pill: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 100, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff',
  },
  freqPill: { paddingHorizontal: 14 },
  pillActive: { backgroundColor: colors.midnight, borderColor: colors.midnight },
  pillText: { fontSize: 14, fontWeight: '600', color: colors.midnight },
  pillTextActive: { color: '#ffffff' },

  logBtn: {
    backgroundColor: colors.sky, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 16, marginBottom: 8,
  },
  logBtnText: { color: colors.midnight, fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.4 },
  cancelBtn: { borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginBottom: 4 },
  cancelBtnText: { color: colors.azure, fontSize: 14, fontWeight: '600' },

  activeContribRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: 8,
    backgroundColor: `${colors.sky}18`, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12,
  },
  activeAmount: { fontSize: 28, fontWeight: '800', color: colors.midnight },
  activeFreq: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  editStopRow: { flexDirection: 'row', gap: 10 },
  editBtn: { flex: 1, backgroundColor: colors.azure, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  editBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  stopBtn: {
    flex: 1, borderWidth: 1, borderColor: '#fca5a5',
    borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff5f5',
  },
  stopBtnText: { color: '#dc2626', fontSize: 14, fontWeight: '700' },
  editBtnRow: { flexDirection: 'row', gap: 10 },

  setupCta: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: colors.midnight, borderRadius: 14, padding: 14,
  },
  setupCtaText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.midnight },

  viewDetailsBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 4 },
  viewDetailsTxt: { fontSize: 13, color: colors.azure, fontWeight: '600' },

  noJisaMsg: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 16 },
  noJisaText: { fontSize: 14, color: '#64748b', lineHeight: 20 },

  pendingCard: {
    backgroundColor: '#fef3c7', borderRadius: 20,
    marginHorizontal: 16, marginBottom: 16, padding: 24, alignItems: 'center',
  },
  pendingIcon: { fontSize: 40, marginBottom: 12 },
  pendingTitle: { fontSize: 16, fontWeight: '700', color: '#92400e', textAlign: 'center', lineHeight: 24, marginBottom: 8 },
  pendingSub: { fontSize: 14, color: '#b45309', textAlign: 'center', lineHeight: 21 },
})
