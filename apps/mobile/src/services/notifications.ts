/**
 * Youli — NotificationService
 * Gerencia todas as notificações locais + preparação para remote (FCM/APNs).
 *
 * Usa expo-notifications para:
 * - Daily Digest (8h diário)
 * - SWE-CI gap alerts (quando gap crítico detectado)
 * - Habit reminders (baseado nos hábitos cadastrados)
 * - Goal deadline alerts (48h antes do prazo)
 * - Weekly CI reminder (domingos 9h)
 */

import * as Notifications from 'expo-notifications';
import type { NotificationTriggerInput } from 'expo-notifications';

// ─── Configure handler (app foreground) ──────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,   // sem som — respeitamos reduceMotion/preferências
    shouldSetBadge: true,
  }),
});

// ─── Permission ───────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// ─── IDs de notificações agendadas ───────────────────────────────────────────

const IDS = {
  DAILY_DIGEST: 'youli-daily-digest',
  WEEKLY_CI: 'youli-weekly-ci',
  HABIT_REMINDER_PREFIX: 'youli-habit-',
  GOAL_DEADLINE_PREFIX: 'youli-goal-deadline-',
  SWE_CI_ALERT: 'youli-sweci-alert',
};

// ─── Daily Digest — 8h diário ─────────────────────────────────────────────────

export async function scheduleDailyDigest(language = 'pt-BR'): Promise<void> {
  const titles: Record<string, string> = {
    'pt-BR': '☀️ Bom dia! Seu resumo do dia está pronto',
    en: '☀️ Good morning! Your daily brief is ready',
    es: '☀️ ¡Buenos días! Tu resumen del día está listo',
    zh: '☀️ 早上好！您的每日简报已准备就绪',
  };
  const bodies: Record<string, string> = {
    'pt-BR': 'Toque para ver suas prioridades de hoje com Youli.',
    en: 'Tap to see your daily priorities with Youli.',
    es: 'Toca para ver tus prioridades del día con Youli.',
    zh: '点击查看今天的优先事项。',
  };

  // Cancel previous
  await Notifications.cancelScheduledNotificationAsync(IDS.DAILY_DIGEST).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: IDS.DAILY_DIGEST,
    content: {
      title: titles[language] ?? titles['pt-BR'],
      body: bodies[language] ?? bodies['pt-BR'],
      data: { screen: 'dashboard', type: 'daily_digest' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    } as NotificationTriggerInput,
  });
}

// ─── Weekly CI reminder — domingos 9h ─────────────────────────────────────────

export async function scheduleWeeklyCI(language = 'pt-BR'): Promise<void> {
  const titles: Record<string, string> = {
    'pt-BR': '🔄 CI Semanal pronto para rodar',
    en: '🔄 Weekly CI ready to run',
    es: '🔄 CI Semanal listo para ejecutar',
    zh: '🔄 每周CI准备运行',
  };

  await Notifications.cancelScheduledNotificationAsync(IDS.WEEKLY_CI).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: IDS.WEEKLY_CI,
    content: {
      title: titles[language] ?? titles['pt-BR'],
      body: language === 'pt-BR'
        ? 'Execute o pipeline semanal e veja sua evolução de vida.'
        : 'Run your weekly pipeline and see your life evolution.',
      data: { screen: 'perfil', type: 'weekly_ci' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1,  // domingo = 1 no expo-notifications
      hour: 9,
      minute: 0,
    } as NotificationTriggerInput,
  });
}

// ─── SWE-CI Gap Alert — disparado quando gap crítico detectado ────────────────

export interface GapAlertPayload {
  area: string;
  requirement: string;
  gapMagnitude: number;
  language?: string;
}

export async function sendGapAlert(payload: GapAlertPayload): Promise<void> {
  const { area, requirement, gapMagnitude, language = 'pt-BR' } = payload;
  if (gapMagnitude < 20) return; // só crítico

  const prefixes: Record<string, string> = {
    'pt-BR': '⚠️ Gap crítico detectado',
    en: '⚠️ Critical gap detected',
    es: '⚠️ Brecha crítica detectada',
    zh: '⚠️ 检测到关键差距',
  };

  await Notifications.scheduleNotificationAsync({
    identifier: `${IDS.SWE_CI_ALERT}-${Date.now()}`,
    content: {
      title: `${prefixes[language] ?? prefixes['pt-BR']}: ${area}`,
      body: requirement,
      data: { screen: 'life-score', type: 'gap_alert', area },
    },
    trigger: null, // imediato
  });
}

// ─── Habit Reminder ───────────────────────────────────────────────────────────

export interface HabitReminderPayload {
  habitId: string;
  habitName: string;
  hour: number;
  minute: number;
  language?: string;
}

export async function scheduleHabitReminder(payload: HabitReminderPayload): Promise<void> {
  const { habitId, habitName, hour, minute, language = 'pt-BR' } = payload;
  const id = `${IDS.HABIT_REMINDER_PREFIX}${habitId}`;

  const titles: Record<string, string> = {
    'pt-BR': `🔥 Hora do seu hábito: ${habitName}`,
    en: `🔥 Time for your habit: ${habitName}`,
    es: `🔥 Hora de tu hábito: ${habitName}`,
    zh: `🔥 您的习惯时间：${habitName}`,
  };

  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: titles[language] ?? titles['pt-BR'],
      body: language === 'pt-BR' ? 'Mantenha o streak vivo! ✅' : 'Keep your streak alive! ✅',
      data: { screen: 'habitos', type: 'habit_reminder', habitId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    } as NotificationTriggerInput,
  });
}

export async function cancelHabitReminder(habitId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(
    `${IDS.HABIT_REMINDER_PREFIX}${habitId}`,
  ).catch(() => {});
}

// ─── Goal Deadline Alert ──────────────────────────────────────────────────────

export interface GoalDeadlinePayload {
  goalId: string;
  goalTitle: string;
  deadlineDate: Date;
  language?: string;
}

export async function scheduleGoalDeadlineAlert(payload: GoalDeadlinePayload): Promise<void> {
  const { goalId, goalTitle, deadlineDate, language = 'pt-BR' } = payload;
  const id = `${IDS.GOAL_DEADLINE_PREFIX}${goalId}`;

  // Alert 48h before
  const alertDate = new Date(deadlineDate.getTime() - 48 * 60 * 60 * 1000);
  if (alertDate <= new Date()) return; // past

  const titles: Record<string, string> = {
    'pt-BR': `⏰ 48h para o prazo: ${goalTitle}`,
    en: `⏰ 48h until deadline: ${goalTitle}`,
    es: `⏰ 48h para el plazo: ${goalTitle}`,
    zh: `⏰ 距截止日期48小时：${goalTitle}`,
  };

  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: titles[language] ?? titles['pt-BR'],
      body: language === 'pt-BR' ? 'Revise o progresso e execute o próximo passo.' : 'Review progress and take the next step.',
      data: { screen: 'metas', type: 'goal_deadline', goalId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: alertDate,
    } as NotificationTriggerInput,
  });
}

// ─── Cancel all ───────────────────────────────────────────────────────────────

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── Navigation handler (deep link from notification) ────────────────────────

export function getScreenFromNotification(
  data: Record<string, unknown>,
): string | null {
  const screen = data?.screen as string | undefined;
  if (!screen) return null;
  const map: Record<string, string> = {
    dashboard: '/(tabs)/dashboard',
    habitos: '/(tabs)/habitos',
    metas: '/(tabs)/metas',
    tarefas: '/(tabs)/tarefas',
    perfil: '/(tabs)/perfil',
    'life-score': '/life-score',
  };
  return map[screen] ?? null;
}
