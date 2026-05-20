/**
 * HTTP helpers padronizados para rotas Next.js (App Router).
 *
 * Objetivos:
 *  - Centralizar logging de erros (logError)
 *  - Padronizar respostas de erro (jsonError)
 *  - Auth guards reutilizáveis (requireAuth / requireAdmin)
 *  - Parse seguro de body com Zod (parseJsonBody)
 *
 * Padrão de uso em rotas:
 *
 *   export async function POST(req: Request) {
 *     const auth = await requireAuth();
 *     if (auth.error) return auth.response;
 *
 *     const parsed = await parseJsonBody(req, MySchema);
 *     if (!parsed.ok) return parsed.response;
 *
 *     try {
 *       // ... lógica
 *       return NextResponse.json({ ... });
 *     } catch (err) {
 *       return jsonError('Falha ao processar', 500, err, '[POST /api/...]');
 *     }
 *   }
 */
import { NextResponse } from 'next/server';
import type { ZodTypeAny, ZodError, z } from 'zod';
import { getCurrentUserFromCookie, type AuthUser } from '@/services/auth';

// ---------- Logging ----------

export function logError(scope: string, err: unknown, extra?: Record<string, unknown>) {
  const payload = {
    scope,
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    ...extra,
  };
  // eslint-disable-next-line no-console
  console.error(`[${scope}]`, payload);
}

// ---------- Respostas de erro ----------

export interface ErrorBody {
  error: string;
  details?: unknown;
}

export function jsonError(message: string, status = 500, err?: unknown, scope?: string) {
  if (err !== undefined && scope) {
    logError(scope, err);
  }
  const body: ErrorBody = { error: message };
  if (process.env.NODE_ENV !== 'production' && err instanceof Error) {
    body.details = err.message;
  }
  return NextResponse.json(body, { status });
}

// ---------- Auth guards ----------

export type AuthGuardResult =
  | { error: false; user: AuthUser; response?: never }
  | { error: true; response: NextResponse; user?: never };

export async function requireAuth(): Promise<AuthGuardResult> {
  const user = await getCurrentUserFromCookie();
  if (!user) {
    return {
      error: true,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    };
  }
  return { error: false, user };
}

export async function requireAdmin(): Promise<AuthGuardResult> {
  const auth = await requireAuth();
  if (auth.error) return auth;
  if (auth.user.role !== 'admin') {
    return {
      error: true,
      response: NextResponse.json({ error: 'forbidden' }, { status: 403 }),
    };
  }
  return auth;
}

// ---------- Parse de body com Zod ----------

export type ParseResult<T> =
  | { ok: true; data: T; response?: never }
  | { ok: false; response: NextResponse; data?: never };

/**
 * Generic sobre o schema (não sobre o tipo) para que `.default()`/`.optional()`
 * sejam corretamente desempacotados via `z.infer<S>` na saída.
 */
export async function parseJsonBody<S extends ZodTypeAny>(
  req: Request,
  schema: S
): Promise<ParseResult<z.infer<S>>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'invalid_json', details: 'O corpo da requisição não é JSON válido.' },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'validation_failed',
          issues: formatZodIssues(result.error),
        },
        { status: 422 }
      ),
    };
  }
  return { ok: true, data: result.data };
}

function formatZodIssues(err: ZodError) {
  return err.issues.map((iss) => ({
    path: iss.path.join('.'),
    code: iss.code,
    message: iss.message,
  }));
}

// ---------- CORS helper ----------

/**
 * Devolve a lista de origens permitidas com base na env CORS_ALLOWED_ORIGINS
 * (CSV). Em produção, se vazio, NEGA todas. Em dev, permite localhost.
 */
export function getAllowedOrigins(): string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS || '';
  const explicit = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (explicit.length > 0) return explicit;
  if (process.env.NODE_ENV !== 'production') {
    return ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:8081'];
  }
  return [];
}

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return getAllowedOrigins().includes(origin);
}
