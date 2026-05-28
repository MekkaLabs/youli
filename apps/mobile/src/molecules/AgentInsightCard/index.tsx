/**
 * AgentInsightCard
 * Card que mostra a resposta de um agente especializado
 * com identidade visual do agente histórico
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Animated, {
  FadeInDown,
  SlideInRight,
} from 'react-native-reanimated';
import { tokens } from '../../theme/tokens';

export interface AgentInsightCardProps {
  agentName: string;        // Ex: "Leonardo"
  agentFullName?: string;   // Ex: "Leonardo da Vinci"
  agentEmoji: string;
  agentColor: string;
  orchestratorName?: string; // Nome do orquestrador (ex: "Jarvis")
  message: string;
  insights: string[];
  actions: string[];
  urgency?: 'low' | 'medium' | 'high';
  synthesis?: string;       // Síntese do orquestrador
  suggestedAgents?: { name: string; emoji: string; area: string; reason: string }[];
  onActionPress?: (action: string) => void;
  onSuggestedAgentPress?: (area: string) => void;
  style?: object;
}

export function AgentInsightCard({
  agentName,
  agentFullName,
  agentEmoji,
  agentColor,
  orchestratorName = 'Youli',
  message,
  insights,
  actions,
  urgency = 'medium',
  synthesis,
  suggestedAgents = [],
  onActionPress,
  onSuggestedAgentPress,
  style,
}: AgentInsightCardProps) {
  const [expanded, setExpanded] = useState(false);

  const urgencyColors = {
    low: tokens.colors.success,
    medium: tokens.colors.accent,
    high: tokens.colors.danger,
  };

  const urgencyLabels = {
    low: 'Tranquilo',
    medium: 'Atenção',
    high: '⚠️ Urgente',
  };

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(24).stiffness(220).mass(0.9)}
      style={[styles.container, style]}
    >
      {/* Header do agente */}
      <View style={[styles.header, { borderLeftColor: agentColor, borderLeftWidth: 3 }]}>
        <View style={[styles.agentAvatar, { backgroundColor: agentColor + '20' }]}>
          <Text style={styles.agentEmoji}>{agentEmoji}</Text>
        </View>
        <View style={styles.agentInfo}>
          <View style={styles.agentNameRow}>
            <Text style={[styles.agentName, { color: agentColor }]}>{agentName}</Text>
            <View style={[styles.urgencyBadge, { backgroundColor: urgencyColors[urgency] + '20' }]}>
              <Text style={[styles.urgencyText, { color: urgencyColors[urgency] }]}>
                {urgencyLabels[urgency]}
              </Text>
            </View>
          </View>
          {agentFullName && (
            <Text style={styles.agentFullName}>{agentFullName}</Text>
          )}
        </View>
      </View>

      {/* Síntese do orquestrador (se houver) */}
      {synthesis && (
        <View style={styles.synthesisBlock}>
          <Text style={styles.synthesisLabel}>🤖 {orchestratorName}</Text>
          <Text style={styles.synthesisText}>{synthesis}</Text>
        </View>
      )}

      {/* Mensagem principal do agente */}
      <Text style={styles.message}>{message}</Text>

      {/* Insights */}
      {insights.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Insights</Text>
          {insights.map((insight, i) => (
            <Animated.View
              key={i}
              entering={SlideInRight.delay(i * 80).springify().damping(24).stiffness(220).mass(0.9)}
              style={styles.insightRow}
            >
              <View style={[styles.insightDot, { backgroundColor: agentColor }]} />
              <Text style={styles.insightText}>{insight}</Text>
            </Animated.View>
          ))}
        </View>
      )}

      {/* Ações */}
      {actions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Ações Recomendadas</Text>
          {actions.map((action, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.actionButton, { borderColor: agentColor + '40', backgroundColor: agentColor + '08' }]}
              onPress={() => onActionPress?.(action)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionCheck}>→</Text>
              <Text style={[styles.actionText, { color: agentColor }]}>{action}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Agentes sugeridos */}
      {suggestedAgents.length > 0 && (
        <View style={styles.suggestedSection}>
          <Text style={styles.sectionTitle}>Consultar também</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.suggestedRow}>
              {suggestedAgents.map((agent, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.suggestedChip}
                  onPress={() => onSuggestedAgentPress?.(agent.area)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestedEmoji}>{agent.emoji}</Text>
                  <Text style={styles.suggestedName}>{agent.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    paddingLeft: tokens.spacing.sm,
  },
  agentAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentEmoji: {
    fontSize: 22,
  },
  agentInfo: {
    flex: 1,
  },
  agentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  agentName: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
  },
  agentFullName: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textMuted,
    marginTop: 1,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radii.full,
  },
  urgencyText: {
    fontSize: 9,
    fontWeight: tokens.fontWeight.semibold,
    letterSpacing: 0.3,
  },
  synthesisBlock: {
    backgroundColor: tokens.colors.surfaceAlt || '#F8F9FA',
    borderRadius: tokens.radii.md,
    padding: tokens.spacing.sm,
    gap: 4,
  },
  synthesisLabel: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textMuted,
    fontWeight: tokens.fontWeight.semibold,
  },
  synthesisText: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.text,
    lineHeight: 18,
  },
  message: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.text,
    lineHeight: 20,
  },
  section: {
    gap: tokens.spacing.xs,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.xs,
  },
  insightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    flexShrink: 0,
  },
  insightText: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radii.md,
    borderWidth: 1,
  },
  actionCheck: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
  },
  actionText: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    flex: 1,
  },
  suggestedSection: {
    gap: tokens.spacing.xs,
  },
  suggestedRow: {
    flexDirection: 'row',
    gap: tokens.spacing.xs,
  },
  suggestedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: tokens.colors.surfaceDim || '#F0F0F0',
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radii.full,
  },
  suggestedEmoji: {
    fontSize: 14,
  },
  suggestedName: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textSecondary,
    fontWeight: tokens.fontWeight.medium,
  },
});
