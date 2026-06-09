import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/brand'
import { SelectedChildProvider } from '@/lib/SelectedChildContext'

function EmojiIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{emoji}</Text>
}

export default function TabsLayout() {
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
          tabBarActiveTintColor: colors.sky,
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={focused ? colors.sky : '#94a3b8'} />
          ),
        }}
      />
      <Tabs.Screen
        name="occasions"
        options={{
          title: 'Occasions',
          tabBarIcon: ({ color }) => <EmojiIcon emoji="🎁" color={color} />,
        }}
      />
      <Tabs.Screen
        name="offers"
        options={{
          title: 'Cashback',
          tabBarIcon: ({ color }) => <EmojiIcon emoji="💳" color={color} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Loyalty',
          tabBarIcon: ({ color }) => <EmojiIcon emoji="🎯" color={color} />,
        }}
      />
      <Tabs.Screen name="pot" options={{ href: null }} />
    </Tabs>
    </SelectedChildProvider>
  )
}
