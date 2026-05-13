import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../src/components/Screen';
import { api } from '../src/services/api';
import type { Task } from '@youli/shared';

export default function Tarefas() {
  const [tasks, setTasks] = useState<Task[]>([]);
  useEffect(() => { api<Task[]>('/api/tasks').then(setTasks).catch(() => setTasks([])); }, []);
  return <Screen title="Tarefas">{tasks.map((t) => <Text key={t.id}>• {t.title}</Text>)}</Screen>;
}
