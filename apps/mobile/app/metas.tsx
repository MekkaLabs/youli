import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../src/components/Screen';
import { api } from '../src/services/api';
import type { Goal } from '@youli/shared';

export default function Metas() {
  const [goals, setGoals] = useState<Goal[]>([]);
  useEffect(() => { api<Goal[]>('/api/goals').then(setGoals).catch(() => setGoals([])); }, []);
  return <Screen title="Metas">{goals.map((g) => <Text key={g.id}>{g.title} ({g.progress}%)</Text>)}</Screen>;
}
