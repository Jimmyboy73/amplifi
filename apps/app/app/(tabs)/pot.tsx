import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
} from 'react-native'
import Slider from '@react-native-community/slider'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fv, formatGBP } from '@/lib/projections'
import { colors } from '@/constants/brand'

// ── Types ─────────────────────────────────────────────────────────────────────

type ContributionType = 'gift_card' | 'sweep' | 'family'

interface Contribution {
  id: string
  date: string
  description: string
  amount: number
  type: ContributionType
}

interface FamilyContributor {
  id: string
  name: string
  initial: string
  totalThisYear: number
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const CHILD = {
  name: 'Olivia',
  ageMonths: 36,
  totalToJISA: 487.30,
  thisMonth: 22.40,
  thisYear: 187.20,
  monthlyAverage: 22.40,
}

const CONTRIBUTIONS: Contribution[] = [
  { id: '1', date: 'Today',      description: 'Tesco gift card cashback',  amount: 3.00,  type: 'gift_card' },
  { id: '2', date: 'Yesterday',  description: 'Swept to JISA',             amount: 22.40, type: 'sweep' },
  { id: '3', date: '3 Jun',      description: 'M&S gift card cashback',    amount: 4.00,  type: 'gift_card' },
  { id: '4', date: '28 May',     description: 'Grandma contributed',       amount: 50.00, type: 'family' },
  { id: '5', date: '21 May',     description: 'Swept to JISA',             amount: 45.80, type: 'sweep' },
  { id: '6', date: '14 May',     description: 'Sainsburys gift card',      amount: 2.50,  type: 'gift_card' },
  { id: '7', date: '1 May',      description: 'Swept to JISA',             amount: 38.20, type: 'sweep' },
]

const FAMILY_CONTRIBUTORS: FamilyContributor[] = [
  { id: '1', name: 'Grandma',   initial: 'G', totalThisYear: 340.00 },
  { id: '2', name: 'Uncle Tom', initial: 'U', totalThisYear: 50.00 },
]

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
  const [sliderValue, setSliderValue] = useState(CHILD.monthlyAverage)

  const monthsTo18 = Math.max(0, 18 * 12 - CHILD.ageMonths)
  const monthsTo25 = Math.max(0, 25 * 12 - CHILD.ageMonths)
  const monthsTo65 = Math.max(0, 65 * 12 - CHILD.ageMonths)

  const proj18 = fv(sliderValue, monthsTo18)
  const proj25 = fv(sliderValue, monthsTo25)
  const proj65 = fv(sliderValue, monthsTo65)

  // Compounding callout — hardcoded £50/month illustration
  const earlyStart = fv(50, 65 * 12 - CHILD.ageMonths)
  const lateStart  = fv(50, (65 - 30) * 12)

  const handleShare = () => {
    Share.share({
      message: `${CHILD.name}'s JISA pot just hit £487! We've been using Amplifi to turn our everyday shopping into her financial future. 🎉`,
    }).catch(() => {})
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── S1: Header card ──────────────────────────────────────────── */}
        <View style={styles.headerCard}>
          <Text style={styles.headerName}>{CHILD.name}'s Pot</Text>
          <Text style={styles.headerTagline}>Building her future, one shop at a time</Text>

          <Text style={styles.headerTotal}>{gbp(CHILD.totalToJISA)}</Text>
          <Text style={styles.headerTotalLabel}>total contributed to JISA</Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{gbp(CHILD.thisMonth)}</Text>
              <Text style={styles.statLabel}>This month</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{gbp(CHILD.thisYear)}</Text>
              <Text style={styles.statLabel}>This year</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{CONTRIBUTIONS.length}</Text>
              <Text style={styles.statLabel}>Contributions</Text>
            </View>
          </View>
        </View>

        {/* ── S2: Projection slider ────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📈 What could {CHILD.name} have?</Text>
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

          {FAMILY_CONTRIBUTORS.map((fc) => (
            <View key={fc.id} style={styles.contributorRow}>
              <View style={styles.contributorAvatar}>
                <Text style={styles.contributorInitial}>{fc.initial}</Text>
              </View>
              <Text style={styles.contributorName}>{fc.name}</Text>
              <Text style={styles.contributorAmount}>{gbp(fc.totalThisYear)} this year</Text>
            </View>
          ))}

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
            <View>
              <Text style={styles.milestoneTitle}>🎉 {CHILD.name}'s pot hit £487!</Text>
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

          {CONTRIBUTIONS.map((c) => (
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
          ))}
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
  contributorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  contributorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  contributorInitial: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  contributorName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.midnight },
  contributorAmount: { fontSize: 13, color: '#64748b' },
  inviteLink: { fontSize: 14, color: colors.sky, fontWeight: '600' },

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
    flex: 1,
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
