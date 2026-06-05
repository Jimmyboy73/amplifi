import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '@/constants/brand'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CloOffer {
  id: string
  merchant: string
  category: string
  cashbackPercent: number
  logo: string
  color: string
  description: string
}

interface ActivatedOffer {
  id: string
  merchant: string
  category: string
  cashbackPercent: number
  logo: string
  color: string
  description: string
  expiry: string
  activated: boolean
}

interface Challenge {
  id: string
  merchant: string
  challenge: string
  reward: number
  progress: number
  target: number
  logo: string
  color: string
  expiry: string
  status: 'active' | 'completed'
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const CHILD_NAME = 'Olivia'
const MISSED_CASHBACK = 89.00

const CLO_OFFERS: CloOffer[] = [
  { id: '1', merchant: 'Waitrose',     category: 'Groceries', cashbackPercent: 2, logo: 'W',  color: '#007A3B', description: 'Always on — use your linked card' },
  { id: '2', merchant: 'Costa Coffee', category: 'Dining',    cashbackPercent: 3, logo: 'C',  color: '#6B2737', description: 'Always on — use your linked card' },
  { id: '3', merchant: 'Boots',        category: 'Health',    cashbackPercent: 2, logo: 'B',  color: '#003DA5', description: 'Always on — use your linked card' },
]

const INITIAL_ACTIVATED: ActivatedOffer[] = [
  { id: '4', merchant: 'Holland & Barrett', category: 'Health',   cashbackPercent: 8,  logo: 'H',  color: '#4CAF50', description: 'Spend £20+ in one transaction', expiry: '30 Jun', activated: false },
  { id: '5', merchant: 'Pizza Express',     category: 'Dining',   cashbackPercent: 10, logo: 'PE', color: '#003087', description: 'Dine in only. Min spend £15.',   expiry: '15 Jun', activated: true },
  { id: '6', merchant: 'Clarks',            category: 'Fashion',  cashbackPercent: 7,  logo: 'Cl', color: '#8B4513', description: 'Online and in-store',            expiry: '30 Jun', activated: false },
]

const CHALLENGES: Challenge[] = [
  { id: '7', merchant: 'Costa Coffee', challenge: 'Visit 6 times in June',   reward: 3.00, progress: 3, target: 6, logo: 'C',  color: '#6B2737', expiry: '30 Jun', status: 'active' },
  { id: '8', merchant: "Nando's",      challenge: 'Spend £50 this month',    reward: 5.00, progress: 0, target: 1, logo: "N'", color: '#C8102E', expiry: '30 Jun', status: 'active' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function gbp(n: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n)
}

// ── Activated offer item ──────────────────────────────────────────────────────

function ActivatedOfferItem({ offer }: { offer: ActivatedOffer }) {
  const [isActivated, setIsActivated] = useState(offer.activated)
  const [justActivated, setJustActivated] = useState(false)

  const handleActivate = () => {
    setIsActivated(true)
    setJustActivated(true)
    setTimeout(() => setJustActivated(false), 1200)
  }

  return (
    <View style={act.card}>
      <View style={act.row}>
        <View style={[act.logo, { backgroundColor: offer.color }]}>
          <Text style={act.logoText}>{offer.logo}</Text>
        </View>
        <View style={act.mid}>
          <Text style={act.name}>{offer.merchant}</Text>
          <Text style={act.desc}>{offer.description}</Text>
          <Text style={act.expiry}>Expires {offer.expiry}</Text>
        </View>
        <View style={act.right}>
          <Text style={act.pct}>{offer.cashbackPercent}%</Text>
          <Text style={act.pctLabel}>cashback</Text>
        </View>
      </View>
      {isActivated ? (
        <View style={[act.btn, act.btnActive]}>
          <Text style={act.btnActiveText}>
            {justActivated ? 'Activated! ✓' : 'Active ✓'}
          </Text>
        </View>
      ) : (
        <TouchableOpacity style={act.btn} onPress={handleActivate} activeOpacity={0.85}>
          <Text style={act.btnText}>Activate offer</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function OffersScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* S1 — Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Offers & Challenges</Text>
          <Text style={styles.subtitle}>Earn cashback for {CHILD_NAME}'s JISA</Text>
        </View>

        {/* S2 — Missed cashback banner */}
        {MISSED_CASHBACK > 0 && (
          <View style={styles.missedBanner}>
            <Text style={styles.missedTitle}>
              💡 Last month you spent £{MISSED_CASHBACK.toFixed(0)} at Boots without Amplifi.
            </Text>
            <Text style={styles.missedSub}>
              That was {gbp(MISSED_CASHBACK * 0.02)} {CHILD_NAME} missed.
            </Text>
          </View>
        )}

        {/* S3 — Challenges */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Challenges</Text>
          <TouchableOpacity
            onPress={() => Alert.alert(
              'What are Challenges?',
              `Challenges are merchant-funded targets. Complete the challenge and cashback goes straight to ${CHILD_NAME}'s JISA. Powered by Fidel API — coming in Phase 2.`
            )}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionLink}>What's this?</Text>
          </TouchableOpacity>
        </View>

        {CHALLENGES.map((ch) => {
          const progressPct = Math.min(ch.progress / ch.target, 1) * 100
          return (
            <View key={ch.id} style={styles.challengeCard}>
              <View style={styles.challengeTop}>
                <View style={[styles.logoCircle, { backgroundColor: ch.color }]}>
                  <Text style={styles.logoText}>{ch.logo}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.challengeName}>{ch.merchant}</Text>
                  <Text style={styles.challengeDesc}>{ch.challenge}</Text>
                </View>
                <View style={styles.rewardBadge}>
                  <Text style={styles.rewardText}>£{ch.reward.toFixed(2)} for {CHILD_NAME}</Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPct.toFixed(0)}%` as `${number}%` }]} />
              </View>
              <Text style={styles.progressLabel}>{ch.progress} of {ch.target} complete</Text>
              <Text style={styles.expiryLabel}>Expires {ch.expiry}</Text>

              <View style={styles.challengeFooter}>
                <Text style={styles.statusLabel}>
                  {ch.status === 'completed' ? '✓ Complete' : 'Active 🔥'}
                </Text>
                <Text style={styles.phaseLabel}>Phase 2 feature — coming soon</Text>
              </View>
            </View>
          )
        })}

        {/* S4 — Always-on CLO offers */}
        <View style={[styles.sectionHeader, { marginTop: 8 }]}>
          <Text style={styles.sectionTitle}>Active card offers</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Spend with your linked card — cashback is automatic
        </Text>

        {CLO_OFFERS.map((o) => (
          <View key={o.id} style={styles.cloCard}>
            <View style={[styles.logoCircle40, { backgroundColor: o.color }]}>
              <Text style={styles.logoText40}>{o.logo}</Text>
            </View>
            <View style={styles.cloMid}>
              <Text style={styles.cloName}>{o.merchant}</Text>
              <Text style={styles.cloDesc}>{o.description}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cloPct}>{o.cashbackPercent}%</Text>
              <Text style={styles.cloPctLabel}>cashback</Text>
            </View>
          </View>
        ))}

        {/* S5 — Activated offers */}
        <View style={[styles.sectionHeader, { marginTop: 8 }]}>
          <Text style={styles.sectionTitle}>Activate & earn</Text>
        </View>
        <Text style={styles.sectionSubtitle}>Tap to activate, then spend to earn</Text>

        {INITIAL_ACTIVATED.map((o) => (
          <ActivatedOfferItem key={o.id} offer={o} />
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.offwhite },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: colors.midnight, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 3 },

  missedBanner: {
    backgroundColor: 'rgba(245,158,11,0.10)',
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: 14,
    marginHorizontal: 16,
    padding: 14,
    marginBottom: 16,
  },
  missedTitle: { fontSize: 14, fontWeight: '600', color: colors.midnight },
  missedSub: { fontSize: 13, color: '#475569', marginTop: 2 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.midnight },
  sectionLink: { fontSize: 13, color: colors.sky, fontWeight: '600' },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  challengeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  challengeTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  logoCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  logoText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  challengeName: { fontSize: 15, fontWeight: '700', color: colors.midnight },
  challengeDesc: { fontSize: 14, color: '#475569', marginTop: 2 },
  rewardBadge: {
    backgroundColor: colors.sky,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  rewardText: { fontSize: 11, fontWeight: '700', color: colors.midnight },
  progressTrack: {
    height: 6, backgroundColor: `${colors.sky}33`,
    borderRadius: 3, overflow: 'hidden', marginBottom: 6,
  },
  progressFill: { height: 6, backgroundColor: colors.sky, borderRadius: 3 },
  progressLabel: { fontSize: 12, color: '#64748b', marginBottom: 3 },
  expiryLabel: { fontSize: 11, color: '#94a3b8' },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusLabel: { fontSize: 13, color: colors.sky, fontWeight: '600' },
  phaseLabel: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' },

  cloCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
  },
  logoCircle40: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  logoText40: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  cloMid: { flex: 1 },
  cloName: { fontSize: 14, fontWeight: '700', color: colors.midnight },
  cloDesc: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  cloPct: { fontSize: 20, fontWeight: '800', color: colors.sky },
  cloPctLabel: { fontSize: 11, color: '#94a3b8' },
})

const act = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  logo: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  logoText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  mid: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: colors.midnight },
  desc: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  expiry: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  right: { alignItems: 'flex-end' },
  pct: { fontSize: 20, fontWeight: '800', color: colors.midnight },
  pctLabel: { fontSize: 11, color: '#94a3b8' },
  btn: {
    backgroundColor: colors.sky,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnText: { color: colors.midnight, fontSize: 14, fontWeight: '700' },
  btnActive: { backgroundColor: '#16a34a' },
  btnActiveText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
})
