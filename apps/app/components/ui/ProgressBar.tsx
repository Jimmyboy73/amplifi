import { View, StyleSheet } from 'react-native'
import { colors } from '@/constants/brand'

interface ProgressBarProps {
  progress: number
  color?: string
  backgroundColor?: string
  height?: number
  borderRadius?: number
}

export function ProgressBar({
  progress,
  color = colors.sky,
  backgroundColor = '#e2e8f0',
  height = 6,
  borderRadius,
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(progress, 0), 1)
  const radius = borderRadius ?? height

  return (
    <View style={[styles.track, { backgroundColor, height, borderRadius: radius }]}>
      <View
        style={[
          styles.fill,
          {
            backgroundColor: color,
            width: `${clamped * 100}%`,
            height,
            borderRadius: radius,
          },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    overflow: 'hidden',
    width: '100%',
  },
  fill: {},
})
