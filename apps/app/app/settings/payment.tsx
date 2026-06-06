import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { colors } from '@/constants/brand'

// ── Constants ─────────────────────────────────────────────────────────────────

const PAYMENT_METHODS = ['Monzo', 'Revolut', 'PayPal', 'Bank transfer'] as const
type PaymentMethod = typeof PAYMENT_METHODS[number]

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PaymentSettingsScreen() {
  const router = useRouter()
  const { user } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null)
  const [paymentDetail, setPaymentDetail] = useState('')
  const [sortCode, setSortCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('payment_method, payment_detail')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.payment_method) {
          const method = data.payment_method as PaymentMethod
          setSelectedPayment(method)
          if (method === 'Bank transfer') {
            const parts = (data.payment_detail ?? '').split(' / ')
            setSortCode(parts[0] ?? '')
            setAccountNumber(parts[1] ?? '')
          } else {
            setPaymentDetail(data.payment_detail ?? '')
          }
        }
        setIsLoading(false)
      })
  }, [user])

  const detailValue = selectedPayment === 'Bank transfer'
    ? `${sortCode} / ${accountNumber}`
    : paymentDetail

  const canSave = selectedPayment !== null && (
    selectedPayment === 'Bank transfer'
      ? sortCode.length > 0 && accountNumber.length > 0
      : paymentDetail.trim().length > 0
  )

  const handleSave = async () => {
    if (!user || !canSave) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        payment_method: selectedPayment,
        payment_detail: detailValue.trim(),
      })
      .eq('id', user.id)

    setSaving(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      Alert.alert('Saved', 'Payment settings updated.', [
        { text: 'Done', onPress: () => router.back() },
      ])
    }
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.sky} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment settings</Text>
          <View style={{ width: 32 }} />
        </View>

        <Text style={styles.intro}>
          Set up how family and friends send you money for wishlists. This is shown to guests when they contribute to a wishlist.
        </Text>

        {/* Method selector */}
        <Text style={styles.fieldLabel}>Payment method</Text>
        <View style={styles.paymentGrid}>
          {PAYMENT_METHODS.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.paymentChip, selectedPayment === m && styles.paymentChipActive]}
              onPress={() => { setSelectedPayment(m); setPaymentDetail(''); setSortCode(''); setAccountNumber('') }}
              activeOpacity={0.8}
            >
              <Text style={[styles.paymentChipText, selectedPayment === m && styles.paymentChipTextActive]}>
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Detail input */}
        {selectedPayment === 'Bank transfer' ? (
          <View>
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
        ) : selectedPayment ? (
          <TextInput
            style={styles.input}
            value={paymentDetail}
            onChangeText={setPaymentDetail}
            placeholder={
              selectedPayment === 'Monzo'   ? 'Your Monzo username e.g. @sarah-jones' :
              selectedPayment === 'Revolut' ? 'Your Revolut username e.g. @sarah' :
                                              'Your PayPal.me link e.g. paypal.me/sarah'
            }
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
          />
        ) : null}

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, (!canSave || saving) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave || saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.midnight} />
          ) : (
            <Text style={styles.saveBtnText}>Save payment settings</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
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

  intro: {
    fontSize: 14, color: '#64748b', lineHeight: 21,
    marginBottom: 24,
  },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.midnight, marginBottom: 10 },

  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  paymentChip: {
    width: '48%', paddingVertical: 14,
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12,
    alignItems: 'center', backgroundColor: '#ffffff',
  },
  paymentChipActive: { borderColor: colors.sky, backgroundColor: `${colors.sky}15` },
  paymentChipText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  paymentChipTextActive: { color: colors.midnight },

  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: colors.midnight, marginBottom: 10,
  },

  saveBtn: {
    backgroundColor: colors.sky, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: colors.midnight, fontSize: 16, fontWeight: '700' },
})
