import { getThreadEvents } from './event-stream';
import { getGraphCheckpoint } from './orchestrator-graph-store';
import { listTraces } from './orchestrator-observability';
import { runOrchestrator } from './orchestrator';
import type { UserContext } from './agent-executor';

export function inspectThread(threadId: string) {
  const events = getThreadEvents(threadId, 500);
  const checkpoint = getGraphCheckpoint(threadId);
  const trace = listTraces(500).find((t) => t.threadId === threadId) || null;
  return {
    threadId,
    totals: {
      events: events.length,
      interrupts: events.filter((e) => e.type === 'interrupt').length,
      toolEvents: events.filter((e) => e.type === 'tool_event').length,
    },
    checkpoint,
    trace,
    events,
  };
}

export async function replayThread(threadId: string, context?: UserContext) {
  const events = getThreadEvents(threadId, 200);
  const lastUser = [...events].reverse().find((e) => e.type === 'user_message');
  if (!lastUser) return { ok: false, error: 'no_user_message' };
  const msg = String(lastUser.payload?.message || '');
  const result = await runOrchestrator(msg, context || {}, undefined, { threadId: `${threadId}_replay_${Date.now()}` });
  return { ok: true, replayOf: threadId, result };
}

