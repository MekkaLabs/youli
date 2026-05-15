/**
 * DonutChart — gráfico de pizza/donut em SVG puro (sem dependência externa)
 * Props: dados com valor + cor, tamanho, espessura do anel, label central
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

export interface DonutSlice {
  value: number;
  color: string;
  label?: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSublabel?: string;
}

export function DonutChart({
  data,
  size = 180,
  strokeWidth = 28,
  centerLabel,
  centerSublabel,
}: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  // Calcula os segmentos do donut
  let accumulated = 0;
  const segments = data.map((slice) => {
    const pct = slice.value / total;
    const dashArray = pct * circumference;
    const dashOffset = circumference - accumulated * circumference;
    accumulated += pct;
    return { ...slice, dashArray, dashOffset };
  });

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Fundo do anel */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#1F2937"
          strokeWidth={strokeWidth}
        />
        {/* Segmentos */}
        <G rotation="-90" origin={`${cx}, ${cy}`}>
          {segments.map((seg, i) => (
            <Circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth - 2}
              strokeDasharray={`${seg.dashArray} ${circumference}`}
              strokeDashoffset={-seg.dashOffset + circumference}
              strokeLinecap="round"
            />
          ))}
        </G>
      </Svg>

      {/* Label central */}
      {(centerLabel || centerSublabel) && (
        <View style={styles.center} pointerEvents="none">
          {centerLabel && <Text style={styles.centerLabel}>{centerLabel}</Text>}
          {centerSublabel && <Text style={styles.centerSublabel}>{centerSublabel}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F9FAFB',
    textAlign: 'center',
  },
  centerSublabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
  },
});
