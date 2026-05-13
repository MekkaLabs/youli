import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Task, Habit, CalendarEvent } from '@youli/shared';
import { ProgressRing } from '../../src/atoms/ProgressRing';
import { Badge } from '../../src/atoms/Badge';
import { colors, fontWeight, fontSize, radii, spacing, shadows } from '../../src/theme/tokens';
import { api } from '../../src/services/api';

interface FocusData {
  dayFocus: string;
  progress: number;
  energy: string;
  topTasks: Task[];
  habits: Habit[];
  nextEvent: CalendarEvent | null;
  claudeInsight: string | null;
}

const energyEmoji = { low: '😴', medium: '🔋', high: '⚡' } as const;
const energyLabel = { low: 'Baixa', medium: 'Média', high: 'Alta' } as const;
type EnergyKey = keyof typeof energyEmoji;

export default function DailyFocus() {
  const [data, setData] = useState<FocusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite');

    async function load() {
      try {
        const [dashRes, habitsRes] = await Promise.all([
          api<any>('/api/dashboard'),
          api<Habit[]>('/api/habits'),
        ]);
        setData({
          dayFocus: dashRes.dashboard?.dayFocus ?? 'Definir foco principal do dia',
          progress: dashRes.dashboard?.progress ?? 0,
          energy: dashRes.dashboard?.energy ?? 'medium',
          topTasks: (dashRes.dashboard?.topTasks ?? []).slice(0, 3),
          habits: (habitsRes ?? []).slice(0, 4),
          nextEvent: dashRes.dashboard?.events?.[0] ?? null,
          claudeInsight: dashRes.dashboard?.insights?.[0]?.summary ?? null,
        });
      } catch { /* usa dados vazios */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Atlas Squad preparando seu dia...</Text>
      </View>
    );
  }

  const energy = (data?.energy ?? 'medium') as EnergyKey;

  return (
    <ScrollView
      style={[styles.root, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInUp.springify()} style={styles.header}>
        <Text style={styles.greeting}>{greeting}, Gustavo 👋</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
      </Animated.View>

      {/* Hero card — foco do dia */}
      <Animated.View entering={FadeInDown.delay(80).springify()} style={[styles.heroCard, shadows.lg]}>
        <View style={styles.heroTop}>
          <View style={styles.heroText}>
            <Text style={styles.heroLabel}>FOCO DO DIA</Text>
            <Text style={styles.heroFocus}>{data?.dayFocus}</Text>
          </View>
          <ProgressRing value={data?.progress ?? 0} size={76} color={colors.accentGreen} label="progresso" />
        </View>
        <View style={styles.energyRow}>
          <Text style={styles.energyIcon}>{energyEmoji[energy]}</Text>
          <Text style={styles.energyText}>Energia {energyLabel[energy]} hoje</Text>
          <Badge label="Atlas Squad" variant="primary" />
        </View>
      </Animated.View>

      {/* Top 3 tarefas */}
      {(data?.topTasks?.length ?? 0) > 0 && (
        <Animated.View entering={FadeInDown.delay(160).springify()} style={[styles.section, shadows.sm]}>
          <Text style={styles.sectionTitle}>🎯 Execute agora</Text>
          {data!.topTasks.map((task, i) => (
            <View key={task.id} style={styles.taskRow}>
              <View style={[styles.taskNum, i === 0 && styles.taskNumPrimary]}>
                <Text style={[styles.taskNumText, i === 0 && { color: colors.inverse }]}>{i + 1}</Text>
              </View>
              <Text style={styles.taskTitle} numberOfLines={2}>{task.title}</Text>
              {task.priority >= 5 && <Badge label="Urgente" variant="red" />}
            </View>
          ))}
        </Animated.View>
      )}

      {/* Hábitos do dia */}
      {(data?.habits?.length ?? 0) > 0 && (
        <Animated.View entering={FadeInDown.delay(240).springify()} style={[styles.section, shadows.sm]}>
          <Text style={styles.sectionTitle}>🔥 Ritual de hoje</Text>
          <View style={styles.habitsGrid}>
            {data!.habits.map(h => (
              <TouchableOpacity key={h.id} style={styles.habitChip} activeOpacity={0.7}>
                <Text style={styles.habitTitle} numberOfLines={1}>{h.title}</Text>
                <Text style={styles.habitStreak}>{h.streak}🔥</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Próximo evento */}
      {data?.nextEvent && (
        <Animated.View entering={FadeInDown.delay(320).springify()} style={[styles.eventCard, shadows.sm]}>
          <Text style={styles.eventIcon}>📅</Text>
          <View style={styles.eventBody}>
            <Text style={styles.eventTitle}>{data.nextEvent.title}</Text>
            <Text style={styles.eventTime}>
              {new Date(data.nextEvent.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <Badge label="Em breve" variant="yellow" />
        </Animated.View>
      )}

      {/* Insight do dia */}
      {data?.claudeInsight && (
        <Animated.View entering={FadeInDown.delay(400).springify()} style={[styles.insightCard, shadows.sm]}>
          <Text style={styles.insightIcon}>💡</Text>
          <Text style={styles.insightText}>{data.claudeInsight}</Text>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 120, gap: spacing.md },
  loading: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { color: colors.muted, fontSize: fontSize.base },

  header: { marginBottom: spacing.sm },
  greeting: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.text },
  date: { fontSize: fontSize.base, color: colors.muted, marginTop: 2, textTransform: 'capitalize' },

  heroCard: { backgroundColor: colors.primary, borderRadius: radii.xl, padding: spacing.xl, gap: spacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  heroText: { flex: 1 },
  heroLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.black, color: 'rgba(255,255,255,0.6)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: spacing.xs },
  heroFocus: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, color: colors.inverse, lineHeight: 26 },
  energyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  energyIcon: { fontSize: 20 },
  energyText: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)', fontWeight: fontWeight.semibold, flex: 1 },

  section: { backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold, color: colors.text, marginBottom: spacing.xs },

  taskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  taskNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  taskNumPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  taskNumText: { fontSize: fontSize.xs, fontWeight: fontWeight.black, color: colors.text },
  taskTitle: { flex: 1, fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },

  habitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  habitChip: { backgroundColor: colors.accentSoft, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  habitTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary, maxWidth: 140 },
  habitStreak: { fontSize: fontSize.sm },

  eventCard: { backgroundColor: '#FFFBEB', borderRadius: radii.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: '#FDE68A' },
  eventIcon: { fontSize: 22 },
  eventBody: { flex: 1 },
  eventTitle: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: '#78350F' },
  eventTime: { fontSize: fontSize.sm, color: '#92400E', marginTop: 2 },

  insightCard: { backgroundColor: colors.purpleBg, borderRadius: radii.md, padding: spacing.lg, flexDirection: 'row', gap: spacing.md, borderWidth: 1, borderColor: '#DDD6FE' },
  insightIcon: { fontSize: 22 },
  insightText: { flex: 1, fontSize: fontSize.base, color: colors.textSub, lineHeight: 22, fontWeight: fontWeight.medium },
});
