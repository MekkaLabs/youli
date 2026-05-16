/**
 * Insights — padrões de vida gerados por IA
 * Sócrates analisa hábitos, metas, finanças e padrões cross-área
 */
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullScrollLayout } from '../../src/templates/FullScrollLayout';
import { AgentBadge } from '../../src/atoms/AgentBadge';
import { useAgentAction } from '../../src/hooks/useAgentAction';
import { useInsights, AIInsight } from '../../src/hooks/useInsights';
import { CrossAreaInsights } from '../../src/organisms/CrossAreaInsights';

const SOCRATES = {
  name: 'Sócrates',
  fullName: 'Sócrates de Atenas',
  emoji: '🦉',
  color: '#0EA5E9',
  domain: 'Autoconhecimento',
};

const TYPE_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  productivity: { color: '#3B82F6', bg: '#1E3A5F22', icon: '⚡' },
  finance:      { color: '#059669', bg: '#0D2B1A22', icon: '💰' },
  health:       { color: '#7C3AED', bg: '#2D1B6922', icon: '💪' },
  warning:      { color: '#D97706', bg: '#2B1D0022', icon: '⚠️' },
  achievement:  { color: '#DC2626', bg: '#2B000022', icon: '🏆' },
  pattern:      { color: '#0EA5E9', bg: '#0D203022', icon: '🔮' },
};

function TrendBadge({ trend }: { trend?: 'up' | 'down' | 'stable' }) {
  if (!trend) return null;
  const map = { up: { icon: '↗', color: '#059669' }, down: { icon: '↘', color: '#DC2626' }, stable: { icon: '→', color: '#6B7280' } };
  const t = map[trend];
  return <Text style={[styles.trend, { color: t.color }]}>{t.icon}</Text>;
}

function InsightCardAI({ insight, index }: { insight: AIInsight; index: number }) {
  const cfg = TYPE_CONFIG[insight.type] ?? TYPE_CONFIG.pattern;
  return (
    <Animated.View entering={FadeInDown.delay(index * 80)} style={[styles.card, { borderLeftColor: cfg.color }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.typeBadgeText, { color: cfg.color }]}>{cfg.icon} {insight.type}</Text>
        </View>
        <View style={styles.agentRow}>
          <Text style={styles.agentEmoji}>{insight.agentEmoji}</Text>
          <Text style={styles.agentName}>{insight.agent}</Text>
        </View>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.cardTitle}>{insight.title}</Text>
        {insight.score !== undefined && (
          <View style={styles.scoreChip}>
            <Text style={[styles.scoreText, { color: cfg.color }]}>{insight.score}</Text>
            <TrendBadge trend={insight.trend} />
          </View>
        )}
      </View>

      <Text style={styles.cardContent}>{insight.content}</Text>

      <View style={styles.actions}>
        {insight.actions.map((action, i) => (
          <TouchableOpacity key={i} style={[styles.actionBtn, { borderColor: cfg.color }]}>
            <Text style={[styles.actionText, { color: cfg.color }]}>{action}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
}

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const onAgentPress = useAgentAction('insights', SOCRATES.name);
  const { insights, loading, lastUpdated, refresh } = useInsights();
  const [energyFilter, setEnergyFilter] = React.useState<'all' | 'alta' | 'media' | 'baixa'>('all');

  const filtered = energyFilter === 'all' ? insights : insights.filter(i => i.energy === energyFilter);

  function timeLabel(iso: string | null) {
    if (!iso) return '';
    const diff = (Date.now() - new Date(iso).getTime()) / 60000;
    if (diff < 1) return 'agora';
    if (diff < 60) return `${Math.round(diff)}min atrás`;
    return `${Math.round(diff / 60)}h atrás`;
  }

  const filterOpts = [
    { key: 'all' as const, label: 'Todos' },
    { key: 'alta' as const, label: '🔥 Alto impacto' },
    { key: 'media' as const, label: '🔋 Médio' },
    { key: 'baixa' as const, label: '😴 Baixo' },
  ];

  return (
    <FullScrollLayout
      title="Insights"
      subtitle="Padrões que revelam oportunidades"
      paddingBottom={insets.bottom + 90}
      rightAction={<AgentBadge {...SOCRATES} compact onPress={onAgentPress} />}
    >
      {/* Life Balance cross-area */}
      <CrossAreaInsights compact />

      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>
          {loading ? 'Analisando...' : `${insights.length} insights${lastUpdated ? ` · ${timeLabel(lastUpdated)}` : ''}`}
        </Text>
        <TouchableOpacity onPress={refresh} style={styles.refreshBtn} disabled={loading}>
          {loading
            ? <ActivityIndicator size={14} color="#0EA5E9" />
            : <Text style={styles.refreshText}>↻ Atualizar</Text>}
        </TouchableOpacity>
      </View>

      {/* Energy filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.filterRow}>
          {filterOpts.map(o => (
            <TouchableOpacity
              key={o.key}
              onPress={() => setEnergyFilter(o.key)}
              style={[styles.filterChip, energyFilter === o.key && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, energyFilter === o.key && styles.filterTextActive]}>
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Insights */}
      {loading && insights.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#0EA5E9" />
          <Text style={styles.loadingText}>Sócrates analisando seus dados...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>🦉</Text>
          <Text style={styles.emptyText}>Nenhum insight neste filtro</Text>
        </View>
      ) : (
        filtered.map((insight, i) => (
          <InsightCardAI key={insight.id} insight={insight} index={i} />
        ))
      )}
    </FullScrollLayout>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#0D2030', borderRadius: 8, borderWidth: 1, borderColor: '#1E3A5F' },
  refreshText: { fontSize: 12, color: '#60A5FA', fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: '#111827', borderWidth: 1, borderColor: '#1F2937' },
  filterChipActive: { backgroundColor: '#0D2030', borderColor: '#0EA5E9' },
  filterText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  filterTextActive: { color: '#38BDF8', fontWeight: '700' },
  card: {
    backgroundColor: '#111827', borderRadius: 14, padding: 14,
    borderLeftWidth: 3, gap: 10, borderWidth: 1, borderColor: '#1F2937',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  agentRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  agentEmoji: { fontSize: 14 },
  agentName: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: '#F9FAFB' },
  scoreChip: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#1F2937', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  scoreText: { fontSize: 14, fontWeight: '900' },
  trend: { fontSize: 14, fontWeight: '800' },
  cardContent: { fontSize: 13, color: '#9CA3AF', lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  actionText: { fontSize: 12, fontWeight: '700' },
  loadingWrap: { alignItems: 'center', gap: 12, paddingVertical: 32 },
  loadingText: { fontSize: 14, color: '#6B7280' },
  emptyWrap: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyEmoji: { fontSize: 36 },
  emptyText: { fontSize: 14, color: '#6B7280' },
});
