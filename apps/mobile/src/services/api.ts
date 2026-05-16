const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3002';

export async function api<T>(path: string): Promise<T> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${API_URL}${normalized}`).catch(() => null);
  if (response?.ok) return response.json() as Promise<T>;

  if (!normalized.endsWith('/route')) {
    const fallback = await fetch(`${API_URL}${normalized}/route`).catch(() => null);
    if (fallback?.ok) return fallback.json() as Promise<T>;
  }

  throw new Error(`API request failed: ${normalized}`);
}

// ── SSE Streaming ─────────────────────────────────────────────────────────────

export type SSEEventName = 'start' | 'thinking' | 'response' | 'done' | 'error';

export interface SSEStartData { area: string; agent: string }
export interface SSEThinkingData { step: string }
export interface SSEResponseData {
  message: string;
  insights: string[];
  actions: string[];
  synthesis: string;
  primaryAgent?: unknown;
  suggestedAgents?: unknown[];
  nextSteps?: string[];
  graph?: { threadId: string; area: string; events: string[]; checkpointStatus: string };
}
export interface SSEDoneData { selfEvalScore: number; durationMs: number }
export interface SSEErrorData { error: string }

export type SSEEventData =
  | { event: 'start'; data: SSEStartData }
  | { event: 'thinking'; data: SSEThinkingData }
  | { event: 'response'; data: SSEResponseData }
  | { event: 'done'; data: SSEDoneData }
  | { event: 'error'; data: SSEErrorData };

/**
 * streamCopilot — envia mensagem ao orquestrador via SSE e notifica callbacks
 * por evento.
 *
 * @returns função abort() para cancelar o stream
 */
export function streamCopilot(
  message: string,
  context: Record<string, unknown>,
  onToken: (event: SSEEventName, data: unknown) => void,
  onDone: (finalData: SSEDoneData) => void,
  orchestratorConfig?: Record<string, unknown>,
  threadId?: string,
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(`${API_URL}/api/copilot/orchestrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          message,
          context,
          orchestratorConfig,
          mode: 'chat',
          threadId,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        onToken('error', { error: `HTTP ${response.status}` });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parseia blocos SSE delimitados por \n\n
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() ?? '';

        for (const block of blocks) {
          if (!block.trim()) continue;

          let eventName: SSEEventName = 'thinking';
          let rawData = '';

          for (const line of block.split('\n')) {
            if (line.startsWith('event: ')) {
              eventName = line.slice('event: '.length).trim() as SSEEventName;
            } else if (line.startsWith('data: ')) {
              rawData = line.slice('data: '.length).trim();
            }
          }

          if (!rawData) continue;

          let parsed: unknown;
          try { parsed = JSON.parse(rawData); } catch { continue; }

          onToken(eventName, parsed);

          if (eventName === 'done') {
            onDone(parsed as SSEDoneData);
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        onToken('error', { error: err instanceof Error ? err.message : 'Stream error' });
      }
    }
  })();

  return () => controller.abort();
}
