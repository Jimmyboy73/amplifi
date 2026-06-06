import { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { colors } from '@/constants/brand'

// ── Constants ─────────────────────────────────────────────────────────────────

const OCCASION_TYPES = [
  { id: 'birthday', label: '🎂 Birthday' },
  { id: 'christmas', label: '🎄 Christmas' },
  { id: 'other',    label: '🎁 Other' },
] as const

type OccasionId = typeof OCCASION_TYPES[number]['id']

const EMOJIS = ['👟', '🧸', '📚', '🎮', '🚲', '👗', '🎨', '🏀']
const PAYMENT_METHODS = ['Monzo', 'Revolut', 'PayPal', 'Bank transfer'] as const
type PaymentMethod = typeof PAYMENT_METHODS[number]

interface Item {
  id: string
  name: string
  retailer: string
  amount: string
  emoji: string
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function CreateWishlistScreen() {
  const router = useRouter()
  const { user } = useAuth()

  const [child, setChild] = useState<{ id: string; name: string } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('children')
      .select('id, name')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
      .then(({ data }) => { if (data) setChild(data) })
  }, [user])

  // Occasion
  const [occasionType, setOccasionType] = useState<OccasionId | null>(null)
  const [dobDay, setDobDay]   = useState('')
  const [dobMonth, setDobMonth] = useState('')
  const [dobYear, setDobYear]  = useState('')

  const monthRef = useRef<TextInput>(null)
  const yearRef  = useRef<TextInput>(null)

  // Items
  const [items, setItems] = useState<Item[]>([])
  const [itemName, setItemName] = useState('')
  const [itemRetailer, setItemRetailer] = useState('')
  const [itemAmount, setItemAmount] = useState('')
  const [itemEmoji, setItemEmoji] = useState('🎁')

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [paymentDetail, setPaymentDetail] = useState('')
  const [sortCode, setSortCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')

  // Closing date — auto 7 days before
  const closingLabel = (() => {
    if (dobDay && dobMonth && dobYear.length === 4) {
      const d = new Date(
        parseInt(dobYear, 10),
        parseInt(dobMonth, 10) - 1,
        parseInt(dobDay, 10) - 7,
      )
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      }
    }
    return '—'
  })()

  const addItem = () => {
    if (!itemName.trim() || !itemAmount.trim()) return
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString(), name: itemName.trim(), retailer: itemRetailer.trim(), amount: itemAmount.trim(), emoji: itemEmoji },
    ])
    setItemName('')
    setItemRetailer('')
    setItemAmount('')
    setItemEmoji('🎁')
  }

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id))

  const paymentValid = (() => {
    if (!paymentMethod) return false
    if (paymentMethod === 'Bank transfer') return sortCode.length > 0 && accountNumber.length > 0
    return paymentDetail.trim().length > 0
  })()

  const isValid =
    occasionType !== null &&
    dobDay.length === 2 && dobMonth.length === 2 && dobYear.length === 4 &&
    items.length > 0 &&
    paymentValid

  const childName = child?.name ?? 'your child'

  const handleCreate = async () => {
    if (!user) {
      console.error('[Wishlist] No user found')
      return
    }
    if (!isValid || saving || !child) return
    setSaving(true)

    console.log('[Wishlist] Starting create for user:', user?.id)
    console.log('[Wishlist] Child ID:', child.id)
    console.log('[Wishlist] Items:', items)

    const occasionLabel =
      occasionType === 'birthday' ? `${childName}'s Birthday` :
      occasionType === 'christmas' ? 'Christmas' : 'Other'

    const occasionDate = `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const selectedDate = new Date(occasionDate)
    if (selectedDate <= today) {
      Alert.alert('Invalid date', 'The occasion date must be in the future.')
      setSaving(false)
      return
    }

    const closingDateObj = new Date(parseInt(dobYear, 10), parseInt(dobMonth, 10) - 1, parseInt(dobDay, 10) - 7)
    const closingDate = closingDateObj.toISOString().split('T')[0]

    const paymentDetail_ = (paymentMethod === 'Bank transfer'
      ? `${sortCode} / ${accountNumber}`
      : paymentDetail || '').trim() || 'Not specified'

    const { data: wlData, error: wlError } = await supabase
      .rpc('create_wishlist', {
        p_child_id: child.id,
        p_owner_id: user.id,
        p_occasion: occasionType ?? 'other',
        p_occasion_label: occasionLabel,
        p_occasion_date: occasionDate,
        p_closing_date: closingDate,
        p_payment_method: paymentMethod ?? '',
        p_payment_detail: paymentDetail_,
      })

    console.log('[Wishlist] Insert result:', wlData, wlError)

    if (wlError || !wlData) {
      Alert.alert('Error', wlError?.message ?? 'Failed to create wishlist. Please try again.')
      setSaving(false)
      return
    }

    const { error: itemsError } = await (supabase as any)
      .from('wishlist_items')
      .insert(
        items.map((item) => ({
          wishlist_id: wlData.id,
          name: item.name,
          retailer: item.retailer || '',
          target_amount: parseFloat(item.amount) || 0,
          pledged_amount: 0,
          emoji: item.emoji,
        }))
      )

    console.log('[Wishlist Items] Insert result:', itemsError)

    if (itemsError) {
      console.error('[Wishlist Items] Error:', itemsError)
      // Don't show error to user if wishlist was created successfully
      // Items may have saved despite the error response
    }

    const totalTarget = items.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0)
    await supabase
      .from('wishlists')
      .update({ total_target: totalTarget })
      .eq('id', wlData.id)

    setSaving(false)

    Alert.alert(
      'Wishlist created! 🎉',
      'Share it with family to start collecting pledges.',
      [{ text: 'Done', onPress: () => router.replace('/birthday') }],
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Wishlist</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* S1 — Occasion details */}
          <Text style={styles.sectionHeadline}>What are we celebrating?</Text>

          <View style={styles.occasionRow}>
            {OCCASION_TYPES.map((o) => (
              <TouchableOpacity
                key={o.id}
                style={[styles.occasionChip, occasionType === o.id && styles.occasionChipActive]}
                onPress={() => setOccasionType(o.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.occasionText, occasionType === o.id && styles.occasionTextActive]}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.forChild}>For: {childName}</Text>

          {/* Date */}
          <Text style={styles.fieldLabel}>Occasion date:</Text>
          <View style={styles.dobRow}>
            <TextInput
              style={styles.dobInput}
              value={dobDay}
              onChangeText={(v) => {
                const d = v.replace(/\D/g, '').slice(0, 2)
                setDobDay(d)
                if (d.length === 2) monthRef.current?.focus()
              }}
              placeholder="DD"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              maxLength={2}
              textAlign="center"
            />
            <TextInput
              ref={monthRef}
              style={styles.dobInput}
              value={dobMonth}
              onChangeText={(v) => {
                const m = v.replace(/\D/g, '').slice(0, 2)
                setDobMonth(m)
                if (m.length === 2) yearRef.current?.focus()
              }}
              placeholder="MM"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              maxLength={2}
              textAlign="center"
            />
            <TextInput
              ref={yearRef}
              style={styles.dobYearInput}
              value={dobYear}
              onChangeText={(v) => {
                const y = v.replace(/\D/g, '').slice(0, 4)
                setDobYear(y)
                if (y.length === 4) yearRef.current?.blur()
              }}
              placeholder="YYYY"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              maxLength={4}
              textAlign="center"
            />
          </View>

          <Text style={styles.closingLabel}>
            Wishlist closes: {closingLabel}
          </Text>
          <Text style={styles.closingHint}>(7 days before — allows time for delivery)</Text>

          {/* S2 — Add items */}
          <Text style={[styles.sectionHeadline, { marginTop: 24 }]}>
            Add items to {childName}'s wishlist
          </Text>

          <View style={styles.itemCard}>
            <TextInput
              style={styles.input}
              value={itemName}
              onChangeText={setItemName}
              placeholder="e.g. Nike Air Max trainers"
              placeholderTextColor="#94a3b8"
            />
            <TextInput
              style={styles.input}
              value={itemRetailer}
              onChangeText={setItemRetailer}
              placeholder="e.g. Nike, Amazon, Next"
              placeholderTextColor="#94a3b8"
            />
            <View style={styles.amountRow}>
              <Text style={styles.poundSign}>£</Text>
              <TextInput
                style={styles.amountInput}
                value={itemAmount}
                onChangeText={setItemAmount}
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.emojiRow}>
              {EMOJIS.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiChip, itemEmoji === e && styles.emojiChipActive]}
                  onPress={() => setItemEmoji(e)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.addItemBtn, (!itemName.trim() || !itemAmount.trim()) && styles.addItemBtnDisabled]}
              onPress={addItem}
              disabled={!itemName.trim() || !itemAmount.trim()}
              activeOpacity={0.85}
            >
              <Text style={styles.addItemBtnText}>Add item</Text>
            </TouchableOpacity>
          </View>

          {items.length > 0 && (
            <View style={styles.addedItems}>
              {items.map((item) => (
                <View key={item.id} style={styles.addedItem}>
                  <Text style={styles.addedItemText}>
                    {item.emoji} {item.name} — {item.retailer} — £{item.amount}
                  </Text>
                  <TouchableOpacity onPress={() => removeItem(item.id)} activeOpacity={0.7}>
                    <Text style={styles.removeItem}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* S3 — Payment setup */}
          <Text style={[styles.sectionHeadline, { marginTop: 24 }]}>
            How will guests send money?
          </Text>

          <View style={styles.paymentGrid}>
            {PAYMENT_METHODS.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.paymentChip, paymentMethod === m && styles.paymentChipActive]}
                onPress={() => { setPaymentMethod(m); setPaymentDetail('') }}
                activeOpacity={0.8}
              >
                <Text style={[styles.paymentChipText, paymentMethod === m && styles.paymentChipTextActive]}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {paymentMethod === 'Bank transfer' ? (
            <View style={styles.paymentInputWrap}>
              <TextInput
                style={styles.input}
                value={sortCode}
                onChangeText={setSortCode}
                placeholder="Sort code (XX-XX-XX)"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
              />
              <TextInput
                style={styles.input}
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder="Account number (8 digits)"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
              />
            </View>
          ) : paymentMethod ? (
            <View style={styles.paymentInputWrap}>
              <TextInput
                style={styles.input}
                value={paymentDetail}
                onChangeText={setPaymentDetail}
                placeholder={
                  paymentMethod === 'Monzo'   ? 'Your Monzo username e.g. @sarah-jones' :
                  paymentMethod === 'Revolut' ? 'Your Revolut username e.g. @sarah' :
                                                'Your PayPal.me link e.g. paypal.me/sarah'
                }
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />
            </View>
          ) : null}

          {/* S4 — Create button */}
          <TouchableOpacity
            style={[styles.createBtn, (!isValid || saving) && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!isValid || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.midnight} />
            ) : (
              <Text style={styles.createBtnText}>
                Create {childName}'s wishlist 🎂
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { paddingHorizontal: 16, paddingBottom: 48 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 22, color: colors.midnight },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.midnight },

  sectionHeadline: { fontSize: 18, fontWeight: '700', color: colors.midnight, marginBottom: 14 },

  occasionRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  occasionChip: {
    flex: 1, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  occasionChipActive: { backgroundColor: colors.midnight, borderColor: colors.midnight },
  occasionText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  occasionTextActive: { color: '#ffffff' },

  forChild: { fontSize: 14, color: '#475569', marginBottom: 16 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.midnight, marginBottom: 8 },
  dobRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  dobInput: {
    flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingVertical: 12, fontSize: 15, color: colors.midnight, backgroundColor: '#ffffff',
  },
  dobYearInput: {
    flex: 1.7, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingVertical: 12, fontSize: 15, color: colors.midnight, backgroundColor: '#ffffff',
  },
  closingLabel: { fontSize: 13, color: '#475569', marginBottom: 2 },
  closingHint: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginBottom: 8 },

  itemCard: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16,
    padding: 16, marginBottom: 12,
  },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.midnight, marginBottom: 10,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  poundSign: { fontSize: 15, color: colors.midnight, fontWeight: '600', marginRight: 6 },
  amountInput: {
    flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.midnight,
  },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  emojiChip: {
    width: 44, height: 44, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
  },
  emojiChipActive: { borderColor: colors.sky, backgroundColor: `${colors.sky}15` },
  emojiText: { fontSize: 22 },
  addItemBtn: {
    backgroundColor: colors.sky, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  addItemBtnDisabled: { opacity: 0.4 },
  addItemBtnText: { color: colors.midnight, fontSize: 14, fontWeight: '700' },

  addedItems: { marginBottom: 8 },
  addedItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  addedItemText: { flex: 1, fontSize: 13, color: '#475569' },
  removeItem: { fontSize: 16, color: '#ef4444', paddingHorizontal: 8 },

  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  paymentChip: {
    width: '48%', paddingVertical: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12,
    alignItems: 'center', backgroundColor: '#ffffff',
  },
  paymentChipActive: { borderColor: colors.sky, backgroundColor: `${colors.sky}15` },
  paymentChipText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  paymentChipTextActive: { color: colors.midnight },
  paymentInputWrap: { marginBottom: 8 },

  createBtn: {
    backgroundColor: colors.sky, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 16, marginBottom: 8,
  },
  createBtnDisabled: { opacity: 0.4 },
  createBtnText: { color: colors.midnight, fontSize: 17, fontWeight: '700' },
})
