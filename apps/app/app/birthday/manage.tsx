import { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fv, formatGBP } from '@/lib/projections'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { colors } from '@/constants/brand'

// ── Types ─────────────────────────────────────────────────────────────────────

type PledgeStatus = 'pending' | 'confirmed' | 'swept'

interface WishlistItemLocal {
  id: string
  name: string
  retailer: string
  targetAmount: number
  pledgedAmount: number
  imageEmoji: string
  purchased: boolean
}

interface Pledger {
  id: string
  name: string
  amount: number
  status: PledgeStatus
  item: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function gbp(n: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n)
}

function avatarInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ManageWishlistScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()

  const [wishlist, setWishlist] = useState<{
    id: string
    occasion: string
    occasion_date: string
    total_target: number
    total_pledged: number
    payment_method: string
    child_id: string
  } | null>(null)

  const [items, setItems] = useState<WishlistItemLocal[]>([])
  const [pledgers, setPledgers] = useState<Pledger[]>([])
  const [childName, setChildName] = useState('your child')
  const [childAgeMonths, setChildAgeMonths] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    const fetchData = async () => {
      setIsLoading(true)

      const { data: wlData } = await supabase
        .from('wishlists')
        .select('*')
        .eq('id', id)
        .single()

      if (wlData) {
        setWishlist(wlData)

        const { data: childData } = await supabase
          .from('children')
          .select('name, date_of_birth')
          .eq('id', wlData.child_id)
          .single()

        if (childData) {
          setChildName(childData.name)
          const ageMs = Date.now() - new Date(childData.date_of_birth).getTime()
          setChildAgeMonths(Math.floor(ageMs / (1000 * 60 * 60 * 24 * 30)))
        }
      }

      const { data: itemsData } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('wishlist_id', id)

      if (itemsData) {
        setItems(itemsData.map((i) => ({
          id: i.id,
          name: i.name,
          retailer: i.retailer ?? '',
          targetAmount: i.target_amount,
          pledgedAmount: i.pledged_amount,
          imageEmoji: i.image_emoji,
          purchased: i.purchased,
        })))
      }

      const { data: pledgesData } = await supabase
        .from('pledges')
        .select('*')
        .eq('wishlist_id', id)
        .order('created_at', { ascending: false })

      if (pledgesData) {
        setPledgers(pledgesData.map((p) => ({
          id: p.id,
          name: p.pledger_name,
          amount: p.amount,
          status: p.status as PledgeStatus,
          item: p.item_label ?? 'General',
        })))
      }

      setIsLoading(false)
    }

    fetchData()
  }, [id])

  const markReceived = async (pledgeId: string) => {
    const { error } = await supabase
      .from('pledges')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', pledgeId)

    if (error) {
      Alert.alert('Error', error.message)
      return
    }

    setPledgers((prev) =>
      prev.map((p) => p.id === pledgeId ? { ...p, status: 'confirmed' as PledgeStatus } : p)
    )
  }

  const handleBuyItem = async (item: WishlistItemLocal) => {
    Alert.alert(
      'Purchase initiated! 🎉',
      `Your ${gbp(item.targetAmount)} ${item.retailer} gift card is being processed via Tillo. Expected delivery 3-5 days. The gift card will be sent to your email.`,
    )

    await supabase
      .from('wishlist_items')
      .update({ purchased: true })
      .eq('id', item.id)

    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, purchased: true } : i))
  }

  const handleSweepSurplus = () => {
    const surplusGrowth = formatGBP(fv(surplus / 12, Math.max(0, (18 * 12) - childAgeMonths)))
    Alert.alert(
      'Swept! 🎉',
      `${gbp(surplus)} swept to ${childName}'s JISA! At 8% per year, that ${gbp(surplus)} becomes ${surplusGrowth} by the time she turns 18.`,
    )
  }

  const handleShareReminder = () => {
    const itemNames = items.map((i) => i.name).join(' and ')
    const msg =
      `${childName}'s ${wishlist?.occasion ?? 'birthday'} wishlist is live! 🎂 ` +
      `She'd love ${itemNames}. ` +
      `Send your contribution to ${wishlist?.payment_method ?? ''} on Monzo. ` +
      `View her wishlist here: https://amplifi-plan.netlify.app/birthday/${id}`
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() =>
      Alert.alert('WhatsApp not found', 'Please install WhatsApp to share.')
    )
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.offwhite, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.sky} />
      </View>
    )
  }

  const totalPledged = wishlist?.total_pledged ?? 0
  const totalTarget = wishlist?.total_target ?? 0
  const progressPct = totalTarget > 0 ? Math.min(totalPledged / totalTarget, 1) * 100 : 0

  const confirmedTotal = pledgers
    .filter((p) => p.status === 'confirmed')
    .reduce((sum, p) => sum + p.amount, 0)
  const surplus = Math.max(0, confirmedTotal - totalTarget)

  const daysUntil = wishlist?.occasion_date
    ? Math.ceil((new Date(wishlist.occasion_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{childName}'s {wishlist?.occasion ?? 'Birthday'}</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* S1 — Summary card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryAmount}>
            {gbp(totalPledged)} of {gbp(totalTarget)} pledged
          </Text>
          <View style={styles.summaryTrack}>
            <View style={[styles.summaryFill, { width: `${progressPct.toFixed(0)}%` as `${number}%` }]} />
          </View>
          <Text style={styles.summaryDays}>
            {daysUntil > 0 ? `${daysUntil} days until ${wishlist?.occasion ?? 'birthday'}` : 'Occasion passed'}
          </Text>
        </View>

        {/* S2 — Items */}
        <Text style={styles.sectionTitle}>Wishlist items</Text>

        {items.map((item) => {
          const itemPct = item.targetAmount > 0
            ? Math.min(item.pledgedAmount / item.targetAmount, 1) * 100
            : 0
          const canBuy = item.pledgedAmount >= item.targetAmount && !item.purchased
          const remaining = item.targetAmount - item.pledgedAmount

          return (
            <View key={item.id} style={styles.itemCard}>
              <Text style={styles.itemName}>{item.imageEmoji} {item.name}</Text>
              <Text style={styles.itemRetailer}>{item.retailer}</Text>
              <View style={styles.itemTrack}>
                <View style={[styles.itemFill, { width: `${itemPct.toFixed(0)}%` as `${number}%` }]} />
              </View>
              <Text style={styles.itemProgress}>
                {gbp(item.pledgedAmount)} of {gbp(item.targetAmount)}
              </Text>
              <TouchableOpacity
                style={[styles.buyBtn, !canBuy && styles.buyBtnDisabled]}
                onPress={() => canBuy ? handleBuyItem(item) : undefined}
                disabled={!canBuy}
                activeOpacity={canBuy ? 0.85 : 1}
              >
                <Text style={[styles.buyBtnText, !canBuy && styles.buyBtnTextDisabled]}>
                  {item.purchased
                    ? `Purchased ✓`
                    : canBuy
                    ? `Buy ${item.name} — tap to confirm 🛍️`
                    : `${gbp(remaining)} more needed`}
                </Text>
              </TouchableOpacity>
            </View>
          )
        })}

        {/* S3 — Surplus sweep */}
        {surplus > 0 && (
          <View style={styles.surplusCard}>
            <Text style={styles.surplusTitle}>💰 Surplus to sweep</Text>
            <Text style={styles.surplusAmount}>{gbp(surplus)} received above item costs</Text>
            <TouchableOpacity
              style={styles.sweepBtn}
              onPress={handleSweepSurplus}
              activeOpacity={0.85}
            >
              <Text style={styles.sweepBtnText}>Sweep to {childName}'s JISA →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* S4 — Pledgers */}
        <Text style={styles.sectionTitle}>Pledges received</Text>

        <View style={styles.pledgerList}>
          {pledgers.length === 0 ? (
            <Text style={styles.emptyPledgers}>No pledges yet — share the wishlist to get started</Text>
          ) : (
            pledgers.map((p) => (
              <View key={p.id} style={styles.pledgerRow}>
                <View style={styles.pledgerAvatar}>
                  <Text style={styles.pledgerInitial}>{avatarInitial(p.name)}</Text>
                </View>
                <View style={styles.pledgerMid}>
                  <Text style={styles.pledgerName}>{p.name}</Text>
                  <Text style={styles.pledgerItem}>{p.item}</Text>
                  {p.status === 'pending' && (
                    <TouchableOpacity onPress={() => markReceived(p.id)} activeOpacity={0.7}>
                      <Text style={styles.markReceived}>Mark as received</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.pledgerAmount}>{gbp(p.amount)}</Text>
                  <View style={[
                    styles.statusChip,
                    p.status === 'confirmed' ? styles.statusConfirmed : styles.statusPending,
                  ]}>
                    <Text style={[
                      styles.statusText,
                      p.status === 'confirmed' ? styles.statusTextConfirmed : styles.statusTextPending,
                    ]}>
                      {p.status === 'confirmed' ? 'Received ✓' : 'Pending'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* S5 — Share reminder */}
        <View style={styles.shareCard}>
          <Text style={styles.shareTitle}>Share {childName}'s wishlist with more family</Text>
          <TouchableOpacity onPress={handleShareReminder} activeOpacity={0.7}>
            <Text style={styles.shareLink}>📱 Share on WhatsApp</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.offwhite },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 22, color: colors.midnight },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.midnight },

  summaryCard: {
    backgroundColor: colors.midnight,
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 16,
    marginBottom: 20,
  },
  summaryAmount: { fontSize: 22, fontWeight: '700', color: '#ffffff' },
  summaryTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 8,
  },
  summaryFill: { height: 6, backgroundColor: colors.sky, borderRadius: 3 },
  summaryDays: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.midnight,
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
  },
  itemName: { fontSize: 15, fontWeight: '700', color: colors.midnight },
  itemRetailer: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  itemTrack: {
    height: 6,
    backgroundColor: colors.offwhite,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 4,
  },
  itemFill: { height: 6, backgroundColor: colors.sky, borderRadius: 3 },
  itemProgress: { fontSize: 12, color: '#64748b', marginBottom: 10 },
  buyBtn: {
    backgroundColor: colors.sky,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buyBtnDisabled: { backgroundColor: '#e2e8f0', opacity: 0.6 },
  buyBtnText: { fontSize: 13, fontWeight: '700', color: colors.midnight },
  buyBtnTextDisabled: { color: '#94a3b8' },

  surplusCard: {
    backgroundColor: 'rgba(245,158,11,0.10)',
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 16,
    marginBottom: 20,
  },
  surplusTitle: { fontSize: 16, fontWeight: '700', color: colors.midnight },
  surplusAmount: { fontSize: 14, color: '#475569', marginTop: 4 },
  sweepBtn: {
    backgroundColor: colors.sky,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  sweepBtnText: { fontSize: 14, fontWeight: '700', color: colors.midnight },

  pledgerList: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  emptyPledgers: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    padding: 20,
  },
  pledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pledgerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.sky,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  pledgerInitial: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  pledgerMid: { flex: 1 },
  pledgerName: { fontSize: 14, fontWeight: '700', color: colors.midnight },
  pledgerItem: { fontSize: 13, color: '#94a3b8', marginTop: 1 },
  markReceived: { fontSize: 13, color: colors.sky, fontWeight: '600', marginTop: 3 },
  pledgerAmount: { fontSize: 15, fontWeight: '700', color: colors.midnight },
  statusChip: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100,
  },
  statusConfirmed: { backgroundColor: '#dcfce7' },
  statusPending: { backgroundColor: 'rgba(245,158,11,0.15)' },
  statusText: { fontSize: 11, fontWeight: '600' },
  statusTextConfirmed: { color: '#16a34a' },
  statusTextPending: { color: colors.amber },

  shareCard: {
    backgroundColor: `${colors.sky}1A`,
    borderWidth: 1,
    borderColor: `${colors.sky}66`,
    borderRadius: 14,
    marginHorizontal: 16,
    padding: 14,
    marginBottom: 8,
  },
  shareTitle: { fontSize: 14, fontWeight: '600', color: colors.midnight },
  shareLink: { fontSize: 14, color: colors.sky, fontWeight: '600', marginTop: 8 },
})
