/**
 * Life Evolution Tracker — SWE-CI-inspired Evolution Tracking
 * Rastreia a trajetória COMPLETA das métricas ao longo do tempo.
 * Identifica padrões de progresso/regressão impossíveis de ver em snapshots isolados.
 */
import fs from 'node:fs';
import path from 'node:path';

export interface EvolutionPoint {
  id: string;
  area: string;
  metric: string;
  value: number;
  delta: number;
  timestamp: string;
  tag: 'checkin' | 'ci_loop' | 'manual' | 'auto';
}

export interface LinearTrend {
  slope: number;
  intercept: number;
  rSquared: number;
}

export interface EvolutionSequence {
  area: string;
  metric: string;
  points: EvolutionPoint[];
  trend: LinearTrend;
  trendLabel: 'strong_up' | 'up' | 'flat' | 'down' | 'strong_down';
  patternInsight: string;
  volatility: number;
}

export interface EvolutionStore {
  userId: string;
  points: EvolutionPoint[];
  updatedAt: string;
}

function getDataDir(): string {
  return path.join(process.cwd(), '.data');
}

function ensureDataDir(): void {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getStorePath(userId: string): string {
  return path.join(getDataDir(), `evolution-${userId}.json`);
}

export function loadEvolutionStore(userId: string): EvolutionStore {
  const filePath = getStorePath(userId);
  if (!fs.existsSync(filePath)) {
    return { userId, points: [], updatedAt: new Date().toISOString() };
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as EvolutionStore;
  } catch {
    return { userId, points: [], updatedAt: new Date().toISOString() };
  }
}

function saveEvolutionStore(store: EvolutionStore): void {
  ensureDataDir();
  fs.writeFileSync(getStorePath(store.userId), JSON.stringify(store, null, 2), 'utf-8');
}

export function recordEvolutionPoint(
  userId: string,
  area: string,
  metric: string,
  value: number,
  tag: EvolutionPoint['tag'] = 'auto'
): EvolutionPoint {
  const store = loadEvolutionStore(userId);

  const sameAreaMetric = store.points.filter(
    (p) => p.area === area && p.metric === metric
  );
  const last = sameAreaMetric[sameAreaMetric.length - 1];
  const delta = last ? value - last.value : 0;

  const point: EvolutionPoint = {
    id: `evo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    area,
    metric,
    value,
    delta,
    timestamp: new Date().toISOString(),
    tag,
  };

  store.points.push(point);

  // Keep at most 1000 entries; drop oldest per area if exceeded
  const MAX_TOTAL = 1000;
  if (store.points.length > MAX_TOTAL) {
    // Find oldest point across all area+metric combos and remove it
    store.points.splice(0, store.points.length - MAX_TOTAL);
  }

  store.updatedAt = new Date().toISOString();
  saveEvolutionStore(store);

  return point;
}

export function computeLinearTrend(values: number[]): LinearTrend {
  const n = values.length;
  if (n < 2) {
    return { slope: 0, intercept: values[0] ?? 0, rSquared: 0 };
  }

  const xs = values.map((_, i) => i);
  const ys = values;

  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);

  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;

  const meanY = sumY / n;
  const ssTot = ys.reduce((acc, y) => acc + (y - meanY) ** 2, 0);
  const ssRes = ys.reduce((acc, y, i) => {
    const predicted = slope * xs[i] + intercept;
    return acc + (y - predicted) ** 2;
  }, 0);

  const rSquared = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  return { slope, intercept, rSquared };
}

function computeVolatility(deltas: number[]): number {
  if (deltas.length < 2) return 0;
  const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const variance = deltas.reduce((acc, d) => acc + (d - mean) ** 2, 0) / deltas.length;
  return Math.sqrt(variance);
}

function getTrendLabel(slope: number): EvolutionSequence['trendLabel'] {
  if (slope > 0.5) return 'strong_up';
  if (slope > 0.1) return 'up';
  if (slope < -0.5) return 'strong_down';
  if (slope < -0.1) return 'down';
  return 'flat';
}

function getPatternInsight(
  trendLabel: EvolutionSequence['trendLabel'],
  volatility: number
): string {
  const stable = volatility < 1;

  switch (trendLabel) {
    case 'strong_up':
      return stable
        ? 'Melhora consistente com baixa volatilidade — hábito consolidado'
        : 'Forte tendência de melhora, porém com oscilações — requer estabilização';
    case 'up':
      return stable
        ? 'Progresso gradual e estável — continuar no ritmo atual'
        : 'Progresso presente, mas instável — identificar e reduzir variáveis externas';
    case 'flat':
      return stable
        ? 'Métrica estável — avaliar se o plateau é aceitável ou exige nova intervenção'
        : 'Sem tendência clara — oscilações sem direção definida, revisar estratégia';
    case 'down':
      return stable
        ? 'Regressão gradual — intervenção necessária antes que piore'
        : 'Declínio com alta variabilidade — situação crítica, verificar causas externas';
    case 'strong_down':
      return 'Queda acentuada detectada — ação imediata recomendada para reverter tendência';
  }
}

export function analyzeEvolution(
  userId: string,
  area: string,
  metric: string,
  days = 30
): EvolutionSequence {
  const store = loadEvolutionStore(userId);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const points = store.points.filter(
    (p) =>
      p.area === area &&
      p.metric === metric &&
      p.timestamp >= cutoff
  );

  const values = points.map((p) => p.value);
  const trend = computeLinearTrend(values);
  const trendLabel = getTrendLabel(trend.slope);
  const volatility = computeVolatility(points.map((p) => p.delta));
  const patternInsight = getPatternInsight(trendLabel, volatility);

  return {
    area,
    metric,
    points,
    trend,
    trendLabel,
    patternInsight,
    volatility,
  };
}

export function getAllEvolutions(userId: string, days = 30): EvolutionSequence[] {
  const store = loadEvolutionStore(userId);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Build unique area+metric pairs
  const pairs = new Map<string, { area: string; metric: string }>();
  for (const p of store.points) {
    if (p.timestamp >= cutoff) {
      const key = `${p.area}::${p.metric}`;
      if (!pairs.has(key)) {
        pairs.set(key, { area: p.area, metric: p.metric });
      }
    }
  }

  const sequences: EvolutionSequence[] = [];
  for (const { area, metric } of pairs.values()) {
    const seq = analyzeEvolution(userId, area, metric, days);
    if (seq.points.length >= 3) {
      sequences.push(seq);
    }
  }

  return sequences;
}
