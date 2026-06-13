import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useChildren } from '@/lib/useChildren'
import { useSelectedChild } from '@/lib/SelectedChildContext'
import { colors } from '@/constants/brand'

export default function RewardsScreen() {
  const { children } = useChildren()
  const { selectedChildId } = useSelectedChild()

  const child = children.find(c => c.id === selectedChildId) ?? children[0] ?? null
  const childName = child?.name ?? 'your child'

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Rewards</Text>
          <Text style={styles.subtitle}>Features in the works — we'll let you know when they're ready.</Text>
        </View>

        <View style={styles.teaserCard}>
          <View style={styles.teaserIconWrap}>
            <Text style={styles.teaserIconText}>%</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.teaserTitle}>Cashback</Text>
            <Text style={styles.teaserBody}>
              Earn cashback on everyday spending — automatically added to {childName}'s pot
            </Text>
          </View>
          <View style={styles.teaserBadge}>
            <Text style={styles.teaserBadgeText}>Coming soon</Text>
          </View>
        </View>

        <View style={styles.teaserCard}>
          <View style={styles.teaserIconWrap}>
            <Text style={styles.teaserIconText}>🎴</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.teaserTitle}>Loyalty offers</Text>
            <Text style={styles.teaserBody}>
              Buy gift cards from top brands and earn cashback for {childName}
            </Text>
          </View>
          <View style={styles.teaserBadge}>
            <Text style={styles.teaserBadgeText}>Coming soon</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
  title: {
    fontSize: 26, fontWeight: '800', color: colors.midnight,
    letterSpacing: -0.5, marginBottom: 6,
  },
  subtitle: { fontSize: 14, color: '#64748b', lineHeight: 20 },
  teaserCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 16, marginHorizontal: 16, marginBottom: 8, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  teaserIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  teaserIconText: { fontSize: 18 },
  teaserTitle: { fontSize: 13, fontWeight: '700', color: '#94a3b8', marginBottom: 2 },
  teaserBody: { fontSize: 12, color: '#94a3b8', lineHeight: 17 },
  teaserBadge: {
    backgroundColor: '#f1f5f9', borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', flexShrink: 0,
  },
  teaserBadgeText: {
    fontSize: 10, fontWeight: '700', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 0.3,
  },
})
