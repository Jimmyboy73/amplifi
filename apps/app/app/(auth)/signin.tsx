import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { colors } from '@/constants/brand'

export default function SignInScreen() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isValid = email.includes('@') && password.length >= 8

  const handleSignIn = async () => {
    if (!isValid) return
    setLoading(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError(
        signInError.message.toLowerCase().includes('invalid')
          ? 'Incorrect email or password. Please try again.'
          : signInError.message,
      )
      setLoading(false)
      return
    }

    // Auth state change handled by AuthProvider/AuthRedirect in _layout.
    // Explicit replace as a belt-and-braces in case redirect hasn't fired yet.
    router.replace('/(tabs)/home')
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
          {/* Back */}
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          {/* Logo */}
          <Text style={styles.logo}>amplifi</Text>

          {/* Headline */}
          <Text style={styles.headline}>Welcome back</Text>

          {/* Email */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>Email address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="jane@example.co.uk"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          {/* Password */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Sign in button */}
          <TouchableOpacity
            style={[styles.cta, (!isValid || loading) && styles.ctaDisabled]}
            onPress={handleSignIn}
            disabled={!isValid || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.midnight} />
            ) : (
              <Text style={styles.ctaText}>Sign in</Text>
            )}
          </TouchableOpacity>

          {/* Forgot password */}
          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => Alert.alert('Password reset', 'Password reset coming soon.')}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },
  backBtn: { paddingVertical: 16, alignSelf: 'flex-start' },
  backArrow: { fontSize: 22, color: colors.midnight },
  logo: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.sky,
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: 28,
    marginTop: 8,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.midnight,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 32,
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
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.midnight,
  },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  eyeText: { fontSize: 13, color: colors.azure, fontWeight: '600' },
  errorText: { fontSize: 13, color: '#ef4444', marginBottom: 12, lineHeight: 19 },
  cta: {
    backgroundColor: colors.sky,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: colors.midnight, fontSize: 17, fontWeight: '700' },
  forgotBtn: { alignItems: 'center', paddingVertical: 16 },
  forgotText: { fontSize: 14, color: '#94a3b8' },
})
