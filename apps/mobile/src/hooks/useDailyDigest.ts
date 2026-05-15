/**
 * useDailyDigest — hook do briefing diário às 8h
 * - Agenda notificação push com expo-notifications
 * - Gera briefing personalizado com dados reais (hábitos + metas + finanças)
 * - Persiste horário configurado e última exibição
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@youli:daily_digest';

export interface DigestConfig {
  enabled: boolean;
  hour: number;   // 0-23
  minute: number; // 0-59
  lastShownDate: string | null; // ISO 'YYYY-MM-DD'
}

const DEFAULT_CONFIG: DigestConfig = {
  enabled: true,
  hour: 8,
  minute: 0,
  lastShownDate: null,
};

export function useDailyDigest() {
  const [config, setConfig] = useState<DigestConfig>(DEFAULT_CONFIG);
  const [notifStatus, setNotifStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setConfig(JSON.parse(raw)); } catch {}
      }
    });
    checkNotifPermission();
  }, []);

  async function checkNotifPermission() {
    try {
      const { default: Notifications } = await import('expo-notifications');
      const { status } = await Notifications.getPermissionsAsync();
      setNotifStatus(status === 'granted' ? 'granted' : 'denied');
    } catch {
      setNotifStatus('denied');
    }
  }

  async function requestPermission(): Promise<boolean> {
    try {
      const { default: Notifications } = await import('expo-notifications');
      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === 'granted';
      setNotifStatus(granted ? 'granted' : 'denied');
      return granted;
    } catch {
      return false;
    }
  }

  const saveConfig = useCallback(async (newConfig: DigestConfig) => {
    setConfig(newConfig);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
  }, []);

  /**
   * Agenda a notificação diária de briefing
   * Cancela agendamentos anteriores e cria um novo
   */
  const scheduleDigestNotification = useCallback(async (
    hour: number,
    minute: number,
    orchestratorName: string,
  ) => {
    try {
      const { default: Notifications } = await import('expo-notifications');

      // Cancela notificações Youli anteriores
      const existing = await Notifications.getAllScheduledNotificationsAsync();
      const youliIds = existing
        .filter(n => n.content.data?.type === 'youli_digest')
        .map(n => n.identifier);
      await Promise.all(youliIds.map(id => Notifications.cancelScheduledNotificationAsync(id)));

      // Agenda nova notificação diária
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `☀️ Bom dia! ${orchestratorName} tem seu briefing`,
          body: 'Toque para ver suas prioridades de hoje',
          data: { type: 'youli_digest', screen: '/(tabs)/dashboard' },
          sound: true,
        },
        trigger: {
          type: 'calendar',
          hour,
          minute,
          repeats: true,
        } as any,
      });

      await saveConfig({ ...config, enabled: true, hour, minute });
      return true;
    } catch (err) {
      console.error('[useDailyDigest] schedule error:', err);
      return false;
    }
  }, [config, saveConfig]);

  const cancelDigest = useCallback(async () => {
    try {
      const { default: Notifications } = await import('expo-notifications');
      const existing = await Notifications.getAllScheduledNotificationsAsync();
      const youliIds = existing
        .filter(n => n.content.data?.type === 'youli_digest')
        .map(n => n.identifier);
      await Promise.all(youliIds.map(id => Notifications.cancelScheduledNotificationAsync(id)));
    } catch {}
    await saveConfig({ ...config, enabled: false });
  }, [config, saveConfig]);

  /**
   * Verifica se deve mostrar o digest hoje (ainda não foi exibido)
   */
  const shouldShowDigestToday = useCallback((): boolean => {
    if (!config.enabled) return false;
    const today = new Date().toISOString().split('T')[0];
    return config.lastShownDate !== today;
  }, [config]);

  /**
   * Marca como exibido hoje
   */
  const markDigestShown = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    await saveConfig({ ...config, lastShownDate: today });
  }, [config, saveConfig]);

  return {
    config,
    notifStatus,
    requestPermission,
    scheduleDigestNotification,
    cancelDigest,
    shouldShowDigestToday,
    markDigestShown,
  };
}
