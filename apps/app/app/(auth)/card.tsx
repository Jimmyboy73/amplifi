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

export default function CardScreen() {
  const router = useRouter()
  const { childName } = useLocalSearchParams<{ childName: string }>()
  const name = typeof childName === 'string' && childName.length > 0 ? childName : 'your child'

  const comingSoon = () =>
    Alert.alert('Coming soon', 'Card linking will be available at launch.')

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.progress}>6 of 8</Text>
        </View>

        <Text style={styles.headline}>Set up your cashback card</Text>
        <Text style={styles.subheadline}>
          Every time you spend, cashback goes straight to {name}'s pot.
        </Text>

        {/* Flow diagram */}
        <View style={styles.flow}>
          <View style={styles.flowBox}>
            <Text style={styles.flowText}>You shop</Text>
          </View>
          <Text style={styles.flowArrow}>›</Text>
          <View style={styles.flowBox}>
            <Text style={styles.flowText}>Cashback{'\n'}earned</Text>
          </View>
          <Text style={styles.flowArrow}>›</Text>
          <View style={styles.flowBox}>
            <Text style={styles.flowText}>{name}'s{'\n'}JISA</Text>
          </View>
        </View>

        {/* Card options */}
        <View style={styles.cards}>

          {/* Recommended: Amplifi card */}
          <View style={styles.recommendedCard}>
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedBadgeText}>Recommended</Text>
            </View>
            <Text style={styles.cardTitle}>Order an Amplifi card</Text>
            <Text style={styles.cardBody}>
              A Visa debit card linked to your Amplifi account. Earn cashback automatically at
              thousands of merchants.
            </Text>
            <TouchableOpacity style={styles.primaryCta} onPress={comingSoon} activeOpacity={0.85}>
              <Text style={styles.primaryCtaText}>Order my card</Text>
            </TouchableOpacity>
          </View>

          {/* Alternative: link existing */}
          <View style={styles.alternativeCard}>
            <Text style={styles.cardTitle}>Link an existing card</Text>
            <Text style={styles.cardBody}>
              Connect your current Visa or Mastercard to earn cashback on everyday spending.
            </Text>
            <TouchableOpacity style={styles.secondaryCta} onPress={comingSoon} activeOpacity={0.85}>
              <Text style={styles.secondaryCtaText}>Link my card</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Skip */}
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => router.push({ pathname: '/(auth)/open-banking', params: { childName: name } })}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip for now — I'll set this up later</Text>
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
    marginBottom: 24,
  },
  flow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 28,
    paddingVertical: 4,
  },
  flowBox: {
    flex: 1,
    backgroundColor: colors.sky,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  flowText: {
    color: colors.midnight,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 15,
  },
  flowArrow: { fontSize: 20, color: colors.midnight, fontWeight: '700' },
  cards: { gap: 14, marginBottom: 24 },
  recommendedCard: {
    borderWidth: 1.5,
    borderColor: colors.sky,
    backgroundColor: '#f0fbff',
    borderRadius: 16,
    padding: 20,
  },
  recommendedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.sky,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 10,
  },
  recommendedBadgeText: { fontSize: 11, fontWeight: '700', color: colors.midnight },
  alternativeCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.midnight,
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 21,
    marginBottom: 16,
  },
  primaryCta: {
    backgroundColor: colors.sky,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryCtaText: { color: colors.midnight, fontSize: 15, fontWeight: '700' },
  secondaryCta: {
    borderWidth: 1.5,
    borderColor: colors.midnight,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryCtaText: { color: colors.midnight, fontSize: 15, fontWeight: '700' },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipText: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
})
