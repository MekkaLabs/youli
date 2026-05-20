/**
 * Dashboard — tela principal do Youli
 * Agente: Leonardo da Vinci (visão sistêmica)
 */

import React, { useState, useCallback } from 'react';
import { logWarn } from '../../src/services/logger';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../../src/hooks/useI18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown } from 'react-native-reanimated';
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
import { useUI } from '../../src/store';
import { useSWECI } from '../../src/hooks/useSWECI';
import { TodayFocusCard } from '../../src/organisms/TodayFocusCard';

interface LifeHealthData {
  lifeHealthScore: number;
  ancScore: number;
  maintainabilityScore: number;
  maintainabilityVerdict: 'sustainable' | 'moderate_risk' | 'high_risk';
  criticalAreas: string[];
}

function LifeHealthHUD({ data, onPress }: { data: LifeHealthData; onPress?: () => void }) {
  const { t } = useI18n();
  const getColor = (s: number) => s >= 70 ? '#00b894' : s >= 40 ? '#fdcb6e' : '#e17055';
  const verdictLabel = data.maintainabilityVerdict === 'sustainable' ? `✅ ${t('calendar.sustainability')}`
    : data.maintainabilityVerdict === 'moderate_risk' ? '⚠️ Risco moderado' : '🔴 Alto risco';
  const verdictColor = data.maintainabilityVerdict === 'sustainable' ? '#00b894'
    : data.maintainabilityVerdict === 'moderate_risk' ? '#fdcb6e' : '#e17055';

  return (
    <TouchableOpacity style={hudStyles.container} onPress={onPress} activeOpacity={onPress ? 0.75 : 1}
      accessibilityLabel={t('a11y.lifeHealthScore', { score: String(data.lifeHealthScore) })}
      accessibilityRole="button"
    >
      <View style={hudStyles.row}>
        <View style={hudStyles.metric}>
          <Text style={hudStyles.label}>{t('dashboard.lifeHealth')}</Text>
          <Text style={[hudStyles.value, { color: getColor(data.lifeHealthScore) }]}>{data.lifeHealthScore}</Text>
        </View>
        <View style={hudStyles.divider} />
        <View style={hudStyles.metric}>
          <Text style={hudStyles.label}>{t('dashboard.ancScore')}</Text>
          <Text style={[hudStyles.value, { color: getColor(data.ancScore) }]}>{data.ancScore}</Text>
        </View>
        <View style={hudStyles.divider} />
        <View style={hudStyles.metric}>
          <Text style={hudStyles.label}>{t('dashboard.sustainability')}</Text>
          <Text style={[hudStyles.verdictText, { color: verdictColor }]}>{verdictLabel}</Text>
        </View>
      </View>
      {data.criticalAreas.length > 0 && (
        <View style={hudStyles.criticalRow}>
          <Text style={hudStyles.criticalLabel}>{t('dashboard.critical')}</Text>
          <Text style={hudStyles.criticalAreas}>{data.criticalAreas.join(' · ')}</Text>
        </View>
      )}
      {onPress && <Text style={hudStyles.tapHint}>{t('dashboard.tapForDetails')}</Text>}
    </TouchableOpacity>
  );
}

const hudStyles = StyleSheet.create({
  container: {
    backgroundColor: '#0D0D1A', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#1F2937', gap: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  metric: { alignItems: 'center', gap: 2 },
  label: { fontSize: 10, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase' },
  value: { fontSize: 26, fontWeight: '900' },
  verdictText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  divider: { width: 1, height: 36, backgroundColor: '#1F2937' },
  criticalRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1A0D0D', borderRadius: 8, padding: 8 },
  criticalLabel: { fontSize: 11, color: '#F87171', fontWeight: '700' },
  criticalAreas: { flex: 1, fontSize: 11, color: '#FCA5A5', textTransform: 'capitalize' },
  tapHint: { fontSize: 10, color: '#4B5563', textAlign: 'right', fontWeight: '600' },
});

const LEONARDO = {
  name: 'Leonardo',
  fullName: 'Leonardo da Vinci',
  emoji: '🎨',
  color: '#7C3AED',
  domain: 'Visão Sistêmica',
};

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3002';

function getTimeGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia ☀️' : h < 18 ? 'Boa tarde 🌤' : 'Boa noite 🌙';
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [dashData, setDashData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [greeting] = useState(() => getTimeGreeting());
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount } = useSmartNotifications();
  const { openCopilot } = useUI();
  const { show: showCheckIn, dismiss: dismissCheckIn } = useDailyCheckIn();
  const [showSearch, setShowSearch] = useState(false);
  const { data: sweciData, refresh: refreshSWECI } = useSWECI();

  const load = useCallback(async () => {
    try {
      const [dash, txRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/dashboard`).then((r) => r.json()),
        fetch(`${API_BASE}/api/open-finance/transactions`).then((r) => r.json()),
      ]);
      if (dash.status === 'fulfilled') setDashData(dash.value);
      if (txRes.status === 'fulfilled') setTransactions(txRes.value.transactions || []);
    } catch (e) {
      logWarn('dashboard:load', e);
    }
  }, []);

  React.useEffect(() => { load(); }, []);

  const handleRefresh = useCallback(async () => {
    await Promise.all([load(), refreshSWECI()]);
  }, [load, refreshSWECI]);

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
        title={greeting}
        subtitle={t('dashboard.subtitle')}
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
        {sweciData ? (
          <Animated.View entering={FadeInDown.delay(0)}>
            <LifeHealthHUD
              data={sweciData}
              onPress={() => router.push('/life-score' as any)}
            />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(0)} style={skeletonStyles.container}>
            <View style={skeletonStyles.row}>
              {[1,2,3].map(i => (
                <View key={i} style={skeletonStyles.metric}>
                  <View style={skeletonStyles.labelBar} />
                  <View style={skeletonStyles.valueBar} />
                </View>
              ))}
            </View>
          </Animated.View>
        )}
        {/* Foco do dia — ação mais importante segundo SWE-CI */}
        <TodayFocusCard />
        <DashboardHero data={dashData} onOpenCopilot={openCopilot} />
        <CrossAreaInsights />
        <ShareProgressButton compact />
      </FullScrollLayout>
    </>
  );
}

const skeletonStyles = StyleSheet.create({
  container: {
    backgroundColor: '#0D0D1A', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#1F2937',
  },
  row: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  metric: { alignItems: 'center', gap: 8 },
  labelBar: { width: 56, height: 9, backgroundColor: '#1F2937', borderRadius: 4 },
  valueBar: { width: 40, height: 28, backgroundColor: '#1F2937', borderRadius: 6 },
});
