import { readDb } from '../../repositories/local-db';

export type IntegrationToolName =
  | 'calendar.getEvents'
  | 'finance.getSummary'
  | 'fitness.getActivities';

export interface IntegrationToolResult {
  ok: boolean;
  provider: string;
  data: unknown;
}

type ToolHandler = (userId: string) => IntegrationToolResult;

const handlers: Record<IntegrationToolName, ToolHandler> = {
  'calendar.getEvents': (userId) => {
    const db = readDb(userId);
    return { ok: true, provider: 'native_calendar', data: db.calendar };
  },
  'finance.getSummary': (userId) => {
    const db = readDb(userId);
    const tx = db.insights;
    return {
      ok: true,
      provider: 'open_finance',
      data: {
        connected: db.connections.some((c) => c.provider === 'open_finance' && c.status === 'connected'),
        insightCount: tx.length,
      },
    };
  },
  'fitness.getActivities': (userId) => {
    const db = readDb(userId);
    return { ok: true, provider: 'strava', data: db.fitness };
  },
};

export function runIntegrationTool(userId: string, name: IntegrationToolName): IntegrationToolResult {
  const handler = handlers[name];
  if (!handler) return { ok: false, provider: 'unknown', data: null };
  return handler(userId);
}

