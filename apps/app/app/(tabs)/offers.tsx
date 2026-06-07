import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '@/constants/brand'
import { useCashbackOffers } from '@/lib/useCashbackOffers'
import { useCashbackBalance } from '@/lib/useCashbackBalance'

// ── Helpers ───────────────────────────────────────────────────────────────────

function gbp(n: number, decimals = 2): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

function rewardLabel(type: 'percentage' | 'fixed', value: number): string {
  return type === 'percentage' ? `${value}%` : gbp(value, 0)
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function OffersScreen() {
  const { offers, loading: offersLoading } = useCashbackOffers()
  const { pendingGbp, redeemableGbp, loading: balanceLoading } = useCashbackBalance()

  const totalCashback = pendingGbp + redeemableGbp

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header ───────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.title}>Cashback</Text>
          <Text style={styles.subtitle}>
            Earn cashback for your child's JISA every time you spend
          </Text>
        </View>

        {/* ── S1: Your cashback balance ────────────────────────────── */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Your cashback</Text>
          {balanceLoading ? (
            <ActivityIndicator size="small" color={colors.azure} style={{ marginVertical: 10 }} />
          ) : totalCashback === 0 ? (
            <>
              <Text style={styles.balanceZero}>{gbp(0)}</Text>
              <Text style={styles.balanceNudge}>
                No cashback yet — spend at an active offer below and it'll appear here.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.balanceTotal}>{gbp(totalCashback)}</Text>
              <View style={styles.balanceRow}>
                <View style={styles.balanceStat}>
                  <Text style={styles.balanceStatValue}>{gbp(pendingGbp)}</Text>
                  <Text style={styles.balanceStatLabel}>pending</Text>
                </View>
                <View style={styles.balanceDivider} />
                <View style={styles.balanceStat}>
                  <Text style={[styles.balanceStatValue, { color: '#16a34a' }]}>{gbp(redeemableGbp)}</Text>
                  <Text style={styles.balanceStatLabel}>ready to sweep</Text>
                </View>
              </View>
            </>
          )}
          <Text style={styles.balanceCaption}>
            Credits held as pending until sweep — beta behaviour
          </Text>
        </View>

        {/* ── S2: Active offers ─────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active offers</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Spend at these merchants — cashback posts automatically
        </Text>

        {offersLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.azure} />
          </View>
        ) : offers.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              No offers live yet — check back soon.
            </Text>
          </View>
        ) : (
          offers.map((offer) => (
            <View key={offer.id} style={styles.offerCard}>
              <View style={styles.offerLogoWrap}>
                <Text style={styles.offerLogoText}>
                  {(offer.merchants?.name ?? '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.offerMid}>
                <Text style={styles.offerName}>{offer.merchants?.name ?? 'Unknown merchant'}</Text>
                <Text style={styles.offerCategory}>{offer.merchants?.category ?? ''}</Text>
                <Text style={styles.offerMeta}>
                  Until {new Date(offer.active_to).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <View style={styles.offerRight}>
                <Text style={styles.offerReward}>
                  {rewardLabel(offer.reward_type, offer.reward_value)}
                </Text>
                <Text style={styles.offerRewardLabel}>cashback</Text>
              </View>
            </View>
          ))
        )}

        {/* ── S3: Phase 2 teaser ───────────────────────────────────── */}
        <View style={[styles.sectionHeader, { marginTop: 12 }]}>
          <Text style={styles.sectionTitle}>Coming in Phase 2</Text>
        </View>
        <View style={styles.phaseCard}>
          <Text style={styles.phaseItem}>⭐  Loyalty challenges</Text>
          <Text style={styles.phaseItem}>🔗  Linked-card (always-on) CLO via Fidel</Text>
          <Text style={styles.phaseItem}>📊  Spend insights &amp; missed cashback alerts</Text>
        </View>

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
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 3, lineHeight: 20 },

  // Balance card
  balanceCard: {
    backgroundColor: colors.midnight,
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 20,
    marginBottom: 20,
  },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: 6 },
  balanceTotal: { fontSize: 38, fontWeight: '800', color: '#ffffff', letterSpacing: -1, marginBottom: 12 },
  balanceZero: { fontSize: 38, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: -1, marginBottom: 8 },
  balanceNudge: { fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 19, marginBottom: 8 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  balanceStat: { flex: 1, alignItems: 'center' },
  balanceStatValue: { fontSize: 18, fontWeight: '700', color: colors.sky },
  balanceStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  balanceDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.15)' },
  balanceCaption: { fontSize: 11, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', textAlign: 'center' },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.midnight },
  sectionSubtitle: { fontSize: 13, color: '#64748b', paddingHorizontal: 16, marginBottom: 10 },

  // Loading / empty
  loadingWrap: { paddingVertical: 24, alignItems: 'center' },
  emptyWrap: {
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center' },

  // Offer cards
  offerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  offerLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.azure,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  offerLogoText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  offerMid: { flex: 1 },
  offerName: { fontSize: 14, fontWeight: '700', color: colors.midnight },
  offerCategory: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  offerMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  offerRight: { alignItems: 'flex-end', flexShrink: 0 },
  offerReward: { fontSize: 22, fontWeight: '800', color: colors.sky },
  offerRewardLabel: { fontSize: 11, color: '#94a3b8', marginTop: 1 },

  // Phase 2 teaser
  phaseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginHorizontal: 16,
    padding: 16,
    gap: 10,
  },
  phaseItem: { fontSize: 14, color: '#64748b', lineHeight: 20 },
})
