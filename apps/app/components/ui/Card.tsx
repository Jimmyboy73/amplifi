import { View, StyleSheet, type ViewProps } from 'react-native'
import type { ReactNode } from 'react'

interface CardProps extends ViewProps {
  children: ReactNode
  padding?: number
}

export function Card({ children, padding = 20, style, ...props }: CardProps) {
  return (
    <View style={[styles.card, { padding }, style]} {...props}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
})
