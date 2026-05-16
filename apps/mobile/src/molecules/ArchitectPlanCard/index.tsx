import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface ArchitectStep {
  order: number;
  area: string;
  objective: string;
  successCriteria: string;
  estimatedDays: number;
}

interface ArchitectPlanCardProps {
  goal: string;
  areas: string[];
  steps: ArchitectStep[];
  estimatedWeeks: number;
}

export function ArchitectPlanCard({ goal, areas, steps, estimatedWeeks }: ArchitectPlanCardProps) {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🏛️ Plano Estratégico</Text>
        <Text style={styles.goal}>{goal}</Text>
      </View>

      {/* Area chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsContainer}
      >
        {areas.map((area) => (
          <View key={area} style={styles.chip}>
            <Text style={styles.chipText}>{area}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Steps */}
      <View style={styles.stepsList}>
        {steps.map((step) => (
          <View key={step.order} style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{step.order}</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepArea}>{step.area}</Text>
              <Text style={styles.stepObjective}>{step.objective}</Text>
              <Text style={styles.stepCriteria}>{step.successCriteria}</Text>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{step.estimatedDays}d</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Estimativa: {estimatedWeeks} semanas</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a3e',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  goal: {
    fontSize: 14,
    color: '#aaaacc',
  },
  chipsScroll: {
    marginBottom: 16,
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#4a4a8a',
  },
  chipText: {
    fontSize: 12,
    color: '#aaaaaa',
  },
  stepsList: {
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2a2a6e',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  stepContent: {
    flex: 1,
    gap: 2,
  },
  stepArea: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#7a7aff',
  },
  stepObjective: {
    fontSize: 14,
    color: '#e0e0ff',
  },
  stepCriteria: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#888888',
    marginTop: 2,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2a2a5e',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginTop: 4,
  },
  stepBadgeText: {
    fontSize: 11,
    color: '#aaaacc',
    fontWeight: '600',
  },
  footer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a5e',
  },
  footerText: {
    fontSize: 13,
    color: '#aaaaaa',
    textAlign: 'right',
  },
});

export type { ArchitectPlanCardProps };
