/**
 * useOpenBanking — gerencia conexões bancárias via Open Banking Brasil
 * Persiste conexões no AsyncStorage e sincroniza com a API
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3002';
const CONNECTIONS_KEY = '@youli:bank_connections';

export interface BankAccount {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'investment' | 'credit';
  balance: number;
  currency: string;
}

export interface BankConnection {
  id: string;
  bankId: string;
  bankName: string;
  bankLogo: string;
  bankColor: string;
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  connectedAt: string;
  lastSync: string;
  accounts: BankAccount[];
}

export interface AvailableBank {
  id: string;
  name: string;
  logo: string;
  color: string;
  type: 'digital' | 'traditional' | 'investment';
  popular: boolean;
}

export function useOpenBanking() {
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [availableBanks, setAvailableBanks] = useState<AvailableBank[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Carrega conexões salvas e bancos disponíveis
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [savedRaw, banksRes] = await Promise.all([
          AsyncStorage.getItem(CONNECTIONS_KEY),
          fetch(`${API_BASE}/api/open-finance/connect`).catch(() => null),
        ]);
        if (savedRaw) setConnections(JSON.parse(savedRaw));
        if (banksRes?.ok) {
          const { banks } = await banksRes.json();
          setAvailableBanks(banks ?? []);
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const connect = useCallback(async (bankId: string): Promise<boolean> => {
    setConnecting(bankId);
    try {
      const res = await fetch(`${API_BASE}/api/open-finance/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankId }),
      });
      if (!res.ok) return false;
      const { connection } = await res.json();

      setConnections(prev => {
        // Substitui se já existir, senão adiciona
        const exists = prev.findIndex(c => c.bankId === bankId);
        const updated = exists >= 0
          ? prev.map((c, i) => i === exists ? connection : c)
          : [...prev, connection];
        AsyncStorage.setItem(CONNECTIONS_KEY, JSON.stringify(updated));
        return updated;
      });
      return true;
    } catch {
      return false;
    } finally {
      setConnecting(null);
    }
  }, []);

  const disconnect = useCallback(async (connectionId: string) => {
    setConnections(prev => {
      const updated = prev.filter(c => c.id !== connectionId);
      AsyncStorage.setItem(CONNECTIONS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const syncAll = useCallback(async () => {
    setConnections(prev => prev.map(c => ({ ...c, status: 'syncing' as const })));
    // Simula sync — em produção chamaria Pluggy para refresh dos tokens
    await new Promise(r => setTimeout(r, 1200));
    setConnections(prev => prev.map(c => ({
      ...c,
      status: 'connected' as const,
      lastSync: new Date().toISOString(),
    })));
  }, []);

  // Totais consolidados
  const totalBalance = connections
    .filter(c => c.status === 'connected')
    .flatMap(c => c.accounts)
    .reduce((sum, acc) => sum + acc.balance, 0);

  const isConnected = (bankId: string) => connections.some(c => c.bankId === bankId && c.status === 'connected');

  return {
    connections,
    availableBanks,
    connecting,
    loading,
    totalBalance,
    connect,
    disconnect,
    syncAll,
    isConnected,
  };
}
