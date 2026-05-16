import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface EvolutionPoint {
  timestamp: string;
  value: number;
  delta: number;
}

export interface EvolutionChartProps {
  area: string;
  metric: string;
  points: EvolutionPoint[];
  trendLabel: 'strong_up' | 'up' | 'flat' | 'down' | 'strong_down';
  patternInsight: string;
}

const TREND_CONFIG: Record<
  EvolutionChartProps['trendLabel'],
  { emoji: string; label: string; color: string }
> = {
  strong_up: { emoji: '⬆️', label: 'Melhorando muito', color: '#22c55e' },
  up: { emoji: '⬆️', label: 'Melhorando', color: '#4ade80' },
  flat: { emoji: '➡️', label: 'Estável', color: '#94a3b8' },
  down: { emoji: '⬇️', label: 'Piorando', color: '#f97316' },
  strong_down: { emoji: '⬇️', label: 'Piorando muito', color: '#ef4444' },
};

function getDotColor(delta: number): string {
  if (delta > 0) return '#22c55e';
  if (delta < 0) return '#ef4444';
  return '#94a3b8';
}

export function EvolutionChart({
  area,
  metric,
  points,
  trendLabel,
  patternInsight,
}: EvolutionChartProps): React.JSX.Element {
  const visiblePoints = points.slice(-10);
  const trend = TREND_CONFIG[trendLabel];

  const values = visiblePoints.map((p) => p.value);
  const minVal = values.length > 0 ? Math.min(...values) : 0;
  const maxVal = values.length > 0 ? Math.max(...values) : 1;
  const range = maxVal - minVal || 1;

  const CHART_HEIGHT = 60;
  const DOT_SIZE = 6;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.area}>{area}</Text>
        <Text style={styles.metric}>{metric}</Text>
      </View>

      {/* Mini chart */}
      {visiblePoints.length > 0 ? (
        <View style={[styles.chartArea, { height: CHART_HEIGHT + DOT_SIZE }]}>
          {visiblePoints.map((point, index) => {
            const normalizedHeight =
              values.length > 1
                ? ((point.value - minVal) / range) * CHART_HEIGHT
                : CHART_HEIGHT / 2;
            const dotColor = getDotColor(point.delta);

            const nextPoint = visiblePoints[index + 1];
            const hasNext = nextPoint !== undefined;
            const nextNormalized = hasNext
              ? ((nextPoint.value - minVal) / range) * CHART_HEIGHT
              : 0;

            const columnWidth = 100 / visiblePoints.length;

            return (
              <View
                key={`${point.timestamp}-${index}`}
                style={[
                  styles.pointColumn,
                  { width: `${columnWidth}%` as unknown as number },
                ]}
              >
                {/* Connector line to next point */}
                {hasNext && (
                  <View
                    style={[
                      styles.connector,
                      {
                        bottom: normalizedHeight + DOT_SIZE / 2,
                        height: 2,
                        backgroundColor: dotColor,
                      },
                    ]}
                  />
                )}
                {/* Dot */}
                <View
                  style={[
                    styles.dot,
                    {
                      bottom: normalizedHeight,
                      backgroundColor: dotColor,
                      width: DOT_SIZE,
                      height: DOT_SIZE,
                      borderRadius: DOT_SIZE / 2,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      ) : (
        <View style={[styles.chartArea, { height: CHART_HEIGHT, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.noDataText}>Sem dados suficientes</Text>
        </View>
      )}

      {/* Trend badge */}
      <View style={[styles.trendBadge, { borderColor: trend.color }]}>
        <Text style={[styles.trendText, { color: trend.color }]}>
          {trend.emoji} {trend.label}
        </Text>
      </View>

      {/* Pattern insight */}
      <Text style={styles.insight}>{patternInsight}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  area: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  metric: {
    color: '#94a3b8',
    fontSize: 12,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    position: 'relative',
    marginBottom: 12,
  },
  pointColumn: {
    position: 'relative',
    alignItems: 'center',
    height: '100%',
  },
  dot: {
    position: 'absolute',
  },
  connector: {
    position: 'absolute',
    width: '100%',
    right: 0,
  },
  noDataText: {
    color: '#64748b',
    fontSize: 12,
  },
  trendBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  insight: {
    color: '#94a3b8',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
});
