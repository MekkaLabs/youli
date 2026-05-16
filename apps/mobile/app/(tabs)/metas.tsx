import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullScrollLayout } from '../../src/templates/FullScrollLayout';
import { GoalBoard } from '../../src/organisms/GoalBoard';
import { AgentBadge } from '../../src/atoms/AgentBadge';
import { AgentResponseCard, type AgentResponseData } from '../../src/organisms/AgentResponseCard';
import { useGoals } from '../../src/hooks/useGoals';

const ALEXANDRE = { name: 'Alexandre', fullName: 'Alexandre, o Grande', emoji: '⚔️', color: '#DC2626', domain: 'Metas Audaciosas' };
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3002';

export default function MetasScreen() {
  const insets = useSafeAreaInsets();
  const [agentResp, setAgentResp] = useState<AgentResponseData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const goals = useGoals();
  const goalsArr = (goals as any).goals ?? [];
  const active = goalsArr.filter((g: any) => g.status === 'active');
  const avgProgress = active.length
    ? Math.round(active.reduce((s: number, g: any) => s + (g.progress ?? 0), 0) / active.length)
    : 0;

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
      title="Metas"
      subtitle="Conquiste seus territórios"
      paddingBottom={insets.bottom + 90}
      rightAction={<AgentBadge {...ALEXANDRE} compact onPress={analyzeMetas} />}
    >
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

      {/* Botão analisar */}
      <Animated.View entering={FadeInDown.delay(60)}>
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
