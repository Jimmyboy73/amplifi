import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type TouchableOpacityProps,
} from 'react-native'
import { colors } from '@/constants/brand'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends TouchableOpacityProps {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: string
}

const containerVariant: Record<Variant, object> = {
  primary: { backgroundColor: colors.sky },
  secondary: { backgroundColor: colors.midnight },
  ghost: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.sky },
}

const textVariant: Record<Variant, object> = {
  primary: { color: colors.midnight },
  secondary: { color: '#ffffff' },
  ghost: { color: colors.sky },
}

const containerSize: Record<Size, object> = {
  sm: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  md: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  lg: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16 },
}

const textSize: Record<Size, object> = {
  sm: { fontSize: 14 },
  md: { fontSize: 16 },
  lg: { fontSize: 18 },
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={isDisabled}
      style={[
        styles.base,
        containerVariant[variant],
        containerSize[size],
        isDisabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.midnight : colors.sky}
          style={{ marginRight: 8 }}
        />
      )}
      <Text style={[styles.label, textVariant[variant], textSize[size]]}>
        {children}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.45,
  },
})
