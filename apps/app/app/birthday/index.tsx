import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '@/constants/brand'

// ── Mock data ─────────────────────────────────────────────────────────────────

const CHILD_NAME = 'Olivia'
const BIRTHDAY_DATE = new Date('2026-06-28')
const DAYS_UNTIL = Math.ceil(
  (BIRTHDAY_DATE.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
)

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

const WISHLISTS: Wishlist[] = [
  {
    id: '1',
    childName: 'Olivia',
    occasion: '7th Birthday',
    date: '28 Jun 2026',
    daysUntil: DAYS_UNTIL,
    status: 'active',
    items: [
      { id: 'a', name: 'Nike Air Max trainers', targetAmount: 85.00, pledgedAmount: 65.00, retailer: 'Nike',   imageEmoji: '👟' },
      { id: 'b', name: 'LEGO Technic Set',      targetAmount: 45.00, pledgedAmount: 45.00, retailer: 'Smyths', imageEmoji: '🧱' },
    ],
    totalTarget: 130.00,
    totalPledged: 110.00,
    surplusAmount: 0,
    paymentMethod: 'Monzo — @sarah-jones',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function gbp(n: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n)
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function BirthdayHomeScreen() {
  const router = useRouter()
  const hasActiveWishlist = WISHLISTS.some((w) => w.status === 'active')

  const shareWishlist = (w: Wishlist) => {
    const items = w.items.map((i) => `• ${i.name} (${i.retailer})`).join('\n')
    const msg =
      `${w.childName}'s ${w.occasion} wishlist is live! 🎂\n\n` +
      `She'd love:\n${items}\n\n` +
      `Send contributions to ${w.paymentMethod}\n\n` +
      `View her wishlist: https://amplifi-plan.netlify.app`
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
        <View style={styles.birthdayBanner}>
          <View style={styles.bannerLeft}>
            <Text style={styles.bannerName}>🎂 {CHILD_NAME}'s birthday</Text>
            <Text style={styles.bannerDate}>
              {DAYS_UNTIL} days away — {BIRTHDAY_DATE.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
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

        {/* Active wishlists */}
        <Text style={styles.sectionTitle}>Active wishlists</Text>

        {WISHLISTS.map((w) => {
          const progressPct = Math.min(w.totalPledged / w.totalTarget, 1) * 100
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
            {CHILD_NAME}'s JISA.
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
