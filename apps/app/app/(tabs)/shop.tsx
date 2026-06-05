import { useState, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  type ListRenderItemInfo,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '@/constants/brand'

// ── Types ─────────────────────────────────────────────────────────────────────

interface GiftCard {
  id: string
  name: string
  category: string
  cashbackPercent: number
  color: string
  initial: string
  denominations: number[]
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const CATEGORIES = ['All', 'Groceries', 'Fashion', 'Home', 'Dining', 'Travel', 'Health']

const GIFT_CARDS: GiftCard[] = [
  { id: '1',  name: 'Tesco',         category: 'Groceries', cashbackPercent: 5,  color: '#00539F', initial: 'T',   denominations: [10, 25, 50, 100] },
  { id: '2',  name: "Sainsbury's",   category: 'Groceries', cashbackPercent: 4,  color: '#F06C00', initial: 'S',   denominations: [10, 25, 50, 100] },
  { id: '3',  name: 'M&S',           category: 'Groceries', cashbackPercent: 7,  color: '#000000', initial: 'M',   denominations: [10, 25, 50, 100] },
  { id: '4',  name: 'ASOS',          category: 'Fashion',   cashbackPercent: 9,  color: '#1A1A1A', initial: 'A',   denominations: [10, 25, 50, 100] },
  { id: '5',  name: 'Nike',          category: 'Fashion',   cashbackPercent: 8,  color: '#111111', initial: 'N',   denominations: [25, 50, 100] },
  { id: '6',  name: 'Next',          category: 'Fashion',   cashbackPercent: 8,  color: '#333333', initial: 'N',   denominations: [10, 25, 50, 100] },
  { id: '7',  name: 'John Lewis',    category: 'Home',      cashbackPercent: 7,  color: '#2C5F8A', initial: 'JL',  denominations: [25, 50, 100] },
  { id: '8',  name: 'IKEA',          category: 'Home',      cashbackPercent: 6,  color: '#0058A3', initial: 'IK',  denominations: [25, 50, 100, 250] },
  { id: '9',  name: "Nando's",       category: 'Dining',    cashbackPercent: 10, color: '#C8102E', initial: "N'",  denominations: [10, 25, 50] },
  { id: '10', name: 'Pizza Express', category: 'Dining',    cashbackPercent: 9,  color: '#003087', initial: 'PE',  denominations: [10, 25, 50] },
  { id: '11', name: 'Boots',         category: 'Health',    cashbackPercent: 7,  color: '#003DA5', initial: 'B',   denominations: [10, 25, 50, 100] },
  { id: '12', name: 'Amazon',        category: 'All',       cashbackPercent: 4,  color: '#FF9900', initial: 'a',   denominations: [10, 25, 50, 100] },
]

const CHILD_NAME = 'Olivia'

// ── Helpers ───────────────────────────────────────────────────────────────────

function gbp(n: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function cashbackOn50(pct: number): string {
  return gbp(50 * pct / 100)
}

// ── Purchase Modal ────────────────────────────────────────────────────────────

interface PurchaseModalProps {
  card: GiftCard | null
  onClose: () => void
}

function PurchaseModal({ card, onClose }: PurchaseModalProps) {
  const [selectedDenom, setSelectedDenom] = useState<number | null>(null)

  const activeDenom = selectedDenom ?? (card?.denominations[0] ?? 0)
  const cashbackAmount = card ? activeDenom * card.cashbackPercent / 100 : 0

  const handlePurchase = () => {
    if (!card) return
    Alert.alert(
      'Purchase confirmed! 🎉',
      `Your ${gbp(activeDenom)} ${card.name} gift card is being processed. ${gbp(cashbackAmount)} will be added to ${CHILD_NAME}'s pot shortly. Check your email for delivery.`,
      [{ text: 'Great!', onPress: onClose }],
    )
  }

  return (
    <Modal
      visible={card !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={modal.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={modal.sheet}>
          {/* Handle */}
          <View style={modal.handle} />

          {/* Logo */}
          <View style={[modal.logo, { backgroundColor: card?.color ?? colors.sky }]}>
            <Text style={modal.logoText}>{card?.initial}</Text>
          </View>

          {/* Name + cashback headline */}
          <Text style={modal.cardName}>{card?.name}</Text>
          <Text style={modal.cashbackHeadline}>
            {card?.cashbackPercent}% cashback for {CHILD_NAME}
          </Text>

          {/* Denomination selector */}
          <Text style={modal.selectLabel}>Select amount:</Text>
          <View style={modal.denomRow}>
            {(card?.denominations ?? []).map((d) => {
              const isActive = d === activeDenom
              return (
                <TouchableOpacity
                  key={d}
                  style={[modal.denomChip, isActive && modal.denomChipActive]}
                  onPress={() => setSelectedDenom(d)}
                  activeOpacity={0.8}
                >
                  <Text style={[modal.denomText, isActive && modal.denomTextActive]}>
                    £{d}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Cashback earned display */}
          <View style={modal.earnBox}>
            <Text style={modal.earnLabel}>{CHILD_NAME} earns</Text>
            <Text style={modal.earnAmount}>{gbp(cashbackAmount)}</Text>
            <Text style={modal.earnLabel}>from this purchase</Text>
          </View>

          {/* Purchase CTA */}
          <TouchableOpacity style={modal.purchaseBtn} onPress={handlePurchase} activeOpacity={0.85}>
            <Text style={modal.purchaseBtnText}>
              Purchase {gbp(activeDenom)} gift card
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={modal.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={modal.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ── Gift card item ────────────────────────────────────────────────────────────

interface GiftCardItemProps {
  card: GiftCard
  onBuyNow: (card: GiftCard) => void
}

function GiftCardItem({ card, onBuyNow }: GiftCardItemProps) {
  return (
    <View style={item.card}>
      <View style={item.topRow}>
        <View style={[item.logo, { backgroundColor: card.color }]}>
          <Text style={item.logoText}>{card.initial}</Text>
        </View>
        <View style={item.badge}>
          <Text style={item.badgeText}>{card.cashbackPercent}% cashback</Text>
        </View>
      </View>
      <Text style={item.name}>{card.name}</Text>
      <Text style={item.earnLine}>
        Earns {cashbackOn50(card.cashbackPercent)} for {CHILD_NAME}'s JISA
      </Text>
      <TouchableOpacity style={item.buyBtn} onPress={() => onBuyNow(card)} activeOpacity={0.85}>
        <Text style={item.buyBtnText}>Buy now</Text>
      </TouchableOpacity>
    </View>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ShopScreen() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return GIFT_CARDS.filter((c) => {
      const matchesCategory = activeCategory === 'All' || c.category === activeCategory
      const matchesSearch = q.length === 0 || c.name.toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    })
  }, [search, activeCategory])

  const renderCard = ({ item: card, index }: ListRenderItemInfo<GiftCard>) => (
    <View style={[grid.cell, index % 2 === 0 ? { marginRight: 6 } : { marginLeft: 6 }]}>
      <GiftCardItem card={card} onBuyNow={setSelectedCard} />
    </View>
  )

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Gift Card Shop</Text>
        <Text style={styles.subtitle}>
          Every purchase earns cashback for {CHILD_NAME}'s JISA
        </Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search retailers..."
          placeholderTextColor="#94a3b8"
          returnKeyType="search"
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7} style={styles.clearBtn}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContent}
        style={styles.tabsRow}
      >
        {CATEGORIES.map((cat) => {
          const isActive = cat === activeCategory
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveCategory(cat)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{cat}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Grid */}
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        renderItem={renderCard}
        numColumns={2}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No gift cards found</Text>
          </View>
        }
      />

      {/* Purchase modal */}
      <PurchaseModal card={selectedCard} onClose={() => setSelectedCard(null)} />
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: colors.midnight, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 3 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, color: colors.midnight },
  clearBtn: { padding: 4 },
  clearText: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },

  tabsRow: { marginBottom: 16 },
  tabsContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 2 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  tabActive: { backgroundColor: colors.midnight, borderColor: colors.midnight },
  tabText: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
  tabTextActive: { color: '#ffffff' },

  gridContent: { paddingHorizontal: 16, paddingBottom: 100 },
  empty: { flex: 1, alignItems: 'center', paddingTop: 48 },
  emptyText: { fontSize: 15, color: '#94a3b8' },
})

const grid = StyleSheet.create({
  cell: { flex: 1, marginBottom: 12 },
})

const item = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  badge: {
    backgroundColor: colors.sky,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    maxWidth: 90,
  },
  badgeText: { color: colors.midnight, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: colors.midnight, marginTop: 10 },
  earnLine: { fontSize: 12, color: colors.sky, marginTop: 3, lineHeight: 17 },
  buyBtn: {
    backgroundColor: colors.sky,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buyBtnText: { color: colors.midnight, fontSize: 13, fontWeight: '700' },
})

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    marginBottom: 20,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoText: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  cardName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.midnight,
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  cashbackHeadline: {
    fontSize: 16,
    color: colors.sky,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 20,
  },
  selectLabel: { fontSize: 14, color: '#64748b', alignSelf: 'flex-start', marginBottom: 10 },
  denomRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20, alignSelf: 'stretch' },
  denomChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  denomChipActive: { backgroundColor: colors.sky, borderColor: colors.sky },
  denomText: { fontSize: 15, fontWeight: '600', color: '#94a3b8' },
  denomTextActive: { color: colors.midnight },
  earnBox: {
    backgroundColor: colors.offwhite,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: 20,
  },
  earnLabel: { fontSize: 14, color: '#64748b' },
  earnAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.sky,
    letterSpacing: -1,
    marginVertical: 4,
  },
  purchaseBtn: {
    backgroundColor: colors.sky,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  purchaseBtnText: { color: colors.midnight, fontSize: 17, fontWeight: '700' },
  cancelBtn: { paddingVertical: 8 },
  cancelText: { fontSize: 14, color: '#94a3b8' },
})
