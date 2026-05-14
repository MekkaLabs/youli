/**
 * StreakCalendar — grade de contribuições estilo GitHub
 * Mostra os últimos N dias (padrão 49 = 7 semanas) como quadradinhos coloridos
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';

interface StreakCalendarProps {
  /** Set de datas (ISO 'YYYY-MM-DD') em que o hábito foi completado */
  completedDates: string[];
  /** Cor principal do hábito */
  color?: string;
  /** Quantos dias mostrar (default 49 = 7 semanas) */
  days?: number;
  /** Mostra labels de dia da semana */
  showLabels?: boolean;
  /** Tamanho de cada quadrado */
  cellSize?: number;
  /** Espaço entre quadrados */
  gap?: number;
}

const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function StreakCalendar({
  completedDates,
  color = '#059669',
  days = 49,
  showLabels = true,
  cellSize = 11,
  gap = 3,
}: StreakCalendarProps) {
  const completedSet = useMemo(() => new Set(completedDates), [completedDates]);

  // Gera grid: do dia mais antigo (esquerda) até hoje (direita)
  const grid = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Ajusta o início para a última domingo (para alinhar semanas)
    const startDay = new Date(today);
    startDay.setDate(today.getDate() - (days - 1));

    const cells: { date: string; filled: boolean; isToday: boolean }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDay);
      d.setDate(startDay.getDate() + i);
      const iso = toISODate(d);
      cells.push({
        date: iso,
        filled: completedSet.has(iso),
        isToday: toISODate(today) === iso,
      });
    }
    return cells;
  }, [completedDates, days]);

  // Divide em colunas de 7 (semanas)
  const weeks = useMemo(() => {
    const cols: typeof grid[] = [];
    for (let i = 0; i < grid.length; i += 7) {
      cols.push(grid.slice(i, i + 7));
    }
    return cols;
  }, [grid]);

  const totalCols = weeks.length;
  const totalWidth = totalCols * (cellSize + gap) - gap;

  return (
    <View style={styles.wrapper}>
      {showLabels && (
        <View style={[styles.labelsRow, { width: totalWidth + 14 }]}>
          <View style={{ width: 14 }} />
          {weeks.map((_, wi) => (
            <View key={wi} style={{ width: cellSize, marginRight: wi < weeks.length - 1 ? gap : 0 }} />
          ))}
        </View>
      )}

      <View style={styles.row}>
        {/* Labels de dia da semana (D S T Q Q S S) */}
        {showLabels && (
          <View style={[styles.dayLabels, { gap }]}>
            {DAY_LABELS.map((l, i) => (
              <Text key={i} style={[styles.dayLabel, { height: cellSize, lineHeight: cellSize }]}>
                {i % 2 === 0 ? l : ''}
              </Text>
            ))}
          </View>
        )}

        {/* Grid de quadradinhos */}
        <View style={[styles.grid, { gap }]}>
          {weeks.map((week, wi) => (
            <View key={wi} style={[styles.week, { gap }]}>
              {week.map((cell, di) => (
                <View
                  key={cell.date}
                  style={[
                    styles.cell,
                    {
                      width: cellSize,
                      height: cellSize,
                      borderRadius: cellSize * 0.25,
                      backgroundColor: cell.filled
                        ? color
                        : 'rgba(255,255,255,0.06)',
                      opacity: cell.filled ? (cell.isToday ? 1 : 0.85) : 1,
                      borderWidth: cell.isToday ? 1.5 : 0,
                      borderColor: cell.isToday ? color : 'transparent',
                    },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'flex-start' },
  labelsRow: { flexDirection: 'row', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  dayLabels: {
    flexDirection: 'column',
    marginRight: 4,
    alignItems: 'center',
    width: 10,
  },
  dayLabel: {
    fontSize: 8,
    color: '#4B5563',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  week: {
    flexDirection: 'column',
  },
  cell: {},
});
