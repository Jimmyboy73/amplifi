import { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Clipboard from 'expo-clipboard'
import { supabase } from '@/lib/supabase'
import { colors } from '@/constants/brand'

// ── Helpers ───────────────────────────────────────────────────────────────────

function gbp(n: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n)
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PledgeScreen() {
  const router = useRouter()
  const { id, ref: refCode } = useLocalSearchParams<{ id: string; ref?: string }>()

  const [wishlist, setWishlist] = useState<{
    id: string
    occasion: string
    occasion_date: string
    payment_method: string
  } | null>(null)

  const [items, setItems] = useState<Array<{
    id: string
    name: string
    retailer: string
    targetAmount: number
    pledgedAmount: number
    imageEmoji: string
  }>>([])

  const [isLoading, setIsLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)

  // Pledge form
  const [pledgerName, setPledgerName] = useState('')
  const [pledgerEmail, setPledgerEmail] = useState('')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')

  useEffect(() => {
    if (refCode) {
      AsyncStorage.setItem('amplifi_ref_handle', refCode)
    }
  }, [refCode])

  const handleCopyCode = async () => {
    if (!refCode) return
    await Clipboard.setStringAsync(refCode)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  useEffect(() => {
    if (!id) return

    const fetchData = async () => {
      setIsLoading(true)

      const { data: wlData } = await supabase
        .from('wishlists')
        .select('id, occasion, occasion_date, payment_method')
        .eq('id', id)
        .single()

      if (wlData) setWishlist(wlData)

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
          imageEmoji: i.emoji,
        })))
      }

      setIsLoading(false)
    }

    fetchData()
  }, [id])

  const selectedItem = items.find((i) => i.id === selectedItemId) ?? null
  const isValid = pledgerName.trim().length > 0 && parseFloat(amount) > 0

  const handleSubmitPledge = async () => {
    if (!isValid || submitting || !id) return
    setSubmitting(true)

    const { error } = await supabase.from('pledges').insert({
      wishlist_id: id,
      wishlist_item_id: selectedItemId ?? null,
      pledger_name: pledgerName.trim(),
      pledger_email: pledgerEmail.trim() || null,
      amount: parseFloat(amount),
      item_label: selectedItem?.name ?? null,
      status: 'pending',
    })

    setSubmitting(false)

    if (error) {
      Alert.alert('Error', error.message)
      return
    }

    Alert.alert(
      'Pledge submitted! 🎉',
      `Thank you ${pledgerName}! Please send ${gbp(parseFloat(amount))} to ${wishlist?.payment_method ?? 'the payment link'}. Your pledge will be confirmed once received.`,
      [{ text: 'Done', onPress: () => router.back() }],
    )
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.sky} />
      </View>
    )
  }

  if (!wishlist) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={styles.notFoundText}>Wishlist not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  const occasionDate = new Date(wishlist.occasion_date)

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{wishlist.occasion}</Text>
            <View style={{ width: 32 }} />
          </View>

          <Text style={styles.date}>
            🎂 {occasionDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>

          {/* Items */}
          <Text style={styles.sectionTitle}>What would they love?</Text>

          {items.map((item) => {
            const pct = item.targetAmount > 0
              ? Math.min(item.pledgedAmount / item.targetAmount, 1) * 100
              : 0
            const isSelected = selectedItemId === item.id
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                onPress={() => setSelectedItemId(isSelected ? null : item.id)}
                activeOpacity={0.8}
              >
                <View style={styles.itemTop}>
                  <Text style={styles.itemName}>{item.imageEmoji} {item.name}</Text>
                  <Text style={styles.itemRetailer}>{item.retailer}</Text>
                </View>
                <View style={styles.itemTrack}>
                  <View style={[styles.itemFill, { width: `${pct.toFixed(0)}%` as `${number}%` }]} />
                </View>
                <Text style={styles.itemProgress}>
                  {gbp(item.pledgedAmount)} of {gbp(item.targetAmount)} pledged
                </Text>
                {isSelected && (
                  <Text style={styles.selectedBadge}>✓ Contributing to this item</Text>
                )}
              </TouchableOpacity>
            )
          })}

          {/* Pledge form */}
          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Your pledge</Text>

          <TextInput
            style={styles.input}
            value={pledgerName}
            onChangeText={setPledgerName}
            placeholder="Your name"
            placeholderTextColor="#94a3b8"
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
            value={pledgerEmail}
            onChangeText={setPledgerEmail}
            placeholder="Email (optional — for receipt)"
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={styles.amountRow}>
            <Text style={styles.poundSign}>£</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
            />
          </View>

          {/* Payment instructions */}
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentLabel}>Send your payment to:</Text>
            <Text style={styles.paymentValue}>{wishlist.payment_method}</Text>
            <Text style={styles.paymentHint}>
              Submit your pledge below, then send the money separately using the details above.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, (!isValid || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmitPledge}
            disabled={!isValid || submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.midnight} />
            ) : (
              <Text style={styles.submitBtnText}>Submit pledge 🎁</Text>
            )}
          </TouchableOpacity>

          {refCode && (
            <View style={styles.referralCallout}>
              <Text style={styles.referralCalloutText}>
                Want to start building your child's financial future? Use code{' '}
                <Text style={styles.referralCodeText}>{refCode}</Text>
                {' '}when you sign up to Amplifi and you'll both get £5 credit when you link a JISA.
              </Text>
              <TouchableOpacity onPress={handleCopyCode} style={styles.copyBtn} activeOpacity={0.7}>
                <Text style={styles.copyBtnText}>
                  {codeCopied ? 'Copied!' : `Copy code: ${refCode}`}
                </Text>
              </TouchableOpacity>
            </View>
          )}

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

  date: { fontSize: 15, color: '#64748b', marginBottom: 24 },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.midnight,
    marginBottom: 12,
  },

  itemCard: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  itemCardSelected: {
    borderColor: colors.sky,
    backgroundColor: `${colors.sky}0D`,
  },
  itemTop: { marginBottom: 8 },
  itemName: { fontSize: 15, fontWeight: '700', color: colors.midnight },
  itemRetailer: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  itemTrack: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  itemFill: { height: 6, backgroundColor: colors.sky, borderRadius: 3 },
  itemProgress: { fontSize: 12, color: '#64748b' },
  selectedBadge: { fontSize: 13, color: colors.sky, fontWeight: '600', marginTop: 6 },

  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.midnight,
    marginBottom: 10,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  poundSign: { fontSize: 15, color: colors.midnight, fontWeight: '600', marginRight: 6 },
  amountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.midnight,
  },

  paymentInfo: {
    backgroundColor: colors.offwhite,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  paymentLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 4 },
  paymentValue: { fontSize: 15, fontWeight: '700', color: colors.midnight, marginBottom: 6 },
  paymentHint: { fontSize: 12, color: '#94a3b8', lineHeight: 18 },

  submitBtn: {
    backgroundColor: colors.sky,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: colors.midnight, fontSize: 17, fontWeight: '700' },

  notFoundText: { fontSize: 16, color: '#94a3b8', textAlign: 'center' },

  referralCallout: {
    backgroundColor: colors.midnight,
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
  },
  referralCalloutText: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 21,
    marginBottom: 12,
  },
  referralCodeText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.sky,
  },
  copyBtn: {
    backgroundColor: colors.sky,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  copyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.midnight,
    letterSpacing: 1,
  },
})
