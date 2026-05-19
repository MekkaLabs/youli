/**
 * useAuth — autenticação do mobile
 * Persiste sessão no AsyncStorage, valida com /api/auth/me
 */
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = '@youli:session';
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3002';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar?: string | null;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;  // "userId:role" armazenado localmente
  loading: boolean;
  error: string | null;
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  isAdmin: boolean;
}

export type AuthHook = AuthState & AuthActions;

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildHeaders(token: string | null): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthHook {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carrega sessão do AsyncStorage na inicialização
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(SESSION_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as { user: AuthUser; token: string };
          setUser(parsed.user);
          setToken(parsed.token);
        }
      } catch {
        // sessão corrompida — limpa
        await AsyncStorage.removeItem(SESSION_KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveSession = useCallback(async (u: AuthUser, t: string) => {
    setUser(u);
    setToken(t);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ user: u, token: t }));
  }, []);

  const clearSession = useCallback(async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem(SESSION_KEY);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Credenciais inválidas.');
        return false;
      }

      const authUser: AuthUser = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        avatar: data.user.avatar,
      };
      const sessionToken = `${authUser.id}:${authUser.role}`;
      await saveSession(authUser, sessionToken);
      return true;
    } catch {
      setError('Não foi possível conectar ao servidor.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [saveSession]);

  const register = useCallback(async (name: string, email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao criar conta.');
        return false;
      }

      const authUser: AuthUser = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        avatar: data.user.avatar,
      };
      const sessionToken = `${authUser.id}:${authUser.role}`;
      await saveSession(authUser, sessionToken);
      return true;
    } catch {
      setError('Não foi possível conectar ao servidor.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [saveSession]);

  const logout = useCallback(async () => {
    await clearSession();
    // Tenta notificar a API (ignora erros — sessão local já foi limpa)
    fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' }).catch(() => {});
  }, [clearSession]);

  const clearError = useCallback(() => setError(null), []);

  return {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    clearError,
    isAdmin: user?.role === 'admin',
  };
}

// ── Context (para compartilhar entre telas sem prop-drilling) ─────────────────

import React from 'react';

const AuthContext = createContext<AuthHook | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  return React.createElement(AuthContext.Provider, { value: auth }, children);
}

export function useAuthContext(): AuthHook {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext deve ser usado dentro de <AuthProvider>');
  return ctx;
}
