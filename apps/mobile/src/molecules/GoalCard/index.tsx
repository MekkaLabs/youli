/**
 * GoalCard — card de meta com:
 * - Barra de progresso animada + percentual
 * - Marcos visuais (milestones) como pontos na barra
 * - Dias restantes + ritmo (on track / at risk)
 * - Mini gráfico de evolução semanal
 * - Alexandre comentando o progresso
 */

import React, { memo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  TextInput,
} from 'react-native';
import Animated from 'react-native-reanimated';
import type { GoalData } from '../../hooks/useGoals';
import { motionEnter, iosTiming } from '../../theme/motion';

interface GoalCardProps {
  goal: GoalData;
  index?: number;
  status: 'active' | 'completed' | 'paused' | 'at_risk';
  progressPercent: number;
  daysUntil: number;
  onUpdateProgress?: (value: number) => void;
}

const STATUS_CONFIG = {
  active: { label: 'No ritmo', color: '#059669', bg: '#0F1E16' },
  completed: { label: 'Concluída! 🎉', color: '#7C3AED', bg: '#1A1030' },
  paused: { label: 'Pausada', color: '#6B7280', bg: '#1F2937' },
  at_risk: { label: 'Em risco ⚠️', color: '#DC2626', bg: '#1E0F0F' },
};

function formatValue(value: number, unit: string): string {
  if (unit === 'R$') return `R$ ${value.toLocaleString('pt-BR')}`;
  if (unit === '%') return `${value}%`;
  return `${value} ${unit}`;
}

function getAlexandreComment(percent: number, daysLeft: number, status: string): string {
  if (status === 'completed') return 'Vitória! Alexandre diria: "Não existe impossível para quem tenta." Você provou isso.';
  if (status === 'at_risk') return 'Sua meta está em risco. Alexandre nunca recuou na batalha — reagrupe e ataque com mais intensidade agora.';
  if (percent >= 75) return 'Estamos na reta final. Alexandre: "Não há vitória sem esforço, e você já foi longe demais para parar."';
  if (percent >= 50) return 'Metade do caminho percorrido. A segunda metade sempre parece mais difícil — mas você já provou que consegue.';
  if (percent >= 25) return 'Bom começo. Alexandre conquistou a Pérsia um passo de cada vez. Continue avançando.';
  return 'A jornada começa com o primeiro passo. Você já deu o seu — agora mantenha o ritmo.';
}

function GoalCard({ goal, index = 0, status, progressPercent, daysUntil, onUpdateProgress }: GoalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [inputValue, setInputValue] = useState(String(goal.currentValue));

  const statusCfg = STATUS_CONFIG[status];

  // Milestones como posições na barra
  const milestonePositions = goal.milestones.map(m => ({
    ...m,
    position: Math.min(100, Math.round((m.targetValue / goal.targetValue) * 100)),
    reached: !!m.reachedAt,
  }));

  // Mini sparkline dos últimos 6 pontos
  const sparkData = goal.weeklyUpdates.slice(-6).map(u => u.value);
  const sparkMax = Math.max(...sparkData, goal.targetValue);
  const sparkMin = Math.min(...sparkData, 0);
  const sparkRange = sparkMax - sparkMin || 1;

  const handleExpand = () => {
    LayoutAnimation.configureNext({
      duration: iosTiming.normal,
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
    setExpanded(e => !e);
  };

  const handleUpdateSubmit = () => {
    const v = parseFloat(inputValue.replace(',', '.'));
    if (!isNaN(v)) {
      onUpdateProgress?.(v);
      setShowUpdate(false);
    }
  };

  return (
    <Animated.View entering={motionEnter.cardDown(index * 45)}>
      <View style={[styles.card, status === 'at_risk' && styles.cardAtRisk, status === 'completed' && styles.cardCompleted]}>

        {/* ── Cabeçalho ─────────────────────────────── */}
        <TouchableOpacity onPress={handleExpand} activeOpacity={0.8}>
          <View style={styles.header}>
            <Text style={styles.emoji}>{goal.emoji}</Text>
            <View style={styles.titleBlock}>
              <Text style={styles.title} numberOfLines={1}>{goal.title}</Text>
              <View style={styles.metaRow}>
                <View style={[styles.statusChip, { backgroundColor: statusCfg.bg }]}>
                  <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                </View>
                <Text style={styles.deadline}>
                  {daysUntil > 0 ? `${daysUntil}d restantes` : daysUntil === 0 ? 'Hoje!' : `${Math.abs(daysUntil)}d atraso`}
                </Text>
              </View>
            </View>
            <View style={styles.percentBlock}>
              <Text style={[styles.percent, { color: goal.color }]}>{progressPercent}%</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── Barra de progresso com marcos ─────────── */}
        <View style={styles.barSection}>
          <View style={styles.barBg}>
            {/* Preenchimento */}
            <View style={[styles.barFill, { width: `${progressPercent}%` as `${number}%`, backgroundColor: goal.color }]} />

            {/* Marcos na barra */}
            {milestonePositions.map(m => (
              <View
                key={m.id}
                style={[
                  styles.milestoneDot,
                  { left: `${m.position}%` as `${number}%` },
                  m.reached && { backgroundColor: goal.color },
                ]}
              />
            ))}
          </View>

          {/* Labels de valor */}
          <View style={styles.barLabels}>
            <Text style={styles.barLabelCurrent}>{formatValue(goal.currentValue, goal.unit)}</Text>
            <Text style={styles.barLabelTarget}>{formatValue(goal.targetValue, goal.unit)}</Text>
          </View>
        </View>

        {/* ── Marcos lista rápida ──────────────────── */}
        <View style={styles.milestonesRow}>
          {milestonePositions.map(m => (
            <View key={m.id} style={styles.milestoneItem}>
              <View style={[styles.milestoneBullet, { backgroundColor: m.reached ? goal.color : '#374151' }]}>
                {m.reached && <Text style={styles.milestoneCheck}>✓</Text>}
              </View>
              <Text style={[styles.milestoneName, m.reached && { color: goal.color }]} numberOfLines={1}>
                {m.title}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Expandido: sparkline + Alexandre + atualizar ── */}
        {expanded && (
          <View style={styles.expandSection}>
            <View style={styles.expandDivider} />

            {/* Sparkline */}
            {sparkData.length > 1 && (
              <View style={styles.sparkSection}>
                <Text style={styles.sparkLabel}>Evolução (últimas semanas)</Text>
                <View style={styles.spark}>
                  {sparkData.map((v, i) => {
                    const h = Math.max(4, Math.round(((v - sparkMin) / sparkRange) * 40));
                    return (
                      <View key={i} style={styles.sparkBarWrap}>
                        <View style={[styles.sparkBar, { height: h, backgroundColor: goal.color + (i === sparkData.length - 1 ? 'FF' : '66') }]} />
                        <Text style={styles.sparkVal}>{v}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Alexandre comment */}
            <View style={[styles.agentBox, { backgroundColor: statusCfg.bg }]}>
              <Text style={styles.agentTag}>⚔️ Alexandre</Text>
              <Text style={styles.agentText}>{getAlexandreComment(progressPercent, daysUntil, status)}</Text>
            </View>

            {/* Atualizar progresso */}
            {!showUpdate ? (
              <TouchableOpacity style={[styles.updateBtn, { borderColor: goal.color }]} onPress={() => setShowUpdate(true)}>
                <Text style={[styles.updateBtnText, { color: goal.color }]}>📊 Atualizar progresso</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.updateForm}>
                <Text style={styles.updateLabel}>Novo valor ({goal.unit})</Text>
                <View style={styles.updateRow}>
                  <TextInput
                    style={styles.updateInput}
                    value={inputValue}
                    onChangeText={setInputValue}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                  <TouchableOpacity style={[styles.updateSaveBtn, { backgroundColor: goal.color }]} onPress={handleUpdateSubmit}>
                    <Text style={styles.updateSaveBtnText}>Salvar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowUpdate(false)} style={styles.updateCancelBtn}>
                    <Text style={styles.updateCancelText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Expand indicator */}
        <TouchableOpacity onPress={handleExpand} style={styles.expandIndicator}>
          <Text style={styles.expandText}>{expanded ? '▲ fechar' : '▼ detalhes'}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#1F2937', gap: 12,
  },
  cardAtRisk: { borderColor: '#DC2626', borderWidth: 1.5 },
  cardCompleted: { borderColor: '#7C3AED', borderWidth: 1.5 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emoji: { fontSize: 32, lineHeight: 38 },
  titleBlock: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: '700', color: '#F9FAFB' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  statusText: { fontSize: 11, fontWeight: '700' },
  deadline: { fontSize: 11, color: '#6B7280' },
  percentBlock: { alignItems: 'flex-end' },
  percent: { fontSize: 22, fontWeight: '900' },

  barSection: { gap: 6 },
  barBg: { height: 8, backgroundColor: '#1F2937', borderRadius: 99, overflow: 'visible', position: 'relative' },
  barFill: { height: '100%', borderRadius: 99, position: 'absolute', left: 0, top: 0 },
  milestoneDot: {
    position: 'absolute', top: -2, width: 12, height: 12,
    borderRadius: 6, backgroundColor: '#374151', marginLeft: -6,
    borderWidth: 2, borderColor: '#111827',
  },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabelCurrent: { fontSize: 12, color: '#E5E7EB', fontWeight: '600' },
  barLabelTarget: { fontSize: 12, color: '#6B7280' },

  milestonesRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  milestoneItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  milestoneBullet: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  milestoneCheck: { fontSize: 9, color: '#FFF', fontWeight: '900' },
  milestoneName: { fontSize: 11, color: '#4B5563', flexShrink: 1 },

  expandSection: { gap: 12 },
  expandDivider: { height: 1, backgroundColor: '#1F2937' },

  sparkSection: { gap: 8 },
  sparkLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  spark: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 52 },
  sparkBarWrap: { flex: 1, alignItems: 'center', gap: 4 },
  sparkBar: { width: '100%', borderRadius: 3, minHeight: 4 },
  sparkVal: { fontSize: 8, color: '#4B5563', textAlign: 'center' },

  agentBox: { borderRadius: 10, padding: 12, gap: 4 },
  agentTag: { fontSize: 11, color: '#DC2626', fontWeight: '700' },
  agentText: { fontSize: 12, color: '#9CA3AF', lineHeight: 18, fontStyle: 'italic' },

  updateBtn: { borderRadius: 10, borderWidth: 1.5, padding: 12, alignItems: 'center' },
  updateBtnText: { fontSize: 14, fontWeight: '700' },
  updateForm: { gap: 8 },
  updateLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  updateRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  updateInput: {
    flex: 1, backgroundColor: '#1F2937', borderRadius: 10, padding: 10,
    fontSize: 16, fontWeight: '700', color: '#F9FAFB', borderWidth: 1, borderColor: '#374151',
  },
  updateSaveBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  updateSaveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  updateCancelBtn: { padding: 10 },
  updateCancelText: { color: '#6B7280', fontSize: 16 },

  expandIndicator: { alignItems: 'center', paddingTop: 4 },
  expandText: { fontSize: 11, color: '#4B5563' },
});

export default memo(GoalCard);
