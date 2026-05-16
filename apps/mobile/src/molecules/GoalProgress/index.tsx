import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { Goal } from '@youli/shared';
import { colors, fontWeight, fontSize, radii, spacing, shadows } from '../../theme/tokens';

interface GoalProgressProps { goal: Goal; index?: number; }

export function GoalProgress({ goal, index = 0 }: GoalProgressProps) {
  const pct = Math.min(100, Math.max(0, goal.progress));
  const isNear = pct >= 80;
  const barColor = isNear ? colors.success : pct >= 40 ? colors.info : colors.warning;

  return (
    <Animated.View entering={FadeInDown.delay(index * 70).springify().damping(24).stiffness(220).mass(0.9)} style={[styles.card, shadows.sm]}>
      <View style={styles.row}>
        <Text style={styles.title} numberOfLines={2}>{goal.title}</Text>
        <Text style={[styles.pct, { color: barColor }]}>{pct}%</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#EFF6FF', borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: '#BFDBFE' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  title: { flex: 1, fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.text, paddingRight: spacing.sm },
  pct: { fontSize: fontSize.base, fontWeight: fontWeight.black },
  barBg: { height: 6, backgroundColor: '#DBEAFE', borderRadius: radii.full, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radii.full },
});
