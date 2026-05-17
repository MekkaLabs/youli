/**
 * Youli — useNotifications hook
 * Inicializa permissões, agenda notificações recorrentes e
 * trata deep-link (notificação → navega para a tela certa).
 *
 * Usar UMA vez no root layout (AppShell).
 */

import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import {
  requestNotificationPermission,
  scheduleDailyDigest,
  scheduleWeeklyCI,
  sendGapAlert,
  getScreenFromNotification,
} from '../services/notifications';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3002';

export function useNotifications(language = 'pt-BR') {
  const notifListenerRef = useRef<Notifications.EventSubscription | null>(null);
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      // 1. Request permission
      const granted = await requestNotificationPermission();
      if (!granted || !mounted) return;

      // 2. Schedule recurring notifications
      await Promise.allSettled([
        scheduleDailyDigest(language),
        scheduleWeeklyCI(language),
      ]);

      // 3. Check for critical SWE-CI gaps and fire alert if needed
      checkAndAlertGaps(language).catch(() => {});
    }

    init();

    // 4. Handle notification received in foreground
    notifListenerRef.current = Notifications.addNotificationReceivedListener(
      (_notification) => {
        // Could update badge count, show in-app toast, etc.
      },
    );

    // 5. Handle tap on notification → deep link
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, unknown>;
        const screen = getScreenFromNotification(data);
        if (screen) {
          // Small delay to ensure navigation is ready
          setTimeout(() => router.push(screen as any), 300);
        }
      },
    );

    return () => {
      mounted = false;
      notifListenerRef.current?.remove();
      responseListenerRef.current?.remove();
    };
  }, [language]);
}

// ─── Internal: check gaps and alert ──────────────────────────────────────────

async function checkAndAlertGaps(language: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/copilot/life-health?userId=default`).catch(() => null);
  if (!res?.ok) return;
  const data = await res.json().catch(() => null);
  if (!data?.topGaps?.length) return;

  const critical = data.topGaps.find((g: any) => g.gapMagnitude >= 30);
  if (!critical) return;

  await sendGapAlert({
    area: critical.area,
    requirement: critical.requirement,
    gapMagnitude: critical.gapMagnitude,
    language,
  });
}
