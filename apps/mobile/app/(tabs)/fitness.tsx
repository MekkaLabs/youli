/**
 * Fitness — tela de saúde e treino
 * Agente: Hipócrates (saúde e vitalidade)
 */
import React, { useState, useEffect } from 'react';
import { useI18n } from '../../src/hooks/useI18n';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullScrollLayout } from '../../src/templates/FullScrollLayout';
import { AgentBadge } from '../../src/atoms/AgentBadge';
import { HealthDashboard } from '../../src/organisms/HealthDashboard';
import { AgentResponseCard, type AgentResponseData } from '../../src/organisms/AgentResponseCard';
import { EvolutionChart, type EvolutionPoint } from '../../src/molecules/EvolutionChart';
import { MaintainabilityBadge } from '../../src/molecules/MaintainabilityBadge';
import { useHealth } from '../../src/hooks/useHealth';

const HIPOCRATES = {
  name: 'Hipócrates',
  fullName: 'Hipócrates de Cós',
  emoji: '⚕️',
  color: '#DC2626',
  domain: 'Saúde & Vitalidade',
};

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3002';

interface LifeHealthData {
  maintainabilityScore: number;
  maintainabilityVerdict: 'sustainable' | 'moderate_risk' | 'high_risk';
  maintainabilityWarnings: string[];
  topGaps: Array<{ area: string; requirement: string; gapMagnitude: number }>;
}

export default function FitnessScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [agentResp, setAgentResp] = useState<AgentResponseData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [healthData, setHealthData] = useState<LifeHealthData | null>(null);
  const { summary } = useHealth();

  const workouts = summary?.workouts ?? [];
  const weeklyActivities = workouts.length;
  const lastWorkout = workouts[0];
  const consistency = weeklyActivities >= 3 ? 'alta' : weeklyActivities >= 1 ? 'média' : 'baixa';

  // Dados reais de distância e FC (Strava/Zepp via /api/fitness/summary)
  const totalDistanceKm = workouts.reduce((acc, w) => acc + (w.distanceKm ?? 0), 0);
  const avgHR = workouts.filter(w => w.avgHeartRate).length > 0
    ? Math.round(workouts.filter(w => w.avgHeartRate).reduce((a, w) => a + (w.avgHeartRate ?? 0), 0) / workouts.filter(w => w.avgHeartRate).length)
    : (summary?.today?.heartRateAvg ?? 0);

  // Pontos de evolução baseados em duração dos treinos
  const evolutionPoints: EvolutionPoint[] = workouts.slice(0, 10).map((w, i) => ({
    timestamp: w.date ?? new Date(Date.now() - i * 86400000 * 2).toISOString(),
    value: w.durationMin ?? 30,
    delta: i > 0 ? (w.durationMin ?? 30) - (workouts[i - 1]?.durationMin ?? 30) : 0,
  }));

  const trendLabel: 'strong_up' | 'up' | 'flat' | 'down' | 'strong_down' =
    weeklyActivities >= 5 ? 'strong_up' :
    weeklyActivities >= 3 ? 'up' :
    weeklyActivities >= 2 ? 'flat' :
    weeklyActivities >= 1 ? 'down' : 'strong_down';

  const fitnessGap = healthData?.topGaps.find((g) => g.area === 'fitness');

  useEffect(() => {
    fetch(`${API_BASE}/api/copilot/life-health?userId=default`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setHealthData(d))
      .catch(() => {});
  }, []);

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
      title={t("fitness.title")}
      subtitle={t("fitness.subtitle")}
      paddingBottom={insets.bottom + 90}
      rightAction={<AgentBadge {...HIPOCRATES} compact onPress={analyzeFitness} />}
    >
      {/* Stats de consistência + dados reais Strava/Zepp */}
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
        {totalDistanceKm > 0 ? (
          <View style={styles.consistencyStat}>
            <Text style={[styles.consistencyNum, { color: '#0EA5E9' }]}>
              {totalDistanceKm.toFixed(1)}km
            </Text>
            <Text style={styles.consistencyLabel}>distância{'\n'}total</Text>
          </View>
        ) : (
          <View style={styles.consistencyStat}>
            <Text style={styles.consistencyNum}>
              {lastWorkout ? new Date(lastWorkout.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
            </Text>
            <Text style={styles.consistencyLabel}>último{'\n'}treino</Text>
          </View>
        )}
        {avgHR > 0 && (
          <>
            <View style={styles.consistencyDivider} />
            <View style={styles.consistencyStat}>
              <Text style={[styles.consistencyNum, { color: '#DC2626' }]}>{avgHR}</Text>
              <Text style={styles.consistencyLabel}>FC média{'\n'}bpm</Text>
            </View>
          </>
        )}
      </Animated.View>

      {/* SWE-CI: Maintainability — saúde do ritmo de vida */}
      {healthData && (
        <Animated.View entering={FadeInDown.delay(30)} style={styles.maintCard}>
          <Text style={styles.maintTitle}>♻️ Ritmo de Vida</Text>
          <MaintainabilityBadge
            score={healthData.maintainabilityScore}
            verdict={healthData.maintainabilityVerdict}
            warnings={healthData.maintainabilityWarnings.slice(0, 2)}
          />
          {fitnessGap && (
            <View style={styles.gapRow}>
              <Text style={styles.gapLabel}>⚕️ Gap detectado:</Text>
              <Text style={styles.gapText}>{fitnessGap.requirement}</Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* SWE-CI: Evolution Chart de duração dos treinos */}
      {evolutionPoints.length > 0 && (
        <Animated.View entering={FadeInDown.delay(60)}>
          <EvolutionChart
            area="Fitness"
            metric="Duração dos treinos (min)"
            points={evolutionPoints}
            trendLabel={trendLabel}
            patternInsight={
              weeklyActivities >= 4
                ? 'Frequência excelente — corpo e mente em sintonia 💪'
                : weeklyActivities >= 2
                ? 'Mantendo o ritmo — adicione mais 1 treino/semana'
                : weeklyActivities === 1
                ? 'Início da jornada — 2 treinos/semana é o mínimo viável'
                : 'Nenhum treino registrado — comece hoje com 20 minutos'
            }
          />
        </Animated.View>
      )}

      {/* Botão Hipócrates */}
      <Animated.View entering={FadeInDown.delay(90)}>
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
  maintCard: {
    backgroundColor: '#1A0D0D', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#7F1D1D', gap: 10,
  },
  maintTitle: { fontSize: 11, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  gapRow: { backgroundColor: '#111827', borderRadius: 8, padding: 10, gap: 4 },
  gapLabel: { fontSize: 10, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase' },
  gapText: { fontSize: 12, color: '#FCA5A5', lineHeight: 18 },
  analyzeBtn: {
    backgroundColor: '#DC2626', borderRadius: 12, padding: 14,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  analyzeBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
