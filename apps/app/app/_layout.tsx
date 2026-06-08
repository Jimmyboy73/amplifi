import { useEffect, useRef } from 'react'
import { View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
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
  const { session, isLoading } = useAuth()
  const checkedForUser = useRef<string | null>(null)

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
