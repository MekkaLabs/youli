import React, { useState, useEffect } from 'react';
import { logWarn } from '../../src/services/logger';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, SafeAreaView } from 'react-native';
import { useI18n } from '../../src/hooks/useI18n';
import { EmptyState } from '../../src/molecules/EmptyState';
import { QuickStats } from '../../src/molecules/QuickStats';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullScrollLayout } from '../../src/templates/FullScrollLayout';
import { HabitDeck } from '../../src/organisms/HabitDeck';
import { AgentBadge } from '../../src/atoms/AgentBadge';
import { AgentResponseCard, type AgentResponseData } from '../../src/organisms/AgentResponseCard';
import { MaintainabilityBadge } from '../../src/molecules/MaintainabilityBadge';
import { EvolutionChart, type EvolutionPoint } from '../../src/molecules/EvolutionChart';
import { useHabits } from '../../src/hooks/useHabits';

const ARISTOTELES = { name: 'Aristóteles', fullName: 'Aristóteles de Estagira', emoji: '🏛️', color: '#059669', domain: 'Hábitos & Caráter' };
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3002';

interface LifeHealthData {
  maintainabilityScore: number;
  maintainabilityVerdict: 'sustainable' | 'moderate_risk' | 'high_risk';
  maintainabilityWarnings: string[];
  topGaps: { area: string; gapMagnitude: number; requirement: string }[];
}

export default function HabitosScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [agentResp, setAgentResp] = useState<AgentResponseData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [healthData, setHealthData] = useState<LifeHealthData | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitEmoji, setNewHabitEmoji] = useState('🔥');
  const habits = useHabits();
  const habitsArr = (habits as any).habits ?? [];
  const addHabit = (habits as any).addHabit;
  const atRisk = habitsArr.filter((h: any) => (h.streak ?? 0) < 3 && h.streak >= 0);

  // Pontos de evolução: usa createdAt/updatedAt do hábito se disponível,
  // senão gera timestamps retroativos (1 ponto por hábito, mais antigo primeiro)
  const evolutionPoints: EvolutionPoint[] = React.useMemo(() => {
    const sorted = [...habitsArr]
      .sort((a: any, b: any) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ta - tb;
      })
      .slice(-10);
    return sorted.map((h: any, i: number) => {
      const ts = h.createdAt
        ? new Date(h.createdAt).toISOString()
        : new Date(Date.now() - (sorted.length - 1 - i) * 86400000).toISOString();
      return {
        timestamp: ts,
        value: h.streak ?? 0,
        delta: i > 0 ? (h.streak ?? 0) - (sorted[i - 1]?.streak ?? 0) : 0,
      };
    });
  }, [habitsArr]);

  const avgStreak = habitsArr.length
    ? Math.round(habitsArr.reduce((s: number, h: any) => s + (h.streak ?? 0), 0) / habitsArr.length)
    : 0;

  const trendLabel: EvolutionPoint['delta'] extends infer _ ? 'strong_up' | 'up' | 'flat' | 'down' | 'strong_down' : never =
    avgStreak >= 14 ? 'strong_up' : avgStreak >= 7 ? 'up' : avgStreak >= 3 ? 'flat' : avgStreak >= 1 ? 'down' : 'strong_down';

  useEffect(() => {
    fetch(`${API_BASE}/api/copilot/life-health?userId=default`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setHealthData(d))
      .catch(() => {});
  }, []);

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
    } catch (e) {
      logWarn('habitos:analyze', e);
    } finally { setAnalyzing(false); }
  }

  const habitGap = healthData?.topGaps.find((g) => g.area === 'habitos');

  return (
    <FullScrollLayout
      title={t('habits.title')}
      subtitle={t('habits.subtitle')}
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

      {/* Quick Stats */}
      {habitsArr.length > 0 && (
        <QuickStats
          delay={0}
          stats={[
            { value: habitsArr.length, label: t('habits.title'), icon: '📋', color: '#A78BFA' },
            { value: avgStreak, label: t('habits.streak'), icon: '🔥', color: avgStreak >= 7 ? '#00b894' : '#fdcb6e' },
            { value: habitsArr.filter((h: any) => h.completedToday).length, label: t('habits.completedToday'), icon: '✅', color: '#4ADE80' },
            { value: `${habitsArr.filter((h: any) => h.completedToday).length}/${habitsArr.length}`, label: 'Hoje', icon: '🎯', color: '#60A5FA' },
          ]}
        />
      )}

      {/* Empty state */}
      {habitsArr.length === 0 && (
        <EmptyState
          emoji="🔥"
          title={t('habits.noHabits')}
          body={t('habits.noHabitsHint')}
          ctaLabel={t('habits.addHabit')}
          onCta={() => setShowAddModal(true)}
        />
      )}

      {/* SWE-CI: Maintainability Badge */}
      {healthData && (
        <Animated.View entering={FadeInDown.delay(30)} style={styles.maintCard}>
          <Text style={styles.sectionLabel}>♻️ Sustentabilidade dos Hábitos</Text>
          <MaintainabilityBadge
            score={healthData.maintainabilityScore}
            verdict={healthData.maintainabilityVerdict}
            warnings={healthData.maintainabilityWarnings.slice(0, 2)}
          />
          {habitGap && (
            <View style={styles.gapRow}>
              <Text style={styles.gapLabel}>Gap crítico:</Text>
              <Text style={styles.gapText}>{habitGap.requirement}</Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* SWE-CI: Evolution Chart */}
      {habitsArr.length > 0 && (
        <Animated.View entering={FadeInDown.delay(60)}>
          <EvolutionChart
            area="Hábitos"
            metric="Streak médio (dias)"
            points={evolutionPoints}
            trendLabel={trendLabel}
            patternInsight={
              avgStreak >= 7
                ? 'Consistência forte — mantenha o ritmo 💪'
                : avgStreak >= 3
                ? 'Construindo momentum — não quebre a corrente!'
                : 'Streaks baixos detectados — retomar agora'
            }
          />
        </Animated.View>
      )}

      {/* Botão de análise */}
      <Animated.View entering={FadeInDown.delay(90)}>
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

      {/* Modal: adicionar hábito rápido */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <SafeAreaView style={addStyles.safe}>
          <View style={addStyles.header}>
            <Text style={addStyles.title}>✨ Novo Hábito</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}><Text style={addStyles.cancel}>Cancelar</Text></TouchableOpacity>
          </View>
          <View style={addStyles.body}>
            <Text style={addStyles.label}>Emoji</Text>
            <View style={addStyles.emojiRow}>
              {['🔥','💧','📚','🏃','🧘','💪','🎯','🌿','✍️','🎵'].map(e => (
                <TouchableOpacity key={e} onPress={() => setNewHabitEmoji(e)}
                  style={[addStyles.emojiBtn, newHabitEmoji === e && addStyles.emojiBtnSel]}>
                  <Text style={addStyles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={addStyles.label}>Nome do hábito</Text>
            <TextInput
              style={addStyles.input}
              value={newHabitTitle}
              onChangeText={setNewHabitTitle}
              placeholder="Ex: Meditar 10 minutos"
              placeholderTextColor="#4B5563"
              autoFocus
              maxLength={50}
            />
            <TouchableOpacity
              style={[addStyles.saveBtn, !newHabitTitle.trim() && { opacity: 0.5 }]}
              disabled={!newHabitTitle.trim()}
              onPress={() => {
                if (newHabitTitle.trim() && addHabit) {
                  addHabit({ title: newHabitTitle.trim(), emoji: newHabitEmoji, color: '#059669', frequency: 'daily', category: 'Geral', bestStreak: 0 });
                }
                setNewHabitTitle('');
                setNewHabitEmoji('🔥');
                setShowAddModal(false);
              }}>
              <Text style={addStyles.saveBtnText}>Criar Hábito</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
  maintCard: {
    backgroundColor: '#0D1B12', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#065F46', gap: 10,
  },
  sectionLabel: { fontSize: 11, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  gapRow: { backgroundColor: '#111827', borderRadius: 8, padding: 10, gap: 4 },
  gapLabel: { fontSize: 10, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase' },
  gapText: { fontSize: 12, color: '#D1FAE5', lineHeight: 18 },
  analyzeBtn: {
    backgroundColor: '#059669', borderRadius: 12, padding: 14,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  analyzeBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});

const addStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#030712' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#111827' },
  title: { fontSize: 18, fontWeight: '900', color: '#F9FAFB' },
  cancel: { fontSize: 15, color: '#7C3AED', fontWeight: '700' },
  body: { padding: 20, gap: 14 },
  label: { fontSize: 12, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1F2937' },
  emojiBtnSel: { borderColor: '#059669', backgroundColor: '#0D2B1A' },
  emojiText: { fontSize: 22 },
  input: { backgroundColor: '#111827', borderRadius: 12, borderWidth: 1, borderColor: '#1F2937', padding: 14, color: '#F9FAFB', fontSize: 16 },
  saveBtn: { backgroundColor: '#059669', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
