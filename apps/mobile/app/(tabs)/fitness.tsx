/**
 * Fitness — tela de saúde e treino
 * Agente: Hipócrates (saúde e vitalidade)
 */
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullScrollLayout } from '../../src/templates/FullScrollLayout';
import { AgentBadge } from '../../src/atoms/AgentBadge';
import { HealthDashboard } from '../../src/organisms/HealthDashboard';

const HIPOCRATES = {
  name: 'Hipócrates',
  fullName: 'Hipócrates de Cós',
  emoji: '⚕️',
  color: '#DC2626',
  domain: 'Saúde & Vitalidade',
};

export default function FitnessScreen() {
  const insets = useSafeAreaInsets();
  return (
    <FullScrollLayout
      title="Fitness"
      subtitle="Corpo saudável, mente poderosa"
      paddingBottom={insets.bottom + 90}
      rightAction={<AgentBadge {...HIPOCRATES} compact onPress={() => {}} />}
    >
      <HealthDashboard />
    </FullScrollLayout>
  );
}
