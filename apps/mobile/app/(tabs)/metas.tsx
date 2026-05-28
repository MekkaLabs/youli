import { useI18n } from '../../src/hooks/useI18n';
import { logWarn } from '../../src/services/logger';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, SafeAreaView } from 'react-native';
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
  phases: { phase: string; status: 'ok' | 'error' | 'skipped'; durationMs: number }[];
}

export default function MetasScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [agentResp, setAgentResp] = useState<AgentResponseData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [pipeline, setPipeline] = useState<PipelineData | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('100');
  const goals = useGoals();
  const addGoal = (goals as any).addGoal;
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
    } catch (e) {
      logWarn('metas:analyze', e);
    } finally { setAnalyzing(false); }
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
          onCta={() => setShowAddModal(true)}
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

      {/* Modal: adicionar meta rápida */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <SafeAreaView style={addStyles.safe}>
          <View style={addStyles.header}>
            <Text style={addStyles.title}>⚔️ Nova Meta</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}><Text style={addStyles.cancel}>Cancelar</Text></TouchableOpacity>
          </View>
          <View style={addStyles.body}>
            <Text style={addStyles.label}>Nome da meta</Text>
            <TextInput
              style={addStyles.input}
              value={newGoalTitle}
              onChangeText={setNewGoalTitle}
              placeholder="Ex: Ler 12 livros este ano"
              placeholderTextColor="#4B5563"
              autoFocus
              maxLength={60}
            />
            <Text style={addStyles.label}>Valor alvo</Text>
            <TextInput
              style={addStyles.input}
              value={newGoalTarget}
              onChangeText={setNewGoalTarget}
              placeholder="100"
              placeholderTextColor="#4B5563"
              keyboardType="numeric"
              maxLength={10}
            />
            <TouchableOpacity
              style={[addStyles.saveBtn, !newGoalTitle.trim() && { opacity: 0.5 }]}
              disabled={!newGoalTitle.trim()}
              onPress={() => {
                if (newGoalTitle.trim() && addGoal) {
                  addGoal({
                    title: newGoalTitle.trim(),
                    emoji: '🎯',
                    color: '#DC2626',
                    category: 'pessoal',
                    currentValue: 0,
                    targetValue: parseFloat(newGoalTarget) || 100,
                    unit: '%',
                    progress: 0,
                    startDate: new Date().toISOString().split('T')[0],
                  });
                }
                setNewGoalTitle('');
                setNewGoalTarget('100');
                setShowAddModal(false);
              }}>
              <Text style={addStyles.saveBtnText}>Criar Meta</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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

const addStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#030712' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#111827' },
  title: { fontSize: 18, fontWeight: '900', color: '#F9FAFB' },
  cancel: { fontSize: 15, color: '#DC2626', fontWeight: '700' },
  body: { padding: 20, gap: 14 },
  label: { fontSize: 12, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#111827', borderRadius: 12, borderWidth: 1, borderColor: '#1F2937', padding: 14, color: '#F9FAFB', fontSize: 16 },
  saveBtn: { backgroundColor: '#DC2626', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
