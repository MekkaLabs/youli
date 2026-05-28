/**
 * Life Score — tela dedicada de saúde de vida SWE-CI
 * Visualização rica de todos os scores: Life Health, ANC, Maintainability, top gaps
 */
import { useI18n } from '../src/hooks/useI18n';
import { logWarn } from '../src/services/logger';
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import Animated, {
  FadeInDown, FadeIn,
  useSharedValue, useAnimatedProps, withTiming, Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaintainabilityBadge } from '../src/molecules/MaintainabilityBadge';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3002';

interface LifeHealthData {
  userId: string;
  evaluatedAt: string;
  lifeHealthScore: number;
  ancScore: number;
  maintainabilityScore: number;
  maintainabilityVerdict: 'sustainable' | 'moderate_risk' | 'high_risk';
  maintainabilityWarnings: string[];
  topGaps: {
    area: string;
    metric: string;
    gapMagnitude: number;
    priority: string;
    requirement: string;
  }[];
  criticalAreas: string[];
  topPriorities: string[];
  lastPipelineWeek?: string;
  lastPipelineSummary?: string;
  runtimeFlags: Record<string, boolean>;
}

function ScoreRing({ score, label, color, size = 90 }: { score: number; label: string; color: string; size?: number }) {
  const strokeWidth = 10;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(score / 100, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [score]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={[ringStyles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle cx={cx} cy={cy} r={r} stroke="#1F2937" strokeWidth={strokeWidth} fill="none" />
        {/* Arc animado */}
        <AnimatedCircle
          cx={cx} cy={cy} r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation="-90"
          origin={`${cx}, ${cy}`}
        />
      </Svg>
      <View style={ringStyles.centerContent}>
        <Text style={[ringStyles.score, { color, fontSize: size * 0.26 }]}>{score}</Text>
        <Text style={ringStyles.label}>{label}</Text>
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  centerContent: { position: 'absolute', alignItems: 'center' },
  score: { fontWeight: '900' },
  label: { fontSize: 8, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center', paddingHorizontal: 2, marginTop: -2 },
});

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#e17055',
  high: '#fdcb6e',
  medium: '#74b9ff',
  low: '#55efc4',
};

const AREA_ICONS: Record<string, string> = {
  habitos: '🔥',
  metas: '🎯',
  tarefas: '⚡',
  financeiro: '💰',
  fitness: '💪',
  calendario: '📅',
  insights: '🦉',
  foco: '🎯',
  perfil: '👑',
  dashboard: '🏠',
};

// Mapeamento de área → rota para navegação dos gap cards
const AREA_ROUTES: Record<string, string> = {
  habitos: '/(tabs)/habitos',
  metas: '/(tabs)/metas',
  tarefas: '/(tabs)/tarefas',
  financeiro: '/(tabs)/financeiro',
  fitness: '/(tabs)/fitness',
  calendario: '/(tabs)/calendario',
  insights: '/(tabs)/insights',
  foco: '/(tabs)/focus',
  perfil: '/(tabs)/perfil',
  dashboard: '/(tabs)/dashboard',
};

// Labels amigáveis para os runtime flags SWE-CI
const FLAG_LABELS: Record<string, string> = {
  enableGapAnalyzer: 'Analisador de Gaps',
  enableANCScore: 'Score ANC',
  enableMaintainabilityScore: 'Sustentabilidade',
  enableParallelEvaluator: 'Avaliação Paralela',
  enableEvolutionTracker: 'Rastreamento de Evolução',
  enableCILoop: 'CI Contínuo',
  enableCIWeeklyPipeline: 'Pipeline Semanal',
  enableRequirementsDoc: 'Docs de Requisitos',
  enableFailureAttribution: 'Atribuição de Falha',
  enableGoalCheckpoint: 'Checkpoint de Metas',
};

export default function LifeScoreScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<LifeHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/copilot/life-health?userId=default`);
      if (res.ok) setData(await res.json());
    } catch (e) {
      logWarn('life-score:load', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>{t("lifeScore.loading")}</Text>
      </View>
    );
  }

  const overallGrade =
    !data ? 'N/A' :
    data.lifeHealthScore >= 80 ? 'S' :
    data.lifeHealthScore >= 65 ? 'A' :
    data.lifeHealthScore >= 50 ? 'B' :
    data.lifeHealthScore >= 35 ? 'C' : 'D';

  const gradeColor =
    overallGrade === 'S' || overallGrade === 'A' ? '#00b894' :
    overallGrade === 'B' ? '#fdcb6e' :
    overallGrade === 'C' ? '#f0932b' : '#e17055';

  return (
    <ScrollView
      style={[styles.root, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#7C3AED" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{t("lifeScore.title")}</Text>
          {data?.evaluatedAt && (
            <Text style={styles.headerSub}>
              Atualizado {new Date(data.evaluatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
      </View>

      {!data ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyText}>{t("lifeScore.noData")}</Text>
        </View>
      ) : (
        <>
          {/* Grade geral */}
          <Animated.View entering={FadeIn} style={[styles.gradeCard, { borderColor: gradeColor }]}>
            <Text style={[styles.gradeText, { color: gradeColor }]}>{overallGrade}</Text>
            <View style={styles.gradeInfo}>
              <Text style={styles.gradeLabel}>Grade Geral de Vida</Text>
              <Text style={styles.gradeSubLabel}>Baseado em 10 áreas avaliadas por IA</Text>
              {data.criticalAreas.length > 0 && (
                <View style={styles.criticalPill}>
                  <Text style={styles.criticalPillText}>⚠️ {data.criticalAreas.length} área{data.criticalAreas.length > 1 ? 's' : ''} crítica{data.criticalAreas.length > 1 ? 's' : ''}</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Score rings */}
          <Animated.View entering={FadeInDown.delay(80)} style={styles.ringsRow}>
            <ScoreRing
              score={data.lifeHealthScore}
              label="Life Health"
              color={data.lifeHealthScore >= 70 ? '#00b894' : data.lifeHealthScore >= 40 ? '#fdcb6e' : '#e17055'}
              size={90}
            />
            <ScoreRing
              score={data.ancScore}
              label="ANC Score"
              color={data.ancScore >= 60 ? '#00b894' : data.ancScore >= 35 ? '#fdcb6e' : '#e17055'}
              size={90}
            />
            <ScoreRing
              score={data.maintainabilityScore}
              label="Sustentab."
              color={data.maintainabilityVerdict === 'sustainable' ? '#00b894' : data.maintainabilityVerdict === 'moderate_risk' ? '#fdcb6e' : '#e17055'}
              size={90}
            />
          </Animated.View>

          {/* Maintainability detalhe */}
          <Animated.View entering={FadeInDown.delay(120)} style={styles.maintCard}>
            <Text style={styles.sectionTitle}>♻️ Sustentabilidade do Sistema de Vida</Text>
            <MaintainabilityBadge
              score={data.maintainabilityScore}
              verdict={data.maintainabilityVerdict}
              warnings={data.maintainabilityWarnings}
            />
          </Animated.View>

          {/* Top Prioridades */}
          {data.topPriorities.length > 0 && (
            <Animated.View entering={FadeInDown.delay(160)} style={styles.section}>
              <Text style={styles.sectionTitle}>{t("lifeScore.weekPriorities")}</Text>
              {data.topPriorities.map((p, i) => (
                <View key={i} style={styles.priorityItem}>
                  <Text style={styles.priorityNumber}>{i + 1}</Text>
                  <Text style={styles.priorityText}>{p}</Text>
                </View>
              ))}
            </Animated.View>
          )}

          {/* Top Gaps */}
          {data.topGaps.length > 0 && (
            <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
              <Text style={styles.sectionTitle}>🔍 Gaps Críticos Detectados</Text>
              {data.topGaps.map((gap, i) => {
                const pColor = PRIORITY_COLORS[gap.priority] ?? '#74b9ff';
                const icon = AREA_ICONS[gap.area] ?? '📊';
                const route = AREA_ROUTES[gap.area];
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.gapCard, { borderLeftColor: pColor }]}
                    onPress={() => route && router.push(route as any)}
                    activeOpacity={route ? 0.75 : 1}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver área ${gap.area}`}
                  >
                    <View style={styles.gapHeader}>
                      <Text style={styles.gapArea}>{icon} {gap.area}</Text>
                      <View style={styles.gapHeaderRight}>
                        <View style={[styles.gapBadge, { backgroundColor: pColor + '22' }]}>
                          <Text style={[styles.gapBadgeText, { color: pColor }]}>
                            {gap.priority} · {Math.round(gap.gapMagnitude * 100)}%
                          </Text>
                        </View>
                        {route && <Text style={styles.gapArrow}>→</Text>}
                      </View>
                    </View>
                    <Text style={styles.gapMetric}>{gap.metric}</Text>
                    <Text style={styles.gapRequirement}>{gap.requirement}</Text>
                  </TouchableOpacity>
                );
              })}
            </Animated.View>
          )}

          {/* Último pipeline */}
          {data.lastPipelineSummary && (
            <Animated.View entering={FadeInDown.delay(240)} style={styles.pipelineCard}>
              <Text style={styles.sectionTitle}>🔄 Último Pipeline Semanal</Text>
              {data.lastPipelineWeek && (
                <Text style={styles.pipelineWeek}>Semana de {data.lastPipelineWeek.slice(0, 10)}</Text>
              )}
              <Text style={styles.pipelineSummary}>{data.lastPipelineSummary}</Text>
            </Animated.View>
          )}

          {/* Runtime flags */}
          <Animated.View entering={FadeInDown.delay(280)} style={styles.flagsCard}>
            <Text style={styles.sectionTitle}>⚙️ Features Ativas</Text>
            <View style={styles.flagsGrid}>
              {Object.entries(data.runtimeFlags).map(([key, active]) => (
                <View key={key} style={[styles.flagChip, active ? styles.flagChipOn : styles.flagChipOff]}>
                  <Text style={[styles.flagText, active ? styles.flagTextOn : styles.flagTextOff]}>
                    {active ? '✓' : '○'} {FLAG_LABELS[key] ?? key.replace(/^enable/, '').replace(/([A-Z])/g, ' $1').trim()}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Link para Evolution History */}
          <Animated.View entering={FadeInDown.delay(320)}>
            <TouchableOpacity
              style={styles.evolutionBtn}
              onPress={() => router.push('/evolution-history' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.evolutionBtnText}>{t("lifeScore.viewEvolution")}</Text>
              <Text style={styles.evolutionBtnSub}>Métricas ao longo do tempo por área →</Text>
            </TouchableOpacity>
          </Animated.View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#030712' },
  content: { padding: 20, gap: 16, paddingBottom: 60 },
  loadingContainer: { flex: 1, backgroundColor: '#030712', alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 14, color: '#6B7280' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1F2937' },
  backIcon: { fontSize: 18, color: '#9CA3AF' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#F9FAFB' },
  headerSub: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  gradeCard: {
    borderWidth: 2, borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 20,
    backgroundColor: '#0D0D1A',
  },
  gradeText: { fontSize: 72, fontWeight: '900', lineHeight: 80 },
  gradeInfo: { flex: 1, gap: 4 },
  gradeLabel: { fontSize: 16, fontWeight: '800', color: '#F9FAFB' },
  gradeSubLabel: { fontSize: 12, color: '#6B7280' },
  criticalPill: { backgroundColor: '#2D0000', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 4 },
  criticalPillText: { fontSize: 12, color: '#F87171', fontWeight: '700' },
  ringsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  maintCard: { backgroundColor: '#111827', borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: '#1F2937' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 13, color: '#9CA3AF', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  priorityItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#111827', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#1F2937' },
  priorityNumber: { fontSize: 14, fontWeight: '900', color: '#7C3AED', minWidth: 20, textAlign: 'center' },
  priorityText: { flex: 1, fontSize: 13, color: '#D1D5DB', lineHeight: 20 },
  gapCard: { backgroundColor: '#111827', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#1F2937', borderLeftWidth: 3, gap: 4 },
  gapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gapHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gapArea: { fontSize: 13, color: '#F9FAFB', fontWeight: '800', textTransform: 'capitalize' },
  gapBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  gapBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  gapArrow: { fontSize: 14, color: '#6B7280', fontWeight: '700' },
  gapMetric: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  gapRequirement: { fontSize: 12, color: '#D1D5DB', lineHeight: 18 },
  pipelineCard: { backgroundColor: '#0D1A0D', borderRadius: 14, padding: 16, gap: 8, borderWidth: 1, borderColor: '#065F46' },
  pipelineWeek: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  pipelineSummary: { fontSize: 13, color: '#D1FAE5', lineHeight: 20 },
  flagsCard: { backgroundColor: '#111827', borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: '#1F2937' },
  flagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  flagChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  flagChipOn: { backgroundColor: '#0D2B1A', borderColor: '#065F46' },
  flagChipOff: { backgroundColor: '#111827', borderColor: '#1F2937' },
  flagText: { fontSize: 11, fontWeight: '600' },
  flagTextOn: { color: '#34D399' },
  flagTextOff: { color: '#4B5563' },
  evolutionBtn: {
    backgroundColor: '#1A1040', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#7C3AED', alignItems: 'center', gap: 4,
  },
  evolutionBtnText: { fontSize: 15, fontWeight: '800', color: '#A78BFA' },
  evolutionBtnSub: { fontSize: 12, color: '#6B7280' },
});
