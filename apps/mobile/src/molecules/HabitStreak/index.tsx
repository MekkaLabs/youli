import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { Habit } from '@youli/shared';
import { colors, fontWeight, fontSize, radii, spacing, shadows } from '../../theme/tokens';

interface HabitStreakProps { habit: Habit; onPress?: () => void; index?: number; }

export function HabitStreak({ habit, onPress, index = 0 }: HabitStreakProps) {
  const isStrong = habit.streak >= 3;
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <Pressable onPress={onPress} style={[styles.card, shadows.sm]}>
        <View style={styles.row}>
          <View style={styles.textBlock}>
            <Text style={styles.title} numberOfLines={2}>{habit.title}</Text>
            <Text style={styles.freq}>{habit.frequency === 'daily' ? 'Diário' : 'Semanal'}</Text>
          </View>
          <View style={[styles.streakBadge, isStrong ? styles.streakStrong : styles.streakWeak]}>
            <Text style={styles.streakNum}>{habit.streak}</Text>
            <Text style={styles.streakLabel}>dias</Text>
          </View>
        </View>
        {/* Fire bar */}
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${Math.min(100, habit.streak * 10)}%` as any, backgroundColor: isStrong ? colors.success : colors.warning }]} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.borderLight },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  textBlock: { flex: 1 },
  title: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.text },
  freq: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  streakBadge: { borderRadius: radii.sm, padding: spacing.sm, alignItems: 'center', minWidth: 50 },
  streakStrong: { backgroundColor: colors.successBg },
  streakWeak: { backgroundColor: colors.warningBg },
  streakNum: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.text },
  streakLabel: { fontSize: fontSize.xs, color: colors.muted, fontWeight: fontWeight.semibold },
  barBg: { height: 4, backgroundColor: colors.borderLight, borderRadius: radii.full, marginTop: spacing.sm, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radii.full },
});
