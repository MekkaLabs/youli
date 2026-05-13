import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../src/components/Screen';
import { api } from '../src/services/api';
import type { DailyInsight } from '@youli/shared';

export default function Insights() {
  const [insights, setInsights] = useState<DailyInsight[]>([]);
  useEffect(() => { api<DailyInsight[]>('/api/insights').then(setInsights).catch(() => setInsights([])); }, []);
  return <Screen title="Insights">{insights.map((i) => <Text key={i.id}>{i.summary}</Text>)}</Screen>;
}
