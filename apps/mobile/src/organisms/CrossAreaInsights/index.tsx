/**
 * CrossAreaInsights — painel de padrões cross-área
 * Mostra correlações entre hábitos, metas e finanças detectadas pelo useLifePatterns
 * Usado no Dashboard como seção de inteligência sistêmica
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useLifePatterns, LifePattern, PatternSeverity } from '../../hooks/useLifePatterns';
import { useRouter } from 'expo-router';

const AREA_LABEL: Record<string, string> = {
  habitos: '🏛️ Hábitos',
  metas: '⚔️ Metas',
  financeiro: '💰 Financeiro',
  produtividade: '⚡ Produtividade',
};

const SEVERITY_BG: Record<PatternSeverity, string> = {
  positive: '#0F2E1F',
  warning: '#1E1507',
  critical: '#1E0F0F',
  info: '#1A1040',
};

const SEVERITY_ICON: Record<PatternSeverity, string> = {
  positive: '✅',
  warning: '⚠️',
  critical: '🔴',
  info: '💡',
};

interface PatternCardProps {
  pattern: LifePattern;
  index: number;
  onAction?: (screen: string) => void;
}

function PatternCard({ pattern, index, onAction }: PatternCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 70).springify().damping(24).stiffness(220).mass(0.9)}
      style={[styles.card, { borderLeftColor: pattern.color, backgroundColor: SEVERITY_BG[pattern.severity] }]}
    >
      <TouchableOpacity onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardAgent}>{pattern.agentEmoji} {pattern.agent}</Text>
          <View style={styles.areaRow}>
            {pattern.areas.slice(0, 2).map(a => (
              <View key={a} style={[styles.areaChip, { borderColor: pattern.color + '44' }]}>
                <Text style={[styles.areaChipText, { color: pattern.color }]}>{AREA_LABEL[a]}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={styles.cardTitle}>{pattern.title}</Text>
        {expanded && (
          <Animated.Text entering={FadeIn} style={styles.cardDesc}>{pattern.description}</Animated.Text>
        )}
        {!expanded && (
          <Text style={styles.cardDescCollapsed} numberOfLines={2}>{pattern.description}</Text>
        )}
      </TouchableOpacity>

      {pattern.actionLabel && pattern.actionScreen && (
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: pattern.color }]}
          onPress={() => onAction?.(pattern.actionScreen!)}
        >
          <Text style={[styles.actionBtnText, { color: pattern.color }]}>{pattern.actionLabel} →</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ── Score ring mini ────────────────────────────────────────────────────────
interface ScoreRingProps {
  score: number;
  size?: number;
}

function ScoreRing({ score, size = 56 }: ScoreRingProps) {
  const color = score >= 80 ? '#059669' : score >= 60 ? '#D97706' : '#DC2626';
  return (
    <View style={[styles.scoreRing, { width: size, height: size, borderColor: color }]}>
      <Text style={[styles.scoreNum, { color }]}>{score}</Text>
      <Text style={styles.scoreLabel}>%</Text>
    </View>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export function CrossAreaInsights({ compact = false }: { compact?: boolean }) {
  const { patterns, lifeBalance, positiveCount, warningCount } = useLifePatterns();
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);

  const defaultCount = compact ? 2 : 3;
  const displayed = showAll ? patterns : patterns.slice(0, defaultCount);

  const handleAction = (screen: string) => {
    try {
      router.push(screen as any);
    } catch {}
  };

  if (patterns.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(100)} style={styles.root}>
      {/* Header com score geral */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>🧠 Padrões cross-área</Text>
          <Text style={styles.headerSub}>
            {positiveCount} {positiveCount === 1 ? 'insight positivo' : 'insights positivos'}
            {warningCount > 0 ? ` · ${warningCount} atenção` : ''}
          </Text>
        </View>
        <ScoreRing score={lifeBalance} />
      </View>

      {/* Cards de padrão */}
      <View style={styles.cards}>
        {displayed.map((p, i) => (
          <PatternCard key={p.id} pattern={p} index={i} onAction={handleAction} />
        ))}
      </View>

      {/* Ver mais / menos */}
      {patterns.length > defaultCount && (
        <TouchableOpacity onPress={() => setShowAll(v => !v)} style={styles.showMoreBtn}>
          <Text style={styles.showMoreText}>
            {showAll ? 'Ver menos' : `Ver todos (${patterns.length})`}
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111827', borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: '#1F2937',
  },
  headerLeft: { gap: 4 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: '#F9FAFB' },
  headerSub: { fontSize: 12, color: '#6B7280' },
  scoreRing: {
    borderRadius: 99, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 1,
  },
  scoreNum: { fontSize: 18, fontWeight: '900' },
  scoreLabel: { fontSize: 10, color: '#6B7280', marginTop: 4 },
  cards: { gap: 10 },
  card: {
    borderRadius: 14, padding: 14,
    borderLeftWidth: 3, gap: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardAgent: { fontSize: 11, color: '#6B7280', fontWeight: '700' },
  areaRow: { flexDirection: 'row', gap: 4 },
  areaChip: {
    borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1,
  },
  areaChipText: { fontSize: 9, fontWeight: '700' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#F9FAFB', lineHeight: 20 },
  cardDesc: { fontSize: 13, color: '#9CA3AF', lineHeight: 19 },
  cardDescCollapsed: { fontSize: 13, color: '#6B7280', lineHeight: 19 },
  actionBtn: {
    alignSelf: 'flex-start', borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 5, marginTop: 4,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
  showMoreBtn: { paddingVertical: 10, alignItems: 'center' },
  showMoreText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
});
