import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface MaintainabilityBadgeProps {
  score: number;     // 0-100
  verdict: 'sustainable' | 'moderate_risk' | 'high_risk';
  warnings: string[];
  compact?: boolean; // se true, mostra apenas o badge sem warnings
}

const VERDICT_COLORS: Record<MaintainabilityBadgeProps['verdict'], string> = {
  sustainable: '#00b894',
  moderate_risk: '#fdcb6e',
  high_risk: '#e17055',
};

const VERDICT_LABELS: Record<MaintainabilityBadgeProps['verdict'], string> = {
  sustainable: 'Sustentável',
  moderate_risk: 'Risco Moderado',
  high_risk: 'Alto Risco',
};

export function MaintainabilityBadge({
  score,
  verdict,
  warnings,
  compact = false,
}: MaintainabilityBadgeProps) {
  const color = VERDICT_COLORS[verdict];
  const size = compact ? 48 : 64;
  const borderRadius = size / 2;
  const fontSize = compact ? 14 : 18;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.badge,
          {
            width: size,
            height: size,
            borderRadius,
            borderColor: color,
          },
        ]}
      >
        <Text style={[styles.scoreText, { fontSize, color }]}>{score}</Text>
        <Text style={styles.emoji}>♻️</Text>
      </View>

      {!compact && (
        <View style={styles.details}>
          <Text style={[styles.verdictLabel, { color }]}>
            {VERDICT_LABELS[verdict]}
          </Text>
          {warnings.length > 0 && (
            <View style={styles.warningsList}>
              {warnings.map((w, i) => (
                <Text key={i} style={styles.warningText}>
                  ⚠️ {w}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  badge: {
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
  },
  scoreText: {
    fontWeight: '700',
    lineHeight: 20,
  },
  emoji: {
    fontSize: 10,
    lineHeight: 12,
  },
  details: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  verdictLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  warningsList: {
    gap: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#636e72',
    lineHeight: 16,
  },
});
