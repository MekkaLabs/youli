/**
 * BarChart — gráfico de barras agrupadas (receita vs despesa por mês)
 * SVG puro, sem dependência externa
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';

export interface BarGroup {
  label: string;       // Ex: 'Jan'
  income: number;
  expenses: number;
}

interface BarChartProps {
  data: BarGroup[];
  height?: number;
  incomeColor?: string;
  expenseColor?: string;
}

function formatK(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
}

export function BarChart({
  data,
  height = 140,
  incomeColor = '#059669',
  expenseColor = '#DC2626',
}: BarChartProps) {
  const paddingLeft = 36;
  const paddingBottom = 24;
  const paddingTop = 10;
  const paddingRight = 8;

  const chartH = height - paddingBottom - paddingTop;

  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expenses]), 1);

  // Calcula largura das barras baseado no número de grupos
  const groupCount = data.length;
  const barGap = 3;
  const groupGap = 10;

  return (
    <View style={{ width: '100%' }}>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 300 ${height}`}
        preserveAspectRatio="none"
      >
        {/* Linhas de grade horizontais */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = paddingTop + chartH * (1 - pct);
          return (
            <React.Fragment key={pct}>
              <Line
                x1={paddingLeft}
                y1={y}
                x2={300 - paddingRight}
                y2={y}
                stroke="#1F2937"
                strokeWidth={1}
              />
              {pct > 0 && (
                <SvgText
                  x={paddingLeft - 4}
                  y={y + 4}
                  fontSize={8}
                  fill="#4B5563"
                  textAnchor="end"
                >
                  {formatK(maxVal * pct)}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}

        {/* Barras por grupo */}
        {data.map((group, gi) => {
          const chartWidth = 300 - paddingLeft - paddingRight;
          const groupWidth = chartWidth / groupCount;
          const barWidth = (groupWidth - groupGap) / 2;
          const groupX = paddingLeft + gi * groupWidth + groupGap / 2;

          const incomeH = Math.max(2, (group.income / maxVal) * chartH);
          const expenseH = Math.max(2, (group.expenses / maxVal) * chartH);

          const incomeX = groupX;
          const expenseX = groupX + barWidth + barGap;

          const incomeY = paddingTop + chartH - incomeH;
          const expenseY = paddingTop + chartH - expenseH;

          const isCurrentMonth = gi === data.length - 1;

          return (
            <React.Fragment key={gi}>
              {/* Barra receita */}
              <Rect
                x={incomeX}
                y={incomeY}
                width={barWidth}
                height={incomeH}
                rx={3}
                fill={incomeColor}
                opacity={isCurrentMonth ? 1 : 0.5}
              />
              {/* Barra despesa */}
              <Rect
                x={expenseX}
                y={expenseY}
                width={barWidth}
                height={expenseH}
                rx={3}
                fill={expenseColor}
                opacity={isCurrentMonth ? 1 : 0.5}
              />
              {/* Label do mês */}
              <SvgText
                x={groupX + barWidth}
                y={height - 6}
                fontSize={8.5}
                fill={isCurrentMonth ? '#E5E7EB' : '#4B5563'}
                textAnchor="middle"
                fontWeight={isCurrentMonth ? 'bold' : 'normal'}
              >
                {group.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>

      {/* Legenda */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: incomeColor }]} />
          <Text style={styles.legendText}>Receita</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: expenseColor }]} />
          <Text style={styles.legendText}>Gasto</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#6B7280',
  },
});
