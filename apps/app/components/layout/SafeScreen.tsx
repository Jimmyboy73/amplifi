import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { ReactNode } from 'react'
import { colors } from '@/constants/brand'

interface SafeScreenProps {
  children: ReactNode
  backgroundColor?: string
}

export function SafeScreen({ children, backgroundColor = colors.offwhite }: SafeScreenProps) {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {children}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
