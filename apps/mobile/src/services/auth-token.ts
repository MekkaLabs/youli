/**
 * auth-token — store em memória do token de sessão + interceptor global de fetch.
 *
 * Por quê:
 *  - A API aceita `Authorization: Bearer <userId:role>`.
 *  - Em vez de adicionar o header manualmente em ~18 hooks (e esquecer alguns),
 *    instalamos UM interceptor global de fetch que injeta o header em toda
 *    request destinada à API. Fonte única de verdade, zero duplicação.
 *
 * Fluxo:
 *  - useAuth chama setAuthToken(token) no login/restore e clearAuthToken() no logout.
 *  - installAuthInterceptor() (chamado no boot) faz monkey-patch de global.fetch.
 *  - loadTokenFromStorage() hidrata o cache na inicialização (antes de qualquer fetch).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = '@youli:session';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3002';

let cachedToken: string | null = null;
let interceptorInstalled = false;

export function setAuthToken(token: string | null): void {
  cachedToken = token;
}

export function clearAuthToken(): void {
  cachedToken = null;
}

export function getCachedToken(): string | null {
  return cachedToken;
}

/** Hidrata o cache a partir do AsyncStorage. Idempotente. */
export async function loadTokenFromStorage(): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem(SESSION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as { token?: string };
      cachedToken = parsed.token ?? null;
    }
  } catch {
    cachedToken = null;
  }
  return cachedToken;
}

function isApiUrl(input: RequestInfo | URL): boolean {
  try {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;
    return typeof url === 'string' && url.startsWith(API_URL);
  } catch {
    return false;
  }
}

function hasAuthHeader(init?: RequestInit, input?: RequestInfo | URL): boolean {
  // Checa init.headers
  const h = init?.headers;
  if (h) {
    if (h instanceof Headers) {
      if (h.has('authorization')) return true;
    } else if (Array.isArray(h)) {
      if (h.some(([k]) => k.toLowerCase() === 'authorization')) return true;
    } else if (typeof h === 'object') {
      if (Object.keys(h).some((k) => k.toLowerCase() === 'authorization')) return true;
    }
  }
  // Checa Request object
  if (input instanceof Request && input.headers?.has?.('authorization')) return true;
  return false;
}

/**
 * Instala o interceptor global. Toda chamada a fetch() destinada à API que
 * ainda não tenha Authorization recebe `Bearer <token>` automaticamente.
 */
export function installAuthInterceptor(): void {
  if (interceptorInstalled) return;
  interceptorInstalled = true;

  const originalFetch = global.fetch.bind(global);

  global.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (cachedToken && isApiUrl(input) && !hasAuthHeader(init, input)) {
      const headers = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined),
      );
      headers.set('Authorization', `Bearer ${cachedToken}`);
      const nextInit: RequestInit = { ...init, headers };
      return originalFetch(input, nextInit);
    }
    return originalFetch(input, init);
  }) as typeof fetch;
}
