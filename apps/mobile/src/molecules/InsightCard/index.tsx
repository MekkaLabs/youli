import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { DailyInsight } from '@youli/shared';
import { Badge } from '../../atoms/Badge';
import { colors, fontWeight, fontSize, radii, spacing, shadows } from '../../theme/tokens';

interface InsightCardProps { insight: DailyInsight; index?: number; }

const energyVariant = { low: 'yellow', medium: 'blue', high: 'green' } as const;

export function InsightCard({ insight, index = 0 }: InsightCardProps) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify().damping(24).stiffness(220).mass(0.9)} style={[styles.card, shadows.sm]}>
      <View style={styles.header}>
        <Text style={styles.icon}>💡</Text>
        <Badge label={`Energia ${insight.energy}`} variant={energyVariant[insight.energy]} />
      </View>
      <Text style={styles.summary}>{insight.summary}</Text>
      {insight.actions.length > 0 && (
        <View style={styles.actions}>
          {insight.actions.slice(0, 2).map((a, i) => (
            <Text key={i} style={styles.action}>→ {a}</Text>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FAF5FF', borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: '#E9D5FF' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  icon: { fontSize: 18 },
  summary: { fontSize: fontSize.base, color: colors.text, fontWeight: fontWeight.medium, lineHeight: 22 },
  actions: { marginTop: spacing.sm, gap: 4 },
  action: { fontSize: fontSize.sm, color: colors.purple, fontWeight: fontWeight.semibold },
});
