import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../src/components/Screen';
import { api } from '../src/services/api';
import type { Habit } from '@youli/shared';

export default function Habitos() {
  const [habits, setHabits] = useState<Habit[]>([]);
  useEffect(() => { api<Habit[]>('/api/habits').then(setHabits).catch(() => setHabits([])); }, []);
  return <Screen title="Hábitos">{habits.map((h) => <Text key={h.id}>{h.title} (streak: {h.streak})</Text>)}</Screen>;
}
