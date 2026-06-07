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

export default function PaymentSettingsScreen() {
  const router = useRouter()
  const { user } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [bankName, setBankName] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')
  const [bankSortCode, setBankSortCode] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [payMonzo, setPayMonzo] = useState('')
  const [payPaypal, setPayPaypal] = useState('')
  const [payRevolut, setPayRevolut] = useState('')

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('payment_method, payment_detail, pay_monzo, pay_paypal, pay_revolut, pay_bank')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const raw = data.pay_bank ?? ''
          if (raw.includes('|')) {
            // New pipe-delimited format: BANK|ACCOUNTNAME|SORTCODE|ACCOUNTNUMBER
            const parts = raw.split('|')
            setBankName(parts[0] ?? '')
            setBankAccountName(parts[1] ?? '')
            setBankSortCode(parts[2] ?? '')
            setBankAccountNumber(parts[3] ?? '')
          } else if (raw.includes(' / ')) {
            // Old format: SORTCODE / ACCOUNTNUMBER
            const parts = raw.split(' / ')
            setBankSortCode(parts[0] ?? '')
            setBankAccountNumber(parts[1] ?? '')
          } else if (raw) {
            setBankAccountNumber(raw)
          }
          setPayMonzo(data.pay_monzo ?? '')
          setPayPaypal(data.pay_paypal ?? '')
          setPayRevolut(data.pay_revolut ?? '')
        }
        setIsLoading(false)
      })
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)

    const sortCode = bankSortCode.trim()
    const accountNumber = bankAccountNumber.trim()
    // Require sort code + account number; bank name and account name are optional
    const payBank = sortCode && accountNumber
      ? `${bankName.trim()}|${bankAccountName.trim()}|${sortCode}|${accountNumber}`
      : null

    // Derive legacy payment_method/payment_detail for backward compat
    const firstMethod =
      payBank           ? 'Bank transfer' :
      payMonzo.trim()   ? 'Monzo' :
      payPaypal.trim()  ? 'PayPal' :
      payRevolut.trim() ? 'Revolut' : ''
    const firstDetail =
      payBank || payMonzo.trim() || payPaypal.trim() || payRevolut.trim() || ''

    const { error } = await supabase
      .from('profiles')
      .update({
        pay_bank:    payBank,
        pay_monzo:   payMonzo.trim()   || null,
        pay_paypal:  payPaypal.trim()  || null,
        pay_revolut: payRevolut.trim() || null,
        // Legacy columns — kept for backward compat, not removed yet
        payment_method: firstMethod,
        payment_detail: firstDetail,
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
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment settings</Text>
          <View style={{ width: 32 }} />
        </View>

        <Text style={styles.intro}>
          Add any payment methods you'd like guests to use. These are shown to anyone
          you share a wishlist with.
        </Text>

        {/* Bank transfer */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>Bank transfer</Text>
          <TextInput
            style={[styles.input, styles.inputSpaced]}
            value={bankName}
            onChangeText={setBankName}
            placeholder="e.g. Barclays, HSBC, Monzo"
            placeholderTextColor="#94a3b8"
            autoCapitalize="words"
            autoCorrect={false}
          />
          <TextInput
            style={[styles.input, styles.inputSpaced]}
            value={bankAccountName}
            onChangeText={setBankAccountName}
            placeholder="Name on the account"
            placeholderTextColor="#94a3b8"
            autoCapitalize="words"
            autoCorrect={false}
          />
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputHalf]}
              value={bankSortCode}
              onChangeText={(v) => setBankSortCode(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              maxLength={6}
            />
            <TextInput
              style={[styles.input, styles.inputHalf]}
              value={bankAccountNumber}
              onChangeText={(v) => setBankAccountNumber(v.replace(/\D/g, '').slice(0, 8))}
              placeholder="12345678"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              maxLength={8}
            />
          </View>
          <Text style={styles.fieldHint}>Bank name · Account name (optional) · Sort code · Account number</Text>
        </View>

        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>Monzo</Text>
          <TextInput
            style={styles.input}
            value={payMonzo}
            onChangeText={setPayMonzo}
            placeholder="@yourmonzo"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>PayPal</Text>
          <TextInput
            style={styles.input}
            value={payPaypal}
            onChangeText={setPayPaypal}
            placeholder="your@email.com or @handle"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
        </View>

        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>Revolut</Text>
          <TextInput
            style={styles.input}
            value={payRevolut}
            onChangeText={setPayRevolut}
            placeholder="@yourrevolut"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
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
    fontSize: 14,
    color: '#64748b',
    lineHeight: 21,
    marginBottom: 24,
  },

  fieldWrapper: { marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.midnight, marginBottom: 6 },
  fieldHint: { fontSize: 12, color: '#94a3b8', marginTop: 5 },

  inputRow: { flexDirection: 'row', gap: 10 },
  inputHalf: { flex: 1 },
  inputSpaced: { marginBottom: 10 },

  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.midnight,
    backgroundColor: '#ffffff',
  },

  saveBtn: {
    backgroundColor: colors.sky,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: colors.midnight, fontSize: 16, fontWeight: '700' },
})
