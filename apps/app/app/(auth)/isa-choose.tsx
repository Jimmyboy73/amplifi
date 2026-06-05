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
import { colors } from '@/constants/brand'

// ── Provider data ─────────────────────────────────────────────────────────────

const PROVIDERS = [
  {
    id: 'hl',
    initials: 'HL',
    logoColor: '#004225',
    name: 'Hargreaves Lansdown',
    badge: 'Most popular' as string | null,
    badgeColor: colors.sky,
    benefit: "No platform fee on JISAs. UK's largest investment platform.",
    cta: 'Open HL JISA →',
    url: 'https://www.hl.co.uk/investment-services/junior-isa',
  },
  {
    id: 'ajbell',
    initials: 'AJ',
    logoColor: '#E85D26',
    name: 'AJ Bell',
    badge: null,
    badgeColor: colors.sky,
    benefit: 'Low cost. Good app. From £25/month.',
    cta: 'Open AJ Bell JISA →',
    url: 'https://www.ajbell.co.uk/junior-isa',
  },
  {
    id: 'moneybox',
    initials: 'MB',
    logoColor: '#00A896',
    name: 'Moneybox',
    badge: 'Simplest' as string | null,
    badgeColor: colors.amber,
    benefit: 'Easiest to set up. From £1. Family-friendly.',
    cta: 'Open Moneybox JISA →',
    url: 'https://www.moneyboxapp.com/junior-isa/',
  },
]

// ── Screen ────────────────────────────────────────────────────────────────────

export default function IsaChooseScreen() {
  const router = useRouter()
  const { childName } = useLocalSearchParams<{ childName: string }>()
  const name = typeof childName === 'string' && childName.length > 0 ? childName : 'your child'

  const openProvider = (url: string) => {
    Linking.openURL(url).catch(() =>
      Alert.alert('Could not open link', "Please visit the provider's website directly.")
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.progress}>5 of 8</Text>
        </View>

        <Text style={styles.headline}>Choose a JISA provider</Text>
        <Text style={styles.subheadline}>
          These are our recommended providers. You'll open the account directly with them — it
          takes about 5 minutes.
        </Text>
        <Text style={styles.disclaimer}>This is information only, not financial advice.</Text>

        {/* Provider cards */}
        <View style={styles.cards}>
          {PROVIDERS.map((p) => (
            <View key={p.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.logo, { backgroundColor: p.logoColor }]}>
                  <Text style={styles.logoText}>{p.initials}</Text>
                </View>
                <View style={styles.cardMeta}>
                  <Text style={styles.providerName}>{p.name}</Text>
                  {p.badge && (
                    <View style={[styles.badge, { backgroundColor: p.badgeColor }]}>
                      <Text style={styles.badgeText}>{p.badge}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.benefit}>{p.benefit}</Text>
              <TouchableOpacity
                style={styles.providerCta}
                onPress={() => openProvider(p.url)}
                activeOpacity={0.85}
              >
                <Text style={styles.providerCtaText}>{p.cta}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Already have one */}
        <View style={styles.divider} />
        <Text style={styles.alreadyText}>Already opened your account?</Text>
        <TouchableOpacity
          style={styles.secondaryCta}
          onPress={() => router.push({ pathname: '/(auth)/isa-link', params: { childName: name } })}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryCtaText}>Enter my account details</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

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
    marginBottom: 6,
  },
  disclaimer: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginBottom: 28,
  },
  cards: { gap: 14 },
  card: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 18,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  cardMeta: { flex: 1, gap: 4 },
  providerName: { fontSize: 16, fontWeight: '700', color: colors.midnight },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.midnight },
  benefit: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 14,
  },
  providerCta: {
    backgroundColor: colors.midnight,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  providerCtaText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 28,
  },
  alreadyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 14,
  },
  secondaryCta: {
    borderWidth: 1.5,
    borderColor: colors.midnight,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryCtaText: { fontSize: 15, fontWeight: '700', color: colors.midnight },
})
