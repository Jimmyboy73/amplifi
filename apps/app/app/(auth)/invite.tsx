import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Clipboard from 'expo-clipboard'
import { colors } from '@/constants/brand'

export default function InviteScreen() {
  const router = useRouter()
  const { childName } = useLocalSearchParams<{ childName: string }>()
  const name = typeof childName === 'string' && childName.length > 0 ? childName : 'your child'
  const possessive = name === 'your child' ? "your child's" : `${name}'s`

  const [copied, setCopied] = useState(false)

  const shareMessage =
    `I've set up Amplifi so our everyday shopping builds ${possessive} future — ` +
    `you can contribute too by buying gift cards. Tap here to join their gifting ` +
    `network: https://letsamplifi.com`

  const shareWhatsApp = () => {
    const url = `whatsapp://send?text=${encodeURIComponent(shareMessage)}`
    Linking.openURL(url).catch(() =>
      Alert.alert('WhatsApp not found', 'Please install WhatsApp to share this way.')
    )
  }

  const copyLink = async () => {
    await Clipboard.setStringAsync(shareMessage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const skip = () => router.replace('/(tabs)/home')

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.progress}>8 of 8</Text>
        </View>

        <Text style={styles.headline}>{possessive.charAt(0).toUpperCase() + possessive.slice(1)} future is a team effort.</Text>
        <Text style={styles.subheadline}>
          Invite family to contribute — grandparents, aunts, uncles and friends can all earn
          cashback for {possessive} JISA.
        </Text>

        {/* Illustration */}
        <Text style={styles.emoji}>👨‍👩‍👧‍👦</Text>

        {/* Pre-written message */}
        <View style={styles.messageSection}>
          <Text style={styles.messageLabel}>Your invite message</Text>
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{shareMessage}</Text>
          </View>
        </View>

        {/* Share buttons */}
        <View style={styles.shareButtons}>
          <TouchableOpacity style={styles.whatsappBtn} onPress={shareWhatsApp} activeOpacity={0.85}>
            <Text style={styles.whatsappText}>Share on WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.copyBtn, copied && styles.copyBtnActive]}
            onPress={copyLink}
            activeOpacity={0.85}
          >
            <Text style={[styles.copyText, copied && styles.copyTextActive]}>
              {copied ? 'Copied ✓' : 'Copy link'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Skip */}
        <TouchableOpacity style={styles.skipBtn} onPress={skip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

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
    fontSize: 26,
    fontWeight: '800',
    color: colors.midnight,
    letterSpacing: -0.5,
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 34,
  },
  subheadline: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 28,
  },
  emoji: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 28,
  },
  messageSection: { marginBottom: 24 },
  messageLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  messageBox: {
    backgroundColor: '#f0fbff',
    borderWidth: 1,
    borderColor: `${colors.sky}55`,
    borderRadius: 14,
    padding: 16,
  },
  messageText: {
    fontSize: 14,
    color: colors.midnight,
    lineHeight: 22,
  },
  shareButtons: { gap: 12, marginBottom: 20 },
  whatsappBtn: {
    backgroundColor: '#25D366',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  whatsappText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  copyBtn: {
    borderWidth: 1.5,
    borderColor: colors.midnight,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  copyBtnActive: { borderColor: colors.sky, backgroundColor: '#f0fbff' },
  copyText: { color: colors.midnight, fontSize: 16, fontWeight: '700' },
  copyTextActive: { color: colors.sky },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipText: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
})
