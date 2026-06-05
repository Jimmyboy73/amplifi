import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '@/constants/brand'

export default function WelcomeScreen() {
  const router = useRouter()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.midnight }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 }}>

          {/* Logo */}
          <Text style={{
            color: colors.sky,
            fontSize: 48,
            fontWeight: '800',
            textAlign: 'center',
            marginBottom: 48,
            letterSpacing: -1,
          }}>
            amplifi
          </Text>

          {/* Headline */}
          <Text style={{
            color: '#ffffff',
            fontSize: 28,
            fontWeight: '800',
            lineHeight: 36,
            letterSpacing: -0.5,
            textAlign: 'center',
            marginBottom: 16,
          }}>
            Your child's financial future starts the day they're born.
          </Text>

          {/* Subheadline */}
          <Text style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: 16,
            lineHeight: 24,
            textAlign: 'center',
            marginBottom: 20,
          }}>
            Most parents spend 18 years raising a child. Almost none spend 18 years investing for one.
          </Text>

          {/* Body */}
          <Text style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: 14,
            lineHeight: 22,
            textAlign: 'center',
            marginBottom: 48,
          }}>
            Amplifi turns your everyday shopping into your child's financial future. No extra spending. No complicated investing. Just your weekly shop — working harder.
          </Text>

          {/* Primary CTA */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/details')}
            activeOpacity={0.85}
            style={{
              backgroundColor: colors.sky,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Text style={{ color: colors.midnight, fontSize: 17, fontWeight: '700' }}>
              Get started
            </Text>
          </TouchableOpacity>

          {/* Secondary link */}
          <TouchableOpacity activeOpacity={0.7} style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: '600' }}>
              I already have an account
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
