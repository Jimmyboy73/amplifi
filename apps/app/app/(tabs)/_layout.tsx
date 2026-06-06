import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { colors } from '@/constants/brand'

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{emoji}</Text>
}

export default function TabsLayout() {
  return (
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
          tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color }) => <TabIcon emoji="🛍️" color={color} />,
        }}
      />
      <Tabs.Screen
        name="offers"
        options={{
          title: 'Offers',
          tabBarIcon: ({ color }) => <TabIcon emoji="🏷️" color={color} />,
        }}
      />
      <Tabs.Screen
        name="pot"
        options={{
          title: 'Pot',
          tabBarIcon: ({ color }) => <TabIcon emoji="📈" color={color} />,
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: 'Family',
          tabBarIcon: ({ color }) => <TabIcon emoji="👨‍👩‍👧" color={color} />,
        }}
      />
    </Tabs>
  )
}
