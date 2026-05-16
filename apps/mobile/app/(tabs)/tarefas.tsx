import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullScrollLayout } from '../../src/templates/FullScrollLayout';
import { TaskBoard } from '../../src/organisms/TaskBoard';
import { AgentBadge } from '../../src/atoms/AgentBadge';
import { AgentResponseCard, type AgentResponseData } from '../../src/organisms/AgentResponseCard';

const FRANKLIN = { name: 'Franklin', fullName: 'Benjamin Franklin', emoji: '⚡', color: '#D97706', domain: 'Produtividade' };
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3002';

type TaskFilter = 'hoje' | 'semana' | 'backlog';

export default function TarefasScreen() {
  const insets = useSafeAreaInsets();
  const [agentResp, setAgentResp] = useState<AgentResponseData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [filter, setFilter] = useState<TaskFilter>('hoje');

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

  return (
    <FullScrollLayout
      title="Tarefas"
      subtitle="Execute o que importa"
      paddingBottom={insets.bottom + 90}
      rightAction={<AgentBadge {...FRANKLIN} compact onPress={analyzeTarefas} />}
    >
      {/* Filtros */}
      <Animated.View entering={FadeInDown.delay(0)} style={styles.filterRow}>
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
      <Animated.View entering={FadeInDown.delay(50)}>
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
