import { View, Text } from 'react-native'

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6F9' }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#101628' }}>Home</Text>
      <Text style={{ fontSize: 14, color: '#94a3b8', marginTop: 8 }}>Coming soon</Text>
    </View>
  )
}
