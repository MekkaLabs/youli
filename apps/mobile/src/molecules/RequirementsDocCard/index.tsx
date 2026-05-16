import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export interface RequirementsDocCardProps {
  area: string;
  title: string;
  problemStatement: string;
  rootCauses: string[];
  acceptanceCriteria: string[];
  estimatedEffort: 'days' | 'weeks' | 'months';
  priority: 'critical' | 'high' | 'medium' | 'low';
}

const PRIORITY_CONFIG: Record<
  RequirementsDocCardProps['priority'],
  { label: string; color: string; backgroundColor: string }
> = {
  critical: { label: 'CRÍTICO', color: '#ffffff', backgroundColor: '#dc2626' },
  high: { label: 'ALTO', color: '#ffffff', backgroundColor: '#ea580c' },
  medium: { label: 'MÉDIO', color: '#1a1a1a', backgroundColor: '#facc15' },
  low: { label: 'BAIXO', color: '#ffffff', backgroundColor: '#22c55e' },
};

const EFFORT_CONFIG: Record<
  RequirementsDocCardProps['estimatedEffort'],
  { label: string; color: string }
> = {
  days: { label: 'Dias', color: '#4ade80' },
  weeks: { label: 'Semanas', color: '#facc15' },
  months: { label: 'Meses', color: '#f97316' },
};

export function RequirementsDocCard({
  area,
  title,
  problemStatement,
  rootCauses,
  acceptanceCriteria,
  estimatedEffort,
  priority,
}: RequirementsDocCardProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  const priorityConf = PRIORITY_CONFIG[priority];
  const effortConf = EFFORT_CONFIG[estimatedEffort];

  return (
    <View style={styles.container}>
      {/* Header row */}
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => setExpanded((prev) => !prev)}
        activeOpacity={0.8}
      >
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: priorityConf.backgroundColor },
            ]}
          >
            <Text style={[styles.priorityText, { color: priorityConf.color }]}>
              {priorityConf.label}
            </Text>
          </View>
          <Text style={styles.title} numberOfLines={expanded ? undefined : 1}>
            {title}
          </Text>
        </View>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {/* Problem statement — always visible but truncated when collapsed */}
      <Text
        style={styles.problemStatement}
        numberOfLines={expanded ? undefined : 1}
        ellipsizeMode="tail"
      >
        {problemStatement}
      </Text>

      {/* Expanded content */}
      {expanded && (
        <View style={styles.expandedContent}>
          {/* Root Causes */}
          <Text style={styles.sectionTitle}>🔍 Causas Raiz</Text>
          {rootCauses.map((cause, index) => (
            <Text key={index} style={styles.listItem}>
              {'  • '}
              {cause}
            </Text>
          ))}

          {/* Acceptance Criteria */}
          <Text style={styles.sectionTitle}>✅ Critérios de Sucesso</Text>
          {acceptanceCriteria.map((criterion, index) => (
            <Text key={index} style={styles.listItem}>
              {'  🔲 '}
              {criterion}
            </Text>
          ))}

          {/* Effort badge */}
          <Text style={styles.sectionTitle}>⏱️ Esforço</Text>
          <View style={[styles.effortBadge, { borderColor: effortConf.color }]}>
            <Text style={[styles.effortText, { color: effortConf.color }]}>
              {effortConf.label}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e1e3a',
    borderRadius: 12,
    padding: 14,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#2d2d5a',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  priorityBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    color: '#e2e8f0',
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
  },
  chevron: {
    color: '#94a3b8',
    fontSize: 12,
    marginLeft: 8,
  },
  problemStatement: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 4,
  },
  expandedContent: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2d2d5a',
    paddingTop: 12,
    gap: 4,
  },
  sectionTitle: {
    color: '#e2e8f0',
    fontWeight: '700',
    fontSize: 13,
    marginTop: 10,
    marginBottom: 4,
  },
  listItem: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
  },
  effortBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  effortText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
