import { useEffect, useRef } from 'react'
import { Animated, Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors } from '@/constants/brand'

export type CelebrationModalProps = {
  visible: boolean
  emoji: string
  title: string
  subtitle: string
  primaryButton: { label: string; onPress: () => void }
  secondaryButton?: { label: string; onPress: () => void }
  onDismiss: () => void
}

export default function CelebrationModal({
  visible,
  emoji,
  title,
  subtitle,
  primaryButton,
  secondaryButton,
  onDismiss,
}: CelebrationModalProps) {
  const scale = useRef(new Animated.Value(0.8)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 7,
          tension: 120,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      scale.setValue(0.8)
      opacity.setValue(0)
    }
  }, [visible])

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { transform: [{ scale }], opacity }]}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <TouchableOpacity
            style={styles.primary}
            onPress={primaryButton.onPress}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryText}>{primaryButton.label}</Text>
          </TouchableOpacity>

          {secondaryButton && (
            <TouchableOpacity
              style={styles.secondary}
              onPress={secondaryButton.onPress}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryText}>{secondaryButton.label}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16,22,40,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  emoji: {
    fontSize: 52,
    marginBottom: 16,
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.midnight,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
    lineHeight: 27,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  primary: {
    width: '100%',
    backgroundColor: colors.sky,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 4,
  },
  primaryText: {
    color: colors.midnight,
    fontSize: 16,
    fontWeight: '700',
  },
  secondary: {
    width: '100%',
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryText: {
    color: colors.azure,
    fontSize: 14,
    fontWeight: '600',
  },
})
