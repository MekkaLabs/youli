/**
 * LifeSimulator
 * Interface de simulação de trajetória — o "sandbox do futuro" do Youli
 * Inspirado no MiroFish: ensaie o futuro antes de decidir
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, TextInput,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { tokens } from '../../theme/tokens';
import { SimulationCard } from '../../molecules/SimulationCard';
import { Button } from '../../atoms/Button';

type Horizon = 30 | 60 | 90 | 180;
type Mode = 'trajectory' | 'whatif';

interface WhatIfChange { area: string; change: string; magnitude: number }

interface SimResult {
  overallScore: number;
  overallTrend: string;
  summary: string;
  predictions: any[];
  criticalInsight: string;
  topOpportunity: string;
  topRisk: string;
  horizonLabel: string;
}

const HORIZONS: { value: Horizon; label: string }[] = [
  { value: 30, label: '30 dias' },
  { value: 60, label: '2 meses' },
  { value: 90, label: '3 meses' },
  { value: 180, label: '6 meses' },
];

const WHATIF_PRESETS: WhatIfChange[] = [
  { area: 'habitos', change: 'Aumentar consistência de hábitos para 90%', magnitude: 0.9 },
  { area: 'financeiro', change: 'Reduzir gastos variáveis em 30%', magnitude: 0.3 },
  { area: 'fitness', change: 'Treinar 5x por semana', magnitude: 0.8 },
  { area: 'tarefas', change: 'Focar em 3 tarefas críticas por dia', magnitude: 0.7 },
  { area: 'foco', change: 'Adicionar 2h de deep work diário', magnitude: 0.6 },
];

const SCORE_COLOR = (s: number) => s >= 70 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';

interface LifeSimulatorProps {
  userContext?: object;
  orchestratorName?: string;
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3002';

export function LifeSimulator({ userContext = {}, orchestratorName = 'Youli' }: LifeSimulatorProps) {
  const [mode, setMode] = useState<Mode>('trajectory');
  const [horizon, setHorizon] = useState<Horizon>(90);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);
  const [whatIfResult, setWhatIfResult] = useState<{ current: SimResult; withChanges: SimResult; delta: string } | null>(null);
  const [selectedChanges, setSelectedChanges] = useState<WhatIfChange[]>([]);
  const [customChange, setCustomChange] = useState('');

  const runSimulation = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setWhatIfResult(null);
    try {
      if (mode === 'trajectory') {
        const res = await fetch(`${API_BASE}/api/simulate/scenario`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            snapshot: userContext,
            horizonDays: horizon,
            scenarioType: 'current_trajectory',
            orchestratorName,
          }),
        });
        setResult(await res.json());
      } else {
        const changes = [...selectedChanges];
        if (customChange.trim()) {
          changes.push({ area: 'geral', change: customChange.trim(), magnitude: 0.7 });
        }
        const res = await fetch(`${API_BASE}/api/simulate/what-if`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ snapshot: userContext, changes, horizonDays: horizon }),
        });
        setWhatIfResult(await res.json());
      }
    } catch (err) {
      console.error('[LifeSimulator]', err);
    } finally {
      setLoading(false);
    }
  }, [mode, horizon, userContext, orchestratorName, selectedChanges, customChange]);

  const toggleChange = (change: WhatIfChange) => {
    setSelectedChanges((prev) =>
      prev.find((c) => c.change === change.change)
        ? prev.filter((c) => c.change !== change.change)
        : [...prev, change]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <Text style={styles.title}>🔮 Simulador de Vida</Text>
        <Text style={styles.subtitle}>Ensaie o futuro antes de decidir — inspirado no MiroFish</Text>
      </Animated.View>

      {/* Mode toggle */}
      <Animated.View entering={FadeInDown.delay(100).springify().damping(24).stiffness(220).mass(0.9)} style={styles.modeRow}>
        {(['trajectory', 'whatif'] as Mode[]).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
            onPress={() => setMode(m)}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
              {m === 'trajectory' ? '📈 Trajetória Atual' : '🔄 E Se...?'}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Horizon selector */}
      <Animated.View entering={FadeInDown.delay(150).springify().damping(24).stiffness(220).mass(0.9)} style={styles.horizonRow}>
        {HORIZONS.map((h) => (
          <TouchableOpacity
            key={h.value}
            style={[styles.horizonChip, horizon === h.value && styles.horizonChipActive]}
            onPress={() => setHorizon(h.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.horizonText, horizon === h.value && styles.horizonTextActive]}>
              {h.label}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* What-if changes */}
      {mode === 'whatif' && (
        <Animated.View entering={FadeInDown.delay(200).springify().damping(24).stiffness(220).mass(0.9)} style={styles.changesSection}>
          <Text style={styles.sectionLabel}>Escolha as mudanças a simular</Text>
          {WHATIF_PRESETS.map((preset, i) => {
            const selected = !!selectedChanges.find((c) => c.change === preset.change);
            return (
              <TouchableOpacity
                key={i}
                style={[styles.changeChip, selected && styles.changeChipSelected]}
                onPress={() => toggleChange(preset)}
                activeOpacity={0.7}
              >
                <Text style={[styles.changeText, selected && styles.changeTextSelected]}>
                  {selected ? '✓ ' : ''}{preset.change}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TextInput
            style={styles.customInput}
            placeholder="Ou descreva sua própria mudança..."
            placeholderTextColor={tokens.colors.textMuted}
            value={customChange}
            onChangeText={setCustomChange}
            multiline
          />
        </Animated.View>
      )}

      {/* CTA */}
      <Animated.View entering={FadeInDown.delay(250).springify().damping(24).stiffness(220).mass(0.9)} style={styles.ctaRow}>
        <Button
          label={loading ? 'Simulando...' : `Simular ${HORIZONS.find(h => h.value === horizon)?.label}`}
          variant="primary"
          onPress={runSimulation}
          loading={loading}
          fullWidth
        />
      </Animated.View>

      {/* RESULTADO: Trajetória atual */}
      {result && !loading && (
        <Animated.View entering={FadeInDown.springify().damping(24).stiffness(220).mass(0.9)} style={styles.resultSection}>
          {/* Score geral */}
          <View style={[styles.scoreCard, { borderColor: SCORE_COLOR(result.overallScore) + '40' }]}>
            <Text style={[styles.scoreNumber, { color: SCORE_COLOR(result.overallScore) }]}>
              {result.overallScore}
            </Text>
            <View style={styles.scoreInfo}>
              <Text style={styles.scoreLabel}>Score de Vida em {result.horizonLabel}</Text>
              <Text style={styles.scoreTrend}>
                {result.overallTrend === 'improving' ? '📈 Melhorando' : result.overallTrend === 'declining' ? '📉 Em queda' : '→ Estável'}
              </Text>
            </View>
          </View>

          {/* Sumário do orquestrador */}
          <View style={styles.summaryBox}>
            <Text style={styles.summaryOrch}>{orchestratorName}</Text>
            <Text style={styles.summaryText}>{result.summary}</Text>
          </View>

          {/* Insight crítico */}
          <View style={styles.insightBox}>
            <Text style={styles.insightLabel}>💡 Insight Crítico</Text>
            <Text style={styles.insightText}>{result.criticalInsight}</Text>
          </View>

          {/* Top opportunity e risk */}
          <View style={styles.topRow}>
            <View style={[styles.topCard, { borderColor: '#22c55e40' }]}>
              <Text style={styles.topLabel}>✦ Oportunidade</Text>
              <Text style={[styles.topText, { color: '#22c55e' }]}>{result.topOpportunity}</Text>
            </View>
            <View style={[styles.topCard, { borderColor: '#f59e0b40' }]}>
              <Text style={styles.topLabel}>⚠ Risco</Text>
              <Text style={[styles.topText, { color: '#f59e0b' }]}>{result.topRisk}</Text>
            </View>
          </View>

          {/* Previsões por área */}
          <Text style={styles.sectionLabel}>Previsões por Área</Text>
          {result.predictions.map((pred, i) => (
            <SimulationCard key={i} {...pred} index={i} />
          ))}
        </Animated.View>
      )}

      {/* RESULTADO: What-if */}
      {whatIfResult && !loading && (
        <Animated.View entering={FadeInDown.springify().damping(24).stiffness(220).mass(0.9)} style={styles.resultSection}>
          <View style={styles.compareHeader}>
            <View style={styles.compareCol}>
              <Text style={styles.compareLabel}>ATUAL</Text>
              <Text style={[styles.compareScore, { color: SCORE_COLOR(whatIfResult.current.overallScore) }]}>
                {whatIfResult.current.overallScore}
              </Text>
            </View>
            <View style={styles.compareMiddle}>
              <Text style={styles.compareArrow}>VS</Text>
              <Text style={styles.compareDelta}>{whatIfResult.delta}</Text>
            </View>
            <View style={styles.compareCol}>
              <Text style={styles.compareLabel}>COM MUDANÇA</Text>
              <Text style={[styles.compareScore, { color: SCORE_COLOR(whatIfResult.withChanges.overallScore) }]}>
                {whatIfResult.withChanges.overallScore}
              </Text>
            </View>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryOrch}>{orchestratorName} projeta</Text>
            <Text style={styles.summaryText}>{whatIfResult.withChanges.summary}</Text>
          </View>

          <Text style={styles.sectionLabel}>Previsões com a mudança</Text>
          {whatIfResult.withChanges.predictions.map((pred, i) => (
            <SimulationCard key={i} {...pred} index={i} />
          ))}
        </Animated.View>
      )}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.background },
  header: { padding: tokens.spacing.md, gap: 4 },
  title: { fontSize: tokens.fontSize.xl, fontWeight: tokens.fontWeight.bold, color: tokens.colors.text },
  subtitle: { fontSize: tokens.fontSize.sm, color: tokens.colors.textMuted },
  modeRow: { flexDirection: 'row', paddingHorizontal: tokens.spacing.md, gap: tokens.spacing.sm, marginBottom: tokens.spacing.sm },
  modeBtn: { flex: 1, padding: tokens.spacing.sm, borderRadius: tokens.radii.md, borderWidth: 1, borderColor: tokens.colors.border, alignItems: 'center' },
  modeBtnActive: { backgroundColor: tokens.colors.primary, borderColor: tokens.colors.primary },
  modeBtnText: { fontSize: tokens.fontSize.sm, color: tokens.colors.textSecondary, fontWeight: tokens.fontWeight.medium },
  modeBtnTextActive: { color: '#FFF', fontWeight: tokens.fontWeight.bold },
  horizonRow: { flexDirection: 'row', paddingHorizontal: tokens.spacing.md, gap: tokens.spacing.xs, marginBottom: tokens.spacing.md },
  horizonChip: { paddingHorizontal: tokens.spacing.sm, paddingVertical: 6, borderRadius: tokens.radii.full, borderWidth: 1, borderColor: tokens.colors.border, backgroundColor: tokens.colors.surface },
  horizonChipActive: { borderColor: tokens.colors.primary, backgroundColor: tokens.colors.primary + '15' },
  horizonText: { fontSize: tokens.fontSize.xs, color: tokens.colors.textSecondary },
  horizonTextActive: { color: tokens.colors.primary, fontWeight: tokens.fontWeight.semibold },
  changesSection: { paddingHorizontal: tokens.spacing.md, gap: tokens.spacing.xs, marginBottom: tokens.spacing.md },
  sectionLabel: { fontSize: tokens.fontSize.xs, fontWeight: tokens.fontWeight.semibold, color: tokens.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: tokens.spacing.md, marginBottom: 4 },
  changeChip: { padding: tokens.spacing.sm, borderRadius: tokens.radii.md, borderWidth: 1, borderColor: tokens.colors.border, backgroundColor: tokens.colors.surface },
  changeChipSelected: { borderColor: tokens.colors.primary, backgroundColor: tokens.colors.primary + '10' },
  changeText: { fontSize: tokens.fontSize.sm, color: tokens.colors.textSecondary },
  changeTextSelected: { color: tokens.colors.primary, fontWeight: tokens.fontWeight.semibold },
  customInput: { backgroundColor: tokens.colors.surface, borderRadius: tokens.radii.md, borderWidth: 1, borderColor: tokens.colors.border, padding: tokens.spacing.sm, fontSize: tokens.fontSize.sm, color: tokens.colors.text, minHeight: 60 },
  ctaRow: { paddingHorizontal: tokens.spacing.md, marginBottom: tokens.spacing.lg },
  resultSection: { paddingHorizontal: tokens.spacing.md, gap: tokens.spacing.md },
  scoreCard: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md, backgroundColor: tokens.colors.surface, borderRadius: tokens.radii.lg, padding: tokens.spacing.md, borderWidth: 1 },
  scoreNumber: { fontSize: 52, fontWeight: tokens.fontWeight.bold, lineHeight: 60 },
  scoreInfo: { flex: 1 },
  scoreLabel: { fontSize: tokens.fontSize.sm, color: tokens.colors.textSecondary, fontWeight: tokens.fontWeight.semibold },
  scoreTrend: { fontSize: tokens.fontSize.sm, color: tokens.colors.textMuted },
  summaryBox: { backgroundColor: tokens.colors.primary + '10', borderRadius: tokens.radii.md, padding: tokens.spacing.md, gap: 4 },
  summaryOrch: { fontSize: tokens.fontSize.xs, color: tokens.colors.primary, fontWeight: tokens.fontWeight.semibold },
  summaryText: { fontSize: tokens.fontSize.sm, color: tokens.colors.text, lineHeight: 20 },
  insightBox: { backgroundColor: tokens.colors.surface, borderRadius: tokens.radii.md, padding: tokens.spacing.md, gap: 4, borderLeftWidth: 3, borderLeftColor: '#7C3AED' },
  insightLabel: { fontSize: tokens.fontSize.xs, color: '#7C3AED', fontWeight: tokens.fontWeight.semibold },
  insightText: { fontSize: tokens.fontSize.sm, color: tokens.colors.text, lineHeight: 20 },
  topRow: { flexDirection: 'row', gap: tokens.spacing.sm },
  topCard: { flex: 1, backgroundColor: tokens.colors.surface, borderRadius: tokens.radii.md, padding: tokens.spacing.sm, borderWidth: 1, gap: 4 },
  topLabel: { fontSize: 9, color: tokens.colors.textMuted, fontWeight: tokens.fontWeight.bold, letterSpacing: 0.5 },
  topText: { fontSize: tokens.fontSize.xs, lineHeight: 16 },
  compareHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: tokens.colors.surface, borderRadius: tokens.radii.lg, padding: tokens.spacing.md, gap: tokens.spacing.sm },
  compareCol: { flex: 1, alignItems: 'center', gap: 4 },
  compareLabel: { fontSize: 9, color: tokens.colors.textMuted, fontWeight: tokens.fontWeight.bold, letterSpacing: 0.8 },
  compareScore: { fontSize: 40, fontWeight: tokens.fontWeight.bold },
  compareMiddle: { alignItems: 'center', gap: 4 },
  compareArrow: { fontSize: tokens.fontSize.lg, color: tokens.colors.textMuted, fontWeight: tokens.fontWeight.bold },
  compareDelta: { fontSize: tokens.fontSize.xs, color: tokens.colors.textSecondary, textAlign: 'center', maxWidth: 120 },
});
