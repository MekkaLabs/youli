import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fontSize, fontWeight, radii, spacing } from '../../theme/tokens';

export type BadgeVariant = 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'gray' | 'primary';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
  style?: ViewStyle;
}

const variantMap: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  green:   { bg: colors.successBg, text: '#15803d', dot: colors.success },
  yellow:  { bg: colors.warningBg, text: '#a16207', dot: colors.warning },
  red:     { bg: colors.dangerBg,  text: '#b91c1c', dot: colors.danger },
  blue:    { bg: colors.infoBg,    text: '#1d4ed8', dot: colors.info },
  purple:  { bg: colors.purpleBg,  text: '#7c3aed', dot: colors.purple },
  gray:    { bg: '#f3f4f6',        text: '#6b7280', dot: '#9ca3af' },
  primary: { bg: colors.accentSoft, text: colors.primary, dot: colors.primaryLight },
};

export function Badge({ label, variant = 'gray', dot = false, style }: BadgeProps) {
  const v = variantMap[variant];
  return (
    <View style={[styles.wrap, { backgroundColor: v.bg }, style]}>
      {dot && <View style={[styles.dot, { backgroundColor: v.dot }]} />}
      <Text style={[styles.text, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.sm + 2, paddingVertical: 3,
    borderRadius: radii.full, alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
});
