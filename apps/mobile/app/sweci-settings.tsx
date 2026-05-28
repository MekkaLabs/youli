/**
 * SWE-CI Settings — controla todas as runtime flags do sistema de Life CI
 * Permite ativar/desativar cada feature do SWE-CI individualmente.
 */
import { useI18n } from '../src/hooks/useI18n';
import { logWarn } from '../src/services/logger';
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch,
  ScrollView, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3002';

interface RuntimeConfig {
  // Core
  enableHandoff: boolean;
  enableSOP: boolean;
  enableReAct: boolean;
  enableSkillManager: boolean;
  enableLeaderboard: boolean;
  // Sprint F
  enableCILoop: boolean;
  enableGapAnalyzer: boolean;
  enableANCScore: boolean;
  // Sprint G
  enableRequirementsDoc: boolean;
  enableEvolutionTracker: boolean;
  enableFailureAttribution: boolean;
  // Sprint H
  enableMaintainabilityScore: boolean;
  enableGoalCheckpoint: boolean;
  enableParallelEvaluator: boolean;
  enableCIWeeklyPipeline: boolean;
  // Other
  [key: string]: unknown;
}

interface FeatureGroup {
  title: string;
  emoji: string;
  description: string;
  features: {
    key: keyof RuntimeConfig;
    label: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
  }[];
}

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    title: 'SWE-CI Core',
    emoji: '🔬',
    description: 'Pipeline principal de avaliação contínua de vida',
    features: [
      { key: 'enableParallelEvaluator', label: 'Parallel Evaluator', description: 'Avalia as 10 áreas de vida em paralelo com IA', impact: 'high' },
      { key: 'enableGapAnalyzer', label: 'Gap Analyzer', description: 'Detecta gaps críticos em cada área e gera requisitos', impact: 'high' },
      { key: 'enableANCScore', label: 'ANC Score', description: 'Average Normalized Change — mede velocidade de melhora', impact: 'medium' },
      { key: 'enableMaintainabilityScore', label: 'Maintainability', description: 'Avalia sustentabilidade do ritmo de vida atual', impact: 'high' },
      { key: 'enableCILoop', label: 'CI Loop', description: 'Loop automático de avaliação contínua (semanal)', impact: 'medium' },
      { key: 'enableCIWeeklyPipeline', label: 'Weekly Pipeline', description: 'Pipeline semanal completo com relatório de evolução', impact: 'high' },
    ],
  },
  {
    title: 'Tracking & Histórico',
    emoji: '📈',
    description: 'Rastreamento de evolução ao longo do tempo',
    features: [
      { key: 'enableEvolutionTracker', label: 'Evolution Tracker', description: 'Registra a trajetória de métricas ao longo do tempo', impact: 'high' },
      { key: 'enableRequirementsDoc', label: 'Requirements Docs', description: 'Gera documentos de requisito para cada gap detectado', impact: 'medium' },
      { key: 'enableFailureAttribution', label: 'Failure Attribution', description: 'Atribui causas e classifica falhas de progresso', impact: 'medium' },
      { key: 'enableGoalCheckpoint', label: 'Goal Checkpoint', description: 'Detecta metas inativas e sugere planos de retomada', impact: 'medium' },
    ],
  },
  {
    title: 'Agentes & Orquestração',
    emoji: '🤖',
    description: 'Capacidades avançadas dos agentes IA',
    features: [
      { key: 'enableLeaderboard', label: 'Agent Leaderboard', description: 'Rastreia qualidade e performance de cada agente', impact: 'low' },
      { key: 'enableSkillManager', label: 'Skill Manager', description: 'Aprende padrões do usuário para personalizar respostas', impact: 'medium' },
      { key: 'enableHandoff', label: 'Agent Handoff', description: 'Permite que agentes passem contexto entre si', impact: 'medium' },
      { key: 'enableSOP', label: 'SOP Registry', description: 'Procedimentos operacionais padrão multi-step', impact: 'low' },
      { key: 'enableReAct', label: 'ReAct Loop', description: 'Raciocínio iterativo (maior custo/latência)', impact: 'low' },
    ],
  },
];

const IMPACT_COLORS = { high: '#00b894', medium: '#fdcb6e', low: '#74b9ff' };

function FeatureToggle({
  label,
  description,
  impact,
  value,
  onToggle,
  loading,
}: {
  label: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  value: boolean;
  onToggle: () => void;
  loading: boolean;
}) {
  return (
    <View style={featureStyles.row}>
      <View style={featureStyles.info}>
        <View style={featureStyles.labelRow}>
          <Text style={featureStyles.label}>{label}</Text>
          <View style={[featureStyles.impactBadge, { backgroundColor: IMPACT_COLORS[impact] + '22' }]}>
            <Text style={[featureStyles.impactText, { color: IMPACT_COLORS[impact] }]}>{impact}</Text>
          </View>
        </View>
        <Text style={featureStyles.description}>{description}</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color="#7C3AED" />
      ) : (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#1F2937', true: '#7C3AED' }}
          thumbColor={value ? '#A78BFA' : '#4B5563'}
        />
      )}
    </View>
  );
}

const featureStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1F2937',
  },
  info: { flex: 1, gap: 2 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 13, fontWeight: '700', color: '#F9FAFB' },
  impactBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  impactText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  description: { fontSize: 11, color: '#6B7280', lineHeight: 16 },
});

export default function SWECISettingsScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/copilot/runtime-config`);
      if (res.ok) setConfig(await res.json());
    } catch (e) {
      logWarn('sweci-settings:fetchConfig', e);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  React.useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const toggleFeature = async (key: keyof RuntimeConfig) => {
    if (!config || toggling) return;
    const newValue = !config[key];
    setToggling(key as string);

    // Optimistic update
    setConfig((prev) => prev ? { ...prev, [key]: newValue } : prev);

    try {
      const res = await fetch(`${API_BASE}/api/copilot/runtime-config`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ [key]: newValue }),
      });
      if (!res.ok) {
        // Revert on failure
        setConfig((prev) => prev ? { ...prev, [key]: !newValue } : prev);
        Alert.alert('Erro', 'Não foi possível atualizar a configuração.');
      }
    } catch {
      setConfig((prev) => prev ? { ...prev, [key]: !newValue } : prev);
    } finally {
      setToggling(null);
    }
  };

  const activeCount = config
    ? Object.entries(config).filter(([k, v]) => k.startsWith('enable') && v === true).length
    : 0;

  const totalCount = config
    ? Object.keys(config).filter((k) => k.startsWith('enable')).length
    : 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>{t('sweciSettings.title')}</Text>
          <Text style={styles.subtitle}>Runtime feature flags</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#7C3AED" size="large" />
          <Text style={styles.loadingText}>Carregando configurações...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchConfig(); }} tintColor="#7C3AED" />}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary */}
          <Animated.View entering={FadeInDown.delay(0)} style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{activeCount}<Text style={styles.summaryOf}>/{totalCount}</Text></Text>
            <Text style={styles.summaryLabel}>{t('sweciSettings.featuresActive')}</Text>
            <Text style={styles.summaryHint}>Alterações aplicadas imediatamente nas próximas requisições</Text>
          </Animated.View>

          {/* Feature groups */}
          {FEATURE_GROUPS.map((group, gi) => (
            <Animated.View key={group.title} entering={FadeInDown.delay(60 + gi * 40)} style={styles.groupCard}>
              <Text style={styles.groupTitle}>{group.emoji} {group.title}</Text>
              <Text style={styles.groupDesc}>{group.description}</Text>
              <View style={styles.featureList}>
                {group.features.map((feature) => {
                  if (!config) return null;
                  const value = config[feature.key] as boolean ?? false;
                  return (
                    <FeatureToggle
                      key={feature.key as string}
                      label={feature.label}
                      description={feature.description}
                      impact={feature.impact}
                      value={value}
                      onToggle={() => toggleFeature(feature.key)}
                      loading={toggling === feature.key}
                    />
                  );
                })}
              </View>
            </Animated.View>
          ))}

          {/* Quick actions */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={async () => {
                if (!config) return;
                const allSWECI = FEATURE_GROUPS[0].features.reduce(
                  (acc, f) => ({ ...acc, [f.key]: true }),
                  {}
                );
                setToggling('all');
                try {
                  const res = await fetch(`${API_BASE}/api/copilot/runtime-config`, {
                    method: 'PATCH', headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(allSWECI),
                  });
                  if (res.ok) setConfig(await res.json());
                } finally { setToggling(null); }
              }}
            >
              <Text style={styles.quickBtnText}>{t('sweciSettings.enableAll')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0D1A' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#1F2937',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 22, color: '#7C3AED', fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '900', color: '#F9FAFB', textAlign: 'center' },
  subtitle: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: '#6B7280' },
  scroll: { padding: 16, gap: 12 },

  summaryCard: {
    backgroundColor: '#1A1040', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#7C3AED', alignItems: 'center', gap: 4,
  },
  summaryNum: { fontSize: 36, fontWeight: '900', color: '#A78BFA' },
  summaryOf: { fontSize: 20, color: '#6B7280' },
  summaryLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase' },
  summaryHint: { fontSize: 11, color: '#4B5563', textAlign: 'center', marginTop: 4 },

  groupCard: {
    backgroundColor: '#111827', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#1F2937', gap: 8,
  },
  groupTitle: { fontSize: 14, fontWeight: '800', color: '#F9FAFB' },
  groupDesc: { fontSize: 11, color: '#6B7280', lineHeight: 16 },
  featureList: { gap: 0 },

  quickActions: { gap: 8 },
  quickBtn: {
    backgroundColor: '#0D2B1A', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#065F46', alignItems: 'center',
  },
  quickBtnText: { fontSize: 14, fontWeight: '800', color: '#34D399' },
});
