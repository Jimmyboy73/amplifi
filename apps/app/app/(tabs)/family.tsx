import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Clipboard from 'expo-clipboard'
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

// ── Mock data ─────────────────────────────────────────────────────────────────

const CHILD_NAME = 'Olivia'
const NETWORK_TOTAL = 390.00

const CONTRIBUTORS: Contributor[] = [
  { id: '1', name: 'Grandma',   initial: 'G', relationship: 'Grandparent', totalContributed: 340.00, lastActive: '2 days ago', avatar_color: '#7C3AED' },
  { id: '2', name: 'Uncle Tom', initial: 'T', relationship: 'Uncle',       totalContributed: 50.00,  lastActive: 'Last week',  avatar_color: '#0891B2' },
]

const PENDING_INVITES: PendingInvite[] = [
  { id: '1', name: 'Grandad', sentTo: 'grandad@email.com', sentDays: 3 },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function gbp(n: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n)
}

const INVITE_MESSAGE =
  `I've set up Amplifi so our everyday shopping builds ${CHILD_NAME}'s future. ` +
  `You can contribute too — join her gifting network: https://amplifi-plan.netlify.app`

// ── Screen ────────────────────────────────────────────────────────────────────

export default function FamilyScreen() {
  const [copied, setCopied] = useState(false)

  const shareWhatsApp = () => {
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(INVITE_MESSAGE)}`).catch(() =>
      Alert.alert('WhatsApp not found', 'Please install WhatsApp to share this way.')
    )
  }

  const copyLink = async () => {
    await Clipboard.setStringAsync(INVITE_MESSAGE)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sendEmail = () => {
    const subject = encodeURIComponent(`Join ${CHILD_NAME}'s gifting network on Amplifi`)
    const body = encodeURIComponent(INVITE_MESSAGE)
    Linking.openURL(`mailto:?subject=${subject}&body=${body}`).catch(() =>
      Alert.alert('Email not available', 'Please set up an email account on this device.')
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* S1 — Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Family Network</Text>
          <Text style={styles.subtitle}>Building {CHILD_NAME}'s future together</Text>
        </View>

        {/* S2 — Network value card */}
        <View style={styles.networkCard}>
          <Text style={styles.networkLabel}>👨‍👩‍👧 {CHILD_NAME}'s family network</Text>
          <Text style={styles.networkTotal}>{gbp(NETWORK_TOTAL)}</Text>
          <Text style={styles.networkSub}>contributed to her JISA this year</Text>
          <Text style={styles.networkCount}>{CONTRIBUTORS.length} active contributors</Text>
        </View>

        {/* S3 — Contributors */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contributors</Text>

          {CONTRIBUTORS.map((c, idx) => (
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
              {idx < CONTRIBUTORS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}

          <Text style={styles.contributorFooter}>
            {CONTRIBUTORS.length} people are building {CHILD_NAME}'s future
          </Text>
        </View>

        {/* S4 — Pending invites */}
        {PENDING_INVITES.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pending invites</Text>

            {PENDING_INVITES.map((inv) => (
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
          <Text style={styles.inviteTitle}>Invite {CHILD_NAME}'s family</Text>
          <Text style={styles.inviteBody}>
            Grandparents, aunts, uncles and friends can all buy gift cards that earn cashback
            for {CHILD_NAME}'s JISA.
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

        {/* S6 — Upgrade nudge */}
        <View style={styles.upgradeCard}>
          <Text style={styles.upgradeTitle}>Do you have children?</Text>
          <Text style={styles.upgradeSub}>
            Set up a pot for your own children and start building their future too.
          </Text>
          <TouchableOpacity
            onPress={() => Alert.alert('Set up a pot', 'Account creation coming soon.')}
            activeOpacity={0.7}
          >
            <Text style={styles.upgradeLink}>Set up my child's pot →</Text>
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

  upgradeCard: {
    backgroundColor: colors.offwhite,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 20,
    marginBottom: 16,
  },
  upgradeTitle: { fontSize: 15, fontWeight: '700', color: colors.midnight },
  upgradeSub: { fontSize: 13, color: '#64748b', marginTop: 4, lineHeight: 19 },
  upgradeLink: { fontSize: 14, color: colors.sky, fontWeight: '600', marginTop: 10 },
})
