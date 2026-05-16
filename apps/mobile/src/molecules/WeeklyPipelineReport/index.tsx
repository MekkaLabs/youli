import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface PipelinePhase {
  phase: string;
  status: 'ok' | 'error' | 'skipped';
  durationMs: number;
}

export interface WeeklyPipelineReportProps {
  weekOf: string;
  lifeHealthScore: number;
  ancScore: number;
  topGaps: string[];
  weeklyPlan: string[];
  phases: PipelinePhase[];
  completedAt: string;
}

function getScoreColor(score: number): string {
  if (score >= 70) return '#00b894';
  if (score >= 40) return '#fdcb6e';
  return '#e17055';
}

function getPhaseEmoji(status: PipelinePhase['status']): string {
  if (status === 'ok') return '✅';
  if (status === 'error') return '❌';
  return '⏭️';
}

function getPhaseShortName(phase: string): string {
  const names: Record<string, string> = {
    parallel_eval: 'Avaliação',
    gap_analysis: 'Gaps',
    evolution_tracking: 'Evolução',
    anc_calculation: 'ANC',
    requirements_generation: 'Requisitos',
  };
  return names[phase] ?? phase;
}

function getTotalSeconds(completedAt: string, phases: PipelinePhase[]): number {
  const total = phases.reduce((sum, p) => sum + p.durationMs, 0);
  return Math.round(total / 1000);
}

function formatWeekOf(weekOf: string): string {
  try {
    const d = new Date(weekOf);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return weekOf.slice(0, 10);
  }
}

export function WeeklyPipelineReport({
  weekOf,
  lifeHealthScore,
  ancScore,
  topGaps,
  weeklyPlan,
  phases,
  completedAt,
}: WeeklyPipelineReportProps) {
  const scoreColor = getScoreColor(lifeHealthScore);
  const totalSeconds = getTotalSeconds(completedAt, phases);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🔄 CI Semanal</Text>
        <Text style={styles.subtitle}>Semana de {formatWeekOf(weekOf)}</Text>
        <Text style={styles.duration}>Concluído em {totalSeconds} segundos</Text>
      </View>

      {/* Scores */}
      <View style={styles.scoresRow}>
        <View style={styles.scoreBlock}>
          <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreValue, { color: scoreColor }]}>{lifeHealthScore}</Text>
          </View>
          <Text style={styles.scoreLabel}>Life Health</Text>
        </View>
        <View style={styles.scoreBlock}>
          <View style={[styles.scoreCircle, { borderColor: getScoreColor(ancScore) }]}>
            <Text style={[styles.scoreValue, { color: getScoreColor(ancScore) }]}>{ancScore}</Text>
          </View>
          <Text style={styles.scoreLabel}>ANC Score</Text>
        </View>
      </View>

      {/* Phases horizontal scroll */}
      <Text style={styles.sectionTitle}>Fases do Pipeline</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.phasesScroll}>
        {phases.map((phase) => (
          <View key={phase.phase} style={styles.phaseChip}>
            <Text style={styles.phaseEmoji}>{getPhaseEmoji(phase.status)}</Text>
            <Text style={styles.phaseName}>{getPhaseShortName(phase.phase)}</Text>
            <Text style={styles.phaseDuration}>{phase.durationMs}ms</Text>
          </View>
        ))}
      </ScrollView>

      {/* Critical Gaps */}
      {topGaps.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔴 Gaps Críticos</Text>
          {topGaps.map((gap, i) => (
            <Text key={i} style={styles.gapItem}>
              • {gap}
            </Text>
          ))}
        </View>
      )}

      {/* Weekly Plan */}
      {weeklyPlan.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Plano da Semana</Text>
          {weeklyPlan.map((item, i) => (
            <Text key={i} style={styles.planItem}>
              • {item}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    marginVertical: 8,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3436',
  },
  subtitle: {
    fontSize: 14,
    color: '#636e72',
    marginTop: 2,
  },
  duration: {
    fontSize: 12,
    color: '#b2bec3',
    marginTop: 2,
  },
  scoresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  scoreBlock: {
    alignItems: 'center',
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#636e72',
    marginTop: 6,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2d3436',
    marginBottom: 8,
  },
  phasesScroll: {
    marginBottom: 16,
  },
  phaseChip: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  phaseEmoji: {
    fontSize: 16,
  },
  phaseName: {
    fontSize: 11,
    color: '#2d3436',
    fontWeight: '600',
    marginTop: 2,
  },
  phaseDuration: {
    fontSize: 10,
    color: '#b2bec3',
    marginTop: 1,
  },
  section: {
    marginBottom: 12,
  },
  gapItem: {
    fontSize: 13,
    color: '#e17055',
    marginBottom: 4,
    lineHeight: 18,
  },
  planItem: {
    fontSize: 13,
    color: '#2d3436',
    marginBottom: 4,
    lineHeight: 18,
  },
});
