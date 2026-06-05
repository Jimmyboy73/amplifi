import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fv, formatGBP } from '@/lib/projections'
import { colors } from '@/constants/brand'

// ── Types ─────────────────────────────────────────────────────────────────────

type ActivityType = 'gift_card' | 'sweep' | 'family'

interface Activity {
  id: string
  type: ActivityType
  description: string
  cashback?: number
  amount?: number
  date: string
}

interface MockChild {
  name: string
  age: number
  photoInitial: string
  walletBalance: number
  sweepThreshold: number
  totalSweptToJISA: number
  monthlyAverage: number
  birthdayDays: number
  recentActivity: Activity[]
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const mockChild: MockChild = {
  name: 'Olivia',
  age: 3,
  photoInitial: 'O',
  walletBalance: 14.20,
  sweepThreshold: 20.00,
  totalSweptToJISA: 487.30,
  monthlyAverage: 22.40,
  birthdayDays: 23,
  recentActivity: [
    { id: '1', type: 'gift_card', description: 'Tesco gift card',    cashback: 3.00,  date: 'Today' },
    { id: '2', type: 'sweep',     description: 'Swept to JISA',      amount:  22.40,  date: 'Yesterday' },
    { id: '3', type: 'gift_card', description: 'M&S gift card',      cashback: 4.00,  date: '3 days ago' },
    { id: '4', type: 'family',    description: 'Grandma contributed', cashback: 50.00, date: 'Last week' },
  ],
}

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

  const sweepPct = Math.min(mockChild.walletBalance / mockChild.sweepThreshold, 1) * 100
  const monthsRemaining = (18 - mockChild.age) * 12
  const projectedValue = fv(mockChild.monthlyAverage, monthsRemaining)

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
            <View style={styles.profileCircle}>
              <Text style={styles.profileInitial}>J</Text>
            </View>
          </View>
        </View>

        {/* ── S2: Hero pot card ────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          {/* Avatar + name row */}
          <View style={styles.heroTopRow}>
            <View style={styles.childAvatarRow}>
              <View style={styles.childAvatar}>
                <Text style={styles.childAvatarText}>{mockChild.photoInitial}</Text>
              </View>
              <View>
                <Text style={styles.potTitle}>{mockChild.name}'s Pot</Text>
                <Text style={styles.potSub}>Building her future</Text>
              </View>
            </View>
            <Text style={styles.heroMonthly}>↑ {gbp(mockChild.monthlyAverage)}/mo{'\n'}average</Text>
          </View>

          {/* Balance */}
          <Text style={styles.heroBalance}>{gbp(mockChild.walletBalance)}</Text>
          <Text style={styles.heroBalanceSub}>building towards your next sweep</Text>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${sweepPct.toFixed(1)}%` as `${number}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {gbp(mockChild.walletBalance)} of {gbp(mockChild.sweepThreshold)} sweep threshold
          </Text>

          {/* Divider */}
          <View style={styles.heroDivider} />

          {/* Stats */}
          <View style={styles.heroStats}>
            <View>
              <Text style={styles.heroStatValue}>{gbp(mockChild.totalSweptToJISA)}</Text>
              <Text style={styles.heroStatLabel}>Total to JISA</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.heroStatValue}>{gbp(mockChild.monthlyAverage)}</Text>
              <Text style={styles.heroStatLabel}>This month</Text>
            </View>
          </View>
        </View>

        {/* ── S3: Birthday banner ──────────────────────────────────────── */}
        {mockChild.birthdayDays <= 60 && (
          <TouchableOpacity
            style={styles.birthdayBanner}
            onPress={() => Alert.alert('Coming soon', 'Birthday registry coming soon')}
            activeOpacity={0.85}
          >
            <Text style={styles.birthdayTitle}>
              🎂 {mockChild.name}'s birthday is in {mockChild.birthdayDays} days
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
            { icon: '🎂', label: 'Birthday list',  onPress: () => comingSoon('Birthday list') },
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
          <Text style={styles.projPre}>📈 At this rate, {mockChild.name} will have</Text>
          <Text style={styles.projValue}>{formatGBP(projectedValue)}</Text>
          <Text style={styles.projPost}>by age 18</Text>
          <Text style={styles.projDisclaimer}>
            Illustrative projection at 8% p.a. — not a guarantee
          </Text>
        </View>

        {/* ── S6: Recent activity ──────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Recent activity</Text>
        <View style={styles.activityList}>
          {mockChild.recentActivity.map((item) => (
            <View key={item.id} style={styles.activityRow}>
              <View style={[styles.activityIconWrap, { backgroundColor: ACTIVITY_ICON_BG[item.type] }]}>
                <Text style={styles.activityIcon}>{ACTIVITY_ICON[item.type]}</Text>
              </View>
              <View style={styles.activityMid}>
                <Text style={styles.activityDesc}>{item.description}</Text>
                <Text style={styles.activityDate}>{item.date}</Text>
              </View>
              {item.type === 'sweep' ? (
                <Text style={styles.activitySweep}>→ JISA</Text>
              ) : (
                <Text style={styles.activityCashback}>+{gbp(item.cashback ?? 0)}</Text>
              )}
            </View>
          ))}
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
