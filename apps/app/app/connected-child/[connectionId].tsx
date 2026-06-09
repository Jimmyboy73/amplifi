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
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { colors } from '@/constants/brand'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSortCode(s: string) {
  return `${s.slice(0, 2)}-${s.slice(2, 4)}-${s.slice(4, 6)}`
}

// ── Types ─────────────────────────────────────────────────────────────────────

type PageData = {
  relationship: string | null
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

  useEffect(() => {
    const load = async () => {
      if (!connectionId) return
      setLoading(true)

      // Fetch connection record
      const { data: conn, error: connErr } = await supabase
        .from('family_connections')
        .select('relationship, child_id, parent_id')
        .eq('id', connectionId)
        .eq('status', 'approved')
        .single()

      if (connErr || !conn) {
        Alert.alert('Not found', 'This connection could not be found.')
        router.back()
        return
      }

      // Fetch child, parent profile, and JISA in parallel
      const [{ data: child }, { data: parentProfile }, { data: jisa }] = await Promise.all([
        supabase.from('children').select('name, date_of_birth').eq('id', conn.child_id).single(),
        supabase.from('profiles').select('full_name, handle').eq('id', conn.parent_id).single(),
        supabase.from('jisa_accounts')
          .select('sort_code, account_number, payment_reference, provider_name')
          .eq('child_id', conn.child_id)
          .maybeSingle(),
      ])

      setData({
        relationship: conn.relationship,
        child_name: (child as { name: string; date_of_birth: string } | null)?.name ?? 'Unknown child',
        child_dob: (child as { name: string; date_of_birth: string } | null)?.date_of_birth ?? '',
        parent_name: (parentProfile as { full_name: string; handle: string | null } | null)?.full_name ?? 'Unknown',
        parent_handle: (parentProfile as { full_name: string; handle: string | null } | null)?.handle ?? null,
        sort_code: (jisa as { sort_code: string; account_number: string; payment_reference: string; provider_name: string | null } | null)?.sort_code ?? null,
        account_number: (jisa as { sort_code: string; account_number: string; payment_reference: string; provider_name: string | null } | null)?.account_number ?? null,
        payment_reference: (jisa as { sort_code: string; account_number: string; payment_reference: string; provider_name: string | null } | null)?.payment_reference ?? null,
        provider_name: (jisa as { sort_code: string; account_number: string; payment_reference: string; provider_name: string | null } | null)?.provider_name ?? null,
      })
      setLoading(false)
    }

    void load()
  }, [connectionId])

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.sky} />
      </View>
    )
  }

  if (!data) return null

  const hasJisa = !!data.sort_code

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/family')}
            activeOpacity={0.7}
            style={styles.backBtn}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{data.child_name}</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Child identity */}
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
        </View>

        {/* ISA details — to set up a standing order */}
        <Text style={styles.sectionTitle}>ISA / JISA Details</Text>
        <View style={styles.card}>
          {hasJisa ? (
            <>
              {data.provider_name && (
                <Text style={styles.provider}>{data.provider_name}</Text>
              )}
              <Text style={styles.cardHint}>
                Use these details to set up a standing order directly into {data.child_name}'s Junior ISA.
              </Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Sort code</Text>
                <Text style={styles.detailVal}>{formatSortCode(data.sort_code!)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Account number</Text>
                <Text style={styles.detailVal}>{data.account_number}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Reference</Text>
                <Text style={styles.detailVal}>{data.payment_reference}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>
              No ISA has been linked yet. The parent will add the ISA details and you'll see them here.
            </Text>
          )}
        </View>

        {/* Log a contribution — placeholder */}
        <Text style={styles.sectionTitle}>Contributions</Text>
        <View style={styles.card}>
          <Text style={styles.emptyText}>No contributions logged yet.</Text>
        </View>

        <TouchableOpacity
          style={styles.logBtn}
          onPress={() => Alert.alert('Coming soon', 'Contribution logging will be available soon.')}
          activeOpacity={0.85}
        >
          <Text style={styles.logBtnText}>Log a contribution</Text>
        </TouchableOpacity>

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
    padding: 24, alignItems: 'center', marginBottom: 24,
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
    paddingHorizontal: 14, paddingVertical: 6,
  },
  relBadgeText: { fontSize: 13, fontWeight: '700', color: colors.sky },

  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: colors.midnight,
    marginBottom: 10, marginTop: 4,
  },

  card: {
    backgroundColor: '#f8fafc', borderRadius: 16,
    padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  provider: { fontSize: 14, fontWeight: '700', color: colors.midnight, marginBottom: 8 },
  cardHint: { fontSize: 13, color: '#64748b', lineHeight: 20, marginBottom: 14 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  detailKey: { fontSize: 14, color: '#64748b' },
  detailVal: { fontSize: 14, fontWeight: '700', color: colors.midnight },
  divider: { height: 1, backgroundColor: '#e2e8f0' },
  emptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', paddingVertical: 8 },

  logBtn: {
    backgroundColor: colors.azure, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
  },
  logBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
})
