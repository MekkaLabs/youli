/**
 * AgentResponseCard — exibe resposta de um agente especializado inline
 * Usado nas telas de área (habitos, metas, tarefas, etc.)
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export interface AgentResponseData {
  agentName: string;
  agentEmoji: string;
  agentColor: string;
  message: string;
  insights: string[];
  actions: string[];
  urgency?: 'low' | 'medium' | 'high';
}

interface Props {
  response: AgentResponseData | null;
  loading?: boolean;
  onAction?: (action: string) => void;
  compact?: boolean;
}

const urgencyColors = { low: '#059669', medium: '#D97706', high: '#DC2626' };

export function AgentResponseCard({ response, loading, onAction, compact }: Props) {
  if (loading) {
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator size="small" color="#7C3AED" />
        <Text style={styles.loadingText}>Analisando...</Text>
      </View>
    );
  }

  if (!response) return null;

  const urgColor = urgencyColors[response.urgency ?? 'medium'];

  return (
    <Animated.View entering={FadeInDown.springify().damping(24).stiffness(200)} style={[styles.card, { borderLeftColor: response.agentColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>{response.agentEmoji}</Text>
        <Text style={[styles.agentName, { color: response.agentColor }]}>{response.agentName}</Text>
        {response.urgency && response.urgency !== 'low' && (
          <View style={[styles.urgencyBadge, { backgroundColor: urgColor + '22' }]}>
            <Text style={[styles.urgencyText, { color: urgColor }]}>
              {response.urgency === 'high' ? '🔴 Urgente' : '🟡 Médio'}
            </Text>
          </View>
        )}
      </View>

      {/* Mensagem principal */}
      <Text style={styles.message}>{response.message}</Text>

      {/* Insights */}
      {!compact && response.insights.length > 0 && (
        <View style={styles.insightsBlock}>
          {response.insights.slice(0, 2).map((ins, i) => (
            <View key={i} style={styles.insightRow}>
              <Text style={styles.insightDot}>›</Text>
              <Text style={styles.insightText}>{ins}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Ações */}
      {response.actions.length > 0 && (
        <View style={styles.actionsRow}>
          {response.actions.slice(0, compact ? 1 : 2).map((act, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.actionBtn, { borderColor: response.agentColor }]}
              onPress={() => onAction?.(act)}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionText, { color: response.agentColor }]} numberOfLines={2}>{act}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  loadingCard: {
    backgroundColor: '#111827', borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#1F2937',
  },
  loadingText: { color: '#6B7280', fontSize: 13 },
  card: {
    backgroundColor: '#111827', borderRadius: 14, padding: 14,
    borderLeftWidth: 3, gap: 10, borderWidth: 1, borderColor: '#1F2937',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerEmoji: { fontSize: 18 },
  agentName: { fontSize: 13, fontWeight: '800', flex: 1 },
  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  urgencyText: { fontSize: 11, fontWeight: '700' },
  message: { fontSize: 14, color: '#D1D5DB', lineHeight: 21 },
  insightsBlock: { gap: 5 },
  insightRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  insightDot: { color: '#6B7280', fontSize: 14, marginTop: 1 },
  insightText: { flex: 1, fontSize: 13, color: '#9CA3AF', lineHeight: 19 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1, flex: 1,
  },
  actionText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
