import { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '@/constants/brand'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

type ContribType = 'gift_card' | 'sweep' | 'family'

// ── Helpers ───────────────────────────────────────────────────────────────────

const CONTRIB_ICON: Record<ContribType, string> = {
  gift_card: '🛍️',
  sweep: '↑',
  family: '👨‍👩‍👧',
}

const CONTRIB_BG: Record<ContribType, string> = {
  gift_card: `${colors.sky}33`,
  sweep: `${colors.azure}33`,
  family: `${colors.amber}33`,
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

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.offwhite, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.sky} />
      </View>
    )
  }

  const childName = child?.name ?? 'Your child'
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

  const contributions = rawContributions.map((c) => ({
    id: c.id,
    date: new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    description: c.description,
    amount: c.amount,
    type: (c.type as ContribType) in CONTRIB_ICON ? (c.type as ContribType) : ('gift_card' as ContribType),
  }))

  const handleShare = () => {
    Share.share({
      message: `${childName}'s JISA pot has received ${gbp(totalToJISA)}! We've been using Amplifi to turn our everyday shopping into her financial future. 🎉`,
    }).catch(() => {})
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── S1: Summary header ───────────────────────────────────────── */}
        <View style={styles.headerCard}>
          <Text style={styles.headerName}>{childName}'s contributions</Text>

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
              <Text style={styles.statLabel}>Count</Text>
            </View>
          </View>
        </View>

        {/* ── S2: Contribution timeline ────────────────────────────────── */}
        <Text style={styles.sectionTitle}>All contributions</Text>

        <View style={styles.contribList}>
          {contributions.length === 0 ? (
            <Text style={styles.emptyText}>
              No contributions yet — buy your first gift card to start earning cashback
            </Text>
          ) : (
            contributions.map((c) => (
              <View key={c.id} style={styles.contribRow}>
                <View style={[styles.contribIconWrap, { backgroundColor: CONTRIB_BG[c.type] }]}>
                  <Text style={styles.contribIcon}>{CONTRIB_ICON[c.type]}</Text>
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

        {/* ── S3: Milestone card ───────────────────────────────────────── */}
        {totalToJISA > 0 && (
          <View style={styles.milestoneCard}>
            <View style={styles.milestoneRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.milestoneTitle}>
                  🎉 {childName}'s pot has received {gbp(totalToJISA)}
                </Text>
                <Text style={styles.milestoneSub}>Share this milestone with family</Text>
              </View>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
                <Text style={styles.shareBtnText}>Share →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.offwhite },

  headerCard: {
    backgroundColor: colors.midnight,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    marginBottom: 16,
  },
  headerName: { fontSize: 24, fontWeight: '700', color: '#ffffff', letterSpacing: -0.3 },
  headerTotal: {
    fontSize: 42, fontWeight: '800', color: '#ffffff',
    letterSpacing: -1.5, marginTop: 12, lineHeight: 50,
  },
  headerTotalLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 20, borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 16,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center' },

  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: colors.midnight,
    paddingHorizontal: 16, marginBottom: 4,
  },

  contribList: { marginBottom: 16 },
  contribRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12,
    backgroundColor: '#ffffff',
  },
  contribIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  contribIcon: { fontSize: 18 },
  contribMid: { flex: 1 },
  contribDesc: { fontSize: 14, fontWeight: '600', color: colors.midnight },
  contribDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  contribAmount: { fontSize: 14, fontWeight: '700', color: '#16a34a' },
  contribSweep: { fontSize: 13, fontWeight: '700', color: colors.azure },
  emptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', padding: 24 },

  milestoneCard: {
    backgroundColor: `${colors.sky}1A`,
    borderWidth: 1, borderColor: `${colors.sky}66`,
    borderRadius: 20, marginHorizontal: 16, padding: 20, marginBottom: 16,
  },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  milestoneTitle: { fontSize: 15, fontWeight: '700', color: colors.midnight },
  milestoneSub: { fontSize: 13, color: '#64748b', marginTop: 4 },
  shareBtn: {
    backgroundColor: colors.sky, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, flexShrink: 0,
  },
  shareBtnText: { color: colors.midnight, fontSize: 14, fontWeight: '700' },
})
