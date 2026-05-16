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

type ToolHandler = () => IntegrationToolResult;

const handlers: Record<IntegrationToolName, ToolHandler> = {
  'calendar.getEvents': () => {
    const db = readDb();
    return { ok: true, provider: 'native_calendar', data: db.calendar };
  },
  'finance.getSummary': () => {
    const db = readDb();
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
  'fitness.getActivities': () => {
    const db = readDb();
    return { ok: true, provider: 'strava', data: db.fitness };
  },
};

export function runIntegrationTool(name: IntegrationToolName): IntegrationToolResult {
  const handler = handlers[name];
  if (!handler) return { ok: false, provider: 'unknown', data: null };
  return handler();
}

