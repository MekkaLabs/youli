import { useI18n } from '../../src/hooks/useI18n';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullScrollLayout } from '../../src/templates/FullScrollLayout';
import { TaskBoard } from '../../src/organisms/TaskBoard';
import { AgentBadge } from '../../src/atoms/AgentBadge';
import { AgentResponseCard, type AgentResponseData } from '../../src/organisms/AgentResponseCard';
import { MaintainabilityBadge } from '../../src/molecules/MaintainabilityBadge';

const FRANKLIN = { name: 'Franklin', fullName: 'Benjamin Franklin', emoji: '⚡', color: '#D97706', domain: 'Produtividade' };
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3002';

type TaskFilter = 'hoje' | 'semana' | 'backlog';

interface LifeHealthData {
  lifeHealthScore: number;
  ancScore: number;
  maintainabilityScore: number;
  maintainabilityVerdict: 'sustainable' | 'moderate_risk' | 'high_risk';
  maintainabilityWarnings: string[];
  topGaps: Array<{ area: string; requirement: string }>;
}

export default function TarefasScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [agentResp, setAgentResp] = useState<AgentResponseData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [filter, setFilter] = useState<TaskFilter>('hoje');
  const [healthData, setHealthData] = useState<LifeHealthData | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/copilot/life-health?userId=default`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setHealthData(d))
      .catch(() => {});
  }, []);

  async function analyzeTarefas() {
    setAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/api/agents`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'Qual é a tarefa mais importante que devo executar agora? Priorize meu backlog.', area: 'tarefas' }),
      });
      if (res.ok) {
        const data = await res.json();
        const ag = data.primaryAgent ?? data;
        setAgentResp({
          agentName: ag.agentName ?? FRANKLIN.name,
          agentEmoji: ag.agentEmoji ?? FRANKLIN.emoji,
          agentColor: ag.agentColor ?? FRANKLIN.color,
          message: ag.message ?? '',
          insights: ag.insights ?? [],
          actions: ag.actions ?? [],
          urgency: ag.urgency,
        });
      }
    } catch {}
    finally { setAnalyzing(false); }
  }

  const filterLabels: Record<TaskFilter, string> = {
    hoje: '🎯 Hoje',
    semana: '📅 Semana',
    backlog: '📋 Backlog',
  };

  const tarefasGap = healthData?.topGaps.find((g) => g.area === 'tarefas');

  return (
    <FullScrollLayout
      title={t("tasks.title")}
      subtitle={t("tasks.subtitle")}
      paddingBottom={insets.bottom + 90}
      rightAction={<AgentBadge {...FRANKLIN} compact onPress={analyzeTarefas} />}
    >
      {/* SWE-CI: Painel de saúde de produtividade */}
      {healthData && (
        <Animated.View entering={FadeInDown.delay(0)} style={styles.healthPanel}>
          {/* ANC Score */}
          <View style={styles.scoreRow}>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>Life Health</Text>
              <Text style={[
                styles.scoreValue,
                { color: healthData.lifeHealthScore >= 70 ? '#00b894' : healthData.lifeHealthScore >= 40 ? '#fdcb6e' : '#e17055' }
              ]}>
                {healthData.lifeHealthScore}
              </Text>
              <Text style={styles.scoreUnit}>/100</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>ANC Score</Text>
              <Text style={[
                styles.scoreValue,
                { color: healthData.ancScore >= 60 ? '#00b894' : healthData.ancScore >= 35 ? '#fdcb6e' : '#e17055' }
              ]}>
                {healthData.ancScore}
              </Text>
              <Text style={styles.scoreUnit}>/100</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.maintBox}>
              <Text style={styles.scoreLabel}>Sustentabilidade</Text>
              <MaintainabilityBadge
                score={healthData.maintainabilityScore}
                verdict={healthData.maintainabilityVerdict}
                warnings={[]}
                compact
              />
            </View>
          </View>

          {/* Gap de tarefas se existir */}
          {tarefasGap && (
            <View style={styles.gapRow}>
              <Text style={styles.gapIcon}>🎯</Text>
              <Text style={styles.gapText}>{tarefasGap.requirement}</Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* Filtros */}
      <Animated.View entering={FadeInDown.delay(30)} style={styles.filterRow}>
        {(Object.keys(filterLabels) as TaskFilter[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {filterLabels[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Botão Franklin MIT */}
      <Animated.View entering={FadeInDown.delay(60)}>
        <TouchableOpacity style={styles.analyzeBtn} onPress={analyzeTarefas} disabled={analyzing} activeOpacity={0.8}>
          {analyzing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.analyzeBtnText}>⚡ Franklin: qual é minha MIT agora?</Text>}
        </TouchableOpacity>
      </Animated.View>

      {/* Resposta do agente */}
      {(agentResp || analyzing) && (
        <AgentResponseCard response={agentResp} loading={analyzing} compact />
      )}

      <TaskBoard filter={filter} />
    </FullScrollLayout>
  );
}

const styles = StyleSheet.create({
  healthPanel: {
    backgroundColor: '#111827', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#1F2937', gap: 10,
  },
  scoreRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
  },
  scoreBox: { alignItems: 'center', gap: 2 },
  maintBox: { alignItems: 'center', gap: 6 },
  scoreLabel: { fontSize: 10, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase' },
  scoreValue: { fontSize: 28, fontWeight: '900', lineHeight: 32 },
  scoreUnit: { fontSize: 10, color: '#4B5563' },
  scoreDivider: { width: 1, height: 40, backgroundColor: '#1F2937' },
  gapRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#1A1209', borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: '#78350F',
  },
  gapIcon: { fontSize: 14, lineHeight: 20 },
  gapText: { flex: 1, fontSize: 12, color: '#FCD34D', lineHeight: 18 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    backgroundColor: '#111827', borderWidth: 1, borderColor: '#1F2937', alignItems: 'center',
  },
  filterChipActive: { backgroundColor: '#1C1409', borderColor: '#D97706' },
  filterText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  filterTextActive: { color: '#FCD34D', fontWeight: '700' },
  analyzeBtn: {
    backgroundColor: '#D97706', borderRadius: 12, padding: 14,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  analyzeBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
