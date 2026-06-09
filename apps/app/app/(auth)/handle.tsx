import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useHandle } from '@/lib/useHandle'
import { colors } from '@/constants/brand'

export default function HandleOnboardingScreen() {
  const router = useRouter()
  const { isContributor } = useLocalSearchParams<{ isContributor?: string }>()
  const { checkAvailability, saveHandle, saving } = useHandle()

  const [input, setInput] = useState('')
  const [availability, setAvailability] = useState<'available' | 'taken' | 'checking' | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sanitise = (v: string) =>
    v.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (input.length < 3) {
      setAvailability(null)
      return
    }

    setAvailability('checking')
    debounceRef.current = setTimeout(async () => {
      const ok = await checkAvailability(input)
      setAvailability(ok ? 'available' : 'taken')
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [input])

  const handleChangeText = (v: string) => {
    setInput(sanitise(v))
  }

  const handleContinue = async () => {
    if (availability !== 'available' || saving) return
    const ok = await saveHandle(input)
    if (ok) {
      if (isContributor === 'true') {
        router.replace('/(tabs)/home')
      } else {
        router.push('/(auth)/child')
      }
    }
  }

  const canContinue = availability === 'available' && !saving

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
          <Text style={styles.progress}>3 of 9</Text>
        </View>

        <Text style={styles.headline}>Choose your handle</Text>
        <Text style={styles.subheadline}>
          This is how family and friends will find you on Amplifi.
        </Text>

        {/* Input */}
        <View style={styles.inputRow}>
          <Text style={styles.atSymbol}>@</Text>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={handleChangeText}
            placeholder="your_handle"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            maxLength={20}
          />
          {availability === 'checking' && (
            <ActivityIndicator size="small" color={colors.azure} style={{ marginRight: 12 }} />
          )}
          {availability === 'available' && (
            <Text style={styles.tick}>✓</Text>
          )}
          {availability === 'taken' && (
            <Text style={styles.cross}>✗</Text>
          )}
        </View>

        <Text style={styles.hint}>Letters, numbers and underscores · 3–20 chars</Text>

        {input.length > 0 && input.length < 3 && (
          <Text style={styles.feedbackGrey}>Min 3 characters</Text>
        )}
        {availability === 'checking' && (
          <Text style={styles.feedbackGrey}>Checking…</Text>
        )}
        {availability === 'available' && (
          <Text style={styles.feedbackAvailable}>Available</Text>
        )}
        {availability === 'taken' && (
          <Text style={styles.feedbackTaken}>Handle taken — try another</Text>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={[styles.cta, !canContinue && styles.ctaDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.midnight} />
          ) : (
            <Text style={styles.ctaText}>Continue</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
    fontSize: 26, fontWeight: '800', color: colors.midnight,
    letterSpacing: -0.5, marginTop: 8, marginBottom: 8,
  },
  subheadline: { fontSize: 15, color: '#64748b', lineHeight: 22, marginBottom: 32 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  atSymbol: { fontSize: 22, fontWeight: '700', color: colors.azure, marginRight: 4 },
  textInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 22,
    fontWeight: '700',
    color: colors.midnight,
  },
  tick: { fontSize: 22, color: '#16a34a', marginRight: 4 },
  cross: { fontSize: 22, color: '#ef4444', marginRight: 4 },
  hint: { fontSize: 12, color: '#94a3b8', marginBottom: 16 },
  feedbackGrey: { fontSize: 13, color: '#94a3b8', fontWeight: '500', marginBottom: 24 },
  feedbackAvailable: { fontSize: 13, color: '#16a34a', fontWeight: '600', marginBottom: 24 },
  feedbackTaken: { fontSize: 13, color: '#ef4444', fontWeight: '600', marginBottom: 24 },
  cta: {
    backgroundColor: colors.sky,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: colors.midnight, fontSize: 17, fontWeight: '700' },
})
