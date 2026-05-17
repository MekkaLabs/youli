/**
 * useSWECI — hook centralizado para dados do Life Health Score (SWE-CI)
 * Faz fetch do /api/copilot/life-health e expõe scores, gaps e prioridades.
 * Cacheado em memória por 5 minutos para evitar requests excessivos.
 */
import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3002';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

export interface GapItem {
  area: string;
  metric: string;
  gapMagnitude: number;
  priority: string;
  requirement: string;
}

export interface SWECIData {
  userId: string;
  evaluatedAt: string;
  lifeHealthScore: number;
  ancScore: number;
  maintainabilityScore: number;
  maintainabilityVerdict: 'sustainable' | 'moderate_risk' | 'high_risk';
  maintainabilityWarnings: string[];
  topGaps: GapItem[];
  criticalAreas: string[];
  topPriorities: string[];
  lastPipelineWeek?: string;
  lastPipelineSummary?: string;
  runtimeFlags: Record<string, boolean>;
}

interface CacheEntry {
  data: SWECIData;
  fetchedAt: number;
}

// Module-level cache + in-flight deduplication shared across hook instances
let globalCache: CacheEntry | null = null;
let inflightRequest: Promise<SWECIData> | null = null;

export function useSWECI(userId = 'default') {
  const [data, setData] = useState<SWECIData | null>(globalCache?.data ?? null);
  const [loading, setLoading] = useState(!globalCache);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchData = useCallback(async (force = false) => {
    // Serve from cache if still fresh
    if (!force && globalCache && Date.now() - globalCache.fetchedAt < CACHE_TTL_MS) {
      setData(globalCache.data);
      setLoading(false);
      return;
    }

    // Deduplicate: if another caller is already fetching, piggyback on that promise
    if (!force && inflightRequest) {
      try {
        const json = await inflightRequest;
        if (isMounted.current) { setData(json); setLoading(false); }
      } catch { /* handled by the original caller */ }
      return;
    }

    setLoading(true);
    setError(null);

    inflightRequest = fetch(`${API_BASE}/api/copilot/life-health?userId=${userId}`)
      .then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<SWECIData>;
      });

    try {
      const json = await inflightRequest;
      globalCache = { data: json, fetchedAt: Date.now() };
      if (isMounted.current) {
        setData(json);
        setError(null);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      }
    } finally {
      inflightRequest = null; // reset so next forced fetch works
      if (isMounted.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    return () => { isMounted.current = false; };
  }, [fetchData]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  // Derived helpers
  const getAreaGap = useCallback(
    (area: string) => data?.topGaps.find((g) => g.area === area) ?? null,
    [data]
  );

  const overallGrade = data
    ? data.lifeHealthScore >= 80 ? 'S'
    : data.lifeHealthScore >= 65 ? 'A'
    : data.lifeHealthScore >= 50 ? 'B'
    : data.lifeHealthScore >= 35 ? 'C' : 'D'
    : null;

  return {
    data,
    loading,
    error,
    refresh,
    getAreaGap,
    overallGrade,
    // Convenience accessors
    lifeHealthScore: data?.lifeHealthScore ?? 0,
    ancScore: data?.ancScore ?? 0,
    maintainabilityScore: data?.maintainabilityScore ?? 0,
    maintainabilityVerdict: data?.maintainabilityVerdict ?? 'moderate_risk',
    criticalAreas: data?.criticalAreas ?? [],
    topGaps: data?.topGaps ?? [],
    topPriorities: data?.topPriorities ?? [],
  };
}
