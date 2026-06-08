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

type Child = {
  id: string
  name: string
  date_of_birth: string
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [profile, setProfile] = useState<Profile>({ full_name: '', email: '', phone: '' })
  const [children, setChildren] = useState<Child[]>([])

  // Edit-in-place state for children
  const [editingChildId, setEditingChildId] = useState<string | null>(null)
  const [editingChildName, setEditingChildName] = useState('')
  const [savingChildId, setSavingChildId] = useState<string | null>(null)

  // Add child form
  const [showAddChild, setShowAddChild] = useState(false)
  const [newChildName, setNewChildName] = useState('')
  const [newChildDob, setNewChildDob] = useState('')
  const [addingChild, setAddingChild] = useState(false)

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      setLoading(true)
      const [{ data: profileData }, { data: childrenData }] = await Promise.all([
        supabase.from('profiles').select('full_name, email, phone').eq('id', user.id).single(),
        supabase.from('children').select('id, name, date_of_birth').eq('owner_id', user.id).order('created_at'),
      ])
      if (profileData) setProfile(profileData as Profile)
      if (childrenData) setChildren(childrenData as Child[])
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

  const startEditChild = (child: Child) => {
    setEditingChildId(child.id)
    setEditingChildName(child.name)
  }

  const saveChildName = async (childId: string) => {
    if (savingChildId) return
    const trimmed = editingChildName.trim()
    if (!trimmed) return
    setSavingChildId(childId)
    const { error } = await supabase
      .from('children')
      .update({ name: trimmed })
      .eq('id', childId)
    setSavingChildId(null)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      setChildren((prev) => prev.map((c) => c.id === childId ? { ...c, name: trimmed } : c))
      setEditingChildId(null)
    }
  }

  const handleAddChild = async () => {
    if (!user || addingChild) return
    const trimmedName = newChildName.trim()
    if (!trimmedName || !newChildDob.trim()) return
    setAddingChild(true)
    const { data, error } = await supabase
      .from('children')
      .insert({ owner_id: user.id, name: trimmedName, date_of_birth: newChildDob.trim() })
      .select()
      .single()
    setAddingChild(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      if (data) setChildren((prev) => [...prev, data as Child])
      setNewChildName('')
      setNewChildDob('')
      setShowAddChild(false)
    }
  }

  const formatDob = (dob: string) => {
    const d = new Date(dob)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
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

        {/* ── Children ─────────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Children</Text>

        {children.map((child) => (
          <View key={child.id} style={styles.childCard}>
            {editingChildId === child.id ? (
              <View style={styles.childEditRow}>
                <TextInput
                  style={styles.childNameInput}
                  value={editingChildName}
                  onChangeText={setEditingChildName}
                  autoFocus
                  autoCapitalize="words"
                />
                <TouchableOpacity
                  onPress={() => void saveChildName(child.id)}
                  disabled={savingChildId === child.id}
                  style={styles.childSaveBtn}
                  activeOpacity={0.7}
                >
                  {savingChildId === child.id ? (
                    <ActivityIndicator size="small" color={colors.azure} />
                  ) : (
                    <Text style={styles.childSaveBtnText}>Save</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setEditingChildId(null)}
                  style={styles.childCancelBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.childCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.childRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.childName}>{child.name}</Text>
                  <Text style={styles.childDob}>{formatDob(child.date_of_birth)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => startEditChild(child)}
                  style={styles.editBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        {/* Add child form */}
        {showAddChild ? (
          <View style={styles.addChildForm}>
            <Text style={styles.addChildTitle}>Add a child</Text>
            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={newChildName}
                onChangeText={setNewChildName}
                placeholder="Child's name"
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
                autoFocus
              />
            </View>
            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>Date of birth</Text>
              <TextInput
                style={styles.input}
                value={newChildDob}
                onChangeText={setNewChildDob}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={styles.addChildBtnRow}>
              <TouchableOpacity
                style={[styles.addChildConfirmBtn, (!newChildName.trim() || !newChildDob.trim() || addingChild) && styles.btnDisabled]}
                onPress={handleAddChild}
                disabled={!newChildName.trim() || !newChildDob.trim() || addingChild}
                activeOpacity={0.85}
              >
                {addingChild ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.addChildConfirmText}>Add child</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addChildCancelBtn}
                onPress={() => { setShowAddChild(false); setNewChildName(''); setNewChildDob('') }}
                activeOpacity={0.7}
              >
                <Text style={styles.addChildCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addChildRowBtn}
            onPress={() => setShowAddChild(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.addChildRowBtnText}>+ Add another child</Text>
          </TouchableOpacity>
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

  childCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  childRow: { flexDirection: 'row', alignItems: 'center' },
  childName: { fontSize: 15, fontWeight: '700', color: colors.midnight },
  childDob: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  editBtn: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editBtnText: { fontSize: 13, fontWeight: '600', color: colors.azure },
  childEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  childNameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    color: colors.midnight,
  },
  childSaveBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  childSaveBtnText: { fontSize: 13, fontWeight: '700', color: colors.azure },
  childCancelBtn: { paddingHorizontal: 8, paddingVertical: 8 },
  childCancelBtnText: { fontSize: 13, color: '#94a3b8' },

  addChildRowBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  addChildRowBtnText: { fontSize: 14, fontWeight: '600', color: colors.azure },

  addChildForm: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  addChildTitle: { fontSize: 15, fontWeight: '700', color: colors.midnight, marginBottom: 14 },
  addChildBtnRow: { flexDirection: 'row', gap: 10 },
  addChildConfirmBtn: {
    flex: 1,
    backgroundColor: colors.azure,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  addChildConfirmText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  addChildCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: 'center',
  },
  addChildCancelText: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
})
