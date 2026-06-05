import { useState, useRef } from 'react'
import type { ReactNode } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { colors } from '@/constants/brand'

// ── Validation ────────────────────────────────────────────────────────────────

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
const isValidPhone = (v: string) => v.replace(/\D/g, '').length >= 10
const isValidPassword = (v: string) => v.length >= 8

function isValidDOB(d: string, m: string, y: string): boolean {
  const day = parseInt(d, 10)
  const month = parseInt(m, 10)
  const year = parseInt(y, 10)
  if (isNaN(day) || isNaN(month) || isNaN(year) || y.length < 4) return false
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) return false
  const dob = new Date(year, month - 1, day)
  if (dob.getMonth() !== month - 1) return false
  const ageYears = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  return ageYears >= 18
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error: string; children: ReactNode }) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function DetailsScreen() {
  const router = useRouter()

  const dobDayRef = useRef<TextInput>(null)
  const dobMonthRef = useRef<TextInput>(null)
  const dobYearRef = useRef<TextInput>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [dobDay, setDobDay] = useState('')
  const [dobMonth, setDobMonth] = useState('')
  const [dobYear, setDobYear] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [authError, setAuthError] = useState('')

  const [touched, setTouched] = useState({
    name: false, email: false, phone: false, dob: false, password: false,
  })

  const touch = (field: keyof typeof touched) =>
    setTouched((t) => ({ ...t, [field]: true }))

  const errors = {
    name: touched.name && name.trim().length === 0 ? 'Please enter your full name' : '',
    email: touched.email && !isValidEmail(email) ? 'Please enter a valid email address' : '',
    phone: touched.phone && !isValidPhone(phone) ? 'Please enter a valid phone number' : '',
    dob: touched.dob && !isValidDOB(dobDay, dobMonth, dobYear)
      ? 'Please enter a valid date of birth (must be 18+)' : '',
    password: touched.password && !isValidPassword(password)
      ? 'Password must be at least 8 characters' : '',
  }

  const isFormValid =
    name.trim().length > 0 &&
    isValidEmail(email) &&
    isValidPhone(phone) &&
    isValidDOB(dobDay, dobMonth, dobYear) &&
    isValidPassword(password) &&
    agreed

  const handleContinue = async () => {
    if (!isFormValid || submitting) return
    setSubmitting(true)
    setAuthError('')

    // 1. Sign up with Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })

    if (signUpError) {
      const msg = signUpError.message.toLowerCase()
      setAuthError(
        msg.includes('already registered') || msg.includes('already exists')
          ? 'An account with this email already exists. Sign in instead.'
          : signUpError.message,
      )
      setSubmitting(false)
      return
    }

    if (!data.user) {
      setAuthError('Something went wrong. Please try again.')
      setSubmitting(false)
      return
    }

    // Allow session to fully establish before writing to public schema
    await new Promise((resolve) => setTimeout(resolve, 500))

    // 2. Insert profile row
    const dob = `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: name.trim(),
      phone: phone.trim() || null,
      date_of_birth: dob,
    })

    if (profileError) {
      setAuthError(profileError.message)
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    router.push('/(auth)/child')
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
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.progress}>2 of 8</Text>
          </View>

          <Text style={styles.headline}>Let's get you set up</Text>
          <Text style={styles.subheadline}>We need a few details to create your account.</Text>

          <Field label="Full name" error={errors.name}>
            <TextInput
              style={[styles.input, errors.name ? styles.inputError : null]}
              value={name}
              onChangeText={setName}
              onBlur={() => touch('name')}
              placeholder="Jane Smith"
              placeholderTextColor="#94a3b8"
              autoComplete="name"
              autoCapitalize="words"
            />
          </Field>

          <Field label="Email address" error={errors.email}>
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              value={email}
              onChangeText={setEmail}
              onBlur={() => touch('email')}
              placeholder="jane@example.co.uk"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </Field>

          <Field label="Phone number" error={errors.phone}>
            <TextInput
              style={[styles.input, errors.phone ? styles.inputError : null]}
              value={phone}
              onChangeText={setPhone}
              onBlur={() => touch('phone')}
              placeholder="+44 7700 900000"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              autoComplete="tel"
            />
          </Field>

          <Field label="Date of birth" error={errors.dob}>
            <View style={styles.dobRow}>
              <TextInput
                ref={dobDayRef}
                style={[styles.dobInput, errors.dob ? styles.inputError : null]}
                value={dobDay}
                onChangeText={(v) => {
                  const digits = v.replace(/\D/g, '').slice(0, 2)
                  setDobDay(digits)
                  if (digits.length === 2) dobMonthRef.current?.focus()
                }}
                onBlur={() => touch('dob')}
                placeholder="DD"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                maxLength={2}
                textAlign="center"
              />
              <TextInput
                ref={dobMonthRef}
                style={[styles.dobInput, errors.dob ? styles.inputError : null]}
                value={dobMonth}
                onChangeText={(v) => {
                  const digits = v.replace(/\D/g, '').slice(0, 2)
                  setDobMonth(digits)
                  if (digits.length === 2) dobYearRef.current?.focus()
                }}
                onBlur={() => touch('dob')}
                placeholder="MM"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                maxLength={2}
                textAlign="center"
              />
              <TextInput
                ref={dobYearRef}
                style={[styles.dobYearInput, errors.dob ? styles.inputError : null]}
                value={dobYear}
                onChangeText={(v) => {
                  const digits = v.replace(/\D/g, '').slice(0, 4)
                  setDobYear(digits)
                  if (digits.length === 4) dobYearRef.current?.blur()
                }}
                onBlur={() => touch('dob')}
                placeholder="YYYY"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                maxLength={4}
                textAlign="center"
              />
            </View>
          </Field>

          <Field label="Password" error={errors.password}>
            <View style={[styles.passwordRow, errors.password ? styles.inputError : null]}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                onBlur={() => touch('password')}
                placeholder="Min. 8 characters"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn} activeOpacity={0.7}>
                <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </Field>

          {/* Terms */}
          <TouchableOpacity style={styles.checkboxRow} onPress={() => setAgreed((v) => !v)} activeOpacity={0.8}>
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.termsText}>
              I agree to Amplifi's{' '}
              <Text style={styles.termsLink}>Terms</Text>
              {' '}and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          {/* Auth error */}
          {authError ? <Text style={styles.authError}>{authError}</Text> : null}

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
        </ScrollView>
      </KeyboardAvoidingView>
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
  fieldWrapper: { marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.midnight, marginBottom: 6 },
  fieldError: { fontSize: 12, color: '#ef4444', marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.midnight, backgroundColor: '#ffffff' },
  inputError: { borderColor: '#ef4444' },
  dobRow: { flexDirection: 'row', gap: 10 },
  dobInput: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 12, fontSize: 15, color: colors.midnight, backgroundColor: '#ffffff' },
  dobYearInput: { flex: 1.7, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 12, fontSize: 15, color: colors.midnight, backgroundColor: '#ffffff' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#ffffff', overflow: 'hidden' },
  passwordInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.midnight },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  eyeText: { fontSize: 13, color: colors.azure, fontWeight: '600' },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16, marginTop: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  checkboxChecked: { backgroundColor: colors.sky, borderColor: colors.sky },
  checkmark: { color: colors.midnight, fontSize: 13, fontWeight: '800' },
  termsText: { flex: 1, fontSize: 13, color: '#64748b', lineHeight: 20 },
  termsLink: { color: colors.sky, fontWeight: '600' },
  authError: { fontSize: 13, color: '#ef4444', marginBottom: 12, lineHeight: 19 },
  cta: { backgroundColor: colors.sky, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: colors.midnight, fontSize: 17, fontWeight: '700' },
})
