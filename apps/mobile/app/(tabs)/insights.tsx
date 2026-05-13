import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullScrollLayout } from '../../src/templates/FullScrollLayout';
import { InsightCard } from '../../src/molecules/InsightCard';
import { AgentBadge } from '../../src/atoms/AgentBadge';
import { tokens } from '../../src/theme/tokens';

const SOCRATES = { name: 'Sócrates', fullName: 'Sócrates de Atenas', emoji: '🦉', color: '#0EA5E9', domain: 'Autoconhecimento' };

const MOCK_INSIGHTS = [
  { title: 'Produtividade em Alta', content: 'Suas tarefas completadas aumentaram 40% esta semana em comparação com a anterior.', type: 'productivity', energy: 'alta', actions: ['Manter o ritmo', 'Adicionar 1 tarefa desafiadora'] },
  { title: 'Hábito em Risco', content: 'O hábito "Leitura Diária" está sem check-in há 3 dias. Considere reduzir a meta para 10 min.', type: 'warning', energy: 'media', actions: ['Fazer check-in agora', 'Reduzir para 10 min'] },
  { title: 'Padrão Financeiro', content: 'Seus gastos com alimentação fora de casa aumentaram 25% este mês. Impacto: R$ 180 extras.', type: 'finance', energy: 'baixa', actions: ['Planejar refeições', 'Definir limite mensal'] },
];

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <FullScrollLayout
      title="Insights"
      subtitle="Padrões que revelam oportunidades"
      paddingBottom={insets.bottom + 90}
      rightAction={
        <AgentBadge {...SOCRATES} compact onPress={() => {}} />
      }
    >
      {MOCK_INSIGHTS.map((insight, i) => (
        <InsightCard key={i} {...insight} />
      ))}
    </FullScrollLayout>
  );
}
