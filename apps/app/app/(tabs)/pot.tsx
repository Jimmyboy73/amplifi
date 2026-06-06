import { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native'
import Slider from '@react-native-community/slider'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fv, formatGBP } from '@/lib/projections'
import { colors } from '@/constants/brand'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

type ContributionType = 'gift_card' | 'sweep' | 'family'

interface Contribution {
  id: string
  date: string
  description: string
  amount: number
  type: ContributionType
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CONTRIBUTION_ICON: Record<ContributionType, string> = {
  gift_card: '🛍️',
  sweep: '↑',
  family: '👨‍👩‍👧',
}

const CONTRIBUTION_BG: Record<ContributionType, string> = {
  gift_card: `${colors.sky}26`,
  sweep: `${colors.azure}26`,
  family: `${colors.amber}26`,
}

function gbp(n: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PotScreen() {
  const { user } = useAuth()

  const [child, setChild] = useState<{ id: string; name: string; date_of_birth: string } | null>(null)
  const [wallet, setWallet] = useState<{ balance: number; total_earned: number } | null>(null)
  const [rawContributions, setRawContributions] = useState<Array<{
    id: string; type: string; description: string; amount: number; created_at: string
  }>>([])
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

      if (childData) setChild(childData)

      const { data: walletData } = await supabase
        .from('wallets')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (walletData) setWallet(walletData)

      if (childData) {
        const { data: contribData } = await supabase
          .from('contributions')
          .select('*')
          .eq('child_id', childData.id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (contribData) setRawContributions(contribData)
      }

      setIsLoading(false)
    }
    fetchData()
  }, [user])

  const childName = child?.name ?? 'Your child'

  const childAgeMonths = child?.date_of_birth
    ? Math.floor((Date.now() - new Date(child.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0

  const totalToJISA = wallet?.total_earned ?? 0

  const now = new Date()
  const thisMonth = rawContributions
    .filter((c) => {
      const d = new Date(c.created_at)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, c) => sum + (c.amount || 0), 0)
  const thisYear = rawContributions
    .filter((c) => new Date(c.created_at).getFullYear() === now.getFullYear())
    .reduce((sum, c) => sum + (c.amount || 0), 0)

  const contributions: Contribution[] = rawContributions.map((c) => ({
    id: c.id,
    date: new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    description: c.description,
    amount: c.amount,
    type: (c.type as ContributionType) in CONTRIBUTION_ICON
      ? (c.type as ContributionType)
      : 'gift_card',
  }))

  const monthsTo18 = Math.max(0, 18 * 12 - childAgeMonths)
  const monthsTo25 = Math.max(0, 25 * 12 - childAgeMonths)
  const monthsTo65 = Math.max(0, 65 * 12 - childAgeMonths)

  const proj18 = fv(sliderValue, monthsTo18)
  const proj25 = fv(sliderValue, monthsTo25)
  const proj65 = fv(sliderValue, monthsTo65)

  const earlyStart = fv(50, 65 * 12 - childAgeMonths)
  const lateStart  = fv(50, (65 - 30) * 12)

  const handleShare = () => {
    Share.share({
      message: `${childName}'s JISA pot is growing! We've been using Amplifi to turn our everyday shopping into her financial future. 🎉`,
    }).catch(() => {})
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.offwhite, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.sky} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── S1: Header card ──────────────────────────────────────────── */}
        <View style={styles.headerCard}>
          <Text style={styles.headerName}>{childName}'s Pot</Text>
          <Text style={styles.headerTagline}>Building her future, one shop at a time</Text>

          <Text style={styles.headerTotal}>{gbp(totalToJISA)}</Text>
          <Text style={styles.headerTotalLabel}>total contributed to JISA</Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{gbp(thisMonth)}</Text>
              <Text style={styles.statLabel}>This month</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{gbp(thisYear)}</Text>
              <Text style={styles.statLabel}>This year</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{contributions.length}</Text>
              <Text style={styles.statLabel}>Contributions</Text>
            </View>
          </View>
        </View>

        {/* ── S2: Projection slider ────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📈 What could {childName} have?</Text>
          <Text style={styles.cardSubtitle}>
            Adjust your monthly cashback to see the impact
          </Text>

          <View style={styles.sliderLabelRow}>
            <Text style={styles.sliderLabel}>
              Monthly cashback: <Text style={styles.sliderLabelBold}>{gbp(sliderValue)}</Text>
            </Text>
            <Text style={styles.sliderEdit}>Edit</Text>
          </View>

          <Slider
            style={styles.slider}
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
              <Text style={[styles.projValue, { color: colors.sky }]}>{formatGBP(proj18)}</Text>
              <Text style={styles.projSub}>ISA matures</Text>
            </View>
            <View style={styles.projCard}>
              <Text style={styles.projLabel}>Age 25</Text>
              <Text style={[styles.projValue, { color: colors.midnight }]}>{formatGBP(proj25)}</Text>
              <Text style={styles.projSub}>First home?</Text>
            </View>
            <View style={styles.projCard}>
              <Text style={styles.projLabel}>Age 65</Text>
              <Text style={[styles.projValue, { color: colors.azure }]}>{formatGBP(proj65)}</Text>
              <Text style={styles.projSub}>Retirement</Text>
            </View>
          </View>

          <Text style={styles.disclaimer}>
            Illustrative projection at 8% p.a. compounded monthly. Not a guarantee.
          </Text>
        </View>

        {/* ── S3: Compounding callout ──────────────────────────────────── */}
        <View style={styles.compoundCard}>
          <Text style={styles.compoundTitle}>⚡ The power of starting early</Text>

          <View style={styles.compoundRow}>
            <Text style={styles.compoundLeft}>Starting today</Text>
            <Text style={styles.compoundRight}>{formatGBP(earlyStart)} by age 65</Text>
          </View>
          <View style={styles.compoundRow}>
            <Text style={styles.compoundLeft}>Starting at 30</Text>
            <Text style={styles.compoundRightDim}>{formatGBP(lateStart)} by age 65</Text>
          </View>

          <View style={styles.compoundDivider} />
          <Text style={styles.compoundBottom}>
            11.6× more wealth. Same monthly amount.{'\n'}The difference is when you start.
          </Text>
        </View>

        {/* ── S4: Family contributors ──────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👨‍👩‍👧 Family network</Text>

          <Text style={styles.emptyText}>No family contributors yet</Text>

          <TouchableOpacity
            onPress={() => Alert.alert('Invite family', 'Invite family coming soon')}
            activeOpacity={0.7}
            style={{ marginTop: 14 }}
          >
            <Text style={styles.inviteLink}>+ Invite more family</Text>
          </TouchableOpacity>
        </View>

        {/* ── S5: Milestone card ───────────────────────────────────────── */}
        <View style={styles.milestoneCard}>
          <View style={styles.milestoneTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.milestoneTitle}>🎉 {childName}'s pot is growing!</Text>
              <Text style={styles.milestoneSub}>Share this milestone with family</Text>
            </View>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
              <Text style={styles.shareBtnText}>Share →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── S6: Contribution timeline ────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contribution history</Text>

          {contributions.length === 0 ? (
            <Text style={styles.emptyText}>No contributions yet</Text>
          ) : (
            contributions.map((c) => (
              <View key={c.id} style={styles.contribRow}>
                <View style={[styles.contribIcon, { backgroundColor: CONTRIBUTION_BG[c.type] }]}>
                  <Text style={styles.contribIconText}>{CONTRIBUTION_ICON[c.type]}</Text>
                </View>
                <View style={styles.contribMid}>
                  <Text style={styles.contribDesc}>{c.description}</Text>
                  <Text style={styles.contribDate}>{c.date}</Text>
                </View>
                {c.type === 'sweep' ? (
                  <Text style={styles.contribSweep}>→ JISA</Text>
                ) : (
                  <Text style={styles.contribAmount}>+{gbp(c.amount)}</Text>
                )}
              </View>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.offwhite },

  // Header card
  headerCard: {
    backgroundColor: colors.midnight,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    marginBottom: 16,
  },
  headerName: { fontSize: 28, fontWeight: '800', color: '#ffffff', letterSpacing: -0.5 },
  headerTagline: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  headerTotal: {
    fontSize: 48,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1.5,
    marginTop: 16,
    lineHeight: 56,
  },
  headerTotalLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 16,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'center',
  },

  // Shared card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.midnight,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 19,
  },

  // Slider
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sliderLabel: { fontSize: 14, color: '#475569' },
  sliderLabelBold: { fontWeight: '700', color: colors.midnight },
  sliderEdit: { fontSize: 14, color: colors.sky, fontWeight: '600' },
  slider: { width: '100%', height: 40, marginBottom: 4 },

  // Projection cards
  projRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  projCard: {
    flex: 1,
    backgroundColor: colors.offwhite,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  projLabel: { fontSize: 11, color: '#64748b', marginBottom: 4 },
  projValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center' },
  projSub: { fontSize: 10, color: '#94a3b8', marginTop: 3 },
  disclaimer: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },

  // Compounding callout
  compoundCard: {
    backgroundColor: colors.midnight,
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 20,
    marginBottom: 16,
  },
  compoundTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  compoundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  compoundLeft: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  compoundRight: { fontSize: 15, fontWeight: '700', color: colors.sky },
  compoundRightDim: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  compoundDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 12,
  },
  compoundBottom: {
    fontSize: 13,
    color: '#ffffff',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Family contributors
  inviteLink: { fontSize: 14, color: colors.sky, fontWeight: '600' },
  emptyText: { fontSize: 14, color: '#94a3b8', paddingVertical: 8 },

  // Milestone card
  milestoneCard: {
    backgroundColor: `${colors.sky}1A`,
    borderWidth: 1,
    borderColor: `${colors.sky}66`,
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 20,
    marginBottom: 16,
  },
  milestoneTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.midnight,
  },
  milestoneSub: { fontSize: 13, color: '#64748b', marginTop: 4 },
  shareBtn: {
    backgroundColor: colors.sky,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexShrink: 0,
  },
  shareBtnText: { color: colors.midnight, fontSize: 14, fontWeight: '700' },

  // Contribution history
  contribRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  contribIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  contribIconText: { fontSize: 16 },
  contribMid: { flex: 1 },
  contribDesc: { fontSize: 14, fontWeight: '600', color: colors.midnight },
  contribDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  contribAmount: { fontSize: 14, fontWeight: '700', color: '#16a34a' },
  contribSweep: { fontSize: 13, fontWeight: '700', color: colors.azure },
})
