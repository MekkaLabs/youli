import { useI18n } from '../../src/hooks/useI18n';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { EmptyState } from '../../src/molecules/EmptyState';
import { QuickStats } from '../../src/molecules/QuickStats';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullScrollLayout } from '../../src/templates/FullScrollLayout';
import { GoalBoard } from '../../src/organisms/GoalBoard';
import { AgentBadge } from '../../src/atoms/AgentBadge';
import { AgentResponseCard, type AgentResponseData } from '../../src/organisms/AgentResponseCard';
import { EvolutionChart, type EvolutionPoint } from '../../src/molecules/EvolutionChart';
import { WeeklyPipelineReport } from '../../src/molecules/WeeklyPipelineReport';
import { useGoals } from '../../src/hooks/useGoals';

const ALEXANDRE = { name: 'Alexandre', fullName: 'Alexandre, o Grande', emoji: '⚔️', color: '#DC2626', domain: 'Metas Audaciosas' };
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3002';

interface PipelineData {
  weekOf: string;
  completedAt: string;
  lifeHealthScore: number;
  ancScore: number;
  topGaps: string[];
  weeklyPlan: string[];
  summary: string;
  phases: Array<{ phase: string; status: 'ok' | 'error' | 'skipped'; durationMs: number }>;
}

export default function MetasScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [agentResp, setAgentResp] = useState<AgentResponseData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [pipeline, setPipeline] = useState<PipelineData | null>(null);
  const goals = useGoals();
  const goalsArr = (goals as any).goals ?? [];
  const active = goalsArr.filter((g: any) => g.status === 'active');
  const avgProgress = active.length
    ? Math.round(active.reduce((s: number, g: any) => s + (g.progress ?? 0), 0) / active.length)
    : 0;

  // Pontos de evolução baseados no progresso das metas
  const evolutionPoints: EvolutionPoint[] = active.slice(0, 10).map((g: any, i: number) => ({
    timestamp: new Date(Date.now() - (active.length - 1 - i) * 7 * 86400000).toISOString(),
    value: g.progress ?? 0,
    delta: i > 0 ? (g.progress ?? 0) - (active[i - 1]?.progress ?? 0) : 0,
  }));

  const trendLabel: 'strong_up' | 'up' | 'flat' | 'down' | 'strong_down' =
    avgProgress >= 70 ? 'strong_up' : avgProgress >= 50 ? 'up' : avgProgress >= 30 ? 'flat' : avgProgress >= 15 ? 'down' : 'strong_down';

  useEffect(() => {
    fetch(`${API_BASE}/api/copilot/weekly-pipeline?userId=default`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d && Array.isArray(d) && d.length > 0) {
          setPipeline(d[d.length - 1]);
        } else if (d && d.lifeHealthScore !== undefined) {
          setPipeline(d);
        }
      })
      .catch(() => {});
  }, []);

  async function analyzeMetas() {
    setAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/api/agents`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'Analise meu portfólio de metas e planeje o próximo sprint', area: 'metas' }),
      });
      if (res.ok) {
        const data = await res.json();
        const ag = data.primaryAgent ?? data;
        setAgentResp({
          agentName: ag.agentName ?? ALEXANDRE.name,
          agentEmoji: ag.agentEmoji ?? ALEXANDRE.emoji,
          agentColor: ag.agentColor ?? ALEXANDRE.color,
          message: ag.message ?? '',
          insights: ag.insights ?? [],
          actions: ag.actions ?? [],
          urgency: ag.urgency,
        });
      }
    } catch {}
    finally { setAnalyzing(false); }
  }

  return (
    <FullScrollLayout
      title={t("goals.title")}
      subtitle={t("goals.subtitle")}
      paddingBottom={insets.bottom + 90}
      rightAction={<AgentBadge {...ALEXANDRE} compact onPress={analyzeMetas} />}
    >
      {/* Empty state when no goals */}
      {goalsArr.length === 0 && (
        <EmptyState
          emoji="⚔️"
          title={t('goals.noGoals')}
          body={t('goals.noGoalsHint')}
          ctaLabel={t('goals.newGoal')}
          onCta={() => {}}
        />
      )}

      {/* QuickStats overview */}
      {active.length > 0 && (
        <QuickStats
          delay={0}
          stats={[
            { value: active.length, label: t('goals.active'), icon: '🎯', color: '#DC2626' },
            { value: `${avgProgress}%`, label: t('goals.progress'), icon: '📈', color: avgProgress >= 50 ? '#4ADE80' : '#FBBF24' },
            { value: goalsArr.filter((g: any) => g.status === 'completed').length, label: t('goals.completed'), icon: '🏆', color: '#A78BFA' },
            { value: goalsArr.filter((g: any) => g.status === 'paused').length, label: t('goals.paused'), icon: '⏸️', color: '#6B7280' },
          ]}
        />
      )}

      {/* Overview de progresso */}
      {active.length > 0 && (
        <Animated.View entering={FadeInDown.delay(0)} style={styles.overviewCard}>
          <View style={styles.overviewRow}>
            <View>
              <Text style={styles.overviewLabel}>Metas ativas</Text>
              <Text style={styles.overviewValue}>{active.length}</Text>
            </View>
            <View>
              <Text style={styles.overviewLabel}>Progresso médio</Text>
              <Text style={[styles.overviewValue, { color: avgProgress >= 50 ? '#DC2626' : '#D97706' }]}>{avgProgress}%</Text>
            </View>
            <View>
              <Text style={styles.overviewLabel}>Concluídas</Text>
              <Text style={styles.overviewValue}>{goalsArr.filter((g: any) => g.status === 'completed').length}</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: `${avgProgress}%` }]} />
          </View>
        </Animated.View>
      )}

      {/* SWE-CI: Evolution Chart de progresso */}
      {active.length > 0 && (
        <Animated.View entering={FadeInDown.delay(30)}>
          <EvolutionChart
            area="Metas"
            metric="Progresso médio (%)"
            points={evolutionPoints}
            trendLabel={trendLabel}
            patternInsight={
              avgProgress >= 70
                ? 'Excelente ritmo de conquista — você está vencendo! 🏆'
                : avgProgress >= 40
                ? 'Progresso constante — manter foco nas metas críticas'
                : 'Progresso lento detectado — revisar prioridades e plano de ação'
            }
          />
        </Animated.View>
      )}

      {/* SWE-CI: Weekly Pipeline Report */}
      {pipeline && (
        <Animated.View entering={FadeInDown.delay(60)}>
          <WeeklyPipelineReport
            weekOf={pipeline.weekOf}
            completedAt={pipeline.completedAt}
            lifeHealthScore={pipeline.lifeHealthScore}
            ancScore={pipeline.ancScore}
            topGaps={pipeline.topGaps}
            weeklyPlan={pipeline.weeklyPlan}
            phases={pipeline.phases}
          />
        </Animated.View>
      )}

      {/* Botão analisar */}
      <Animated.View entering={FadeInDown.delay(90)}>
        <TouchableOpacity style={styles.analyzeBtn} onPress={analyzeMetas} disabled={analyzing} activeOpacity={0.8}>
          {analyzing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.analyzeBtnText}>⚔️ Alexandre planejar próximo marco</Text>}
        </TouchableOpacity>
      </Animated.View>

      {/* Resposta do agente */}
      {(agentResp || analyzing) && (
        <AgentResponseCard response={agentResp} loading={analyzing} />
      )}

      <GoalBoard />
    </FullScrollLayout>
  );
}

const styles = StyleSheet.create({
  overviewCard: {
    backgroundColor: '#111827', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#1F2937', gap: 12,
  },
  overviewRow: { flexDirection: 'row', justifyContent: 'space-around' },
  overviewLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', textAlign: 'center' },
  overviewValue: { fontSize: 24, fontWeight: '900', color: '#F9FAFB', textAlign: 'center' },
  progressTrack: { height: 6, backgroundColor: '#1F2937', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#DC2626', borderRadius: 3 },
  analyzeBtn: {
    backgroundColor: '#DC2626', borderRadius: 12, padding: 14,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  analyzeBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
