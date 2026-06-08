import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '@/constants/brand'


export default function OpenBankingScreen() {
  const router = useRouter()
  const { childName } = useLocalSearchParams<{ childName: string }>()
  const name = typeof childName === 'string' && childName.length > 0 ? childName : 'your child'

  const connectBank = () =>
    Alert.alert(
      'Coming soon',
      'Open Banking via Cientia will be available at launch.',
    )

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.progress}>7 of 8</Text>
        </View>

        <Text style={styles.headline}>See what you've been missing</Text>
        <Text style={styles.subheadline}>
          Connect your bank and we'll show you how much cashback {name} could have earned on
          your existing spending.
        </Text>

        {/* Impact number */}
        <View style={styles.impactBox}>
          <Text style={styles.impactPre}>Parents like you are missing an average of</Text>
          <Text style={styles.impactNumber}>£340</Text>
          <Text style={styles.impactPost}>per year in cashback for their child</Text>
        </View>

        {/* CTAs */}
        <TouchableOpacity style={styles.primaryCta} onPress={connectBank} activeOpacity={0.85}>
          <Text style={styles.primaryCtaText}>Connect my bank</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => router.push({ pathname: '/(auth)/invite', params: { childName: name } })}
          activeOpacity={0.7}
        >
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
  },
  subheadline: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 28,
  },
  impactBox: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  impactPre: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 8,
  },
  impactNumber: {
    fontSize: 64,
    fontWeight: '800',
    color: colors.sky,
    letterSpacing: -2,
    lineHeight: 72,
    marginBottom: 8,
  },
  impactPost: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  primaryCta: {
    backgroundColor: colors.sky,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryCtaText: { color: colors.midnight, fontSize: 17, fontWeight: '700' },
  skipBtn: { alignItems: 'center', paddingVertical: 10 },
  skipText: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
})
