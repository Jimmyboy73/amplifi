import { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  type ListRenderItemInfo,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { colors } from '@/constants/brand'
import { useChildren } from '@/lib/useChildren'
import { useGiftCardBrands, type GiftCardBrand } from '@/lib/useGiftCardBrands'
import { useGiftCardPurchase } from '@/lib/useGiftCardPurchase'

// ── Constants ─────────────────────────────────────────────────────────────────

const AMOUNTS = [10, 25, 50, 100]
const BRAND_COLOURS = ['#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626', '#9333EA', '#0EA5E9', '#10B981']

// ── Helpers ───────────────────────────────────────────────────────────────────

function gbp(n: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n)
}

function brandColour(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return BRAND_COLOURS[Math.abs(hash) % BRAND_COLOURS.length]
}

// ── Purchase modal ────────────────────────────────────────────────────────────

type ModalPhase = 'form' | 'purchasing' | 'success'

interface PurchaseModalProps {
  brand: GiftCardBrand | null
  childName: string
  childId: string | null
  onClose: () => void
}

function PurchaseModal({ brand, childName, childId, onClose }: PurchaseModalProps) {
  const { purchase } = useGiftCardPurchase()
  const [selectedAmount, setSelectedAmount] = useState(25)
  const [phase, setPhase] = useState<ModalPhase>('form')
  const [successData, setSuccessData] = useState<{ code: string; cashbackGbp: number } | null>(null)

  const cashbackGbp = brand
    ? Math.round(selectedAmount * brand.cashback_percentage / 100 * 100) / 100
    : 0

  const handleClose = () => {
    setSelectedAmount(25)
    setPhase('form')
    setSuccessData(null)
    onClose()
  }

  const handlePurchase = async () => {
    if (!brand || !childId) return
    setPhase('purchasing')
    const result = await purchase({ brand, amountGbp: selectedAmount, childId })
    if (result.ok) {
      setSuccessData({ code: result.giftCardCode, cashbackGbp: result.cashbackGbp })
      setPhase('success')
    } else {
      setPhase('form')
    }
  }

  const logoColour = brand ? brandColour(brand.name) : colors.sky

  return (
    <Modal
      visible={brand !== null}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={modal.overlay}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={phase === 'purchasing' ? undefined : handleClose}
          activeOpacity={1}
        />
        <View style={modal.sheet}>
          <View style={modal.handle} />

          {phase === 'purchasing' ? (
            <View style={modal.loadingWrap}>
              <ActivityIndicator size="large" color={colors.azure} />
              <Text style={modal.loadingText}>Processing your purchase…</Text>
            </View>
          ) : phase === 'success' && successData ? (
            <>
              <Text style={modal.successEmoji}>🎉</Text>
              <Text style={modal.cardName}>Your {brand?.name} gift card</Text>
              <View style={modal.codeBox}>
                <Text style={modal.codeText}>{successData.code}</Text>
              </View>
              <Text style={modal.successSub}>
                {gbp(successData.cashbackGbp)} cashback added to {childName}'s JISA
              </Text>
              <TouchableOpacity style={modal.purchaseBtn} onPress={handleClose} activeOpacity={0.85}>
                <Text style={modal.purchaseBtnText}>Done</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={[modal.logo, { backgroundColor: logoColour }]}>
                <Text style={modal.logoText}>{brand?.name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={modal.cardName}>{brand?.name}</Text>
              <Text style={modal.cashbackHeadline}>
                {brand?.cashback_percentage}% cashback for {childName}
              </Text>
              <Text style={modal.selectLabel}>Select amount:</Text>
              <View style={modal.amountRow}>
                {AMOUNTS.map((amt) => {
                  const isActive = amt === selectedAmount
                  return (
                    <TouchableOpacity
                      key={amt}
                      style={[modal.amountChip, isActive && modal.amountChipActive]}
                      onPress={() => setSelectedAmount(amt)}
                      activeOpacity={0.8}
                    >
                      <Text style={[modal.amountText, isActive && modal.amountTextActive]}>
                        £{amt}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
              <View style={modal.earnBox}>
                <Text style={modal.earnLabel}>{childName} earns</Text>
                <Text style={modal.earnAmount}>{gbp(cashbackGbp)}</Text>
                <Text style={modal.earnLabel}>from this purchase</Text>
              </View>
              <TouchableOpacity
                style={[modal.purchaseBtn, !childId && modal.purchaseBtnDisabled]}
                onPress={handlePurchase}
                activeOpacity={0.85}
                disabled={!childId}
              >
                <Text style={modal.purchaseBtnText}>
                  Pay with Stripe — {gbp(selectedAmount)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={modal.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
                <Text style={modal.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}

// ── Brand card ────────────────────────────────────────────────────────────────

interface BrandCardProps {
  brand: GiftCardBrand
  childName: string
  onBuyNow: (brand: GiftCardBrand) => void
}

function BrandCard({ brand, childName, onBuyNow }: BrandCardProps) {
  const colour = brandColour(brand.name)
  const earnOn50 = gbp(50 * brand.cashback_percentage / 100)
  return (
    <View style={item.card}>
      <View style={item.topRow}>
        <View style={[item.logo, { backgroundColor: colour }]}>
          <Text style={item.logoText}>{brand.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={item.badge}>
          <Text style={item.badgeText}>{brand.cashback_percentage}% back</Text>
        </View>
      </View>
      <Text style={item.name}>{brand.name}</Text>
      <Text style={item.earnLine}>Earns {earnOn50} for {childName}'s JISA</Text>
      <TouchableOpacity style={item.buyBtn} onPress={() => onBuyNow(brand)} activeOpacity={0.85}>
        <Text style={item.buyBtnText}>Buy now</Text>
      </TouchableOpacity>
    </View>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ShopScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { children: myChildren, loading: myChildrenLoading } = useChildren()
  const { brands, loading: brandsLoading } = useGiftCardBrands()
  const [childName, setChildName] = useState('your child')
  const [childId, setChildId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedBrand, setSelectedBrand] = useState<GiftCardBrand | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('children')
      .select('id, name')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setChildName(data.name)
          setChildId(data.id)
        }
      })
  }, [user?.id])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q.length === 0 ? brands : brands.filter((b) => b.name.toLowerCase().includes(q))
  }, [brands, search])

  const renderBrand = ({ item: brand, index }: ListRenderItemInfo<GiftCardBrand>) => (
    <View style={[grid.cell, index % 2 === 0 ? { marginRight: 6 } : { marginLeft: 6 }]}>
      <BrandCard brand={brand} childName={childName} onBuyNow={setSelectedBrand} />
    </View>
  )

  if (!myChildrenLoading && myChildren.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Gift Card Shop</Text>
          <Text style={styles.subtitle}>Buy gift cards and earn cashback for your child's JISA</Text>
        </View>
        <View style={styles.upgradeCard}>
          <Text style={styles.upgradeTitle}>Unlock the Gift Card Shop</Text>
          <Text style={styles.upgradeSub}>
            Set up your child's savings account to buy gift cards and earn cashback on every purchase.
          </Text>
          <TouchableOpacity style={styles.upgradeBtn} onPress={() => router.push('/(auth)/child')} activeOpacity={0.85}>
            <Text style={styles.upgradeBtnText}>Set up now →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Gift Card Shop</Text>
        <Text style={styles.subtitle}>Every purchase earns cashback for {childName}'s JISA</Text>
      </View>

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


      {brandsLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.sky} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(b) => b.id}
          renderItem={renderBrand}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No gift cards found</Text>
            </View>
          }
        />
      )}

      <PurchaseModal
        brand={selectedBrand}
        childName={childName}
        childId={childId}
        onClose={() => setSelectedBrand(null)}
      />
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: colors.midnight, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 3 },

  upgradeCard: {
    backgroundColor: '#f8fafc', borderRadius: 20,
    margin: 16, padding: 24,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  upgradeTitle: { fontSize: 20, fontWeight: '800', color: colors.midnight, marginBottom: 8 },
  upgradeSub: { fontSize: 14, color: '#64748b', lineHeight: 21, marginBottom: 20 },
  upgradeBtn: {
    backgroundColor: colors.sky, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  upgradeBtnText: { color: colors.midnight, fontSize: 15, fontWeight: '700' },

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

  gridContent: { paddingHorizontal: 16, paddingBottom: 100 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
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
    backgroundColor: colors.azure,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buyBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
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
    width: 40, height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    marginBottom: 20,
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 16,
  },
  successEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  codeBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginVertical: 16,
  },
  codeText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.midnight,
    letterSpacing: 2,
  },
  successSub: {
    fontSize: 14,
    color: '#059669',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 24,
  },
  logo: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  logoText: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  cardName: {
    fontSize: 22, fontWeight: '800', color: colors.midnight,
    textAlign: 'center', marginBottom: 4, letterSpacing: -0.3,
  },
  cashbackHeadline: {
    fontSize: 16, color: colors.sky,
    textAlign: 'center', fontWeight: '600', marginBottom: 20,
  },
  selectLabel: { fontSize: 14, color: '#64748b', alignSelf: 'flex-start', marginBottom: 10 },
  amountRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    marginBottom: 20, alignSelf: 'stretch',
  },
  amountChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  amountChipActive: { backgroundColor: colors.azure, borderColor: colors.azure },
  amountText: { fontSize: 15, fontWeight: '600', color: '#94a3b8' },
  amountTextActive: { color: '#ffffff' },
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
    fontSize: 36, fontWeight: '800', color: colors.sky,
    letterSpacing: -1, marginVertical: 4,
  },
  purchaseBtn: {
    backgroundColor: colors.azure,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  purchaseBtnDisabled: { opacity: 0.5 },
  purchaseBtnText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  cancelBtn: { paddingVertical: 8 },
  cancelText: { fontSize: 14, color: '#94a3b8' },
})
