import { useState, useCallback, useEffect, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth'
import { useHandle } from '@/lib/useHandle'
import { useChildren } from '@/lib/useChildren'
import { useFamilyConnections } from '@/lib/useFamilyConnections'
import { useSelectedChild } from '@/lib/SelectedChildContext'
import { supabase } from '@/lib/supabase'
import { colors } from '@/constants/brand'

// ── Constants ─────────────────────────────────────────────────────────────────

const RELATIONSHIPS = ['Grandparent', 'Aunt / Uncle', 'Friend', 'Other'] as const
const AVATAR_COLORS = ['#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626']

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSortCode(s: string): string {
  return `${s.slice(0, 2)}-${s.slice(2, 4)}-${s.slice(4, 6)}`
}

function formatDob(dob: string): string {
  return new Date(dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function gbp(n: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP', minimumFractionDigits: 2,
  }).format(n)
}

// ── Types ─────────────────────────────────────────────────────────────────────

type JisaRow = {
  id: string
  sort_code: string
  account_number: string
  payment_reference: string
  provider_name: string | null
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function FamilyScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { handle } = useHandle()
  const { children, loading: childrenLoading, refetch: refetchChildren } = useChildren()
  const { selectedChildId, setSelectedChildId } = useSelectedChild()

  // Scroll ref for keyboard avoidance
  const scrollRef = useRef<ScrollView>(null)
  // DOB field refs for auto-advance
  const monthInputRef = useRef<TextInput>(null)
  const yearInputRef = useRef<TextInput>(null)

  // Initialise selection from first child if not already set
  useEffect(() => {
    if (children.length > 0 && selectedChildId === null) {
      setSelectedChildId(children[0].id)
    }
  }, [children])

  const selectedChild = children.find(c => c.id === selectedChildId) ?? null

  // JISA
  const [jisa, setJisa] = useState<JisaRow | null>(null)
  const [jisaLoading, setJisaLoading] = useState(false)

  useEffect(() => {
    if (!selectedChildId) { setJisa(null); return }
    setJisaLoading(true)
    supabase
      .from('jisa_accounts')
      .select('id, sort_code, account_number, payment_reference, provider_name')
      .eq('child_id', selectedChildId)
      .maybeSingle()
      .then(({ data }) => {
        setJisa(data as JisaRow | null)
        setJisaLoading(false)
      })
  }, [selectedChildId])

  // Family connections
  const { contributors, pending, loading: connectionsLoading, refetch: refetchConnections } = useFamilyConnections(selectedChildId)

  // Edit child inline
  const [editingChild, setEditingChild] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDob, setEditDob] = useState('')
  const [savingChild, setSavingChild] = useState(false)

  // Add child — 3-field DOB
  const [showAddChild, setShowAddChild] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDobDay, setNewDobDay] = useState('')
  const [newDobMonth, setNewDobMonth] = useState('')
  const [newDobYear, setNewDobYear] = useState('')
  const [addingChild, setAddingChild] = useState(false)

  // Invite sheet
  const [showInvite, setShowInvite] = useState(false)
  const [relationship, setRelationship] = useState('')

  useFocusEffect(
    useCallback(() => {
      void refetchChildren()
      void refetchConnections()
    }, [refetchChildren, refetchConnections])
  )

  const openAddChild = () => {
    setShowAddChild(true)
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150)
  }

  const cancelAddChild = () => {
    setShowAddChild(false)
    setNewName('')
    setNewDobDay('')
    setNewDobMonth('')
    setNewDobYear('')
  }

  const startEdit = () => {
    if (!selectedChild) return
    setEditName(selectedChild.name)
    setEditDob(selectedChild.date_of_birth)
    setEditingChild(true)
  }

  const saveChild = async () => {
    if (!selectedChildId || savingChild) return
    const trimName = editName.trim()
    if (!trimName) return
    setSavingChild(true)
    const { error } = await supabase
      .from('children')
      .update({ name: trimName, date_of_birth: editDob.trim() })
      .eq('id', selectedChildId)
    setSavingChild(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      await refetchChildren()
      setEditingChild(false)
    }
  }

  const dobValid = newDobDay.length > 0 && newDobMonth.length > 0 && newDobYear.length === 4

  const addChild = async () => {
    if (!user || addingChild || !dobValid) return
    const trimName = newName.trim()
    if (!trimName) return
    const dob = `${newDobYear}-${newDobMonth.padStart(2, '0')}-${newDobDay.padStart(2, '0')}`
    setAddingChild(true)
    const { data, error } = await supabase
      .from('children')
      .insert({ owner_id: user.id, name: trimName, date_of_birth: dob })
      .select('id, name, date_of_birth, photo_url')
      .single()
    setAddingChild(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      await refetchChildren()
      cancelAddChild()
      if (data) setSelectedChildId((data as { id: string }).id)
    }
  }

  const shareWhatsApp = () => {
    if (!selectedChild) return
    const ref = handle ? `?ref=${handle}` : ''
    const url = `https://amplifi-marketing.netlify.app${ref}`
    const msg =
      `I've set up an Amplifi savings account for ${selectedChild.name} which will provide a solid financial foundation for the future. ` +
      `Please join Amplifi where you can see the progress we are making together. ` +
      `Use my handle @${handle ?? 'amplifi'} when you sign up so we get connected: ${url}`
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() =>
      Alert.alert('WhatsApp not found', 'Please install WhatsApp to share this way.')
    )
  }

  if (childrenLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.offwhite, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.sky} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>My Family</Text>
          </View>

          {/* Child selector pills */}
          {children.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.selectorContent}
              style={styles.selectorRow}
            >
              {children.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.selectorPill, c.id === selectedChildId && styles.selectorPillActive]}
                  onPress={() => { setSelectedChildId(c.id); setEditingChild(false) }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.selectorPillText, c.id === selectedChildId && styles.selectorPillTextActive]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Child card */}
          {selectedChild ? (
            <View style={styles.childCard}>
              {editingChild ? (
                <>
                  <Text style={styles.cardSectionLabel}>Edit child</Text>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Name</Text>
                    <TextInput
                      style={styles.input}
                      value={editName}
                      onChangeText={setEditName}
                      autoCapitalize="words"
                      autoFocus
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Date of birth</Text>
                    <TextInput
                      style={styles.input}
                      value={editDob}
                      onChangeText={setEditDob}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                  <View style={styles.inlineBtnRow}>
                    <TouchableOpacity
                      style={[styles.primaryBtn, (!editName.trim() || savingChild) && styles.btnDisabled]}
                      onPress={() => void saveChild()}
                      disabled={!editName.trim() || savingChild}
                      activeOpacity={0.85}
                    >
                      {savingChild
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.primaryBtnText}>Save</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.ghostBtn} onPress={() => setEditingChild(false)} activeOpacity={0.7}>
                      <Text style={styles.ghostBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.childIdentityRow}>
                    <View style={styles.childAvatar}>
                      <Text style={styles.childAvatarText}>{selectedChild.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.childName}>{selectedChild.name}</Text>
                      <Text style={styles.childDob}>Born {formatDob(selectedChild.date_of_birth)}</Text>
                    </View>
                    <TouchableOpacity style={styles.editChip} onPress={startEdit} activeOpacity={0.7}>
                      <Text style={styles.editChipText}>Edit</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.cardDivider} />
                  <Text style={styles.cardSectionLabel}>ISA / JISA</Text>

                  {jisaLoading ? (
                    <ActivityIndicator size="small" color={colors.sky} style={{ marginTop: 8 }} />
                  ) : jisa ? (
                    <View style={styles.jisaBlock}>
                      {jisa.provider_name ? <Text style={styles.jisaProvider}>{jisa.provider_name}</Text> : null}
                      <View style={styles.jisaRow}>
                        <Text style={styles.jisaKey}>Sort code</Text>
                        <Text style={styles.jisaVal}>{formatSortCode(jisa.sort_code)}</Text>
                      </View>
                      <View style={styles.jisaRow}>
                        <Text style={styles.jisaKey}>Account</Text>
                        <Text style={styles.jisaVal}>{jisa.account_number}</Text>
                      </View>
                      <View style={styles.jisaRow}>
                        <Text style={styles.jisaKey}>Reference</Text>
                        <Text style={styles.jisaVal}>{jisa.payment_reference}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.noJisa}>
                      <Text style={styles.noJisaText}>No ISA linked yet</Text>
                      <TouchableOpacity
                        style={styles.linkIsaBtn}
                        onPress={() => router.push({
                          pathname: '/(auth)/isa-link',
                          params: { childId: selectedChild.id, childName: selectedChild.name },
                        })}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.linkIsaBtnText}>Link ISA →</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </View>
          ) : (
            <View style={styles.childCard}>
              <Text style={styles.emptyText}>No children added yet</Text>
            </View>
          )}

          {/* Add another child */}
          {showAddChild ? (
            <View style={styles.addChildCard}>
              <Text style={styles.cardSectionLabel}>Add a child</Text>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Child's name"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="words"
                  autoFocus
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Date of birth</Text>
                <View style={styles.dobRow}>
                  <TextInput
                    style={[styles.input, styles.dobDay]}
                    value={newDobDay}
                    onChangeText={(v) => {
                      const d = v.replace(/\D/g, '').slice(0, 2)
                      setNewDobDay(d)
                      if (d.length === 2) monthInputRef.current?.focus()
                    }}
                    placeholder="DD"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                    maxLength={2}
                    textAlign="center"
                  />
                  <TextInput
                    ref={monthInputRef}
                    style={[styles.input, styles.dobMonth]}
                    value={newDobMonth}
                    onChangeText={(v) => {
                      const m = v.replace(/\D/g, '').slice(0, 2)
                      setNewDobMonth(m)
                      if (m.length === 2) yearInputRef.current?.focus()
                    }}
                    placeholder="MM"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                    maxLength={2}
                    textAlign="center"
                  />
                  <TextInput
                    ref={yearInputRef}
                    style={[styles.input, styles.dobYear]}
                    value={newDobYear}
                    onChangeText={(v) => setNewDobYear(v.replace(/\D/g, '').slice(0, 4))}
                    placeholder="YYYY"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                    maxLength={4}
                    textAlign="center"
                  />
                </View>
              </View>
              <View style={styles.inlineBtnRow}>
                <TouchableOpacity
                  style={[styles.primaryBtn, (!newName.trim() || !dobValid || addingChild) && styles.btnDisabled]}
                  onPress={() => void addChild()}
                  disabled={!newName.trim() || !dobValid || addingChild}
                  activeOpacity={0.85}
                >
                  {addingChild
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.primaryBtnText}>Add child</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.ghostBtn} onPress={cancelAddChild} activeOpacity={0.7}>
                  <Text style={styles.ghostBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addChildBtn} onPress={openAddChild} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={18} color={colors.azure} />
              <Text style={styles.addChildBtnText}>Add another child</Text>
            </TouchableOpacity>
          )}

          {/* Family & Contributors */}
          <Text style={styles.sectionTitle}>Family & Contributors</Text>

          <View style={styles.card}>
            {connectionsLoading ? (
              <ActivityIndicator size="small" color={colors.sky} />
            ) : contributors.length === 0 && pending.length === 0 ? (
              <Text style={styles.emptyText}>No family members yet — invite someone below</Text>
            ) : (
              <>
                {contributors.map((c, idx) => (
                  <View key={c.id}>
                    <View style={styles.contributorRow}>
                      <View style={[styles.avatar, { backgroundColor: c.avatar_color || AVATAR_COLORS[idx % AVATAR_COLORS.length] }]}>
                        <Text style={styles.avatarText}>{c.name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.contributorName}>{c.name}</Text>
                        <Text style={styles.contributorRel}>{c.relationship ?? 'Family'}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={styles.contributorAmount}>{gbp(c.total_contributed)}</Text>
                        <View style={styles.activeChip}>
                          <View style={styles.activeDot} />
                          <Text style={styles.activeChipText}>Active</Text>
                        </View>
                      </View>
                    </View>
                    {idx < contributors.length - 1 && <View style={styles.rowDivider} />}
                  </View>
                ))}

                {pending.length > 0 && (
                  <>
                    {contributors.length > 0 && <View style={styles.rowDivider} />}
                    <Text style={styles.pendingLabel}>Pending invites</Text>
                    {pending.map(p => (
                      <View key={p.id} style={styles.contributorRow}>
                        <View style={[styles.avatar, { backgroundColor: '#e2e8f0' }]}>
                          <Text style={[styles.avatarText, { color: '#94a3b8' }]}>?</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.contributorName, { color: '#94a3b8' }]}>{p.invited_name}</Text>
                          <Text style={styles.contributorRel}>{p.sent_to_email}</Text>
                        </View>
                        <View style={styles.pendingChip}>
                          <Text style={styles.pendingChipText}>Pending</Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </>
            )}
          </View>

          {/* Invite CTA */}
          {showInvite ? (
            <View style={styles.inviteSheet}>
              <Text style={styles.inviteSheetTitle}>Invite a family member</Text>
              <Text style={styles.inviteSheetLabel}>Their relationship to {selectedChild?.name ?? 'your child'}</Text>
              <View style={styles.relRow}>
                {RELATIONSHIPS.map(rel => (
                  <TouchableOpacity
                    key={rel}
                    style={[styles.relPill, relationship === rel && styles.relPillActive]}
                    onPress={() => setRelationship(rel)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.relPillText, relationship === rel && styles.relPillTextActive]}>{rel}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.whatsappBtn} onPress={shareWhatsApp} activeOpacity={0.85}>
                <Text style={styles.whatsappText}>Share on WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={() => { setShowInvite(false); setRelationship('') }}
                activeOpacity={0.7}
              >
                <Text style={[styles.ghostBtnText, { textAlign: 'center' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.inviteBtn} onPress={() => setShowInvite(true)} activeOpacity={0.85}>
              <Ionicons name="person-add-outline" size={18} color="#ffffff" />
              <Text style={styles.inviteBtnText}>Invite a family member</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.offwhite },

  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: colors.midnight, letterSpacing: -0.5 },

  // Child selector
  selectorRow: { marginBottom: 12 },
  selectorContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 2 },
  selectorPill: {
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 100, borderWidth: 1.5, borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  selectorPillActive: { backgroundColor: colors.midnight, borderColor: colors.midnight },
  selectorPillText: { fontSize: 14, fontWeight: '600', color: colors.midnight },
  selectorPillTextActive: { color: '#ffffff' },

  // Child card
  childCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  childIdentityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  childAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.sky,
    alignItems: 'center', justifyContent: 'center',
  },
  childAvatarText: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  childName: { fontSize: 18, fontWeight: '700', color: colors.midnight },
  childDob: { fontSize: 13, color: '#64748b', marginTop: 2 },
  editChip: {
    borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  editChipText: { fontSize: 13, fontWeight: '600', color: colors.azure },

  cardDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 14 },
  cardSectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#64748b',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },

  // JISA
  jisaBlock: { gap: 6 },
  jisaProvider: { fontSize: 14, fontWeight: '700', color: colors.midnight, marginBottom: 4 },
  jisaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jisaKey: { fontSize: 13, color: '#64748b' },
  jisaVal: { fontSize: 13, fontWeight: '600', color: colors.midnight },
  noJisa: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noJisaText: { fontSize: 14, color: '#94a3b8' },
  linkIsaBtn: {
    backgroundColor: `${colors.sky}22`,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  linkIsaBtnText: { fontSize: 13, fontWeight: '700', color: colors.sky },

  // Inline form
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.midnight, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.midnight, backgroundColor: '#ffffff',
  },
  // 3-field DOB
  dobRow: { flexDirection: 'row', gap: 8 },
  dobDay: { width: 60 },
  dobMonth: { width: 60 },
  dobYear: { flex: 1 },

  inlineBtnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  primaryBtn: {
    flex: 1, backgroundColor: colors.azure, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  primaryBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.35 },
  ghostBtn: { paddingHorizontal: 16, paddingVertical: 13, alignItems: 'center' },
  ghostBtnText: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },

  // Add child
  addChildCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
  },
  addChildBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#e2e8f0',
    borderRadius: 14, paddingVertical: 14,
    marginHorizontal: 16, marginBottom: 20,
  },
  addChildBtnText: { fontSize: 14, fontWeight: '600', color: colors.azure },

  // Section
  sectionTitle: {
    fontSize: 18, fontWeight: '700', color: colors.midnight,
    marginHorizontal: 16, marginBottom: 10, marginTop: 8,
  },

  // Contributors card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  contributorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  contributorName: { fontSize: 15, fontWeight: '700', color: colors.midnight },
  contributorRel: { fontSize: 13, color: '#64748b', marginTop: 1 },
  contributorAmount: { fontSize: 15, fontWeight: '700', color: colors.midnight },
  activeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#dcfce7', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a' },
  activeChipText: { fontSize: 11, fontWeight: '600', color: '#16a34a' },
  rowDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 4 },
  pendingLabel: {
    fontSize: 12, fontWeight: '700', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 0.5, marginVertical: 8,
  },
  pendingChip: { backgroundColor: '#fef3c7', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  pendingChipText: { fontSize: 11, fontWeight: '600', color: '#d97706' },
  emptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', paddingVertical: 8 },

  // Invite sheet
  inviteSheet: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 20,
    marginBottom: 14,
  },
  inviteSheetTitle: { fontSize: 16, fontWeight: '700', color: colors.midnight, marginBottom: 4 },
  inviteSheetLabel: { fontSize: 13, color: '#64748b', marginBottom: 14 },
  relRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  relPill: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 100, borderWidth: 1.5, borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  relPillActive: { backgroundColor: colors.midnight, borderColor: colors.midnight },
  relPillText: { fontSize: 13, fontWeight: '600', color: colors.midnight },
  relPillTextActive: { color: '#ffffff' },
  whatsappBtn: {
    backgroundColor: '#25D366', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginBottom: 10,
  },
  whatsappText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },

  // Invite button
  inviteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.azure, borderRadius: 16,
    paddingVertical: 16, marginHorizontal: 16, marginBottom: 20,
  },
  inviteBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
})
