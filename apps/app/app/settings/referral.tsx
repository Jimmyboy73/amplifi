import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { redeemReferral } from '@/lib/redeemReferral'
import { colors } from '@/constants/brand'

export default function ReferralCodeScreen() {
  const router = useRouter()
  const { user } = useAuth()

  const [pageLoading, setPageLoading] = useState(true)
  const [alreadyReferred, setAlreadyReferred] = useState(false)
  const [code, setCode] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('referral_events')
      .select('id')
      .eq('referred_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setAlreadyReferred(!!data)
        setPageLoading(false)
      })
  }, [user])

  const handleApply = async () => {
    if (!user || submitting) return
    setFieldError('')
    setSubmitting(true)

    const result = await redeemReferral(code, user.id)
    setSubmitting(false)

    if (!result.ok) {
      setFieldError(result.error)
      return
    }

    setSuccess(true)
  }

  if (pageLoading) {
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
          <Text style={styles.headerTitle}>Referral code</Text>
          <View style={{ width: 32 }} />
        </View>

        {alreadyReferred ? (
          <View style={styles.centreCard}>
            <Text style={styles.centreIcon}>✓</Text>
            <Text style={styles.centreTitle}>Already referred</Text>
            <Text style={styles.centreBody}>
              You've already used a referral. Your £5 credit will appear once you link a savings account.
            </Text>
          </View>
        ) : success ? (
          <View style={styles.centreCard}>
            <Text style={styles.centreIcon}>🎉</Text>
            <Text style={styles.centreTitle}>Referral applied!</Text>
            <Text style={styles.centreBody}>
              You and your friend will each receive £5 into your kids' Junior ISAs once you link a savings account.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.intro}>
              Got a friend's handle? Enter it here and you'll both receive £5 credited to your kids' Junior ISAs when you link a savings account.
            </Text>

            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>Their @handle</Text>
              <View style={[styles.atInputRow, fieldError ? styles.inputError : undefined]}>
                <Text style={styles.atPrefix}>@</Text>
                <TextInput
                  style={styles.atInput}
                  value={code}
                  onChangeText={(v) => {
                    setFieldError('')
                    setCode(v.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().slice(0, 20))
                  }}
                  placeholder="their_handle"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                />
              </View>
              {fieldError ? <Text style={styles.fieldError}>{fieldError}</Text> : null}
            </View>

            <TouchableOpacity
              style={[styles.applyBtn, (submitting || code.length < 3) && styles.applyBtnDisabled]}
              onPress={handleApply}
              disabled={submitting || code.length < 3}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.applyBtnText}>Apply code</Text>
              )}
            </TouchableOpacity>
          </>
        )}
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

  intro: { fontSize: 14, color: '#64748b', lineHeight: 21, marginBottom: 28 },

  fieldWrapper: { marginBottom: 24 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.midnight, marginBottom: 8 },
  atInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
  },
  atPrefix: { fontSize: 20, fontWeight: '700', color: colors.azure, marginRight: 2 },
  atInput: { flex: 1, paddingVertical: 14, fontSize: 18, fontWeight: '600', color: colors.midnight },
  inputError: { borderColor: '#ef4444' },
  fieldError: { fontSize: 12, color: '#ef4444', marginTop: 6, textAlign: 'center' },

  applyBtn: {
    backgroundColor: colors.azure,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyBtnDisabled: { opacity: 0.4 },
  applyBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },

  centreCard: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 },
  centreIcon: { fontSize: 44, marginBottom: 16, color: colors.sky },
  centreTitle: { fontSize: 20, fontWeight: '700', color: colors.midnight, marginBottom: 10, textAlign: 'center' },
  centreBody: { fontSize: 14, color: '#64748b', lineHeight: 22, textAlign: 'center' },
})
