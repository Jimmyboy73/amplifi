import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fv, formatGBP } from '@/lib/projections'
import { colors } from '@/constants/brand'

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

// ── Screen ────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter()
  const { user, signOut } = useAuth()

  const [child, setChild] = useState<{
    id: string
    name: string
    date_of_birth: string
  } | null>(null)

  const [wallet, setWallet] = useState<{
    balance: number
    total_earned: number
  } | null>(null)

  const [contributions, setContributions] = useState<Array<{
    id: string
    type: string
    description: string
    amount: number
    created_at: string
  }>>([])

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      setIsLoading(true)

      // Fetch first child
      const { data: childData } = await supabase
        .from('children')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (childData) setChild(childData)

      // Fetch wallet
      const { data: walletData } = await supabase
        .from('wallets')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (walletData) setWallet(walletData)

      // Fetch recent contributions
      if (childData) {
        const { data: contribData } = await supabase
          .from('contributions')
          .select('*')
          .eq('child_id', childData.id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (contribData) setContributions(contribData)
      }

      setIsLoading(false)
    }

    fetchData()
  }, [user])

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.sky} />
      </View>
    )
  }

  const childName = child?.name ?? 'Your child'
  const childInitial = (child?.name?.[0] ?? 'A').toUpperCase()

  const birthdayDays = child?.date_of_birth
    ? (() => {
        const dob = new Date(child.date_of_birth)
        const next = new Date(dob)
        next.setFullYear(new Date().getFullYear())
        if (next < new Date()) next.setFullYear(new Date().getFullYear() + 1)
        return Math.ceil((next.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      })()
    : null

  const sweepPct = Math.min((wallet?.balance ?? 0) / 20, 1) * 100

  const childAgeMonths = child?.date_of_birth
    ? Math.floor((Date.now() - new Date(child.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0
  const monthsRemaining = Math.max(0, (18 * 12) - childAgeMonths)
  const projectedValue = fv((wallet?.balance ?? 0) / 12, monthsRemaining)

  const comingSoon = (feature: string) =>
    Alert.alert(feature, 'Coming soon. Join the waitlist to be first to know.')

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── S1: Top bar ──────────────────────────────────────────────── */}
        <View style={styles.topBar}>
          <Text style={styles.logo}>amplifi</Text>
          <View style={styles.topRight}>
            <Text style={styles.bell}>🔔</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                Alert.alert('Your account', '', [
                  { text: 'Profile', onPress: () => Alert.alert('Coming soon', 'Profile settings coming soon.') },
                  { text: 'Sign out', style: 'destructive', onPress: () => { void signOut() } },
                  { text: 'Cancel', style: 'cancel' },
                ])
              }
            >
              <View style={styles.profileCircle}>
                <Text style={styles.profileInitial}>J</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── S2: Hero pot card ────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          {/* Avatar + name row */}
          <View style={styles.heroTopRow}>
            <View style={styles.childAvatarRow}>
              <View style={styles.childAvatar}>
                <Text style={styles.childAvatarText}>{childInitial}</Text>
              </View>
              <View>
                <Text style={styles.potTitle}>{childName}'s Pot</Text>
                <Text style={styles.potSub}>Building her future</Text>
              </View>
            </View>
            <Text style={styles.heroMonthly}>↑ {gbp(0)}/mo{'\n'}average</Text>
          </View>

          {/* Balance */}
          <Text style={styles.heroBalance}>{gbp(wallet?.balance ?? 0)}</Text>
          <Text style={styles.heroBalanceSub}>building towards your next sweep</Text>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${sweepPct.toFixed(1)}%` as `${number}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {gbp(wallet?.balance ?? 0)} of {gbp(20)} sweep threshold
          </Text>

          {/* Divider */}
          <View style={styles.heroDivider} />

          {/* Stats */}
          <View style={styles.heroStats}>
            <View>
              <Text style={styles.heroStatValue}>{gbp(wallet?.total_earned ?? 0)}</Text>
              <Text style={styles.heroStatLabel}>Total to JISA</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.heroStatValue}>{gbp(0)}</Text>
              <Text style={styles.heroStatLabel}>This month</Text>
            </View>
          </View>
        </View>

        {/* ── S3: Birthday banner ──────────────────────────────────────── */}
        {birthdayDays !== null && birthdayDays <= 60 && (
          <TouchableOpacity
            style={styles.birthdayBanner}
            onPress={() => router.push('/birthday')}
            activeOpacity={0.85}
          >
            <Text style={styles.birthdayTitle}>
              🎂 {childName}'s birthday is in {birthdayDays} days
            </Text>
            <Text style={styles.birthdayLink}>Create her wishlist →</Text>
          </TouchableOpacity>
        )}

        {/* ── S4: Quick actions ────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionsContent}
          style={styles.actionsRow}
        >
          {([
            { icon: '🛍️', label: 'Buy gift cards', onPress: () => router.push('/(tabs)/shop') },
            { icon: '🎁', label: 'Gift registry',  onPress: () => router.push('/birthday') },
            { icon: '👨‍👩‍👧', label: 'Invite family', onPress: () => comingSoon('Invite family') },
            { icon: '🏷️', label: 'View offers',   onPress: () => router.push('/(tabs)/offers') },
          ] as const).map((a) => (
            <TouchableOpacity key={a.label} style={styles.actionChip} onPress={a.onPress} activeOpacity={0.8}>
              <Text style={styles.actionIcon}>{a.icon}</Text>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── S5: Projection nudge ─────────────────────────────────────── */}
        <View style={styles.projectionCard}>
          <Text style={styles.projPre}>📈 At this rate, {childName} will have</Text>
          <Text style={styles.projValue}>{formatGBP(projectedValue)}</Text>
          <Text style={styles.projPost}>by age 18</Text>
          <Text style={styles.projDisclaimer}>
            Illustrative projection at 8% p.a. — not a guarantee
          </Text>
        </View>

        {/* ── S6: Recent activity ──────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Recent activity</Text>
        <View style={styles.activityList}>
          {contributions.length === 0 ? (
            <Text style={styles.emptyActivity}>
              No activity yet — buy your first gift card to start earning cashback
            </Text>
          ) : (
            contributions.map((item) => {
              const activityType = (item.type as ActivityType) in ACTIVITY_ICON
                ? (item.type as ActivityType)
                : 'gift_card'
              const formattedDate = new Date(item.created_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
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

        {/* ── S7: Products rail ────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Amplifi products</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productsContent}
          style={{ marginBottom: 0 }}
        >
          {/* Spark — active */}
          <View style={styles.productActive}>
            <Text style={styles.productNameActive}>✨ Spark</Text>
            <Text style={styles.productSubActive}>Junior ISA cashback</Text>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          </View>

          {/* Launchpad — locked */}
          <TouchableOpacity
            style={styles.productLocked}
            onPress={() => Alert.alert('Launchpad', 'Coming soon. Join the waitlist to be first to know.')}
            activeOpacity={0.8}
          >
            <Text style={styles.lockEmoji}>🔒</Text>
            <Text style={styles.productNameLocked}>🚀 Launchpad</Text>
            <Text style={styles.productSubLocked}>First home deposit</Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Coming soon</Text>
            </View>
          </TouchableOpacity>

          {/* Legacy — locked */}
          <TouchableOpacity
            style={styles.productLocked}
            onPress={() => Alert.alert('Legacy', 'Coming soon. Join the waitlist to be first to know.')}
            activeOpacity={0.8}
          >
            <Text style={styles.lockEmoji}>🔒</Text>
            <Text style={styles.productNameLocked}>🏛️ Legacy</Text>
            <Text style={styles.productSubLocked}>Estate coordination</Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Coming soon</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

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
  bell: { fontSize: 20 },
  profileCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.midnight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: { color: '#ffffff', fontSize: 13, fontWeight: '700' },

  // Hero card
  heroCard: {
    backgroundColor: colors.midnight,
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 20,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  childAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  childAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarText: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  potTitle: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  potSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 },
  heroMonthly: {
    color: colors.sky,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    lineHeight: 18,
  },
  heroBalance: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: 6,
  },
  heroBalanceSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(89,201,233,0.25)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { height: 6, backgroundColor: colors.sky, borderRadius: 3 },
  progressLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 16 },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 16 },
  heroStats: { flexDirection: 'row', justifyContent: 'space-between' },
  heroStatValue: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  heroStatLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },

  // Birthday banner
  birthdayBanner: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: 14,
    marginHorizontal: 16,
    padding: 14,
    marginBottom: 16,
  },
  birthdayTitle: { fontSize: 14, fontWeight: '600', color: colors.midnight, marginBottom: 4 },
  birthdayLink: { fontSize: 14, fontWeight: '600', color: colors.azure },

  // Quick actions
  actionsRow: { marginBottom: 16 },
  actionsContent: { paddingHorizontal: 16, paddingVertical: 4, gap: 10 },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.midnight,
    borderRadius: 100,
    backgroundColor: '#ffffff',
  },
  actionIcon: { fontSize: 15 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: colors.midnight },

  // Projection
  projectionCard: {
    backgroundColor: colors.offwhite,
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    marginBottom: 24,
  },
  projPre: { fontSize: 14, color: '#475569', marginBottom: 4 },
  projValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.sky,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  projPost: { fontSize: 14, color: '#64748b', marginBottom: 8 },
  projDisclaimer: { fontSize: 11, color: '#94a3b8' },

  // Activity
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.midnight,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  activityList: { marginBottom: 24 },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  activityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activityIcon: { fontSize: 18 },
  activityMid: { flex: 1 },
  activityDesc: { fontSize: 14, fontWeight: '600', color: colors.midnight },
  activityDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  activityCashback: { fontSize: 14, fontWeight: '700', color: '#16a34a' },
  activitySweep: { fontSize: 14, fontWeight: '700', color: colors.azure },
  emptyActivity: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    padding: 20,
  },

  // Products
  productsContent: { paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  productActive: {
    width: 160,
    height: 100,
    borderRadius: 14,
    padding: 14,
    backgroundColor: colors.sky,
    justifyContent: 'space-between',
  },
  productLocked: {
    width: 160,
    height: 100,
    borderRadius: 14,
    padding: 14,
    backgroundColor: colors.midnight,
    opacity: 0.7,
    justifyContent: 'space-between',
  },
  lockEmoji: { position: 'absolute', top: 10, right: 12, fontSize: 12 },
  productNameActive: { fontSize: 15, fontWeight: '700', color: colors.midnight },
  productNameLocked: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  productSubActive: { fontSize: 12, color: `${colors.midnight}b3` },
  productSubLocked: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  activeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  activeBadgeText: { fontSize: 11, fontWeight: '700', color: colors.midnight },
  comingSoonBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  comingSoonText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
})
