import React, { memo } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, fontWeight, fontSize, radii, spacing, shadows } from '../../theme/tokens';

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
  textColor?: string;
  index?: number;
  style?: ViewStyle;
}

function MetricCard({ label, value, sub, tone = colors.card, textColor = colors.text, index = 0, style }: MetricCardProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify().damping(24).stiffness(220).mass(0.9)}
      style={[styles.card, { backgroundColor: tone }, shadows.md, style]}
    >
      <Text style={[styles.label, { color: textColor === colors.text ? colors.muted : 'rgba(255,255,255,0.75)' }]}>{label}</Text>
      <Text style={[styles.value, { color: textColor }]}>{value}</Text>
      {sub && <Text style={[styles.sub, { color: textColor === colors.text ? colors.subtle : 'rgba(255,255,255,0.6)' }]}>{sub}</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    padding: spacing.md,
    minHeight: 100,
    justifyContent: 'space-between',
    flex: 1,
  },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  value: { fontSize: fontSize.xl, fontWeight: fontWeight.black, marginTop: spacing.xs },
  sub: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, marginTop: 2 },
});

export default memo(MetricCard);
