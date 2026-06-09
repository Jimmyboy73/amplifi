import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { colors } from '@/constants/brand'

// ── Types ─────────────────────────────────────────────────────────────────────

type Profile = {
  full_name: string
  email: string
  phone: string
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [profile, setProfile] = useState<Profile>({ full_name: '', email: '', phone: '' })

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      setLoading(true)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', user.id)
        .single()
      if (profileData) setProfile(profileData as Profile)
      setLoading(false)
    }
    void fetchData()
  }, [user])

  const saveProfile = async () => {
    if (!user || saving) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: profile.full_name.trim(), phone: profile.phone.trim() })
      .eq('id', user.id)
    setSaving(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      Alert.alert('Saved', 'Profile updated.')
    }
  }

  if (loading) {
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
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* ── Personal details ─────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Personal details</Text>

        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>Full name</Text>
          <TextInput
            style={styles.input}
            value={profile.full_name}
            onChangeText={(v) => setProfile((p) => ({ ...p, full_name: v }))}
            placeholder="Your full name"
            placeholderTextColor="#94a3b8"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={[styles.input, styles.inputReadOnly]}
            value={profile.email}
            editable={false}
            placeholderTextColor="#94a3b8"
          />
          <Text style={styles.readOnlyHint}>Email cannot be changed here</Text>
        </View>

        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            value={profile.phone}
            onChangeText={(v) => setProfile((p) => ({ ...p, phone: v }))}
            placeholder="+44 7700 900000"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={saveProfile}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveBtnText}>Save changes</Text>
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

  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.midnight, marginBottom: 16 },

  fieldWrapper: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.midnight, marginBottom: 6 },
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
  inputReadOnly: { backgroundColor: '#f8fafc', color: '#94a3b8' },
  readOnlyHint: { fontSize: 11, color: '#94a3b8', marginTop: 4 },

  saveBtn: {
    backgroundColor: colors.azure,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  saveBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.35 },

})
