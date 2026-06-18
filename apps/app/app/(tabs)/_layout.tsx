import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/brand'
import { SelectedChildProvider } from '@/lib/SelectedChildContext'
import { usePendingConnectionCount } from '@/lib/usePendingConnectionCount'

function EmojiIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{emoji}</Text>
}

export default function TabsLayout() {
  const pendingCount = usePendingConnectionCount()

  return (
    <SelectedChildProvider>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.midnight,
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f1f5f9',
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <EmojiIcon emoji="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: 'My Family',
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarActiveTintColor: colors.sky,
          tabBarIcon: () => (
            <Ionicons name="people" size={22} color={colors.sky} />
          ),
        }}
      />
      <Tabs.Screen name="occasions" options={{ href: null }} />
      <Tabs.Screen name="rewards" options={{ href: null }} />
      <Tabs.Screen name="offers" options={{ href: null }} />
      <Tabs.Screen name="shop" options={{ href: null }} />
      <Tabs.Screen name="pot" options={{ href: null }} />
    </Tabs>
    </SelectedChildProvider>
  )
}
