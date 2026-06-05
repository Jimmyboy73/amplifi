import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '@/constants/brand'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSortCode(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 6)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`
}

const PROVIDERS = [
  { name: 'Hargreaves Lansdown', location: 'Settings → Account Details → Payment Reference' },
  { name: 'AJ Bell', location: 'My Account → Account Details → Reference' },
  { name: 'Moneybox', location: 'Profile → Bank Details → Reference' },
  { name: 'Vanguard', location: 'Account → Payments → Payment Reference' },
]

// ── Screen ────────────────────────────────────────────────────────────────────

export default function IsaLinkScreen() {
  const router = useRouter()
  const { childName } = useLocalSearchParams<{ childName: string }>()
  const name = typeof childName === 'string' && childName.length > 0 ? childName : 'your child'

  const [sortCode, setSortCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [reference, setReference] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  const rawSortDigits = sortCode.replace(/\D/g, '')
  const isFormValid =
    rawSortDigits.length === 6 &&
    accountNumber.length === 8 &&
    reference.trim().length > 0

  const handleSortCodeChange = (v: string) => {
    setSortCode(formatSortCode(v))
  }

  const handleAccountChange = (v: string) => {
    setAccountNumber(v.replace(/\D/g, '').slice(0, 8))
  }

  const handleContinue = () => {
    if (!isFormValid) return
    router.push({
      pathname: '/(auth)/card',
      params: {
        childName: name,
        sortCode: rawSortDigits,
        accountNumber,
        reference: reference.trim(),
      },
    })
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              style={styles.backBtn}
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.progress}>5 of 8</Text>
          </View>

          <Text style={styles.headline}>Link your JISA or ISA</Text>
          <Text style={styles.subheadline}>
            We'll send your cashback here automatically.
          </Text>

          {/* Sort code */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>Sort code</Text>
            <TextInput
              style={styles.input}
              value={sortCode}
              onChangeText={handleSortCodeChange}
              placeholder="XX-XX-XX"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              maxLength={8}
            />
          </View>

          {/* Account number */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>Account number</Text>
            <TextInput
              style={styles.input}
              value={accountNumber}
              onChangeText={handleAccountChange}
              placeholder="8 digits"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              maxLength={8}
            />
          </View>

          {/* Payment reference */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>Payment reference</Text>
            <TextInput
              style={styles.input}
              value={reference}
              onChangeText={setReference}
              placeholder="e.g. ISA123456"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
            />
            <Text style={styles.helpHint}>
              This is specific to your provider — it tells them which account to credit.
            </Text>
          </View>

          {/* Provider help accordion */}
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => setShowHelp((v) => !v)}
            activeOpacity={0.8}
          >
            <Text style={styles.accordionLabel}>Where do I find my reference?</Text>
            <Text style={styles.accordionChevron}>{showHelp ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showHelp && (
            <View style={styles.accordionBody}>
              {PROVIDERS.map((p) => (
                <View key={p.name} style={styles.providerRow}>
                  <Text style={styles.providerName}>{p.name}</Text>
                  <Text style={styles.providerLocation}>{p.location}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Confirmation card */}
          {isFormValid && (
            <View style={styles.confirmCard}>
              <Text style={styles.confirmText}>
                We'll send cashback to account{' '}
                <Text style={styles.confirmBold}>{sortCode} / {accountNumber}</Text>
                {'\n'}with reference{' '}
                <Text style={styles.confirmBold}>{reference.trim()}</Text>
              </Text>
            </View>
          )}

          {/* CTA */}
          <TouchableOpacity
            style={[styles.cta, !isFormValid && styles.ctaDisabled]}
            onPress={handleContinue}
            disabled={!isFormValid}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>Save and continue</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 22, color: colors.midnight },
  progress: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  headline: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.midnight,
    letterSpacing: -0.5,
    marginTop: 8,
    marginBottom: 8,
  },
  subheadline: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 28,
  },
  fieldWrapper: { marginBottom: 20 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.midnight,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.midnight,
    backgroundColor: '#ffffff',
  },
  helpHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 5,
    lineHeight: 17,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginBottom: 0,
  },
  accordionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.sky,
  },
  accordionChevron: {
    fontSize: 11,
    color: colors.sky,
  },
  accordionBody: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  providerRow: { gap: 2 },
  providerName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.midnight,
  },
  providerLocation: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 17,
  },
  confirmCard: {
    backgroundColor: '#f0fbff',
    borderWidth: 1,
    borderColor: `${colors.sky}55`,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    marginTop: 4,
  },
  confirmText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  confirmBold: {
    fontWeight: '700',
    color: colors.midnight,
  },
  cta: {
    backgroundColor: colors.sky,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: colors.midnight, fontSize: 17, fontWeight: '700' },
})
