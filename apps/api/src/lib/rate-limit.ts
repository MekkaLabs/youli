/**
 * Rate limiting in-memory (sem dependência externa).
 *
 * Adequado para um único processo de longa duração (host com disco persistente —
 * Railway/Render/Fly). NÃO é distribuído: em múltiplas instâncias cada uma tem
 * seu próprio contador. Para escala horizontal, trocar por Redis (ioredis já é dep).
 */

interface Bucket {
  count: number;
  resetAt: number; // epoch ms
}

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

/** Limpeza preguiçosa para evitar crescimento ilimitado do Map. */
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) {
    if (now > b.resetAt) buckets.delete(k);
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** Segundos até liberar (apenas quando ok = false). */
  retryAfterSec: number;
  /** Quantas requisições ainda restam na janela. */
  remaining: number;
}

/**
 * Consome 1 unidade do bucket `key`. Retorna ok=false quando excede `limit`
 * dentro de `windowMs`.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0, remaining: limit - 1 };
  }

  if (b.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)), remaining: 0 };
  }

  b.count++;
  return { ok: true, retryAfterSec: 0, remaining: limit - b.count };
}

/** Extrai o IP do cliente respeitando proxies (x-forwarded-for / x-real-ip). */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Helper de alto nível: aplica rate limit e devolve a resposta 429 pronta
 * (ou null se liberado). Uso:
 *   const limited = enforceRateLimit(req, 'login', 10, 60_000);
 *   if (limited) return limited;
 */
import { NextResponse } from 'next/server';

export function enforceRateLimit(
  req: Request,
  scope: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const ip = getClientIp(req);
  const result = rateLimit(`${scope}:${ip}`, limit, windowMs);
  if (result.ok) return null;
  return NextResponse.json(
    { error: 'too_many_requests', message: 'Muitas tentativas. Tente novamente em instantes.' },
    { status: 429, headers: { 'Retry-After': String(result.retryAfterSec) } }
  );
}
