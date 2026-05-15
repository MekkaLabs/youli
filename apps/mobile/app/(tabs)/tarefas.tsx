import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullScrollLayout } from '../../src/templates/FullScrollLayout';
import { TaskBoard } from '../../src/organisms/TaskBoard';
import { AgentBadge } from '../../src/atoms/AgentBadge';

const FRANKLIN = {
  name: 'Franklin',
  fullName: 'Benjamin Franklin',
  emoji: '⚡',
  color: '#D97706',
  domain: 'Produtividade',
};

export default function TarefasScreen() {
  const insets = useSafeAreaInsets();
  return (
    <FullScrollLayout
      title="Tarefas"
      subtitle="Execute o que importa"
      paddingBottom={insets.bottom + 90}
      rightAction={<AgentBadge {...FRANKLIN} compact onPress={() => {}} />}
    >
      <TaskBoard />
    </FullScrollLayout>
  );
}
