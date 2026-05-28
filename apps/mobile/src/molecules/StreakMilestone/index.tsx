/**
 * StreakMilestone — banner de comemoração quando o usuário atinge um marco
 * Marcos: 3, 7, 14, 21, 30, 66, 100 dias
 * Exibe mensagem do Aristóteles + animação de entrada
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withTiming,
  withSequence,
  FadeInDown,
  FadeOutUp,
} from 'react-native-reanimated';

export const MILESTONES: Record<number, { emoji: string; title: string; message: string }> = {
  3: {
    emoji: '🌱',
    title: '3 dias! Primeiro passo.',
    message: '"Somos o que fazemos repetidamente. A excelência não é um ato, mas um hábito." — Aristóteles',
  },
  7: {
    emoji: '🔥',
    title: '1 semana seguida!',
    message: 'Uma semana de consistência vale mais que um mês de intenções. Continue assim.',
  },
  14: {
    emoji: '⚡',
    title: '2 semanas em chamas!',
    message: 'Sua mente já começa a associar este hábito com quem você é. Isso é identidade.',
  },
  21: {
    emoji: '🏛️',
    title: '21 dias — hábito formado!',
    message: 'A ciência diz: 21 dias para criar um padrão. Aristóteles diria: você está mudando seu caráter.',
  },
  30: {
    emoji: '🥇',
    title: 'Um mês completo!',
    message: '30 dias de excelência. Sua versão do mês passado ficaria orgulhosa de você.',
  },
  66: {
    emoji: '💎',
    title: '66 dias — automático!',
    message: 'Pesquisas mostram que 66 dias é quando um hábito se torna automático. Você chegou lá.',
  },
  100: {
    emoji: '🌟',
    title: '100 dias! Lendário.',
    message: 'Centenas de escolhas conscientes criaram esta corrente. Não a quebre.',
  },
};

export function getMilestone(streak: number) {
  const milestoneDay = [100, 66, 30, 21, 14, 7, 3].find((m) => streak === m);
  return milestoneDay ? MILESTONES[milestoneDay] : null;
}

interface StreakMilestoneProps {
  streak: number;
  habitTitle: string;
  color?: string;
  onDismiss: () => void;
}

export function StreakMilestone({
  streak,
  habitTitle,
  color = '#059669',
  onDismiss,
}: StreakMilestoneProps) {
  const milestone = getMilestone(streak);
  const scale = useSharedValue(0.85);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 180 }));
    shimmer.value = withSequence(
      withTiming(1, { duration: 600 }),
      withTiming(0, { duration: 600 }),
      withTiming(1, { duration: 600 }),
      withTiming(0, { duration: 600 }),
    );

    // Auto-dismiss após 5s
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!milestone) return null;

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(24).stiffness(220).mass(0.9)}
      exiting={FadeOutUp.duration(300)}
      style={styles.overlay}
    >
      <Animated.View style={[styles.card, { borderColor: color }, cardStyle]}>
        {/* Emoji grande */}
        <Text style={styles.bigEmoji}>{milestone.emoji}</Text>

        {/* Streak counter */}
        <View style={[styles.streakBadge, { backgroundColor: color }]}>
          <Text style={styles.streakNum}>{streak}</Text>
          <Text style={styles.streakLabel}>dias</Text>
        </View>

        {/* Título */}
        <Text style={styles.title}>{milestone.title}</Text>
        <Text style={styles.habitName}>&ldquo;{habitTitle}&rdquo;</Text>

        {/* Mensagem do Aristóteles */}
        <View style={styles.quoteBox}>
          <Text style={styles.agentTag}>🏛️ Aristóteles</Text>
          <Text style={styles.quote}>{milestone.message}</Text>
        </View>

        {/* Botão dismiss */}
        <TouchableOpacity style={[styles.btn, { backgroundColor: color }]} onPress={onDismiss}>
          <Text style={styles.btnText}>Continuar 🔥</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    padding: 24,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 20,
    borderWidth: 2,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    gap: 14,
  },
  bigEmoji: {
    fontSize: 56,
    lineHeight: 68,
  },
  streakBadge: {
    borderRadius: 50,
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignItems: 'center',
  },
  streakNum: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    lineHeight: 36,
  },
  streakLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F9FAFB',
    textAlign: 'center',
  },
  habitName: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  quoteBox: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    gap: 6,
  },
  agentTag: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  quote: {
    fontSize: 13,
    color: '#D1D5DB',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  btnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
