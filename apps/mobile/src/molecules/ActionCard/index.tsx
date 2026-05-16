/**
 * ActionCard — Human-in-the-Loop approval card
 * Exibido inline no CopilotBar quando um agente propõe uma ação de alto risco.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, radii, fontSize, fontWeight, shadows } from '../../theme/tokens';

export interface ActionCardData {
  id: string;
  title: string;
  description: string;
  impact: string;
  agentName: string;
  agentEmoji: string;
  agentColor: string;
}

export interface ActionCardProps extends ActionCardData {
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onModify?: (id: string) => void;
}

export function ActionCard({
  id,
  title,
  description,
  impact,
  agentName,
  agentEmoji,
  agentColor,
  onApprove,
  onReject,
  onModify,
}: ActionCardProps) {
  return (
    <Animated.View entering={FadeInDown.duration(300)} style={[styles.card, { borderLeftColor: agentColor }]}>
      {/* Header: agente */}
      <View style={styles.header}>
        <Text style={styles.agentEmoji}>{agentEmoji}</Text>
        <Text style={[styles.agentName, { color: agentColor }]}>{agentName}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Aguardando aprovação</Text>
        </View>
      </View>

      {/* Título */}
      <Text style={styles.title}>{title}</Text>

      {/* Descrição */}
      <Text style={styles.description}>{description}</Text>

      {/* Impacto */}
      <View style={styles.impactRow}>
        <Text style={styles.impactIcon}>📈</Text>
        <Text style={styles.impactText}>{impact}</Text>
      </View>

      {/* Botões de ação */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.btnApprove]}
          onPress={() => onApprove(id)}
          activeOpacity={0.8}
        >
          <Text style={styles.btnApproveText}>Aprovar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnReject]}
          onPress={() => onReject(id)}
          activeOpacity={0.8}
        >
          <Text style={styles.btnRejectText}>Rejeitar</Text>
        </TouchableOpacity>

        {onModify && (
          <TouchableOpacity
            style={[styles.btn, styles.btnModify]}
            onPress={() => onModify(id)}
            activeOpacity={0.8}
          >
            <Text style={styles.btnModifyText}>Modificar</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    padding: spacing.md,
    marginVertical: spacing.xs,
    gap: spacing.sm,
    ...shadows.md,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  agentEmoji: {
    fontSize: fontSize.lg,
  },
  agentName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    flex: 1,
  },
  badge: {
    backgroundColor: colors.warningBg,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
  },

  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    lineHeight: 22,
  },

  description: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },

  impactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.successBg,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  impactIcon: {
    fontSize: fontSize.sm,
  },
  impactText: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: fontWeight.medium,
    flex: 1,
    lineHeight: 18,
  },

  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },

  btn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  btnApprove: {
    backgroundColor: colors.success,
    flex: 1,
  },
  btnApproveText: {
    color: colors.inverse,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },

  btnReject: {
    backgroundColor: colors.danger,
    flex: 1,
  },
  btnRejectText: {
    color: colors.inverse,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },

  btnModify: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
  },
  btnModifyText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
