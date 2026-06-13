import { useEffect, useRef } from 'react'
import { View } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts } from 'expo-font'
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AuthProvider, useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

SplashScreen.preventAutoHideAsync()

// ── Auth redirect — must be inside AuthProvider ───────────────────────────────

function AuthRedirect() {
  const router = useRouter()
  const segments = useSegments()
  const segmentsRef = useRef(segments)
  const { session, isLoading } = useAuth()
  const checkedForUser = useRef<string | null>(null)

  // Keep segmentsRef current without making segments a dep of the main effect
  useEffect(() => {
    segmentsRef.current = segments
  }, [segments])

  useEffect(() => {
    if (isLoading) return

    if (!session) {
      AsyncStorage.clear()
      router.replace('/(auth)/welcome')
      checkedForUser.current = null
      return
    }

    // Only run the onboarding check once per user session
    if (checkedForUser.current === session.user.id) return
    checkedForUser.current = session.user.id

    // User is actively navigating through auth screens (e.g. mid sign-up in details.tsx).
    // Let the screen own its navigation — running checkOnboarding now would race the
    // profile insert and redirect back to details before it completes.
    if (segmentsRef.current[0] === '(auth)') return

    const checkOnboarding = async () => {
      const userId = session.user.id

      const { data: profile } = await supabase
        .from('profiles')
        .select('handle')
        .eq('id', userId)
        .maybeSingle()

      if (!profile) {
        router.replace('/(auth)/details')
        return
      }

      if (!(profile as { handle: string | null }).handle) {
        router.replace('/(auth)/handle')
        return
      }

      const { data: child } = await supabase
        .from('children')
        .select('id')
        .eq('owner_id', userId)
        .limit(1)
        .maybeSingle()

      if (!child) {
        const { data: conn } = await supabase
          .from('family_connections')
          .select('id')
          .eq('requester_id', userId)
          .limit(1)
          .maybeSingle()

        if (conn) {
          router.replace('/(tabs)/home')
          return
        }

        router.replace('/(auth)/child')
        return
      }

      router.replace('/(tabs)/home')
    }

    void checkOnboarding()
  }, [session, isLoading])

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: '#101628' }} />
  }

  return null
}

// ── Root layout ───────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  })

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) return null

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AuthRedirect />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
