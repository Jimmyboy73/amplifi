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
import { Ionicons } from '@expo/vector-icons'
import { useHandle } from '@/lib/useHandle'
import { colors } from '@/constants/brand'

export default function InviteScreen() {
  const router = useRouter()
  const { childName } = useLocalSearchParams<{ childName: string }>()
  const name = typeof childName === 'string' && childName.length > 0 ? childName : 'your child'

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

        {/* Icon */}
        <View style={styles.iconWrap}>
          <Ionicons name="people-outline" size={64} color={colors.sky} />
        </View>

        <Text style={styles.headline}>Invite your family to contribute</Text>
        <Text style={styles.subheadline}>
          Does {name} have grandparents or other friends and family who might want to contribute regularly?
          Invite them to Amplifi and {name} gets a{' '}
          <Text style={styles.highlight}>£5 credit</Text>
          {' '}when they make 3 qualifying contributions.
        </Text>

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
  iconWrap: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  headline: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.midnight,
    letterSpacing: -0.5,
    marginBottom: 14,
    lineHeight: 34,
  },
  subheadline: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 25,
    marginBottom: 40,
  },
  highlight: {
    fontWeight: '800',
    color: colors.midnight,
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
