import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  key: string;
  label: string;
  oldValue?: unknown;
  newValue?: unknown;
}

interface LifeDiffCardProps {
  area: string;
  lines: DiffLine[];
  summary: string;
  timestamp: string;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === 'object') {
    const str = JSON.stringify(value);
    return str.length > 40 ? str.slice(0, 37) + '...' : str;
  }
  const str = String(value);
  return str.length > 40 ? str.slice(0, 37) + '...' : str;
}

export function LifeDiffCard({ area, lines, summary, timestamp }: LifeDiffCardProps) {
  const formattedDate = new Date(timestamp).toLocaleDateString('pt-BR');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.areaText}>{area.toUpperCase()}</Text>
        <Text style={styles.timestampText}>{formattedDate}</Text>
      </View>

      <View style={styles.summaryBadge}>
        <Text style={styles.summaryText}>{summary}</Text>
      </View>

      <ScrollView style={styles.linesList} nestedScrollEnabled>
        {lines.map((line, index) => {
          let prefix = '~';
          let lineStyle = styles.lineUnchanged;
          let textStyle = styles.textUnchanged;
          let displayValue = '';

          if (line.type === 'added') {
            prefix = '+';
            lineStyle = styles.lineAdded;
            textStyle = styles.textAdded;
            displayValue = formatValue(line.newValue);
          } else if (line.type === 'removed') {
            prefix = '-';
            lineStyle = styles.lineRemoved;
            textStyle = styles.textRemoved;
            displayValue = formatValue(line.oldValue);
          } else {
            const oldStr = formatValue(line.oldValue);
            const newStr = formatValue(line.newValue);
            displayValue = oldStr !== newStr ? `${oldStr} → ${newStr}` : oldStr;
          }

          return (
            <View key={`${line.key}-${index}`} style={[styles.lineRow, lineStyle]}>
              <Text style={[styles.lineText, textStyle]}>
                {prefix} {line.label}: {displayValue}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export type { LifeDiffCardProps };

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  areaText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  timestampText: {
    color: '#888888',
    fontSize: 11,
  },
  summaryBadge: {
    backgroundColor: '#2a2a3e',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  summaryText: {
    color: '#aaaaaa',
    fontSize: 12,
  },
  linesList: {
    maxHeight: 200,
  },
  lineRow: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginBottom: 2,
  },
  lineAdded: {
    backgroundColor: 'rgba(0,200,0,0.1)',
  },
  lineRemoved: {
    backgroundColor: 'rgba(200,0,0,0.1)',
  },
  lineUnchanged: {
    backgroundColor: 'transparent',
  },
  lineText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  textAdded: {
    color: '#00c853',
  },
  textRemoved: {
    color: '#ff5252',
  },
  textUnchanged: {
    color: '#888888',
  },
});
