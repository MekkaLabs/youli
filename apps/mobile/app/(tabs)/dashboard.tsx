/**
 * Dashboard — tela principal do Youli
 * Agente: Leonardo da Vinci (visão sistêmica)
 */

import React, { useState, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FullScrollLayout } from '../../src/templates/FullScrollLayout';
import { DashboardHero } from '../../src/organisms/DashboardHero';
import { FinanceGrid } from '../../src/organisms/FinanceGrid';
import { AgentBadge } from '../../src/atoms/AgentBadge';
import { tokens } from '../../src/theme/tokens';

const LEONARDO = {
  name: 'Leonardo',
  fullName: 'Leonardo da Vinci',
  emoji: '🎨',
  color: '#7C3AED',
  domain: 'Visão Sistêmica',
};

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [dashData, setDashData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const [dash, txRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/dashboard`).then((r) => r.json()),
        fetch(`${API_BASE}/api/open-finance/transactions`).then((r) => r.json()),
      ]);
      if (dash.status === 'fulfilled') setDashData(dash.value);
      if (txRes.status === 'fulfilled') setTransactions(txRes.value.transactions || []);
    } catch {}
  }, []);

  React.useEffect(() => { load(); }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <FullScrollLayout
      title="Dashboard"
      subtitle="Visão geral do seu universo"
      paddingBottom={insets.bottom + 90}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      rightAction={
        <AgentBadge
          {...LEONARDO}
          compact
          onPress={() => {/* abre copilot no contexto de dashboard */}}
        />
      }
    >
      <DashboardHero data={dashData} />
      <FinanceGrid transactions={transactions} />
    </FullScrollLayout>
  );
}
