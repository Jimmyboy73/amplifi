import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { colors } from '@/constants/brand'

export default function WishlistsScreen() {
  const { user } = useAuth()
  const [childName, setChildName] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('children')
      .select('name')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setChildName((data as { name: string }).name)
      })
  }, [user?.id])

  const name = childName ?? 'your child'

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Ionicons name="gift-outline" size={56} color={colors.sky} />
        </View>
        <Text style={styles.title}>Wishlists</Text>
        <Text style={styles.subtitle}>
          Create birthday and occasion wishlists for {name}
        </Text>
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>Coming soon</Text>
        </View>
        <Text style={styles.body}>
          Share a wishlist with family and friends so they can contribute to{' '}
          {name === 'your child' ? "your child's" : `${name}'s`} pot for birthdays,
          Christmas and other special occasions — instead of gifts that get forgotten.
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.sky}18`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.midnight,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  comingSoonBadge: {
    backgroundColor: `${colors.azure}18`,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 20,
  },
  comingSoonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.azure,
    letterSpacing: 0.3,
  },
  body: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 21,
  },
})
