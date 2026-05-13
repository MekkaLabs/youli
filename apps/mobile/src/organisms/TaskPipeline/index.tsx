import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { Task } from '@youli/shared';
import { TaskCard } from '../../molecules/TaskCard';
import { colors, fontWeight, fontSize, radii, spacing } from '../../theme/tokens';

type Filter = 'all' | 'todo' | 'doing' | 'done';

interface TaskPipelineProps {
  tasks: Task[];
  onTaskPress?: (task: Task) => void;
  onTaskComplete?: (task: Task) => void;
}

export function TaskPipeline({ tasks, onTaskPress, onTaskComplete }: TaskPipelineProps) {
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  const counts = {
    all: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    doing: tasks.filter(t => t.status === 'doing').length,
    done: tasks.filter(t => t.status === 'done').length,
  };

  const tabs: { key: Filter; label: string; color: string }[] = [
    { key: 'all',   label: `Todas (${counts.all})`,    color: colors.primary },
    { key: 'todo',  label: `Planejado (${counts.todo})`, color: colors.muted },
    { key: 'doing', label: `Executando (${counts.doing})`, color: colors.warning },
    { key: 'done',  label: `Concluído (${counts.done})`, color: colors.success },
  ];

  return (
    <View style={styles.wrap}>
      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filters}>
        {tabs.map(tab => (
          <TouchableOpacity key={tab.key} onPress={() => setFilter(tab.key)}
            style={[styles.filterTab, filter === tab.key && { backgroundColor: tab.color }]}
          >
            <Text style={[styles.filterLabel, filter === tab.key && styles.filterLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tasks */}
      <View style={styles.list}>
        {filtered.length === 0 ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.empty}>
            <Text style={styles.emptyText}>Nenhuma tarefa aqui 🎯</Text>
          </Animated.View>
        ) : (
          filtered.map((task, i) => (
            <TaskCard key={task.id} task={task} index={i}
              onPress={onTaskPress} onComplete={onTaskComplete} />
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  filtersScroll: { marginHorizontal: -spacing.lg },
  filters: { paddingHorizontal: spacing.lg, gap: spacing.sm, flexDirection: 'row' },
  filterTab: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: radii.full, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
  },
  filterLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.muted },
  filterLabelActive: { color: colors.inverse },
  list: { gap: spacing.sm },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { fontSize: fontSize.md, color: colors.muted, fontWeight: fontWeight.medium },
});
