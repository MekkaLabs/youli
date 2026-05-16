import fs from 'node:fs';
import path from 'node:path';
import type { LifeArea } from './agent-definitions';

export interface OrchestratorEvent {
  id: string;
  threadId: string;
  type: 'user_message' | 'agent_response' | 'interrupt' | 'tool_event' | 'system';
  area?: LifeArea;
  payload: Record<string, unknown>;
  createdAt: string;
}

interface EventStore {
  events: OrchestratorEvent[];
}

const EVENTS_PATH = path.join(process.cwd(), 'src', 'repositories', '.data', 'orchestrator-events.json');

function readStore(): EventStore {
  if (!fs.existsSync(EVENTS_PATH)) return { events: [] };
  try {
    return JSON.parse(fs.readFileSync(EVENTS_PATH, 'utf8')) as EventStore;
  } catch {
    return { events: [] };
  }
}

function writeStore(store: EventStore) {
  const dir = path.dirname(EVENTS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(EVENTS_PATH, JSON.stringify(store, null, 2));
}

function redactText(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}\-?\d{2}\b/g, '[redacted-cpf]')
    .replace(/\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9?\d{4}\-?\d{4})\b/g, '[redacted-phone]')
    .replace(/(?:senha|password|token|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, '[redacted-secret]');
}

function sanitizePayload(value: unknown): unknown {
  if (typeof value === 'string') return redactText(value);
  if (Array.isArray(value)) return value.map(sanitizePayload);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizePayload(v);
    }
    return out;
  }
  return value;
}

export function appendEvent(event: Omit<OrchestratorEvent, 'id' | 'createdAt'>) {
  const store = readStore();
  const safePayload = sanitizePayload(event.payload) as Record<string, unknown>;
  store.events.push({
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...event,
    payload: safePayload,
  });
  if (store.events.length > 5000) store.events = store.events.slice(-5000);
  writeStore(store);
}

export function getThreadEvents(threadId: string, limit = 200): OrchestratorEvent[] {
  const store = readStore();
  return store.events.filter((e) => e.threadId === threadId).slice(-limit);
}
