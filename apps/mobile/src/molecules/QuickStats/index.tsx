/**
 * Youli — QuickStats molecule
 * 3-4 métricas em linha. Design Squad: números grandes, rótulo pequeno.
 * Hormozi Squad: mostra progresso real, impacto visível.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAccessibility } from '../../accessibility/useAccessibility';

export interface StatItem {
  value: string | number;
  label: string;
  icon?: string;
  /** Color of the value number */
  color?: string;
  /** Accessible description for screen readers */
  accessibilityLabel?: string;
}

interface QuickStatsProps {
  stats: StatItem[];
  delay?: number;
}

export function QuickStats({ stats, delay = 0 }: QuickStatsProps) {
  const { fontMultiplier, highContrast } = useAccessibility();

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(350)}
      style={styles.row}
      accessibilityRole="summary"
    >
      {stats.map((stat, i) => (
        <View
          key={i}
          style={[styles.card, highContrast && styles.cardHC]}
          accessible
          accessibilityLabel={stat.accessibilityLabel ?? `${stat.label}: ${stat.value}`}
        >
          {stat.icon && (
            <Text style={styles.icon} accessibilityElementsHidden>{stat.icon}</Text>
          )}
          <Text style={[styles.value, { fontSize: 22 * fontMultiplier, color: stat.color ?? '#F9FAFB' }]}>
            {stat.value}
          </Text>
          <Text style={[styles.label, { fontSize: 10 * fontMultiplier }]}>{stat.label}</Text>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  card: {
    flex: 1, backgroundColor: '#111827', borderRadius: 14,
    padding: 12, alignItems: 'center', gap: 3,
    borderWidth: 1, borderColor: '#1F2937',
    minHeight: 80, justifyContent: 'center',
  },
  cardHC: { backgroundColor: '#000000', borderColor: '#FFFFFF' },
  icon: { fontSize: 18, marginBottom: 2 },
  value: { fontSize: 22, fontWeight: '900', color: '#F9FAFB' },
  label: { fontSize: 10, color: '#6B7280', fontWeight: '700', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.3 },
});
