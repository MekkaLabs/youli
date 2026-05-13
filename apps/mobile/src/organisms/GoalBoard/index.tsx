import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Goal } from '@youli/shared';
import { GoalProgress } from '../../molecules/GoalProgress';
import { colors, fontWeight, fontSize, spacing } from '../../theme/tokens';

interface GoalBoardProps { goals: Goal[]; }

export function GoalBoard({ goals }: GoalBoardProps) {
  const avgProgress = goals.length
    ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
    : 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Progresso médio</Text>
        <Text style={styles.avg}>{avgProgress}%</Text>
      </View>
      <View style={styles.list}>
        {goals.map((g, i) => (
          <GoalProgress key={g.id} goal={g} index={i} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.muted },
  avg: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.info },
  list: { gap: spacing.sm },
});
