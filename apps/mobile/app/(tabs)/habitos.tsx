import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullScrollLayout } from '../../src/templates/FullScrollLayout';
import { HabitDeck } from '../../src/organisms/HabitDeck';
import { AgentBadge } from '../../src/atoms/AgentBadge';
import { AgentResponseCard, type AgentResponseData } from '../../src/organisms/AgentResponseCard';
import { useHabits } from '../../src/hooks/useHabits';

const ARISTOTELES = { name: 'Aristóteles', fullName: 'Aristóteles de Estagira', emoji: '🏛️', color: '#059669', domain: 'Hábitos & Caráter' };
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3002';

export default function HabitosScreen() {
  const insets = useSafeAreaInsets();
  const [agentResp, setAgentResp] = useState<AgentResponseData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const habits = useHabits();
  const habitsArr = (habits as any).habits ?? [];
  const atRisk = habitsArr.filter((h: any) => (h.streak ?? 0) < 3 && h.streak >= 0);

  async function analyzeHabits() {
    setAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/api/agents`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'Analise meus hábitos e dê recomendações', area: 'habitos' }),
      });
      if (res.ok) {
        const data = await res.json();
        const ag = data.primaryAgent ?? data;
        setAgentResp({
          agentName: ag.agentName ?? ARISTOTELES.name,
          agentEmoji: ag.agentEmoji ?? ARISTOTELES.emoji,
          agentColor: ag.agentColor ?? ARISTOTELES.color,
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
      title="Hábitos"
      subtitle="Consistência que constrói caráter"
      paddingBottom={insets.bottom + 90}
      rightAction={<AgentBadge {...ARISTOTELES} compact onPress={analyzeHabits} />}
    >
      {/* Ribbon de hábitos em risco */}
      {atRisk.length > 0 && (
        <Animated.View entering={FadeInDown.delay(0)} style={styles.riskRibbon}>
          <Text style={styles.riskIcon}>⚠️</Text>
          <Text style={styles.riskText}>
            {atRisk.length} hábito{atRisk.length > 1 ? 's' : ''} em risco de quebrar streak
          </Text>
        </Animated.View>
      )}

      {/* Botão de análise */}
      <Animated.View entering={FadeInDown.delay(50)}>
        <TouchableOpacity style={styles.analyzeBtn} onPress={analyzeHabits} disabled={analyzing} activeOpacity={0.8}>
          {analyzing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.analyzeBtnText}>🏛️ Aristóteles analisar meus hábitos</Text>}
        </TouchableOpacity>
      </Animated.View>

      {/* Resposta do agente */}
      {(agentResp || analyzing) && (
        <AgentResponseCard response={agentResp} loading={analyzing} />
      )}

      <HabitDeck />
    </FullScrollLayout>
  );
}

const styles = StyleSheet.create({
  riskRibbon: {
    backgroundColor: '#2B1D00', borderRadius: 10, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#92400E',
  },
  riskIcon: { fontSize: 16 },
  riskText: { flex: 1, fontSize: 13, color: '#FCD34D', fontWeight: '600' },
  analyzeBtn: {
    backgroundColor: '#059669', borderRadius: 12, padding: 14,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  analyzeBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
