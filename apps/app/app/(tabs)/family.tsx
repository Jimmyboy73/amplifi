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
import CelebrationModal from '@/components/CelebrationModal'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth'
import { useHandle } from '@/lib/useHandle'
import { useChildren } from '@/lib/useChildren'
import { useFamilyConnections } from '@/lib/useFamilyConnections'
import { useContributorConnections } from '@/lib/useContributorConnections'
import { useSelectedChild } from '@/lib/SelectedChildContext'
import { supabase } from '@/lib/supabase'
import { colors } from '@/constants/brand'

// ── Constants ─────────────────────────────────────────────────────────────────

const RELATIONSHIPS = ['Grandparent', 'Aunt / Uncle', 'Friend', 'Other'] as const
const RELATIONSHIP_DB: Record<string, string> = {
  'Grandparent': 'grandparent',
  'Aunt / Uncle': 'aunt_uncle',
  'Friend': 'friend',
  'Other': 'other',
}
const AVATAR_COLORS = ['#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626']

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSortCode(s: string) { return `${s.slice(0, 2)}-${s.slice(2, 4)}-${s.slice(4, 6)}` }
function formatDob(dob: string) {
  return new Date(dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
function gbp(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(n)
}

// ── Types ─────────────────────────────────────────────────────────────────────

type JisaRow = {
  id: string; sort_code: string; account_number: string
  payment_reference: string; provider_name: string | null
}

type PendingRequest = {
  id: string; requester_id: string; requester_name: string
  requester_handle: string | null; created_at: string
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function FamilyScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { handle } = useHandle()
  const { children, loading: childrenLoading, refetch: refetchChildren } = useChildren()
  const { selectedChildId, setSelectedChildId } = useSelectedChild()

  const scrollRef = useRef<ScrollView>(null)
  const monthInputRef = useRef<TextInput>(null)
  const yearInputRef = useRef<TextInput>(null)
  const hasScrolledToForm = useRef(false)

  // Init selection
  useEffect(() => {
    if (children.length > 0 && selectedChildId === null) setSelectedChildId(children[0].id)
  }, [children])

  const selectedChild = children.find(c => c.id === selectedChildId) ?? null

  // JISA
  const [jisa, setJisa] = useState<JisaRow | null>(null)
  const [jisaLoading, setJisaLoading] = useState(false)
  useEffect(() => {
    if (!selectedChildId) { setJisa(null); return }
    setJisaLoading(true)
    supabase.from('jisa_accounts').select('id, sort_code, account_number, payment_reference, provider_name')
      .eq('child_id', selectedChildId).maybeSingle()
      .then(({ data }) => { setJisa(data as JisaRow | null); setJisaLoading(false) })
  }, [selectedChildId])

  // Existing family connections (contributors + pending invites from family_contributors/family_invites)
  const { contributors, pending: pendingInvites, loading: connectionsLoading, refetch: refetchConnections } = useFamilyConnections(selectedChildId)

  // Edit child
  const [editingChild, setEditingChild] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDob, setEditDob] = useState('')
  const [savingChild, setSavingChild] = useState(false)

  // Add child
  const [showAddChild, setShowAddChild] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDobDay, setNewDobDay] = useState('')
  const [newDobMonth, setNewDobMonth] = useState('')
  const [newDobYear, setNewDobYear] = useState('')
  const [addingChild, setAddingChild] = useState(false)

  // Delete child
  const [deletingChildId, setDeletingChildId] = useState<string | null>(null)

  // Invite sheet
  const [showInvite, setShowInvite] = useState(false)
  const [inviteRelationship, setInviteRelationship] = useState('')

  // Pending connection requests (parent receives from family_connections table)
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null)
  const [approveRelationship, setApproveRelationship] = useState('')
  const [savingApproval, setSavingApproval] = useState(false)
  const [approveChildSelections, setApproveChildSelections] = useState<Record<string, boolean>>({})
  const [connectionCelebration, setConnectionCelebration] = useState<{ name: string; childName: string } | null>(null)
  const hasScrolledToInvite = useRef(false)

  // Contributor connections (where this user is the requester)
  const { connections: myConnections, loading: myConnectionsLoading, refetch: refetchMyConnections } = useContributorConnections()

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchPendingRequests = useCallback(async () => {
    if (!user) return
    const { data: conns } = await supabase
      .from('family_connections')
      .select('id, requester_id, created_at')
      .eq('parent_id', user.id)
      .eq('status', 'pending')
    if (!conns?.length) { setPendingRequests([]); return }
    // Deduplicate — one row per requester even if they have multiple pending children
    const seen = new Set<string>()
    const deduped = (conns as Array<{ id: string; requester_id: string; created_at: string }>)
      .filter(c => { if (seen.has(c.requester_id)) return false; seen.add(c.requester_id); return true })
    const ids = deduped.map(c => c.requester_id)
    const { data: profiles } = await supabase
      .from('profiles').select('id, full_name, handle').in('id', ids)
    const pm = Object.fromEntries(
      (profiles ?? []).map(p => [p.id, p as { id: string; full_name: string; handle: string | null }])
    )
    setPendingRequests(deduped.map(c => ({
      id: c.id,
      requester_id: c.requester_id,
      requester_name: pm[c.requester_id]?.full_name ?? 'Unknown',
      requester_handle: pm[c.requester_id]?.handle ?? null,
      created_at: c.created_at,
    })))
  }, [user?.id])

  useFocusEffect(useCallback(() => {
    void refetchChildren()
    void refetchConnections()
    void fetchPendingRequests()
    void refetchMyConnections()
  }, [refetchChildren, refetchConnections, fetchPendingRequests, refetchMyConnections]))

  // ── Actions ──────────────────────────────────────────────────────────────────

  const openAddChild = () => {
    setShowAddChild(true)
    hasScrolledToForm.current = false
  }

  const cancelAddChild = () => {
    setShowAddChild(false)
    setNewName(''); setNewDobDay(''); setNewDobMonth(''); setNewDobYear('')
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
    const { error } = await supabase.from('children')
      .update({ name: trimName, date_of_birth: editDob.trim() }).eq('id', selectedChildId)
    setSavingChild(false)
    if (error) Alert.alert('Error', error.message)
    else { await refetchChildren(); setEditingChild(false) }
  }

  const dobError: string = (() => {
    if (newDobYear.length < 4 || !newDobDay || !newDobMonth) return ''
    const d = parseInt(newDobDay, 10), m = parseInt(newDobMonth, 10), y = parseInt(newDobYear, 10)
    if (isNaN(d) || isNaN(m) || isNaN(y) || d < 1 || d > 31 || m < 1 || m > 12) return ''
    const dob = new Date(y, m - 1, d)
    const today = new Date()
    const maxDate = new Date(today.getFullYear(), today.getMonth() + 9, today.getDate())
    const minDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
    if (dob > maxDate) return 'Date of birth cannot be more than 9 months in the future'
    if (dob < minDate) return 'A JISA is only available for children under 18'
    return ''
  })()

  const dobValid = newDobDay.length > 0 && newDobMonth.length > 0 && newDobYear.length === 4 && !dobError

  const addChild = async () => {
    if (!user || addingChild || !dobValid) return
    const trimName = newName.trim()
    if (!trimName) return
    const dob = `${newDobYear}-${newDobMonth.padStart(2, '0')}-${newDobDay.padStart(2, '0')}`
    setAddingChild(true)
    const { data, error } = await supabase.from('children')
      .insert({ owner_id: user.id, name: trimName, date_of_birth: dob })
      .select('id, name, date_of_birth, photo_url').single()
    setAddingChild(false)
    if (error) Alert.alert('Error', error.message)
    else { await refetchChildren(); cancelAddChild(); if (data) setSelectedChildId((data as { id: string }).id) }
  }

  const deleteChild = (childId: string, childName: string) => {
    Alert.alert(
      `Remove ${childName}?`,
      `Are you sure you want to remove ${childName}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive', onPress: async () => {
            setDeletingChildId(childId)
            await Promise.all([
              supabase.from('jisa_accounts').delete().eq('child_id', childId),
              supabase.from('family_connections').delete().eq('child_id', childId),
            ])
            await supabase.from('children').delete().eq('id', childId).eq('owner_id', user!.id)
            if (selectedChildId === childId) setSelectedChildId(null)
            setDeletingChildId(null)
            await refetchChildren()
          },
        },
      ]
    )
  }

  const openApprovePanel = (req: PendingRequest) => {
    const selections: Record<string, boolean> = {}
    children.forEach(c => { selections[c.id] = true })
    setApproveChildSelections(selections)
    setApprovingRequestId(req.id)
    setApproveRelationship('')
  }

  const openInvite = () => {
    setShowInvite(true)
    hasScrolledToInvite.current = false
  }

  const approveRequest = async (requesterId: string) => {
    if (!approveRelationship || savingApproval) return
    const dbRel = RELATIONSHIP_DB[approveRelationship] ?? approveRelationship.toLowerCase()
    setSavingApproval(true)

    const { data: existingConns } = await supabase
      .from('family_connections')
      .select('id, child_id, status')
      .eq('requester_id', requesterId)
      .eq('parent_id', user!.id)

    const existingMap: Record<string, { id: string; status: string }> = {}
    for (const conn of existingConns ?? []) {
      const c = conn as { id: string; child_id: string; status: string }
      existingMap[c.child_id] = { id: c.id, status: c.status }
    }

    const ops = children.map(child => {
      const selected = approveChildSelections[child.id] ?? true
      const existing = existingMap[child.id]
      if (selected) {
        if (existing) {
          return supabase.from('family_connections')
            .update({ status: 'approved', relationship: dbRel })
            .eq('id', existing.id)
        }
        return supabase.from('family_connections').insert({
          requester_id: requesterId,
          parent_id: user!.id,
          child_id: child.id,
          status: 'approved',
          relationship: dbRel,
        })
      } else if (existing && existing.status !== 'revoked') {
        return supabase.from('family_connections')
          .update({ status: 'revoked' })
          .eq('id', existing.id)
      }
      return Promise.resolve({ error: null })
    })

    const results = await Promise.all(ops)
    const failed = results.some(r => r && (r as { error: unknown }).error)
    setSavingApproval(false)

    if (failed) {
      Alert.alert('Something went wrong', 'Please try again.')
    } else {
      // Capture celebration data before clearing state
      const req = pendingRequests.find(r => r.requester_id === requesterId)
      const approvedChild = children.find(c => approveChildSelections[c.id] !== false)
      setConnectionCelebration({
        name: req?.requester_name ?? 'They',
        childName: approvedChild?.name ?? 'your child',
      })
      setApprovingRequestId(null)
      setApproveRelationship('')
      setApproveChildSelections({})
      await fetchPendingRequests()
      await refetchConnections()
    }
  }

  const declineRequest = (requestId: string) => {
    Alert.alert('Decline request', 'Decline this connection request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('family_connections')
            .update({ status: 'revoked' }).eq('id', requestId)
          if (error) Alert.alert('Something went wrong', 'Please try again.')
          else await fetchPendingRequests()
        },
      },
    ])
  }

  const shareWhatsApp = () => {
    if (!selectedChild || !handle) return
    const url = `https://amplifi-plan.netlify.app/family/${selectedChild.id}?ref=${handle}`
    const msg =
      `I've started building a savings pot for ${selectedChild.name} — would you like to be part of it? 💙\n\n` +
      `Tap here to see how you can help: ${url}`
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() =>
      Alert.alert('WhatsApp not found', 'Please install WhatsApp to share this way.')
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const isParent = children.length > 0
  const myApproved = myConnections.filter(c => c.status === 'approved')
  const myPending = myConnections.filter(c => c.status === 'pending')
  const isContributor = myConnections.length > 0

  if (childrenLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.offwhite, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.sky} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <Text style={styles.title}>My Family</Text>
          </View>

          {/* ── PARENT SECTION ─────────────────────────────────────────────── */}
          {isParent && (
            <>
              {/* Child selector */}
              {children.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorContent} style={styles.selectorRow}>
                  {children.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.selectorPill, c.id === selectedChildId && styles.selectorPillActive]}
                      onPress={() => { setSelectedChildId(c.id); setEditingChild(false) }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.selectorPillText, c.id === selectedChildId && styles.selectorPillTextActive]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* Child card */}
              {selectedChild && (
                <View style={styles.childCard}>
                  {editingChild ? (
                    <>
                      <Text style={styles.cardSectionLabel}>Edit child</Text>
                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Name</Text>
                        <TextInput style={styles.input} value={editName} onChangeText={setEditName} autoCapitalize="words" autoFocus placeholderTextColor="#94a3b8" />
                      </View>
                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Date of birth</Text>
                        <TextInput style={styles.input} value={editDob} onChangeText={setEditDob} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" keyboardType="numbers-and-punctuation" />
                      </View>
                      <View style={styles.inlineBtnRow}>
                        <TouchableOpacity style={[styles.primaryBtn, (!editName.trim() || savingChild) && styles.btnDisabled]} onPress={() => void saveChild()} disabled={!editName.trim() || savingChild} activeOpacity={0.85}>
                          {savingChild ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>Save</Text>}
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
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity style={styles.editChip} onPress={startEdit} activeOpacity={0.7}>
                            <Text style={styles.editChipText}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteChip}
                            onPress={() => deleteChild(selectedChild.id, selectedChild.name)}
                            disabled={deletingChildId === selectedChild.id}
                            activeOpacity={0.7}
                          >
                            {deletingChildId === selectedChild.id
                              ? <ActivityIndicator size="small" color="#ef4444" />
                              : <Ionicons name="trash-outline" size={15} color="#ef4444" />
                            }
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.cardDivider} />
                      <Text style={styles.cardSectionLabel}>ISA / JISA</Text>
                      {jisaLoading ? (
                        <ActivityIndicator size="small" color={colors.sky} style={{ marginTop: 8 }} />
                      ) : jisa ? (
                        <View style={styles.jisaBlock}>
                          {jisa.provider_name ? <Text style={styles.jisaProvider}>{jisa.provider_name}</Text> : null}
                          <View style={styles.jisaRow}><Text style={styles.jisaKey}>Sort code</Text><Text style={styles.jisaVal}>{formatSortCode(jisa.sort_code)}</Text></View>
                          <View style={styles.jisaRow}><Text style={styles.jisaKey}>Account</Text><Text style={styles.jisaVal}>{jisa.account_number}</Text></View>
                          <View style={styles.jisaRow}><Text style={styles.jisaKey}>Reference</Text><Text style={styles.jisaVal}>{jisa.payment_reference}</Text></View>
                        </View>
                      ) : (
                        <View style={styles.noJisa}>
                          <Text style={styles.noJisaText}>No ISA linked yet</Text>
                          <TouchableOpacity style={styles.linkIsaBtn} onPress={() => router.push({ pathname: '/(auth)/isa-link', params: { childId: selectedChild.id, childName: selectedChild.name, source: 'family' } })} activeOpacity={0.85}>
                            <Text style={styles.linkIsaBtnText}>Link ISA →</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}

              {/* Add another child */}
              {showAddChild ? (
                <View
                  style={styles.addChildCard}
                  onLayout={(e) => {
                    if (!hasScrolledToForm.current) {
                      hasScrolledToForm.current = true
                      scrollRef.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - 20), animated: true })
                    }
                  }}
                >
                  <Text style={styles.cardSectionLabel}>Add a child</Text>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Name</Text>
                    <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="Child's name" placeholderTextColor="#94a3b8" autoCapitalize="words" autoFocus />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Date of birth</Text>
                    <View style={styles.dobRow}>
                      <TextInput style={[styles.input, styles.dobDay]} value={newDobDay} onChangeText={(v) => { const d = v.replace(/\D/g, '').slice(0, 2); setNewDobDay(d); if (d.length === 2) monthInputRef.current?.focus() }} placeholder="DD" placeholderTextColor="#94a3b8" keyboardType="number-pad" maxLength={2} textAlign="center" />
                      <TextInput ref={monthInputRef} style={[styles.input, styles.dobMonth]} value={newDobMonth} onChangeText={(v) => { const m = v.replace(/\D/g, '').slice(0, 2); setNewDobMonth(m); if (m.length === 2) yearInputRef.current?.focus() }} placeholder="MM" placeholderTextColor="#94a3b8" keyboardType="number-pad" maxLength={2} textAlign="center" />
                      <TextInput ref={yearInputRef} style={[styles.input, styles.dobYear]} value={newDobYear} onChangeText={(v) => setNewDobYear(v.replace(/\D/g, '').slice(0, 4))} placeholder="YYYY" placeholderTextColor="#94a3b8" keyboardType="number-pad" maxLength={4} textAlign="center" />
                    </View>
                    {dobError ? <Text style={styles.dobErrorText}>{dobError}</Text> : null}
                  </View>
                  <View style={styles.inlineBtnRow}>
                    <TouchableOpacity style={[styles.primaryBtn, (!newName.trim() || !dobValid || addingChild) && styles.btnDisabled]} onPress={() => void addChild()} disabled={!newName.trim() || !dobValid || addingChild} activeOpacity={0.85}>
                      {addingChild ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>Add child</Text>}
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

              {/* Family & Contributors section */}
              <Text style={styles.sectionTitle}>Family & Contributors</Text>

              <View style={styles.card}>
                {/* Pending connection requests — shown first with amber badge */}
                {pendingRequests.length > 0 && (
                  <>
                    <Text style={styles.subsectionLabel}>Connection requests</Text>
                    {pendingRequests.map((req, idx) => (
                      <View key={req.id}>
                        <View style={styles.requestRow}>
                          <View style={[styles.avatar, { backgroundColor: '#f59e0b' }]}>
                            <Text style={styles.avatarText}>{req.requester_name.charAt(0).toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.contributorName}>{req.requester_name}</Text>
                            <Text style={styles.contributorRel}>
                              {req.requester_handle ? `@${req.requester_handle} · ` : ''}Wants to connect
                            </Text>
                          </View>
                          <View style={styles.requestBadge}>
                            <Text style={styles.requestBadgeText}>New</Text>
                          </View>
                        </View>

                        {approvingRequestId === req.id ? (
                          <View style={styles.approvePanel}>
                            <Text style={styles.approvePanelLabel}>Their relationship to your children</Text>
                            <View style={styles.relRow}>
                              {RELATIONSHIPS.map(rel => (
                                <TouchableOpacity
                                  key={rel}
                                  style={[styles.relPill, approveRelationship === rel && styles.relPillActive]}
                                  onPress={() => setApproveRelationship(rel)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[styles.relPillText, approveRelationship === rel && styles.relPillTextActive]}>{rel}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                            {children.length > 1 && (
                              <>
                                <Text style={styles.approvePanelLabel}>Which children can {req.requester_name} see?</Text>
                                {children.map(child => (
                                  <TouchableOpacity
                                    key={child.id}
                                    style={styles.childCheckRow}
                                    onPress={() => setApproveChildSelections(prev => ({ ...prev, [child.id]: !(prev[child.id] ?? true) }))}
                                    activeOpacity={0.7}
                                  >
                                    <View style={[styles.checkbox, (approveChildSelections[child.id] ?? true) && styles.checkboxChecked]}>
                                      {(approveChildSelections[child.id] ?? true) && <Text style={styles.checkmark}>✓</Text>}
                                    </View>
                                    <Text style={styles.childCheckName}>{child.name}</Text>
                                  </TouchableOpacity>
                                ))}
                              </>
                            )}
                            <View style={styles.inlineBtnRow}>
                              <TouchableOpacity
                                style={[styles.primaryBtn, (!approveRelationship || savingApproval) && styles.btnDisabled]}
                                onPress={() => void approveRequest(req.requester_id)}
                                disabled={!approveRelationship || savingApproval}
                                activeOpacity={0.85}
                              >
                                {savingApproval ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>Confirm</Text>}
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.ghostBtn} onPress={() => { setApprovingRequestId(null); setApproveRelationship(''); setApproveChildSelections({}) }} activeOpacity={0.7}>
                                <Text style={styles.ghostBtnText}>Cancel</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.requestActions}>
                            <TouchableOpacity style={styles.approveBtn} onPress={() => openApprovePanel(req)} activeOpacity={0.85}>
                              <Text style={styles.approveBtnText}>Approve</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.declineBtn} onPress={() => declineRequest(req.id)} activeOpacity={0.7}>
                              <Text style={styles.declineBtnText}>Decline</Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {idx < pendingRequests.length - 1 && <View style={styles.rowDivider} />}
                      </View>
                    ))}
                    {(contributors.length > 0 || pendingInvites.length > 0) && (
                      <View style={[styles.rowDivider, { marginVertical: 12 }]} />
                    )}
                  </>
                )}

                {connectionsLoading && contributors.length === 0 && pendingInvites.length === 0 ? (
                  <ActivityIndicator size="small" color={colors.sky} />
                ) : contributors.length === 0 && pendingInvites.length === 0 && pendingRequests.length === 0 ? (
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

                    {pendingInvites.length > 0 && (
                      <>
                        {contributors.length > 0 && <View style={styles.rowDivider} />}
                        <Text style={styles.pendingLabel}>Pending invites</Text>
                        {pendingInvites.map(p => (
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
                <View
                  style={styles.inviteSheet}
                  onLayout={(e) => {
                    if (!hasScrolledToInvite.current) {
                      hasScrolledToInvite.current = true
                      scrollRef.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - 20), animated: true })
                    }
                  }}
                >
                  <Text style={styles.inviteSheetTitle}>Invite a family member</Text>
                  <Text style={styles.inviteSheetLabel}>Their relationship to {selectedChild?.name ?? 'your child'}</Text>
                  <View style={styles.relRow}>
                    {RELATIONSHIPS.map(rel => (
                      <TouchableOpacity key={rel} style={[styles.relPill, inviteRelationship === rel && styles.relPillActive]} onPress={() => setInviteRelationship(rel)} activeOpacity={0.7}>
                        <Text style={[styles.relPillText, inviteRelationship === rel && styles.relPillTextActive]}>{rel}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={[styles.whatsappBtn, !handle && styles.btnDisabled]}
                    onPress={shareWhatsApp}
                    disabled={!handle}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.whatsappText}>
                      {handle ? 'Share on WhatsApp' : 'Loading handle…'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.ghostBtn} onPress={() => { setShowInvite(false); setInviteRelationship('') }} activeOpacity={0.7}>
                    <Text style={[styles.ghostBtnText, { textAlign: 'center' }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.inviteBtn} onPress={openInvite} activeOpacity={0.85}>
                  <Ionicons name="person-add-outline" size={18} color="#ffffff" />
                  <Text style={styles.inviteBtnText}>Invite a family member</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* ── CONTRIBUTOR SECTION ────────────────────────────────────────── */}
          {(isContributor || myConnectionsLoading) && (
            <>
              <Text style={[styles.sectionTitle, isParent && { marginTop: 24 }]}>Connected Children</Text>
              <View style={styles.card}>
                {myConnectionsLoading ? (
                  <ActivityIndicator size="small" color={colors.sky} />
                ) : (
                  <>
                    {myApproved.map((conn, idx) => (
                      <View key={conn.id}>
                        <TouchableOpacity
                          style={styles.connectedChildRow}
                          onPress={() => router.push(`/connected-child/${conn.id}` as never)}
                          activeOpacity={0.75}
                        >
                          <View style={styles.connectedChildAvatar}>
                            <Text style={styles.connectedChildAvatarText}>{conn.childName[0]?.toUpperCase() ?? '?'}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.childName}>{conn.childName}</Text>
                            <Text style={styles.contributorRel}>
                              {conn.parentHandle ? `@${conn.parentHandle}` : conn.parentName}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 6 }}>
                            {conn.relationship && (
                              <View style={styles.relBadge}>
                                <Text style={styles.relBadgeText}>{conn.relationship}</Text>
                              </View>
                            )}
                            <Text style={styles.viewDetailsText}>View →</Text>
                          </View>
                        </TouchableOpacity>
                        {idx < myApproved.length - 1 && <View style={styles.rowDivider} />}
                      </View>
                    ))}

                    {myPending.length > 0 && (
                      <>
                        {myApproved.length > 0 && <View style={[styles.rowDivider, { marginVertical: 8 }]} />}
                        <Text style={styles.pendingLabel}>Awaiting approval</Text>
                        {myPending.map((conn, idx) => (
                          <View key={conn.id}>
                            <View style={styles.contributorRow}>
                              <View style={[styles.avatar, { backgroundColor: '#f59e0b' }]}>
                                <Text style={styles.avatarText}>⏳</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.contributorName}>
                                  {conn.parentHandle ? `@${conn.parentHandle}` : conn.parentName}
                                </Text>
                                <Text style={styles.contributorRel}>Waiting for approval</Text>
                              </View>
                              <View style={styles.pendingChip}>
                                <Text style={styles.pendingChipText}>Pending</Text>
                              </View>
                            </View>
                            {idx < myPending.length - 1 && <View style={styles.rowDivider} />}
                          </View>
                        ))}
                      </>
                    )}
                  </>
                )}
              </View>
            </>
          )}

          {/* Setup account CTA for contributor-only users */}
          {!isParent && (
            <TouchableOpacity
              style={styles.setupAccountBtn}
              onPress={() => router.push('/(auth)/child')}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.midnight} />
              <Text style={styles.setupAccountBtnText}>Set up your own child's account</Text>
            </TouchableOpacity>
          )}

          {/* Empty state — no children and no connections */}
          {!isParent && !isContributor && !myConnectionsLoading && (
            <View style={[styles.card, { marginHorizontal: 16, paddingVertical: 32, alignItems: 'center' }]}>
              <Text style={[styles.emptyText, { marginBottom: 4 }]}>No family connections yet</Text>
              <Text style={styles.emptyText}>Sign up using someone's @handle to get connected</Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <CelebrationModal
        visible={!!connectionCelebration}
        emoji="🎉"
        title={`${connectionCelebration?.name} is now part of ${connectionCelebration?.childName}'s team!`}
        subtitle={`They can now see ${connectionCelebration?.childName}'s pot and set up contributions`}
        primaryButton={{ label: 'Great!', onPress: () => setConnectionCelebration(null) }}
        onDismiss={() => setConnectionCelebration(null)}
      />
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
    backgroundColor: '#ffffff', borderRadius: 20,
    marginHorizontal: 16, marginBottom: 10, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  childIdentityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  childAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.sky, alignItems: 'center', justifyContent: 'center',
  },
  childAvatarText: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  childName: { fontSize: 18, fontWeight: '700', color: colors.midnight },
  childDob: { fontSize: 13, color: '#64748b', marginTop: 2 },
  editChip: {
    borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  editChipText: { fontSize: 13, fontWeight: '600', color: colors.azure },
  deleteChip: {
    borderWidth: 1, borderColor: '#fecaca',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    alignItems: 'center', justifyContent: 'center',
  },
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
  linkIsaBtn: { backgroundColor: `${colors.sky}22`, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  linkIsaBtnText: { fontSize: 13, fontWeight: '700', color: colors.sky },

  // Inline form
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.midnight, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.midnight, backgroundColor: '#ffffff',
  },
  dobRow: { flexDirection: 'row', gap: 8, marginBottom: 2 },
  dobErrorText: { fontSize: 12, color: '#ef4444', marginTop: 6 },
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
    backgroundColor: '#ffffff', borderRadius: 20,
    marginHorizontal: 16, marginBottom: 10, padding: 16,
  },
  addChildBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#e2e8f0',
    borderRadius: 14, paddingVertical: 14,
    marginHorizontal: 16, marginBottom: 20,
  },
  addChildBtnText: { fontSize: 14, fontWeight: '600', color: colors.azure },

  // Section headings
  sectionTitle: {
    fontSize: 18, fontWeight: '700', color: colors.midnight,
    marginHorizontal: 16, marginBottom: 10, marginTop: 8,
  },
  subsectionLabel: {
    fontSize: 12, fontWeight: '700', color: '#d97706',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },

  // Card container
  card: {
    backgroundColor: '#ffffff', borderRadius: 20,
    marginHorizontal: 16, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },

  // Contributor rows
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
  emptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', paddingVertical: 4 },

  // Pending requests
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  requestBadge: {
    backgroundColor: '#fef3c7', borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  requestBadgeText: { fontSize: 11, fontWeight: '700', color: '#d97706' },
  requestActions: { flexDirection: 'row', gap: 10, paddingBottom: 8 },
  approveBtn: {
    flex: 1, backgroundColor: '#dcfce7', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  approveBtnText: { fontSize: 14, fontWeight: '700', color: '#16a34a' },
  declineBtn: {
    flex: 1, borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  declineBtnText: { fontSize: 14, fontWeight: '600', color: '#94a3b8' },
  approvePanel: {
    backgroundColor: '#fefce8', borderRadius: 12, padding: 14, marginBottom: 8,
  },
  approvePanelLabel: { fontSize: 13, color: '#64748b', marginBottom: 12 },

  // Relationship pills
  relRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  relPill: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 100, borderWidth: 1.5, borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  relPillActive: { backgroundColor: colors.midnight, borderColor: colors.midnight },
  relPillText: { fontSize: 13, fontWeight: '600', color: colors.midnight },
  relPillTextActive: { color: '#ffffff' },

  // Invite sheet
  inviteSheet: {
    backgroundColor: '#ffffff', borderRadius: 20,
    marginHorizontal: 16, padding: 20, marginBottom: 14,
  },
  inviteSheetTitle: { fontSize: 16, fontWeight: '700', color: colors.midnight, marginBottom: 4 },
  inviteSheetLabel: { fontSize: 13, color: '#64748b', marginBottom: 14 },
  whatsappBtn: {
    backgroundColor: '#25D366', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginBottom: 10,
  },
  whatsappText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  inviteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.azure, borderRadius: 16,
    paddingVertical: 16, marginHorizontal: 16, marginBottom: 20,
  },
  inviteBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },

  // Setup account CTA
  setupAccountBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.sky, borderRadius: 16,
    paddingVertical: 16, marginHorizontal: 16, marginBottom: 20, marginTop: 8,
  },
  setupAccountBtnText: { color: colors.midnight, fontSize: 15, fontWeight: '700' },

  // Connected children
  connectedChildRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  connectedChildAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.azure, alignItems: 'center', justifyContent: 'center',
  },
  connectedChildAvatarText: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  relBadge: {
    backgroundColor: `${colors.sky}22`, borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  relBadgeText: { fontSize: 11, fontWeight: '700', color: colors.azure },
  viewDetailsText: { fontSize: 13, fontWeight: '600', color: colors.azure },

  // Multi-child approval checkboxes
  childCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.sky, borderColor: colors.sky },
  checkmark: { color: colors.midnight, fontSize: 13, fontWeight: '800' },
  childCheckName: { fontSize: 15, fontWeight: '600', color: colors.midnight },
})
