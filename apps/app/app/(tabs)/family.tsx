import { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Clipboard from 'expo-clipboard'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { colors } from '@/constants/brand'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Contributor {
  id: string
  name: string
  initial: string
  relationship: string
  totalContributed: number
  lastActive: string
  avatar_color: string
}

interface PendingInvite {
  id: string
  name: string
  sentTo: string
  sentDays: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626']

// ── Helpers ───────────────────────────────────────────────────────────────────

function gbp(n: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n)
}

function relativeDate(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'Last week'
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function FamilyScreen() {
  const { user } = useAuth()
  const [child, setChild] = useState<{ id: string; name: string } | null>(null)
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      setIsLoading(true)

      const { data: childData } = await supabase
        .from('children')
        .select('id, name')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (childData) {
        setChild(childData)

        const { data: contribs } = await supabase
          .from('family_contributors')
          .select('*')
          .eq('child_id', childData.id)

        if (contribs) {
          setContributors(contribs.map((c, idx) => ({
            id: c.id,
            name: c.name ?? 'Family member',
            initial: ((c.name ?? 'F') as string).charAt(0).toUpperCase(),
            relationship: c.relationship ?? '',
            totalContributed: c.total_contributed ?? 0,
            lastActive: relativeDate(c.last_active_at ?? c.joined_at),
            avatar_color: c.avatar_color ?? AVATAR_COLORS[idx % AVATAR_COLORS.length],
          })))
        }

        const { data: invites } = await supabase
          .from('family_invites')
          .select('*')
          .eq('child_id', childData.id)
          .eq('status', 'pending')

        if (invites) {
          setPendingInvites(invites.map((inv) => ({
            id: inv.id,
            name: inv.invited_name ?? 'Guest',
            sentTo: inv.sent_to_email ?? '',
            sentDays: Math.floor(
              (Date.now() - new Date(inv.sent_at).getTime()) / (1000 * 60 * 60 * 24)
            ),
          })))
        }
      }

      setIsLoading(false)
    }
    fetchData()
  }, [user])

  const childName = child?.name ?? 'your child'
  const networkTotal = contributors.reduce((sum, c) => sum + c.totalContributed, 0)

  const inviteMessage =
    `I've set up Amplifi so our everyday shopping builds ${childName}'s future. ` +
    `You can contribute too — join her gifting network: https://amplifi-plan.netlify.app`

  const shareWhatsApp = () => {
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(inviteMessage)}`).catch(() =>
      Alert.alert('WhatsApp not found', 'Please install WhatsApp to share this way.')
    )
  }

  const copyLink = async () => {
    await Clipboard.setStringAsync(inviteMessage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sendEmail = () => {
    const subject = encodeURIComponent(`Join ${childName}'s gifting network on Amplifi`)
    const body = encodeURIComponent(inviteMessage)
    Linking.openURL(`mailto:?subject=${subject}&body=${body}`).catch(() =>
      Alert.alert('Email not available', 'Please set up an email account on this device.')
    )
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.offwhite, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.sky} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* S1 — Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Family Network</Text>
          <Text style={styles.subtitle}>Building {childName}'s future together</Text>
        </View>

        {/* S2 — Network value card */}
        <View style={styles.networkCard}>
          <Text style={styles.networkLabel}>👨‍👩‍👧 {childName}'s family network</Text>
          <Text style={styles.networkTotal}>{gbp(networkTotal)}</Text>
          <Text style={styles.networkSub}>contributed to her JISA this year</Text>
          <Text style={styles.networkCount}>{contributors.length} active contributors</Text>
        </View>

        {/* S3 — Contributors */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contributors</Text>

          {contributors.length === 0 ? (
            <Text style={styles.emptyContributors}>
              No contributors yet — invite family to get started
            </Text>
          ) : (
            contributors.map((c, idx) => (
              <View key={c.id}>
                <View style={styles.contributorRow}>
                  <View style={[styles.avatar, { backgroundColor: c.avatar_color }]}>
                    <Text style={styles.avatarText}>{c.initial}</Text>
                  </View>
                  <View style={styles.contributorMid}>
                    <Text style={styles.contributorName}>{c.name}</Text>
                    <Text style={styles.contributorRel}>{c.relationship}</Text>
                    <Text style={styles.contributorActive}>Last active {c.lastActive}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.contributorAmount}>{gbp(c.totalContributed)}</Text>
                    <Text style={styles.contributorAmountLabel}>this year</Text>
                  </View>
                </View>
                {idx < contributors.length - 1 && <View style={styles.divider} />}
              </View>
            ))
          )}

          {contributors.length > 0 && (
            <Text style={styles.contributorFooter}>
              {contributors.length} {contributors.length === 1 ? 'person is' : 'people are'} building {childName}'s future
            </Text>
          )}
        </View>

        {/* S4 — Pending invites */}
        {pendingInvites.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pending invites</Text>

            {pendingInvites.map((inv) => (
              <View key={inv.id} style={styles.pendingRow}>
                <View style={styles.pendingAvatar}>
                  <Text style={styles.pendingAvatarText}>?</Text>
                </View>
                <View style={styles.pendingMid}>
                  <Text style={styles.pendingName}>{inv.name}</Text>
                  <Text style={styles.pendingInfo}>
                    Invited {inv.sentDays} days ago to {inv.sentTo}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => Alert.alert('Invite resent', `Invite resent to ${inv.sentTo}`)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resendText}>Resend</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* S5 — Invite CTA */}
        <View style={styles.inviteCard}>
          <Text style={styles.inviteTitle}>Invite {childName}'s family</Text>
          <Text style={styles.inviteBody}>
            Grandparents, aunts, uncles and friends can all buy gift cards that earn cashback
            for {childName}'s JISA.
          </Text>

          <TouchableOpacity style={styles.whatsappBtn} onPress={shareWhatsApp} activeOpacity={0.85}>
            <Text style={styles.whatsappText}>📱 Share on WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.outlineBtn, copied && styles.outlineBtnCopied]}
            onPress={copyLink}
            activeOpacity={0.85}
          >
            <Text style={[styles.outlineBtnText, copied && styles.outlineBtnTextCopied]}>
              {copied ? '📋 Copied! ✓' : '📋 Copy invite link'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.emailBtn} onPress={sendEmail} activeOpacity={0.85}>
            <Text style={styles.emailBtnText}>✉️ Send by email</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.offwhite },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: colors.midnight, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 3 },

  networkCard: {
    backgroundColor: colors.midnight,
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 20,
    marginBottom: 16,
  },
  networkLabel: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  networkTotal: {
    fontSize: 36, fontWeight: '800', color: colors.sky,
    letterSpacing: -1, marginTop: 8,
  },
  networkSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 3 },
  networkCount: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.midnight, marginBottom: 12 },

  emptyContributors: {
    fontSize: 14, color: '#94a3b8', textAlign: 'center', padding: 20,
  },

  contributorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  contributorMid: { flex: 1 },
  contributorName: { fontSize: 15, fontWeight: '700', color: colors.midnight },
  contributorRel: { fontSize: 13, color: '#64748b', marginTop: 1 },
  contributorActive: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  contributorAmount: { fontSize: 15, fontWeight: '700', color: colors.midnight },
  contributorAmountLabel: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  divider: { height: 1, backgroundColor: '#f1f5f9' },
  contributorFooter: {
    fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 14,
  },

  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
  },
  pendingAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  pendingAvatarText: { color: '#94a3b8', fontSize: 18, fontWeight: '700' },
  pendingMid: { flex: 1 },
  pendingName: { fontSize: 15, fontWeight: '600', color: colors.midnight },
  pendingInfo: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  resendText: { fontSize: 14, color: colors.sky, fontWeight: '600' },

  inviteCard: {
    backgroundColor: `${colors.sky}1A`,
    borderWidth: 1,
    borderColor: `${colors.sky}66`,
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 20,
    marginBottom: 16,
  },
  inviteTitle: { fontSize: 16, fontWeight: '700', color: colors.midnight },
  inviteBody: { fontSize: 14, color: '#475569', lineHeight: 21, marginTop: 6 },
  whatsappBtn: {
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  whatsappText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: colors.midnight,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#ffffff',
  },
  outlineBtnCopied: { borderColor: colors.sky, backgroundColor: `${colors.sky}15` },
  outlineBtnText: { color: colors.midnight, fontSize: 15, fontWeight: '700' },
  outlineBtnTextCopied: { color: colors.sky },
  emailBtn: {
    borderWidth: 1.5,
    borderColor: colors.azure,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#ffffff',
  },
  emailBtnText: { color: colors.azure, fontSize: 14, fontWeight: '700' },
})
