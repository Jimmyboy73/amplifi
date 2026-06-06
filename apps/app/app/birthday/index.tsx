import { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { colors } from '@/constants/brand'

// ── Types ─────────────────────────────────────────────────────────────────────

interface WishlistItem {
  id: string
  name: string
  targetAmount: number
  pledgedAmount: number
  retailer: string
  imageEmoji: string
}

interface Wishlist {
  id: string
  childName: string
  occasion: string
  date: string
  daysUntil: number
  status: 'active' | 'closed'
  items: WishlistItem[]
  totalTarget: number
  totalPledged: number
  surplusAmount: number
  paymentMethod: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function gbp(n: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n)
}

function nextBirthday(dob: string): { days: number; date: Date } {
  const d = new Date(dob)
  const next = new Date(d)
  next.setFullYear(new Date().getFullYear())
  if (next <= new Date()) next.setFullYear(new Date().getFullYear() + 1)
  return {
    days: Math.ceil((next.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    date: next,
  }
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function BirthdayHomeScreen() {
  const router = useRouter()
  const { user } = useAuth()

  const [child, setChild] = useState<{ id: string; name: string; date_of_birth: string } | null>(null)
  const [wishlists, setWishlists] = useState<Wishlist[]>([])
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

      const { data: wlData } = await supabase
        .from('wishlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (wlData && wlData.length > 0) {
        const ids = wlData.map((w) => w.id)
        const { data: itemsData } = await supabase
          .from('wishlist_items')
          .select('*')
          .in('wishlist_id', ids)

        const mapped: Wishlist[] = wlData.map((w) => {
          const wItems = (itemsData ?? []).filter((i) => i.wishlist_id === w.id)
          const occasionDate = new Date(w.occasion_date)
          const daysUntil = Math.ceil((occasionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          return {
            id: w.id,
            childName: childData?.name ?? 'Your child',
            occasion: w.occasion,
            date: occasionDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            daysUntil,
            status: w.status,
            items: wItems.map((i) => ({
              id: i.id,
              name: i.name,
              targetAmount: i.target_amount,
              pledgedAmount: i.pledged_amount,
              retailer: i.retailer ?? '',
              imageEmoji: i.image_emoji,
            })),
            totalTarget: w.total_target,
            totalPledged: w.total_pledged,
            surplusAmount: w.surplus_amount,
            paymentMethod: w.payment_method,
          }
        })
        setWishlists(mapped)
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

  const childName = child?.name ?? 'your child'
  const birthday = child?.date_of_birth ? nextBirthday(child.date_of_birth) : null
  const hasActiveWishlist = wishlists.some((w) => w.status === 'active')

  const shareWishlist = (w: Wishlist) => {
    const itemList = w.items.map((i) => `• ${i.name} (${i.retailer})`).join('\n')
    const msg =
      `${w.childName}'s ${w.occasion} wishlist is live! 🎂\n\n` +
      `She'd love:\n${itemList}\n\n` +
      `Send contributions to ${w.paymentMethod}\n\n` +
      `View her wishlist: https://amplifi-plan.netlify.app/birthday/${w.id}`
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() =>
      Alert.alert('WhatsApp not found', 'Please install WhatsApp to share.')
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Birthday Registry</Text>
            <Text style={styles.subtitle}>Turn birthdays into investments</Text>
          </View>
        </View>

        {/* Upcoming birthday banner */}
        {birthday && birthday.days > 0 && (
          <View style={styles.birthdayBanner}>
            <View style={styles.bannerLeft}>
              <Text style={styles.bannerName}>🎂 {childName}'s birthday</Text>
              <Text style={styles.bannerDate}>
                {birthday.days} days away — {birthday.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            {hasActiveWishlist ? (
              <View style={styles.bannerActiveBadge}>
                <Text style={styles.bannerActiveBadgeText}>Wishlist active ✓</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={() => router.push('/birthday/create')} activeOpacity={0.8}>
                <Text style={styles.bannerCta}>Create wishlist →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Active wishlists */}
        {wishlists.length > 0 && (
          <Text style={styles.sectionTitle}>Active wishlists</Text>
        )}

        {wishlists.map((w) => {
          const progressPct = w.totalTarget > 0
            ? Math.min(w.totalPledged / w.totalTarget, 1) * 100
            : 0
          return (
            <View key={w.id} style={styles.wishlistCard}>
              <View style={styles.wishlistTop}>
                <Text style={styles.wishlistOccasion}>✨ {w.occasion}</Text>
                <Text style={styles.wishlistDate}>{w.date}</Text>
              </View>

              <View style={styles.progressRow}>
                <Text style={styles.progressText}>
                  {gbp(w.totalPledged)} of {gbp(w.totalTarget)} pledged
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPct.toFixed(0)}%` as `${number}%` }]} />
              </View>

              {w.items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <Text style={styles.itemName}>{item.imageEmoji} {item.name}</Text>
                  {item.pledgedAmount >= item.targetAmount ? (
                    <Text style={styles.itemReady}>✓ Ready to buy</Text>
                  ) : (
                    <Text style={styles.itemProgress}>{gbp(item.pledgedAmount)} / {gbp(item.targetAmount)}</Text>
                  )}
                </View>
              ))}

              <Text style={styles.paymentMethod}>💳 Send to: {w.paymentMethod}</Text>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.manageBtn}
                  onPress={() => router.push(`/birthday/manage?id=${w.id}`)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.manageBtnText}>Manage pledges →</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.shareBtn}
                  onPress={() => shareWishlist(w)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.shareBtnText}>Share wishlist →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        })}

        {/* Create new CTA */}
        <View style={styles.createCard}>
          <Text style={styles.createTitle}>🎁 Create a birthday wishlist</Text>
          <Text style={styles.createBody}>
            Share with family, collect pledges, and sweep any surplus straight to{' '}
            {childName}'s JISA.
          </Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push('/birthday/create')}
            activeOpacity={0.85}
          >
            <Text style={styles.createBtnText}>Create wishlist →</Text>
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
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: { padding: 4, marginTop: 2 },
  backArrow: { fontSize: 22, color: colors.midnight },
  title: { fontSize: 26, fontWeight: '800', color: colors.midnight, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 2 },

  birthdayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245,158,11,0.10)',
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    gap: 12,
  },
  bannerLeft: { flex: 1 },
  bannerName: { fontSize: 17, fontWeight: '700', color: colors.midnight },
  bannerDate: { fontSize: 14, color: '#475569', marginTop: 2 },
  bannerActiveBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  bannerActiveBadgeText: { fontSize: 12, fontWeight: '700', color: '#16a34a' },
  bannerCta: { fontSize: 14, fontWeight: '600', color: colors.sky },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.midnight,
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  wishlistCard: {
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
  wishlistTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  wishlistOccasion: { fontSize: 16, fontWeight: '700', color: colors.midnight },
  wishlistDate: { fontSize: 13, color: '#94a3b8' },
  progressRow: { marginBottom: 6 },
  progressText: { fontSize: 14, fontWeight: '600', color: colors.midnight },
  progressTrack: {
    height: 8,
    backgroundColor: colors.offwhite,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: { height: 8, backgroundColor: colors.sky, borderRadius: 4 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemName: { fontSize: 14, color: '#475569', flex: 1 },
  itemProgress: { fontSize: 13, color: '#64748b' },
  itemReady: { fontSize: 13, color: '#16a34a', fontWeight: '600' },
  paymentMethod: { fontSize: 13, color: '#64748b', marginTop: 8 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  manageBtn: {
    flex: 1,
    backgroundColor: colors.sky,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  manageBtnText: { fontSize: 14, fontWeight: '700', color: colors.midnight },
  shareBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: colors.midnight,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  shareBtnText: { fontSize: 14, fontWeight: '700', color: colors.midnight },

  createCard: {
    backgroundColor: `${colors.sky}1A`,
    borderWidth: 1,
    borderColor: `${colors.sky}66`,
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  createTitle: { fontSize: 16, fontWeight: '700', color: colors.midnight },
  createBody: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 6,
  },
  createBtn: {
    backgroundColor: colors.sky,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  createBtnText: { fontSize: 15, fontWeight: '700', color: colors.midnight },
})
