/**
 * SimulationCard
 * Exibe uma previsão de área de vida da simulação de trajetória
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { tokens } from '../../theme/tokens';

interface Metric {
  name: string;
  current: string;
  projected: string;
  trend: 'up' | 'down' | 'stable';
}

interface SimulationCardProps {
  area: string;
  agentName: string;
  agentEmoji?: string;
  agentColor?: string;
  currentState: string;
  projectedState: string;
  keyMetrics: Metric[];
  risks: string[];
  opportunities: string[];
  confidence: number;
  index?: number;
}

const AREA_AGENTS: Record<string, { emoji: string; color: string }> = {
  tarefas: { emoji: '⚡', color: '#D97706' },
  habitos: { emoji: '🏛️', color: '#059669' },
  metas: { emoji: '⚔️', color: '#DC2626' },
  financeiro: { emoji: '💰', color: '#0891B2' },
  fitness: { emoji: '🏃', color: '#16A34A' },
  dashboard: { emoji: '🎨', color: '#7C3AED' },
  foco: { emoji: '⚡', color: '#6366F1' },
  insights: { emoji: '🦉', color: '#0EA5E9' },
};

const TREND_ICONS = { up: '↑', down: '↓', stable: '→' };
const TREND_COLORS = { up: '#22c55e', down: '#ef4444', stable: '#94a3b8' };

export function SimulationCard({
  area, agentName, currentState, projectedState,
  keyMetrics, risks, opportunities, confidence, index = 0,
}: SimulationCardProps) {
  const agent = AREA_AGENTS[area] || { emoji: '🤖', color: '#7C3AED' };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify().damping(24).stiffness(220).mass(0.9)}
      style={[styles.card, { borderLeftColor: agent.color, borderLeftWidth: 3 }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: agent.color + '20' }]}>
          <Text style={styles.emoji}>{agent.emoji}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.agentName, { color: agent.color }]}>{agentName}</Text>
          <Text style={styles.area}>{area}</Text>
        </View>
        <View style={[styles.confidenceBadge, { backgroundColor: agent.color + '15' }]}>
          <Text style={[styles.confidenceText, { color: agent.color }]}>
            {(confidence * 100).toFixed(0)}% conf.
          </Text>
        </View>
      </View>

      {/* Estados: atual → projetado */}
      <View style={styles.statesRow}>
        <View style={styles.stateBox}>
          <Text style={styles.stateLabel}>AGORA</Text>
          <Text style={styles.stateText}>{currentState}</Text>
        </View>
        <Text style={styles.arrow}>→</Text>
        <View style={[styles.stateBox, { backgroundColor: agent.color + '08' }]}>
          <Text style={[styles.stateLabel, { color: agent.color }]}>PROJETADO</Text>
          <Text style={[styles.stateText, { color: agent.color }]}>{projectedState}</Text>
        </View>
      </View>

      {/* Métricas */}
      {keyMetrics.length > 0 && (
        <View style={styles.metricsRow}>
          {keyMetrics.slice(0, 3).map((m, i) => (
            <View key={i} style={styles.metricItem}>
              <Text style={styles.metricName}>{m.name}</Text>
              <View style={styles.metricValues}>
                <Text style={styles.metricCurrent}>{m.current}</Text>
                <Text style={[styles.metricTrend, { color: TREND_COLORS[m.trend] }]}>
                  {TREND_ICONS[m.trend]}
                </Text>
                <Text style={[styles.metricProjected, { color: TREND_COLORS[m.trend] }]}>
                  {m.projected}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Oportunidades e Riscos */}
      <View style={styles.bottomRow}>
        {opportunities[0] && (
          <View style={styles.tag}>
            <Text style={styles.tagIcon}>✦</Text>
            <Text style={[styles.tagText, { color: '#22c55e' }]} numberOfLines={1}>
              {opportunities[0]}
            </Text>
          </View>
        )}
        {risks[0] && (
          <View style={styles.tag}>
            <Text style={styles.tagIcon}>⚠</Text>
            <Text style={[styles.tagText, { color: '#f59e0b' }]} numberOfLines={1}>
              {risks[0]}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 18 },
  headerInfo: { flex: 1 },
  agentName: { fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.bold },
  area: { fontSize: tokens.fontSize.xs, color: tokens.colors.textMuted, textTransform: 'capitalize' },
  confidenceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: tokens.radii.full },
  confidenceText: { fontSize: 10, fontWeight: tokens.fontWeight.semibold },
  statesRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs },
  stateBox: {
    flex: 1, backgroundColor: tokens.colors.surfaceDim || '#F8F9FA',
    borderRadius: tokens.radii.md, padding: tokens.spacing.sm,
  },
  stateLabel: { fontSize: 8, fontWeight: tokens.fontWeight.bold, color: tokens.colors.textMuted, letterSpacing: 0.8, marginBottom: 2 },
  stateText: { fontSize: tokens.fontSize.xs, color: tokens.colors.text, lineHeight: 16 },
  arrow: { fontSize: 16, color: tokens.colors.textMuted },
  metricsRow: { flexDirection: 'row', gap: tokens.spacing.sm },
  metricItem: { flex: 1, alignItems: 'center', gap: 2 },
  metricName: { fontSize: 9, color: tokens.colors.textMuted, textAlign: 'center' },
  metricValues: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metricCurrent: { fontSize: tokens.fontSize.xs, color: tokens.colors.textSecondary },
  metricTrend: { fontSize: 10, fontWeight: tokens.fontWeight.bold },
  metricProjected: { fontSize: tokens.fontSize.xs, fontWeight: tokens.fontWeight.semibold },
  bottomRow: { gap: 4 },
  tag: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  tagIcon: { fontSize: 10, color: tokens.colors.textMuted, marginTop: 2 },
  tagText: { fontSize: tokens.fontSize.xs, flex: 1, lineHeight: 16 },
});
