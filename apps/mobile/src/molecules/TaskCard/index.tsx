import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { Task } from '@youli/shared';
import { Badge } from '../../atoms/Badge';
import { colors, fontWeight, fontSize, radii, spacing, shadows } from '../../theme/tokens';

const priorityVariant = (p: number) => p >= 5 ? 'red' : p >= 4 ? 'yellow' : 'gray';
const priorityLabel = (p: number) => p >= 5 ? 'Urgente' : p >= 4 ? 'Alta' : 'Normal';

interface TaskCardProps {
  task: Task;
  onPress?: (task: Task) => void;
  onComplete?: (task: Task) => void;
  index?: number;
}

const AnimPressable = Animated.createAnimatedComponent(Pressable);

export function TaskCard({ task, onPress, onComplete, index = 0 }: TaskCardProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <AnimPressable
        onPress={() => onPress?.(task)}
        onPressIn={() => { scale.value = withSpring(0.98, { damping: 15 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
        style={[styles.card, task.status === 'done' && styles.done, shadows.sm, animStyle]}
      >
        {/* Checkbox */}
        <Pressable onPress={() => onComplete?.(task)} style={[styles.check, task.status === 'done' && styles.checkDone]}>
          {task.status === 'done' && <Text style={styles.checkIcon}>✓</Text>}
        </Pressable>

        <View style={styles.body}>
          <Text style={[styles.title, task.status === 'done' && styles.titleDone]} numberOfLines={2}>
            {task.title}
          </Text>
          {task.nextStep && task.status !== 'done' && (
            <Text style={styles.next} numberOfLines={1}>→ {task.nextStep}</Text>
          )}
        </View>

        <Badge label={priorityLabel(task.priority)} variant={priorityVariant(task.priority) as any} />
      </AnimPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderRadius: radii.md,
    padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  done: { opacity: 0.55 },
  check: {
    width: 24, height: 24, borderRadius: radii.xs,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  checkDone: { backgroundColor: colors.success, borderColor: colors.success },
  checkIcon: { color: colors.inverse, fontSize: 12, fontWeight: fontWeight.black },
  body: { flex: 1 },
  title: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.text },
  titleDone: { textDecorationLine: 'line-through', color: colors.muted },
  next: { fontSize: fontSize.sm, color: colors.muted, marginTop: 3 },
});
