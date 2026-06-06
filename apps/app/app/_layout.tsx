import { useEffect } from 'react'
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

SplashScreen.preventAutoHideAsync()

// ── Auth redirect — must be inside AuthProvider ───────────────────────────────

function AuthRedirect() {
  const router = useRouter()
  const { session, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return
    if (!session) {
      AsyncStorage.clear()
      router.replace('/(auth)/welcome')
    }
  }, [session, isLoading])

  // Show Midnight background while auth resolves
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
