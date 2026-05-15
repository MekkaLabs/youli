/**
 * useNetworkStatus — detecta conectividade sem bibliotecas externas
 * Usa fetch ping periódico + AppState para garantir detecção correta
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

// URL leve para ping — usa API local em dev, fallback externo em produção
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const PING_URL = typeof window !== 'undefined'
  ? `${API_BASE}/api/me/summary`   // API local — sem CORS, sempre disponível em dev
  : 'https://www.gstatic.com/generate_204'; // native: ping externo
const PING_INTERVAL = 30_000; // 30 segundos
const PING_TIMEOUT  = 5_000;  // 5 segundos de timeout

export type NetworkStatus = 'online' | 'offline' | 'unknown';

export interface NetworkState {
  status: NetworkStatus;
  isOnline: boolean;
  isOffline: boolean;
  lastChecked: Date | null;
}

async function ping(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PING_TIMEOUT);
    const res = await fetch(PING_URL, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}

export function useNetworkStatus(): NetworkState {
  const [status, setStatus] = useState<NetworkStatus>('unknown');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = useCallback(async () => {
    const online = await ping();
    setStatus(online ? 'online' : 'offline');
    setLastChecked(new Date());
  }, []);

  useEffect(() => {
    // Verificação inicial imediata
    check();

    // Intervalo periódico
    intervalRef.current = setInterval(check, PING_INTERVAL);

    // Re-verifica quando o app volta ao foreground
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') check();
    };
    const sub = AppState.addEventListener('change', handleAppState);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      sub.remove();
    };
  }, [check]);

  return {
    status,
    isOnline:  status === 'online',
    isOffline: status === 'offline',
    lastChecked,
  };
}
