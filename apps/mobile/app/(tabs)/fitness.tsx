/**
 * Fitness — tela de saúde e treino
 * Agente: Hipócrates (saúde e vitalidade)
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullScrollLayout } from '../../src/templates/FullScrollLayout';
import { AgentBadge } from '../../src/atoms/AgentBadge';
import { HealthDashboard } from '../../src/organisms/HealthDashboard';
import { AgentResponseCard, type AgentResponseData } from '../../src/organisms/AgentResponseCard';
import { useHealth } from '../../src/hooks/useHealth';

const HIPOCRATES = {
  name: 'Hipócrates',
  fullName: 'Hipócrates de Cós',
  emoji: '⚕️',
  color: '#DC2626',
  domain: 'Saúde & Vitalidade',
};

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3002';

export default function FitnessScreen() {
  const insets = useSafeAreaInsets();
  const [agentResp, setAgentResp] = useState<AgentResponseData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const { summary } = useHealth();

  const weeklyActivities = summary?.workouts?.length ?? 0;
  const lastWorkout = summary?.workouts?.[0];
  const consistency = weeklyActivities >= 3 ? 'alta' : weeklyActivities >= 1 ? 'média' : 'baixa';

  async function analyzeFitness() {
    setAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/api/agents`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: `Analise minha consistência de treinos (${weeklyActivities} esta semana) e recomende o próximo passo para melhorar energia e performance`,
          area: 'fitness',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const ag = data.primaryAgent ?? data;
        setAgentResp({
          agentName: ag.agentName ?? HIPOCRATES.name,
          agentEmoji: ag.agentEmoji ?? HIPOCRATES.emoji,
          agentColor: ag.agentColor ?? HIPOCRATES.color,
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
      title="Fitness"
      subtitle="Corpo saudável, mente poderosa"
      paddingBottom={insets.bottom + 90}
      rightAction={<AgentBadge {...HIPOCRATES} compact onPress={analyzeFitness} />}
    >
      {/* Stats de consistência */}
      <Animated.View entering={FadeInDown.delay(0)} style={styles.consistencyCard}>
        <View style={styles.consistencyStat}>
          <Text style={styles.consistencyNum}>{weeklyActivities}</Text>
          <Text style={styles.consistencyLabel}>treinos{'\n'}esta semana</Text>
        </View>
        <View style={styles.consistencyDivider} />
        <View style={styles.consistencyStat}>
          <Text style={[styles.consistencyNum, {
            color: consistency === 'alta' ? '#059669' : consistency === 'média' ? '#D97706' : '#DC2626'
          }]}>
            {consistency === 'alta' ? '🔥' : consistency === 'média' ? '🔋' : '😴'}
          </Text>
          <Text style={styles.consistencyLabel}>consistência{'\n'}{consistency}</Text>
        </View>
        <View style={styles.consistencyDivider} />
        <View style={styles.consistencyStat}>
          <Text style={styles.consistencyNum}>
            {lastWorkout ? new Date(lastWorkout.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
          </Text>
          <Text style={styles.consistencyLabel}>último{'\n'}treino</Text>
        </View>
      </Animated.View>

      {/* Botão Hipócrates */}
      <Animated.View entering={FadeInDown.delay(60)}>
        <TouchableOpacity style={styles.analyzeBtn} onPress={analyzeFitness} disabled={analyzing} activeOpacity={0.8}>
          {analyzing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.analyzeBtnText}>⚕️ Hipócrates analisar minha saúde</Text>}
        </TouchableOpacity>
      </Animated.View>

      {/* Resposta do agente */}
      {(agentResp || analyzing) && (
        <AgentResponseCard response={agentResp} loading={analyzing} />
      )}

      <HealthDashboard />
    </FullScrollLayout>
  );
}

const styles = StyleSheet.create({
  consistencyCard: {
    backgroundColor: '#111827', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    borderWidth: 1, borderColor: '#1F2937',
  },
  consistencyStat: { alignItems: 'center', gap: 4, flex: 1 },
  consistencyNum: { fontSize: 20, fontWeight: '900', color: '#F9FAFB' },
  consistencyLabel: { fontSize: 10, color: '#6B7280', fontWeight: '600', textAlign: 'center', textTransform: 'uppercase' },
  consistencyDivider: { width: 1, height: 40, backgroundColor: '#1F2937' },
  analyzeBtn: {
    backgroundColor: '#DC2626', borderRadius: 12, padding: 14,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  analyzeBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
