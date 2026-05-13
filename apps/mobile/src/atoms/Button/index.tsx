import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, fontWeight, fontSize, radii, spacing } from '../../theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

const AnimPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label, onPress, variant = 'primary', size = 'md',
  loading, disabled, fullWidth, style, icon,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => { scale.value = withSpring(0.96, { damping: 15 }); };
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 15 }); };

  const isDisabled = disabled || loading;

  return (
    <AnimPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        animStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' || variant === 'secondary' ? colors.primary : colors.inverse} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, styles[`label_${variant}`], styles[`labelSize_${size}`]]}>
            {label}
          </Text>
        </>
      )}
    </AnimPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    borderRadius: radii.md,
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.45 },

  // Variants
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.primaryLight },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.danger },
  success: { backgroundColor: colors.success },

  // Sizes
  size_sm: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm - 2, gap: spacing.xs },
  size_md: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  size_lg: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg - 2 },

  // Labels
  label: { fontWeight: fontWeight.bold },
  label_primary: { color: colors.inverse },
  label_secondary: { color: colors.primary },
  label_ghost: { color: colors.text },
  label_danger: { color: colors.inverse },
  label_success: { color: colors.inverse },

  labelSize_sm: { fontSize: fontSize.sm },
  labelSize_md: { fontSize: fontSize.base },
  labelSize_lg: { fontSize: fontSize.md },
});
