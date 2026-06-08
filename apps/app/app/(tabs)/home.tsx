import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import Slider from '@react-native-community/slider'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fv } from '@/lib/projections'
import { colors } from '@/constants/brand'
import { useHandle } from '@/lib/useHandle'

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

// ── Screen ────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter()
  const { user, signOut } = useAuth()

  const { handle, refetch: refetchHandle } = useHandle()

  useFocusEffect(
    useCallback(() => {
      refetchHandle()
    }, [refetchHandle])
  )

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

  const [childPhoto, setChildPhoto] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sliderValue, setSliderValue] = useState(20)

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      setIsLoading(true)

      const { data: childData } = await supabase
        .from('children')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (childData) {
        setChild(childData)
        if (childData.photo_url) setChildPhoto(childData.photo_url)
      }

      const { data: walletData } = await supabase
        .from('wallets')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (walletData) {
        setWallet(walletData)
        setSliderValue(walletData.balance ?? 20)
      }

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

  useEffect(() => {
    if (isLoading) return
    let current = 10
    const target = 50
    const steps = 40
    const increment = (target - current) / steps
    const timer = setInterval(() => {
      current += increment
      if (current >= target) {
        setSliderValue(target)
        clearInterval(timer)
      } else {
        setSliderValue(Math.round(current))
      }
    }, 2000 / steps)
    return () => clearInterval(timer)
  }, [isLoading])

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.sky} />
      </View>
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
            <Text style={styles.bell}>🔔</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                Alert.alert('Your account', '', [
                  { text: 'Profile', onPress: () => router.push('/settings/profile') },
                  { text: handle ? `Your Handle (@${handle})` : 'Your Handle (Not set)', onPress: () => router.push('/settings/handle') },
                  { text: 'Payment settings', onPress: () => router.push('/settings/payment') },
                  { text: 'Referral code', onPress: () => router.push('/settings/referral') },
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
          <View style={styles.heroTopRow}>
            <View style={styles.childAvatar}>
              {childPhoto ? (
                <Image source={{ uri: childPhoto }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.childAvatarText}>{childInitial}</Text>
              )}
            </View>
            <Text style={styles.potTitle}>{childName}'s Pot</Text>
            <Text style={styles.potSub}>Building {child?.name ?? 'her'}'s future</Text>
          </View>

          <Text style={styles.heroBalance}>{gbp(wallet?.total_earned ?? 0)}</Text>
          <Text style={styles.heroBalanceSub}>total in {childName}'s JISA</Text>
        </View>

        {/* ── S3: Quick actions ────────────────────────────────────────── */}
        <Text style={styles.actionsTitle}>Ways to grow {child?.name ?? 'your child'}'s pot</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionsContent}
          style={styles.actionsRow}
        >
          {([
            { icon: '👨‍👩‍👧', label: 'Family Network', onPress: () => router.push('/(tabs)/family') },
            { icon: '🎁', label: 'Occasions',       onPress: () => router.push('/birthday') },
            { icon: '💳', label: 'Cashback',        onPress: () => router.push('/(tabs)/offers') },
            { icon: '🎯', label: 'Loyalty offers',  onPress: () => router.push('/(tabs)/shop') },
          ] as const).map((a) => (
            <TouchableOpacity key={a.label} style={styles.actionChip} onPress={a.onPress} activeOpacity={0.8}>
              <Text style={styles.actionIcon}>{a.icon}</Text>
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
            maximumValue={500}
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
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.midnight,
    alignItems: 'center', justifyContent: 'center',
  },
  profileInitial: { color: '#ffffff', fontSize: 13, fontWeight: '700' },

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
  heroTopRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
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

})
