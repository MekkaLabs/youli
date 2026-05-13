import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullScrollLayout } from '../../src/templates/FullScrollLayout';
import { GoalBoard } from '../../src/organisms/GoalBoard';
import { AgentBadge } from '../../src/atoms/AgentBadge';

const ALEXANDRE = { name: 'Alexandre', fullName: 'Alexandre, o Grande', emoji: '⚔️', color: '#DC2626', domain: 'Metas Audaciosas' };

export default function MetasScreen() {
  const insets = useSafeAreaInsets();
  return (
    <FullScrollLayout
      title="Metas"
      subtitle="Conquiste seus territórios"
      paddingBottom={insets.bottom + 90}
      rightAction={
        <AgentBadge {...ALEXANDRE} compact onPress={() => {}} />
      }
    >
      <GoalBoard />
    </FullScrollLayout>
  );
}
