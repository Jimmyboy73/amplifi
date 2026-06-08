import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useHandle } from '@/lib/useHandle'
import { colors } from '@/constants/brand'

export default function InviteScreen() {
  const router = useRouter()
  const { childName } = useLocalSearchParams<{ childName: string }>()
  const name = typeof childName === 'string' && childName.length > 0 ? childName : 'your child'
  const possessive = name === 'your child' ? "Your child's" : `${name}'s`

  const { handle, loading: handleLoading } = useHandle()

  const referralUrl = handle
    ? `https://amplifi-marketing.netlify.app/?ref=${handle}`
    : 'https://amplifi-marketing.netlify.app'

  const shareMessage =
    `I've set up Amplifi for ${name} — helping to build a solid financial foundation for their future. ` +
    `We'd be so grateful for any regular or one-off contribution you're able to make. ` +
    `Tap here to join Amplifi — ${name} gets £5 when you make a qualifying contribution: ${referralUrl}`

  const shareWhatsApp = () => {
    const url = `whatsapp://send?text=${encodeURIComponent(shareMessage)}`
    Linking.openURL(url).catch(() =>
      Alert.alert('WhatsApp not found', 'Please install WhatsApp to share this way.')
    )
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

        <Text style={styles.headline}>{possessive} future is a team effort</Text>
        <Text style={styles.subheadline}>
          Grandparents can make a real difference by setting up a regular monthly contribution to {name}'s pot.
          Friends, aunts and uncles can help too — whether that's a regular contribution or gifts for birthdays and special occasions.
        </Text>

        {/* Icon */}
        <Text style={styles.icon}>🫂</Text>

        {/* Incentive */}
        <View style={styles.incentiveBox}>
          <Text style={styles.incentiveText}>
            Whenever a new contributor opens an Amplifi account and makes 3 qualifying contributions, {name} gets a{' '}
            <Text style={styles.incentiveBold}>£5 credit</Text>
          </Text>
        </View>

        {/* Message preview */}
        <View style={styles.messageSection}>
          <Text style={styles.messageLabel}>Your invite message</Text>
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{shareMessage}</Text>
          </View>
        </View>

        {/* WhatsApp button */}
        <TouchableOpacity
          style={[styles.whatsappBtn, handleLoading && styles.btnDisabled]}
          onPress={shareWhatsApp}
          disabled={handleLoading}
          activeOpacity={0.85}
        >
          {handleLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.whatsappText}>Share on WhatsApp</Text>
          )}
        </TouchableOpacity>

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
    marginBottom: 12,
    lineHeight: 34,
  },
  subheadline: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 23,
    marginBottom: 28,
  },
  icon: {
    fontSize: 72,
    textAlign: 'center',
    marginBottom: 20,
  },
  incentiveBox: {
    backgroundColor: `${colors.sky}18`,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  incentiveText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 21,
    textAlign: 'center',
  },
  incentiveBold: {
    fontWeight: '800',
    color: colors.midnight,
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
  whatsappBtn: {
    backgroundColor: '#25D366',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 52,
    justifyContent: 'center',
  },
  whatsappText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipText: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
})
