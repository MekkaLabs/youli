import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullScrollLayout } from '../../src/templates/FullScrollLayout';
import { HabitDeck } from '../../src/organisms/HabitDeck';
import { AgentBadge } from '../../src/atoms/AgentBadge';

const ARISTOTELES = { name: 'Aristóteles', fullName: 'Aristóteles de Estagira', emoji: '🏛️', color: '#059669', domain: 'Hábitos & Caráter' };

export default function HabitosScreen() {
  const insets = useSafeAreaInsets();
  return (
    <FullScrollLayout
      title="Hábitos"
      subtitle="Consistência que constrói caráter"
      paddingBottom={insets.bottom + 90}
      rightAction={
        <AgentBadge {...ARISTOTELES} compact onPress={() => {}} />
      }
    >
      <HabitDeck />
    </FullScrollLayout>
  );
}
