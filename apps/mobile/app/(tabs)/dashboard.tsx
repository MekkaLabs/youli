/**
 * Dashboard — tela principal do Youli
 * Agente: Leonardo da Vinci (visão sistêmica)
 */

import React, { useState, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FullScrollLayout } from '../../src/templates/FullScrollLayout';
import { DashboardHero } from '../../src/organisms/DashboardHero';
import { AgentBadge } from '../../src/atoms/AgentBadge';
import { DailyDigest } from '../../src/organisms/DailyDigest';
import { NotificationBell, NotificationCenter } from '../../src/organisms/NotificationCenter';
import { CrossAreaInsights } from '../../src/organisms/CrossAreaInsights';
import { useSmartNotifications } from '../../src/hooks/useSmartNotifications';
import { DailyCheckIn, useDailyCheckIn } from '../../src/organisms/DailyCheckIn';
import { GlobalSearch, SearchTrigger } from '../../src/organisms/GlobalSearch';
import { ShareProgressButton } from '../../src/organisms/ShareCard';
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
  const [dashData, setDashData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount } = useSmartNotifications();
  const { show: showCheckIn, dismiss: dismissCheckIn } = useDailyCheckIn();
  const [showSearch, setShowSearch] = useState(false);

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
    await load();
  }, [load]);

  return (
    <>
      {/* Daily Digest — abre automaticamente se ainda não foi exibido hoje */}
      <DailyDigest autoOpen />

      {/* Daily Check-in — 1x por dia entre 6h e 11h */}
      <DailyCheckIn visible={showCheckIn} onClose={dismissCheckIn} />

      {/* Busca global */}
      <GlobalSearch visible={showSearch} onClose={() => setShowSearch(false)} />

      {/* Central de Notificações */}
      <NotificationCenter
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      <FullScrollLayout
        title="Dashboard"
        subtitle="Visão geral do seu universo"
        paddingBottom={insets.bottom + 90}
        onRefresh={handleRefresh}
        rightAction={
          <NotificationBell
            unreadCount={unreadCount}
            onPress={() => setShowNotifications(true)}
          />
        }
      >
        <SearchTrigger onPress={() => setShowSearch(true)} />
        <DashboardHero data={dashData} onOpenCopilot={() => {}} />
        <CrossAreaInsights />
        <ShareProgressButton compact />
      </FullScrollLayout>
    </>
  );
}
