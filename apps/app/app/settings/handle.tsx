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
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useHandle } from '@/lib/useHandle'
import { colors } from '@/constants/brand'

export default function HandleScreen() {
  const router = useRouter()
  const { handle: currentHandle, loading, saveHandle, saving, error, checkAvailability } = useHandle()

  const [input, setInput] = useState('')
  const [availability, setAvailability] = useState<'available' | 'taken' | 'checking' | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initialise input once handle loads
  useEffect(() => {
    if (!loading) setInput(currentHandle ?? '')
  }, [loading])

  const sanitise = (v: string) =>
    v.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    // No check needed if unchanged
    if (input === currentHandle) {
      setAvailability(null)
      return
    }

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
  }, [input, currentHandle])

  const canSave =
    input.length >= 3 &&
    (input === currentHandle || availability === 'available') &&
    !saving

  const handleSave = async () => {
    if (!canSave) return
    if (input === currentHandle) {
      router.back()
      return
    }
    const ok = await saveHandle(input)
    if (ok) router.back()
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.sky} />
      </View>
    )
  }

  let feedbackText = ''
  let feedbackStyle = styles.feedbackGrey

  if (input !== currentHandle) {
    if (input.length > 0 && input.length < 3) {
      feedbackText = 'Min 3 characters'
      feedbackStyle = styles.feedbackGrey
    } else if (availability === 'checking') {
      feedbackText = 'Checking…'
      feedbackStyle = styles.feedbackGrey
    } else if (availability === 'available') {
      feedbackText = 'Available'
      feedbackStyle = styles.feedbackAvailable
    } else if (availability === 'taken') {
      feedbackText = 'Handle taken'
      feedbackStyle = styles.feedbackTaken
    }
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
          <Text style={styles.headerTitle}>Your Handle</Text>
          <View style={{ width: 32 }} />
        </View>

        <Text style={styles.intro}>
          Your handle lets family members find and link to your Amplifi account.
        </Text>

        {/* Input */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>Handle</Text>
          <View style={styles.inputRow}>
            <Text style={styles.atSymbol}>@</Text>
            <TextInput
              style={styles.textInput}
              value={input}
              onChangeText={(v) => setInput(sanitise(v))}
              placeholder="choose_a_handle"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
            />
            {availability === 'checking' && (
              <ActivityIndicator size="small" color={colors.azure} style={{ marginRight: 8 }} />
            )}
            {availability === 'available' && input !== currentHandle && (
              <Text style={styles.tick}>✓</Text>
            )}
            {availability === 'taken' && (
              <Text style={styles.cross}>✗</Text>
            )}
          </View>
          {feedbackText ? <Text style={feedbackStyle}>{feedbackText}</Text> : null}
          {error ? <Text style={styles.feedbackTaken}>{error}</Text> : null}
          <Text style={styles.hint}>Letters, numbers and underscores · 3–20 chars</Text>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.btnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveBtnText}>Save handle</Text>
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
  intro: { fontSize: 14, color: '#64748b', lineHeight: 21, marginBottom: 28 },
  fieldWrapper: { marginBottom: 24 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.midnight, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    marginBottom: 6,
  },
  atSymbol: { fontSize: 20, fontWeight: '700', color: colors.azure, marginRight: 4 },
  textInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600',
    color: colors.midnight,
  },
  tick: { fontSize: 20, color: '#16a34a', marginRight: 4 },
  cross: { fontSize: 20, color: '#ef4444', marginRight: 4 },
  feedbackGrey: { fontSize: 13, color: '#94a3b8', fontWeight: '500', marginBottom: 4 },
  feedbackAvailable: { fontSize: 13, color: '#16a34a', fontWeight: '600', marginBottom: 4 },
  feedbackTaken: { fontSize: 13, color: '#ef4444', fontWeight: '600', marginBottom: 4 },
  hint: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  saveBtn: {
    backgroundColor: colors.azure,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  saveBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.35 },
})
