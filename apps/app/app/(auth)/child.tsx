import { useState, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { colors } from '@/constants/brand'

// ── Validation ────────────────────────────────────────────────────────────────

function isValidChildDOB(d: string, m: string, y: string): boolean {
  const day = parseInt(d, 10)
  const month = parseInt(m, 10)
  const year = parseInt(y, 10)
  if (isNaN(day) || isNaN(month) || isNaN(year) || y.length < 4) return false
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) return false
  const dob = new Date(year, month - 1, day)
  if (dob.getMonth() !== month - 1) return false
  const ageYears = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  return ageYears >= 0 && ageYears < 18
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ChildScreen() {
  const router = useRouter()
  const { user } = useAuth()

  const dobDayRef = useRef<TextInput>(null)
  const dobMonthRef = useRef<TextInput>(null)
  const dobYearRef = useRef<TextInput>(null)

  const [childName, setChildName] = useState('')
  const [dobDay, setDobDay] = useState('')
  const [dobMonth, setDobMonth] = useState('')
  const [dobYear, setDobYear] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [dobTouched, setDobTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [insertError, setInsertError] = useState('')

  const trimmedName = childName.trim()
  const dobLabel = trimmedName
    ? `What's ${trimmedName}'s date of birth?`
    : "What's their date of birth?"

  const dobError =
    dobTouched && !isValidChildDOB(dobDay, dobMonth, dobYear)
      ? 'Please enter a valid date of birth (0–17 years)'
      : ''

  const isFormValid = trimmedName.length > 0 && isValidChildDOB(dobDay, dobMonth, dobYear)

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library to add a photo.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled && result.assets.length > 0) {
      setPhoto(result.assets[0].uri)
    }
  }

  const handleContinue = async () => {
    if (!isFormValid || submitting || !user) return
    setSubmitting(true)
    setInsertError('')

    const dob = `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`

    // 1. Insert child record
    const { data: childData, error: childError } = await supabase
      .from('children')
      .insert({
        owner_id: user.id,
        name: trimmedName,
        date_of_birth: dob,
        photo_url: photo,
      })
      .select('id')
      .single()

    if (childError || !childData) {
      setInsertError(childError?.message ?? 'Failed to save child profile. Please try again.')
      setSubmitting(false)
      return
    }

    // 2. Create wallet for child
    const { error: walletError } = await supabase.from('wallets').insert({
      owner_id: user.id,
      balance: 0,
      total_earned: 0,
    })
    if (walletError) {
      console.error('[Wallet Upsert] FAILED:', walletError.message)
    }

    setSubmitting(false)
    router.replace('/(tabs)/home')
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
          <Text style={styles.progress}>5 of 5</Text>
        </View>

        <Text style={styles.headline}>Who are we building a pot for?</Text>
        <Text style={styles.subheadline}>Tell us about your child. You can add more children later.</Text>

        {/* Child's name */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>Child's first name</Text>
          <TextInput
            style={styles.input}
            value={childName}
            onChangeText={setChildName}
            placeholder="e.g. Oliver"
            placeholderTextColor="#94a3b8"
            autoCapitalize="words"
          />
        </View>

        {/* Date of birth */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>{dobLabel}</Text>
          <View style={styles.dobRow}>
            <TextInput
              ref={dobDayRef}
              style={[styles.dobInput, dobError ? styles.inputError : null]}
              value={dobDay}
              onChangeText={(v) => {
                const digits = v.replace(/\D/g, '').slice(0, 2)
                setDobDay(digits)
                if (digits.length === 2) dobMonthRef.current?.focus()
              }}
              onBlur={() => setDobTouched(true)}
              placeholder="DD"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              maxLength={2}
              textAlign="center"
            />
            <TextInput
              ref={dobMonthRef}
              style={[styles.dobInput, dobError ? styles.inputError : null]}
              value={dobMonth}
              onChangeText={(v) => {
                const digits = v.replace(/\D/g, '').slice(0, 2)
                setDobMonth(digits)
                if (digits.length === 2) dobYearRef.current?.focus()
              }}
              onBlur={() => setDobTouched(true)}
              placeholder="MM"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              maxLength={2}
              textAlign="center"
            />
            <TextInput
              ref={dobYearRef}
              style={[styles.dobYearInput, dobError ? styles.inputError : null]}
              value={dobYear}
              onChangeText={(v) => {
                const digits = v.replace(/\D/g, '').slice(0, 4)
                setDobYear(digits)
                if (digits.length === 4) dobYearRef.current?.blur()
              }}
              onBlur={() => setDobTouched(true)}
              placeholder="YYYY"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              maxLength={4}
              textAlign="center"
            />
          </View>
          {dobError ? <Text style={styles.fieldError}>{dobError}</Text> : null}
        </View>

        {/* Photo picker */}
        <View style={styles.photoSection}>
          <TouchableOpacity style={styles.photoCircle} onPress={pickImage} activeOpacity={0.8}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.photoImage} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoIcon}>📷</Text>
                <Text style={styles.photoLabel}>
                  Add {trimmedName ? `${trimmedName}'s` : 'a'} photo
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPhoto(null)} activeOpacity={0.7} style={{ marginTop: 12 }}>
            <Text style={styles.skipLink}>Skip for now</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>Add another child after setup</Text>

        {insertError ? <Text style={styles.insertError}>{insertError}</Text> : null}

        {/* CTA */}
        <TouchableOpacity
          style={[styles.cta, (!isFormValid || submitting) && styles.ctaDisabled]}
          onPress={handleContinue}
          disabled={!isFormValid || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.midnight} />
          ) : (
            <Text style={styles.ctaText}>Continue</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 22, color: colors.midnight },
  progress: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  headline: { fontSize: 26, fontWeight: '800', color: colors.midnight, letterSpacing: -0.5, marginTop: 8, marginBottom: 8 },
  subheadline: { fontSize: 15, color: '#64748b', lineHeight: 22, marginBottom: 28 },
  fieldWrapper: { marginBottom: 24 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.midnight, marginBottom: 6 },
  fieldError: { fontSize: 12, color: '#ef4444', marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.midnight, backgroundColor: '#ffffff' },
  inputError: { borderColor: '#ef4444' },
  dobRow: { flexDirection: 'row', gap: 10 },
  dobInput: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 12, fontSize: 15, color: colors.midnight, backgroundColor: '#ffffff' },
  dobYearInput: { flex: 1.7, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 12, fontSize: 15, color: colors.midnight, backgroundColor: '#ffffff' },
  photoSection: { alignItems: 'center', marginBottom: 28 },
  photoCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', overflow: 'hidden' },
  photoImage: { width: 120, height: 120 },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  photoIcon: { fontSize: 28, marginBottom: 6 },
  photoLabel: { fontSize: 11, color: '#64748b', textAlign: 'center', lineHeight: 15 },
  skipLink: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  footerNote: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 16 },
  insertError: { fontSize: 13, color: '#ef4444', marginBottom: 12, lineHeight: 19 },
  cta: { backgroundColor: colors.sky, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: colors.midnight, fontSize: 17, fontWeight: '700' },
})
